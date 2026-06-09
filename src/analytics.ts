import { loadEnv, saveEnv } from './instagram/env.js';
import { InstagramClient } from './instagram/client.js';
import { refreshToken } from './instagram/auth.js';
import { getRecentMedia, getMediaInsights, getAccountInsights } from './instagram/analytics.js';

async function main(): Promise<void> {
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

  const accountInsights = await getAccountInsights(client, accountId);
  if (accountInsights.length > 0) {
    console.log('Last 7 days:\n');
    for (const insight of accountInsights) {
      console.log(`  ${insight.metric}: ${insight.value}`);
    }
  }

  const recentMedia = await getRecentMedia(client, accountId, 5);
  if (recentMedia.length === 0) {
    console.log('\nNo recent posts.');
    return;
  }

  console.log('\n---\nRecent posts:\n');
  for (const media of recentMedia) {
    console.log(`  ${media.mediaType} | ${media.permalink}`);
    console.log(`  ${media.timestamp}`);
    if (media.caption) {
      const preview = media.caption.length > 60 ? media.caption.slice(0, 60) + '...' : media.caption;
      console.log(`  "${preview}"`);
    }

    const insights = await getMediaInsights(client, media.id);
    if (insights.length > 0) {
      const parts = insights.map((i) => `${i.metric}: ${i.value}`).join(', ');
      console.log(`  ${parts}`);
    }
    console.log('');
  }
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(message);
  process.exit(1);
});
