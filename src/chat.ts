import { copyFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { ChatConfig, ParticipantStyle, GeneratedSegment } from "./types.js";
import { buildTimedCaptions } from "./subtitles.js";

const FW = 720;
const FH = 1280;

// iMessage dark mode
const PANEL_BG = "#000000";
const SENT = "#0A84FF";
const RCVD = "#262629";
const STATUS = "#8E8E93";
const DIVIDER = "#2A2A2C";
const ACCENT = "#0A84FF";
const AVATAR_BG = "#3A3A3C";
const TXS = "#FFFFFF";
const TXR = "#FFFFFF";
const HEADER_TX = "#FFFFFF";

// Fixed chat panel geometry — NEVER changes for the whole video.
const PANEL_X = 0;
const PANEL_W = FW;
const PANEL_TOP = 380;
const PANEL_BOTTOM = 1240;
const PANEL_R = 28;
const STATUSBAR_H = 44;
const HEADER_H = 92;
// Message area: the only region that scrolls. Below header, above panel bottom.
const MSG_AREA_TOP = PANEL_TOP + STATUSBAR_H + HEADER_H; // 516
const MSG_AREA_BOTTOM = PANEL_BOTTOM - 12; // 1228
const MSG_AREA_H = MSG_AREA_BOTTOM - MSG_AREA_TOP; // 712
const MSG_TOP_PAD = 10;

// Bubble metrics
const R = 17;
const PT = 10;
const PB = 10;
const PL = 16;
const PR = 16;
const TW = 10;
const TH = 8;
const BM = 8;
const GG = 4;
const SG = 4;
const FS = 17;
const LH = 22;
const CW9 = 9;
const MBW = 420;
const LS = 13;
const SS = 11;

// Scroll animation
const FPS = 30;
const ANIM_SECONDS = 0.35;

function esc(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function wrap(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur: string[] = [];
  for (const w of words) {
    const test = [...cur, w].join(" ");
    if (test.length > maxChars && cur.length > 0) {
      lines.push(cur.join(" "));
      cur = [w];
    } else {
      cur = [...cur, w];
    }
  }
  if (cur.length > 0) lines.push(cur.join(" "));
  return lines;
}

type M = { lines: string[]; width: number; height: number };

function measure(text: string): M {
  const maxC = Math.floor(MBW / CW9);
  const lines = wrap(text, maxC);
  const maxLen = Math.max(...lines.map((l) => l.length));
  const width = Math.min(maxLen * CW9 + PL + PR, MBW + PL + PR);
  const height = lines.length * LH + PT + PB;
  return { lines, width, height };
}

type CM = { speaker: string; text: string; participant: ParticipantStyle };

// One row in the virtual column. yTop/bubbleY are virtual coordinates measured
// from the top of an infinitely tall message column (y=0). They never change.
type Row = {
  yTop: number;
  height: number;
  bubbleY: number;
  m: M;
  isSent: boolean;
  showLabel: boolean;
  color: string;
  label: string;
  textColor: string;
};

// Stack every message top-to-bottom in the virtual column. Positions are final
// and absolute — scrolling is achieved purely by translating the group, never
// by recomputing these.
function computeVirtualLayout(messages: CM[]): Row[] {
  const rows: Row[] = [];
  let cur = MSG_TOP_PAD;
  let last: string | null = null;

  for (const msg of messages) {
    const m = measure(msg.text);
    const isSent = msg.participant.align === "right";
    const showLabel = !isSent && msg.speaker !== last;
    const labelH = showLabel ? LS + GG : 0;
    const statusH = isSent ? SS + SG : 0;
    const bubbleY = cur + labelH;
    const height = labelH + m.height + statusH + BM;

    rows.push({
      yTop: cur,
      height,
      bubbleY,
      m,
      isSent,
      showLabel,
      color: isSent ? SENT : RCVD,
      label: msg.participant.label,
      textColor: isSent ? TXS : TXR,
    });

    cur += height;
    last = msg.speaker;
  }

  return rows;
}

// Total content height once `count` messages have appeared.
function contentHeight(rows: Row[], count: number): number {
  if (count <= 0) return 0;
  const r = rows[count - 1];
  return r.yTop + r.height;
}

// viewport_offset = max(0, content_height_so_far - message_area_height)
function offsetForCount(rows: Row[], count: number): number {
  return Math.max(0, contentHeight(rows, count) - MSG_AREA_H);
}

function easeOutCubic(p: number): number {
  const c = Math.min(1, Math.max(0, p));
  return 1 - Math.pow(1 - c, 3);
}

// How many messages have appeared by time t, and the (animated) scroll offset.
function scrollStateAt(rows: Row[], appearTimes: number[], t: number): { visibleCount: number; offset: number } {
  let visibleCount = 0;
  for (const at of appearTimes) {
    if (at <= t + 1e-6) visibleCount++;
    else break;
  }
  if (visibleCount === 0) return { visibleCount: 0, offset: 0 };

  const latest = visibleCount - 1;
  const tStart = appearTimes[latest];
  const from = offsetForCount(rows, visibleCount - 1);
  const to = offsetForCount(rows, visibleCount);
  const e = easeOutCubic((t - tStart) / ANIM_SECONDS);
  return { visibleCount, offset: from + (to - from) * e };
}

function tail(x: number, y: number, w: number, h: number, sent: boolean): string {
  const ty = y + h - 22;
  if (sent) {
    return `${x + w},${ty} ${x + w + TW},${ty + TH / 2} ${x + w},${ty + TH}`;
  }
  return `${x},${ty} ${x - TW},${ty + TH / 2} ${x},${ty + TH}`;
}

function renderBubble(row: Row): string {
  const parts: string[] = [];
  const { m, isSent, showLabel, color, label, textColor, yTop, bubbleY } = row;

  if (showLabel) {
    parts.push(
      `<text x="16" y="${yTop + LS}" font-size="${LS}" fill="${STATUS}" font-family="-apple-system,BlinkMacSystemFont,Helvetica Neue,sans-serif" font-weight="500">${esc(label)}</text>`,
    );
  }

  const x = isSent ? FW - m.width - 16 : 16;

  parts.push(
    `<g filter="url(#s)">`,
    `<rect x="${x}" y="${bubbleY}" width="${m.width}" height="${m.height}" rx="${R}" fill="${color}"/>`,
    `<polygon points="${tail(x, bubbleY, m.width, m.height, isSent)}" fill="${color}"/>`,
    `</g>`,
  );

  const tx = x + PL;
  const tb = bubbleY + PT + 14;
  for (let li = 0; li < m.lines.length; li++) {
    parts.push(
      `<text x="${tx}" y="${tb + li * LH}" font-size="${FS}" fill="${textColor}" font-family="-apple-system,BlinkMacSystemFont,Helvetica Neue,sans-serif">${esc(m.lines[li])}</text>`,
    );
  }

  if (isSent) {
    const sy = bubbleY + m.height + SG + SS;
    parts.push(
      `<text x="${x + m.width - 4}" y="${sy}" text-anchor="end" font-size="${SS}" fill="${STATUS}" font-family="-apple-system,BlinkMacSystemFont,Helvetica Neue,sans-serif">Delivered</text>`,
    );
  }

  return parts.join("\n");
}

// Fixed panel chrome: black rounded panel + status bar + contact header.
// Identical on every frame — it must never translate or resize.
function renderHeader(contactName: string, initial: string): string {
  const sbY = PANEL_TOP + 28;
  const batX = FW - 58;
  const batY = PANEL_TOP + 14;
  const avatarCy = PANEL_TOP + STATUSBAR_H + 28;
  const nameY = PANEL_TOP + STATUSBAR_H + 76;

  return [
    // Status bar
    `<text x="28" y="${sbY}" font-size="15" font-weight="600" fill="${HEADER_TX}" font-family="-apple-system,BlinkMacSystemFont,Helvetica Neue,sans-serif">9:41</text>`,
    `<rect x="${batX}" y="${batY}" width="24" height="12" rx="3" fill="none" stroke="${HEADER_TX}" stroke-opacity="0.5"/>`,
    `<rect x="${batX + 2}" y="${batY + 2}" width="20" height="8" rx="1.5" fill="${HEADER_TX}"/>`,
    `<rect x="${batX + 25}" y="${batY + 3.5}" width="2" height="5" rx="1" fill="${HEADER_TX}" fill-opacity="0.5"/>`,
    // Back chevron
    `<path d="M 34 ${avatarCy - 10} L 24 ${avatarCy} L 34 ${avatarCy + 10}" fill="none" stroke="${ACCENT}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
    // Avatar + contact name
    `<circle cx="${FW / 2}" cy="${avatarCy}" r="20" fill="${AVATAR_BG}"/>`,
    `<text x="${FW / 2}" y="${avatarCy + 6}" text-anchor="middle" font-size="18" font-weight="600" fill="${HEADER_TX}" font-family="-apple-system,BlinkMacSystemFont,Helvetica Neue,sans-serif">${esc(initial)}</text>`,
    `<text x="${FW / 2}" y="${nameY}" text-anchor="middle" font-size="14" font-weight="600" fill="${HEADER_TX}" font-family="-apple-system,BlinkMacSystemFont,Helvetica Neue,sans-serif">${esc(contactName)}</text>`,
    // Divider above the message area
    `<line x1="${PANEL_X}" y1="${MSG_AREA_TOP}" x2="${PANEL_X + PANEL_W}" y2="${MSG_AREA_TOP}" stroke="${DIVIDER}" stroke-width="1"/>`,
  ].join("\n");
}

// Build one overlay frame: fixed panel behind, clipped scrolling messages in the
// middle, fixed header on top.
function buildFrameSvg(rows: Row[], visibleCount: number, offset: number, contactName: string, initial: string): string {
  const groupY = MSG_AREA_TOP - offset;

  const bubbles: string[] = [];
  for (let i = 0; i < visibleCount && i < rows.length; i++) {
    const row = rows[i];
    // Cull rows fully outside the visible viewport (they're clipped anyway).
    if (row.yTop + row.height < offset - 2) continue;
    if (row.yTop > offset + MSG_AREA_H + 2) continue;
    bubbles.push(renderBubble(row));
  }

  return `<svg width="${FW}" height="${FH}" viewBox="0 0 ${FW} ${FH}" xmlns="http://www.w3.org/2000/svg">
<defs>
  <filter id="s" x="-10%" y="-10%" width="120%" height="130%">
    <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#000" flood-opacity="0.3"/>
  </filter>
  <clipPath id="msgclip">
    <rect x="${PANEL_X}" y="${MSG_AREA_TOP}" width="${PANEL_W}" height="${MSG_AREA_H}"/>
  </clipPath>
</defs>
<rect x="${PANEL_X}" y="${PANEL_TOP}" width="${PANEL_W}" height="${PANEL_BOTTOM - PANEL_TOP}" rx="${PANEL_R}" fill="${PANEL_BG}"/>
<g clip-path="url(#msgclip)">
  <g transform="translate(0, ${groupY.toFixed(2)})">
${bubbles.join("\n")}
  </g>
</g>
${renderHeader(contactName, initial)}
</svg>`;
}

function deriveContact(chatConfig: ChatConfig): { name: string; initial: string } {
  const participants = chatConfig.participants;
  const entries = Object.values(participants);
  const received = entries.find((p) => p.align === "left");
  const chosen = received ?? entries[0];
  const name = chosen?.label?.trim() || "Messages";
  const initial = (name[0] ?? "?").toUpperCase();
  return { name, initial };
}

function pad5(n: number): string {
  return String(n).padStart(5, "0");
}

// === Public API ===

export type ChatFrameSequence = {
  pattern: string;
  fps: number;
  frameCount: number;
  totalDuration: number;
};

// Render the chat overlay as a per-frame PNG sequence spanning the whole video.
// Identical consecutive frames (static holds between messages) are copied rather
// than re-rendered. FFmpeg composites the sequence as a single overlay stream.
export async function renderChatFrames(
  segments: GeneratedSegment[],
  chatConfig: ChatConfig,
  tempDir: string,
  fps: number = FPS,
): Promise<ChatFrameSequence> {
  const participants = chatConfig.participants;
  if (!participants || Object.keys(participants).length === 0) {
    throw new Error("chatConfig.participants must have at least one participant");
  }

  const captions = buildTimedCaptions(segments);
  const messages: CM[] = captions.map((c) => ({
    speaker: c.speaker,
    text: c.text,
    participant: participants[c.speaker] ?? { label: c.speaker, color: "#007AFF", align: "right" },
  }));

  const rows = computeVirtualLayout(messages);
  const appearTimes = captions.map((c) => c.startSeconds);
  const totalDuration = captions.length > 0 ? captions[captions.length - 1].endSeconds : 0;
  const { name, initial } = deriveContact(chatConfig);

  const frameCount = Math.max(1, Math.ceil(totalDuration * fps));

  let prevSvg: string | null = null;
  let prevPath: string | null = null;

  for (let n = 0; n < frameCount; n++) {
    const t = n / fps;
    const { visibleCount, offset } = scrollStateAt(rows, appearTimes, t);
    const svg = buildFrameSvg(rows, visibleCount, Math.round(offset), name, initial);
    const framePath = path.join(tempDir, `chat-frame-${pad5(n)}.png`);

    if (svg === prevSvg && prevPath) {
      await copyFile(prevPath, framePath);
    } else {
      await sharp(Buffer.from(svg)).png().toFile(framePath);
      prevSvg = svg;
      prevPath = framePath;
    }
  }

  return {
    pattern: path.join(tempDir, "chat-frame-%05d.png"),
    fps,
    frameCount,
    totalDuration,
  };
}
