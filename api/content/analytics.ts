import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getProvider } from '../../src/social/registry.js';
import { db, schema } from '../../src/db/index.js';
import { eq } from 'drizzle-orm';
import { InstagramClient } from '../../src/instagram/client.js';
import {
  getAccountInsights,
  getRecentMedia,
} from '../../src/instagram/analytics.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const providerName = (req.query.provider as string) ?? 'instagram';

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

  const [accountInsights, recentMedia] = await Promise.all([
    getAccountInsights(client, account.providerUserId),
    getRecentMedia(client, account.providerUserId, 5),
  ]);

  res.json({
    username: account.username,
    insights: accountInsights,
    recentMedia,
  });
}
