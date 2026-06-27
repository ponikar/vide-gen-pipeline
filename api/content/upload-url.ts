import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { withVercelLogging } from '../../src/vercel-logging.js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const BUCKET = 'videos';

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = req.body as Record<string, unknown> | undefined;
  const filename =
    (body?.pathname as string | undefined) ?? `${Date.now()}.mp4`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(filename, { upsert: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(filename);

  res.json({ uploadUrl: data.signedUrl, publicUrl });
}

export default withVercelLogging('api.content.upload_url', handler);
