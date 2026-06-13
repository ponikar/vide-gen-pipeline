import { describe, expect, it } from "vitest";
import { chunkDialogue } from "../src/chunk.js";

describe("chunkDialogue", () => {
  it("creates one chunk per dialogue line", () => {
    const chunks = chunkDialogue([
      { speaker: "A", text: "First line." },
      { speaker: "B", text: "Second line." },
    ]);

    expect(chunks).toHaveLength(2);
    expect(chunks.map((c) => c.speaker)).toEqual(["A", "B"]);
    expect(chunks.map((c) => c.text)).toEqual(["First line.", "Second line."]);
  });

  it("preserves full text without splitting", () => {
    const chunks = chunkDialogue([
      { speaker: "A", text: "This sentence is much too long for one short-form caption and should be kept intact." },
    ]);

    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toBe("This sentence is much too long for one short-form caption and should be kept intact.");
  });
});
