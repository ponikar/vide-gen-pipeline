import { generateText, stepCountIs, tool } from "ai";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { ScrapedInfo } from "@/db/schema";
import { getScrapeModel } from "@/lib/ai-model";
import { scrapeAppInfo, scrapedInfoSchema } from "@/server/app-scraper";
import { protectedProcedure, router } from "@/server/trpc";

const MAX_MESSAGES = 50;
const MAX_CONTENT_LENGTH = 2000;

const chatMessageSchema = z.object({
	role: z.enum(["user", "assistant"]),
	content: z.string().max(MAX_CONTENT_LENGTH),
});

const urlInputSchema = z.object({
	url: z.string().url(),
});

const manualAppInfoSchema = z.object({
	name: z.string().min(1).max(100).describe("The app or product name."),
	description: z
		.string()
		.min(1)
		.max(500)
		.describe("A clear, refined description of what the app does."),
	tagline: z.string().min(1).max(120).describe("A short positioning line."),
	targetAudience: z
		.string()
		.min(1)
		.max(240)
		.describe("The main users or buyer persona for the app."),
	problemSolved: z
		.string()
		.min(1)
		.max(240)
		.describe("The primary user problem this app solves."),
	keyFeatures: z
		.array(z.string().min(1).max(140))
		.min(1)
		.max(6)
		.describe("The most important product capabilities."),
	uniqueSellingPoints: z
		.array(z.string().min(1).max(140))
		.min(1)
		.max(4)
		.describe("What makes the app meaningfully different."),
	toneOfVoice: z
		.string()
		.min(1)
		.max(120)
		.describe("The natural brand voice for marketing this app."),
	keyBenefits: z
		.array(z.string().min(1).max(140))
		.min(1)
		.max(5)
		.describe("Concrete outcomes users get from the app."),
	useCases: z
		.array(z.string().min(1).max(140))
		.min(1)
		.max(4)
		.describe("Real situations where people would use the app."),
});

const LOG_PREFIX = "[onboarding.chat]";

const ONBOARDING_PROMPT = `You are GoldFish, a concise onboarding assistant that helps users set up an app profile.

Your job:
- Gather the app name and a clear description of what the app does.
- If the user provides an app/product website, App Store URL, or asks you to use a link, call the scrapeUrl tool.
- Do not call scrapeUrl unless the user's latest message contains an actual URL/link/domain or explicitly asks you to scrape/use a link.
- If there is no URL, collect the information manually by asking one question at a time.
- When the user has manually provided enough information to identify the app name and what it does, call refineManualAppInfo. Analyze the user's messages, extract the relevant facts, sanitize vague wording, and refine the data into the same app profile structure used by scraping.
- Do not call refineManualAppInfo if the app name or core description is still missing. Ask the next specific question instead.
- After scrapeUrl or refineManualAppInfo returns app information, summarize it in readable text and ask the user if it looks correct.
- If a pending app profile is provided and the user's latest message confirms it looks correct, call confirmAppInfo.
- If a pending app profile is provided and the user gives corrections, call refineManualAppInfo with the corrected full profile and ask for confirmation again.
- Never output JSON, markdown code blocks, or hidden machine-readable state. Talk to the user naturally.`;

function preview(value: string, max = 160) {
	const normalized = value.replace(/\s+/g, " ").trim();
	return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized;
}

function logInfo(event: string, data?: Record<string, unknown>) {
	console.info(LOG_PREFIX, event, data ?? {});
}

function logError(event: string, error: unknown, data?: Record<string, unknown>) {
	console.error(LOG_PREFIX, event, {
		...(data ?? {}),
		error: error instanceof Error ? error.message : String(error),
	});
}

function isScrapedInfo(value: unknown): value is ScrapedInfo {
	const data = scrapedInfoSchema.safeParse(value);
	return data.success;
}

function cleanText(value: string, max: number) {
	const normalized = value.replace(/\s+/g, " ").trim();
	return normalized.length > max
		? `${normalized.slice(0, max - 1).trim()}...`
		: normalized;
}

function cleanList(values: string[], maxItems: number) {
	const seen = new Set<string>();
	const cleaned: string[] = [];

	for (const value of values) {
		const text = cleanText(value, 140);
		const key = text.toLowerCase();
		if (!text || seen.has(key)) continue;
		seen.add(key);
		cleaned.push(text);
		if (cleaned.length >= maxItems) break;
	}

	return cleaned;
}

function sanitizeManualInfo(
	info: z.infer<typeof manualAppInfoSchema>,
): ScrapedInfo {
	return scrapedInfoSchema.parse({
		name: cleanText(info.name, 100),
		description: cleanText(info.description, 500),
		tagline: cleanText(info.tagline, 120),
		targetAudience: cleanText(info.targetAudience, 240),
		problemSolved: cleanText(info.problemSolved, 240),
		keyFeatures: cleanList(info.keyFeatures, 6),
		uniqueSellingPoints: cleanList(info.uniqueSellingPoints, 4),
		toneOfVoice: cleanText(info.toneOfVoice, 120),
		keyBenefits: cleanList(info.keyBenefits, 5),
		useCases: cleanList(info.useCases, 4),
	});
}

export const onboardingRouter = router({
	chat: protectedProcedure
		.input(
			z.object({
				messages: z.array(chatMessageSchema).min(1).max(MAX_MESSAGES),
				pendingAppInfo: scrapedInfoSchema.optional(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				let appInfo: ScrapedInfo | undefined;
				let confirmedInfo: ScrapedInfo | undefined;
				const latestUserMessage = [...input.messages]
					.reverse()
					.find((message) => message.role === "user");

				logInfo("request.start", {
					messageCount: input.messages.length,
					latestUserPreview: latestUserMessage
						? preview(latestUserMessage.content)
						: "",
				});

				const result = await generateText({
					model: getScrapeModel(),
					system: input.pendingAppInfo
						? `${ONBOARDING_PROMPT}

Pending app profile awaiting user confirmation:
${JSON.stringify(input.pendingAppInfo)}`
						: ONBOARDING_PROMPT,
					messages: input.messages,
					stopWhen: stepCountIs(3),
					tools: {
						scrapeUrl: tool({
							description:
								"Fetch and analyze an app/product website URL. Use only when the user has provided an actual URL/link/domain or explicitly asked to use one.",
							inputSchema: urlInputSchema,
							execute: async ({ url }) => {
								logInfo("tool.scrapeUrl.called", { url });
								try {
									const info = await scrapeAppInfo(url, {
										info: logInfo,
										error: logError,
									});
									appInfo = info;
									logInfo("tool.scrapeUrl.done", {
										url,
										name: info.name,
									});
									return info;
								} catch (err) {
									logError("tool.scrapeUrl.failed", err, { url });
									throw err;
								}
							},
						}),
						refineManualAppInfo: tool({
							description:
								"Analyze manually provided app details, sanitize/refine them, and return the same structured app profile shape as scrapeUrl. Use only after the user has provided at least the app name and what the app does.",
							inputSchema: manualAppInfoSchema,
							execute: async (info) => {
								logInfo("tool.refineManualAppInfo.called", {
									name: info.name,
								});
								const refinedInfo = sanitizeManualInfo(info);
								appInfo = refinedInfo;
								logInfo("tool.refineManualAppInfo.done", {
									name: refinedInfo.name,
									descriptionPreview: preview(refinedInfo.description),
								});
								return refinedInfo;
							},
						}),
						confirmAppInfo: tool({
							description:
								"Confirm the pending app profile after the user's latest message approves it. Use only when a pending app profile exists and the user says it looks correct.",
							inputSchema: z.object({}),
							execute: async () => {
								if (!input.pendingAppInfo) {
									logInfo("tool.confirmAppInfo.skipped", {
										reason: "missing_pending_app_info",
									});
									return { error: "No pending app profile to confirm" };
								}

								confirmedInfo = input.pendingAppInfo;
								logInfo("tool.confirmAppInfo.done", {
									name: confirmedInfo.name,
								});
								return confirmedInfo;
							},
						}),
					},
				});

				logInfo("llm.done", {
					textPreview: preview(result.text),
					stepCount: result.steps.length,
					toolCallCount: result.steps.reduce(
						(count, step) => count + step.toolCalls.length,
						0,
					),
					toolResultCount: result.steps.reduce(
						(count, step) => count + step.toolResults.length,
						0,
					),
				});

				const toolInfo = result.steps
					.flatMap((step) => step.toolResults)
					.map((toolResult) => toolResult.output)
					.find(isScrapedInfo);

				logInfo("response.done", {
					hasText: Boolean(result.text),
					hasScrapedInfo: Boolean(appInfo ?? toolInfo),
					hasConfirmedInfo: Boolean(confirmedInfo),
				});

				return {
					reply:
						result.text ||
						"I can help with that. What's the name of your app?",
					scrapedInfo: appInfo ?? undefined,
					confirmedInfo,
				};
			} catch (err) {
				logError("request.failed", err);
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Something went wrong. Please try again.",
					cause: err,
				});
			}
		}),
});
