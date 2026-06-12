import { describe, expect, it } from "vitest";
import { chunkDialogue, splitText } from "../src/chunk.js";

describe("splitText", () => {
  it("keeps short text intact", () => {
    expect(splitText("This is short.")).toEqual(["This is short."]);
  });

  it("keeps text intact within generous limits", () => {
    const chunks = splitText("This sentence is much too long for one short-form caption and should be split clearly.");
    expect(chunks.length).toBe(1);
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
