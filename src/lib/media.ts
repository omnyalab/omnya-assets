// Build-time only: reads the real pixel size of each exported .webp so the
// srcset widths are exact (some projects ship smaller files than 2400/1200).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Still } from './data';

// Builds run from the project root (npm run dev / build)
const PUBLIC = join(process.cwd(), 'public');
const cache = new Map<string, { w: number; h: number }>();

function webpSize(path: string) {
  const hit = cache.get(path);
  if (hit) return hit;
  const b = readFileSync(PUBLIC + path);
  const kind = b.toString('ascii', 12, 16);
  let w = 0;
  let h = 0;
  if (kind === 'VP8 ') {
    w = b.readUInt16LE(26) & 0x3fff;
    h = b.readUInt16LE(28) & 0x3fff;
  } else if (kind === 'VP8L') {
    const bits = b.readUInt32LE(21);
    w = (bits & 0x3fff) + 1;
    h = ((bits >> 14) & 0x3fff) + 1;
  } else if (kind === 'VP8X') {
    w = 1 + b.readUIntLE(24, 3);
    h = 1 + b.readUIntLE(27, 3);
  }
  const size = { w, h };
  cache.set(path, size);
  return size;
}

/** Real sizes of the desktop and mobile files. */
export function sizes(m: Still) {
  const d = webpSize(m.src);
  const mo = webpSize(m.mobile);
  return { dw: d.w, dh: d.h, mw: mo.w };
}

export function srcset(m: Still) {
  const { dw, mw } = sizes(m);
  // Same width means the "mobile" file is already the full one
  if (mw >= dw) return `${m.src} ${dw}w`;
  return `${m.mobile} ${mw}w, ${m.src} ${dw}w`;
}
