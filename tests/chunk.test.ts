import { describe, expect, it } from "vitest";
import { chunkDialogue, splitText } from "../src/chunk.js";

describe("splitText", () => {
  it("keeps short text intact", () => {
    expect(splitText("This is short.")).toEqual(["This is short."]);
  });

  it("splits long text into readable chunks", () => {
    const chunks = splitText("This sentence is much too long for one short-form caption and should be split clearly.");
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.split(" ").length <= 8 || chunk.length <= 42)).toBe(true);
  });
});

describe("chunkDialogue", () => {
  it("preserves speakers while chunking", () => {
    const chunks = chunkDialogue([
      { speaker: "A", text: "First line." },
      { speaker: "B", text: "Second line." },
    ]);

    expect(chunks.map((chunk) => chunk.speaker)).toEqual(["A", "B"]);
  });
});
