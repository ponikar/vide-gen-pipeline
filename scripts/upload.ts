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
  if (args.length < 1) {
    console.error('Usage: npm run upload -- <video_file>');
    console.error('       npm run upload -- out/reel.mp4');
    console.error('Prints the public URL to stdout for use with POST /api/content/create');
    process.exit(1);
  }

  const videoPath = args[0];
  const videoBuffer = readFileSync(resolve(videoPath));

  const { uploadUrl, publicUrl } = await fetch(`${BASE_URL}/api/content/upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pathname: `${Date.now()}-${videoPath.split('/').pop()}`,
    }),
  }).then((r) => {
    if (!r.ok) throw new Error(`Failed to get upload URL: ${r.status}`);
    return r.json() as Promise<{ uploadUrl: string; publicUrl: string }>;
  });

  await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'video/mp4' },
    body: videoBuffer,
  });

  console.log(publicUrl);
}

main().catch((err) => {
  console.error('Upload failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
