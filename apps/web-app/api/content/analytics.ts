import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getProvider } from '../../../../src/social/registry.js';
import { db, schema } from '../../../../src/db/index.js';
import { eq } from 'drizzle-orm';
import { InstagramClient } from '../../../../src/instagram/client.js';
import {
  getAccountInsights,
  getRecentMedia,
} from '../../../../src/instagram/analytics.js';
import { withVercelLogging } from '../../../../src/vercel-logging.js';

async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') return res.status(405).end();

    const providerName = (req.query.provider as string) ?? 'instagram';
    const mediaId = req.query.mediaId as string | undefined;

    const accounts = await db
      .select()
      .from(schema.connectedAccounts)
      .where(eq(schema.connectedAccounts.provider, providerName))
      .limit(1);

    if (accounts.length === 0) {
      return res.status(401).json({ error: 'Account not connected' });
    }

    const account = accounts[0];
    const client = new InstagramClient(account.accessToken);

    if (mediaId) {
      try {
        const { getMediaInsights } = await import('../../../../src/instagram/analytics.js');
        const [insights, media] = await Promise.all([
          getMediaInsights(client, mediaId),
          client.get<{ id: string; permalink: string; media_type: string; timestamp: string; caption?: string }>(
            `/${mediaId}`,
            { fields: 'id,permalink,media_type,timestamp,caption' },
          ),
        ]);

        return res.json({ username: account.username, media, insights });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return res.json({ username: account.username, mediaId, error: message });
      }
    }

    const [accountInsights, recentMedia] = await Promise.all([
      getAccountInsights(client, account.providerUserId),
      getRecentMedia(client, account.providerUserId, 5),
    ]);

    res.json({
      username: account.username,
      insights: accountInsights,
      recentMedia,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
}

export default withVercelLogging('api.content.analytics', handler);
