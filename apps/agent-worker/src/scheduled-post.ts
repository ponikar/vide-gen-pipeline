import { TikTokClient } from "../../../src/tiktok/client.js";
import { uploadDraft } from "../../../src/tiktok/post.js";
import {
	createLogger,
	safeErrorMessage,
} from "../../../src/logger.js";
import type { Db } from "./db.js";

type ScheduledPostRow = {
	id: string;
	app_id: string;
	status: string;
	output_url: string | null;
	access_token: string | null;
};

export async function uploadScheduledPost(
	db: Db,
	scheduleId: string,
	requestId: string,
): Promise<void> {
	const logger = createLogger("agent-worker", { requestId, scheduleId, source: "agent-worker/src/scheduled-post.ts" });
	const [row] = await db`
		SELECT
			p.id,
			p.app_id,
			p.status,
			p.meta->>'outputUrl' AS output_url,
			ca.access_token
		FROM video_jobs vj
		JOIN posts p ON p.video_job_id = vj.id::text
		LEFT JOIN connected_accounts ca
			ON ca.app_id = p.app_id AND ca.provider = 'tiktok'
		WHERE vj.cron_schedule_id = ${scheduleId}
			AND p.platform = 'tiktok'
			AND p.type = 'user_approved'
		ORDER BY p.created_at DESC
		LIMIT 1
	`;

	if (!row) throw new Error("Scheduled TikTok post was not found");
	const post = row as ScheduledPostRow;
	if (post.status !== "scheduled") {
		throw new Error(`Scheduled TikTok post is already ${post.status}`);
	}
	if (!post.output_url) {
		await db`
			UPDATE posts
			SET status = 'failed',
				meta = COALESCE(meta, '{}'::jsonb) || '{"error":"Rendered video is missing"}'::jsonb,
				updated_at = NOW()
			WHERE id = ${post.id}
		`;
		throw new Error("Scheduled TikTok post has no rendered video");
	}
	if (!post.access_token) {
		await db`
			UPDATE posts
			SET status = 'failed',
				meta = COALESCE(meta, '{}'::jsonb) || '{"error":"TikTok account is disconnected"}'::jsonb,
				updated_at = NOW()
			WHERE id = ${post.id}
		`;
		throw new Error("TikTok account is no longer connected");
	}

	const [claimed] = await db`
		UPDATE posts
		SET status = 'uploading', updated_at = NOW()
		WHERE id = ${post.id} AND status = 'scheduled'
		RETURNING id
	`;
	if (!claimed) throw new Error("Scheduled TikTok post was already claimed");

	try {
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
		logger.info(
			"scheduled_post.sent_to_inbox",
			"Approved video was sent to the user's TikTok inbox",
			{ appId: post.app_id, postId: post.id, stateSaved: true },
		);
	} catch (error) {
		const message = safeErrorMessage(error);
		await db`
			UPDATE posts
			SET status = 'failed',
				meta = COALESCE(meta, '{}'::jsonb) || ${JSON.stringify({ error: message })}::jsonb,
				updated_at = NOW()
			WHERE id = ${post.id}
		`;
		logger.error(
			"scheduled_post.failed",
			"Approved video could not be sent to TikTok",
			error,
			{ appId: post.app_id, postId: post.id, stateSaved: true },
		);
		throw error;
	}
}
