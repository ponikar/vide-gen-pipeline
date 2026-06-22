import { authenticateApiKey } from "@/lib/api-key-auth";
import { db } from "@/db";
import { connectedAccounts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  InstagramClient,
  getMediaInsights,
  getAccountInsights,
  getRecentMedia,
} from "@/lib/instagram";

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return Response.json({ error: "Invalid or missing API key" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const providerName = searchParams.get("provider")?.toLowerCase() ?? "instagram";
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
    return Response.json({ username: account.username, insights: accountInsights, recentMedia });
  } catch (err) {
    return Response.json(
      {
        username: account.username,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }
}
