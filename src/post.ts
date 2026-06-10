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
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: npm run post -- <provider> <video_file> [caption...]');
    console.error('       npm run post -- instagram out/video.mp4 "My caption"');
    process.exit(1);
  }

  const [provider, videoPath, ...captionParts] = args;
  const caption = captionParts.join(' ') || '';

  console.log('Uploading video...');
  const videoBuffer = readFileSync(resolve(videoPath));

  const { uploadUrl, publicUrl } = await fetch(`${BASE_URL}/api/content/upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pathname: `${Date.now()}-${videoPath.split('/').pop()}` }),
  }).then((r) => {
    if (!r.ok) throw new Error(`Failed to get upload URL: ${r.status}`);
    return r.json() as Promise<{ uploadUrl: string; publicUrl: string }>;
  });

  await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'video/mp4' },
    body: videoBuffer,
  });
  console.log('Uploaded. Creating media container...');

  const result = await fetch(`${BASE_URL}/api/content/post`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, blobUrl: publicUrl, caption }),
  }).then((r) => {
    if (!r.ok) throw new Error(`Failed to post: ${r.status}`);
    return r.json() as Promise<Record<string, unknown>>;
  });

  if (result.error) {
    throw new Error(String(result.error));
  }

  if (result.permalink) {
    console.log(`\nPosted! ${result.permalink}`);
  } else {
    console.log(`\nContainer created: ${result.containerId}`);
    console.log('Processing...');
    const containerId = String(result.containerId);

    const POLL_RETRIES = 30;
    for (let attempt = 0; attempt < POLL_RETRIES; attempt++) {
      await sleep(5000);
      const status = await fetch(
        `${BASE_URL}/api/content/post/${containerId}/status?provider=${provider}`,
      ).then((r) => r.json() as Promise<{ status: string; errorMessage?: string }>);

      if (status.status === 'FINISHED') break;
      if (status.status === 'ERROR') throw new Error(status.errorMessage ?? 'Processing failed');
      if (status.status === 'EXPIRED') throw new Error('Container expired');
    }

    const published = await fetch(
      `${BASE_URL}/api/content/post/${containerId}/publish?provider=${provider}`,
      { method: 'POST' },
    ).then((r) => {
      if (!r.ok) throw new Error(`Failed to publish: ${r.status}`);
      return r.json() as Promise<{ permalink: string }>;
    });

    console.log(`\nPosted! ${published.permalink}`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
