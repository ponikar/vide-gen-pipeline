import { authenticateApiKey } from "@/lib/api-key-auth";
import { db } from "@/db";
import { connectedAccounts, posts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { InstagramProvider } from "@/lib/instagram";

const provider = new InstagramProvider();
const POLL_TIMEOUT_MS = 10000;

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
            tokenExpiresAt: new Date(
              Date.now() + refreshed.expiresIn * 1000,
            ),
          })
          .where(eq(connectedAccounts.id, account.id))
          .then(() => {})
          .catch(() => {});
      }
    }
  }

  const accountId = account.providerUserId;

  const { containerId } = await provider.createMedia(
    accessToken,
    accountId,
    videoUrl,
    caption,
  );

  const start = Date.now();
  let finished = false;
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    const status = await provider.getMediaStatus(accessToken, containerId);
    if (status.status === "FINISHED") {
      finished = true;
      break;
    }
    if (status.status === "ERROR") {
      return Response.json(
        { containerId, error: status.errorMessage ?? "Media processing failed" },
        { status: 502 },
      );
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  if (!finished) {
    return Response.json({ containerId }, { status: 202 });
  }

  const published = await provider.publishMedia(
    accessToken,
    accountId,
    containerId,
  );

  const [post] = await db
    .insert(posts)
    .values({
      appId: auth.appId,
      title: caption ? caption.slice(0, 200) : "Posted via Gold Fish agent",
      link: published.permalink ?? null,
      stats: {
        provider: providerName,
        providerMediaId: published.id,
        providerAccountId: accountId,
      },
    })
    .returning();

  return Response.json({
    id: post.id,
    permalink: published.permalink,
    providerMediaId: published.id,
    containerId,
  });
}
