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

export function POST(request: Request) {
	return withRouteLogging("api.v1.posts.create", request, (context) =>
		handlePost(request, context),
	);
}

async function handlePost(
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

	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch (error) {
		logger.warn("post.request_invalid", "Post request body is invalid", { error });
		return Response.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	const providerName = (body.provider as string)?.toLowerCase();
	const videoUrl = body.videoUrl as string | undefined;
	const caption = (body.caption as string) ?? "";

	if (!providerName || !videoUrl) {
		return Response.json(
			{ error: "Missing required fields: provider, videoUrl" },
			{ status: 400 },
		);
	}

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

	let accessToken = account.accessToken;
	if (account.tokenExpiresAt) {
		const daysUntilExpiry =
			(account.tokenExpiresAt.getTime() - Date.now()) / 86_400_000;
		if (daysUntilExpiry < 7) {
			const refreshed = await provider.refreshToken(accessToken);
			if (refreshed) {
				accessToken = refreshed.accessToken;
				db.update(connectedAccounts)
					.set({
						accessToken: refreshed.accessToken,
						tokenExpiresAt: new Date(Date.now() + refreshed.expiresIn * 1000),
					})
					.where(eq(connectedAccounts.id, account.id))
					.then(() => {
						logger.info("post.token_refresh_saved", "Refreshed token was saved", {
							accountId: account.id,
							stateSaved: true,
						});
					})
					.catch((error: unknown) => {
						logger.warn(
							"post.token_refresh_save_failed",
							"Refreshed token could not be saved",
							{ error, accountId: account.id, stateSaved: false },
						);
					});
			}
		}
	}

	const result = await provider.postReel(
		accessToken,
		account.providerUserId,
		videoUrl,
		caption,
	);

	const [post] = await db
		.insert(posts)
		.values({
			appId: auth.appId,
			title: caption ? caption.slice(0, 200) : "Posted via AttentionSpam agent",
			link: result.permalink ?? null,
			stats: {
				provider: providerName,
				providerMediaId: result.igMediaId,
				providerAccountId: account.providerUserId,
			},
		})
		.returning();
	logger.info("post.published", "Video was published and the post was saved", {
		appId: auth.appId,
		postId: post.id,
		platform: providerName,
		stateSaved: true,
	});

	return Response.json({
		id: post.id,
		permalink: result.permalink,
		providerMediaId: result.igMediaId,
		containerId: result.containerId,
	});
}
