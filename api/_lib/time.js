// Rome wall-clock time <-> UTC, with the Intl data built into Node (no timezone library).
import { TZ } from './config.js';

const fmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ, hourCycle: 'h23',
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
});

/** The Rome wall clock at a UTC instant: { y, m, d, h, min, wd }. */
export function romeParts(ms) {
  const p = Object.fromEntries(fmt.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  const y = +p.year, m = +p.month, d = +p.day;
  return { y, m, d, h: +p.hour, min: +p.minute, wd: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

/** UTC milliseconds of a Rome wall-clock time. */
export function romeToUtc(y, m, d, h, min) {
  const want = Date.UTC(y, m - 1, d, h, min);
  let ms = want;
  // two passes settle the offset, also across the DST change
  for (let i = 0; i < 2; i++) {
    const p = romeParts(ms);
    ms += want - Date.UTC(p.y, p.m - 1, p.d, p.h, p.min);
  }
  return ms;
}

/** Rome calendar days from the one containing `fromMs`, `count` of them: [{ y, m, d, wd }]. */
export function romeDays(fromMs, count) {
  const p = romeParts(fromMs);
  const out = [];
  for (let i = 0; i < count; i++) {
    const t = new Date(Date.UTC(p.y, p.m - 1, p.d + i));
    out.push({ y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), wd: t.getUTCDay() });
  }
  return out;
}

/** 20261102T093000Z, for .ics files. */
export const icsStamp = (ms) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
