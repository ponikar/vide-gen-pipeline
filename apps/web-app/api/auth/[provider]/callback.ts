import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getProvider } from '../../../../../src/social/registry.js';
import { db, schema } from '../../../../../src/db/index.js';
import { eq } from 'drizzle-orm';
import { withVercelLogging } from '../../../../../src/vercel-logging.js';

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const { code, error } = req.query;

  if (error) {
    return res.status(400).send(
      htmlPage('Authorization Failed', `<p>Instagram returned: ${error}</p>`),
    );
  }

  if (!code || typeof code !== 'string') {
    return res.status(400).send(htmlPage('Missing Code', '<p>No authorization code received.</p>'));
  }

  try {
    const provider = getProvider(req.query.provider as string);
    const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/auth/${provider.name}/callback`;

    const result = await provider.exchangeCode({
      code,
      appId: process.env.INSTAGRAM_APP_ID!,
      appSecret: process.env.INSTAGRAM_APP_SECRET!,
      redirectUri,
    });

    const expiresAt = new Date(
      Date.now() + result.expiresIn * 1000,
    ).toISOString();

    const existing = await db
      .select()
      .from(schema.connectedAccounts)
      .where(
        eq(schema.connectedAccounts.providerUserId, result.providerUserId),
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(schema.connectedAccounts)
        .set({
          accessToken: result.accessToken,
          tokenExpiresAt: new Date(expiresAt),
          username: result.username,
          updatedAt: new Date(),
        })
        .where(
          eq(schema.connectedAccounts.providerUserId, result.providerUserId),
        );
    } else {
      // Remove stale connections for this provider before inserting the new one
      await db
        .delete(schema.connectedAccounts)
        .where(eq(schema.connectedAccounts.provider, provider.name));
      await db.insert(schema.connectedAccounts).values({
        provider: provider.name,
        providerUserId: result.providerUserId,
        username: result.username,
        accessToken: result.accessToken,
        tokenExpiresAt: new Date(expiresAt),
      });
    }

    res.send(
      htmlPage(
        'Connected!',
        `<p>Connected as <strong>@${result.username}</strong>.</p>
         <p>You can close this tab and return to the terminal.</p>`,
      ),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).send(htmlPage('Setup Failed', `<p>${message}</p>`));
  }
}

export default withVercelLogging('api.auth.callback', handler);

function htmlPage(title: string, body: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:sans-serif;max-width:500px;margin:40px auto;padding:0 20px;line-height:1.6}</style>
</head><body><h1>${title}</h1>${body}</body></html>`;
}
