import type { VercelRequest, VercelResponse } from '@vercel/node';
import { issueSignedToken, presignUrl } from '@vercel/blob';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = req.body as Record<string, unknown> | undefined;
  const pathname = (body?.pathname as string | undefined) ?? `videos/${Date.now()}.mp4`;

  const token = await issueSignedToken({
    pathname,
    operations: ['put'],
  });

  const { presignedUrl } = await presignUrl(token, {
    operation: 'put',
    pathname,
    access: 'public',
  });

  res.json({ uploadUrl: presignedUrl });
}
