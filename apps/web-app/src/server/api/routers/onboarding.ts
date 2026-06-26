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

const LOG_PREFIX = "[onboarding.chat]";

const ONBOARDING_PROMPT = `You are GoldFish, a concise onboarding assistant that helps users set up an app profile.

Your job:
- Gather the app name and a clear description of what the app does.
- If the user provides an app/product website, App Store URL, or asks you to use a link, call the scrapeUrl tool.
- Do not call scrapeUrl unless the user's latest message contains an actual URL/link/domain or explicitly asks you to scrape/use a link.
- If there is no URL, continue the conversation manually and ask one question at a time.
- After scrapeUrl returns app information, summarize it in readable text and ask the user if it looks correct.
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

export const onboardingRouter = router({
	chat: protectedProcedure
		.input(
			z.object({
				messages: z.array(chatMessageSchema).min(1).max(MAX_MESSAGES),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				let scrapedInfo: ScrapedInfo | undefined;
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
					system: ONBOARDING_PROMPT,
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
									scrapedInfo = info;
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
					hasScrapedInfo: Boolean(scrapedInfo ?? toolInfo),
				});

				return {
					reply:
						result.text ||
						"I can help with that. What's the name of your app?",
					scrapedInfo: scrapedInfo ?? toolInfo,
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
