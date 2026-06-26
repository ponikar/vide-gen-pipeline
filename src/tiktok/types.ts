export type TikTokProfile = {
	openId: string;
	unionId?: string;
	displayName: string;
	avatarUrl?: string;
};

export type UploadResponse = {
	upload_url: string;
	publish_id: string;
};

export type PublishResponse = {
	publish_id: string;
};

export type PublishStatus = {
	status: "PUBLISHED" | "PROCESSING" | "FAILED";
	post_url?: string;
	fail_reason?: string;
};

export type PostResult = {
	postUrl?: string;
	publishId: string;
};

export type VideoStats = {
	id: string;
	viewCount: number;
	likeCount: number;
	commentCount: number;
	shareCount: number;
};
