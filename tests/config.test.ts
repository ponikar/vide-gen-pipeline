import { describe, expect, it } from "vitest";
import { getUsageText, normalizeConfig, parseCliArgs, resolveVoice } from "../src/config.js";

describe("parseCliArgs", () => {
  it("parses input and flags", () => {
    expect(parseCliArgs(["input.json", "--out", "out.mp4", "--speed", "1.25", "--voice", "A=am_michael", "--keep-temp"])).toEqual({
      inputPath: "input.json",
      help: false,
      outputOverride: "out.mp4",
      videoOverride: undefined,
      speedOverride: 1.25,
      voiceOverrides: {
        A: "am_michael",
      },
      keepTemp: true,
    });
  });

  it("parses help without requiring an input path", () => {
    expect(parseCliArgs(["--help"])).toEqual({
      inputPath: undefined,
      help: true,
      outputOverride: undefined,
      videoOverride: undefined,
      speedOverride: undefined,
      voiceOverrides: {},
      keepTemp: false,
    });
  });

  it("rejects invalid speed flag", () => {
    expect(() => parseCliArgs(["input.json", "--speed", "fast"])).toThrow("--speed must be a number");
  });

  it("rejects malformed voice flag", () => {
    expect(() => parseCliArgs(["input.json", "--voice", "am_michael"])).toThrow("speaker=voice");
  });

  it("prints usage text", () => {
    expect(getUsageText()).toContain("--speed <number>");
  });
});

describe("normalizeConfig", () => {
  it("applies defaults", () => {
    const config = normalizeConfig(
      {
        video: "./video.mp4",
        dialogue: [{ text: "Hello." }],
      },
      "/tmp/input.json",
    );

    expect(config.dialogue[0]?.speaker).toBe("A");
    expect(config.ttsSpeed).toBe(1);
    expect(config.voices.A).toBe("af_heart");
    expect(config.voices.B).toBe("am_adam");
  });

  it("uses configured TTS speed", () => {
    const config = normalizeConfig(
      {
        video: "./video.mp4",
        ttsSpeed: 1.25,
        dialogue: [{ text: "Hello." }],
      },
      "/tmp/input.json",
    );

    expect(config.ttsSpeed).toBe(1.25);
  });

  it("applies CLI overrides", () => {
    const config = normalizeConfig(
      {
        video: "./video.mp4",
        ttsSpeed: 1,
        voices: { A: "af_heart" },
        dialogue: [{ text: "Hello." }],
      },
      "/tmp/input.json",
      {
        outputOverride: "./custom.mp4",
        videoOverride: "./override.mp4",
        speedOverride: 1.25,
        voiceOverrides: { A: "am_michael" },
      },
    );

    expect(config.output).toBe("/tmp/custom.mp4");
    expect(config.video).toBe("/tmp/override.mp4");
    expect(config.ttsSpeed).toBe(1.25);
    expect(config.voices.A).toBe("am_michael");
  });
});

describe("resolveVoice", () => {
  it("uses speaker voice first", () => {
    expect(resolveVoice({ A: "voice-a", default: "voice-default" }, "A")).toBe("voice-a");
  });

  it("falls back to default voice", () => {
    expect(resolveVoice({ default: "voice-default" }, "B")).toBe("voice-default");
  });

  it("falls back to af_heart", () => {
    expect(resolveVoice({}, "B")).toBe("af_heart");
  });
});
