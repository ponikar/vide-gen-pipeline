import { env } from "@/env";
import { getAuthUrl } from "@/lib/tiktok/auth";

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const appId = searchParams.get("appId");
	if (!appId) {
		return new Response("Missing appId", { status: 400 });
	}

	const baseUrl = env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
	const redirectUri = `${baseUrl}/api/auth/tiktok/callback`;

	const url = getAuthUrl({
		redirectUri,
		state: appId,
	});

	return Response.redirect(url, 302);
}
