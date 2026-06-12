import { spawn } from "node:child_process";
import path from "node:path";
import type { CaptionChunk, GeneratedSegment } from "./types.js";

const CLONER_SCRIPT = path.resolve(
  import.meta.dirname,
  "..",
  "scripts",
  "run-cloner.py",
);

const VOICES_DIR = path.resolve(import.meta.dirname, "..", "voices");

type CloneRequest = {
  segments: { text: string; path: string }[];
  reference: string;
  baseVoice: string;
  speed: number;
};

type CloneResponse = {
  status: "ok";
  count: number;
  durations: number[];
} | {
  status: "error";
  message: string;
};

export async function generateCloneSegments(
  chunks: CaptionChunk[],
  referenceName: string,
  baseVoice: string,
  speed: number,
  tempDir: string,
): Promise<GeneratedSegment[]> {
  const refPath = path.join(VOICES_DIR, `${referenceName}.wav`);

  const request: CloneRequest = {
    segments: chunks.map((c) => ({
      text: c.text,
      path: path.join(
        tempDir,
        `segment-${c.index.toString().padStart(4, "0")}.wav`,
      ),
    })),
    reference: refPath,
    baseVoice,
    speed,
  };

  const result = await runCloneProcess(request);

  if (result.status === "error") {
    throw new Error(`Voice cloning failed: ${result.message}`);
  }

  return chunks.map((chunk, i) => ({
    ...chunk,
    audioPath: path.join(
      tempDir,
      `segment-${chunk.index.toString().padStart(4, "0")}.wav`,
    ),
    durationSeconds: result.durations[i],
  }));
}

async function runCloneProcess(request: CloneRequest): Promise<CloneResponse> {
  return new Promise((resolve, reject) => {
    const proc = spawn("python3", [CLONER_SCRIPT], {
      stdio: ["pipe", "pipe", "inherit"],
    });

    let stdout = "";

    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `Cloner exited with code ${code}. Check the error output above.`,
          ),
        );
        return;
      }
      try {
        resolve(JSON.parse(stdout) as CloneResponse);
      } catch (cause) {
        reject(
          new Error(
            `Invalid JSON from cloner: ${stdout.slice(-500)}`,
            { cause },
          ),
        );
      }
    });

    proc.on("error", reject);

    proc.stdin.write(JSON.stringify(request));
    proc.stdin.end();
  });
}
