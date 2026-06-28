import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { connectedAccounts } from "@/db/schema";
import {
	exchangeCode,
	getLongLivedToken,
	getProfile,
} from "@/lib/instagram/auth";
import {
	type RouteContext,
	withRouteLogging,
} from "@/server/http-logging";

export function GET(request: Request) {
	return withRouteLogging("oauth.instagram.callback", request, (context) =>
		handleGet(request, context),
	);
}

async function handleGet(request: Request, { logger }: RouteContext) {
	const { searchParams } = new URL(request.url);
	const code = searchParams.get("code");
	const error = searchParams.get("error");
	const state = searchParams.get("state");

	if (error) {
		return new Response(`Instagram OAuth error: ${error}`, { status: 400 });
	}

	if (!code || !state) {
		return new Response("Missing code or state", { status: 400 });
	}

	const appId = state;
	const baseUrl = new URL(request.url).origin;
	const redirectUri = `${baseUrl}/api/auth/instagram/callback`;

	try {
		const shortToken = await exchangeCode({ code, redirectUri });
		const longToken = await getLongLivedToken({
			accessToken: shortToken.accessToken,
		});
		const profile = await getProfile(longToken.accessToken);

		const existing = await db
			.select()
			.from(connectedAccounts)
			.where(
				and(
					eq(connectedAccounts.provider, "instagram"),
					eq(connectedAccounts.providerUserId, profile.id),
				),
			)
			.limit(1);

		if (existing.length > 0) {
			await db
				.update(connectedAccounts)
				.set({
					accessToken: longToken.accessToken,
					tokenExpiresAt: new Date(Date.now() + longToken.expiresIn * 1000),
					username: profile.username,
					displayName: profile.name ?? profile.username,
					avatarUrl: profile.profilePictureUrl,
					appId,
					metadata: {
						accountType: profile.accountType,
						followersCount: profile.followersCount,
						mediaCount: profile.mediaCount,
					},
				})
				.where(eq(connectedAccounts.id, existing[0].id));
		} else {
			await db.insert(connectedAccounts).values({
				provider: "instagram",
				providerUserId: profile.id,
				username: profile.username,
				displayName: profile.name ?? profile.username,
				avatarUrl: profile.profilePictureUrl,
				accessToken: longToken.accessToken,
				tokenExpiresAt: new Date(Date.now() + longToken.expiresIn * 1000),
				appId,
				metadata: {
					accountType: profile.accountType,
					followersCount: profile.followersCount,
					mediaCount: profile.mediaCount,
				},
			});
		}
		logger.info("oauth.account_saved", "Instagram account connection was saved", {
			appId,
			provider: "instagram",
			operation: existing.length > 0 ? "updated" : "created",
			stateSaved: true,
		});

		return Response.redirect(`${baseUrl}/dashboard/${appId}`, 302);
	} catch (err) {
		logger.error(
			"oauth.callback_failed",
			"Instagram authorization callback failed",
			err,
			{ appId, provider: "instagram" },
		);
		const message = err instanceof Error ? err.message : "Unknown error";
		return new Response(`Instagram OAuth failed: ${message}`, { status: 500 });
	}
}
