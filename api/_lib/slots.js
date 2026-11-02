// Slots = the bookable hours (config.js). Busy = Outlook's busy blocks, the site's own bookings and
// a few blocks kept busy on purpose (HOLD_SHARE). The page shows both: free ones to pick, busy ones struck.
import { types, hours, STEP, BUFFER, NOTICE_HOURS, HORIZON_DAYS, HOLD_SHARE } from './config.js';
import { romeDays, romeToUtc } from './time.js';
import { outlookBusy } from './busy.js';
import { siteBusy } from './store.js';

const MIN = 60_000;

// the same blocks every time, so a held slot never flickers between visits
function held(blockStart) {
  let x = Math.floor(blockStart / (STEP * MIN)) ^ 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 2 ** 32 < HOLD_SHARE;
}

/** Start times (UTC ms) of this kind of appointment: { free, busy }. */
export async function slots(type, now = Date.now()) {
  const len = types[type].minutes * MIN;
  const earliest = now + NOTICE_HOURS * 60 * MIN;
  const days = romeDays(now, HORIZON_DAYS + 1);
  const from = now - 86_400_000;
  const to = now + (HORIZON_DAYS + 2) * 86_400_000;
  const [a, b] = await Promise.all([outlookBusy(from, to), siteBusy(from, to)]);
  const busy = [...a, ...b].map(([s, e]) => [s - BUFFER * MIN, e + BUFFER * MIN]);
  const clash = (s, e) => busy.some(([bs, be]) => s < be && e > bs);

  const free = [];
  const taken = [];
  for (const day of days) {
    for (const [open, close] of hours[day.wd] || []) {
      const [oh, om] = open.split(':').map(Number);
      const [ch, cm] = close.split(':').map(Number);
      const start = (m) => romeToUtc(day.y, day.m, day.d, Math.floor(m / 60), m % 60);
      for (let m = oh * 60 + om; m + types[type].minutes <= ch * 60 + cm; m += STEP) {
        const s = start(m);
        if (s < earliest) continue;
        let isHeld = false;
        for (let k = 0; k < types[type].minutes; k += STEP) if (held(start(m + k))) isHeld = true;
        (isHeld || clash(s, s + len) ? taken : free).push(s);
      }
    }
  }
  return { free, busy: taken };
}

export const freeSlots = async (type, now) => (await slots(type, now)).free;
