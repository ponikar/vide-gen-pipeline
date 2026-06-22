import { authenticateApiKey } from "@/lib/api-key-auth";
import { db } from "@/db";
import { connectedAccounts, posts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { InstagramProvider } from "@/lib/instagram";

const provider = new InstagramProvider();

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
      title: caption ? caption.slice(0, 200) : "Posted via Gold Fish agent",
      link: result.permalink ?? null,
      stats: {
        provider: providerName,
        providerMediaId: result.igMediaId,
        providerAccountId: account.providerUserId,
      },
    })
    .returning();

  return Response.json({
    id: post.id,
    permalink: result.permalink,
    providerMediaId: result.igMediaId,
    containerId: result.containerId,
  });
}
