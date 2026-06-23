import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type {
	ChatConfig,
	CliOptions,
	InputConfig,
	ParticipantStyle,
} from "./types.js";

const dialogueSchema = z
	.object({
		speaker: z.string().trim().min(1).optional(),
		text: z.string().trim().min(1),
	})
	.strict();

const participantStyleSchema = z
	.object({
		label: z.string().trim().min(1),
		color: z.string().trim().min(1),
		align: z.enum(["left", "right"]),
	})
	.strict();

const chatConfigSchema = z
	.object({
		participants: z.record(participantStyleSchema),
		typingIndicator: z.boolean().optional(),
	})
	.strict();

const inputSchema = z
	.object({
		video: z.string().trim().min(1),
		output: z.string().trim().min(1).optional(),
		ttsSpeed: z.number().positive().max(3).optional(),
		voices: z.record(z.string().trim().min(1)).optional(),
		dialogue: z.array(dialogueSchema).min(1),
		format: z.enum(["subtitles", "chat"]).optional(),
		chatConfig: chatConfigSchema.optional(),
	})
	.strict();

type RawInputConfig = z.infer<typeof inputSchema>;

export function parseCliArgs(argv: string[]): CliOptions {
	const positional: string[] = [];
	let outputOverride: string | undefined;
	let videoOverride: string | undefined;
	let speedOverride: number | undefined;
	const voiceOverrides: Record<string, string> = {};
	let keepTemp = false;
	let help = false;

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];

		if (arg === "--help" || arg === "-h") {
			help = true;
			continue;
		}

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

		if (arg === "--video") {
			const value = argv[index + 1];
			if (!value) {
				throw new Error("Missing value for --video.");
			}
			videoOverride = value;
			index += 1;
			continue;
		}

		if (arg === "--speed") {
			const value = argv[index + 1];
			if (!value) {
				throw new Error("Missing value for --speed.");
			}
			speedOverride = parseSpeedFlag(value);
			index += 1;
			continue;
		}

		if (arg === "--voice") {
			const value = argv[index + 1];
			if (!value) {
				throw new Error("Missing value for --voice.");
			}
			const [speaker, voice] = parseVoiceFlag(value);
			voiceOverrides[speaker] = voice;
			index += 1;
			continue;
		}

		if (arg.startsWith("--")) {
			throw new Error(`Unknown option: ${arg}\n\n${getUsageText()}`);
		}

		positional.push(arg);
	}

	if (help) {
		return {
			inputPath: positional[0],
			help,
			outputOverride,
			videoOverride,
			speedOverride,
			voiceOverrides,
			keepTemp,
		};
	}

	if (positional.length !== 1) {
		throw new Error(
			`Please pass exactly one input JSON file.\n\n${getUsageText()}`,
		);
	}

	return {
		inputPath: positional[0],
		help,
		outputOverride,
		videoOverride,
		speedOverride,
		voiceOverrides,
		keepTemp,
	};
}

export async function loadInputConfig(
	options: CliOptions,
): Promise<InputConfig> {
	if (!options.inputPath) {
		throw new Error(`Please pass an input JSON file.\n\n${getUsageText()}`);
	}

	const inputPath = options.inputPath;
	const raw = await readInputFile(inputPath);
	const parsedJson = parseJson(raw, inputPath);
	const parsed = inputSchema.safeParse(parsedJson);

	if (!parsed.success) {
		throw new Error(formatInputError(parsed.error, inputPath));
	}

	return normalizeConfig(parsed.data, inputPath, options);
}

export function normalizeConfig(
	input: RawInputConfig,
	inputPath: string,
	overrides: Partial<
		Pick<
			CliOptions,
			"outputOverride" | "videoOverride" | "speedOverride" | "voiceOverrides"
		>
	> = {},
): InputConfig {
	const inputDir = path.dirname(path.resolve(inputPath));
	const output = overrides.outputOverride ?? input.output ?? "./out/reel.mp4";
	const video = overrides.videoOverride ?? input.video;
	const voices = {
		A: "af_heart",
		B: "am_adam",
		...input.voices,
		...overrides.voiceOverrides,
	};
	const format = input.format ?? "subtitles";

	let chatConfig: ChatConfig | undefined = input.chatConfig as
		| ChatConfig
		| undefined;
	if (format === "chat" && !chatConfig) {
		const speakerKeys = Object.keys(voices);
		const participants: Record<string, ParticipantStyle> = {};
		const colors = ["#007AFF", "#E5E5EA"];
		const aligns: Array<"right" | "left"> = ["right", "left"];
		speakerKeys.forEach((key, i) => {
			participants[key] = {
				label: key,
				color: colors[i % 2],
				align: aligns[i % 2],
			};
		});
		chatConfig = { participants, typingIndicator: true };
	}

	return {
		video: resolveMaybeLocalPath(video, inputDir),
		output: path.resolve(inputDir, output),
		ttsSpeed: overrides.speedOverride ?? input.ttsSpeed ?? 1,
		voices,
		dialogue: input.dialogue.map((line) => ({
			speaker: line.speaker ?? "A",
			text: line.text,
		})),
		format,
		chatConfig,
	};
}

export function resolveVoice(
	voices: Record<string, string>,
	speaker: string,
): string {
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

async function readInputFile(inputPath: string): Promise<string> {
	try {
		return await readFile(inputPath, "utf8");
	} catch {
		throw new Error(`Could not read input JSON file: ${inputPath}

Please pass a readable JSON config file.

${getUsageText()}`);
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

export function getUsageText(): string {
	return `Usage:
  npm run generate -- <input.json> [options]

Required:
  <input.json>             JSON config with video and dialogue.

Options:
  -h, --help               Show this help text.
  --out <path>             Override output MP4 path.
  --video <path-or-url>    Override background MP4 path or direct MP4 URL.
  --speed <number>         Override Kokoro TTS speed. Example: 1.25.
  --voice <speaker=voice>  Override speaker voice. Repeatable. Example: --voice A=am_michael.
  --keep-temp              Keep temporary audio/caption files for debugging.

Input JSON shape:
{
  "video": "./assets/subway.mp4",
  "output": "./out/reel.mp4",
  "ttsSpeed": 1.25,
  "voices": { "A": "af_heart", "B": "am_adam" },
  "dialogue": [
    { "speaker": "A", "text": "Here is the first line." }
  ]

Chat format (iMessage overlay):
{
  "format": "chat",
  "video": "./assets/subway.mp4",
  "output": "./out/chat.mp4",
  "ttsSpeed": 1.0,
  "voices": { "Peter": "clone:voices/peter.wav", "Stewie": "am_stewie" },
  "chatConfig": {
    "participants": {
      "Peter": { "label": "Peter Griffin", "color": "#E5E5EA", "align": "left" },
      "Stewie": { "label": "Stewie Griffin", "color": "#007AFF", "align": "right" }
    }
  },
  "dialogue": [
    { "speaker": "Peter", "text": "What about you" },
    { "speaker": "Stewie", "text": "Row seven. Listed as contingency." }
  ]
}`;
}

function parseSpeedFlag(value: string): number {
	const speed = Number(value);
	if (!Number.isFinite(speed) || speed <= 0 || speed > 3) {
		throw new Error(
			"--speed must be a number greater than 0 and less than or equal to 3.",
		);
	}
	return speed;
}

function parseVoiceFlag(value: string): [string, string] {
	const separatorIndex = value.indexOf("=");
	if (separatorIndex <= 0 || separatorIndex === value.length - 1) {
		throw new Error(
			"--voice must use speaker=voice format. Example: --voice A=am_michael.",
		);
	}

	const speaker = value.slice(0, separatorIndex).trim();
	const voice = value.slice(separatorIndex + 1).trim();
	if (!speaker || !voice) {
		throw new Error("--voice must use non-empty speaker and voice values.");
	}

	return [speaker, voice];
}

function formatInputError(
	error: z.ZodError<RawInputConfig>,
	inputPath: string,
): string {
	const details = error.issues
		.map((issue) => {
			const field = issue.path.length > 0 ? issue.path.join(".") : "root";
			return `- ${field}: ${issue.message}`;
		})
		.join("\n");

	return `Invalid input JSON: ${inputPath}

${details}

Please pass a config matching this shape:
${getUsageText()}`;
}
