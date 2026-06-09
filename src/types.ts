export type DialogueLine = {
  speaker: string;
  text: string;
};

export type InputConfig = {
  video: string;
  output: string;
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
};

export type GeneratedSegment = CaptionChunk & {
  audioPath: string;
  durationSeconds: number;
};

export type VideoMetadata = {
  width: number;
  height: number;
  durationSeconds: number;
};
