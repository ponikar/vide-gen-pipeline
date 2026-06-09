export type SubtitleMode = "line" | "word";

export type DialogueLine = {
  speaker: string;
  text: string;
};

export type InputConfig = {
  video: string;
  output: string;
  subtitleMode: SubtitleMode;
  ttsSpeed: number;
  voices: Record<string, string>;
  dialogue: DialogueLine[];
};

export type CliOptions = {
  inputPath?: string;
  help: boolean;
  outputOverride?: string;
  videoOverride?: string;
  speedOverride?: number;
  subtitleModeOverride?: SubtitleMode;
  voiceOverrides: Record<string, string>;
  keepTemp: boolean;
};

export type CaptionChunk = {
  index: number;
  speaker: string;
  text: string;
};

export type TimedCaption = CaptionChunk & {
  startSeconds: number;
  endSeconds: number;
  words?: TimedWord[];
};

export type GeneratedSegment = CaptionChunk & {
  audioPath: string;
  durationSeconds: number;
  wordTimings?: WordTiming[];
};

export type WordTiming = {
  word: string;
  startSeconds: number;
  endSeconds: number;
};

export type TimedWord = WordTiming & {
  index: number;
  displayText: string;
};

export type VideoMetadata = {
  width: number;
  height: number;
  durationSeconds: number;
};
