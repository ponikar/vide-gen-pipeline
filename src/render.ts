import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

import type { GeneratedSegment } from "./types.js";
import { runCommand } from "./process.js";

type WordFrame = {
  index: number;
  start: number;
  end: number;
};

export async function renderVideo(options: {
  sourceVideoPath: string;
  segments: GeneratedSegment[];
  outputPath: string;
  tempDir: string;
}): Promise<void> {
  const segmentVideoPaths: string[] = [];

  let cursor = 0;
  for (let i = 0; i < options.segments.length; i++) {
    const segment = options.segments[i];
    const startSeconds = cursor;
    cursor += segment.durationSeconds;

    const words = segment.text.split(/\s+/).filter(Boolean);
    const totalChars = words.reduce((s, w) => s + w.length, 0);
    const wordFrames = computeWordFrames(words, totalChars, segment.durationSeconds);

    const segmentPath = path.join(options.tempDir, `segment-${String(i).padStart(4, "0")}.mp4`);

    await encodeSegmentWithHighlights({
      sourceVideoPath: options.sourceVideoPath,
      audioPath: segment.audioPath,
      words,
      wordFrames,
      durationSeconds: segment.durationSeconds,
      startSeconds,
      outputPath: segmentPath,
      tempDir: options.tempDir,
      index: i,
    });

    segmentVideoPaths.push(segmentPath);
  }

  const videoConcatPath = path.join(options.tempDir, "video-concat.txt");
  const videoConcatContent = segmentVideoPaths.map((p) => `file '${escapeConcatPath(p)}'`).join("\n");
  await writeFile(videoConcatPath, `${videoConcatContent}\n`, "utf8");

  const videoOnlyPath = path.join(options.tempDir, "video-only.mp4");
  await runCommand("ffmpeg", [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    videoConcatPath,
    "-c",
    "copy",
    videoOnlyPath,
  ]);

  const audioConcatPath = path.join(options.tempDir, "audio-concat.txt");
  const audioConcatContent = options.segments.map((s) => `file '${escapeConcatPath(s.audioPath)}'`).join("\n");
  await writeFile(audioConcatPath, `${audioConcatContent}\n`, "utf8");

  const audioOnlyPath = path.join(options.tempDir, "audio-only.wav");
  await runCommand("ffmpeg", [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    audioConcatPath,
    "-c",
    "copy",
    audioOnlyPath,
  ]);

  await mkdir(path.dirname(options.outputPath), { recursive: true });
  await runCommand("ffmpeg", [
    "-y",
    "-i",
    videoOnlyPath,
    "-i",
    audioOnlyPath,
    "-c",
    "copy",
    "-movflags",
    "+faststart",
    options.outputPath,
  ]);
}

function computeWordFrames(
  words: string[],
  totalChars: number,
  durationSeconds: number,
): WordFrame[] {
  let cursor = 0;
  return words.map((word, index) => {
    const wordDuration = (word.length / totalChars) * durationSeconds;
    const start = cursor;
    const end = cursor + wordDuration;
    cursor = end;
    return { index, start, end };
  });
}

type EncodeOptions = {
  sourceVideoPath: string;
  audioPath: string;
  words: string[];
  wordFrames: WordFrame[];
  durationSeconds: number;
  startSeconds: number;
  outputPath: string;
  tempDir: string;
  index: number;
};

async function encodeSegmentWithHighlights(options: EncodeOptions): Promise<void> {
  const imagePaths = await Promise.all(
    options.wordFrames.map((wf) =>
      createHighlightImage(options.words, wf.index, options.tempDir, options.index, wf.index),
    ),
  );

  const args: string[] = [
    "-y",
    "-ss", options.startSeconds.toFixed(3),
    "-t", options.durationSeconds.toFixed(3),
    "-i", options.sourceVideoPath,
    "-i", options.audioPath,
    ...imagePaths.flatMap((p) => ["-i", p]),
    "-filter_complex",
    buildOverlayFilter(options.wordFrames),
    "-map", "[vout]",
    "-map", "1:a:0",
    "-threads", "1",
    "-c:v", "libx264",
    "-preset", "ultrafast",
    "-crf", "28",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "128k",
    "-shortest",
    "-movflags", "+faststart",
    options.outputPath,
  ];

  await runCommand("ffmpeg", args);
}

function buildOverlayFilter(wordFrames: WordFrame[]): string {
  let filter = "[0:v]scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280[base]";
  let prevLabel = "base";

  for (let i = 0; i < wordFrames.length; i++) {
    const wf = wordFrames[i];
    const inputIdx = 2 + i;
    const nextLabel = i === wordFrames.length - 1 ? "vout" : `v${i}`;
    const enable = `between(t,${wf.start.toFixed(3)},${wf.end.toFixed(3)})`;
    filter += `;[${prevLabel}][${inputIdx}:v]overlay=0:0:enable='${enable}'[${nextLabel}]`;
    prevLabel = nextLabel;
  }

  return filter;
}

async function createHighlightImage(
  words: string[],
  highlightIndex: number,
  tempDir: string,
  segmentIndex: number,
  wordIndex: number,
): Promise<string> {
  const outputPath = path.join(
    tempDir,
    `highlight-${String(segmentIndex).padStart(4, "0")}-${String(wordIndex).padStart(4, "0")}.png`,
  );
  const svg = createHighlightSvg(words, highlightIndex);
  await sharp(Buffer.from(svg)).png().toFile(outputPath);
  return outputPath;
}

function createHighlightSvg(words: string[], highlightIndex: number): string {
  const fontSize = 38;
  const lineHeight = 50;

  // Wrap words into display lines (~10 words per line to fit ~35 chars)
  const wrappedLines: string[][] = [];
  for (const w of words) {
    const last = wrappedLines[wrappedLines.length - 1];
    if (!last || last.join(" ").length > 32) {
      wrappedLines.push([w]);
    } else {
      last.push(w);
    }
  }
  while (wrappedLines.length > 3) wrappedLines.pop();

  const lineCount = wrappedLines.length;
  const startY = [0, 1050, 1020, 990][lineCount] ?? 990;

  let wordIdx = 0;
  const lineEls = wrappedLines.map((lineWords, li) => {
    const y = startY + li * lineHeight;
    const tspans = lineWords.map((w, wi) => {
      const isHighlight = wordIdx === highlightIndex;
      wordIdx++;
      const prefix = wi === 0 ? "" : " ";
      return `<tspan fill="${isHighlight ? "#FFD700" : "white"}">${prefix}${escapeXml(w)}</tspan>`;
    }).join("");
    return `<text x="360" y="${y}" text-anchor="middle">${tspans}</text>`;
  }).join("");

  return `
<svg width="720" height="1280" viewBox="0 0 720 1280" xmlns="http://www.w3.org/2000/svg">
  <style>
    text {
      font-family: Arial, Helvetica, sans-serif;
      font-size: ${fontSize}px;
      font-weight: 800;
      stroke: black;
      stroke-width: 5px;
      stroke-linejoin: round;
      paint-order: stroke fill;
    }
  </style>
  ${lineEls}
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

function escapeConcatPath(filePath: string): string {
  return filePath.replace(/'/g, "'\\''");
}
