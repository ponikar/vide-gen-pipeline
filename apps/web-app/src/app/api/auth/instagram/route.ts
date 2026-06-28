import { getAuthUrl } from "@/lib/instagram/auth";
import {
	type RouteContext,
	withRouteLogging,
} from "@/server/http-logging";

export function GET(request: Request) {
	return withRouteLogging("oauth.instagram.start", request, (context) =>
		handleGet(request, context),
	);
}

async function handleGet(request: Request, { logger }: RouteContext) {
	const { searchParams } = new URL(request.url);
	const appId = searchParams.get("appId");
	if (!appId) {
		return new Response("Missing appId", { status: 400 });
	}

	const baseUrl = new URL(request.url).origin;
	const redirectUri = `${baseUrl}/api/auth/instagram/callback`;

	const url = getAuthUrl({
		redirectUri,
		state: appId,
	});
	logger.info("oauth.redirect_created", "Instagram authorization redirect created", {
		appId,
		provider: "instagram",
	});

	return Response.redirect(url, 302);
}
