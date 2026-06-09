import { loadEnv, saveEnv } from './instagram/env.js';
import { InstagramClient } from './instagram/client.js';
import { refreshToken } from './instagram/auth.js';
import { postReel } from './instagram/post.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: npm run instagram:post -- <video_url> [caption...]');
    process.exit(1);
  }

  const [videoUrl, ...captionParts] = args;
  const caption = captionParts.join(' ') || '';

  const env = loadEnv();
  const accessToken = env.INSTAGRAM_ACCESS_TOKEN;
  const accountId = env.INSTAGRAM_ACCOUNT_ID;
  const tokenExpiresAt = env.INSTAGRAM_TOKEN_EXPIRES_AT;

  if (!accessToken || !accountId) {
    console.error('Instagram not configured. Run "npm run instagram:setup" first.');
    process.exit(1);
  }

  let token = accessToken;

  if (tokenExpiresAt) {
    const expiresAt = new Date(tokenExpiresAt);
    const daysUntilExpiry = (expiresAt.getTime() - Date.now()) / 86_400_000;
    if (daysUntilExpiry < 7) {
      console.log('Token expiring soon, refreshing...');
      const refreshed = await refreshToken(token);
      if (refreshed) {
        token = refreshed.accessToken;
        saveEnv({
          INSTAGRAM_ACCESS_TOKEN: refreshed.accessToken,
          INSTAGRAM_TOKEN_EXPIRES_AT: new Date(
            Date.now() + refreshed.expiresIn * 1000,
          ).toISOString(),
        });
      } else {
        console.error('Token refresh failed. Run "npm run instagram:setup" to reconnect.');
        process.exit(1);
      }
    }
  }

  const client = new InstagramClient(token);

  console.log('Posting reel...');
  const result = await postReel(client, accountId, videoUrl, caption);
  console.log(`\nPosted! ${result.permalink}`);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(message);
  process.exit(1);
});
