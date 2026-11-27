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

// 16/11 (stadium reel viral, DMs stopped for 6 hours): Upstash's free plan ran out of its 500,000 requests of the
// month and every call answered "max requests limit exceeded", so the bot, the opt-in list and the bookings stopped.
// Now, when Upstash says the limit is reached (or can't be reached), the same command runs on a memory copy inside
// this instance for 10 minutes, then Upstash is tried again: the site keeps working, it only forgets between instances.
let downUntil = 0;
const LIMIT = /max requests limit|limit exceeded|quota|fetch failed|ECONN|ETIMEDOUT/i;

export async function redis(...cmd) {
  if (Date.now() < downUntil) return memRedis(cmd);
  let j;
  try {
    const res = await fetch(URL_, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cmd),
    });
    j = await res.json();
  } catch (e) {
    if (!LIMIT.test(String(e && e.message))) throw e;
    j = { error: String(e.message) };
  }
  if (j.error) {
    if (LIMIT.test(j.error)) {
      if (Date.now() >= downUntil) console.error('[store] upstash down, memory for 10 min:', j.error);
      downUntil = Date.now() + 10 * 60_000;
      return memRedis(cmd);
    }
    throw new Error(`redis: ${j.error}`);
  }
  return j.result;
}
export const storeDown = () => Date.now() < downUntil;

// ---- the memory copy: the commands the site uses, with Redis's answers ----
const M = { s: new Map(), x: new Map() }; // key → value (string | array | Set | Map(hash) | Map(zset)), key → expiry ms
const live = (k) => { const x = M.x.get(k); if (x && x <= Date.now()) { M.s.delete(k); M.x.delete(k); } return M.s.get(k); };
const del = (k) => { const had = M.s.has(k); M.s.delete(k); M.x.delete(k); return had; };
const str = (v) => (v == null ? null : String(v));
const list = (k) => { let v = live(k); if (!Array.isArray(v)) { v = []; M.s.set(k, v); } return v; };
const set = (k) => { let v = live(k); if (!(v instanceof Set)) { v = new Set(); M.s.set(k, v); } return v; };
const hash = (k) => { let v = live(k); if (!(v instanceof Map) || v.zset) { v = new Map(); M.s.set(k, v); } return v; };
const zset = (k) => { let v = live(k); if (!(v instanceof Map) || !v.zset) { v = new Map(); v.zset = true; M.s.set(k, v); } return v; };
const sc = (v) => (v === '-inf' ? -Infinity : v === '+inf' ? Infinity : String(v).startsWith('(') ? Number(String(v).slice(1)) + 1e-9 : Number(v));
const zsorted = (k) => [...zset(k)].sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1));
const range = (arr, a, b) => { const n = arr.length; a = Number(a); b = Number(b); if (a < 0) a += n; if (b < 0) b += n; return arr.slice(Math.max(0, a), Math.max(0, b + 1)); };
const withScores = (rows, ws) => (ws ? rows.flatMap(([m, s]) => [m, String(s)]) : rows.map(([m]) => m));

function memRedis([c, ...a]) {
  const C = String(c).toUpperCase();
  const k = a[0];
  switch (C) {
    case 'GET': { const v = live(k); return typeof v === 'string' ? v : null; }
    case 'SET': {
      const o = a.slice(2).map((x) => String(x).toUpperCase());
      if (o.includes('NX') && live(k) !== undefined) return null;
      if (o.includes('XX') && live(k) === undefined) return null;
      M.s.set(k, String(a[1])); M.x.delete(k);
      const ex = o.indexOf('EX'), px = o.indexOf('PX');
      if (ex >= 0) M.x.set(k, Date.now() + Number(a[2 + ex + 1]) * 1000);
      if (px >= 0) M.x.set(k, Date.now() + Number(a[2 + px + 1]));
      return 'OK';
    }
    case 'MGET': return a.map((x) => { const v = live(x); return typeof v === 'string' ? v : null; });
    case 'MSET': for (let i = 0; i < a.length; i += 2) { M.s.set(a[i], String(a[i + 1])); M.x.delete(a[i]); } return 'OK';
    case 'DEL': return a.reduce((n, x) => n + (del(x) ? 1 : 0), 0);
    case 'INCR': { const n = Number(live(k) || 0) + 1; M.s.set(k, String(n)); return n; }
    case 'EXPIRE': if (live(k) === undefined) return 0; M.x.set(k, Date.now() + Number(a[1]) * 1000); return 1;
    case 'PEXPIRE': if (live(k) === undefined) return 0; M.x.set(k, Date.now() + Number(a[1])); return 1;
    case 'LPUSH': { const l = list(k); l.unshift(...a.slice(1).map(String).reverse()); return l.length; }
    case 'RPUSH': { const l = list(k); l.push(...a.slice(1).map(String)); return l.length; }
    case 'LPOP': { const l = list(k); return l.length ? l.shift() : null; }
    case 'RPOP': { const l = list(k); return l.length ? l.pop() : null; }
    case 'LRANGE': return range(list(k), a[1], a[2]);
    case 'LTRIM': { const l = list(k); const r = range(l, a[1], a[2]); l.length = 0; l.push(...r); return 'OK'; }
    case 'SADD': { const s = set(k); let n = 0; for (const m of a.slice(1)) if (!s.has(String(m))) { s.add(String(m)); n++; } return n; }
    case 'SREM': { const s = set(k); let n = 0; for (const m of a.slice(1)) if (s.delete(String(m))) n++; return n; }
    case 'SISMEMBER': return set(k).has(String(a[1])) ? 1 : 0;
    case 'SMEMBERS': return [...set(k)];
    case 'HSET': { const h = hash(k); let n = 0; for (let i = 1; i < a.length; i += 2) { if (!h.has(String(a[i]))) n++; h.set(String(a[i]), String(a[i + 1])); } return n; }
    case 'HINCRBY': { const h = hash(k); const n = Number(h.get(String(a[1])) || 0) + Number(a[2]); h.set(String(a[1]), String(n)); return n; }
    case 'HGETALL': return [...hash(k)].flat();
    case 'HMGET': { const h = hash(k); return a.slice(1).map((f) => { const v = h.get(String(f)); return v == null ? null : v; }); }
    case 'HGET': { const v = hash(k).get(String(a[1])); return v == null ? null : v; }
    case 'HDEL': { const h = hash(k); let n = 0; for (const f of a.slice(1)) if (h.delete(String(f))) n++; return n; }
    case 'HLEN': return hash(k).size;
    case 'SCARD': return set(k).size;
    case 'ZADD': {
      const z = zset(k); let i = 1, nx = false;
      while (i < a.length && /^(NX|XX|GT|LT|CH)$/i.test(String(a[i]))) { if (/^NX$/i.test(String(a[i]))) nx = true; i++; }
      let n = 0;
      for (; i < a.length; i += 2) { const m = String(a[i + 1]); if (z.has(m)) { if (!nx) z.set(m, Number(a[i])); } else { z.set(m, Number(a[i])); n++; } }
      return n;
    }
    case 'ZREM': { const z = zset(k); let n = 0; for (const m of a.slice(1)) if (z.delete(String(m))) n++; return n; }
    case 'ZSCORE': { const v = zset(k).get(String(a[1])); return v == null ? null : String(v); }
    case 'ZCARD': return zset(k).size;
    case 'ZCOUNT': { const lo = sc(a[1]), hi = sc(a[2]); return [...zset(k).values()].filter((s) => s >= lo && s <= hi).length; }
    case 'ZRANGE': return withScores(range(zsorted(k), a[1], a[2]), a.slice(3).some((x) => String(x).toUpperCase() === 'WITHSCORES'));
    case 'ZREVRANGE': return withScores(range(zsorted(k).reverse(), a[1], a[2]), a.slice(3).some((x) => String(x).toUpperCase() === 'WITHSCORES'));
    case 'ZRANGEBYSCORE': {
      const lo = sc(a[1]), hi = sc(a[2]);
      let rows = zsorted(k).filter(([, s]) => s >= lo && s <= hi);
      const o = a.slice(3).map((x) => String(x).toUpperCase());
      const li = o.indexOf('LIMIT'); if (li >= 0) rows = rows.slice(Number(a[3 + li + 1]), Number(a[3 + li + 1]) + Number(a[3 + li + 2]));
      return withScores(rows, o.includes('WITHSCORES'));
    }
    case 'ZREMRANGEBYSCORE': { const z = zset(k); const lo = sc(a[1]), hi = sc(a[2]); let n = 0; for (const [m, s] of [...z]) if (s >= lo && s <= hi) { z.delete(m); n++; } return n; }
    case 'EVAL': throw new Error('redis: no scripts in memory'); // callers fall back to the single commands
    default: throw new Error(`redis: ${C} not in memory`);
  }
}

export const hasStore = () => Boolean(URL_ && TOKEN);

/** 20/11 (THE 3D FUTURE): Redis when Upstash is there, the memory copy above when it is not (local preview), so a
    function can be tried on the computer with no keys. Same commands, same answers, always a promise. */
export const kv = async (...cmd) => (hasStore() ? redis(...cmd) : memRedis(cmd));

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
