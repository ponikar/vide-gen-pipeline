import { spawn } from 'node:child_process';

const BASE_URL = process.env.VERCEL_API_URL ?? 'http://localhost:3000';

async function main(): Promise<void> {
  const provider = process.argv[2] ?? 'instagram';

  console.log(`Connecting ${provider} account...\n`);

  // 1. Create upload URL
  const { url } = await fetch(`${BASE_URL}/api/auth/${provider}/url`).then(
    (r) => {
      if (!r.ok) throw new Error(`Failed to get auth URL: ${r.status}`);
      return r.json() as Promise<{ url: string }>;
    },
  );

  // 2. Open browser
  const cmd =
    process.platform === 'darwin'
      ? 'open'
      : process.platform === 'win32'
        ? 'start'
        : 'xdg-open';
  spawn(cmd, [url], { stdio: 'ignore' });

  console.log('Opened browser for authorization.\n');
  console.log('Waiting for you to authorize...');

  // 3. Poll for connection
  while (true) {
    await sleep(2000);
    const status = await fetch(
      `${BASE_URL}/api/auth/${provider}/status`,
    ).then((r) => r.json() as Promise<Record<string, unknown>>);

    if (status.connected) {
      console.log(`\nConnected as @${status.username}`);
      console.log('\nReady to post:');
      console.log(`  npm run post -- ${provider} <video_file> "caption"`);
      console.log('  npm run analytics');
      return;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error('Connect failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
