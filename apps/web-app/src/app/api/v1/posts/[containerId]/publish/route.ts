import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { connectedAccounts, posts } from "@/db/schema";
import { authenticateApiKey } from "@/lib/api-key-auth";
import { InstagramProvider } from "@/lib/instagram";
import {
	type RouteContext,
	withRouteLogging,
} from "@/server/http-logging";

const provider = new InstagramProvider();

export function POST(
	request: Request,
	route: { params: Promise<{ containerId: string }> },
) {
	return withRouteLogging("api.v1.posts.publish", request, (context) =>
		handlePost(request, route, context),
	);
}

async function handlePost(
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
	const caption = searchParams.get("caption") ?? "";

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
		const published = await provider.publishMedia(
			account.accessToken,
			account.providerUserId,
			containerId,
		);

		const [post] = await db
			.insert(posts)
			.values({
				appId: auth.appId,
				title: caption ? caption.slice(0, 200) : "Posted via AttentionSpam agent",
				link: published.permalink ?? null,
				stats: {
					provider: providerName,
					providerMediaId: published.id,
					providerAccountId: account.providerUserId,
					containerId,
				},
			})
			.returning();
		logger.info("post.published", "Media was published and the post was saved", {
			appId: auth.appId,
			postId: post.id,
			platform: providerName,
			containerId,
			stateSaved: true,
		});

		return Response.json({
			id: post.id,
			permalink: published.permalink,
			providerMediaId: published.id,
		});
	} catch (err) {
		logger.error(
			"post.publish_failed",
			"Media publishing or post persistence failed",
			err,
			{ appId: auth.appId, platform: providerName, containerId },
		);
		return Response.json(
			{
				containerId,
				error: err instanceof Error ? err.message : String(err),
			},
			{ status: 502 },
		);
	}
}
