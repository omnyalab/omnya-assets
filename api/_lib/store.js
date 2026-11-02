// The site's own bookings, in Upstash Redis (free, added from the Vercel Marketplace).
// Outlook's published ICS can take a while to show a new event, so every booking made here
// is also kept here until it's over: the slot disappears from the site at once, and two
// people clicking the same slot can't both get it (each 30-minute block is taken with SET NX).
// Without Redis (local preview) a memory map stands in.
import { STEP } from './config.js';

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const P = 'omnya:';

const mem = { holds: new Map(), booked: [], details: new Map() };

async function redis(...cmd) {
  const res = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  const j = await res.json();
  if (j.error) throw new Error(`redis: ${j.error}`);
  return j.result;
}

export const hasStore = () => Boolean(URL_ && TOKEN);

/** Bookings made on the site that touch [from, to], as [startMs, endMs]. */
export async function siteBusy(from, to) {
  let rows;
  if (hasStore()) rows = await redis('ZRANGEBYSCORE', `${P}booked`, from - 86_400_000, to);
  else rows = mem.booked;
  return rows
    .map((r) => r.split('|').map(Number))
    .filter(([s, e]) => e > from && s < to)
    .map(([s, e]) => [s, e]);
}

const blocks = (s, e) => {
  const out = [];
  for (let t = s; t < e; t += STEP * 60_000) out.push(t);
  return out;
};

/** Takes every block of every [start, end] for this booking, or none of them. */
export async function hold(ranges, id) {
  const keys = ranges.flatMap(([s, e]) => blocks(s, e));
  const ttl = Math.max(...ranges.map(([, e]) => e)) - Date.now() + 86_400_000;
  const taken = [];
  for (const k of keys) {
    let ok;
    if (hasStore()) ok = (await redis('SET', `${P}hold:${k}`, id, 'NX', 'PX', ttl)) === 'OK';
    else ok = !mem.holds.has(k) && (mem.holds.set(k, id), true);
    if (!ok) {
      await release(taken);
      return false;
    }
    taken.push(k);
  }
  return true;
}

async function release(keys) {
  for (const k of keys) {
    if (hasStore()) await redis('DEL', `${P}hold:${k}`);
    else mem.holds.delete(k);
  }
}

/** Lets the slots go again (when the emails could not be sent). */
export const unhold = (ranges) => release(ranges.flatMap(([s, e]) => blocks(s, e)));

/** Saves the booking: the ranges block the calendar, the details stay 120 days. */
export async function record(ranges, id, details) {
  const rows = ranges.map(([s, e]) => `${s}|${e}|${id}`);
  if (!hasStore()) {
    mem.booked.push(...rows);
    mem.details.set(id, details);
    return;
  }
  for (const [i, r] of rows.entries()) await redis('ZADD', `${P}booked`, ranges[i][0], r);
  await redis('SET', `${P}booking:${id}`, JSON.stringify(details), 'EX', 120 * 86_400);
  await redis('ZREMRANGEBYSCORE', `${P}booked`, '-inf', Date.now() - 35 * 86_400_000);
}

/** Every booking from `from` on, one row per call, with its details: for Nico's calendar feed. */
export async function bookingsSince(from) {
  const rows = hasStore() ? await redis('ZRANGEBYSCORE', `${P}booked`, from, '+inf') : mem.booked;
  const list = rows.map((r) => r.split('|')).map(([s, e, id]) => ({ s: +s, e: +e, id })).filter((b) => b.e > from);
  const ids = [...new Set(list.map((b) => b.id))];
  let details = [];
  if (ids.length) details = hasStore() ? (await redis('MGET', ...ids.map((id) => `${P}booking:${id}`))).map((d) => (d ? JSON.parse(d) : null)) : ids.map((id) => mem.details.get(id) || null);
  const byId = new Map(ids.map((id, i) => [id, details[i]]));
  return list.map((b) => ({ ...b, details: byId.get(b.id) }));
}
