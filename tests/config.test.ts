import { describe, expect, it } from "vitest";
import { normalizeConfig, parseCliArgs, resolveVoice } from "../src/config.js";

describe("parseCliArgs", () => {
  it("parses input and flags", () => {
    expect(parseCliArgs(["input.json", "--out", "out.mp4", "--keep-temp"])).toEqual({
      inputPath: "input.json",
      outputOverride: "out.mp4",
      keepTemp: true,
    });
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
