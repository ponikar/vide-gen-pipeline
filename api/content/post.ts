import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getProvider } from '../../src/social/registry.js';
import { db, schema } from '../../src/db/index.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { provider: providerName, blobUrl, caption } = req.body ?? {};

  if (!providerName) return res.status(400).json({ error: 'Missing provider' });
  if (!blobUrl) return res.status(400).json({ error: 'Missing blobUrl' });

  const provider = getProvider(providerName);

  const accounts = await db
    .select()
    .from(schema.connectedAccounts)
    .where(eq(schema.connectedAccounts.provider, providerName))
    .limit(1);

  if (accounts.length === 0) {
    return res.status(401).json({ error: 'Account not connected' });
  }

  const account = accounts[0];

  if (
    account.tokenExpiresAt &&
    account.tokenExpiresAt.getTime() < Date.now()
  ) {
    const refreshed = await provider.refreshToken(account.accessToken);
    if (!refreshed) {
      return res.status(401).json({ error: 'Token expired, reconnect required' });
    }
    await db
      .update(schema.connectedAccounts)
      .set({
        accessToken: refreshed.accessToken,
        tokenExpiresAt: new Date(Date.now() + refreshed.expiresIn * 1000),
      })
      .where(eq(schema.connectedAccounts.id, account.id));
    account.accessToken = refreshed.accessToken;
  }

  const result = await provider.createMedia(
    account.accessToken,
    account.providerUserId,
    blobUrl,
    caption ?? '',
  );

  res.json({ containerId: result.containerId });
}
