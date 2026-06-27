import crypto from "crypto";
import { env } from "@/env";

const AUTH_BASE = "https://www.tiktok.com";
const API_BASE = "https://open.tiktokapis.com/v2";
export const TIKTOK_REDIRECT_URI =
	"https://vide-gen-pipeline.vercel.app/api/auth/tiktok/callback";

export type TikTokProfile = {
	openId: string;
	unionId?: string;
	displayName: string;
	avatarUrl?: string;
};

type TokenResponse = {
	access_token: string;
	expires_in: number;
	refresh_token: string;
	refresh_expires_in: number;
	open_id: string;
	scope: string;
	token_type: string;
};

type TokenErrorResponse = {
	error: string;
	error_description?: string;
	log_id?: string;
};

function generateCodeVerifier(): string {
	return crypto.randomBytes(32)
		.toString("base64url")
		.replace(/[^a-zA-Z0-9\-._~]/g, "")
		.slice(0, 64);
}

function generateCodeChallenge(verifier: string): string {
	return crypto.createHash("sha256").update(verifier).digest("hex");
}

function tikTokCreds() {
	if (env.TIKTOK_MODE === "sandbox") {
		return {
			appId: env.TIKTOK_SANDBOX_APP_ID!,
			appSecret: env.TIKTOK_SANDBOX_APP_SECRET!,
		};
	}
	return { appId: env.TIKTOK_APP_ID!, appSecret: env.TIKTOK_APP_SECRET! };
}

export function getAuthUrl(params: {
	redirectUri: string;
	state: string;
}): { url: string; codeVerifier: string } {
	const codeVerifier = generateCodeVerifier();
	const codeChallenge = generateCodeChallenge(codeVerifier);
	const url = new URL(`${AUTH_BASE}/v2/auth/authorize/`);
	url.searchParams.set("client_key", tikTokCreds().appId);
	url.searchParams.set("redirect_uri", params.redirectUri);
	url.searchParams.set("response_type", "code");
	url.searchParams.set(
		"scope",
		env.TIKTOK_MODE === "sandbox"
			? "user.info.basic"
			: "user.info.basic,video.upload,video.publish,video.list",
	);
	url.searchParams.set("state", params.state);
	url.searchParams.set("code_challenge", codeChallenge);
	url.searchParams.set("code_challenge_method", "S256");
	return { url: url.toString(), codeVerifier };
}

export async function exchangeCode(params: {
	code: string;
	redirectUri: string;
	codeVerifier: string;
}): Promise<TokenResponse> {
	const creds = tikTokCreds();
	const body = new URLSearchParams();
	body.set("client_key", creds.appId);
	body.set("client_secret", creds.appSecret);
	body.set("grant_type", "authorization_code");
	body.set("redirect_uri", params.redirectUri);
	body.set("code", params.code);
	body.set("code_verifier", params.codeVerifier);

	const res = await fetch(`${API_BASE}/oauth/token/`, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			"Cache-Control": "no-cache",
		},
		body,
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`TikTok token exchange failed: ${text}`);
	}

	const data = (await res.json()) as TokenResponse | TokenErrorResponse;

	if ("error" in data) {
		throw new Error(
			`TikTok token exchange error: ${data.error} - ${data.error_description ?? "Unknown error"}`,
		);
	}

	return data;
}

export async function refreshToken(params: {
	refreshToken: string;
}): Promise<TokenResponse | null> {
	const creds = tikTokCreds();
	const body = new URLSearchParams();
	body.set("client_key", creds.appId);
	body.set("client_secret", creds.appSecret);
	body.set("grant_type", "refresh_token");
	body.set("refresh_token", params.refreshToken);

	const res = await fetch(`${API_BASE}/oauth/token/`, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			"Cache-Control": "no-cache",
		},
		body,
	});

	if (!res.ok) return null;

	const data = (await res.json()) as TokenResponse | TokenErrorResponse;

	if ("error" in data) return null;

	return data;
}

export async function getProfile(accessToken: string): Promise<TikTokProfile> {
	const url = new URL(`${API_BASE}/user/info/`);
	url.searchParams.set(
		"fields",
		"open_id,union_id,display_name,avatar_url",
	);

	const res = await fetch(url, {
		method: "GET",
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Failed to get TikTok profile: ${text}`);
	}

	const data = (await res.json()) as {
		data?: {
			user?: {
				open_id: string;
				union_id?: string;
				display_name: string;
				avatar_url?: string;
			};
		};
		error?: { code: string; message: string };
	};

	if (data.error && data.error.code !== "ok") {
		throw new Error(
			`TikTok profile error: ${data.error.code} - ${data.error.message}`,
		);
	}

	const user = data.data?.user;
	if (!user) {
		throw new Error("TikTok profile returned no user data");
	}

	return {
		openId: user.open_id,
		unionId: user.union_id,
		displayName: user.display_name,
		avatarUrl: user.avatar_url,
	};
}
