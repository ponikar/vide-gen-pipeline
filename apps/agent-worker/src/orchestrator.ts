import { randomUUID } from "node:crypto";
import { InstagramClient } from "../../../src/instagram/client.js";
import { postReel as instagramPostReel } from "../../../src/instagram/post.js";
import { TikTokClient } from "../../../src/tiktok/client.js";
import { postReel as tiktokPostReel } from "../../../src/tiktok/post.js";
import { generateCaptions, generateScript, research } from "./ai.js";
import type { Db } from "./db.js";

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
) {
	const jobId = randomUUID();
	const log = (msg: string) => console.log(`[${jobId.slice(0, 8)}] ${msg}`);

	async function setPhase(phase: string, _extra?: Record<string, unknown>) {
		log(`phase: ${phase}`);
	}

	async function fail(error: string, phase: string) {
		log(`FAILED at ${phase}: ${error}`);
		await db`INSERT INTO video_jobs (id, app_id, cron_schedule_id, status, error, current_phase) 
            VALUES (${jobId}, ${appId}, ${scheduleId}, 'failed', ${error}, ${phase})`;
	}

	try {
		await setPhase("researching");

		const [app] =
			await db`SELECT name, description FROM apps WHERE id = ${appId}`;
		if (!app) throw new Error("App not found");

		const posts = await db`
      SELECT title, link, stats, created_at 
      FROM posts WHERE app_id = ${appId} 
      ORDER BY created_at DESC LIMIT 5
    `;

		const postsSummary =
			posts.length === 0
				? "No historical posts available."
				: posts
						.map(
							(p: Record<string, unknown>) =>
								`- ${p.title}: stats=${JSON.stringify(p.stats)}`,
						)
						.join("\n");

		const researchResult = await research(
			app.name as string,
			(app.description as string) ?? "",
			postsSummary,
		);

		await setPhase("scripting");

		const scriptResult = await generateScript(
			app.name as string,
			(app.description as string) ?? "",
			researchResult.analysis,
		);

		await setPhase("rendering");

		const dialogue = scriptResult.dialogue.map(
			(d: { speaker: string; text: string }) => ({
				speaker: d.speaker,
				text: d.text,
			}),
		);
		const voices = { A: "af_heart" };
		const format = scriptResult.format ?? "subtitles";
		const ttsSpeed = scriptResult.ttsSpeed ?? 1;

		const genRes = await fetch(`${videoServerUrl}/api/generate`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				video:
					"https://hlneqkcervrvftffotxn.supabase.co/storage/v1/object/public/videos/1.mp4",
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
		let outputUrl: string | null = null;

		for (let i = 0; i < MAX_POLLS; i++) {
			const statusRes = await fetch(
				`${videoServerUrl}/api/status/${renderJobId}`,
			);
			if (statusRes.status === 404) {
				throw new Error("Video server lost the job");
			}
			const status = (await statusRes.json()) as {
				status: string;
				outputUrl?: string;
				error?: string;
			};

			if (status.status === "done" && status.outputUrl) {
				outputUrl = status.outputUrl;
				break;
			}
			if (status.status === "failed") {
				throw new Error(`Video rendering failed: ${status.error}`);
			}
			await sleep(POLL_INTERVAL);
		}

		if (!outputUrl) throw new Error("Video rendering timed out");

		await setPhase("captioning");

		const captionResult = await generateCaptions(
			app.name as string,
			dialogue
				.map(
					(d: { speaker: string; text: string }) => `${d.speaker}: ${d.text}`,
				)
				.join("\n"),
			researchResult.analysis,
		);

		await setPhase("publishing");

		await db`
      INSERT INTO video_jobs (id, app_id, cron_schedule_id, status, current_phase, generation_params, output_url)
      VALUES (${jobId}, ${appId}, ${scheduleId}, 'running', 'publishing', 
              ${JSON.stringify({ dialogue, research: researchResult.analysis, captions: captionResult })}, 
              ${outputUrl})
    `;

		const accounts = await db`
      SELECT provider, provider_user_id, access_token, refresh_token, token_expires_at
      FROM connected_accounts 
      WHERE app_id = ${appId}
    `;

		for (const platform of socialPlatforms) {
			const account = (accounts as Record<string, unknown>[]).find(
				(a: Record<string, unknown>) => a.provider === platform,
			);
			if (!account) {
				log(`No ${platform} account linked, skipping`);
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
					result = await tiktokPostReel(
						client,
						outputUrl,
						captionResult.tiktok,
					);
				} else {
					log(`Unknown platform: ${platform}, skipping`);
					continue;
				}

				const link =
					platform === "tiktok"
						? (result as { postUrl?: string }).postUrl
						: (result as { permalink?: string }).permalink;

				await db`
          INSERT INTO posts (app_id, title, link, caption, platform, platform_post_id, status, published_at, meta, video_job_id, type)
          VALUES (${appId}, ${(result as { igMediaId?: string }).igMediaId ?? (result as { publishId?: string }).publishId ?? "posted"}, 
                  ${link ?? null}, ${platform === "instagram" ? captionResult.instagram : captionResult.tiktok}, 
                  ${platform}, ${(result as { igMediaId?: string }).igMediaId ?? (result as { publishId?: string }).publishId ?? ""}, 
                  'published', ${new Date().toISOString()}, 
                  ${JSON.stringify({})}, ${jobId}, 'generated')
        `;

				log(`Posted to ${platform}`);
			} catch (err) {
				log(`Failed to post to ${platform}: ${err}`);
			}
		}

		await db`
      UPDATE video_jobs SET status = 'done', current_phase = NULL 
      WHERE id = ${jobId}
    `;

		log("done");
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		await fail(msg, "unknown");
	}
}
