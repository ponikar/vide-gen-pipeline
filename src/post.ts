import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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

  const { uploadUrl } = await fetch(`${BASE_URL}/api/content/upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pathname: `videos/${Date.now()}-${videoPath.split('/').pop()}`,
    }),
  }).then((r) => {
    if (!r.ok) throw new Error(`Failed to get upload URL: ${r.status}`);
    return r.json() as Promise<{ uploadUrl: string; headers: Record<string, string> }>;
  });

  await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'video/mp4' },
    body: videoBuffer,
  });

  const blobUrl = uploadUrl.split('?')[0];

  console.log('Creating media container...');
  const { containerId } = await fetch(`${BASE_URL}/api/content/post`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, blobUrl, caption }),
  }).then((r) => {
    if (!r.ok) throw new Error(`Failed to create post: ${r.status}`);
    return r.json() as Promise<{ containerId: string }>;
  });

  console.log('Waiting for processing...');

  const POLL_RETRIES = 30;
  const POLL_INTERVAL_MS = 5000;

  for (let attempt = 0; attempt < POLL_RETRIES; attempt++) {
    const status = await fetch(
      `${BASE_URL}/api/content/post/${containerId}/status?provider=${provider}`,
    ).then((r) => r.json() as Promise<{ status: string; errorMessage?: string }>);

    if (status.status === 'FINISHED') break;
    if (status.status === 'ERROR') {
      throw new Error(status.errorMessage ?? 'Processing failed');
    }
    if (status.status === 'EXPIRED') {
      throw new Error('Container expired before publishing');
    }

    await sleep(POLL_INTERVAL_MS);
  }

  console.log('Publishing...');
  const result = await fetch(
    `${BASE_URL}/api/content/post/${containerId}/publish?provider=${provider}`,
    { method: 'POST' },
  ).then((r) => {
    if (!r.ok) throw new Error(`Failed to publish: ${r.status}`);
    return r.json() as Promise<{ id: string; permalink: string }>;
  });

  console.log(`\nPosted! ${result.permalink}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
