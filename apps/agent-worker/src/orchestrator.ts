import { randomUUID } from "node:crypto";
import { InstagramClient } from "../../../src/instagram/client.js";
import { postReel as instagramPostReel } from "../../../src/instagram/post.js";
import { TikTokClient } from "../../../src/tiktok/client.js";
import { uploadDraft as tiktokUploadDraft } from "../../../src/tiktok/post.js";
import {
	createLogger,
	elapsedMs,
	REQUEST_ID_HEADER,
	safeErrorMessage,
} from "../../../src/logger.js";
import {
	generateCaptions,
	generateHooks,
	generateScript,
	learnFromHistory,
	research,
	selectBackgroundVideo,
} from "./ai.js";
import type { Db } from "./db.js";
import {
	getBackgroundVideoOptions,
	getCaptionFormula,
	getDialogueRules,
	getHookCheatSheet,
	resolveBackgroundVideoSelection,
} from "./skills.js";

const POLL_INTERVAL = 2000;
const MAX_POLLS = 60;

function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}

export async function runPipeline(
	db: Db,
	scheduleId: string,
	appId: string,
	socialPlatforms: string[],
	videoServerUrl: string,
	requestId: string,
) {
	const jobId = randomUUID();
	const startedAt = performance.now();
	const logger = createLogger("agent-worker", {
		requestId,
		jobId,
		scheduleId,
		appId,
	});
	let currentPhase = "starting";
	let phaseStartedAt = performance.now();
	let stateCreated = false;

	const hookCheatSheet = getHookCheatSheet();
	const dialogueRules = getDialogueRules();
	const captionFormula = getCaptionFormula();

	async function setPhase(phase: string) {
		const previousPhase = currentPhase;
		const [saved] = await db`
			UPDATE video_jobs
			SET current_phase = ${phase}, updated_at = NOW()
			WHERE id = ${jobId}
			RETURNING id, current_phase
		`;
		if (!saved) throw new Error(`Video job disappeared before phase ${phase}`);
		if (previousPhase !== "starting") {
			logger.info("pipeline.phase_completed", "Pipeline phase completed", {
				phase: previousPhase,
				durationMs: elapsedMs(phaseStartedAt),
			});
		}
		currentPhase = phase;
		phaseStartedAt = performance.now();
		logger.info("pipeline.phase_started", "Pipeline phase started", {
			phase,
			previousPhase,
			stateSaved: true,
		});
	}

	async function fail(error: unknown) {
		const message = safeErrorMessage(error);
		logger.error("pipeline.failed", "Pipeline failed", error, {
			phase: currentPhase,
			stateCreated,
			durationMs: elapsedMs(startedAt),
		});
		if (!stateCreated) return;

		try {
			const [saved] = await db`
				UPDATE video_jobs
				SET status = 'failed',
					error = ${message},
					current_phase = ${currentPhase},
					updated_at = NOW()
				WHERE id = ${jobId}
				RETURNING id, status, current_phase
			`;
			if (!saved) throw new Error("Video job was missing during failure update");
			logger.info("pipeline.failure_saved", "Pipeline failure was saved", {
				phase: currentPhase,
				stateSaved: true,
			});
		} catch (stateError) {
			logger.error(
				"pipeline.failure_save_failed",
				"Pipeline failed and its database state could not be saved",
				stateError,
				{ phase: currentPhase, stateSaved: false, originalError: message },
			);
		}
	}

	try {
		const [created] = await db`
			INSERT INTO video_jobs (
				id, app_id, cron_schedule_id, status, current_phase, updated_at
			)
			VALUES (${jobId}, ${appId}, ${scheduleId}, 'running', 'learning', NOW())
			RETURNING id, status, current_phase
		`;
		if (!created) throw new Error("Video job could not be created");
		stateCreated = true;
		currentPhase = "learning";
		logger.info("pipeline.started", "Pipeline started and job state was saved", {
			platforms: socialPlatforms,
			phase: currentPhase,
			stateSaved: true,
		});

		const [app] =
			await db`SELECT name, description, scraped_info FROM apps WHERE id = ${appId}`;
		if (!app) throw new Error("App not found");

		const scrapedInfo = app.scraped_info
			? (app.scraped_info as Record<string, unknown>)
			: null;

		const appProfile = [
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

		const posts = await db`
      SELECT title, link, stats, description, video_type, meta, created_at
      FROM posts WHERE app_id = ${appId}
      ORDER BY created_at DESC LIMIT 5
    `;

		const historicalSummary =
			posts.length === 0
				? "No historical posts available."
				: posts
						.map((p: Record<string, unknown>) => {
							const parts = [
								`- title: ${p.title}`,
								`  stats: ${JSON.stringify(p.stats)}`,
							];
							if (p.description) parts.push(`  description: ${p.description}`);
							if (p.video_type) parts.push(`  video_type: ${p.video_type}`);
							if (p.meta) parts.push(`  meta: ${JSON.stringify(p.meta)}`);
							return parts.join("\n");
						})
						.join("\n");

		const learningResult = await learnFromHistory(
			historicalSummary || "No historical posts available.",
		);
		logger.debug("pipeline.learning_completed", "Historical learning completed", {
			historicalPostCount: posts.length,
		});

		await setPhase("researching");

		const researchResult = await research(
			app.name as string,
			appProfile,
			learningResult.lessons,
			hookCheatSheet,
		);

		await setPhase("generating_hooks");

		const hookResult = await generateHooks(
			app.name as string,
			appProfile,
			researchResult.tone,
			researchResult.hookFormula,
			researchResult.templateType,
			hookCheatSheet,
		);
		const selectedHook = hookResult.selectedText;
		logger.debug("pipeline.hook_selected", "A hook was selected", {
			variantCount: hookResult.variants.length,
		});

		await setPhase("scripting");

		const scriptResult = await generateScript(
			app.name as string,
			appProfile,
			selectedHook,
			researchResult.analysis,
			dialogueRules,
		);

		await setPhase("selecting_video");

		const recentVideoJobs = await db`
			SELECT generation_params->'backgroundVideo' AS background_video
			FROM video_jobs
			WHERE app_id = ${appId}
				AND generation_params->'backgroundVideo' IS NOT NULL
			ORDER BY created_at DESC
			LIMIT 10
		`;
		const recentVideoHistory =
			recentVideoJobs.length === 0
				? "No previously selected background videos."
				: recentVideoJobs
						.map(
							(row: Record<string, unknown>) =>
								`- ${JSON.stringify(row.background_video)}`,
						)
						.join("\n");
		const backgroundVideoOptions = getBackgroundVideoOptions();
		const videoSelectionResult = await selectBackgroundVideo(
			app.name as string,
			appProfile,
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
		logger.info(
			"pipeline.background_selected",
			"Background video selected",
			{
				backgroundVideoLabel: selectedBackgroundVideo.label,
				template: selectedBackgroundVideo.template,
			},
		);

		await setPhase("rendering");

		const dialogue = scriptResult.dialogue.map(
			(d: { speaker: string; text: string }) => ({
				speaker: d.speaker,
				text: d.text,
			}),
		);
		const voices = { A: "af_jessica" };
		const format = scriptResult.format ?? "subtitles";
		const ttsSpeed = scriptResult.ttsSpeed ?? 1.2;

		const genRes = await fetch(`${videoServerUrl}/api/generate`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				[REQUEST_ID_HEADER]: requestId,
			},
			body: JSON.stringify({
				video: selectedBackgroundVideo.url,
				dialogue,
				voices,
				format,
				ttsSpeed,
			}),
		});

		if (!genRes.ok) {
			const text = await genRes.text();
			throw new Error(`Video server error (${genRes.status}): ${text}`);
		}

		const { jobId: renderJobId } = (await genRes.json()) as { jobId: string };
		logger.info("pipeline.render_queued", "Video render was queued", {
			renderJobId,
		});
		let outputUrl: string | null = null;

		for (let i = 0; i < MAX_POLLS; i++) {
			const statusRes = await fetch(
				`${videoServerUrl}/api/status/${renderJobId}`,
				{ headers: { [REQUEST_ID_HEADER]: requestId } },
			);
			if (statusRes.status === 404) {
				throw new Error("Video server lost the job");
			}
			if (!statusRes.ok) {
				throw new Error(
					`Video status request failed with HTTP ${statusRes.status}`,
				);
			}
			const status = (await statusRes.json()) as {
				status: string;
				outputUrl?: string;
				error?: string;
			};

			if (status.status === "done" && status.outputUrl) {
				outputUrl = status.outputUrl;
				logger.info("pipeline.render_completed", "Video render completed", {
					renderJobId,
					pollCount: i + 1,
				});
				break;
			}
			if (status.status === "failed") {
				throw new Error(`Video rendering failed: ${status.error}`);
			}
			await sleep(POLL_INTERVAL);
		}

		if (!outputUrl) throw new Error("Video rendering timed out");

		await setPhase("captioning");

		const scriptText = dialogue
			.map((d: { speaker: string; text: string }) => `${d.speaker}: ${d.text}`)
			.join("\n");

		const captionResult = await generateCaptions(
			app.name as string,
			scriptText,
			researchResult.analysis,
			captionFormula,
		);

		await setPhase("publishing");

		const meta = {
			hookFormula: researchResult.hookFormula,
			tone: researchResult.tone,
			templateType: researchResult.templateType,
			backgroundVideo: selectedBackgroundVideo,
		};

		const generationParams = {
			dialogue,
			research: researchResult,
			captions: captionResult,
			selectedHook,
			hookVariants: hookResult.variants,
			videoType: scriptResult.videoType,
			videoDescription: scriptResult.videoDescription,
			videoCategory: scriptResult.videoCategory,
			backgroundVideo: selectedBackgroundVideo,
			meta,
		};

		const [renderStateSaved] = await db`
			UPDATE video_jobs
			SET status = 'running',
				current_phase = 'publishing',
				generation_params = ${JSON.stringify(generationParams)},
				output_url = ${outputUrl},
				updated_at = NOW()
			WHERE id = ${jobId}
			RETURNING id
		`;
		if (!renderStateSaved) {
			throw new Error("Video job disappeared before render state was saved");
		}
		logger.info(
			"pipeline.render_state_saved",
			"Rendered video and generation details were saved",
			{ phase: currentPhase, stateSaved: true },
		);

		const accounts = await db`
      SELECT provider, provider_user_id, access_token, refresh_token, token_expires_at
      FROM connected_accounts
      WHERE app_id = ${appId}
    `;

		const publishingFailures: string[] = [];
		for (const platform of socialPlatforms) {
			const platformLogger = logger.child({ platform });
			const account = (accounts as Record<string, unknown>[]).find(
				(a: Record<string, unknown>) => a.provider === platform,
			);
			if (!account) {
				publishingFailures.push(`${platform}: account is not linked`);
				platformLogger.warn(
					"pipeline.publish_skipped",
					"Requested social account is not linked",
				);
				continue;
			}

			try {
				let result: {
					permalink?: string;
					igMediaId?: string;
					containerId?: string;
					postUrl?: string;
					publishId?: string;
				};

				if (platform === "instagram") {
					const client = new InstagramClient(account.access_token as string);
					result = await instagramPostReel(
						client,
						account.provider_user_id as string,
						outputUrl,
						captionResult.instagram,
					);
				} else if (platform === "tiktok") {
					const client = new TikTokClient(account.access_token as string);
					const { publishId } = await tiktokUploadDraft(
						client,
						outputUrl,
					);
					result = { publishId };
				} else {
					publishingFailures.push(`${platform}: platform is unsupported`);
					platformLogger.warn(
						"pipeline.publish_skipped",
						"Requested social platform is unsupported",
					);
					continue;
				}

				const link =
					platform === "tiktok"
						? null
						: (result as { permalink?: string }).permalink;

				const postStatus = platform === "tiktok" ? "sent_to_inbox" : "published";
				const postTitle = platform === "tiktok"
					? (result as { publishId?: string }).publishId ?? "uploaded"
					: (result as { igMediaId?: string }).igMediaId ?? "posted";

				await db`
          INSERT INTO posts (app_id, title, link, description, video_type, caption, platform, platform_post_id, status, published_at, meta, video_job_id, type)
          VALUES (${appId}, ${postTitle},
                  ${link ?? null}, ${scriptResult.videoDescription}, ${scriptResult.videoType}, ${platform === "instagram" ? captionResult.instagram : captionResult.tiktok},
                  ${platform}, ${(result as { igMediaId?: string }).igMediaId ?? (result as { publishId?: string }).publishId ?? ""},
                  ${postStatus}, ${new Date().toISOString()},
                  ${JSON.stringify(meta)}, ${jobId}, 'generated')
        `;

				platformLogger.info(
					"pipeline.publish_completed",
					"Video was published and the post was saved",
					{
						platformPostId:
							(result as { igMediaId?: string }).igMediaId ??
							(result as { publishId?: string }).publishId,
						stateSaved: true,
					},
				);
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				publishingFailures.push(`${platform}: ${message}`);
				platformLogger.error(
					"pipeline.publish_failed",
					"Video publishing or post persistence failed",
					err,
				);
			}
		}

		if (publishingFailures.length > 0) {
			throw new Error(publishingFailures.join("; "));
		}

		const [completed] = await db`
			UPDATE video_jobs
			SET status = 'done',
				error = NULL,
				current_phase = NULL,
				updated_at = NOW()
			WHERE id = ${jobId}
			RETURNING id, status
		`;
		if (!completed) throw new Error("Video job disappeared before completion");
		logger.info("pipeline.phase_completed", "Pipeline phase completed", {
			phase: currentPhase,
			durationMs: elapsedMs(phaseStartedAt),
		});
		logger.info("pipeline.completed", "Pipeline completed successfully", {
			publishedPlatformCount: socialPlatforms.length,
			durationMs: elapsedMs(startedAt),
			stateSaved: true,
		});
	} catch (err) {
		await fail(err);
		throw err;
	}
}
