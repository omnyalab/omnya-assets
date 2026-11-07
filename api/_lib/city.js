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
    case 'SADD': { const set = mem.kv.get(a[0])?.s || new Set(); set.add(a[1]); mem.kv.set(a[0], { s: set, x: 0 }); return 1; }
    case 'SMEMBERS': return [...(mem.kv.get(a[0])?.s || [])];
    case 'SISMEMBER': return mem.kv.get(a[0])?.s?.has(a[1]) ? 1 : 0;
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
    let n = Number(await cmd('INCR', `${P}n`));
    while (await onLot(n)) n = Number(await cmd('INCR', `${P}n`)); // a place someone bought or was moved to
    // Ep.2 (6/11/2026): the first house reserved with this code marks where the new places start
    // (penthouse, villas in Omnyawood, floors). SET NX: set once, so the houses before it never move.
    if (EP2_LIVE) await cmd('SET', `${P}ep2`, n, 'NX');
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

// ---------- Ep.2 upsell (6/11/2026): places that are only bought ----------
// €0.99 each, never given for free, so nobody is ever moved out: 3 penthouses (house numbers PREM + 0..2) and the
// 10 villas of Omnyawood's top terrace (PREM + 3..12). Same order as `premium` in public/city/world.js.
// The Stripe links stop after 3 and 10 payments. The buyer's old place becomes free.
// THE SWITCH (same as EP2_LIVE in public/city/world.js): false until the Ep.2 reel goes out.
export const EP2_LIVE = true;
export const PREM = 100000;
// 7/11 (Nico): 20 townhouses on the water at €0.99 (tranches of 6, 6, 8) and 10 seafront villas at €2.99 (2 at a time).
// Same order as `premium` in public/city/world.js (appended after the 13 places sold on 6/11).
const RANGE = { penthouse: [PREM, PREM + 3], villa: [PREM + 3, PREM + 13], town: [PREM + 13, PREM + 33], sea: [PREM + 33, PREM + 43] };
export const TRANCHES = { town: [6, 6, 8], sea: [2, 2, 2, 2, 2] };
export const PRICES = { town: 99, sea: 299, sky: 99, fountain: 99 }; // cents, sold with our own Stripe Checkout (api/city.js → buy)
export const TITLES = { town: 'A townhouse on the water', sea: 'A seafront villa', sky: 'The penthouse', fountain: 'A house by the fountain' };
/** Where the current tranche stands: { no, left, size, upTo } (upTo = how many are out so far, e.g. 12). */
export function tranche(kind, left) {
  const t = TRANCHES[kind], total = t.reduce((a, b) => a + b, 0), sold = total - left;
  let upTo = 0;
  for (let i = 0; i < t.length; i++) { upTo += t[i]; if (sold < upTo) return { no: i + 1, left: upTo - sold, size: t[i], upTo, total }; }
  return { no: t.length, left: 0, size: t[t.length - 1], upTo: total, total };
}
// The 8 houses around the fountain (the 8 lots closest to it). Bought for €0.99: whoever lived there moves to a free villa
// in Omnyawood (never somewhere worse). A house someone paid for can't be bought again; the Stripe link stops after 8.
export const FOUNTAIN = [1, 2, 3, 4, 5, 6, 7, 8];
// the top floors of the main tower and of the two 30-floor towers (W.seq with ep2 = 211), sold on 7/11
export const SKY = [211, 375, 405];
const isPaid = async (u) => !!u && Number(await cmd('SISMEMBER', `${P}paid`, u)) === 1;
async function fountainFree() { for (const n of FOUNTAIN) if (!(await isPaid(await onLot(n)))) return n; return null; }
async function freeVillaOnly() { // a free villa of Omnyawood only (odd numbers from ep2, while the villas last)
  const e = await ep2From(); if (!e) return null;
  for (let i = 1; i < 50; i += 2) if (!(await onLot(e + i))) return e + i;
  return null;
}
async function firstFree(kind) {
  const [a, b] = RANGE[kind];
  for (let n = a; n < b; n++) if (!(await onLot(n))) return n;
  return null;
}

/** What can still be bought: { penthouse, villa, fountain } true while one is free, and `left`: how many of each (7/11). */
export async function forSale() {
  if (!EP2_LIVE) return { penthouse: false, villa: false, fountain: false, left: { penthouse: 0, villa: 0, fountain: 0 } };
  const count = async (kind) => { const [a, b] = RANGE[kind]; let k = 0; for (let n = a; n < b; n++) if (!(await onLot(n))) k++; return k; };
  const fountainLeft = async () => { let k = 0; for (const n of FOUNTAIN) if (!(await isPaid(await onLot(n)))) k++; return k; };
  const [p, v, f, t, s, k] = await Promise.all([count('penthouse'), count('villa'), fountainLeft(), count('town'), count('sea'), (async () => { let c = 0; for (const n of SKY) if (!(await isPaid(await onLot(n)))) c++; return c; })()]);
  return { penthouse: p > 0, villa: v > 0, fountain: f > 0, town: t > 0, sea: s > 0, sky: k > 0, left: { penthouse: p, villa: v, fountain: f, town: t, sea: s, sky: k },
    tranche: { town: tranche('town', t), sea: tranche('sea', s) } };
}

/** Moves a buyer to the first free penthouse or top villa. kind: 'penthouse' | 'villa'. */
export async function stockOf(kind) { if (kind === 'sky' || kind === 'fountain') return (await forSale()).left[kind]; const [a, b] = RANGE[kind] || [0, 0]; let k = 0; for (let n = a; n < b; n++) if (!(await onLot(n))) k++; return k; }

export async function upgrade(u, kind) {
  if (!EP2_LIVE) return { error: 'Ep.2 not live yet' };
  const me = await houseOf(u);
  if (!me) return { error: 'no house' };
  if (kind === 'sky') {
    // 7/11 (Nico): the penthouses of the 3 towers not sold on 6/11 (main tower #211, the two 30-floor towers #375 and #405).
    // Whoever lives there now swaps with the buyer (gets the buyer's old house), same as the fountain houses.
    if (SKY.includes(me.n)) return { error: 'already there' };
    let n = null; for (const k of SKY) if (!(await isPaid(await onLot(k)))) { n = k; break; }
    if (!n) return { error: 'sold out' };
    const was = await onLot(n);
    let moved = null;
    if (was) {
      const h = await houseOf(was);
      await cmd('SET', `${P}u:${was}`, JSON.stringify({ ...h, n: me.n, from: n, moved: Date.now() }));
      await cmd('ZADD', `${P}houses`, me.n, was);
      moved = { u: was, from: n, to: me.n };
    }
    await cmd('SET', `${P}u:${u}`, JSON.stringify({ ...me, n, from: me.n, bought: Date.now() }));
    await cmd('ZADD', `${P}houses`, n, u);
    await cmd('SADD', `${P}paid`, u);
    return { house: { u, from: me.n, n }, moved };
  }
  if (kind === 'fountain') {
    if (FOUNTAIN.includes(me.n)) return { error: 'already there' };
    const n = await fountainFree();
    if (!n) return { error: 'sold out' };
    const was = await onLot(n);
    let moved = null;
    if (was) {
      // 7/11 fix: when the free villas were gone, freeVilla() fell back to any empty lot (#484, #507);
      // now the neighbour gets a free villa or, failing that, the buyer's old house (a straight swap)
      const to = (await freeVillaOnly()) || me.n;
      const h = await houseOf(was);
      await cmd('SET', `${P}u:${was}`, JSON.stringify({ ...h, n: to, from: n, moved: Date.now() }));
      await cmd('ZADD', `${P}houses`, to, was);
      moved = { u: was, from: n, to };
    }
    await cmd('SET', `${P}u:${u}`, JSON.stringify({ ...me, n, from: me.n, bought: Date.now() }));
    await cmd('ZADD', `${P}houses`, n, u);
    await cmd('SADD', `${P}paid`, u);
    return { house: { u, from: me.n, n }, moved };
  }
  if (!RANGE[kind]) return { error: 'kind' };
  if (me.n >= RANGE[kind][0] && me.n < RANGE[kind][1]) return { error: 'already has one' };
  const n = await firstFree(kind);
  if (!n) return { error: 'sold out' };
  await cmd('SET', `${P}u:${u}`, JSON.stringify({ ...me, n, from: me.n, bought: Date.now() }));
  await cmd('ZADD', `${P}houses`, n, u);
  return { house: { u, from: me.n, n } };
}

// ---------- 7/11/2026: the yacht and the island, one of each, sold by auction ----------
// A bid is a Stripe Checkout with capture_method 'manual': the money is only held on the card. A higher bid releases the
// previous hold; when the timer ends the winner's hold is captured. The 12-hour timer starts with the first bid, and a bid in
// the last 5 minutes pushes the end to 5 minutes from then. Starting bid €3.99, each bid at least €1 more.
//   omnya:city:auc:<item>   JSON { top: { u, amt, pi, t } | null, end, done, hist: [{ u, amt, t }] }
export const AUCTIONS = { yacht: { title: 'The Yacht', start: 399 }, island: { title: 'The Island', start: 399 } };
export const AUC_MS = 12 * 3600e3, SNIPE_MS = 5 * 60e3, STEP = 100;

export async function auctionState(item) {
  const v = await cmd('GET', `${P}auc:${item}`);
  return v ? JSON.parse(v) : { top: null, end: null, done: false, hist: [] };
}
export const minBid = (item, st) => (st.top ? st.top.amt + STEP : AUCTIONS[item].start);
export const auctionOpen = (st) => !st.done && (!st.end || Date.now() < st.end);

async function withLock(key, fn) {
  for (let i = 0; i < 40; i++) {
    if ((await cmd('SET', `${P}lock:${key}`, '1', 'NX', 'EX', 15)) === 'OK') {
      try { return await fn(); } finally { await Promise.resolve(cmd('DEL', `${P}lock:${key}`)).catch(() => {}); }
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error('lock');
}

/** A held payment arrived (webhook): becomes the top bid if it is still high enough. Returns { ok, prev } or { error }. */
export async function placeBid(item, { u, amt, pi }) {
  if (!AUCTIONS[item]) return { error: 'item' };
  return withLock(`auc:${item}`, async () => {
    const st = await auctionState(item), now = Date.now();
    if (!auctionOpen(st)) return { error: 'ended' };
    if (amt < minBid(item, st)) return { error: 'outbid' };
    const prev = st.top;
    st.top = { u, amt, pi, t: now };
    st.end = !st.end ? now + AUC_MS : Math.max(st.end, now + SNIPE_MS);
    st.hist = [{ u, amt, t: now }, ...(st.hist || [])].slice(0, 8);
    await cmd('SET', `${P}auc:${item}`, JSON.stringify(st));
    return { ok: true, prev, end: st.end };
  });
}

/** After the timer: marks the auction done once (the caller captures the payment). Returns the state if it just ended. */
export async function closeAuction(item) {
  return withLock(`auc:${item}`, async () => {
    const st = await auctionState(item);
    if (st.done || !st.end || Date.now() < st.end || !st.top) return null;
    st.done = true;
    await cmd('SET', `${P}auc:${item}`, JSON.stringify(st));
    return st;
  });
}
export async function markAuction(item, patch) {
  const st = await auctionState(item);
  await cmd('SET', `${P}auc:${item}`, JSON.stringify({ ...st, ...patch }));
}
/** What the pages show: no payment ids. */
export async function publicAuctions() {
  const out = {};
  for (const item of Object.keys(AUCTIONS)) {
    const st = await auctionState(item);
    out[item] = { leader: st.top?.u || null, bid: st.top?.amt || 0, min: minBid(item, st), end: st.end, done: !!st.done, winner: st.done ? st.top?.u || null : null, bids: (st.hist || []).map((h) => ({ u: h.u, amt: h.amt, t: h.t })) };
  }
  return out;
}
