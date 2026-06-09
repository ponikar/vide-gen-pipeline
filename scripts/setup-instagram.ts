import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { loadEnv, saveEnv } from '../src/instagram/env.js';
import { getAuthUrl, exchangeCode, getLongLivedToken, getProfile } from '../src/instagram/auth.js';

const PORT = 3456;
const REDIRECT_URI = `http://localhost:${PORT}/auth/instagram/callback`;

async function main(): Promise<void> {
  const env = loadEnv();

  if (!env.INSTAGRAM_APP_ID || !env.INSTAGRAM_APP_SECRET) {
    console.error('Missing INSTAGRAM_APP_ID or INSTAGRAM_APP_SECRET in .env');
    console.error('');
    console.error('1. Create an Instagram App at https://developers.facebook.com/');
    console.error('   (Create App → Business → Add Instagram Platform)');
    console.error('2. Add these to .env:');
    console.error('   INSTAGRAM_APP_ID=your_instagram_app_id');
    console.error('   INSTAGRAM_APP_SECRET=your_instagram_app_secret');
    process.exit(1);
  }

  if (env.INSTAGRAM_ACCESS_TOKEN && env.INSTAGRAM_ACCOUNT_ID) {
    const expiresAt = env.INSTAGRAM_TOKEN_EXPIRES_AT
      ? new Date(env.INSTAGRAM_TOKEN_EXPIRES_AT)
      : null;
    if (expiresAt && expiresAt.getTime() > Date.now()) {
      const daysLeft = Math.floor((expiresAt.getTime() - Date.now()) / 86_400_000);
      console.log(`Already connected (token expires in ${daysLeft} days).`);
      console.log('To re-authorize, delete INSTAGRAM_ACCESS_TOKEN from .env and run this again.');
      console.log('Or just start posting: npm run instagram:post -- <video_url> "caption"');
      process.exit(0);
    }
  }

  const state = randomBytes(16).toString('hex');
  const authUrl = getAuthUrl({
    appId: env.INSTAGRAM_APP_ID,
    redirectUri: REDIRECT_URI,
    state,
  });

  let resolved = false;

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);

    if (url.pathname === '/auth/instagram/callback') {
      const code = url.searchParams.get('code');
      const returnedState = url.searchParams.get('state');

      if (!code) {
        const error = url.searchParams.get('error') ?? 'unknown';
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(
          `<html><body><h1>Authorization failed</h1><p>${error}</p><p>Close this window and try again.</p></body></html>`,
        );
        return;
      }

      if (returnedState !== state) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(
          '<html><body><h1>State mismatch</h1><p>Security check failed. Close and retry.</p></body></html>',
        );
        return;
      }

      resolved = true;
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><body><h1>Authorization received!</h1><p>You can close this window.</p></body></html>');
      handleCode(code);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    }
  });

  server.listen(PORT, () => {
    console.log('\nOpening browser for Instagram authorization...\n');

    const cmd =
      process.platform === 'darwin'
        ? 'open'
        : process.platform === 'win32'
          ? 'start'
          : 'xdg-open';
    spawn(cmd, [authUrl], { stdio: 'ignore' });

    console.log(`If browser does not open, visit:\n${authUrl}\n`);
    console.log('Waiting for authorization...');
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is in use. Kill the existing process and retry.`);
      process.exit(1);
    }
    throw err;
  });

  async function handleCode(code: string): Promise<void> {
    try {
      console.log('\nExchanging code for access token...');
      const shortToken = await exchangeCode({
        code,
        appId: env.INSTAGRAM_APP_ID!,
        appSecret: env.INSTAGRAM_APP_SECRET!,
        redirectUri: REDIRECT_URI,
      });

      console.log('Exchanging for long-lived token (60 days)...');
      const longToken = await getLongLivedToken({
        accessToken: shortToken.accessToken,
        appSecret: env.INSTAGRAM_APP_SECRET!,
      });

      console.log('Fetching Instagram profile...');
      const profile = await getProfile(longToken.accessToken);

      const expiresAt = new Date(Date.now() + longToken.expiresIn * 1000);

      saveEnv({
        INSTAGRAM_ACCESS_TOKEN: longToken.accessToken,
        INSTAGRAM_ACCOUNT_ID: profile.id,
        INSTAGRAM_TOKEN_EXPIRES_AT: expiresAt.toISOString(),
      });

      console.log(`\nConnected as @${profile.username}`);
      console.log(`  Account type: ${profile.accountType}`);
      console.log(`  Followers: ${profile.followersCount ?? '?'}`);
      console.log(`  Token expires: ${expiresAt.toLocaleDateString()}`);
      console.log('');
      console.log('Ready to post:');
      console.log('  npm run instagram:post -- <video_url> "Your caption"');
      console.log('  npm run instagram:analytics');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Setup failed:', message);
    } finally {
      server.close();
    }
  }

  setTimeout(() => {
    if (!resolved) {
      console.log('\nIf the redirect failed, paste the authorization code from the URL below:');
      console.log('(Look for ?code=... in the browser address bar after authorizing)\n');
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      rl.question('Authorization code: ', (code) => {
        rl.close();
        handleCode(code.trim());
      });
    }
  }, 5000);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('Setup failed:', message);
  process.exit(1);
});
