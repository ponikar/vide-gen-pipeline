import { authenticateApiKey } from "@/lib/api-key-auth";
import { db } from "@/db";
import { connectedAccounts, posts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const IG_BASE = "https://graph.instagram.com/v22.0";
const POLL_TIMEOUT_MS = 10000;

async function refreshInstagramToken(
  accessToken: string,
  accountId: string,
): Promise<string> {
  const res = await fetch(
    `${IG_BASE}/refresh_access_token?grant_type=ig_refresh_token&access_token=${accessToken}`,
  );
  if (!res.ok) return accessToken;
  const data = await res.json();
  db.update(connectedAccounts)
    .set({
      accessToken: data.access_token,
      tokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
    })
    .where(eq(connectedAccounts.id, accountId))
    .then(() => {})
    .catch(() => {});
  return data.access_token;
}

export async function POST(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return Response.json({ error: "Invalid or missing API key" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const provider = (body.provider as string)?.toLowerCase();
  const videoUrl = body.videoUrl as string | undefined;
  const caption = (body.caption as string) ?? "";

  if (!provider || !videoUrl) {
    return Response.json(
      { error: "Missing required fields: provider, videoUrl" },
      { status: 400 },
    );
  }

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

  let accessToken = account.accessToken;
  if (account.tokenExpiresAt) {
    const daysUntilExpiry =
      (account.tokenExpiresAt.getTime() - Date.now()) / 86_400_000;
    if (daysUntilExpiry < 7) {
      accessToken = await refreshInstagramToken(accessToken, account.id);
    }
  }

  const accountId = account.providerUserId;

  const containerRes = await fetch(`${IG_BASE}/${accountId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      access_token: accessToken,
      media_type: "REELS",
      video_url: videoUrl,
      caption,
    }),
  });

  if (!containerRes.ok) {
    const err = await containerRes.text();
    return Response.json({ error: `Instagram API error: ${err}` }, { status: 502 });
  }

  const { id: containerId } = await containerRes.json();

  const start = Date.now();
  let finished = false;
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    const statusRes = await fetch(
      `${IG_BASE}/${containerId}?fields=status_code,error_message&access_token=${accessToken}`,
    );
    const status = await statusRes.json();
    if (status.status_code === "FINISHED") {
      finished = true;
      break;
    }
    if (status.status_code === "ERROR") {
      return Response.json(
        { containerId, error: status.error_message ?? "Media processing failed" },
        { status: 502 },
      );
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  if (!finished) {
    return Response.json({ containerId }, { status: 202 });
  }

  const publishRes = await fetch(`${IG_BASE}/${accountId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      access_token: accessToken,
      creation_id: containerId,
    }),
  });

  if (!publishRes.ok) {
    const err = await publishRes.text();
    return Response.json({ error: `Publish failed: ${err}` }, { status: 502 });
  }

  const { id: mediaId } = await publishRes.json();

  const mediaRes = await fetch(
    `${IG_BASE}/${mediaId}?fields=id,permalink&access_token=${accessToken}`,
  );
  const mediaData = await mediaRes.json();

  const [post] = await db
    .insert(posts)
    .values({
      appId: auth.appId,
      title: caption ? caption.slice(0, 200) : "Posted via Gold Fish agent",
      link: mediaData.permalink ?? null,
      stats: {
        provider,
        providerMediaId: mediaId,
        providerAccountId: accountId,
      },
    })
    .returning();

  return Response.json({
    id: post.id,
    permalink: mediaData.permalink ?? null,
    providerMediaId: mediaId,
  });
}
