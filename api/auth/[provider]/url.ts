import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { getProvider } from '../../../src/social/registry.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const provider = getProvider(req.query.provider as string);
  const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';
  const redirectUri = `${baseUrl}/api/auth/${provider.name}/callback`;

  const url = provider.getAuthUrl({
    appId: process.env.INSTAGRAM_APP_ID!,
    redirectUri,
    state: randomUUID(),
  });

  res.json({ url });
}
