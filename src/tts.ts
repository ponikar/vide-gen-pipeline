import { copyFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { resolveVoice } from "./config.js";
import { generateCloneSegments } from "./cloner.js";
import { probeDuration } from "./process.js";
import type { CaptionChunk, GeneratedSegment } from "./types.js";

const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";

const CUSTOM_VOICES_DIR = new URL("../voices/", import.meta.url).pathname;

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
  generate: (
    text: string,
    options: { voice: string; speed: number },
  ) => Promise<GeneratedAudio>;
  voices?: Record<string, unknown>;
};

type GeneratedAudio = {
  save: (filePath: string) => void | Promise<void>;
};

const CLONE_PREFIX = "clone:";

export async function generateSpeechSegments(
  chunks: CaptionChunk[],
  voices: Record<string, string>,
  speed: number,
  tempDir: string,
): Promise<GeneratedSegment[]> {
  const { cloneChunks, kokoroChunks } = partitionByClone(chunks, voices);

  const results = new Map<number, GeneratedSegment>();

  if (kokoroChunks.length > 0) {
    const parts = await generateKokoroSegments(kokoroChunks, voices, speed, tempDir);
    for (const s of parts) results.set(s.index, s);
  }

  if (cloneChunks.length > 0) {
    const parts = await generateCloneBatches(cloneChunks, voices, speed, tempDir);
    for (const s of parts) results.set(s.index, s);
  }

  return chunks.map((c) => {
    const found = results.get(c.index);
    if (!found) throw new Error(`Internal error: missing segment ${c.index}`);
    return found;
  });
}

function partitionByClone(
  chunks: CaptionChunk[],
  voices: Record<string, string>,
): { cloneChunks: CaptionChunk[]; kokoroChunks: CaptionChunk[] } {
  const cloneChunks: CaptionChunk[] = [];
  const kokoroChunks: CaptionChunk[] = [];

  for (const chunk of chunks) {
    const voice = resolveVoice(voices, chunk.speaker);
    if (voice.startsWith(CLONE_PREFIX)) {
      cloneChunks.push(chunk);
    } else {
      kokoroChunks.push(chunk);
    }
  }

  return { cloneChunks, kokoroChunks };
}

async function generateCloneBatches(
  chunks: CaptionChunk[],
  voices: Record<string, string>,
  speed: number,
  tempDir: string,
): Promise<GeneratedSegment[]> {
  const bySpeaker = new Map<string, CaptionChunk[]>();
  for (const chunk of chunks) {
    const speaker = chunk.speaker;
    const list = bySpeaker.get(speaker) ?? [];
    list.push(chunk);
    bySpeaker.set(speaker, list);
  }

  const results: GeneratedSegment[] = [];

  for (const [speaker, speakerChunks] of bySpeaker) {
    const voice = resolveVoice(voices, speaker);
    const refName = voice.slice(CLONE_PREFIX.length);
    const parts = await generateCloneSegments(
      speakerChunks,
      refName,
      "am_michael",
      speed,
      tempDir,
    );
    results.push(...parts);
  }

  return results;
}

async function generateKokoroSegments(
  chunks: CaptionChunk[],
  voices: Record<string, string>,
  speed: number,
  tempDir: string,
): Promise<GeneratedSegment[]> {
  const tts = await loadTts();
  const customVoices = await ensureCustomVoices(tts);
  await assertConfiguredVoices(tts, voices, customVoices);

  const segments: GeneratedSegment[] = [];

  for (const chunk of chunks) {
    const voice = resolveVoice(voices, chunk.speaker);
    const audio = await tts.generate(chunk.text, { voice, speed });
    const audioPath = path.join(
      tempDir,
      `segment-${chunk.index.toString().padStart(4, "0")}.wav`,
    );
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

async function ensureCustomVoices(
  tts: KokoroInstance,
): Promise<Set<string>> {
  let customFiles: string[];
  try {
    customFiles = await readdir(CUSTOM_VOICES_DIR);
  } catch {
    return new Set();
  }

  const customNames = customFiles
    .filter((f) => f.endsWith(".bin"))
    .map((f) => f.slice(0, -4));

  if (customNames.length === 0) return new Set();

  const require = createRequire(import.meta.url);
  const kokoroVoicesDir = path.resolve(
    path.dirname(require.resolve("kokoro-js")),
    "..",
    "voices",
  );

  for (const name of customNames) {
    await copyFile(
      path.join(CUSTOM_VOICES_DIR, `${name}.bin`),
      path.join(kokoroVoicesDir, `${name}.bin`),
    );
  }

  (tts as Record<string, unknown>)._validate_voice = (
    voiceName: string,
  ) => voiceName[0];

  return new Set(customNames);
}

async function assertConfiguredVoices(
  tts: KokoroInstance,
  voices: Record<string, string>,
  customVoices: Set<string>,
): Promise<void> {
  if (!tts.voices) return;

  const available = new Set(Object.keys(tts.voices));
  const configured = new Set(
    Object.values(voices).filter((v) => !v.startsWith(CLONE_PREFIX)),
  );

  for (const voice of configured) {
    if (!available.has(voice) && !customVoices.has(voice)) {
      throw new Error(
        `Invalid or unavailable Kokoro voice: ${voice}. ` +
        `Use built-in voice names like "af_heart" or custom blended voices.`,
      );
    }
  }
}
