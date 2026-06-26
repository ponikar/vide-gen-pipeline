import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import type { LanguageModel } from "ai";
import { minimax } from "vercel-minimax-ai-provider";
import { z } from "zod";
import {
	getCaptionFormula,
	getDialogueRules,
	getHookCheatSheet,
} from "./skills.js";

function getModel(): LanguageModel {
	const provider = process.env.AI_PROVIDER ?? "google";
	switch (provider) {
		case "google":
			return google("gemini-2.0-flash-lite");
		case "minimax":
			return minimax("MiniMax-M2");
		default:
			return google("gemini-2.0-flash-lite");
	}
}

async function generateStructured<T>(
	schema: z.ZodType<T>,
	system: string,
	prompt: string,
): Promise<T> {
	const { object } = await generateObject({
		model: getModel(),
		system,
		prompt,
		schema,
		temperature: 0.7,
	});
	return object;
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
	hookFormula: z.enum([
		"missing_piece",
		"hidden_thing",
		"reveal_tease",
		"wrong_assumption_flip",
		"unpopular_opinion",
		"direct_accusation",
		"stop_scrolling_callout",
		"pov_frame",
		"shared_secret",
		"mistake_warning",
		"cost_frame",
		"window_closing",
		"direct_before_after",
		"discovery_moment",
	]),
	templateType: z.enum(["brainrot", "ugc", "slideshow"]),
});

const hookSchema = z.object({
	variants: z
		.array(
			z.object({
				text: z.string(),
				specificity: z.number().min(1).max(5),
				tension: z.number().min(1).max(5),
				payability: z.number().min(1).max(5),
			}),
		)
		.min(8)
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
	ttsSpeed: z.number().positive().max(3).optional(),
	videoType: z.enum(["brainrot", "ugc", "slideshow"]),
	videoDescription: z.string(),
	videoCategory: z.enum(["subway_surfers", "minecraft_parkour"]),
});

const captionSchema = z.object({
	instagram: z.string(),
	tiktok: z.string(),
});

export async function learnFromHistory(historicalPosts: string) {
	return generateStructured(
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

export async function generateCaptions(
	appName: string,
	script: string,
	researchContext: string,
	captionFormula: string,
) {
	return generateStructured(
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
