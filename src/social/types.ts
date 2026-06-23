export type ProviderName = "instagram" | "tiktok";

export interface SocialProvider {
	readonly name: ProviderName;

	getAuthUrl(params: {
		appId: string;
		redirectUri: string;
		state: string;
	}): string;

	exchangeCode(params: {
		code: string;
		appId: string;
		appSecret: string;
		redirectUri: string;
	}): Promise<{
		accessToken: string;
		providerUserId: string;
		username: string;
		expiresIn: number;
	}>;

	refreshToken(
		accessToken: string,
	): Promise<{ accessToken: string; expiresIn: number } | null>;

	createMedia(
		accessToken: string,
		accountId: string,
		videoUrl: string,
		caption: string,
	): Promise<{ containerId: string }>;

	getMediaStatus(
		accessToken: string,
		containerId: string,
	): Promise<{ status: string; errorMessage?: string }>;

	publishMedia(
		accessToken: string,
		accountId: string,
		containerId: string,
	): Promise<{ id: string; permalink: string }>;

	getProfile(accessToken: string): Promise<{
		id: string;
		username: string;
		name?: string;
		avatarUrl?: string;
		accountType?: string;
		followersCount?: number;
	}>;
}

export type TokenResult = Awaited<ReturnType<SocialProvider["exchangeCode"]>>;
