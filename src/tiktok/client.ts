import type { VideoStats } from "./types.js";

const BASE_URL = "https://open.tiktokapis.com/v2";

export class TikTokApiError extends Error {
	constructor(
		public status: number,
		public body: string,
	) {
		super(`TikTok API error (${status}): ${body}`);
		this.name = "TikTokApiError";
	}
}

export class TikTokClient {
	constructor(private accessToken: string) {}

	async get<T>(path: string, params?: Record<string, string>): Promise<T> {
		const url = new URL(`${BASE_URL}${path}`);
		if (params) {
			for (const [key, value] of Object.entries(params)) {
				url.searchParams.set(key, value);
			}
		}
		const res = await fetch(url.toString(), {
			headers: { Authorization: `Bearer ${this.accessToken}` },
		});
		if (!res.ok) throw new TikTokApiError(res.status, await res.text());
		const json = (await res.json()) as {
			data?: T;
			error?: { code: string; message: string };
		};
		if (json.error)
			throw new Error(
				`TikTok error: ${json.error.code} - ${json.error.message}`,
			);
		return json.data!;
	}

	async getVideoStats(videoIds: string[]): Promise<VideoStats[]> {
		const data = await this.post<{ videos: Array<Record<string, unknown>> }>(
			"/video/query/?fields=id,view_count,like_count,comment_count,share_count",
			{ filters: { video_ids: videoIds } },
		);
		return (data.videos ?? []).map((v) => ({
			id: String(v.id ?? ""),
			viewCount: Number(v.view_count ?? 0),
			likeCount: Number(v.like_count ?? 0),
			commentCount: Number(v.comment_count ?? 0),
			shareCount: Number(v.share_count ?? 0),
		}));
	}

	async post<T>(path: string, body: unknown): Promise<T> {
		const res = await fetch(`${BASE_URL}${path}`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${this.accessToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
		});
		if (!res.ok) throw new TikTokApiError(res.status, await res.text());
		const json = (await res.json()) as {
			data?: T;
			error?: { code: string; message: string };
		};
		if (json.error)
			throw new Error(
				`TikTok error: ${json.error.code} - ${json.error.message}`,
			);
		return json.data!;
	}
}
