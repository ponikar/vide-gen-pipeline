import path from "node:path";
import { resolveVoice } from "./config.js";
import { probeDuration } from "./process.js";
import type { CaptionChunk, GeneratedSegment } from "./types.js";

const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";

type KokoroModule = {
  KokoroTTS: {
    from_pretrained: (
      modelId: string,
      options: {
        dtype: "q8";
        device: "cpu";
      },
    ) => Promise<KokoroInstance>;
  };
};

type KokoroInstance = {
  generate: (text: string, options: { voice: string; speed: number }) => Promise<GeneratedAudio>;
  voices?: Record<string, unknown>;
};

type GeneratedAudio = {
  save: (filePath: string) => void | Promise<void>;
};

export async function generateSpeechSegments(
  chunks: CaptionChunk[],
  voices: Record<string, string>,
  speed: number,
  tempDir: string,
): Promise<GeneratedSegment[]> {
  const tts = await loadTts();
  await assertConfiguredVoices(tts, voices);
  const segments: GeneratedSegment[] = [];

  for (const chunk of chunks) {
    const voice = resolveVoice(voices, chunk.speaker);
    const audio = await tts.generate(chunk.text, { voice, speed });
    const audioPath = path.join(tempDir, `segment-${chunk.index.toString().padStart(4, "0")}.wav`);
    await audio.save(audioPath);
    const durationSeconds = await probeDuration(audioPath);

    segments.push({
      ...chunk,
      audioPath,
      durationSeconds,
    });
  }

  return segments;
}

async function loadTts(): Promise<KokoroInstance> {
  const module = (await import("kokoro-js")) as unknown as KokoroModule;
  return module.KokoroTTS.from_pretrained(MODEL_ID, {
    dtype: "q8",
    device: "cpu",
  });
}

async function assertConfiguredVoices(tts: KokoroInstance, voices: Record<string, string>): Promise<void> {
  if (!tts.voices) {
    return;
  }

  const available = new Set(Object.keys(tts.voices));
  const configured = new Set(Object.values(voices));

  for (const voice of configured) {
    if (!available.has(voice)) {
      throw new Error(`Invalid or unavailable Kokoro voice: ${voice}`);
    }
  }
}
