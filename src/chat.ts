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
const DIVIDER = "#2A2A2C";
const ACCENT = "#007AFF";
const AVATAR_BG = "#3A3A3C";
const TXS = "#FFFFFF";
const TXR = "#FFFFFF";
const HEADER_TX = "#FFFFFF";

// Fixed chat panel geometry — NEVER changes for the whole video.
// A centered rectangle in the upper-middle: gameplay video shows above (small
// strip), below (larger strip), and on both sides of the panel.
const PANEL_MARGIN_X = 36; // ~5% side margins
const PANEL_X = PANEL_MARGIN_X; // 36
const PANEL_W = FW - 2 * PANEL_MARGIN_X; // 648 (~90% of canvas width)
const PANEL_CX = PANEL_X + PANEL_W / 2; // 360 (canvas center)
const PANEL_RIGHT = PANEL_X + PANEL_W; // 684
const PANEL_TOP = 90; // ~7% down from the top
const PANEL_BOTTOM = 630; // 540px tall; below this is the bottom gameplay strip
const PANEL_R = 28;
const STATUSBAR_H = 44;
const HEADER_H = 92;
// Message area: the only region that scrolls. Below header, above panel bottom.
const MSG_AREA_TOP = PANEL_TOP + STATUSBAR_H + HEADER_H; // 226
const MSG_AREA_BOTTOM = PANEL_BOTTOM - 12; // 618
const MSG_AREA_H = MSG_AREA_BOTTOM - MSG_AREA_TOP; // 392
const MSG_TOP_PAD = 10;

// Bubble metrics (tuned for the 720px canvas — padding/width values from the
// spec are given at 1080px and scaled by 2/3 here).
const R = 22; // pill-shaped corners
const PT = 14; // vertical padding
const PB = 14;
const PL = 20; // horizontal padding
const PR = 20;
const TW = 10;
const TH = 8;
const BM = 9; // gap between messages
const FS = 20; // message font size
const FW_WEIGHT = 600; // semibold message text
const LH = 24; // tight line-height for wrapped lines
const ASCENT = 15; // first-line baseline offset from bubble top padding
const CW9 = 11; // approx glyph advance at FS=20 (semibold)
const MBW = 543; // max text width -> bubble caps at ~81% of canvas
const SIDE_MARGIN = 12; // bubbles sit close to the canvas edges

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
  color: string;
  textColor: string;
};

// Stack every message top-to-bottom in the virtual column. Positions are final
// and absolute — scrolling is achieved purely by translating the group, never
// by recomputing these.
function computeVirtualLayout(messages: CM[]): Row[] {
  const rows: Row[] = [];
  let cur = MSG_TOP_PAD;

  for (const msg of messages) {
    const m = measure(msg.text);
    const isSent = msg.participant.align === "right";
    const bubbleY = cur;
    const height = m.height + BM;

    rows.push({
      yTop: cur,
      height,
      bubbleY,
      m,
      isSent,
      color: isSent ? SENT : RCVD,
      textColor: isSent ? TXS : TXR,
    });

    cur += height;
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
  const ty = y + h - R;
  if (sent) {
    return `${x + w},${ty} ${x + w + TW},${ty + TH / 2} ${x + w},${ty + TH}`;
  }
  return `${x},${ty} ${x - TW},${ty + TH / 2} ${x},${ty + TH}`;
}

function renderBubble(row: Row): string {
  const parts: string[] = [];
  const { m, isSent, color, textColor, bubbleY } = row;

  const x = isSent ? PANEL_RIGHT - m.width - SIDE_MARGIN : PANEL_X + SIDE_MARGIN;

  parts.push(
    `<g filter="url(#s)">`,
    `<rect x="${x}" y="${bubbleY}" width="${m.width}" height="${m.height}" rx="${R}" fill="${color}"/>`,
    `<polygon points="${tail(x, bubbleY, m.width, m.height, isSent)}" fill="${color}"/>`,
    `</g>`,
  );

  const tx = x + PL;
  const tb = bubbleY + PT + ASCENT;
  for (let li = 0; li < m.lines.length; li++) {
    parts.push(
      `<text x="${tx}" y="${tb + li * LH}" font-size="${FS}" font-weight="${FW_WEIGHT}" fill="${textColor}" font-family="-apple-system,BlinkMacSystemFont,Helvetica Neue,sans-serif">${esc(m.lines[li])}</text>`,
    );
  }

  return parts.join("\n");
}

// Right-side status bar cluster, left-to-right: signal bars -> wifi -> battery%.
// Anchored to the panel's right edge.
function renderStatusIcons(): string {
  const cy = PANEL_TOP + 21;
  const bottom = cy + 6;
  const parts: string[] = [];

  // Cellular signal bars (4, increasing height)
  const heights = [5, 8, 11, 14];
  for (let i = 0; i < heights.length; i++) {
    const h = heights[i];
    parts.push(`<rect x="${PANEL_RIGHT - 128 + i * 7}" y="${bottom - h}" width="4" height="${h}" rx="1" fill="${HEADER_TX}"/>`);
  }

  // Wifi (two arcs + dot, opening downward)
  const wx = PANEL_RIGHT - 88;
  parts.push(
    `<path d="M ${wx - 8} ${cy - 1.5} A 11 11 0 0 1 ${wx + 8} ${cy - 1.5}" fill="none" stroke="${HEADER_TX}" stroke-width="2" stroke-linecap="round"/>`,
    `<path d="M ${wx - 5} ${cy + 1.5} A 6.5 6.5 0 0 1 ${wx + 5} ${cy + 1.5}" fill="none" stroke="${HEADER_TX}" stroke-width="2" stroke-linecap="round"/>`,
    `<circle cx="${wx}" cy="${bottom - 1}" r="1.6" fill="${HEADER_TX}"/>`,
  );

  // Battery percentage + icon
  const batX = PANEL_RIGHT - 50;
  const batY = cy - 6;
  parts.push(
    `<text x="${batX - 6}" y="${cy + 5}" text-anchor="end" font-size="13" font-weight="500" fill="${HEADER_TX}" font-family="-apple-system,BlinkMacSystemFont,Helvetica Neue,sans-serif">98</text>`,
    `<rect x="${batX}" y="${batY}" width="24" height="12" rx="3" fill="none" stroke="${HEADER_TX}" stroke-opacity="0.5"/>`,
    `<rect x="${batX + 2}" y="${batY + 2}" width="20" height="8" rx="1.5" fill="${HEADER_TX}"/>`,
    `<rect x="${batX + 25}" y="${batY + 3.5}" width="2" height="5" rx="1" fill="${HEADER_TX}" fill-opacity="0.5"/>`,
  );

  return parts.join("\n");
}

// Video-camera button on the right of the header (mirrors the back chevron).
function renderVideoButton(cy: number): string {
  const cx = PANEL_RIGHT - 44;
  return [
    `<rect x="${cx - 24}" y="${cy - 17}" width="48" height="34" rx="9" fill="none" stroke="${ACCENT}" stroke-width="2"/>`,
    `<rect x="${cx - 13}" y="${cy - 8}" width="15" height="16" rx="4" fill="none" stroke="${ACCENT}" stroke-width="2"/>`,
    `<path d="M ${cx + 3} ${cy - 4} L ${cx + 11} ${cy - 8} L ${cx + 11} ${cy + 8} L ${cx + 3} ${cy + 4} Z" fill="none" stroke="${ACCENT}" stroke-width="2" stroke-linejoin="round"/>`,
  ].join("\n");
}

// Fixed panel chrome: black rounded panel + status bar + contact header.
// Identical on every frame — it must never translate or resize.
function renderHeader(contactName: string, initial: string): string {
  const sbY = PANEL_TOP + 28;
  const avatarCy = PANEL_TOP + STATUSBAR_H + 28;
  const nameY = PANEL_TOP + STATUSBAR_H + 76;

  return [
    // Status bar: time (left) + signal / wifi / battery% (right)
    `<text x="${PANEL_X + 28}" y="${sbY}" font-size="15" font-weight="600" fill="${HEADER_TX}" font-family="-apple-system,BlinkMacSystemFont,Helvetica Neue,sans-serif">9:41</text>`,
    renderStatusIcons(),
    // Back chevron (left) + video button (right)
    `<path d="M ${PANEL_X + 34} ${avatarCy - 10} L ${PANEL_X + 24} ${avatarCy} L ${PANEL_X + 34} ${avatarCy + 10}" fill="none" stroke="${ACCENT}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
    renderVideoButton(avatarCy),
    // Avatar + contact name
    `<circle cx="${PANEL_CX}" cy="${avatarCy}" r="20" fill="${AVATAR_BG}"/>`,
    `<text x="${PANEL_CX}" y="${avatarCy + 6}" text-anchor="middle" font-size="18" font-weight="600" fill="${HEADER_TX}" font-family="-apple-system,BlinkMacSystemFont,Helvetica Neue,sans-serif">${esc(initial)}</text>`,
    `<text x="${PANEL_CX}" y="${nameY}" text-anchor="middle" font-size="14" font-weight="600" fill="${HEADER_TX}" font-family="-apple-system,BlinkMacSystemFont,Helvetica Neue,sans-serif">${esc(contactName)}</text>`,
    // Divider above the message area
    `<line x1="${PANEL_X}" y1="${MSG_AREA_TOP}" x2="${PANEL_RIGHT}" y2="${MSG_AREA_TOP}" stroke="${DIVIDER}" stroke-width="1"/>`,
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
