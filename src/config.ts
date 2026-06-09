import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { CliOptions, InputConfig } from "./types.js";

const dialogueSchema = z.object({
  speaker: z.string().trim().min(1).optional(),
  text: z.string().trim().min(1),
});

const inputSchema = z.object({
  video: z.string().trim().min(1),
  output: z.string().trim().min(1).optional(),
  ttsSpeed: z.number().positive().max(3).optional(),
  voices: z.record(z.string().trim().min(1)).optional(),
  dialogue: z.array(dialogueSchema).min(1),
});

type RawInputConfig = z.infer<typeof inputSchema>;

export function parseCliArgs(argv: string[]): CliOptions {
  const positional: string[] = [];
  let outputOverride: string | undefined;
  let keepTemp = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--keep-temp") {
      keepTemp = true;
      continue;
    }

    if (arg === "--out") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Missing value for --out.");
      }
      outputOverride = value;
      index += 1;
      continue;
    }

    if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    }

    positional.push(arg);
  }

  if (positional.length !== 1) {
    throw new Error("Usage: npm run generate -- ./input.json [--out ./out/reel.mp4] [--keep-temp]");
  }

  return {
    inputPath: positional[0],
    outputOverride,
    keepTemp,
  };
}

export async function loadInputConfig(inputPath: string, outputOverride?: string): Promise<InputConfig> {
  const raw = await readFile(inputPath, "utf8");
  const parsedJson = parseJson(raw, inputPath);
  const parsed = inputSchema.safeParse(parsedJson);

  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Invalid input JSON: ${details}`);
  }

  return normalizeConfig(parsed.data, inputPath, outputOverride);
}

export function normalizeConfig(
  input: RawInputConfig,
  inputPath: string,
  outputOverride?: string,
): InputConfig {
  const inputDir = path.dirname(path.resolve(inputPath));
  const output = outputOverride ?? input.output ?? "./out/reel.mp4";
  const voices = {
    A: "af_heart",
    B: "am_adam",
    ...input.voices,
  };

  return {
    video: resolveMaybeLocalPath(input.video, inputDir),
    output: path.resolve(inputDir, output),
    ttsSpeed: input.ttsSpeed ?? 1,
    voices,
    dialogue: input.dialogue.map((line) => ({
      speaker: line.speaker ?? "A",
      text: line.text,
    })),
  };
}

export function resolveVoice(voices: Record<string, string>, speaker: string): string {
  return voices[speaker] ?? voices.default ?? "af_heart";
}

function parseJson(raw: string, inputPath: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON in ${inputPath}: ${message}`);
  }
}

function resolveMaybeLocalPath(value: string, baseDir: string): string {
  if (isHttpUrl(value)) {
    return value;
  }
  return path.resolve(baseDir, value);
}

export function isHttpUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}
