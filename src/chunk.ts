import type { CaptionChunk, DialogueLine } from "./types.js";

const MAX_WORDS = 50;
const MAX_CHARS = 200;

export function chunkDialogue(dialogue: DialogueLine[]): CaptionChunk[] {
  const chunks: CaptionChunk[] = [];

  for (const line of dialogue) {
    for (const text of splitText(line.text)) {
      chunks.push({
        index: chunks.length + 1,
        speaker: line.speaker,
        text,
      });
    }
  }

  return chunks;
}

export function splitText(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return [];
  }

  const chunks: string[] = [];
  let current: string[] = [];

  for (const word of normalized.split(" ").filter(Boolean)) {
    const next = [...current, word];
    const nextText = next.join(" ");

    if (current.length > 0 && (next.length > MAX_WORDS || nextText.length > MAX_CHARS)) {
      chunks.push(current.join(" "));
      current = [word];
      continue;
    }

    current = next;
  }

  if (current.length > 0) {
    chunks.push(current.join(" "));
  }

  return mergeShortTrailingChunk(chunks);
}

function mergeShortTrailingChunk(chunks: string[]): string[] {
  if (chunks.length < 2) {
    return chunks;
  }

  const last = chunks[chunks.length - 1];
  const previous = chunks[chunks.length - 2];
  if (!last || !previous || last.split(" ").length > 2) {
    return chunks;
  }

  return [...chunks.slice(0, -2), `${previous} ${last}`];
}
