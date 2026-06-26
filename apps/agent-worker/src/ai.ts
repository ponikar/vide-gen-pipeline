import { google } from "@ai-sdk/google";
import {
	extractJsonMiddleware,
	generateObject,
	NoObjectGeneratedError,
	wrapLanguageModel,
	zodSchema,
} from "ai";
import type { LanguageModelV3 } from "@ai-sdk/provider";
import type { LanguageModel } from "ai";
import { minimaxOpenAI } from "vercel-minimax-ai-provider";
import { z } from "zod";
import {
	formatBackgroundVideoOptions,
	getCaptionFormula,
	getDialogueRules,
	getHookCheatSheet,
	type BackgroundVideoOption,
} from "./skills.js";

const LOG_PREFIX = "[agent-worker.ai]";

function extractJsonObject(text: string): string {
	const trimmed = text
		.trim()
		.replace(/^```(?:json)?\s*\n?/i, "")
		.replace(/\n?```\s*$/i, "")
		.trim();
	const start = trimmed.indexOf("{");
	const end = trimmed.lastIndexOf("}");

	if (start >= 0 && end > start) {
		return trimmed.slice(start, end + 1);
	}
	return trimmed;
}

function withJsonExtraction(model: LanguageModelV3): LanguageModel {
	return wrapLanguageModel({
		model,
		middleware: extractJsonMiddleware({ transform: extractJsonObject }),
	});
}

function preview(value: string | undefined, max = 500): string | undefined {
	if (!value) return undefined;
	const normalized = value.replace(/\s+/g, " ").trim();
	return normalized.length > max
		? `${normalized.slice(0, max).trim()}...`
		: normalized;
}

async function jsonOnlyInstructions<T>(schema: z.ZodType<T>): Promise<string> {
	const jsonSchema = await zodSchema(schema).jsonSchema;
	return [
		"Return only one valid JSON object that matches this JSON Schema.",
		"Do not include markdown, code fences, headings, commentary, or prose outside the JSON object.",
		"If a field is uncertain, fill it with the best available short value that still matches the schema.",
		"",
		"JSON Schema:",
		JSON.stringify(jsonSchema),
	].join("\n");
}

function getModel(): LanguageModel {
	const provider = process.env.AI_PROVIDER ?? "google";
	switch (provider) {
		case "google":
			return withJsonExtraction(google("gemini-2.0-flash-lite"));
		case "minimax":
			return withJsonExtraction(minimaxOpenAI("MiniMax-M2"));
		default:
			return withJsonExtraction(google("gemini-2.0-flash-lite"));
	}
}

async function generateStructured<T>(
	label: string,
	schema: z.ZodType<T>,
	system: string,
	prompt: string,
): Promise<T> {
	try {
		const strictSystem = [
			system,
			"",
			await jsonOnlyInstructions(schema),
		].join("\n");
		const { object } = await generateObject({
			model: getModel(),
			system: strictSystem,
			prompt,
			schema,
			schemaName: label,
			temperature: 0.7,
		});
		return object;
	} catch (err) {
		if (NoObjectGeneratedError.isInstance(err)) {
			const causeMessage =
				err.cause instanceof Error ? err.cause.message : undefined;
			console.error(LOG_PREFIX, "structured_generation_failed", {
				label,
				message: err.message,
				cause: causeMessage,
				finishReason: err.finishReason,
				model: err.response?.modelId,
				textPreview: preview(err.text),
			});
			throw new Error(
				`AI structured generation failed during ${label}: ${err.message}`,
			);
		}
		throw err;
	}
}

const learningSchema = z.object({
	lessons: z.string(),
	topPerformingPatterns: z.array(z.string()),
	recommendedDirection: z.string(),
});

const researchSchema = z.object({
	analysis: z.string(),
	recommendedFocus: z.string(),
	tone: z.string(),
	hookFormula: z.string().min(1),
	templateType: z.string().min(1),
});

const hookSchema = z.object({
	variants: z
		.array(
			z.object({
				text: z.string(),
				specificity: z.coerce.number().min(1).max(5),
				tension: z.coerce.number().min(1).max(5),
				payability: z.coerce.number().min(1).max(5),
			}),
		)
		.min(3)
		.max(10),
	selectedText: z.string(),
});

const dialogueSchema = z.object({
	dialogue: z
		.array(
			z.object({
				speaker: z.string(),
				text: z.string(),
			}),
		)
		.min(1),
	format: z.enum(["subtitles", "chat"]).optional(),
	ttsSpeed: z.coerce.number().positive().max(3).optional(),
	videoType: z.string().min(1),
	videoDescription: z.string(),
	videoCategory: z.string().min(1),
});

const captionSchema = z.object({
	instagram: z.string(),
	tiktok: z.string(),
});

export async function learnFromHistory(historicalPosts: string) {
	return generateStructured(
		"learnFromHistory",
		learningSchema,
		"You are a content performance analyst. Analyze historical posts and identify what's working and what's not.",
		[
			"Analyze these historical posts and their performance:",
			historicalPosts,
			"",
			"Identify: what hook patterns/formats got the best engagement, what didn't work, and what direction to take next.",
		].join("\n"),
	);
}

export async function research(
	appName: string,
	appDescription: string,
	learnings: string,
	hookSkill: string,
) {
	return generateStructured(
		"research",
		researchSchema,
		[
			"You are a social media content strategist for indie app developers.",
			"Analyze the app, apply learnings from past performance, and pick the best hook formula and template.",
			"",
			"Available hook formulas and templates:",
			hookSkill,
		].join("\n"),
		[
			`App: ${appName}`,
			appDescription ? `Description: ${appDescription}` : "",
			"",
			`Learnings from past posts:\n${learnings}`,
			"",
			"Pick a hook formula from the available list. Pick a template type. Set the tone for the script.",
			"Explain your analysis and focus recommendation.",
		]
			.filter(Boolean)
			.join("\n"),
	);
}

export async function generateHooks(
	appName: string,
	appDescription: string,
	tone: string,
	hookFormula: string,
	templateType: string,
	hookSkill: string,
) {
	return generateStructured(
		"generateHooks",
		hookSchema,
		[
			"You are a hook writer for short-form video. Generate 8-10 hook variants using the specified formula.",
			"Each hook is sentence 1 of the script — no setup, no context, starts mid-conflict.",
			"",
			`Formula to use: ${hookFormula}`,
			`Template: ${templateType}`,
			`Tone: ${tone}`,
			"",
			"Scoring guide:",
			hookSkill,
		].join("\n"),
		[
			`App: ${appName}`,
			appDescription ? `Description: ${appDescription}` : "",
			"",
			`Generate 8-10 hook variants using the ${hookFormula} formula for a ${templateType} video.`,
			"Tone should be " + tone + ".",
			"Score each on specificity (1-5), tension (1-5), and payability (1-5).",
			"Select the best one as selectedText.",
		]
			.filter(Boolean)
			.join("\n"),
	);
}

export async function generateScript(
	appName: string,
	appDescription: string,
	selectedHook: string,
	researchContext: string,
	dialogueRules: string,
) {
	return generateStructured(
		"generateScript",
		dialogueSchema,
		[
			"You are a video script writer for short-form social media content.",
			"Create a short engaging script. Hook is already chosen — build the body around it.",
			"",
			"Dialogue rules:",
			dialogueRules,
		].join("\n"),
		[
			`App: ${appName}`,
			appDescription ? `Description: ${appDescription}` : "",
			"",
			`Research context:\n${researchContext}`,
			"",
			`Selected hook (sentence 1): "${selectedHook}"`,
			"",
			"Build 2-4 more dialogue lines after the hook. Single speaker (A).",
			"Include videoType, videoDescription (2-3 sentences describing what the video shows), and videoCategory.",
		]
			.filter(Boolean)
			.join("\n"),
	);
}

export async function selectBackgroundVideo(
	appName: string,
	appDescription: string,
	selectedHook: string,
	scriptContext: string,
	researchContext: string,
	recentVideoHistory: string,
	availableVideos: BackgroundVideoOption[],
) {
	const firstUrl = availableVideos[0]?.url;
	if (!firstUrl) {
		throw new Error("No background videos available for AI selection");
	}

	const videoSelectionSchema = z.object({
		selectedVideoUrl: z.enum([
			firstUrl,
			...availableVideos.slice(1).map((video) => video.url),
		]),
		reasoning: z.string().min(1),
	});

	return generateStructured(
		"selectBackgroundVideo",
		videoSelectionSchema,
		[
			"You are choosing the background gameplay video for a short-form social media render.",
			"Choose exactly one URL from the provided available videos list.",
			"Do not invent, shorten, rewrite, or modify URLs.",
			"Reason about fit first: the background should support the hook, tone, and script pacing.",
			"Diversify aggressively: avoid recently used URLs and avoid repeating the same template unless it is clearly the best match.",
		].join("\n"),
		[
			`App: ${appName}`,
			appDescription ? `Description: ${appDescription}` : "",
			`Selected hook: ${selectedHook}`,
			"",
			`Script context:\n${scriptContext}`,
			"",
			`Research context:\n${researchContext}`,
			"",
			`Recent video history to diversify against:\n${recentVideoHistory}`,
			"",
			"Available videos. Format: label | template | exact URL",
			formatBackgroundVideoOptions(availableVideos),
			"",
			"Return selectedVideoUrl as one exact URL from the available videos list.",
			"Return reasoning as one short sentence.",
		]
			.filter(Boolean)
			.join("\n"),
	);
}

export async function generateCaptions(
	appName: string,
	script: string,
	researchContext: string,
	captionFormula: string,
) {
	return generateStructured(
		"generateCaptions",
		captionSchema,
		[
			"You are a social media caption writer for indie app developer content.",
			"",
			"Caption formula:",
			captionFormula,
		].join("\n"),
		[
			`App: ${appName}`,
			`Script: ${script}`,
			`Research: ${researchContext}`,
			"",
			"Generate one Instagram caption and one TikTok caption.",
			"Follow the caption formula: start with a hook/identity call, add specific pain, leave an open loop, end with a profile off-ramp.",
		]
			.filter(Boolean)
			.join("\n"),
	);
}
