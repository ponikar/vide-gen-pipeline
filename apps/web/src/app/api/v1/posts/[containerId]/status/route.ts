import { authenticateApiKey } from "@/lib/api-key-auth";
import { db } from "@/db";
import { connectedAccounts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { InstagramProvider } from "@/lib/instagram";

const provider = new InstagramProvider();

export async function GET(
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
    const status = await provider.getMediaStatus(account.accessToken, containerId);
    return Response.json({ containerId, ...status });
  } catch (err) {
    return Response.json(
      { containerId, error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}
