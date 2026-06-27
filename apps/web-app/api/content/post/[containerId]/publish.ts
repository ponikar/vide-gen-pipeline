import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getProvider } from '../../../../../../src/social/registry.js';
import { db, schema } from '../../../../../../src/db/index.js';
import { eq } from 'drizzle-orm';
import { withVercelLogging } from '../../../../../../src/vercel-logging.js';

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { provider: providerName, containerId } = req.query;

  if (!providerName || typeof providerName !== 'string') {
    return res.status(400).json({ error: 'Missing provider' });
  }
  if (!containerId || typeof containerId !== 'string') {
    return res.status(400).json({ error: 'Missing containerId' });
  }

  const provider = getProvider(providerName);

  const accounts = await db
    .select()
    .from(schema.connectedAccounts)
    .where(eq(schema.connectedAccounts.provider, providerName))
    .limit(1);

  if (accounts.length === 0) {
    return res.status(401).json({ error: 'Account not connected' });
  }

  const result = await provider.publishMedia(
    accounts[0].accessToken,
    accounts[0].providerUserId,
    containerId,
  );

  res.json(result);
}

export default withVercelLogging('api.content.post.publish', handler);
