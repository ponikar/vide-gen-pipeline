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

function wrapCaptionText(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= 34) {
    return normalized;
  }

  const words = normalized.split(" ");
  let bestBreak = 1;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let index = 1; index < words.length; index += 1) {
    const firstLine = words.slice(0, index).join(" ");
    const secondLine = words.slice(index).join(" ");
    if (firstLine.length > 34 || secondLine.length > 34) {
      continue;
    }

    const balancePenalty = Math.abs(firstLine.length - secondLine.length);
    const overflowPenalty = Math.max(firstLine.length, secondLine.length);
    const score = balancePenalty + overflowPenalty * 0.1;
    if (score < bestScore) {
      bestScore = score;
      bestBreak = index;
    }
  }

  if (!Number.isFinite(bestScore)) {
    return normalized;
  }

  return `${words.slice(0, bestBreak).join(" ")}\n${words.slice(bestBreak).join(" ")}`;
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}
