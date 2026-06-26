import { generateHooks, generateScript, research } from "./ai.js";
import type { Db } from "./db.js";
import {
	getDialogueRules,
	getHookCheatSheet,
	getVideoContext,
} from "./skills.js";

type AppRow = {
	name: string;
	description: string | null;
	scraped_info: Record<string, unknown> | null;
};

export type OnboardingPreviewPayload = {
	video: string;
	dialogue: Array<{ speaker: string; text: string }>;
	voices: Record<string, string>;
	ttsSpeed: number;
	format: "subtitles" | "chat";
	meta: {
		selectedHook: string;
		hookFormula: string;
		tone: string;
		templateType: string;
		videoType: string;
		videoDescription: string;
		videoCategory: string;
	};
};

type PreviewCount = 3 | 4;
type VideoCategory = "subway_surfers" | "minecraft_parkour";

function appProfile(app: AppRow): string {
	const scrapedInfo = app.scraped_info;

	return [
		`Name: ${app.name}`,
		app.description ? `Description: ${app.description}` : "",
		scrapedInfo
			? [
					`Tagline: ${scrapedInfo.tagline ?? ""}`,
					`Target audience: ${scrapedInfo.targetAudience ?? ""}`,
					`Problem solved: ${scrapedInfo.problemSolved ?? ""}`,
					`Key features: ${(scrapedInfo.keyFeatures as string[] | undefined)?.join(", ") ?? ""}`,
					`Unique selling points: ${(scrapedInfo.uniqueSellingPoints as string[] | undefined)?.join(", ") ?? ""}`,
					`Tone/voice: ${scrapedInfo.toneOfVoice ?? ""}`,
					`Key benefits: ${(scrapedInfo.keyBenefits as string[] | undefined)?.join(", ") ?? ""}`,
					`Use cases: ${(scrapedInfo.useCases as string[] | undefined)?.join(", ") ?? ""}`,
				].join("\n")
			: "",
	]
		.filter(Boolean)
		.join("\n");
}

function backgroundClips(videoContext: string, category: string): string[] {
	const subwayClips =
		videoContext
			.split("Subway Surfers")[1]
			?.split("Minecraft")[0]
			?.match(/https?:\/\/[^\s,]+/g) ?? [];
	const minecraftClips =
		videoContext.split("Minecraft Parkour")[1]?.match(/https?:\/\/[^\s,]+/g) ??
		[];

	if (category === "minecraft_parkour" && minecraftClips.length > 0) {
		return minecraftClips;
	}
	return subwayClips.length > 0 ? subwayClips : minecraftClips;
}

function normalizeVideoCategory(category: string): VideoCategory {
	const normalized = category.toLowerCase().replace(/[\s-]+/g, "_");
	return normalized.includes("minecraft") ? "minecraft_parkour" : "subway_surfers";
}

function normalizeFormat(format: string | undefined): "subtitles" | "chat" {
	return format === "chat" ? "chat" : "subtitles";
}

function pickClip(clips: string[], index: number): string {
	if (clips.length === 0) {
		return "https://hlneqkcervrvftffotxn.supabase.co/storage/v1/object/public/videos/1.mp4";
	}
	return clips[index % clips.length]!;
}

function withSelectedHook(
	selectedHook: string,
	dialogue: Array<{ speaker: string; text: string }>,
): Array<{ speaker: string; text: string }> {
	const firstLine = dialogue[0]?.text.trim().toLowerCase();
	if (firstLine === selectedHook.trim().toLowerCase()) return dialogue;
	return [{ speaker: "A", text: selectedHook }, ...dialogue];
}

export async function generateOnboardingPreviewPayloads(
	db: Db,
	appId: string,
	count: PreviewCount = 3,
): Promise<OnboardingPreviewPayload[]> {
	const [app] = await db`
    SELECT name, description, scraped_info
    FROM apps
    WHERE id = ${appId}
  `;
	if (!app) throw new Error("App not found");

	const hookCheatSheet = getHookCheatSheet();
	const dialogueRules = getDialogueRules();
	const videoContext = getVideoContext();
	const profile = appProfile(app as AppRow);
	const onboardingContext =
		"New app, no performance history yet. Generate initial onboarding preview directions from the app profile only.";
	const researchResult = await research(
		(app as AppRow).name,
		profile,
		onboardingContext,
		hookCheatSheet,
	);
	const hookResult = await generateHooks(
		(app as AppRow).name,
		profile,
		researchResult.tone,
		researchResult.hookFormula,
		researchResult.templateType,
		hookCheatSheet,
	);

	const selectedHooks = [
		hookResult.selectedText,
		...hookResult.variants
			.map((variant) => variant.text)
			.filter((text) => text !== hookResult.selectedText),
	].slice(0, count);

	const payloads: OnboardingPreviewPayload[] = [];
	for (const [index, selectedHook] of selectedHooks.entries()) {
		const scriptResult = await generateScript(
			(app as AppRow).name,
			profile,
			selectedHook,
			researchResult.analysis,
			dialogueRules,
		);
		const videoCategory = normalizeVideoCategory(scriptResult.videoCategory);
		const clips = backgroundClips(videoContext, videoCategory);

		payloads.push({
			video: pickClip(clips, index),
			dialogue: withSelectedHook(
				selectedHook,
				scriptResult.dialogue.map((d) => ({
					speaker: d.speaker,
					text: d.text,
				})),
			),
			voices: { A: "af_jessica" },
			ttsSpeed: scriptResult.ttsSpeed ?? 1.2,
			format: normalizeFormat(scriptResult.format),
			meta: {
				selectedHook,
				hookFormula: researchResult.hookFormula,
				tone: researchResult.tone,
				templateType: researchResult.templateType,
				videoType: scriptResult.videoType,
				videoDescription: scriptResult.videoDescription,
				videoCategory,
			},
		});
	}

	return payloads;
}
