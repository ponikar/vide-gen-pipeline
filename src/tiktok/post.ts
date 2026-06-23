import type { TikTokClient } from "./client.js";
import type { PostResult } from "./types.js";

const POLL_RETRIES = 30;
const POLL_INTERVAL_MS = 5000;

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function postReel(
	client: TikTokClient,
	videoUrl: string,
	caption: string,
): Promise<PostResult> {
	const resp = await fetch(videoUrl);
	if (!resp.ok) throw new Error(`Failed to download video: ${resp.status}`);
	const videoBuffer = Buffer.from(await resp.arrayBuffer());
	const videoSize = videoBuffer.length;

	const initResult = await client.post<{
		upload_url: string;
		publish_id: string;
	}>("/video/init/", {
		source_info: {
			source: "FILE_UPLOAD",
			video_size: videoSize,
			chunk_size: videoSize,
			total_chunk_count: 1,
		},
	});

	const uploadRes = await fetch(initResult.upload_url, {
		method: "PUT",
		headers: {
			"Content-Type": "video/mp4",
			"Content-Length": String(videoSize),
			"Content-Range": `bytes 0-${videoSize - 1}/${videoSize}`,
		},
		body: videoBuffer,
	});
	if (!uploadRes.ok) {
		const text = await uploadRes.text();
		throw new Error(`TikTok upload failed (${uploadRes.status}): ${text}`);
	}

	const publishResult = await client.post<{ publish_id: string }>(
		"/video/publish/",
		{
			post_info: {
				privacy_level: "PUBLIC_TO_EVERYONE",
				title: caption,
				disable_duet: false,
				disable_comment: false,
				disable_stitch: false,
				video_cover_timestamp_ms: 0,
			},
		},
	);

	const publishId = publishResult.publish_id;

	for (let attempt = 0; attempt < POLL_RETRIES; attempt++) {
		const status = await client.get<{
			status: string;
			post_url?: string;
			fail_reason?: string;
		}>(`/video/publish/`, { publish_id: publishId });

		if (status.status === "PUBLISHED") {
			return { publishId, postUrl: status.post_url };
		}
		if (status.status === "FAILED") {
			throw new Error(
				`TikTok publish failed: ${status.fail_reason ?? "Unknown"}`,
			);
		}

		await sleep(POLL_INTERVAL_MS);
	}

	throw new Error("TikTok publish timed out");
}
