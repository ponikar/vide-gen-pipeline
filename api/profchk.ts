import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, schema } from '../src/db/index.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const accounts = await db
    .select()
    .from(schema.connectedAccounts)
    .where(eq(schema.connectedAccounts.provider, 'instagram'))
    .limit(1);

  if (accounts.length === 0) return res.json({ error: 'no account' });

  const token = accounts[0].accessToken;

  const profileRes = await fetch(
    `https://graph.instagram.com/v22.0/me?fields=id,username,account_type&access_token=${token}`,
  );
  const profile = await profileRes.json();
  res.json({ profile, expiresAt: accounts[0].tokenExpiresAt });
}
