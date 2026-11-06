// Omnya City (5/11/2026): every follower who comments HOUSE gets a house in the 3D city.
// ManyChat asks /api/city/link for a personal one-time link, the link reserves the next free lot.
// Redis keeps only username, lot number and date: the house itself is drawn from the username.
//
//   omnya:city:n            counter, the last lot handed out (INCR, so two people never get the same lot)
//   omnya:city:houses       sorted set, score = lot number, member = username
//   omnya:city:ep2          the first house number of Ep.2 (from there: penthouse, villas, floors)
//   omnya:city:u:<name>     JSON { u, n, t, ig } for that profile (SET NX: one profile, one house)
//   omnya:city:tok:<token>  JSON { u, ig }, the one-time link (7 days, deleted with GETDEL when used)
//   omnya:city:ut:<name>    the open token of that profile, so asking twice gives the same link
//   omnya:city:used:<token> who used it (60 days): the old DM button then opens that person's house
//
// Without Redis (local preview) a small in-memory copy of the same commands stands in.
import { redis, hasStore } from './store.js';

const P = 'omnya:city:';
const TOKEN_TTL = 7 * 86_400;

const mem = { kv: new Map(), z: new Map() };
const memExpired = (k) => {
  const e = mem.kv.get(k);
  if (e && e.x && e.x < Date.now()) mem.kv.delete(k);
  return !mem.kv.has(k);
};
/** The handful of Redis commands this file uses, on memory. */
function memCmd(op, ...a) {
  switch (op) {
    case 'GET': return memExpired(a[0]) ? null : mem.kv.get(a[0]).v;
    case 'GETDEL': { const v = memCmd('GET', a[0]); mem.kv.delete(a[0]); return v; }
    case 'DEL': return mem.kv.delete(a[0]) ? 1 : 0;
    case 'SET': {
      const [k, v, ...o] = a;
      if (o.includes('NX') && !memExpired(k)) return null;
      const ex = o.indexOf('EX');
      mem.kv.set(k, { v: String(v), x: ex >= 0 ? Date.now() + o[ex + 1] * 1000 : 0 });
      return 'OK';
    }
    case 'INCR': { const n = Number(memCmd('GET', a[0]) || 0) + 1; mem.kv.set(a[0], { v: String(n), x: 0 }); return n; }
    case 'ZADD': mem.z.set(a[2], Number(a[1])); return 1;
    case 'ZRANGE': return [...mem.z].sort((x, y) => x[1] - y[1]).flatMap(([m, s]) => [m, String(s)]);
    case 'ZSCORE': return mem.z.has(a[1]) ? String(mem.z.get(a[1])) : null;
    case 'ZRANGEBYSCORE': return [...mem.z].filter(([, s]) => s >= Number(a[1]) && s <= Number(a[2])).sort((x, y) => x[1] - y[1]).map(([m]) => m);
    default: throw new Error(`mem: ${op}`);
  }
}
const cmd = (...c) => (hasStore() ? redis(...c) : memCmd(...c));

/** Instagram usernames: letters, numbers, dot and underscore, up to 30. Anything else is not a username. */
export function cleanName(raw) {
  const u = String(raw ?? '').trim().replace(/^@+/, '').toLowerCase();
  return /^[a-z0-9._]{1,30}$/.test(u) ? u : '';
}

const newToken = () => {
  const b = new Uint8Array(15);
  crypto.getRandomValues(b);
  return Buffer.from(b).toString('base64url');
};

export async function houseOf(u) {
  const h = await cmd('GET', `${P}u:${u}`);
  if (!h || h === 'pending') return null;
  return JSON.parse(h);
}

/** The personal link for this profile: its house if it has one, else a one-time reservation link. */
export async function linkFor(u, ig) {
  const h = await houseOf(u);
  if (h) return { house: h };
  const open = await cmd('GET', `${P}ut:${u}`);
  if (open && (await cmd('GET', `${P}tok:${open}`))) return { token: open };
  const token = newToken();
  await cmd('SET', `${P}tok:${token}`, JSON.stringify({ u, ig: ig || '' }), 'EX', TOKEN_TTL);
  await cmd('SET', `${P}ut:${u}`, token, 'EX', TOKEN_TTL);
  return { token };
}

/** Who a token belongs to, without using it (the page shows the name before the tap). */
export async function peek(token) {
  if (!/^[A-Za-z0-9_-]{10,40}$/.test(token || '')) return null;
  const t = await cmd('GET', `${P}tok:${token}`);
  // a used link still opens its owner's house (people tap the DM button again days later)
  const u = t ? JSON.parse(t).u : await cmd('GET', `${P}used:${token}`);
  if (!u) return null;
  return { u, house: await houseOf(u) };
}

/**
 * Uses the token and gives its profile the next free lot.
 * GETDEL burns the token in the same step that reads it, SET NX on the profile stops a second
 * house for the same name, INCR hands out the lot. Returns { house, fresh } or { error }.
 */
export async function reserve(token) {
  if (!/^[A-Za-z0-9_-]{10,40}$/.test(token || '')) return { error: 'used' };
  const t = await cmd('GETDEL', `${P}tok:${token}`);
  if (!t) return { error: 'used' };
  const { u, ig } = JSON.parse(t);
  await cmd('DEL', `${P}ut:${u}`);
  await cmd('SET', `${P}used:${token}`, u, 'EX', 60 * 86_400);
  const lock = await cmd('SET', `${P}u:${u}`, 'pending', 'NX');
  if (lock !== 'OK') {
    const h = await houseOf(u);
    return h ? { house: h, fresh: false } : { error: 'busy' };
  }
  try {
    const n = Number(await cmd('INCR', `${P}n`));
    // Ep.2 (6/11/2026): the first house reserved with this code marks where the new places start
    // (penthouse, villas in Omnyawood, floors). SET NX: set once, so the houses before it never move.
    await cmd('SET', `${P}ep2`, n, 'NX');
    const house = { u, n, t: Date.now(), ig: ig || '' };
    await cmd('SET', `${P}u:${u}`, JSON.stringify(house));
    await cmd('ZADD', `${P}houses`, n, u);
    return { house, fresh: true };
  } catch (e) {
    await cmd('DEL', `${P}u:${u}`).catch(() => {});
    throw e;
  }
}

/** The first house number of Ep.2, or null before anyone reserved with the Ep.2 code. */
export async function ep2From() {
  const v = await cmd('GET', `${P}ep2`);
  return v ? Number(v) : null;
}

/** Every house as [username, lot], in lot order: what the map draws. */
export async function allHouses() {
  const flat = await cmd('ZRANGE', `${P}houses`, 0, -1, 'WITHSCORES');
  const out = [];
  for (let i = 0; i < flat.length; i += 2) out.push([flat[i], Number(flat[i + 1])]);
  return out;
}

/** The profile on lot n (the neighbour is lot n + 1). */
export async function onLot(n) {
  const r = await cmd('ZRANGEBYSCORE', `${P}houses`, n, n);
  return r[0] || null;
}
