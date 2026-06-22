import { authenticateApiKey } from "@/lib/api-key-auth";
import { db } from "@/db";
import { connectedAccounts, posts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { InstagramProvider } from "@/lib/instagram";

const provider = new InstagramProvider();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ containerId: string }> },
) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return Response.json({ error: "Invalid or missing API key" }, { status: 401 });
  }

  const { containerId } = await params;
  const { searchParams } = new URL(request.url);
  const providerName = searchParams.get("provider")?.toLowerCase() ?? "instagram";
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
        title: caption ? caption.slice(0, 200) : "Posted via Gold Fish agent",
        link: published.permalink ?? null,
        stats: {
          provider: providerName,
          providerMediaId: published.id,
          providerAccountId: account.providerUserId,
          containerId,
        },
      })
      .returning();

    return Response.json({
      id: post.id,
      permalink: published.permalink,
      providerMediaId: published.id,
    });
  } catch (err) {
    return Response.json(
      {
        containerId,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }
}
