import { describe, expect, it } from "vitest";
import { buildTimedCaptions, formatSrtTime, getCaptionLines, toSrt } from "../src/subtitles.js";
import type { GeneratedSegment } from "../src/types.js";

describe("formatSrtTime", () => {
  it("formats seconds as SRT timestamps", () => {
    expect(formatSrtTime(62.345)).toBe("00:01:02,345");
  });
});

describe("buildTimedCaptions", () => {
  it("builds cumulative non-overlapping timings", () => {
    const segments: GeneratedSegment[] = [
      { index: 1, speaker: "A", text: "One", audioPath: "one.wav", durationSeconds: 1.2 },
      { index: 2, speaker: "B", text: "Two", audioPath: "two.wav", durationSeconds: 2.3 },
    ];

    const captions = buildTimedCaptions(segments);

    expect(captions[0]?.startSeconds).toBe(0);
    expect(captions[0]?.endSeconds).toBe(1.2);
    expect(captions[1]?.startSeconds).toBe(1.2);
    expect(captions[1]?.endSeconds).toBe(3.5);
  });

  it("offsets word timings to absolute subtitle time", () => {
    const segments: GeneratedSegment[] = [
      { index: 1, speaker: "A", text: "Before", audioPath: "one.wav", durationSeconds: 1 },
      {
        index: 2,
        speaker: "A",
        text: "Hello world.",
        audioPath: "two.wav",
        durationSeconds: 2,
        wordTimings: [
          { word: "Hello", startSeconds: 0.2, endSeconds: 0.7 },
          { word: "world", startSeconds: 0.8, endSeconds: 1.4 },
        ],
      },
    ];

    const captions = buildTimedCaptions(segments);

    expect(captions[1]?.words).toEqual([
      { index: 0, word: "Hello", displayText: "Hello", startSeconds: 1.2, endSeconds: 1.7 },
      { index: 1, word: "world", displayText: "world.", startSeconds: 1.8, endSeconds: 2.4 },
    ]);
  });
});

describe("toSrt", () => {
  it("serializes captions for temporary burn-in", () => {
    const srt = toSrt([
      {
        index: 1,
        speaker: "A",
        text: "Hello world",
        startSeconds: 0,
        endSeconds: 1,
      },
    ]);

    expect(srt).toContain("1\n00:00:00,000 --> 00:00:01,000\nHello world");
  });
});

describe("getCaptionLines", () => {
  it("wraps long subtitle text to at most two lines", () => {
    const lines = getCaptionLines("I thought the algorithm was broken.");

    expect(lines.length).toBeLessThanOrEqual(2);
    expect(lines.join(" ")).toBe("I thought the algorithm was broken.");
  });
});
