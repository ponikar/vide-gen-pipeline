import { mkdtemp, mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { chunkDialogue } from "../../../src/chunk.js";
import type { InputConfig } from "../../../src/types.js";
import { assertBinary, probeVideo } from "../../../src/process.js";
import { renderVideo } from "../../../src/render.js";
import { generateSpeechSegments } from "../../../src/tts.js";
import { resolveVideoSource } from "../../../src/video.js";
import { uploadVideo } from "./storage.js";

export interface GenerateRequest {
  video: string;
  ttsSpeed?: number;
  voices?: Record<string, string>;
  dialogue: Array<{ speaker?: string; text: string }>;
  format?: "subtitles" | "chat";
  chatConfig?: {
    participants: Record<string, { label: string; color: string; align: "left" | "right" }>;
    typingIndicator?: boolean;
  };
}

const OUTPUTS_DIR = path.resolve(import.meta.dirname, "..", "outputs");

function normalizeVideoPath(video: string): string {
  if (video.startsWith("file://")) {
    return video.slice("file://".length);
  }
  return video;
}

export async function assertSystemDeps(): Promise<void> {
  await assertBinary("ffmpeg");
  await assertBinary("ffprobe");
}

export async function runPipeline(request: GenerateRequest, jobId: string): Promise<string> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), `gold-fish-video-${jobId}-`));
  const outputDir = path.join(OUTPUTS_DIR, jobId);
  await mkdir(outputDir, { recursive: true });

  try {
    await assertSystemDeps();

    const outputPath = path.join(outputDir, "output.mp4");

    const video = normalizeVideoPath(request.video);
    const voices = { A: "af_heart", B: "am_adam", ...request.voices };
    const format = request.format ?? "subtitles";
    const ttsSpeed = request.ttsSpeed ?? 1;

    const config: InputConfig = {
      video,
      output: outputPath,
      ttsSpeed,
      voices,
      dialogue: request.dialogue.map((line) => ({
        speaker: line.speaker ?? "A",
        text: line.text,
      })),
      format,
      chatConfig: request.chatConfig as InputConfig["chatConfig"],
    };

    const sourceVideoPath = await resolveVideoSource(config.video, tempDir);
    await probeVideo(sourceVideoPath);

    const chunks = chunkDialogue(config.dialogue);
    if (chunks.length === 0) {
      throw new Error("Dialogue produced no speakable chunks.");
    }

    const segments = await generateSpeechSegments(chunks, config.voices, config.ttsSpeed, tempDir);
    await renderVideo({
      sourceVideoPath,
      segments,
      outputPath,
      tempDir,
      format: config.format,
      chatConfig: config.chatConfig,
    });

    const publicUrl = await uploadVideo(jobId, outputPath);
    return publicUrl;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
