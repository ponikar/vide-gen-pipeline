import { InstagramClient } from "../../../src/instagram/client.js";
import { postReel as instagramPostReel } from "../../../src/instagram/post.js";
import { TikTokClient } from "../../../src/tiktok/client.js";
import { uploadDraft } from "../../../src/tiktok/post.js";
import {
	createLogger,
	safeErrorMessage,
} from "../../../src/logger.js";
import type { Db } from "./db.js";

type PostRow = {
	id: string;
	app_id: string;
	status: string;
	platform: string;
	title: string | null;
	output_url: string | null;
	access_token: string | null;
	provider_user_id: string | null;
};

export async function uploadScheduledPost(
	db: Db,
	scheduleId: string,
	requestId: string,
): Promise<void> {
	const logger = createLogger("agent-worker", { requestId, scheduleId, source: "agent-worker/src/scheduled-post.ts" });
	const rows = await db`
		SELECT
			p.id,
			p.app_id,
			p.status,
			p.platform,
			p.title,
			p.meta->>'outputUrl' AS output_url,
			ca.access_token,
			ca.provider_user_id
		FROM video_jobs vj
		JOIN posts p ON p.video_job_id = vj.id::text
		LEFT JOIN connected_accounts ca
			ON ca.app_id = p.app_id AND ca.provider = p.platform
		WHERE vj.cron_schedule_id = ${scheduleId}
			AND p.type = 'user_approved'
	`;

	if (rows.length === 0) {
		throw new Error("No scheduled posts found for this schedule");
	}

	const posts = rows as PostRow[];
	const failures: string[] = [];

	for (const post of posts) {
		const platformLogger = logger.child({ postId: post.id, platform: post.platform });

		if (post.status !== "scheduled") {
			platformLogger.warn(
				"scheduled_post.skipped",
				`Post is already ${post.status}`,
			);
			continue;
		}
		if (!post.output_url) {
			await db`
				UPDATE posts
				SET status = 'failed',
					meta = COALESCE(meta, '{}'::jsonb) || '{"error":"Rendered video is missing"}'::jsonb,
					updated_at = NOW()
				WHERE id = ${post.id}
			`;
			failures.push(`${post.platform}: rendered video is missing`);
			continue;
		}
		if (!post.access_token) {
			await db`
				UPDATE posts
				SET status = 'failed',
					meta = COALESCE(meta, '{}'::jsonb) || '{"error":"Account is disconnected"}'::jsonb,
					updated_at = NOW()
				WHERE id = ${post.id}
			`;
			failures.push(`${post.platform}: account is disconnected`);
			continue;
		}

		const [claimed] = await db`
			UPDATE posts
			SET status = 'uploading', updated_at = NOW()
			WHERE id = ${post.id} AND status = 'scheduled'
			RETURNING id
		`;
		if (!claimed) {
			platformLogger.warn("scheduled_post.skipped", "Post was already claimed");
			continue;
		}

		try {
			if (post.platform === "tiktok") {
				const client = new TikTokClient(post.access_token);
				const result = await uploadDraft(client, post.output_url, async (publishId) => {
					await db`
						UPDATE posts
						SET platform_post_id = ${publishId}, updated_at = NOW()
						WHERE id = ${post.id}
					`;
				});

				await db`
					UPDATE posts
					SET status = 'sent_to_inbox',
						platform_post_id = ${result.publishId},
						updated_at = NOW()
					WHERE id = ${post.id}
				`;
				platformLogger.info(
					"scheduled_post.sent_to_inbox",
					"Approved video was sent to the user's TikTok inbox",
					{ appId: post.app_id, stateSaved: true },
				);
			} else if (post.platform === "instagram") {
				if (!post.provider_user_id) {
					throw new Error("Instagram account ID is missing");
				}
				const client = new InstagramClient(post.access_token);
				const caption = post.title ?? "New post";
				const result = await instagramPostReel(
					client,
					post.provider_user_id,
					post.output_url,
					caption,
				);

				await db`
					UPDATE posts
					SET status = 'published',
						link = ${result.permalink},
						platform_post_id = ${result.igMediaId},
						published_at = NOW(),
						updated_at = NOW()
					WHERE id = ${post.id}
				`;
				platformLogger.info(
					"scheduled_post.published",
					"Approved video was published to Instagram",
					{ appId: post.app_id, permalink: result.permalink, stateSaved: true },
				);
			}
		} catch (error) {
			const message = safeErrorMessage(error);
			await db`
				UPDATE posts
				SET status = 'failed',
					meta = COALESCE(meta, '{}'::jsonb) || ${JSON.stringify({ error: message })}::jsonb,
					updated_at = NOW()
				WHERE id = ${post.id}
			`;
			failures.push(`${post.platform}: ${message}`);
			platformLogger.error(
				"scheduled_post.failed",
				`Approved video could not be sent to ${post.platform}`,
				error,
				{ appId: post.app_id, stateSaved: true },
			);
		}
	}

	if (failures.length > 0) {
		throw new Error(failures.join("; "));
	}
}