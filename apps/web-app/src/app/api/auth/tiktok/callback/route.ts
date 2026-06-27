import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { connectedAccounts } from "@/db/schema";
import { env } from "@/env";
import {
	exchangeCode,
	getProfile,
	TIKTOK_REDIRECT_URI,
} from "@/lib/tiktok/auth";
import {
	type RouteContext,
	withRouteLogging,
} from "@/server/http-logging";

export function GET(request: Request) {
	return withRouteLogging("oauth.tiktok.callback", request, (context) =>
		handleGet(request, context),
	);
}

async function handleGet(request: Request, { logger }: RouteContext) {
	const { searchParams } = new URL(request.url);
	const code = searchParams.get("code");
	const error = searchParams.get("error");
	const state = searchParams.get("state");

	if (error) {
		return new Response(`TikTok OAuth error: ${error}`, { status: 400 });
	}

	if (!code || !state) {
		return new Response("Missing code or state", { status: 400 });
	}

	let appId: string;
	let codeVerifier: string;
	try {
		const parsed = JSON.parse(state);
		appId = parsed.appId;
		codeVerifier = parsed.verifier;
	} catch {
		return new Response("Invalid state", { status: 400 });
	}

	const baseUrl = env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
	try {
		const token = await exchangeCode({
			code,
			redirectUri: TIKTOK_REDIRECT_URI,
			codeVerifier,
		});
		const profile = await getProfile(token.access_token);

		const existing = await db
			.select()
			.from(connectedAccounts)
			.where(
				and(
					eq(connectedAccounts.provider, "tiktok"),
					eq(connectedAccounts.providerUserId, profile.openId),
				),
			)
			.limit(1);

		if (existing.length > 0) {
			await db
				.update(connectedAccounts)
				.set({
					accessToken: token.access_token,
					refreshToken: token.refresh_token,
					tokenExpiresAt: new Date(Date.now() + token.expires_in * 1000),
					username: profile.displayName,
					displayName: profile.displayName,
					avatarUrl: profile.avatarUrl,
					appId,
				})
				.where(eq(connectedAccounts.id, existing[0].id));
		} else {
			await db.insert(connectedAccounts).values({
				provider: "tiktok",
				providerUserId: profile.openId,
				username: profile.displayName,
				displayName: profile.displayName,
				avatarUrl: profile.avatarUrl,
				accessToken: token.access_token,
				refreshToken: token.refresh_token,
				tokenExpiresAt: new Date(Date.now() + token.expires_in * 1000),
				appId,
			});
		}
		logger.info("oauth.account_saved", "TikTok account connection was saved", {
			appId,
			provider: "tiktok",
			operation: existing.length > 0 ? "updated" : "created",
			stateSaved: true,
		});

		return Response.redirect(`${baseUrl}/dashboard/${appId}`, 302);
	} catch (err) {
		logger.error(
			"oauth.callback_failed",
			"TikTok authorization callback failed",
			err,
			{ appId, provider: "tiktok" },
		);
		const message = err instanceof Error ? err.message : "Unknown error";
		return new Response(`TikTok OAuth failed: ${message}`, { status: 500 });
	}
}
