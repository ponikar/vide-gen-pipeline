import type { GeneratedSegment, TimedCaption } from "./types.js";

export function buildTimedCaptions(segments: GeneratedSegment[]): TimedCaption[] {
  let cursor = 0;

  return segments.map((segment) => {
    const startSeconds = cursor;
    const endSeconds = cursor + segment.durationSeconds;
    cursor = endSeconds;

    return {
      index: segment.index,
      speaker: segment.speaker,
      text: segment.text,
      startSeconds,
      endSeconds,
    };
  });
}

export function toSrt(captions: TimedCaption[]): string {
  return captions
    .map((caption, index) => {
      const text = wrapCaptionText(caption.text);
      return `${index + 1}\n${formatSrtTime(caption.startSeconds)} --> ${formatSrtTime(caption.endSeconds)}\n${text}`;
    })
    .join("\n\n")
    .concat("\n");
}

export function getCaptionLines(text: string): string[] {
  return wrapCaptionText(text).split("\n");
}

export function formatSrtTime(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const totalMilliseconds = Math.round(clamped * 1000);
  const milliseconds = totalMilliseconds % 1000;
  const totalSeconds = Math.floor(totalMilliseconds / 1000);
  const wholeSeconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  return `${pad(hours)}:${pad(minutes)}:${pad(wholeSeconds)},${milliseconds.toString().padStart(3, "0")}`;
}

const MAX_LINE_LEN = 40;

function wrapCaptionText(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= MAX_LINE_LEN) {
    return normalized;
  }

  const words = normalized.split(" ");
  const lines: string[] = [];
  let current: string[] = [];

  for (const word of words) {
    const next = [...current, word];
    const nextText = next.join(" ");
    if (nextText.length > MAX_LINE_LEN && current.length > 0) {
      lines.push(current.join(" "));
      current = [word];
    } else {
      current = next;
    }
  }

  if (current.length > 0) {
    lines.push(current.join(" "));
  }

  return lines.join("\n");
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}
