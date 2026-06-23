import { InstagramApiError, InstagramClient } from "./client";

const IG_BASE = "https://graph.instagram.com/v22.0";
const POLL_RETRIES = 30;
const POLL_INTERVAL_MS = 5000;

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export class InstagramProvider {
	readonly name = "instagram";

	async createMedia(
		accessToken: string,
		accountId: string,
		videoUrl: string,
		caption: string,
	): Promise<{ containerId: string }> {
		const client = new InstagramClient(accessToken);
		const container = await client.post<{ id: string }>(`/${accountId}/media`, {
			media_type: "REELS",
			video_url: videoUrl,
			caption,
		});
		return { containerId: container.id };
	}

	async getMediaStatus(
		accessToken: string,
		containerId: string,
	): Promise<{ status: string; errorMessage?: string }> {
		const client = new InstagramClient(accessToken);
		const status = await client.get<{
			status_code?: string;
			error_message?: string;
		}>(`/${containerId}`, { fields: "status_code,error_message" });
		return {
			status: status.status_code ?? "IN_PROGRESS",
			errorMessage: status.error_message,
		};
	}

	async publishMedia(
		accessToken: string,
		accountId: string,
		containerId: string,
	): Promise<{ id: string; permalink: string }> {
		const client = new InstagramClient(accessToken);
		const published = await client.post<{ id: string }>(
			`/${accountId}/media_publish`,
			{ creation_id: containerId },
		);
		const details = await client.get<{ id: string; permalink: string }>(
			`/${published.id}`,
			{ fields: "id,permalink" },
		);
		return { id: details.id, permalink: details.permalink };
	}

	async postReel(
		accessToken: string,
		accountId: string,
		videoUrl: string,
		caption: string,
	): Promise<{ igMediaId: string; permalink: string; containerId: string }> {
		const client = new InstagramClient(accessToken);

		const container = await client.post<{ id: string }>(`/${accountId}/media`, {
			media_type: "REELS",
			video_url: videoUrl,
			caption,
		});
		const containerId = container.id;

		for (let attempt = 0; attempt < POLL_RETRIES; attempt++) {
			const status = await client.get<{
				status_code?: string;
				error_message?: string;
			}>(`/${containerId}`, { fields: "status_code,error_message" });

			const code = status.status_code ?? "IN_PROGRESS";

			if (code === "FINISHED") break;
			if (code === "ERROR") {
				throw new Error(
					`Container processing failed: ${status.error_message ?? "Unknown error"}`,
				);
			}
			if (code === "EXPIRED") {
				throw new Error("Container expired before publishing");
			}

			await sleep(POLL_INTERVAL_MS);
		}

		const published = await client.post<{ id: string }>(
			`/${accountId}/media_publish`,
			{ creation_id: containerId },
		);

		const details = await client.get<{ id: string; permalink: string }>(
			`/${published.id}`,
			{ fields: "id,permalink" },
		);

		return {
			igMediaId: details.id,
			permalink: details.permalink,
			containerId,
		};
	}

	async refreshToken(
		accessToken: string,
	): Promise<{ accessToken: string; expiresIn: number } | null> {
		try {
			const res = await fetch(
				`${IG_BASE}/refresh_access_token?grant_type=ig_refresh_token&access_token=${accessToken}`,
			);
			if (!res.ok) return null;
			const data = await res.json();
			return { accessToken: data.access_token, expiresIn: data.expires_in };
		} catch {
			return null;
		}
	}
}

export { InstagramApiError, InstagramClient };
