// What the Instagram bot remembers, in the same Upstash Redis as the bookings (keys omnya:ig:*).
// Without Redis (local tests) the same few commands run on memory.
//
//   lead:<id>            a person (JSON, 180 days)          leads       sorted set of their ids by date
//   c:<comment id>       this comment was already taken (8 days: the same event twice is one DM)
//   once:<media>:<id>    this person already got the DM for this reel
//   got:<message id>     this DM or tap was already handled
//   job:<comment id>     a comment waiting for its DM       q           sorted set of the waiting ones
//   sent                 the private replies of the last hour (sorted set by time): the 750 an hour of Meta
//   hold                 "stop sending until…" after Meta said slow down or after failures in a row
//   stats                hash, per post: comments, DMs, links, clicks
//   errs                 sorted set of the last errors by time
//   due                  reminders and follow-ups by time
import { redis, hasStore } from './store.js';

const P = 'omnya:ig:';
export const KEEP = 180 * 86_400; // seconds a lead is kept

/** The time, in one place so the tests can move it. */
export const clock = { now: () => Date.now() };

export const mem = { kv: new Map(), z: new Map(), h: new Map() };
const zOf = (k) => mem.z.get(k) || (mem.z.set(k, new Map()), mem.z.get(k));
const hOf = (k) => mem.h.get(k) || (mem.h.set(k, new Map()), mem.h.get(k));
const alive = (k) => {
  const e = mem.kv.get(k);
  if (e && e.x && e.x <= clock.now()) mem.kv.delete(k);
  return mem.kv.get(k);
};
const num = (v) => (v === '-inf' ? -Infinity : v === '+inf' ? Infinity : Number(v));

export const kv = {
  async get(k) {
    if (!hasStore()) return alive(k) ? structuredClone(alive(k).v) : null;
    const v = await redis('GET', P + k);
    return v == null ? null : JSON.parse(v);
  },
  async set(k, v, ttl = KEEP) {
    if (hasStore()) await redis('SET', P + k, JSON.stringify(v), 'EX', ttl);
    else mem.kv.set(k, { v: structuredClone(v), x: clock.now() + ttl * 1000 });
  },
  /** True only the first time (per ttl). */
  async once(k, ttl = KEEP) {
    if (hasStore()) return (await redis('SET', P + k, '1', 'NX', 'EX', ttl)) === 'OK';
    if (alive(k)) return false;
    mem.kv.set(k, { v: 1, x: clock.now() + ttl * 1000 });
    return true;
  },
  async del(k) {
    if (hasStore()) await redis('DEL', P + k);
    else mem.kv.delete(k);
  },
  /** Counts up; the key ends `ttl` seconds after the first count. */
  async incr(k, ttl) {
    if (hasStore()) {
      const n = await redis('INCR', P + k);
      if (n === 1) await redis('EXPIRE', P + k, ttl);
      return n;
    }
    const e = alive(k) || { v: 0, x: clock.now() + ttl * 1000 };
    e.v += 1;
    mem.kv.set(k, e);
    return e.v;
  },
};

/** Sorted sets. */
export const z = {
  async add(k, score, member, nx = false) {
    if (hasStore()) return redis('ZADD', P + k, ...(nx ? ['NX'] : []), score, member);
    const s = zOf(k);
    if (nx && s.has(member)) return 0;
    s.set(member, Number(score));
    return 1;
  },
  async rem(k, member) {
    if (hasStore()) return redis('ZREM', P + k, member);
    return zOf(k).delete(member) ? 1 : 0;
  },
  /** Members with min ≤ score ≤ max, lowest first. */
  async range(k, min, max, limit = 100) {
    if (hasStore()) return redis('ZRANGEBYSCORE', P + k, min, max, 'LIMIT', 0, limit);
    return [...zOf(k)].filter(([, s]) => s >= num(min) && s <= num(max)).sort((a, b) => a[1] - b[1]).slice(0, limit).map(([m]) => m);
  },
  /** The newest members first. */
  async last(k, n) {
    if (hasStore()) return redis('ZREVRANGE', P + k, 0, n - 1);
    return [...zOf(k)].sort((a, b) => b[1] - a[1]).slice(0, n).map(([m]) => m);
  },
  /** The oldest member with its score, or null. */
  async first(k) {
    if (hasStore()) {
      const r = await redis('ZRANGE', P + k, 0, 0, 'WITHSCORES');
      return r.length ? { member: r[0], score: Number(r[1]) } : null;
    }
    const [f] = [...zOf(k)].sort((a, b) => a[1] - b[1]);
    return f ? { member: f[0], score: f[1] } : null;
  },
  async card(k) {
    if (hasStore()) return Number(await redis('ZCARD', P + k));
    return zOf(k).size;
  },
  async count(k, min, max) {
    if (hasStore()) return Number(await redis('ZCOUNT', P + k, min, max));
    return [...zOf(k).values()].filter((s) => s >= num(min) && s <= num(max)).length;
  },
  async trim(k, max) {
    if (hasStore()) return redis('ZREMRANGEBYSCORE', P + k, '-inf', max);
    const s = zOf(k);
    for (const [m, sc] of s) if (sc <= num(max)) s.delete(m);
  },
};

/** Counters in one hash. */
export const h = {
  async incr(k, field, by = 1) {
    if (hasStore()) return redis('HINCRBY', P + k, field, by);
    const m = hOf(k);
    m.set(field, (m.get(field) || 0) + by);
    return m.get(field);
  },
  async all(k) {
    if (!hasStore()) return Object.fromEntries(hOf(k));
    const flat = (await redis('HGETALL', P + k)) || [];
    const out = {};
    for (let i = 0; i < flat.length; i += 2) out[flat[i]] = Number(flat[i + 1]);
    return out;
  },
};

// One step for Redis, so two calls running together can never both take the last place of the hour:
// drops what is older than the window, and adds the member only if there is room (or it is already in).
const TAKE = `redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[5])
if redis.call('ZSCORE', KEYS[1], ARGV[4]) then return 1 end
if redis.call('ZCARD', KEYS[1]) >= tonumber(ARGV[3]) then return 0 end
redis.call('ZADD', KEYS[1], ARGV[1], ARGV[4])
redis.call('PEXPIRE', KEYS[1], ARGV[2])
return 1`;

/**
 * Takes one of the `cap` places of the last `windowMs` for `member`. False when the window is full.
 * Asking again for the same member is free: it holds one place only.
 */
export async function takePlace(k, member, cap, windowMs, now = clock.now()) {
  if (hasStore()) {
    try {
      return Number(await redis('EVAL', TAKE, 1, P + k, now, windowMs, cap, member, now - windowMs)) === 1;
    } catch (e) {
      // no scripts on this Redis: the same steps one by one (two calls together could pass the cap by one)
      console.warn('[ig] rate script', e.message);
      await redis('ZREMRANGEBYSCORE', P + k, '-inf', now - windowMs);
      if ((await redis('ZSCORE', P + k, member)) != null) return true;
      if (Number(await redis('ZCARD', P + k)) >= cap) return false;
      await redis('ZADD', P + k, now, member);
      return true;
    }
  }
  const s = zOf(k);
  for (const [m, sc] of s) if (sc <= now - windowMs) s.delete(m);
  if (s.has(member)) return true;
  if (s.size >= cap) return false;
  s.set(member, now);
  return true;
}

/** The latest leads' ids, newest first. */
export async function leadIds(n) {
  return z.last('leads', n);
}

/** Many keys at once. */
export async function getMany(keys) {
  if (!keys.length) return [];
  if (!hasStore()) return keys.map((k) => (alive(k) ? structuredClone(alive(k).v) : null));
  return (await redis('MGET', ...keys.map((k) => P + k))).map((r) => (r ? JSON.parse(r) : null));
}
