import { spawn } from "node:child_process";
import type { VideoMetadata } from "./types.js";

export async function assertBinary(name: string): Promise<void> {
  try {
    await runCommand(name, ["-version"]);
  } catch {
    throw new Error(`Missing required system binary: ${name}. Install it before generating videos.`);
  }
}

export type CommandOptions = {
  env?: Record<string, string>;
};

export async function runCommand(command: string, args: string[], options: CommandOptions = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: options.env ? { ...process.env, ...options.env } : process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));

    child.on("error", reject);
    child.on("close", (code) => {
      const output = Buffer.concat(stdout).toString("utf8");
      const errorOutput = Buffer.concat(stderr).toString("utf8");

      if (code === 0) {
        resolve(output);
        return;
      }

      reject(new Error(`${command} failed with exit code ${code ?? "unknown"}.\n${errorOutput}`));
    });
  });
}

export async function probeDuration(filePath: string): Promise<number> {
  const output = await runCommand("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    filePath,
  ]);
  const duration = Number(output.trim());

  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(`Could not read duration for ${filePath}.`);
  }

  return duration;
}

export async function probeVideo(filePath: string): Promise<VideoMetadata> {
  const output = await runCommand("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height:format=duration",
    "-of",
    "json",
    filePath,
  ]);
  const parsed = parseProbeJson(output);
  const stream = parsed.streams[0];

  const durationSeconds = toPositiveNumber(parsed.format.duration);

  if (!stream || stream.width <= 0 || stream.height <= 0 || durationSeconds === null) {
    throw new Error(`Could not read video metadata for ${filePath}.`);
  }

  return {
    width: stream.width,
    height: stream.height,
    durationSeconds,
  };
}

function parseProbeJson(output: string): ProbeOutput {
  const parsed = JSON.parse(output) as unknown;

  if (!isProbeOutput(parsed)) {
    throw new Error("Unexpected ffprobe output.");
  }

  return parsed;
}

type ProbeOutput = {
  streams: Array<{
    width: number;
    height: number;
  }>;
  format: {
    duration: number | string;
  };
};

function isProbeOutput(value: unknown): value is ProbeOutput {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as {
    streams?: unknown;
    format?: unknown;
  };

  if (!Array.isArray(candidate.streams) || !candidate.format || typeof candidate.format !== "object") {
    return false;
  }

  const format = candidate.format as { duration?: unknown };
  const stream = candidate.streams[0] as { width?: unknown; height?: unknown } | undefined;

  return (
    (typeof format.duration === "number" || typeof format.duration === "string") &&
    !!stream &&
    typeof stream.width === "number" &&
    typeof stream.height === "number"
  );
}

function toPositiveNumber(value: number | string): number | null {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }
  return numeric;
}
