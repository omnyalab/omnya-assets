// Free slots = the bookable hours (config.js) minus Outlook's busy blocks minus the site's own bookings.
import { types, hours, STEP, BUFFER, NOTICE_HOURS, HORIZON_DAYS } from './config.js';
import { romeDays, romeToUtc } from './time.js';
import { outlookBusy } from './busy.js';
import { siteBusy } from './store.js';

const MIN = 60_000;

/** Start times (UTC ms) free for this kind of appointment. */
export async function freeSlots(type, now = Date.now()) {
  const len = types[type].minutes * MIN;
  const earliest = now + NOTICE_HOURS * 60 * MIN;
  const days = romeDays(now, HORIZON_DAYS + 1);
  const from = now - 86_400_000;
  const to = now + (HORIZON_DAYS + 2) * 86_400_000;
  const [a, b] = await Promise.all([outlookBusy(from, to), siteBusy(from, to)]);
  const busy = [...a, ...b].map(([s, e]) => [s - BUFFER * MIN, e + BUFFER * MIN]);
  const clash = (s, e) => busy.some(([bs, be]) => s < be && e > bs);

  const out = [];
  for (const day of days) {
    for (const [open, close] of hours[day.wd] || []) {
      const [oh, om] = open.split(':').map(Number);
      const [ch, cm] = close.split(':').map(Number);
      for (let m = oh * 60 + om; m + types[type].minutes <= ch * 60 + cm; m += STEP) {
        const s = romeToUtc(day.y, day.m, day.d, Math.floor(m / 60), m % 60);
        if (s >= earliest && !clash(s, s + len)) out.push(s);
      }
    }
  }
  return out;
}
