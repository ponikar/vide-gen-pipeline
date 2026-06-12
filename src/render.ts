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
  const captions = buildTimedCaptions(options.segments);
  const captionImagePaths = await createCaptionImages(captions, options.tempDir);

  // Encode each segment separately (1 overlay per ffmpeg call = low memory)
  const segmentVideoPaths: string[] = [];
  for (let i = 0; i < captions.length; i++) {
    const caption = captions[i];
    const segment = options.segments[i]; // segments and captions are parallel
    const captionImagePath = captionImagePaths[i];
    const segmentPath = path.join(options.tempDir, `segment-${String(i).padStart(4, "0")}.mp4`);

    await encodeSegment({
      sourceVideoPath: options.sourceVideoPath,
      captionImagePath,
      audioPath: segment.audioPath,
      startSeconds: caption.startSeconds,
      durationSeconds: segment.durationSeconds,
      outputPath: segmentPath,
    });

    segmentVideoPaths.push(segmentPath);
  }

  // Concatenate all segment videos
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

  // Concatenate audio
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

  // Merge video + audio
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

async function encodeSegment(options: {
  sourceVideoPath: string;
  captionImagePath: string;
  audioPath: string;
  startSeconds: number;
  durationSeconds: number;
  outputPath: string;
}): Promise<void> {
  await runCommand("ffmpeg", [
    "-y",
    "-ss",
    options.startSeconds.toFixed(3),
    "-t",
    options.durationSeconds.toFixed(3),
    "-i",
    options.sourceVideoPath,
    "-i",
    options.audioPath,
    "-i",
    options.captionImagePath,
    "-filter_complex",
    "[0:v]scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280[base];[base][2:v]overlay=0:0[vout]",
    "-map",
    "[vout]",
    "-map",
    "1:a:0",
    "-threads",
    "1",
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast",
    "-crf",
    "28",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
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

function createCaptionSvg(lines: string[]): string {
  // 720x1280 viewport, font scaled proportionally
  const startY = lines.length === 1 ? 1050 : 1020;
  const lineHeight = 50;
  const text = lines
    .map((line, index) => {
      const y = startY + index * lineHeight;
      return `<text x="360" y="${y}" text-anchor="middle">${escapeXml(line)}</text>`;
    })
    .join("");

  return `
<svg width="720" height="1280" viewBox="0 0 720 1280" xmlns="http://www.w3.org/2000/svg">
  <style>
    text {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 38px;
      font-weight: 800;
      fill: white;
      stroke: black;
      stroke-width: 5px;
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

function escapeConcatPath(filePath: string): string {
  return filePath.replace(/'/g, "'\\''");
}