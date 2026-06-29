import { TikTokClient } from "../tiktok/client.js";
import { uploadDraft } from "../tiktok/post.js";
import type { SocialProvider } from "./types.js";

export class TikTokProvider implements SocialProvider {
	readonly name = "tiktok" as const;

	async createMedia(
		accessToken: string,
		_accountId: string,
		videoUrl: string,
		_caption: string,
	): Promise<{ containerId: string }> {
		const client = new TikTokClient(accessToken);
		const result = await uploadDraft(client, videoUrl);
		return { containerId: result.publishId };
	}

	async getMediaStatus(
		accessToken: string,
		containerId: string,
	): Promise<{ status: string; errorMessage?: string }> {
		const client = new TikTokClient(accessToken);
		const status = await client.post<{
			status: string;
			fail_reason?: string;
		}>("/post/publish/status/fetch/", { publish_id: containerId });
		return {
			status: status.status,
			errorMessage: status.fail_reason,
		};
	}

	async publishMedia(
		_accessToken: string,
		_accountId: string,
		_containerId: string,
	): Promise<{ id: string; permalink: string }> {
		return { id: _containerId, permalink: "" };
	}

	getAuthUrl(): string {
		throw new Error("OAuth for TikTok is handled in web-app");
	}

	async exchangeCode(): Promise<{
		accessToken: string;
		providerUserId: string;
		username: string;
		expiresIn: number;
	}> {
		throw new Error("OAuth for TikTok is handled in web-app");
	}

	async refreshToken(
		accessToken: string,
	): Promise<{ accessToken: string; expiresIn: number } | null> {
		const client = new TikTokClient(accessToken);
		try {
			const res = await client.post<{
				access_token: string;
				expires_in: number;
				refresh_token: string;
				refresh_expires_in: number;
			}>("/oauth/token/", {
				grant_type: "refresh_token",
				refresh_token: accessToken,
			});
			return { accessToken: res.access_token, expiresIn: res.expires_in };
		} catch {
			return null;
		}
	}

	async getProfile(accessToken: string): Promise<{
		id: string;
		username: string;
		name?: string;
		avatarUrl?: string;
		accountType?: string;
		followersCount?: number;
	}> {
		const client = new TikTokClient(accessToken);
		const user = await client.get<{
			user: { open_id: string; display_name: string; avatar_url?: string };
		}>("/user/info/");
		return {
			id: user.user.open_id,
			username: user.user.display_name,
			name: user.user.display_name,
			avatarUrl: user.user.avatar_url,
		};
	}
}
