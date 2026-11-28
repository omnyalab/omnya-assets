// THE 3D FUTURE, the builds feed of the members' page (26/11, Nico: «Everything you build, you post inside the club. Think
// of it as an Instagram made only of 3D… you get likes, comments and shares, and I look at every single post and write to
// you privately with what works and what I'd change»). A member posts the link of a build, then a photo of it; every
// member sees it with likes, comments and shares; Nico gets it by email to answer privately and can hide it.
// Nothing here is invented: the feed is only what members posted. Few Redis commands per call (the free plan counts them):
//   posts  HASH  id → post JSON            counts HASH  l:<id> likes · c:<id> comments · s:<id> shares
//   liked  SET   per member, the ids they like      cmts LIST per post, comment JSON      img STRING per post, the photo
import { profilesOf, getProfile, getProgress } from './club-me.js';
import { createHmac, randomBytes } from 'node:crypto';
import { kv } from './store.js';
import { sendMail } from './mail.js';
import { host } from './config.js';
import { KEYS, PREVIEW_EMAIL, EARLY, cleanEmail, firstName, insideUrl, LESSONS } from './club.js';

const FK = {
  posts: 'omnya:club:feed:posts',
  n: 'omnya:club:feed:n',
  liked: (e) => `omnya:club:feed:liked:${e}`,
  cmts: (id) => `omnya:club:feed:c:${id}`,
  img: (id) => `omnya:club:feed:img:${id}`,
};
export { FK as FEED_KEYS };
const SITE_URL = 'https://www.omnyalab.com';
export const MAX_IMG = 700_000; // the photo as a data URL, made small by the page (about 1600 px, JPEG or WebP)
export const ID = /^[a-z0-9]{8,24}$/;
export const LINK = /^https?:\/\/[^\s]+\.[^\s]+$/i;
const IMG = /^data:(image\/(?:jpeg|webp|png));base64,([A-Za-z0-9+/=]+)$/;

/** the key that signs Nico's «hide this post» link (the member-link key, with its own word) */
const signKey = () => process.env.CLUB_SECRET || (process.env.STRIPE_WEBHOOK_SECRET ? createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET).update('omnya-club-token').digest('hex') : '');
export const hideSig = (id) => { const k = signKey(); return k ? createHmac('sha256', k).update(`hide|${id}`).digest('base64url').slice(0, 22) : ''; };
export const hideOk = (id, sig) => !!sig && ID.test(id) && hideSig(id) === sig;

/** Who is asking: the member behind a link, with what the feed shows of them. null = no feed (left, or not a member). */
export async function feedMember(email) {
  const e = cleanEmail(email);
  if (e === PREVIEW_EMAIL) return { email: e, name: 'Nico', nico: true, founder: false, open: true };
  let m = null; try { m = JSON.parse((await kv('HGET', KEYS.members, e)) || 'null'); } catch {}
  if (!m || m.status === 'canceled') return null;
  // 27/11 (Nico: never anyone's place in line): founder is yes/no, the rank stays on the server
  const founder = m.reserved && Number(m.rank) > 0 && Number(m.rank) <= 100;
  // a reservation reads the feed; posting starts when the doors open and the first month is paid (welcomed)
  // 27/11: the name the member chose in their profile (api/_lib/club-me.js) wins over the one of the payment
  const prof = (await profilesOf([e]))[e];
  return { email: e, name: prof?.name || firstName(m.name), nico: false, founder, open: !m.reserved || !!m.welcomed };
}

const pub = (p, counts, mine, me) => ({
  email: p.email, id: p.id, at: p.at, name: p.name, link: p.link, caption: p.caption || '', founder: !!p.founder, nico: !!p.nico,
  img: p.img ? `/api/club/img?id=${p.id}` : '', w: p.w || 0, h: p.h || 0,
  likes: Number(counts[`l:${p.id}`]) || 0, comments: Number(counts[`c:${p.id}`]) || 0, shares: Number(counts[`s:${p.id}`]) || 0,
  liked: mine.has(p.id), mine: p.email === me.email, ...(me.nico ? { hidden: !!p.hidden } : {}),
});
const asMap = (arr) => { const o = {}; for (let i = 0; i + 1 < (arr || []).length; i += 2) o[arr[i]] = arr[i + 1]; return o; };

/** 28/11 (Nico: «se uno schiaccia sul profilo di una persona sul feed va dentro il suo profilo, solo vedere, non tutte le cose»):
 * a member is known on the page by a signed id, never by the email. */
export const uidOf = (email) => createHmac('sha256', signKey() || 'omnya-club-uid').update(`uid|${cleanEmail(email)}`).digest('base64url').slice(0, 16);
const romeDay = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(d);
/** the last six weeks (Monday first, Rome), oldest first: true when there was some course watched that week */
function weeksOf(w = {}) {
  const now = new Date(), wd = (new Date(romeDay(now) + 'T12:00:00Z').getUTCDay() + 6) % 7, mon = +now - wd * 864e5;
  return Array.from({ length: 6 }, (_, i) => { const back = 5 - i; let s = 0; for (let j = 0; j < 7; j++) s += Number(w[romeDay(new Date(mon - back * 7 * 864e5 + j * 864e5))]) || 0; return s > 0; });
}
/** What anyone in the club can see of a member: name, photo, background, line, Instagram, badges earned, weeks, their builds.
 * Never the email, the date they joined, how long they studied, their place in line. */
export async function publicProfile(uid) {
  if (!/^[A-Za-z0-9_-]{16}$/.test(String(uid || ''))) return null;
  const rows = asMap(await kv('HGETALL', FK.posts)), all = [];
  for (const v of Object.values(rows)) { try { all.push(JSON.parse(v)); } catch {} }
  const emails = new Set([PREVIEW_EMAIL, ...all.map((p) => p.email)]);
  const email = [...emails].find((e) => uidOf(e) === uid); if (!email) return null;
  const who = await feedMember(email); if (!who) return null;
  const [prof, prog] = await Promise.all([getProfile(email), getProgress(email)]);
  const posts = all.filter((p) => p.email === email && !p.hidden).sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 30)
    .map((p) => ({ id: p.id, link: p.link, caption: p.caption || '', img: p.img ? `/api/club/img?id=${p.id}` : '' }));
  const done = LESSONS.every((l) => prog.d.includes(l.n)), earned = [(who.founder || who.nico) && 'founder', posts.length > 0 && 'first', done && 'tower'].filter(Boolean);
  return { name: prof.name || who.name, av: prof.av, cover: prof.cover, bio: prof.bio, ig: prof.ig, founder: !!who.founder, nico: !!who.nico,
    posted: posts.length > 0, done, badge: earned.includes(prof.badge) ? prof.badge : earned[0] || '', weeks: weeksOf(prog.w), posts };
}

/** The feed, newest first: 3 commands whatever the number of posts. Hidden posts only for Nico (marked hidden). */
export async function feed(me) {
  const [rows, counts, liked] = [asMap(await kv('HGETALL', FK.posts)), asMap(await kv('HGETALL', FK.n)), new Set((await kv('SMEMBERS', FK.liked(me.email))) || [])];
  const posts = [];
  for (const v of Object.values(rows)) { try { const p = JSON.parse(v); if (!p.hidden || me.nico) posts.push(pub(p, counts, liked, me)); } catch {} }
  posts.sort((a, b) => (a.at < b.at ? 1 : -1));
  const top = posts.slice(0, 200), pr = await profilesOf(top.map((p) => p.email)).catch(() => ({}));
  // 27/11: the name and photo each member has now in their profile (an old post follows a new name)
  for (const p of top) { const x = pr[p.email]; if (x) { if (x.name) p.name = x.name; p.av = x.av; } p.u = uidOf(p.email); delete p.email; }
  return { posts: top, me: { name: me.name, founder: me.founder, nico: me.nico, canPost: me.open, av: (await profilesOf([me.email]).catch(() => ({})))[me.email]?.av || '' } };
}

/** A new post: link (required), photo (data URL, optional but asked by the page), caption. Nico gets it by email. */
export async function addPost(me, { link, caption, img, w, h }) {
  const id = Date.now().toString(36) + randomBytes(4).toString('hex');
  let photo = '';
  if (img) { const m = IMG.exec(img); if (!m || img.length > MAX_IMG) throw Object.assign(new Error('bad image'), { code: 'bad_image' }); photo = img; }
  const p = { id, at: new Date().toISOString(), email: me.email, name: me.name, link, caption, founder: me.founder, nico: me.nico, img: photo ? 1 : 0, w: Number(w) || 0, h: Number(h) || 0 };
  if (photo) await kv('SET', FK.img(id), photo.slice(5)); // 'image/jpeg;base64,…'
  await kv('HSET', FK.posts, id, JSON.stringify(p));
  await kv('RPUSH', KEYS.builds, JSON.stringify({ at: p.at, email: me.email, name: me.name, link, note: caption, post: id })).catch(() => {});
  await kv('SADD', KEYS.posters, me.email).catch(() => {});
  const hide = `${SITE_URL}/api/club/hide?id=${id}&t=${hideSig(id)}`;
  const text = `${me.name} <${me.email}> posted a build in the club feed:\n${link}\n\n${caption || '(no caption)'}\n${photo ? `\nPhoto: ${SITE_URL}/api/club/img?id=${id}\n` : ''}\nReply to this email to answer them privately.\n\nHide this post from the feed: ${hide}`;
  await sendMail({ to: host.email, replyTo: me.email, subject: `[club] post from ${me.name}`, text }).catch((e) => console.error('[club] post mail', e.message));
  const [counts] = [asMap(await kv('HGETALL', FK.n))];
  const out = pub(p, counts, new Set(), me); delete out.email; return out;
}

async function getPost(id) {
  if (!ID.test(String(id || ''))) return null;
  try { return JSON.parse((await kv('HGET', FK.posts, id)) || 'null'); } catch { return null; }
}

/** Like or unlike (on = true/false): the member's set says whether it changed, the count moves only then. */
export async function like(me, id, on) {
  const p = await getPost(id); if (!p || (p.hidden && !me.nico)) return null;
  const changed = Number(await kv(on ? 'SADD' : 'SREM', FK.liked(me.email), id));
  const n = changed ? Number(await kv('HINCRBY', FK.n, `l:${id}`, on ? 1 : -1)) : Number(asMap(await kv('HGETALL', FK.n))[`l:${id}`]) || 0;
  return { likes: Math.max(0, n), liked: on };
}

export async function comments(me, id) {
  const p = await getPost(id); if (!p || (p.hidden && !me.nico)) return null;
  const rows = (await kv('LRANGE', FK.cmts(id), 0, 199)) || [];
  return rows.map((r) => { try { const c = JSON.parse(r); return c.hidden ? null : { id: c.id, at: c.at, name: c.name, text: c.text, nico: !!c.nico, mine: c.email === me.email }; } catch { return null; } }).filter(Boolean);
}

export async function addComment(me, id, text) {
  const p = await getPost(id); if (!p || (p.hidden && !me.nico)) return null;
  const c = { id: Date.now().toString(36) + randomBytes(3).toString('hex'), at: new Date().toISOString(), email: me.email, name: me.name, text, nico: me.nico };
  await kv('RPUSH', FK.cmts(id), JSON.stringify(c));
  const n = Number(await kv('HINCRBY', FK.n, `c:${id}`, 1));
  // the author hears about it by email? Not now: Nico decides (one email per comment can be a lot)
  return { comment: { id: c.id, at: c.at, name: c.name, text: c.text, nico: c.nico, mine: true }, comments: n };
}

export async function share(me, id) {
  const p = await getPost(id); if (!p || (p.hidden && !me.nico)) return null;
  return { shares: Number(await kv('HINCRBY', FK.n, `s:${id}`, 1)) };
}

/** Nico hides (or shows again) a post: from the link in his email or from his own page. */
export async function setHidden(id, hidden) {
  const p = await getPost(id); if (!p) return null;
  p.hidden = !!hidden;
  await kv('HSET', FK.posts, id, JSON.stringify(p));
  return { id, hidden: p.hidden };
}

/** The photo of a post: [contentType, bytes] or null */
export async function photo(id) {
  if (!ID.test(String(id || ''))) return null;
  const v = await kv('GET', FK.img(id)); if (!v) return null;
  const m = /^(image\/(?:jpeg|webp|png));base64,(.+)$/.exec(v); if (!m) return null;
  return [m[1], Buffer.from(m[2], 'base64')];
}

/** «Write to Nico» from the menu: an email to Nico, the reply goes to the member. */
export async function noteMessage(me, text) {
  await sendMail({ to: host.email, replyTo: me.email, subject: `[club] message from ${me.name}`, text: `${me.name} <${me.email}> wrote from the club page:\n\n${text}\n\nReply to this email to answer them.` });
}
/** Friday's course email (N1): on for everyone unless they turn it off in the menu */
export async function setRemind(me, on) {
  await kv(on ? 'SREM' : 'SADD', KEYS.notifyOff, me.email);
  return { on: !!on };
}
/** N1, sent only when Nico says the course is online (POST /api/club/notify with the admin key, never by itself): one
    plain email to every member who is in and did not turn it off. test = one address only (Nico's check). The day is
    marked like the other launch emails (omnya:mail:day), so the drip sends nothing else to them that day. */
export async function notifyCourse({ subject, text, test }, mark) {
  const all = (await kv('HGETALL', KEYS.members)) || [], off = new Set((await kv('SMEMBERS', KEYS.notifyOff)) || []);
  const to = [];
  for (let i = 1; i < all.length; i += 2) { try { const m = JSON.parse(all[i]); if (m.status !== 'canceled' && (!m.reserved || m.welcomed) && !off.has(m.email)) to.push(m); } catch {} }
  const list = test ? [{ email: cleanEmail(test), name: 'Nico' }] : to;
  let sent = 0; const failed = [];
  for (const m of list) {
    const body = String(text).replace(/\{name\}/g, m.name || 'there').replace(/\{link\}/g, insideUrl(m.email));
    try { await sendMail({ to: `${m.name} <${m.email}>`, replyTo: host.email, subject, text: body }); sent++; if (!test && mark) await mark(m.email).catch(() => {}); }
    catch (e) { failed.push(m.email); console.error('[club] notify', e.message); }
  }
  return { members: to.length, sent, failed, test: !!test };
}
