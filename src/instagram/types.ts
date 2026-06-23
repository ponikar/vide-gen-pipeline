export type EnvVars = {
	INSTAGRAM_APP_ID?: string;
	INSTAGRAM_APP_SECRET?: string;
	INSTAGRAM_ACCESS_TOKEN?: string;
	INSTAGRAM_ACCOUNT_ID?: string;
	INSTAGRAM_TOKEN_EXPIRES_AT?: string;
};

export type InstagramProfile = {
	id: string;
	username: string;
	name?: string;
	profilePictureUrl?: string;
	accountType: string;
	followersCount?: number;
	mediaCount?: number;
};

export type ReelInput = {
	videoUrl: string;
	caption: string;
};

export type PostResult = {
	igMediaId: string;
	permalink: string;
};

export type MediaStatus = "IN_PROGRESS" | "FINISHED" | "ERROR" | "EXPIRED";

export type MediaContainer = {
	id: string;
	status_code?: MediaStatus;
	error_message?: string;
};

export type Insight = {
	metric: string;
	value: number;
};

export type RecentMedia = {
	id: string;
	permalink: string;
	mediaType: string;
	timestamp: string;
	caption?: string;
};
