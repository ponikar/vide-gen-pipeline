import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { connectedAccounts } from "@/db/schema";
import { authenticateApiKey } from "@/lib/api-key-auth";
import {
	getAccountInsights,
	getMediaInsights,
	getRecentMedia,
	InstagramClient,
} from "@/lib/instagram";
import {
	type RouteContext,
	withRouteLogging,
} from "@/server/http-logging";

export function GET(request: Request) {
	return withRouteLogging("api.v1.analytics", request, (context) =>
		handleGet(request, context),
	);
}

async function handleGet(
	request: Request,
	{ logger, requestId }: RouteContext,
) {
	const auth = await authenticateApiKey(request, requestId);
	if (!auth) {
		return Response.json(
			{ error: "Invalid or missing API key" },
			{ status: 401 },
		);
	}

	const { searchParams } = new URL(request.url);
	const providerName =
		searchParams.get("provider")?.toLowerCase() ?? "instagram";
	const mediaId = searchParams.get("mediaId");

	const [account] = await db
		.select()
		.from(connectedAccounts)
		.where(
			and(
				eq(connectedAccounts.provider, providerName),
				eq(connectedAccounts.appId, auth.appId),
			),
		);
	if (!account) {
		return Response.json(
			{ error: `No ${providerName} account linked to this app` },
			{ status: 404 },
		);
	}

	const client = new InstagramClient(account.accessToken);

	if (mediaId) {
		try {
			const [insights, media] = await Promise.all([
				getMediaInsights(client, mediaId),
				client.get<Record<string, unknown>>(`/${mediaId}`, {
					fields: "id,permalink,media_type,timestamp,caption",
				}),
			]);
			return Response.json({ username: account.username, media, insights });
		} catch (err) {
			logger.error(
				"analytics.media_failed",
				"Media analytics request failed",
				err,
				{ appId: auth.appId, platform: providerName, mediaId },
			);
			return Response.json(
				{
					username: account.username,
					mediaId,
					error: err instanceof Error ? err.message : String(err),
				},
				{ status: 502 },
			);
		}
	}

	try {
		const [accountInsights, recentMedia] = await Promise.all([
			getAccountInsights(client, account.providerUserId),
			getRecentMedia(client, account.providerUserId),
		]);
		return Response.json({
			username: account.username,
			insights: accountInsights,
			recentMedia,
		});
	} catch (err) {
		logger.error(
			"analytics.account_failed",
			"Account analytics request failed",
			err,
			{ appId: auth.appId, platform: providerName },
		);
		return Response.json(
			{
				username: account.username,
				error: err instanceof Error ? err.message : String(err),
			},
			{ status: 502 },
		);
	}
}
