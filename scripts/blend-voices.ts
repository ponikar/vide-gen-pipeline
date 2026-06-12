import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

const KOKORO_VOICES_DIR = path.resolve(
  path.dirname(require.resolve("kokoro-js")),
  "..",
  "voices",
);

const PROJECT_VOICES_DIR = path.resolve(import.meta.dirname, "..", "voices");

type Entry = { voice: string; weight: number };

function parseArgs(): { entries: Entry[]; output: string } {
  const args = process.argv.slice(2);
  let output = "";
  const entries: Entry[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--output") {
      output = args[++i];
    } else if (arg === "--voice" || arg === "-v") {
      const name = args[++i];
      const weight = parseFloat(args[++i]);
      entries.push({ voice: name, weight });
    } else if (arg === "--list" || arg === "-l") {
      listVoices();
      process.exit(0);
    } else if (!arg.startsWith("--")) {
      const colon = arg.lastIndexOf(":");
      if (colon > 0) {
        entries.push({
          voice: arg.slice(0, colon),
          weight: parseFloat(arg.slice(colon + 1)),
        });
      } else {
        console.error(`Invalid format "${arg}". Use voice:weight (e.g. am_puck:0.6)`);
        process.exit(1);
      }
    }
  }

  if (entries.length < 2) {
    console.error("Usage: npx tsx scripts/blend-voices.ts voice1:w1 voice2:w2 ... --output <name>");
    console.error("  or:  npx tsx scripts/blend-voices.ts --voice am_puck 0.6 --voice am_michael 0.4 --output am_peter");
    console.error("  or:  npx tsx scripts/blend-voices.ts --list");
    process.exit(1);
  }

  if (!output) {
    console.error("Missing --output <name>");
    process.exit(1);
  }

  const totalWeight = entries.reduce((s, e) => s + e.weight, 0);
  if (totalWeight !== 0 && Math.abs(totalWeight - 1) > 0.001) {
    for (const e of entries) e.weight /= totalWeight;
  }

  return { entries, output };
}

function listVoices(): void {
  const { readdirSync } = require("node:fs");
  const files = readdirSync(KOKORO_VOICES_DIR).filter((f: string) => f.endsWith(".bin"));
  console.log("Available voices:\n");
  for (const f of files) {
    const name = f.replace(/\.bin$/, "");
    const prefix = name[0];
    const lang =
      prefix === "a" ? "US" :
      prefix === "b" ? "UK" :
      prefix === "e" ? "ES" :
      prefix === "f" ? "FR" :
      prefix === "h" ? "HI" :
      prefix === "i" ? "IT" :
      prefix === "j" ? "JP" :
      prefix === "z" ? "CN" :
      prefix === "p" ? "BR" :
      prefix === "m" ? "ML" : "??";
    console.log(`  ${name.padEnd(16)} ${lang}`);
  }
}

async function main(): Promise<void> {
  const { entries, output } = parseArgs();

  let sum: Float32Array | null = null;

  for (const entry of entries) {
    const filePath = path.join(KOKORO_VOICES_DIR, `${entry.voice}.bin`);
    const buf = await readFile(filePath);
    const arr = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);

    if (sum === null) {
      sum = new Float32Array(arr.length);
    }

    if (sum.length !== arr.length) {
      console.error(`Voice "${entry.voice}" has unexpected size (${arr.length} floats, expected ${sum.length})`);
      process.exit(1);
    }

    for (let i = 0; i < sum.length; i++) {
      sum[i] += arr[i] * entry.weight;
    }
  }

  if (!sum) {
    console.error("No voices loaded");
    process.exit(1);
  }

  await mkdir(PROJECT_VOICES_DIR, { recursive: true });

  const projectPath = path.join(PROJECT_VOICES_DIR, `${output}.bin`);
  await writeFile(projectPath, Buffer.from(sum.buffer));
  console.log(`Wrote ${projectPath}`);

  const kokoroPath = path.join(KOKORO_VOICES_DIR, `${output}.bin`);
  await writeFile(kokoroPath, Buffer.from(sum.buffer));
  console.log(`Wrote ${kokoroPath}`);

  const parts = entries.map((e) => `${e.voice}(${(e.weight * 100).toFixed(0)}%)`);
  console.log(`\nCreated blended voice "${output}" from ${parts.join(" + ")}`);
  console.log(`Use it in your config: "voices": { "A": "${output}" }`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(message);
  process.exit(1);
});
