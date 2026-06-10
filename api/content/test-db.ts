import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, schema } from '../../src/db/index.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const accounts = await db
      .select()
      .from(schema.connectedAccounts)
      .where(eq(schema.connectedAccounts.provider, 'instagram'))
      .limit(1);
    res.json({ ok: true, count: accounts.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
}
