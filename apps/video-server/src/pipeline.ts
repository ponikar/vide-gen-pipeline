import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { chunkDialogue } from "../../../src/chunk.js";
import { assertBinary, probeVideo } from "../../../src/process.js";
import { renderVideo } from "../../../src/render.js";
import { generateSpeechSegments } from "../../../src/tts.js";
import type { InputConfig } from "../../../src/types.js";
import { resolveVideoSource } from "../../../src/video.js";
import { uploadVideo } from "./storage.js";
import type { Logger } from "../../../src/logger.js";
import { elapsedMs } from "../../../src/logger.js";

export interface GenerateRequest {
	video: string;
	ttsSpeed?: number;
	voices?: Record<string, string>;
	dialogue: Array<{ speaker?: string; text: string }>;
	format?: "subtitles" | "chat";
	chatConfig?: {
		participants: Record<
			string,
			{ label: string; color: string; align: "left" | "right" }
		>;
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

export async function runPipeline(
	request: GenerateRequest,
	jobId: string,
	logger: Logger,
): Promise<string> {
	const tempDir = await mkdtemp(
		path.join(os.tmpdir(), `gold-fish-video-${jobId}-`),
	);
	const outputDir = path.join(OUTPUTS_DIR, jobId);
	const startedAt = performance.now();

	async function runStage<T>(
		stage: string,
		message: string,
		operation: () => Promise<T>,
	): Promise<T> {
		const stageStartedAt = performance.now();
		logger.info("render.stage_started", `${message} started`, { stage });
		try {
			const result = await operation();
			logger.info("render.stage_completed", `${message} completed`, {
				stage,
				durationMs: elapsedMs(stageStartedAt),
			});
			return result;
		} catch (err) {
			logger.error("render.stage_failed", `${message} failed`, err, {
				stage,
				durationMs: elapsedMs(stageStartedAt),
			});
			throw err;
		}
	}

	try {
		await mkdir(outputDir, { recursive: true });
		logger.info("render.started", "Video rendering pipeline started", {
			format: request.format ?? "subtitles",
			dialogueLineCount: request.dialogue.length,
			ttsSpeed: request.ttsSpeed ?? 1,
		});
		await runStage("dependencies", "System dependency check", assertSystemDeps);

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

		const sourceVideoPath = await runStage(
			"source",
			"Video source resolution",
			() => resolveVideoSource(config.video, tempDir),
		);
		await runStage("probe", "Video validation", () => probeVideo(sourceVideoPath));

		const chunks = chunkDialogue(config.dialogue);
		if (chunks.length === 0) {
			throw new Error("Dialogue produced no speakable chunks.");
		}

		const segments = await runStage("tts", "Speech generation", () =>
			generateSpeechSegments(
				chunks,
				config.voices,
				config.ttsSpeed,
				tempDir,
			),
		);
		await runStage("render", "Video composition", () =>
			renderVideo({
				sourceVideoPath,
				segments,
				outputPath,
				tempDir,
				format: config.format,
				chatConfig: config.chatConfig,
			}),
		);

		const publicUrl = await runStage("upload", "Video upload", () =>
			uploadVideo(jobId, outputPath),
		);
		logger.info("render.completed", "Video rendering pipeline completed", {
			durationMs: elapsedMs(startedAt),
		});
		return publicUrl;
	} finally {
		const cleanupStartedAt = performance.now();
		try {
			await rm(tempDir, { recursive: true, force: true });
			logger.debug("render.cleanup_completed", "Temporary files removed", {
				durationMs: elapsedMs(cleanupStartedAt),
			});
		} catch (err) {
			logger.warn("render.cleanup_failed", "Temporary files could not be removed", {
				error: err,
			});
		}
	}
}
