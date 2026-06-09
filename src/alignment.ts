import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { runCommand } from "./process.js";
import type { GeneratedSegment, WordTiming } from "./types.js";

type AlignmentRequest = {
  id: number;
  audioPath: string;
  text: string;
  durationSeconds: number;
};

type AlignmentResponse = {
  segments: Array<{
    id: number;
    words: WordTiming[];
  }>;
};

type RawAlignmentResponse = {
  segments?: unknown;
};

export async function alignSpeechSegments(
  segments: GeneratedSegment[],
  tempDir: string,
): Promise<GeneratedSegment[]> {
  const pythonCommand = getWhisperXPythonCommand();
  await assertWhisperXAvailable(pythonCommand);

  const requestPath = path.join(tempDir, "alignment-requests.json");
  const outputPath = path.join(tempDir, "alignment-results.json");
  const cacheDir = path.resolve(".cache", "whisperx");
  const requests: AlignmentRequest[] = segments.map((segment) => ({
    id: segment.index,
    audioPath: segment.audioPath,
    text: segment.text,
    durationSeconds: segment.durationSeconds,
  }));

  await mkdir(cacheDir, { recursive: true });
  await writeFile(requestPath, JSON.stringify({ segments: requests }, null, 2), "utf8");
  await runCommand(pythonCommand, [
    "scripts/align-whisperx.py",
    "--requests",
    requestPath,
    "--out",
    outputPath,
    "--language",
    "en",
  ], {
    env: {
      HF_HOME: path.join(cacheDir, "huggingface"),
      TORCH_HOME: path.join(cacheDir, "torch"),
      XDG_CACHE_HOME: path.join(cacheDir, "xdg"),
    },
  });

  const response = parseAlignmentResponse(await readFile(outputPath, "utf8"));
  const wordsBySegment = new Map(response.segments.map((segment) => [segment.id, segment.words]));

  return segments.map((segment) => {
    const wordTimings = wordsBySegment.get(segment.index);
    if (!wordTimings || wordTimings.length === 0) {
      throw new Error(`Forced alignment returned no word timings for subtitle chunk ${segment.index}: "${segment.text}"`);
    }

    return {
      ...segment,
      wordTimings,
    };
  });
}

function getWhisperXPythonCommand(): string {
  return process.env.WHISPERX_PYTHON?.trim() || "python3";
}

async function assertWhisperXAvailable(pythonCommand: string): Promise<void> {
  try {
    await runCommand(pythonCommand, ["-c", "import whisperx"]);
  } catch {
    throw new Error(`Word subtitle mode requires WhisperX for forced alignment.

Install it in the Python environment used by ${pythonCommand}, then rerun with --subtitle-mode word.
Example:
  ${pythonCommand} -m pip install whisperx

You can point the CLI at another Python with WHISPERX_PYTHON.

Line subtitles do not require WhisperX:
  npm run generate -- ./example.input.json --subtitle-mode line`);
  }
}

function parseAlignmentResponse(raw: string): AlignmentResponse {
  const parsed = JSON.parse(raw) as RawAlignmentResponse;
  if (!Array.isArray(parsed.segments)) {
    throw new Error("Invalid alignment response: missing segments array.");
  }

  const segments = parsed.segments.map((segment) => {
    if (!isObject(segment)) {
      throw new Error("Invalid alignment response: segment must be an object.");
    }

    const id = segment.id;
    const rawWords = segment.words;
    if (typeof id !== "number" || !Array.isArray(rawWords)) {
      throw new Error("Invalid alignment response: segment id or words are malformed.");
    }

    const words = rawWords.map(parseWordTiming);
    return { id, words };
  });

  return { segments };
}

function parseWordTiming(value: unknown): WordTiming {
  if (!isObject(value)) {
    throw new Error("Invalid alignment response: word timing must be an object.");
  }

  const word = value.word;
  const startSeconds = value.startSeconds;
  const endSeconds = value.endSeconds;

  if (typeof word !== "string" || typeof startSeconds !== "number" || typeof endSeconds !== "number") {
    throw new Error("Invalid alignment response: word timing fields are malformed.");
  }

  if (!Number.isFinite(startSeconds) || !Number.isFinite(endSeconds) || endSeconds <= startSeconds) {
    throw new Error(`Invalid alignment response: bad timing for word "${word}".`);
  }

  return {
    word,
    startSeconds,
    endSeconds,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}
