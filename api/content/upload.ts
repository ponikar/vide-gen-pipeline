import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import busboy from 'busboy';
import { getProvider } from '../../src/social/registry.js';
import { db, schema } from '../../src/db/index.js';
import { eq } from 'drizzle-orm';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const BUCKET = 'videos';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { fields, file } = await parseMultipart(req);

    const providerName = fields.provider;
    const caption = fields.caption ?? '';
    const videoBuffer = file.buffer;
    const ext = file.filename?.split('.').pop() ?? 'mp4';

    if (!providerName) return res.status(400).json({ error: 'Missing provider' });
    if (!videoBuffer || videoBuffer.length === 0) return res.status(400).json({ error: 'Missing video' });

    const filename = `${Date.now()}.${ext}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(filename, { upsert: true });

    if (uploadError) return res.status(500).json({ error: uploadError.message });

    const uploadRes = await fetch(uploadData.signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'video/mp4' },
      body: videoBuffer,
    });

    if (!uploadRes.ok) return res.status(500).json({ error: 'Upload to storage failed' });

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(filename);

    const provider = getProvider(providerName);
    const accounts = await db
      .select()
      .from(schema.connectedAccounts)
      .where(eq(schema.connectedAccounts.provider, providerName))
      .limit(1);

    if (accounts.length === 0) return res.status(401).json({ error: 'Account not connected' });

    const account = accounts[0];

    if (account.tokenExpiresAt) {
      const daysUntilExpiry = (account.tokenExpiresAt.getTime() - Date.now()) / 86_400_000;
      if (daysUntilExpiry < 7) {
        const refreshed = await provider.refreshToken(account.accessToken);
        if (!refreshed) return res.status(401).json({ error: 'Token expired, reconnect required' });
        await db
          .update(schema.connectedAccounts)
          .set({
            accessToken: refreshed.accessToken,
            tokenExpiresAt: new Date(Date.now() + refreshed.expiresIn * 1000),
          })
          .where(eq(schema.connectedAccounts.id, account.id));
        account.accessToken = refreshed.accessToken;
      }
    }

    const result = await provider.createMedia(account.accessToken, account.providerUserId, publicUrl, caption);

    res.json({ containerId: result.containerId, publicUrl });
  } catch (err) {
    const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    res.status(500).json({ error: message });
  }
}

function parseMultipart(
  req: VercelRequest,
): Promise<{ fields: Record<string, string>; file: { buffer: Buffer; filename: string } }> {
  return new Promise((resolve, reject) => {
    const fields: Record<string, string> = {};
    let file: { buffer: Buffer; filename: string } | null = null;

    const bb = busboy({ headers: req.headers as Record<string, string> });

    bb.on('field', (name, value) => {
      fields[name] = value;
    });

    bb.on('file', (fieldname, stream, info) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => {
        file = { buffer: Buffer.concat(chunks), filename: info.filename };
      });
    });

    bb.on('finish', () => {
      if (!file) return reject(new Error('No file received'));
      resolve({ fields, file });
    });

    bb.on('error', reject);

    req.pipe(bb);
  });
}
