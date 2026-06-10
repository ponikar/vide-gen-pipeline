import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

const BASE_URL = process.env.VERCEL_API_URL ?? 'http://localhost:3000';

async function main(): Promise<void> {
  const provider = process.argv[2] ?? 'instagram';

  const data = await fetch(
    `${BASE_URL}/api/content/analytics?provider=${provider}`,
  ).then((r) => {
    if (!r.ok) throw new Error(`Failed: ${r.status}`);
    return r.json() as Promise<{
      username: string;
      insights: Array<{ metric: string; value: number }>;
      recentMedia: Array<{
        id: string;
        permalink: string;
        mediaType: string;
        timestamp: string;
        caption?: string;
      }>;
    }>;
  });

  if (data.insights.length > 0) {
    console.log(`@${data.username} — Last 7 days:\n`);
    for (const insight of data.insights) {
      console.log(`  ${insight.metric}: ${insight.value}`);
    }
  }

  if (data.recentMedia.length === 0) {
    console.log('\nNo recent posts.');
    return;
  }

  console.log('\n---\nRecent posts:\n');
  for (const media of data.recentMedia) {
    console.log(`  ${media.mediaType} | ${media.permalink}`);
    console.log(`  ${media.timestamp}`);
    if (media.caption) {
      const preview =
        media.caption.length > 60
          ? media.caption.slice(0, 60) + '...'
          : media.caption;
      console.log(`  "${preview}"`);
    }
    console.log('');
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
