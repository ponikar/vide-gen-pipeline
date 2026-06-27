import {
	generateHooks,
	generateScript,
	research,
	selectBackgroundVideo,
} from "./ai.js";
import type { Db } from "./db.js";
import type { Logger } from "../../../src/logger.js";
import {
	getBackgroundVideoOptions,
	getDialogueRules,
	getHookCheatSheet,
	resolveBackgroundVideoSelection,
	type BackgroundVideoOption,
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
		backgroundVideo: BackgroundVideoOption & { reasoning: string };
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

function normalizeVideoCategory(category: string): VideoCategory {
	const normalized = category.toLowerCase().replace(/[\s-]+/g, "_");
	return normalized.includes("minecraft") ? "minecraft_parkour" : "subway_surfers";
}

function normalizeFormat(format: string | undefined): "subtitles" | "chat" {
	return format === "chat" ? "chat" : "subtitles";
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
	logger?: Logger,
): Promise<OnboardingPreviewPayload[]> {
	logger?.info(
		"preview.profile_loading",
		"Loading the app profile for preview generation",
		{ appId, previewCount: count },
	);
	const [app] = await db`
    SELECT name, description, scraped_info
    FROM apps
    WHERE id = ${appId}
  `;
	if (!app) throw new Error("App not found");

	const hookCheatSheet = getHookCheatSheet();
	const dialogueRules = getDialogueRules();
	const backgroundVideoOptions = getBackgroundVideoOptions();
	const profile = appProfile(app as AppRow);
	const onboardingContext =
		"New app, no performance history yet. Generate initial onboarding preview directions from the app profile only.";
	const researchResult = await research(
		(app as AppRow).name,
		profile,
		onboardingContext,
		hookCheatSheet,
	);
	logger?.info("preview.research_completed", "Preview research completed", {
		appId,
	});
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
	const selectedBackgroundVideos: Array<
		BackgroundVideoOption & { reasoning: string }
	> = [];
	for (const [index, selectedHook] of selectedHooks.entries()) {
		logger?.info("preview.script_started", "Generating a preview script", {
			appId,
			previewNumber: index + 1,
		});
		const scriptResult = await generateScript(
			(app as AppRow).name,
			profile,
			selectedHook,
			researchResult.analysis,
			dialogueRules,
		);
		const videoCategory = normalizeVideoCategory(scriptResult.videoCategory);
		const recentVideoHistory =
			selectedBackgroundVideos.length === 0
				? "No background videos selected in this preview batch yet."
				: selectedBackgroundVideos
						.map(
							(video) =>
								`- ${video.label} | ${video.template} | ${video.url}`,
						)
						.join("\n");
		const videoSelectionResult = await selectBackgroundVideo(
			(app as AppRow).name,
			profile,
			selectedHook,
			JSON.stringify(scriptResult),
			JSON.stringify(researchResult),
			recentVideoHistory,
			backgroundVideoOptions,
		);
		const selectedBackgroundVideo = {
			...resolveBackgroundVideoSelection(
				videoSelectionResult.selectedVideoUrl,
				backgroundVideoOptions,
			),
			reasoning: videoSelectionResult.reasoning,
		};
		selectedBackgroundVideos.push(selectedBackgroundVideo);

		payloads.push({
			video: selectedBackgroundVideo.url,
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
				backgroundVideo: selectedBackgroundVideo,
			},
		});
		logger?.info("preview.script_completed", "Preview payload is ready", {
			appId,
			previewNumber: index + 1,
			videoCategory,
			backgroundVideoLabel: selectedBackgroundVideo.label,
		});
	}

	logger?.info("preview.completed", "All preview payloads are ready", {
		appId,
		previewCount: payloads.length,
	});
	return payloads;
}
