// THE 3D FUTURE, the paid monthly club of Omnya Lab (20/11, Nico). Everything api/club.js and the Stripe webhook share:
// the dates of the round, the price decision, the buyer token, the small Redis indexes and what happens when someone
// joins or leaves. Decisions of Nico on 20/11:
// - €9 a month for the first 100 members of the round, then €19. Who bought one of our guides pays €9 even after the
//   first 100. A year: €90 (for the €9 members) or €190 (for the €19 ones). Euro only.
// - Round 1 (Europe/Rome): Sat 28/11/2026 09:00 the doors open only for the waitlist (/api/optin 'waitlist-3d-future')
//   and the guide buyers, at 18:00 for everyone. Before 9:00: closed.
// - 24/11 Nico: «le porte son sempre aperte»: the doors never close. Fri 4/12/2026 23:59 ends only the founders' price
//   (€9 a month, €90 a year, for everyone who joins by then); from Sat 5/12 who joins pays €19 (€190 a year), who bought
//   one of our guides still €9 (€90).
// - The seats are the club subscriptions of round 1 that are active, trialing or past_due, read from Stripe and kept
//   60 s. Only the real number, never one written by hand.
// - The proof of a guide purchase is the Stripe receipt number (1415-7362) or the email paid with, checked here against
//   what Stripe says was paid (never an Omnya City house).
import { createHmac, timingSafeEqual } from 'node:crypto';
import { kv } from './store.js';
import { sendMail } from './mail.js';
import { host } from './config.js';
import { fixEmail } from './mail-fix.js';
import { signedHref, isGuideProduct, HOUSE_SKILL_FILE, FOUNDERS_GIFTS, DAY, CLUB_VAULT, CLUB_GUIDES, CLUB_COURSE_SKILL } from './learn-files.js';

export const ROUND = '1';
export const CLUB = '3d-future';
// Rome is on +01:00 for the whole round (CET), so the instants are fixed. FOUNDERS_END is the first moment after Fri 4/12 23:59.
export const EARLY = Date.parse('2026-11-28T09:00:00+01:00');
// 25/11 Nico: before the doors open people reserve their seat with the card (€0 today, the €9 month starts at EARLY, when
// Stripe charges the card by itself), and the founders' gift goes ONLY to the first 100 who reserve: who is only on the
// free list, or joins after the opening, gets no gift. RESERVE_FROM = when the reservations started (the seat count starts here).
export const RESERVE_FROM = Date.parse('2026-11-25T00:00:00+01:00');
// 20/11 (Nico): the Stripe customer portal is on (cancel at the end of the paid period, with the reason asked); its login link
export const PORTAL_URL = process.env.CLUB_PORTAL_URL || 'https://billing.stripe.com/p/login/9B66oGet7bIs3hAeyN8so00';
export const OPEN = Date.parse('2026-11-28T18:00:00+01:00');
export const FOUNDERS_END = Date.parse('2026-12-05T00:00:00+01:00');
export const CHEAP_SEATS = 100;
// 23/11 Nico: in the founders' round (28/11-4/12) everyone who joins pays €9 (€90 a year), locked; the 100 are now the
// founders' gifts (three playbooks + the full 3D AI Mastery course) for the first 100.
export const FOUNDERS_ROUND = true;
/** the founders' €9 for everyone: from the doors opening until Fri 4/12 23:59 Rome */
export const foundersAt = (now = Date.now()) => FOUNDERS_ROUND && now < FOUNDERS_END;
const LIVE = new Set(['active', 'trialing', 'past_due']);

/** The four live Stripe prices of the product "THE 3D FUTURE" (prod_Vf8pJEQunN0guK, 20/11), written here like the funnel
    prices of api/embed-checkout.js; the env variable, when it is set on Vercel, takes its place. Never from the page. */
export const PRICES = {
  M9: { eur: 9, env: 'CLUB_PRICE_M9', id: 'price_1UdoXdATIF7pxfqf6XDiZBM9', plan: 'month' }, // €9 a month
  M19: { eur: 19, env: 'CLUB_PRICE_M19', id: 'price_1UdoXdATIF7pxfqfuAmUNY34', plan: 'month' }, // €19 a month
  Y90: { eur: 90, env: 'CLUB_PRICE_Y90', id: 'price_1UdoXdATIF7pxfqfrq5TEnf9', plan: 'year' }, // €90 a year
  Y190: { eur: 190, env: 'CLUB_PRICE_Y190', id: 'price_1UdoXdATIF7pxfqfa6wu7qpT', plan: 'year' }, // €190 a year
};
export const priceId = (key) => (PRICES[key] ? process.env[PRICES[key].env] || PRICES[key].id : '');
export const priceIds = () => Object.keys(PRICES).map(priceId).filter(Boolean);

/** before · early (waitlist and buyers only) · open (everyone, founders' €9) · after (everyone, €19; the doors never close) */
export function phaseAt(now = Date.now()) {
  return now < EARLY ? 'before' : now < OPEN ? 'early' : now < FOUNDERS_END ? 'open' : 'after';
}

/**
 * The price decision, with nothing around it (no Stripe, no Redis), so it can be tested on its own (scripts/club-test.mjs).
 * buyer = a proven guide buyer, waitlisted = the email is on the club waitlist (taken, the seats, is no longer part of
 * the price since 23/11 and is only accepted so the old calls still work).
 * → { ok: true, phase, key: 'M9'|'M19'|'Y90'|'Y190', eur } or { ok: false, phase, error: 'closed'|'early' }
 */
export function decide({ now = Date.now(), taken = 0, buyer = false, waitlisted = false, plan = 'month' } = {}) {
  const phase = phaseAt(now);
  // 25/11: before the doors open it is a reservation: the founders' €9, nothing charged until EARLY
  if (phase === 'before') { if (now < RESERVE_FROM) return { ok: false, phase, error: 'closed' }; const key = plan === 'year' ? 'Y90' : 'M9'; return { ok: true, phase, key, eur: PRICES[key].eur, reserve: true }; }
  if (phase === 'early' && !buyer && !waitlisted) return { ok: false, phase, error: 'early' };
  // until 4/12 everyone pays €9; after it, only who bought one of our guides
  const low = foundersAt(now) || buyer;
  const key = plan === 'year' ? (low ? 'Y90' : 'Y190') : low ? 'M9' : 'M19';
  return { ok: true, phase, key, eur: PRICES[key].eur };
}

// ---- small helpers ----
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const cleanEmail = (e) => String(fixEmail(String(e || '').trim()) || '').toLowerCase().slice(0, 120);
/** "#1415-7362", " 1415 7362 " → "1415-7362"; anything else → '' */
export function cleanReceipt(r) {
  const s = String(r || '').trim().replace(/^#\s*/, '').replace(/\s+/g, '-');
  return /^\d{3,5}(-\d{3,5}){1,2}$/.test(s) ? s : '';
}
export const firstName = (n) => String(n || '').trim().split(/\s+/)[0].slice(0, 40) || 'there';

// ---- Redis keys ----
const K = {
  members: 'omnya:club:members', // hash email → member (JSON)
  todo: 'omnya:club:skool:todo', // list: to approve on Skool (Nico)
  remove: 'omnya:club:skool:remove', // list: to take off Skool (Nico)
  withdrawals: 'omnya:club:withdrawals', // list: withdrawals from a contract (Nico handles the refund)
  buyers: 'omnya:club:buyers', // set: emails that paid for a guide
  receipts: 'omnya:club:receipts', // hash: Stripe receipt number → email
  proofs: 'omnya:club:proofs', // hash: proof of purchase → the first member email it got the €9 price for
  waitlist: 'omnya:club:waitlist', // set: emails on the club waitlist
  waitFilled: 'omnya:club:waitlist:filled', // set once the old opt-in rows have been read into the set
  seats: 'omnya:club:seats', // the count of the seats, kept 60 s
  pi: (pi) => `omnya:club:pi:${pi}`,
  byCustomer: 'omnya:club:customers', // hash: Stripe customer id → member email (the Saturday charge finds the reservation)
  reserved: 'omnya:club:reserved:n', // INCR: the order of the reservations (the first 100 get the founders' gift)
  rank: 'omnya:club:rank', // hash: checkout session → its place among the reservations
  builds: 'omnya:club:builds', // list: the builds the members sent from the inside page (Nico answers by email) // a guide payment whose receipt number was not there yet → email
  once: (what, id) => `omnya:club:once:${what}:${id}`,
};
export { K as KEYS };

// ---- the buyer token: a short signed proof that verify said yes, used by checkout (24 hours) ----
// CLUB_SECRET if it is set on Vercel; otherwise one made from the Stripe webhook secret (as api/_lib/learn-files.js does)
const tokenKey = () => {
  if (process.env.CLUB_SECRET) return process.env.CLUB_SECRET;
  const base = process.env.STRIPE_WEBHOOK_SECRET || '';
  return base ? createHmac('sha256', base).update('omnya-club-token').digest('hex') : '';
};
const mac = (key, s) => createHmac('sha256', key).update(s).digest('base64url').slice(0, 22);
/** proof = 'r:<receipt>' or 'e:<email>'. '' when there is no key to sign with. */
export function signToken(proof, ttl = DAY) {
  const key = tokenKey();
  if (!key) return '';
  const exp = Math.floor(Date.now() / 1000) + ttl;
  return `${exp.toString(36)}.${Buffer.from(proof).toString('base64url')}.${mac(key, `${exp}|${proof}`)}`;
}
/** The proof inside a token that is ours and not expired, or null. */
export function readToken(token) {
  const key = tokenKey();
  const m = /^([0-9a-z]{4,8})\.([A-Za-z0-9_-]{4,200})\.([A-Za-z0-9_-]{22})$/.exec(String(token || ''));
  if (!key || !m) return null;
  const exp = parseInt(m[1], 36);
  if (!exp || exp * 1000 < Date.now()) return null;
  const proof = Buffer.from(m[2], 'base64url').toString();
  const a = Buffer.from(mac(key, `${exp}|${proof}`)), b = Buffer.from(m[3]);
  return a.length === b.length && timingSafeEqual(a, b) && /^[re]:/.test(proof) ? proof : null;
}

// ---- 25/11 (Nico: «tutto nel sito», no Skool): the member's own link to /the-3d-future/inside ----
// <email in base64url>.<signature>: no end date, because what the page shows is decided at every visit by the member in
// Redis (reserved, active, left). Signed with the same key as the buyer token, with its own word so the two never mix.
const SITE_URL = 'https://www.omnyalab.com';
export function memberToken(email) {
  const key = tokenKey(), e = cleanEmail(email);
  return key && e ? `${Buffer.from(e).toString('base64url')}.${mac(key, `inside|${e}`)}` : '';
}
/** The email inside a member link that is ours, or null. */
export function readMember(token) {
  const key = tokenKey();
  const m = /^([A-Za-z0-9_-]{4,240})\.([A-Za-z0-9_-]{22})$/.exec(String(token || ''));
  if (!key || !m) return null;
  const email = Buffer.from(m[1], 'base64url').toString();
  const a = Buffer.from(mac(key, `inside|${email}`)), b = Buffer.from(m[2]);
  return a.length === b.length && timingSafeEqual(a, b) && EMAIL.test(email) ? email : null;
}
export const insideUrl = (email) => `${SITE_URL}/the-3d-future/inside?m=${memberToken(email)}`;

/** The first course, SAMAR in eleven steps (25/11, titles and intros from the course scripts, «Corso SAMAR - copioni degli
    11 step.md»). k = the word in azure and s = the short line, both from the approved step covers; img = the cover photo,
    blurred, under the card (Nico, B3). aff = the Higgsfield affiliate line under the video (26/11, Nico: step 2 says «it's right
    here on screen and under this video»). src = the video once it is online; until then the page shows the step locked, opening on Saturday 28/11.
    No lengths yet: the films are not cut (Nico: no made-up numbers). */
export const LESSONS = [
  { n: 1, t: "What you'll build", p: "The tower we're building together, why developers pay over $6,000 for a page like this, and everything you need before you start.", k: "build", s: "The tower we build together, and why developers pay for it.", img: '/club/course/step-01.webp', src: '' },
  { n: 2, t: 'Set up your kit', p: "What's inside the kit, how to open it on Mac or Windows with one double click, and your first test run.", k: "kit", s: "What's in the kit, and your first run with one double click.", img: '/club/course/step-02.webp', src: '', aff: true },
  { n: 3, t: 'Inside the engine', p: 'A tour of the engine piece by piece, so you know exactly what every part does and how to drive it.', k: "engine", s: "Every part of the engine, and how to drive it.", img: '/club/course/step-03.webp', src: '' },
  { n: 4, t: 'References and real measures', p: 'How to collect the real photos from every side, pick your main photo, and give every number a source.', k: "real measures", s: "Real photos from every side, and a source for every number.", img: '/club/course/step-04.webp', src: '' },
  { n: 5, t: 'The tower in 3D', p: 'Your tower built from the main photo and checked with numbers, not with hope: overlay, silhouette score and an honest critic.', k: "in 3D", s: "Your tower in 3D, checked with numbers, not with hope.", img: '/club/course/step-05.webp', src: '' },
  { n: 6, t: 'The apartment inside', p: 'The home at real size, laid out like the real photos, full of life and clean before any AI touches it.', k: "inside", s: "The home at real size, full of life, clean before any AI.", img: '/club/course/step-06.webp', src: '' },
  { n: 7, t: 'The camera', p: 'The tour written like a story, one straight move per shot, and the judge that tells you when a move is ready.', k: "camera", s: "The tour written as a story, one straight move per shot.", img: '/club/course/step-07.webp', src: '' },
  { n: 8, t: 'The photos', p: 'The cover that makes people ask «is that real?», and every room made in a chain so it all stays the same.', k: "photos", s: "The cover that makes people ask «wait, is that real?»", img: '/club/course/step-08.webp', src: '' },
  { n: 9, t: 'The clips', p: 'From one photo to the next with Kling, one clip at a time, with the trick that cuts your credits almost in half.', k: "clips", s: "One clip at a time, and the trick that halves your credits.", img: '/club/course/step-09.webp', src: '' },
  { n: 10, t: 'The real page', p: 'Photos and clips inside the real page, a name for every floor, online with Netlify and tested on the phone.', k: "real page", s: "Your tower online, with a name and a light for every floor.", img: '/club/course/step-10.webp', src: '' },
  { n: 11, t: 'The reel and the sale', p: 'The reel that gets the views, the caption that gets the comments, and how to sell your tower to a developer.', k: "the sale", s: "The reel that gets the views, and how to sell your tower.", img: '/club/course/step-11.webp', src: '' },
];
const fileLink = (f, ttl) => ({ name: f.name, href: `${SITE_URL}${signedHref(f.file, ttl)}`, zip: f.kind === 'zip', note: f.note || '' });
/** 25/11 (Nico): his own look at the members' page before anyone is inside. A signed link like a member's, for this
    address only, made by GET /api/club/preview with the admin key; it shows the page open, with the founders' gift. */
export const PREVIEW_EMAIL = 'preview@omnyalab.com';
/**
 * What /the-3d-future/inside shows to this member (GET /api/club/inside). state: 'none' (no such member), 'ended' (left),
 * 'waiting' (reserved, the first payment has not gone through yet: the page opens on Saturday), 'open'. The file links
 * are good for one day: the page makes new ones at every visit.
 */
export async function insideData(email) {
  // since: the day the membership starts (a reservation starts with the doors, Sat 28/11 9:00 Rome), for the profile card
  if (cleanEmail(email) === PREVIEW_EMAIL) return openData({ name: 'Nico', email: PREVIEW_EMAIL, portal: PORTAL_URL, since: new Date(EARLY).toISOString() }, true);
  let m = null; try { m = JSON.parse((await kv('HGET', K.members, cleanEmail(email))) || 'null'); } catch {}
  if (!m) return { state: 'none' };
  const at = Date.parse(m.at || '') || 0;
  const base = { name: m.name, email: m.email, portal: PORTAL_URL, since: new Date(m.reserved ? Math.max(EARLY, at) : at || Date.now()).toISOString() };
  if (m.status === 'canceled') return { ...base, state: 'ended' };
  const founder = m.reserved && Number(m.rank) > 0 && Number(m.rank) <= CHEAP_SEATS ? Number(m.rank) : 0;
  // 25/11: the course shows, locked; 26/11: a founder sees the gift waiting for them (no files until the card is charged)
  if (m.reserved && !m.welcomed) return { ...base, state: 'waiting', opens: new Date(EARLY).toISOString(), lessons: LESSONS, founder, giftNames: founder ? FOUNDERS_GIFTS.map((g) => g.name) : [] };
  return { ...openData(base, !!founder), founder };
}
function openData(base, gift) {
  return {
    ...base, state: 'open',
    lessons: LESSONS,
    skill: fileLink(CLUB_COURSE_SKILL, DAY),
    house: fileLink({ name: 'The House Builder skill', file: HOUSE_SKILL_FILE, kind: 'zip' }, DAY),
    vault: CLUB_VAULT.map((b) => ({ t: b.t, type: b.type, img: b.img, files: b.files.map((f) => fileLink(f, DAY)) })),
    guides: CLUB_GUIDES.map((f) => fileLink(f, DAY)),
    gifts: gift ? FOUNDERS_GIFTS.map((g) => fileLink(g, DAY)) : [],
  };
}
/** «Send me your build» from the inside page: Nico gets it by email and in a Redis list (GET /api/club/admin). */
export async function noteBuild(email, link, note) {
  let m = null; try { m = JSON.parse((await kv('HGET', K.members, email)) || 'null'); } catch {}
  const row = { at: new Date().toISOString(), email, name: m?.name || '', link, note };
  await kv('RPUSH', K.builds, JSON.stringify(row));
  await sendMail({ to: host.email, replyTo: email, subject: `[club] build from ${row.name || email}`, text: `${row.name} <${email}> sent a build:\n${link}\n\n${note || '(no note)'}\n\nReply to this email to answer them.` });
  return row;
}
/** «Lost your link?»: the link goes again to the member's email, never on the page. */
export async function sendInsideLink(email) {
  let m = null; try { m = JSON.parse((await kv('HGET', K.members, email)) || 'null'); } catch {}
  if (!m || m.status === 'canceled') return false;
  const text = `Here's your link to THE 3D FUTURE, ${m.name}. It's yours, keep it:\n${insideUrl(email)}\n\nNico`;
  await sendMail({ to: `${m.name} <${email}>`, replyTo: host.email, subject: 'your link to THE 3D FUTURE', text });
  return true;
}

// ---- rate limit: the INCR + EXPIRE of the other routes (api/contract.js), per address ----
export const ipOf = (req) => (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'local';
/** true when this address has asked `action` more than max times in the last `secs` seconds */
export async function limited(req, action, max, secs) {
  try {
    const key = `omnya:club:rl:${action}:${ipOf(req)}`;
    const n = Number(await kv('INCR', key));
    if (n === 1) await kv('EXPIRE', key, secs);
    return n > max;
  } catch (e) {
    console.error('[club] rate', e.message);
    return false; // the store is down: better a few more tries than nobody getting in
  }
}

// ---- seats: the subscriptions of round 1, from Stripe, kept 60 s: one of the four prices, created from Sat 28/11/2026
// 09:00 Rome (EARLY), active, trialing or past_due (20/11, Nico) ----
let memo = null;
export async function seats(stripe) {
  if (memo && Date.now() - memo.at < 60_000) return memo.taken;
  try {
    const c = JSON.parse((await kv('GET', K.seats)) || 'null');
    if (c && Date.now() - c.at < 60_000) return (memo = c).taken;
  } catch {}
  let taken;
  try {
    if (!stripe) throw Object.assign(new Error('not configured'), { code: 'not_configured' });
    const subs = new Set(); // by id: a subscription with two of the prices is one seat
    for (const price of new Set(priceIds())) {
      // status 'all' and the filter here: active, trialing and past_due are the three that hold a seat
      for await (const s of stripe.subscriptions.list({ price, status: 'all', limit: 100, created: { gte: Math.floor(RESERVE_FROM / 1000) } })) {
        if (LIVE.has(s.status)) subs.add(s.id);
      }
    }
    taken = subs.size;
  } catch (e) {
    // 20/11: the site's Stripe key may not read subscriptions (restricted key): then the seats are the members of this
    // round the webhook wrote in Redis (clubJoined), minus the ones who left (clubLeft). Still a real count, never a typed one
    console.error('[club] seats from Stripe failed, counting the members in Redis:', e.message);
    taken = await seatsFromMembers();
  }
  memo = { taken, at: Date.now() };
  await kv('SET', K.seats, JSON.stringify(memo), 'EX', 60).catch(() => {});
  return memo.taken;
}
const forgetSeats = () => { memo = null; return kv('DEL', K.seats).catch(() => {}); };

/** The members of this round written by the webhook, without the ones who left: the seat count when Stripe can't be read. */
async function seatsFromMembers() {
  const all = (await kv('HGETALL', K.members)) || [];
  let n = 0;
  for (let i = 1; i < all.length; i += 2) {
    try {
      const m = JSON.parse(all[i]);
      if ((m.round || ROUND) === ROUND && m.status !== 'canceled' && Date.parse(m.at) >= RESERVE_FROM) n++;
    } catch {}
  }
  return n;
}

// ---- who is a guide buyer ----
/** A paid one-time Checkout Session of ours with at least one guide in it (line item descriptions are the product names). */
const guideSession = (s) =>
  s && s.mode === 'payment' && s.payment_status === 'paid' && (s.amount_total || 0) > 0 && !s.metadata?.club && !s.metadata?.buy && !s.metadata?.auction &&
  (s.line_items?.data || []).some((it) => isGuideProduct(it.price?.product?.name || it.description || ''));

/** The email on the receipt index, or '' */
export async function receiptEmail(receipt) {
  return receipt ? (await kv('HGET', K.receipts, receipt)) || '' : '';
}

/** Is this email a guide buyer? The index first, then Stripe itself (the email as typed and in small letters: Stripe
    keeps it as the buyer wrote it). */
export async function isBuyerEmail(stripe, email) {
  if (!email) return false;
  if (Number(await kv('SISMEMBER', K.buyers, cleanEmail(email))) === 1) return true;
  if (!stripe) throw Object.assign(new Error('not configured'), { code: 'not_configured' });
  for (const e of new Set([email, email.toLowerCase()])) {
    const page = await stripe.checkout.sessions.list({ customer_details: { email: e }, status: 'complete', limit: 30, expand: ['data.line_items'] });
    if (page.data.some(guideSession)) {
      await kv('SADD', K.buyers, cleanEmail(email)).catch(() => {});
      return true;
    }
  }
  return false;
}

/** Is this email on the club waitlist? The set first; the first time, the old opt-in rows are read into the set. */
export async function isWaitlisted(email) {
  if (!email) return false;
  if (Number(await kv('SISMEMBER', K.waitlist, email)) === 1) return true;
  if (!(await kv('GET', K.waitFilled))) {
    await fillWaitlist();
    return Number(await kv('SISMEMBER', K.waitlist, email)) === 1;
  }
  return false;
}

/** Reads every 'waitlist-3d-future' row of the opt-in list (api/optin.js, omnya:optin) into the set. Safe to run again. */
export async function fillWaitlist() {
  let n = 0;
  for (let i = 0; ; i += 500) {
    const rows = await kv('LRANGE', 'omnya:optin', i, i + 499);
    if (!rows || !rows.length) break;
    const emails = rows.map((r) => { try { const o = JSON.parse(r); return o.free === 'waitlist-3d-future' ? String(o.email || '').toLowerCase() : ''; } catch { return ''; } }).filter(Boolean);
    if (emails.length) n += Number(await kv('SADD', K.waitlist, ...emails));
    if (rows.length < 500) break;
  }
  await kv('SET', K.waitFilled, String(Date.now()));
  return n;
}

/** The webhook, after a guide is paid: the email into the buyers, and the receipt number when Stripe has it already. */
export async function noteBuyer(stripe, session, productNames) {
  if (!productNames.some(isGuideProduct) || (session.amount_total || 0) <= 0) return;
  const email = cleanEmail(session.customer_details?.email);
  if (!email) return;
  await kv('SADD', K.buyers, email);
  const pi = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
  if (!pi || !stripe) return;
  const intent = await stripe.paymentIntents.retrieve(pi, { expand: ['latest_charge'] });
  const receipt = cleanReceipt(intent.latest_charge?.receipt_number);
  if (receipt) await kv('HSET', K.receipts, receipt, email);
  else await kv('SET', K.pi(pi), email, 'EX', 7 * DAY); // the number comes with the receipt email: charge.updated
}

/** The webhook, charge.updated / charge.succeeded: a receipt number that came after the checkout. */
export async function noteReceipt(charge) {
  const receipt = cleanReceipt(charge?.receipt_number);
  const pi = typeof charge?.payment_intent === 'string' ? charge.payment_intent : charge?.payment_intent?.id;
  if (!receipt || !pi) return;
  const email = await kv('GET', K.pi(pi));
  if (email) { await kv('HSET', K.receipts, receipt, email); await kv('DEL', K.pi(pi)); }
}

/**
 * The admin backfill: the checkout sessions already paid, one page of 100 after another, until about 40 s have gone.
 * Returns where to start next time (after), so a loop can call it until done. The upsell charges (one tap on the
 * thanks page, api/upsell.js, no checkout session) are read on the first call only.
 */
export async function backfill(stripe, after = '') {
  const t0 = Date.now();
  let sessions = 0, buyers = 0, receipts = 0, next = after || '';
  if (!next) {
    for await (const ch of stripe.charges.search({ query: "metadata['from']:'thanks-upsell' AND status:'succeeded'", limit: 100 })) {
      const email = cleanEmail(ch.billing_details?.email || ch.receipt_email), receipt = cleanReceipt(ch.receipt_number);
      if (!email || ch.refunded) continue;
      buyers += Number(await kv('SADD', K.buyers, email));
      if (receipt) { await kv('HSET', K.receipts, receipt, email); receipts++; }
    }
  }
  for (;;) {
    const page = await stripe.checkout.sessions.list({ status: 'complete', limit: 100, expand: ['data.line_items', 'data.payment_intent.latest_charge'], ...(next ? { starting_after: next } : {}) });
    for (const s of page.data) {
      sessions++;
      const ch = s.payment_intent?.latest_charge;
      if (!guideSession(s) || ch?.refunded) continue;
      const email = cleanEmail(s.customer_details?.email);
      if (!email) continue;
      buyers += Number(await kv('SADD', K.buyers, email));
      const receipt = cleanReceipt(ch?.receipt_number);
      if (receipt) { await kv('HSET', K.receipts, receipt, email); receipts++; }
    }
    next = page.data.length ? page.data[page.data.length - 1].id : next;
    if (!page.has_more) return { done: true, sessions, buyers, receipts };
    if (Date.now() - t0 > 40_000) return { done: false, next, sessions, buyers, receipts };
  }
}

// ---- joining and leaving (the webhook) ----
const SKILL_TTL = 5 * 365 * DAY; // the skill is a bonus they keep: a link good for five years
const WITHDRAW = 'omnyalab.com/withdraw';

/** W1, the welcome email: the text approved by Nico on 20/11, word for word, with the withdrawal line added. While the
    customer portal link (CLUB_PORTAL_URL) is not there, the cancel line says to reply (the reply goes to info@). */
export const CANCEL_REPLY = 'Reply to this email to cancel.';
export function welcomeText({ name, inside, skill, portal, founder }) {
  const cancel = portal ? `If you ever want to cancel, it's one tap here: ${portal}` : CANCEL_REPLY;
  // 23/11: the first 100 of the founders' round also get the founders' gift, theirs to keep. 26/11 (Nico: «i regali si
  // sbloccano solo da dentro la pagina quando uno è founder»): no gift links in the email any more (a link in an email can
  // be forwarded to anyone), only the line that says where they are: the members' page shows them to the founder alone
  const gift = founder ? `\n\nYou're founder number ${founder}, so your founders' gift is unlocked inside your club page, only for you: our three playbooks and the full 3D AI Mastery course, yours to keep.` : '';
  // 25/11 (Nico: «tutto nel sito»): the club is our own page, the link below is the member's own (no Skool)
  return `You're in, ${name}.\n\nThis is your link to the club, it's yours so keep it: your courses, the Vault with every build and its files, and the Full guides are all there:\n${inside}\n\nYour House Builder skill is yours to keep, here:\n${skill}${gift}\n\nStart with the first video course, your own tower step by step, and when it's done send it to me from the club page: I look at every first build myself.\n\n${cancel}\n\nTo withdraw within 14 days: ${WITHDRAW}\n\nNico`;
}
/** R1 (25/11), the reservation email: the card is saved, nothing is charged until the doors open on Saturday 28/11 at
    9:00 Rome; the first 100 who reserve get the founders' gift, unlocked inside their club page once the card is charged. */
export function reservedText({ name, rank, portal }) {
  const gift = rank && rank <= CHEAP_SEATS
    ? `You're number ${rank} of the first 100 who reserved, so the founders' gift is yours: our three playbooks and the full 3D AI Mastery course, yours to keep. It unlocks on Saturday inside your club page, only for you, and your welcome email brings you the link to it, together with your House Builder skill.`
    : `The 100 founders' gifts were all taken before you reserved, but your €9 price is yours, locked for as long as you stay. On Saturday your welcome email brings your link to the club and your House Builder skill.`;
  const cancel = portal ? `If you change your mind before Saturday, cancel here and you pay nothing: ${portal}` : `If you change your mind before Saturday, reply to this email and you pay nothing.`;
  return `Your seat is reserved, ${name}.\n\nNothing was charged today. On Saturday 28 November at 9:00 (Rome) the doors of THE 3D FUTURE open, your first month starts and your card is charged €9, the founders' price that stays locked for as long as you stay.\n\n${gift}\n\n${cancel}\n\nTo withdraw within 14 days: ${WITHDRAW}\n\nNico`;
}
const noteHtml = (text) => `<!doctype html><html><body><div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#222">\n${text.split('\n\n').map((x) => `<p>${x.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1">$1</a>').replace(WITHDRAW, `<a href="https://www.${WITHDRAW}">${WITHDRAW}</a>`).replace(/\n/g, '<br>')}</p>`).join('\n')}\n</div></body></html>`;
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** The same words as a plain note (no design, links written out), like the free blueprint email. */
export function welcomeHtml(v) {
  const link = (u) => `<a href="${esc(u)}">${esc(u)}</a>`;
  const p = welcomeText({ name: esc(v.name), inside: link(v.inside), skill: link(v.skill), portal: v.portal ? link(v.portal) : '', founder: Number(v.founder) || 0 })
    .replace(WITHDRAW, `<a href="https://www.${WITHDRAW}">${WITHDRAW}</a>`)
    .split('\n\n').map((x) => `<p>${x.replace(/\n/g, '<br>')}</p>`).join('\n');
  return `<!doctype html><html><body><div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#222">\n${p}\n</div></body></html>`;
}

/** SET NX: true only the first time this (what, id) is seen, so a retry of the webhook does nothing twice. */
const first = async (what, id) => (await kv('SET', K.once(what, id), '1', 'NX', 'EX', 30 * DAY)) === 'OK';

/** checkout.session.completed with metadata.club: the member, the Skool list for Nico, the welcome email. Throws to
    make Stripe retry (missing links, mail down): every step is safe to run again. */
export async function clubJoined(stripe, session) {
  const md = session.metadata || {};
  const email = cleanEmail(session.customer_details?.email || session.customer_email);
  const name = firstName(md.name || session.customer_details?.name);
  const portal = PORTAL_URL;
  if (!email) throw new Error('club: no email on the session');
  const member = {
    email, name, ig: md.ig || '', v: md.v || '', buyer: md.buyer === 'yes', plan: md.plan || '', price: Number(md.price) || null, round: md.round || ROUND,
    customer: typeof session.customer === 'string' ? session.customer : session.customer?.id || '',
    subscription: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id || '',
    session: session.id, at: new Date((session.created || Date.now() / 1000) * 1000).toISOString(), status: 'active',
    reserved: md.reserve === '1',
  };
  await kv('HSET', K.members, email, JSON.stringify(member));
  if (member.customer) await kv('HSET', K.byCustomer, member.customer, email);
  if (md.proof && !(await kv('HGET', K.proofs, md.proof))) await kv('HSET', K.proofs, md.proof, email);
  if (await first('todo', session.id)) await kv('RPUSH', K.todo, JSON.stringify({ at: member.at, email, name, ig: member.ig, plan: member.plan, price: member.price, ...(member.reserved ? { reserved: true } : {}) }));
  await forgetSeats();
  // 25/11: a reservation gets R1 now (its place among the reservations decides the founders' gift); W1 with Skool, the
  // skill and the gift leaves when Stripe charges the card on Saturday (clubCharged)
  if (member.reserved) {
    let rank = Number(await kv('HGET', K.rank, session.id)) || 0;
    if (!rank) { rank = Number(await kv('INCR', K.reserved)); await kv('HSET', K.rank, session.id, String(rank)); }
    await kv('HSET', K.members, email, JSON.stringify({ ...member, rank })).catch(() => {});
    if (!(await first('r1', session.id))) return member;
    const text = reservedText({ name, rank, portal });
    try {
      await sendMail({ to: `${name} <${email}>`, bcc: host.email, replyTo: host.email, subject: 'your seat is reserved', text, html: noteHtml(text) });
    } catch (e) { await kv('DEL', K.once('r1', session.id)).catch(() => {}); throw e; }
    return member;
  }
  // 25/11: no Skool, the club is /the-3d-future/inside with the member's own link (without the key to sign it Stripe retries)
  if (!memberToken(email)) throw new Error('club: no key to sign the member link');
  if (!(await first('w1', session.id))) return member;
  // 25/11: who joins after the opening (no reservation) gets no founders' gift: the gift is only for the first 100 reservations
  const v = { name, inside: insideUrl(email), portal, founder: 0, skill: `https://www.omnyalab.com${signedHref(HOUSE_SKILL_FILE, SKILL_TTL)}` };
  try {
    await sendMail({ to: `${name} <${email}>`, bcc: host.email, replyTo: host.email, subject: "you're in", text: welcomeText(v), html: welcomeHtml(v) });
  } catch (e) {
    await kv('DEL', K.once('w1', session.id)).catch(() => {});
    throw e;
  }
  return member;
}

/** 25/11, charge.succeeded: the Saturday charge of a reservation (€9 or €90, a customer we wrote at the reservation): the
    welcome email W1 with the club link and the skill (26/11: the founders' gift opens inside the club page, not in the email). Throws to make Stripe
    retry (missing Skool link, mail down); safe to repeat. */
export async function clubCharged(stripe, charge) {
  if (!charge || charge.status !== 'succeeded' || charge.currency !== 'eur' || ![900, 9000].includes(charge.amount)) return null;
  const cus = typeof charge.customer === 'string' ? charge.customer : charge.customer?.id;
  const email = cus ? await kv('HGET', K.byCustomer, cus) : null;
  if (!email) return null;
  let m = null; try { m = JSON.parse((await kv('HGET', K.members, email)) || 'null'); } catch {}
  if (!m || !m.reserved || m.welcomed) return null;
  const portal = PORTAL_URL;
  if (!memberToken(email)) throw new Error('club: no key to sign the member link');
  if (!(await first('w1', `r:${m.session}`))) return m;
  const rank = Number(m.rank) || Number(await kv('HGET', K.rank, m.session)) || 0;
  const founder = rank && rank <= CHEAP_SEATS ? rank : 0; // 26/11: the gift is in the club page (insideData), the email only says so
  const v = { name: m.name, inside: insideUrl(email), portal, founder, skill: `https://www.omnyalab.com${signedHref(HOUSE_SKILL_FILE, SKILL_TTL)}` };
  try {
    await sendMail({ to: `${m.name} <${email}>`, bcc: host.email, replyTo: host.email, subject: "you're in", text: welcomeText(v), html: welcomeHtml(v) });
  } catch (e) { await kv('DEL', K.once('w1', `r:${m.session}`)).catch(() => {}); throw e; }
  await kv('HSET', K.members, email, JSON.stringify({ ...m, welcomed: new Date().toISOString(), ...(founder ? { gift: rank } : {}) })).catch(() => {});
  return m;
}

/** customer.subscription.deleted of a club subscription (our metadata, or one of the four prices): the member goes on
    the list to take off Skool. */
export async function clubLeft(stripe, sub) {
  const ours = sub?.metadata?.club === CLUB || (sub?.items?.data || []).some((it) => priceIds().includes(it.price?.id));
  if (!ours || !(await first('left', sub.id))) return;
  let email = '';
  try { email = cleanEmail((await stripe.customers.retrieve(sub.customer))?.email); } catch {}
  let member = null;
  if (email) try { member = JSON.parse((await kv('HGET', K.members, email)) || 'null'); } catch {}
  if (!member) {
    // the customer has no email any more: the member with this subscription
    const all = await kv('HGETALL', K.members);
    for (let i = 1; i < all.length; i += 2) { try { const m = JSON.parse(all[i]); if (m.subscription === sub.id) { member = m; email = m.email; break; } } catch {} }
  }
  const at = new Date().toISOString();
  if (member) await kv('HSET', K.members, email, JSON.stringify({ ...member, status: 'canceled', left: at }));
  await kv('RPUSH', K.remove, JSON.stringify({ at, email, name: member?.name || '', ig: member?.ig || sub.metadata?.ig || '', subscription: sub.id }));
  await forgetSeats();
}

/** The withdrawals and the two Skool lists, newest last, for Nico (GET /api/club/admin). */
export async function lists() {
  const parse = (rows) => (rows || []).map((r) => { try { return JSON.parse(r); } catch { return null; } }).filter(Boolean);
  const all = await kv('HGETALL', K.members);
  const members = [];
  for (let i = 1; i < all.length; i += 2) { try { members.push(JSON.parse(all[i])); } catch {} }
  return {
    members,
    skoolTodo: parse(await kv('LRANGE', K.todo, 0, -1)),
    skoolRemove: parse(await kv('LRANGE', K.remove, 0, -1)),
    withdrawals: parse(await kv('LRANGE', K.withdrawals, 0, -1)),
    builds: parse(await kv('LRANGE', K.builds, 0, -1)),
    counts: { buyers: Number(await kv('SCARD', K.buyers)), receipts: Number(await kv('HLEN', K.receipts)), waitlist: Number(await kv('SCARD', K.waitlist)) },
  };
}
