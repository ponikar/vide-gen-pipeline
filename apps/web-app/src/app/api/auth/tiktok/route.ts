import { getAuthUrl, TIKTOK_REDIRECT_URI } from "@/lib/tiktok/auth";
import {
	type RouteContext,
	withRouteLogging,
} from "@/server/http-logging";

export function GET(request: Request) {
	return withRouteLogging("oauth.tiktok.start", request, (context) =>
		handleGet(request, context),
	);
}

async function handleGet(request: Request, { logger }: RouteContext) {
	const { searchParams } = new URL(request.url);
	const appId = searchParams.get("appId");
	if (!appId) {
		return new Response("Missing appId", { status: 400 });
	}

	const { url, codeVerifier } = getAuthUrl({
		redirectUri: TIKTOK_REDIRECT_URI,
		state: appId,
	});

	const finalUrl = new URL(url);
	finalUrl.searchParams.set(
		"state",
		JSON.stringify({ appId, verifier: codeVerifier }),
	);

	logger.info("oauth.redirect_created", "TikTok authorization redirect created", {
		appId,
		provider: "tiktok",
	});

	return Response.redirect(finalUrl.toString(), 302);
}
