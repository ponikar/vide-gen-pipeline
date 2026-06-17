import { authenticateApiKey } from "@/lib/api-key-auth";
import { db } from "@/db";
import { connectedAccounts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const IG_BASE = "https://graph.instagram.com/v22.0";

async function fetchIg(path: string, accessToken: string) {
  const url = new URL(`${IG_BASE}${path}`);
  url.searchParams.set("access_token", accessToken);
  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Instagram API error (${res.status}): ${body}`);
  }
  return res.json();
}

async function getAccountInsights(accessToken: string, accountId: string) {
  const data = await fetchIg(
    `/${accountId}/insights?metric=reach,impressions,profile_views&period=day`,
    accessToken,
  );
  return data.data ?? [];
}

async function getRecentMedia(
  accessToken: string,
  accountId: string,
  limit = 5,
) {
  const data = await fetchIg(
    `/${accountId}/media?fields=id,permalink,media_type,timestamp,caption&limit=${limit}`,
    accessToken,
  );
  return data.data ?? [];
}

async function getMediaInsights(accessToken: string, mediaId: string) {
  const data = await fetchIg(
    `/${mediaId}/insights?metric=reach,saved,likes,comments,shares,plays`,
    accessToken,
  );
  return data.data ?? [];
}

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return Response.json({ error: "Invalid or missing API key" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider")?.toLowerCase() ?? "instagram";
  const mediaId = searchParams.get("mediaId");

  const [account] = await db
    .select()
    .from(connectedAccounts)
    .where(
      and(eq(connectedAccounts.provider, provider), eq(connectedAccounts.appId, auth.appId)),
    );
  if (!account) {
    return Response.json(
      { error: `No ${provider} account linked to this app` },
      { status: 404 },
    );
  }

  const accessToken = account.accessToken;

  if (mediaId) {
    let insights: unknown[] = [];
    let media: unknown = null;
    try {
      [insights, media] = await Promise.all([
        getMediaInsights(accessToken, mediaId),
        fetchIg(
          `/${mediaId}?fields=id,permalink,media_type,timestamp,caption`,
          accessToken,
        ),
      ]);
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
    return Response.json({ username: account.username, media, insights });
  }

  try {
    const [accountInsights, recentMedia] = await Promise.all([
      getAccountInsights(accessToken, account.providerUserId),
      getRecentMedia(accessToken, account.providerUserId),
    ]);
    return Response.json({
      username: account.username,
      insights: accountInsights,
      recentMedia,
    });
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
