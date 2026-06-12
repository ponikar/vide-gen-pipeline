import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { getCaptionLines } from "./subtitles.js";
import type { GeneratedSegment } from "./types.js";
import { runCommand } from "./process.js";

type CaptionSlot = {
  text: string;
  startSeconds: number;
  endSeconds: number;
};

type MergedSlot = {
  captionText: string;
  startSeconds: number;
  endSeconds: number;
  segments: GeneratedSegment[];
};

export async function renderVideo(options: {
  sourceVideoPath: string;
  segments: GeneratedSegment[];
  outputPath: string;
  tempDir: string;
}): Promise<void> {
  const slots = buildCaptionSlots(options.segments);
  const mergedSlots = mergeConsecutiveSameSpeaker(slots, options.segments);

  const segmentVideoPaths: string[] = [];

  for (let i = 0; i < mergedSlots.length; i++) {
    const slot = mergedSlots[i];
    const captionImagePath = path.join(options.tempDir, `caption-${String(i).padStart(4, "0")}.png`);
    await createCaptionImage(slot.captionText, captionImagePath);

    const audioPath = await mergeAudio(slot.segments, options.tempDir, i);
    const segmentPath = path.join(options.tempDir, `segment-${String(i).padStart(4, "0")}.mp4`);

    await encodeSegment({
      sourceVideoPath: options.sourceVideoPath,
      captionImagePath,
      audioPath,
      startSeconds: slot.startSeconds,
      durationSeconds: slot.endSeconds - slot.startSeconds,
      outputPath: segmentPath,
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

function buildCaptionSlots(segments: GeneratedSegment[]): CaptionSlot[] {
  let cursor = 0;
  return segments.map((s) => {
    const start = cursor;
    const end = cursor + s.durationSeconds;
    cursor = end;
    return { text: s.text, startSeconds: start, endSeconds: end };
  });
}

function mergeConsecutiveSameSpeaker(
  slots: CaptionSlot[],
  segments: GeneratedSegment[],
): MergedSlot[] {
  const merged: MergedSlot[] = [];
  let i = 0;

  while (i < slots.length) {
    const group: { slot: CaptionSlot; segment: GeneratedSegment }[] = [
      { slot: slots[i], segment: segments[i] },
    ];

    // Merge consecutive segments from the same speaker
    while (
      i + 1 < slots.length &&
      segments[i + 1].speaker === segments[i].speaker
    ) {
      i++;
      group.push({ slot: slots[i], segment: segments[i] });
    }

    const captionText = group.map((g) => g.slot.text).join(" ");
    merged.push({
      captionText,
      startSeconds: group[0].slot.startSeconds,
      endSeconds: group[group.length - 1].slot.endSeconds,
      segments: group.map((g) => g.segment),
    });

    i++;
  }

  return merged;
}

async function mergeAudio(
  segments: GeneratedSegment[],
  tempDir: string,
  groupIndex: number,
): Promise<string> {
  if (segments.length === 1) {
    return segments[0].audioPath;
  }

  const concatPath = path.join(tempDir, `audio-group-${String(groupIndex).padStart(4, "0")}.txt`);
  const outPath = path.join(tempDir, `audio-group-${String(groupIndex).padStart(4, "0")}.wav`);

  const content = segments.map((s) => `file '${escapeConcatPath(s.audioPath)}'`).join("\n");
  await writeFile(concatPath, `${content}\n`, "utf8");

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
    outPath,
  ]);

  return outPath;
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

async function createCaptionImage(
  captionText: string,
  outputPath: string,
): Promise<void> {
  const lines = getCaptionLines(captionText);
  await sharp(Buffer.from(createCaptionSvg(lines))).png().toFile(outputPath);
}

function createCaptionSvg(lines: string[]): string {
  const maxLines = Math.min(lines.length, 3);
  const startY = maxLines === 1 ? 1050 : maxLines === 2 ? 1020 : 980;
  const lineHeight = 50;
  const text = lines
    .slice(0, maxLines)
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
