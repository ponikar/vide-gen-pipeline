import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { buildTimedCaptions, getCaptionLines } from "./subtitles.js";
import type { GeneratedSegment, SubtitleMode, TimedCaption, TimedWord } from "./types.js";
import { runCommand } from "./process.js";

const VIDEO_WIDTH = 1080;
const VIDEO_HEIGHT = 1920;
const FRAME_RATE = 30;

export async function renderVideo(options: {
  sourceVideoPath: string;
  segments: GeneratedSegment[];
  outputPath: string;
  subtitleMode: SubtitleMode;
  tempDir: string;
}): Promise<void> {
  const narrationPath = path.join(options.tempDir, "narration.wav");
  const narrationDurationSeconds = options.segments.reduce((total, segment) => total + segment.durationSeconds, 0);
  const captions = buildTimedCaptions(options.segments);

  await concatenateAudio(options.segments, narrationPath, options.tempDir);
  await mkdir(path.dirname(options.outputPath), { recursive: true });

  if (options.subtitleMode === "word") {
    const captionVideoPath = await createWordCaptionAnimation(captions, options.tempDir, narrationDurationSeconds);
    await renderWithCaptionVideo({
      sourceVideoPath: options.sourceVideoPath,
      narrationPath,
      captionVideoPath,
      outputPath: options.outputPath,
      durationSeconds: narrationDurationSeconds,
    });
    return;
  }

  const captionImagePaths = await createCaptionImages(captions, options.tempDir);
  const captionImageInputs = captionImagePaths.flatMap((captionImagePath) => ["-loop", "1", "-i", captionImagePath]);
  const filterComplex = buildFilterComplex(captions);

  await runCommand("ffmpeg", [
    "-y",
    "-stream_loop",
    "-1",
    "-i",
    options.sourceVideoPath,
    "-i",
    narrationPath,
    ...captionImageInputs,
    "-t",
    narrationDurationSeconds.toFixed(3),
    "-filter_complex",
    filterComplex,
    "-map",
    "[vout]",
    "-map",
    "1:a:0",
    "-r",
    "30",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-shortest",
    "-movflags",
    "+faststart",
    options.outputPath,
  ]);
}

async function createCaptionImages(
  captions: Array<{ index: number; text: string }>,
  tempDir: string,
): Promise<string[]> {
  const paths: string[] = [];

  for (const caption of captions) {
    const captionImagePath = path.join(tempDir, `caption-${caption.index.toString().padStart(4, "0")}.png`);
    await sharp(Buffer.from(createCaptionSvg(getCaptionLines(caption.text))))
      .png()
      .toFile(captionImagePath);
    paths.push(captionImagePath);
  }

  return paths;
}

function buildFilterComplex(captions: Array<{ startSeconds: number; endSeconds: number }>): string {
  const parts = [
    `[0:v]scale=${VIDEO_WIDTH}:${VIDEO_HEIGHT}:force_original_aspect_ratio=increase,crop=${VIDEO_WIDTH}:${VIDEO_HEIGHT}[base]`,
  ];
  let previous = "base";

  captions.forEach((caption, index) => {
    const inputIndex = index + 2;
    const output = index === captions.length - 1 ? "vout" : `v${index + 1}`;
    parts.push(
      `[${previous}][${inputIndex}:v]overlay=0:0:enable='between(t,${caption.startSeconds.toFixed(3)},${caption.endSeconds.toFixed(3)})'[${output}]`,
    );
    previous = output;
  });

  return parts.join(";");
}

async function createWordCaptionAnimation(
  captions: TimedCaption[],
  tempDir: string,
  durationSeconds: number,
): Promise<string> {
  const missingWordCaption = captions.find((caption) => !caption.words || caption.words.length === 0);
  if (missingWordCaption) {
    throw new Error(`Word subtitle mode is missing word timings for subtitle chunk ${missingWordCaption.index}.`);
  }

  const framesDir = path.join(tempDir, "word-caption-frames");
  await mkdir(framesDir, { recursive: true });

  const stateImagePaths = new Map<string, string>();
  const frameCount = Math.max(1, Math.ceil(durationSeconds * FRAME_RATE));

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    const seconds = frameIndex / FRAME_RATE;
    const caption = findCaptionAt(captions, seconds);
    const activeWord = caption ? findActiveWord(caption.words ?? [], seconds) : undefined;
    const stateKey = caption ? `${caption.index}-${activeWord?.index ?? "none"}` : "blank";
    const framePath = path.join(framesDir, `frame-${frameIndex.toString().padStart(5, "0")}.png`);

    let statePath = stateImagePaths.get(stateKey);
    if (!statePath) {
      statePath = path.join(framesDir, `state-${stateKey}.png`);
      const svg = caption ? createWordCaptionSvg(caption, activeWord?.index) : createBlankSvg();
      await sharp(Buffer.from(svg)).png().toFile(statePath);
      stateImagePaths.set(stateKey, statePath);
    }

    await copyFile(statePath, framePath);
  }

  const outputPath = path.join(tempDir, "word-captions.mov");
  await runCommand("ffmpeg", [
    "-y",
    "-framerate",
    FRAME_RATE.toString(),
    "-i",
    path.join(framesDir, "frame-%05d.png"),
    "-c:v",
    "qtrle",
    "-pix_fmt",
    "argb",
    outputPath,
  ]);

  return outputPath;
}

async function renderWithCaptionVideo(options: {
  sourceVideoPath: string;
  narrationPath: string;
  captionVideoPath: string;
  outputPath: string;
  durationSeconds: number;
}): Promise<void> {
  await runCommand("ffmpeg", [
    "-y",
    "-stream_loop",
    "-1",
    "-i",
    options.sourceVideoPath,
    "-i",
    options.narrationPath,
    "-i",
    options.captionVideoPath,
    "-t",
    options.durationSeconds.toFixed(3),
    "-filter_complex",
    `[0:v]scale=${VIDEO_WIDTH}:${VIDEO_HEIGHT}:force_original_aspect_ratio=increase,crop=${VIDEO_WIDTH}:${VIDEO_HEIGHT}[base];[base][2:v]overlay=0:0[vout]`,
    "-map",
    "[vout]",
    "-map",
    "1:a:0",
    "-r",
    FRAME_RATE.toString(),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-shortest",
    "-movflags",
    "+faststart",
    options.outputPath,
  ]);
}

function findCaptionAt(captions: TimedCaption[], seconds: number): TimedCaption | undefined {
  return captions.find((caption) => caption.startSeconds <= seconds && seconds < caption.endSeconds);
}

function findActiveWord(words: TimedWord[], seconds: number): TimedWord | undefined {
  return words.find((word) => word.startSeconds <= seconds && seconds < word.endSeconds);
}

function createWordCaptionSvg(caption: TimedCaption, activeWordIndex: number | undefined): string {
  const lines = getWordCaptionLines(caption.words ?? []);
  const startY = lines.length === 1 ? 1580 : lines.length === 2 ? 1535 : 1495;
  const lineHeight = 74;
  const text = lines
    .map((line, lineIndex) => {
      const tspans = line
        .map((word, wordIndex) => {
          const isActiveWord = word.index === activeWordIndex;
          const fill = isActiveWord ? "#00f5ff" : "white";
          const strokeWidth = isActiveWord ? 12 : 8;
          const filter = isActiveWord ? ' filter="url(#activeWordGlow)"' : "";
          const wordGap = wordIndex === 0 ? 0 : 18;
          return `<tspan dx="${wordGap}" fill="${fill}" stroke-width="${strokeWidth}"${filter}>${escapeXml(word.displayText)}</tspan>`;
        })
        .join("");

      return `<text x="540" y="${startY + lineIndex * lineHeight}" text-anchor="middle">${tspans}</text>`;
    })
    .join("");

  return `
<svg width="${VIDEO_WIDTH}" height="${VIDEO_HEIGHT}" viewBox="0 0 ${VIDEO_WIDTH} ${VIDEO_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="activeWordGlow" x="-25%" y="-50%" width="150%" height="200%">
      <feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="#00f5ff" flood-opacity="0.85"/>
      <feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#000000" flood-opacity="0.75"/>
    </filter>
  </defs>
  <style>
    text {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 56px;
      font-weight: 800;
      stroke: black;
      stroke-width: 8px;
      stroke-linejoin: round;
      paint-order: stroke fill;
    }
  </style>
  ${text}
</svg>`;
}

function getWordCaptionLines(words: TimedWord[]): TimedWord[][] {
  const maxLineLength = 34;
  const lines: TimedWord[][] = [];
  let currentLine: TimedWord[] = [];
  let currentLength = 0;

  for (const word of words) {
    const nextLength = currentLine.length === 0
      ? word.displayText.length
      : currentLength + 1 + word.displayText.length;

    if (currentLine.length > 0 && nextLength > maxLineLength) {
      lines.push(currentLine);
      currentLine = [word];
      currentLength = word.displayText.length;
      continue;
    }

    currentLine.push(word);
    currentLength = nextLength;
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines;
}

function createBlankSvg(): string {
  return `<svg width="${VIDEO_WIDTH}" height="${VIDEO_HEIGHT}" viewBox="0 0 ${VIDEO_WIDTH} ${VIDEO_HEIGHT}" xmlns="http://www.w3.org/2000/svg"></svg>`;
}

function createCaptionSvg(lines: string[]): string {
  const startY = lines.length === 1 ? 1580 : 1535;
  const lineHeight = 74;
  const text = lines
    .map((line, index) => {
      const y = startY + index * lineHeight;
      return `<text x="540" y="${y}" text-anchor="middle">${escapeXml(line)}</text>`;
    })
    .join("");

  return `
<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
  <style>
    text {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 56px;
      font-weight: 800;
      fill: white;
      stroke: black;
      stroke-width: 8px;
      stroke-linejoin: round;
      paint-order: stroke fill;
    }
  </style>
  ${text}
</svg>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function concatenateAudio(
  segments: GeneratedSegment[],
  outputPath: string,
  tempDir: string,
): Promise<void> {
  const concatPath = path.join(tempDir, "audio-concat.txt");
  const body = segments.map((segment) => `file '${escapeConcatPath(segment.audioPath)}'`).join("\n");
  await writeFile(concatPath, `${body}\n`, "utf8");

  await runCommand("ffmpeg", [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    concatPath,
    "-c",
    "copy",
    outputPath,
  ]);
}

function escapeConcatPath(filePath: string): string {
  return filePath.replace(/'/g, "'\\''");
}
