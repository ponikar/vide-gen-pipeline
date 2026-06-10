import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, schema } from '../../src/db/index.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await db.delete(schema.connectedAccounts).where(eq(schema.connectedAccounts.provider, 'instagram'));
  res.json({ ok: true });
}
