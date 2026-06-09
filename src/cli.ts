import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chunkDialogue } from "./chunk.js";
import { getUsageText, loadInputConfig, parseCliArgs } from "./config.js";
import { assertBinary, probeVideo } from "./process.js";
import { renderVideo } from "./render.js";
import { generateSpeechSegments } from "./tts.js";
import { resolveVideoSource } from "./video.js";

async function main(): Promise<void> {
  const args = parseCliArgs(process.argv.slice(2));
  if (args.help) {
    console.log(getUsageText());
    return;
  }

  const config = await loadInputConfig(args);
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "gold-fish-"));

  try {
    await assertBinary("ffmpeg");
    await assertBinary("ffprobe");

    const sourceVideoPath = await resolveVideoSource(config.video, tempDir);
    await probeVideo(sourceVideoPath);

    const chunks = chunkDialogue(config.dialogue);
    if (chunks.length === 0) {
      throw new Error("Dialogue produced no speakable chunks.");
    }

    const segments = await generateSpeechSegments(chunks, config.voices, config.ttsSpeed, tempDir);
    await renderVideo({
      sourceVideoPath,
      segments,
      outputPath: config.output,
      tempDir,
    });

    console.log(`Generated ${config.output}`);
  } finally {
    if (!args.keepTemp) {
      await rm(tempDir, { recursive: true, force: true });
    } else {
      console.log(`Kept temp files in ${tempDir}`);
    }
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
