import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const VOICES_DIR = path.resolve(import.meta.dirname, "..", "voices");

type Args = {
  name: string;
  url?: string;
  input?: string;
};

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  let name = "";
  let url: string | undefined;
  let input: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--name" || arg === "-n") {
      name = argv[++i];
    } else if (arg === "--url" || arg === "-u") {
      url = argv[++i];
    } else if (arg === "--input" || arg === "-i") {
      input = argv[++i];
    }
  }

  if (!name) {
    console.error(`Usage:
  npm run voice:create -- --name <name> --url <youtube-url>
  npm run voice:create -- --name <name> --input <local-audio-file>

Downloads/references a speaker's audio and saves it as voices/<name>.wav

Options:
  -n, --name    Name for the voice (used as "clone:<name>" in config)
  -u, --url     YouTube URL to download audio from
  -i, --input   Local audio file path

Examples:
  npm run voice:create -- --name peter --url https://youtube.com/watch?v=abc123
  npm run voice:create -- --name peter --input ./recordings/peter.wav
`);
    process.exit(1);
  }

  return { name, url, input };
}

async function main(): Promise<void> {
  const { name, url, input } = parseArgs();
  await mkdir(VOICES_DIR, { recursive: true });

  const outPath = path.join(VOICES_DIR, `${name}.wav`);

  if (url) {
    console.log(`Downloading audio from ${url}...`);
    await downloadYoutubeAudio(url, outPath);
  } else if (input) {
    console.log(`Copying ${input} to ${outPath}...`);
    await spawnAsync("ffmpeg", [
      "-y", "-i", path.resolve(input),
      "-ar", "24000",
      "-ac", "1",
      outPath,
    ]);
  }

  console.log(`Created ${outPath}`);
  console.log(`Use it in config: "voices": { "A": "clone:${name}" }`);
}

async function downloadYoutubeAudio(url: string, outPath: string): Promise<void> {
  await spawnAsync("yt-dlp", [
    "--extract-audio",
    "--audio-format", "wav",
    "--audio-quality", "0",
    "--output", outPath,
    "--max-filesize", "50M",
    url,
  ]);
}

function spawnAsync(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: "inherit" });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
    proc.on("error", reject);
  });
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(message);
  process.exit(1);
});
