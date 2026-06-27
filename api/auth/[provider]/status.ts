import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, schema } from '../../../src/db/index.js';
import { eq } from 'drizzle-orm';
import { withVercelLogging } from '../../../src/vercel-logging.js';

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const provider = req.query.provider as string;

  if (!provider) return res.status(400).json({ error: 'Missing provider' });

  const accounts = await db
    .select()
    .from(schema.connectedAccounts)
    .where(eq(schema.connectedAccounts.provider, provider))
    .limit(1);

  if (accounts.length === 0) {
    return res.json({ connected: false });
  }

  const account = accounts[0];
  const expired =
    account.tokenExpiresAt && account.tokenExpiresAt.getTime() < Date.now();

  res.json({
    connected: !expired,
    username: account.username,
    providerUserId: account.providerUserId,
    expiresAt: account.tokenExpiresAt?.toISOString(),
  });
}

export default withVercelLogging('api.auth.status', handler);
