import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { connectedAccounts } from "@/db/schema";
import { authenticateApiKey } from "@/lib/api-key-auth";
import { InstagramProvider } from "@/lib/instagram";
import {
	type RouteContext,
	withRouteLogging,
} from "@/server/http-logging";

const provider = new InstagramProvider();

export function GET(
	request: Request,
	route: { params: Promise<{ containerId: string }> },
) {
	return withRouteLogging("api.v1.posts.status", request, (context) =>
		handleGet(request, route, context),
	);
}

async function handleGet(
	request: Request,
	{ params }: { params: Promise<{ containerId: string }> },
	{ logger, requestId }: RouteContext,
) {
	const auth = await authenticateApiKey(request, requestId);
	if (!auth) {
		return Response.json(
			{ error: "Invalid or missing API key" },
			{ status: 401 },
		);
	}

	const { containerId } = await params;
	const { searchParams } = new URL(request.url);
	const providerName =
		searchParams.get("provider")?.toLowerCase() ?? "instagram";

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

	try {
		const status = await provider.getMediaStatus(
			account.accessToken,
			containerId,
		);
		return Response.json({ containerId, ...status });
	} catch (err) {
		logger.error(
			"post.status_failed",
			"Media status request failed",
			err,
			{ appId: auth.appId, platform: providerName, containerId },
		);
		return Response.json(
			{ containerId, error: err instanceof Error ? err.message : String(err) },
			{ status: 502 },
		);
	}
}
