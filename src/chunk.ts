import type { CaptionChunk, DialogueLine } from "./types.js";

export function chunkDialogue(dialogue: DialogueLine[]): CaptionChunk[] {
	return dialogue.map((line, index) => ({
		index: index + 1,
		speaker: line.speaker,
		text: line.text.replace(/\s+/g, " ").trim(),
	}));
}
