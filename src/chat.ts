import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { ChatConfig, ParticipantStyle, GeneratedSegment } from "./types.js";
import { buildTimedCaptions } from "./subtitles.js";

const FW = 720;
const FH = 1280;

// iMessage light mode
const BG = "#F2F2F7";
const SENT = "#007AFF";
const RCVD = "#E5E5EA";
const STATUS = "#8E8E93";
const TXS = "#FFFFFF";
const TXR = "#000000";

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
const BTM = 40;

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

// Pre-compute final positions so messages never move
function computePositions(messages: CM[]): {
  y: number; height: number; isSent: boolean; showLabel: boolean;
  color: string; label: string; m: M; textColor: string;
}[] {
  const metrics = messages.map((m) => measure(m.text));
  let totalH = 0;
  let last: string | null = null;
  const items: any[] = [];

  for (const msg of messages) {
    const m = metrics[items.length];
    const isSent = msg.participant.align === "right";
    const showLabel = !isSent && msg.speaker !== last;
    const extra = (showLabel ? LS + GG : 0) + (isSent ? SS + SG : 0) + BM;
    const h = m.height + extra;
    items.push({ y: 0, height: h, isSent, showLabel, color: isSent ? SENT : RCVD, label: msg.participant.label, m, textColor: isSent ? TXS : TXR });
    totalH += h;
    last = msg.speaker;
  }

  // Pin bottom of chat to BTM pixels from frame bottom
  const bottomY = FH - BTM;
  let startY = bottomY - totalH;
  if (startY < 120) startY = 120;

  let curY = startY;
  for (const item of items) {
    item.y = curY;
    if (item.showLabel) curY += LS + GG;
    curY += item.m.height + 4;
    if (item.isSent) curY += SS + SG;
    curY += BM;
  }

  return items;
}

function tail(x: number, y: number, w: number, h: number, sent: boolean): string {
  const ty = y + h - 22;
  if (sent) {
    return `${x + w},${ty} ${x + w + TW},${ty + TH / 2} ${x + w},${ty + TH}`;
  }
  return `${x},${ty} ${x - TW},${ty + TH / 2} ${x},${ty + TH}`;
}

function buildSvg(positions: ReturnType<typeof computePositions>, showUpTo: number): string {
  const parts: string[] = [];

  // Background: from startY-12 to frame bottom
  // Use first message's y as reference for background top
  const bgTop = positions.length > 0 ? positions[0].y - 12 : FH - BTM - 12;
  const bgH = FH - bgTop;
  parts.push(`<rect x="0" y="${bgTop}" width="${FW}" height="${bgH}" fill="${BG}" rx="20"/>`);

  // Messages
  for (let i = 0; i < showUpTo && i < positions.length; i++) {
    const p = positions[i];
    const { m, isSent, showLabel, color, label, textColor, y } = p;

    if (showLabel) {
      parts.push(
        `<text x="16" y="${y + LS}" font-size="${LS}" fill="${STATUS}" font-family="-apple-system,BlinkMacSystemFont,Helvetica Neue,sans-serif" font-weight="500">${esc(label)}</text>`,
      );
    }

    const x = isSent ? FW - m.width - 16 : 16;
    const ly = y + (showLabel ? LS + GG : 0);

    parts.push(
      `<g filter="url(#s)">`,
      `<rect x="${x}" y="${ly}" width="${m.width}" height="${m.height}" rx="${R}" fill="${color}"/>`,
      `<polygon points="${tail(x, ly, m.width, m.height, isSent)}" fill="${color}"/>`,
      `</g>`,
    );

    const tx = x + PL;
    const tb = ly + PT + 14;
    for (let li = 0; li < m.lines.length; li++) {
      parts.push(
        `<text x="${tx}" y="${tb + li * LH}" font-size="${FS}" fill="${textColor}" font-family="-apple-system,BlinkMacSystemFont,Helvetica Neue,sans-serif">${esc(m.lines[li])}</text>`,
      );
    }

    if (isSent) {
      const sy = ly + m.height + 4 + SS;
      parts.push(
        `<text x="${x + m.width - 4}" y="${sy}" text-anchor="end" font-size="${SS}" fill="${STATUS}" font-family="-apple-system,BlinkMacSystemFont,Helvetica Neue,sans-serif">Delivered</text>`,
      );
    }
  }

  return `<svg width="${FW}" height="${FH}" viewBox="0 0 ${FW} ${FH}" xmlns="http://www.w3.org/2000/svg">
<defs>
  <filter id="s" x="-10%" y="-10%" width="120%" height="130%">
    <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#000" flood-opacity="0.3"/>
  </filter>
</defs>
${parts.join("\n")}
</svg>`;
}

// === Public API ===

export type ChatOverlaySet = {
  after: string;
};

export async function renderChatOverlayImages(
  segments: GeneratedSegment[],
  chatConfig: ChatConfig,
  tempDir: string,
): Promise<ChatOverlaySet[]> {
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

  const positions = computePositions(messages);
  const results: ChatOverlaySet[] = [];

  for (let i = 0; i < segments.length; i++) {
    const prefix = `chat-${String(i).padStart(4, "0")}`;
    const svg = buildSvg(positions, i + 1);
    const afterPath = path.join(tempDir, `${prefix}.png`);
    await sharp(Buffer.from(svg)).png().toFile(afterPath);
    results.push({ after: afterPath });
  }

  return results;
}
