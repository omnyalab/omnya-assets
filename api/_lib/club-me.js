// 27/11 (Nico, board «Il club, com'è quando entri», A + everything else approved): what is each member's own in the club.
// - progress: the steps of the course they finished (d) and where they stopped in each video (t, seconds). A step opens only
//   when the one before is finished (90% of the video, decided by the page); saved here so it follows them on every device.
// - profile: the name they want to be called, their Instagram, one line about them and a photo (shown in the feed too).
// Redis hashes by email; the photos by a random id that changes at every upload (so the CDN can keep them for ever).
import { randomBytes } from 'node:crypto';
import { kv } from './store.js';

const K = {
  progress: 'omnya:club:progress', // hash: email → {"d":[1,2,3],"t":{"4":123}}
  profile: 'omnya:club:profile', // hash: email → {"name","ig","bio","ph"}
  avatar: 'omnya:club:avatar', // hash: photo id → JPEG, base64
};
export { K as ME_KEYS };
export const MAX_AVATAR = 260_000; // the data URL of a 512 px JPEG made small on the phone
const IG = /^[A-Za-z0-9._]{1,30}$/;

const read = async (key, email, empty) => { try { return JSON.parse((await kv('HGET', key, email)) || 'null') || empty; } catch { return empty; } };

/** { d: [finished steps, ascending], t: { step: seconds } } */
export async function getProgress(email) {
  const p = await read(K.progress, email, null);
  const d = Array.isArray(p?.d) ? p.d.filter((n) => Number.isInteger(n) && n > 0).sort((a, b) => a - b) : [];
  const t = p && typeof p.t === 'object' && p.t ? p.t : {};
  return { d: [...new Set(d)], t };
}
/** A step is open when it is the first one, or the one before it is finished. */
export const isOpen = (d, n) => n === 1 || d.includes(n - 1);
/**
 * Saves where the member is in step n (t seconds) and, with done, marks it finished. A step that is not open yet is refused,
 * so nobody can skip ahead by calling the address by hand. Returns the new progress, or null when the step is not open.
 */
export async function saveProgress(email, n, { t = 0, done = false } = {}, steps = 11) {
  n = Number(n);
  if (!Number.isInteger(n) || n < 1 || n > steps) return null;
  const p = await getProgress(email);
  if (!isOpen(p.d, n)) return null;
  if (done) { if (!p.d.includes(n)) p.d.push(n); p.d.sort((a, b) => a - b); delete p.t[n]; }
  else if (!p.d.includes(n)) { const s = Math.max(0, Math.min(36000, Math.round(Number(t) || 0))); if (s > 5) p.t[n] = s; }
  await kv('HSET', K.progress, email, JSON.stringify(p));
  return p;
}

/** { name, ig, bio, av } (av = the address of the photo, '' when there is none) */
export async function getProfile(email) {
  const p = await read(K.profile, email, {});
  return { name: String(p.name || ''), ig: String(p.ig || ''), bio: String(p.bio || ''), av: p.ph ? `/api/club/avatar?id=${p.ph}` : '' };
}
/** The profiles of many members at once (the feed): email → { name, av } */
export async function profilesOf(emails) {
  const list = [...new Set(emails.filter(Boolean))];
  if (!list.length) return {};
  let rows = [];
  try { rows = await kv('HMGET', K.profile, ...list); } catch { return {}; }
  const out = {};
  list.forEach((e, i) => { try { const p = JSON.parse(rows?.[i] || 'null'); if (p) out[e] = { name: String(p.name || ''), av: p.ph ? `/api/club/avatar?id=${p.ph}` : '' }; } catch {} });
  return out;
}
const bad = (code, msg) => Object.assign(new Error(msg), { code });
/**
 * Saves the profile. name 1-40 characters, ig without the @ (letters, numbers, . and _), bio up to 120, img a JPEG data URL
 * (a new photo), noimg true to remove it. Throws { code: 'bad_request' | 'bad_image' } with a message for the member.
 */
export async function saveProfile(email, b) {
  const name = String(b?.name ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
  const ig = String(b?.ig ?? '').trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/.*$/, '');
  const bio = String(b?.bio ?? '').replace(/\s+/g, ' ').trim().slice(0, 120);
  if (!name) throw bad('bad_request', 'Write your name.');
  if (ig && !IG.test(ig)) throw bad('bad_request', 'That Instagram name does not look right.');
  const old = await read(K.profile, email, {});
  let ph = old.ph || '';
  if (b?.img) {
    const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(b.img));
    if (!m || b.img.length > MAX_AVATAR) throw bad('bad_image', 'That photo did not work, try another one.');
    const id = randomBytes(9).toString('base64url');
    await kv('HSET', K.avatar, id, `${m[1]}:${m[2]}`);
    if (ph) await kv('HDEL', K.avatar, ph).catch(() => {});
    ph = id;
  } else if (b?.noimg && ph) { await kv('HDEL', K.avatar, ph).catch(() => {}); ph = ''; }
  await kv('HSET', K.profile, email, JSON.stringify({ name, ig, bio, ph }));
  return getProfile(email);
}
/** [content type, bytes] of a photo, or null */
export async function avatar(id) {
  if (!/^[A-Za-z0-9_-]{12}$/.test(String(id || ''))) return null;
  const v = await kv('HGET', K.avatar, id);
  if (!v) return null;
  const i = v.indexOf(':');
  return [`image/${v.slice(0, i)}`, Buffer.from(v.slice(i + 1), 'base64')];
}
