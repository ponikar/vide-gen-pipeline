import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { buildTimedCaptions, getCaptionLines } from "./subtitles.js";
import type { GeneratedSegment } from "./types.js";
import { runCommand } from "./process.js";

export async function renderVideo(options: {
  sourceVideoPath: string;
  segments: GeneratedSegment[];
  outputPath: string;
  tempDir: string;
}): Promise<void> {
  const narrationPath = path.join(options.tempDir, "narration.wav");
  const narrationDurationSeconds = options.segments.reduce((total, segment) => total + segment.durationSeconds, 0);
  const captions = buildTimedCaptions(options.segments);

  await concatenateAudio(options.segments, narrationPath, options.tempDir);
  const captionImagePaths = await createCaptionImages(captions, options.tempDir);
  await mkdir(path.dirname(options.outputPath), { recursive: true });

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
  const parts = ["[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[base]"];
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
