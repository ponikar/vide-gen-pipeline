import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

function getModel() {
	return google("gemini-2.0-flash-lite");
}

const researchSchema = z.object({
	analysis: z.string(),
	recommendedFocus: z.string(),
	tone: z.string()
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
	videoDescription: z.string(),
});

const captionSchema = z.object({
	instagram: z.string(),
	tiktok: z.string(),
});

export async function research(
	appName: string,
	appDescription: string,
	historicalPosts: string,
) {
	const { object } = await generateObject({
		model: getModel(),
		schema: researchSchema,
		system:
			"You are a social media content strategist. Analyze the app and its historical posts to determine the current content stage and recommend the focus for the next post.",
		prompt: [
			`App: ${appName}`,
			appDescription ? `Description: ${appDescription}` : "",
			"",
			`Historical posts:\n${historicalPosts}`,
			"",
			"Analyze the content stage, what's working, what's not, and recommend the focus for the next post.",
		]
			.filter(Boolean)
			.join("\n"),
	});
	return object;
}

export async function generateScript(
	appName: string,
	appDescription: string,
	researchContext: string,
) {
	const { object } = await generateObject({
		model: getModel(),
		schema: dialogueSchema,
	system:
		"You are a video script writer. Create short engaging hook video dialogues for social media. Keep each line under 15 words, 2-4 lines per video. Use a single speaker (A). Use warm friendly tone. Also generate a concise videoDescription (2-3 sentences) that describes what the video shows, the hook, the tone, and the message — this will be read by AI on future cycles to understand what this video was about.",
	prompt: [
		`App: ${appName}`,
		appDescription ? `Description: ${appDescription}` : "",
		"",
		`Research context:\n${researchContext}`,
		"",
		"Generate a short hook video script (2-4 lines of dialogue, single speaker). Include a videoDescription field.",
	]
			.filter(Boolean)
			.join("\n"),
	});
	return object;
}

export async function generateCaptions(
	appName: string,
	script: string,
	researchContext: string,
) {
	const { object } = await generateObject({
		model: getModel(),
		schema: captionSchema,
		system:
			"You are a social media caption writer. Create platform-appropriate captions for video posts.",
		prompt: [
			`App: ${appName}`,
			`Script: ${script}`,
			`Research: ${researchContext}`,
			"",
			"Generate one Instagram caption and one TikTok caption for this video.",
		]
			.filter(Boolean)
			.join("\n"),
	});
	return object;
}
