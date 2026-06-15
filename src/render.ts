import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { buildTimedCaptions, getCaptionLines } from "./subtitles.js";
import type { ChatConfig, Format, GeneratedSegment } from "./types.js";
import { runCommand } from "./process.js";
import { renderChatOverlayImages, type ChatOverlaySet } from "./chat.js";

type RenderOptions = {
  sourceVideoPath: string;
  segments: GeneratedSegment[];
  outputPath: string;
  tempDir: string;
  format: Format;
  chatConfig?: ChatConfig;
};

export async function renderVideo(options: RenderOptions): Promise<void> {
  if (options.format === "chat") {
    await renderChatVideo(options);
  } else {
    await renderSubtitlesVideo(options);
  }
}

async function renderChatVideo(options: RenderOptions): Promise<void> {
  if (!options.chatConfig) {
    throw new Error("chatConfig is required for chat format");
  }

  const participants = options.chatConfig.participants;
  if (!participants || Object.keys(participants).length === 0) {
    throw new Error("chatConfig.participants must have at least one participant");
  }

  // Render static overlay images (one per segment)
  const overlaySets = await renderChatOverlayImages(options.segments, options.chatConfig, options.tempDir);

  const captions = buildTimedCaptions(options.segments);

  const segmentVideoPaths: string[] = [];
  for (let i = 0; i < options.segments.length; i++) {
    const segment = options.segments[i];
    const overlays = overlaySets[i];
    const segmentPath = path.join(options.tempDir, `segment-${String(i).padStart(4, "0")}.mp4`);

    await encodeSegmentWithStaticChat({
      sourceVideoPath: options.sourceVideoPath,
      startSeconds: captions[i].startSeconds,
      durationSeconds: segment.durationSeconds,
      imagePath: overlays.after,
      audioPath: segment.audioPath,
      outputPath: segmentPath,
    });

    segmentVideoPaths.push(segmentPath);
  }

  await finalizeVideo(segmentVideoPaths, options.segments, options.outputPath, options.tempDir);
}

async function renderSubtitlesVideo(options: RenderOptions): Promise<void> {
  const captions = buildTimedCaptions(options.segments);
  const captionImagePaths = await createCaptionImages(captions, options.tempDir);

  const segmentVideoPaths: string[] = [];
  for (let i = 0; i < captions.length; i++) {
    const caption = captions[i];
    const segment = options.segments[i];
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

  await finalizeVideo(segmentVideoPaths, options.segments, options.outputPath, options.tempDir);
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

async function encodeSegmentWithStaticChat(options: {
  sourceVideoPath: string;
  startSeconds: number;
  durationSeconds: number;
  imagePath: string;
  audioPath: string;
  outputPath: string;
}): Promise<void> {
  await runCommand("ffmpeg", [
    "-y",
    "-ss", options.startSeconds.toFixed(3),
    "-t", options.durationSeconds.toFixed(3),
    "-i", options.sourceVideoPath,
    "-i", options.audioPath,
    "-i", options.imagePath,
    "-filter_complex",
    "[0:v]scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280[base];" +
    "[base][2:v]overlay=0:0,format=yuv420p[vout]",
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
  ]);
}

async function finalizeVideo(
  segmentVideoPaths: string[],
  segments: Array<{ audioPath: string }>,
  outputPath: string,
  tempDir: string,
): Promise<void> {
  // Concatenate all segment videos
  const videoConcatPath = path.join(tempDir, "video-concat.txt");
  const videoConcatContent = segmentVideoPaths.map((p) => `file '${escapeConcatPath(p)}'`).join("\n");
  await writeFile(videoConcatPath, `${videoConcatContent}\n`, "utf8");

  const videoOnlyPath = path.join(tempDir, "video-only.mp4");
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
  const audioConcatPath = path.join(tempDir, "audio-concat.txt");
  const audioConcatContent = segments.map((s) => `file '${escapeConcatPath(s.audioPath)}'`).join("\n");
  await writeFile(audioConcatPath, `${audioConcatContent}\n`, "utf8");

  const audioOnlyPath = path.join(tempDir, "audio-only.wav");
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
  await mkdir(path.dirname(outputPath), { recursive: true });
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
    outputPath,
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
  const count = Math.min(lines.length, 4);
  const fontSize = count <= 2 ? 38 : 34;
  const lineHeight = 48;
  const startY = { 1: 1050, 2: 1020, 3: 990, 4: 960 }[count] ?? 960;
  const text = lines
    .slice(0, count)
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
      font-size: ${fontSize}px;
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