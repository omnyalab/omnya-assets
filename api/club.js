// THE 3D FUTURE, the paid club (20/11, Nico): one function for all of it, like api/city.js (vercel.json sends
// /api/club/<action> here). The rules (dates, prices, seats, proofs) are in api/_lib/club.js. The addresses below are the
// ones the club page (src/pages/the-3d-future/index.astro) is built on: keep them as they are.
//   GET  /api/club/seats[?at=<ISO date>]     → { taken, left, phase: 'before'|'early'|'open'|'after' } (after = from Sat 5/12, €19, the doors never close)
//        ?at= previews the phase of another moment, like the cards (?at= on the thanks pages); taken is always the real one
//   POST /api/club/verify   { receipt?, email? }   → { buyer: bool, token? } (the token, 24 hours, is for checkout)
//   POST /api/club/checkout { name, email, plan: 'month'|'year', token?, ig?, v?, ui?, q? }
//        → { client_secret, pk, plan, price, buyer } of a Stripe Checkout Session in subscription mode, embedded in our
//          page (ui 'elements' like api/embed-checkout.js, the default, or ui 'embedded' for Stripe's own form).
//          v = the variant of the name test ('a' THE 3D FUTURE, 'b' 3D THAT SELLS), kept in the metadata with ig;
//          q = the three answers of the join cards (25/11), 'build|use|now' (e.g. 'tower|clients|images'), kept in the metadata
//   GET  /api/club/welcome?session_id=cs_…   → what /the-3d-future/welcome shows, once Stripe says it is paid
//   POST /api/club/withdraw { name, email, purchase, confirm: true }  → { ok, id, at, when, mailed } (art. 54-bis Codice del consumo)
//   GET  /api/club/admin?key=IG_ADMIN_KEY    → members, the two Skool lists, the withdrawals, the index counts
//   POST /api/club/backfill?key=IG_ADMIN_KEY[&after=cs_…] → fills the buyer and receipt index from Stripe (loop until done)
// Every refusal is { error: <words for the page>, code: <one word for the code> } (+ phase where it matters):
// bad_request, too_many, closed, early, not_configured, stripe, not_paid, not_found.
// The price is decided here and only here: the page never sends a price or a price id.
// Without the Stripe keys (local preview) every call that needs Stripe answers 503 { code: 'not_configured' }.
import Stripe from 'stripe';
import { randomBytes } from 'node:crypto';
import { kv } from './_lib/store.js';
import { sendMail } from './_lib/mail.js';
import { host } from './_lib/config.js';
import { signedHref, PAGE_TTL, HOUSE_SKILL_FILE } from './_lib/learn-files.js';
import {
  CLUB, ROUND, CHEAP_SEATS, EARLY, phaseAt, decide, priceId, seats, EMAIL, cleanEmail, cleanReceipt, firstName, signToken, readToken,
  limited, ipOf, receiptEmail, isBuyerEmail, isWaitlisted, fillWaitlist, backfill, lists, KEYS, PORTAL_URL,
  readMember, insideData, insideUrl, PREVIEW_EMAIL, noteBuild, sendInsideLink,
} from './_lib/club.js';

const SITE = 'https://www.omnyalab.com';
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const json = (o, status = 200, cache = 'no-store') => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': cache, 'X-Robots-Tag': 'noindex' } });
const fail = (status, code, error, extra = {}) => json({ error, code, ...extra }, status);
const notConfigured = (extra = {}) => fail(503, 'not_configured', 'not configured yet', extra);
const tooMany = () => fail(429, 'too_many', 'Too many tries, wait a few minutes.');
const action = (req) => { const u = new URL(req.url); return u.searchParams.get('action') || u.pathname.replace(/\/+$/, '').split('/').pop(); };
async function body(req) { try { const b = await req.json(); return b && typeof b === 'object' && !Array.isArray(b) ? b : null; } catch { return null; } }
const admin = (req) => {
  const key = process.env.IG_ADMIN_KEY, u = new URL(req.url);
  return !!key && (u.searchParams.get('key') === key || (req.headers.get('authorization') || '') === `Bearer ${key}`);
};
const atOf = (req) => Date.parse((new URL(req.url).searchParams.get('at') || '').replace(' ', '+'));
// ?at= on the checkout moves the clock only on the computer (no Vercel) or with the admin key: online the doors follow the real time
function clock(req) {
  const at = atOf(req);
  return !isNaN(at) && (!process.env.VERCEL || admin(req)) ? at : Date.now();
}
const IG = /^@?[A-Za-z0-9._-]{1,60}$/; // 20/11: same characters and length as the omnya-ig code kept by Base.astro

export async function GET(req) {
  const a = action(req);
  if (a === 'seats') return getSeats(req);
  if (a === 'welcome') return welcome(req);
  if (a === 'inside') return inside(req);
  if (a === 'preview') {
    if (!admin(req)) return new Response('Not found', { status: 404 });
    return json({ url: insideUrl(PREVIEW_EMAIL) });
  }
  if (a === 'admin') {
    if (!admin(req)) return new Response('Not found', { status: 404 });
    return json(await lists());
  }
  return fail(404, 'not_found', 'not found');
}

export async function POST(req) {
  const a = action(req);
  if (a === 'verify') return verify(req);
  if (a === 'checkout') return checkout(req);
  if (a === 'withdraw') return withdraw(req);
  if (a === 'link') return lostLink(req);
  if (a === 'build') return sendBuild(req);
  if (a === 'backfill') {
    if (!admin(req)) return new Response('Not found', { status: 404 });
    if (!stripe) return notConfigured();
    const after = new URL(req.url).searchParams.get('after') || '';
    try {
      const w = after ? null : await fillWaitlist();
      const r = await backfill(stripe, after);
      return json({ ...r, ...(w === null ? {} : { waitlistAdded: w }) });
    } catch (e) {
      console.error('[club] backfill', e.message);
      return fail(502, 'stripe', 'backfill failed', { detail: e.message });
    }
  }
  return fail(404, 'not_found', 'not found');
}

async function getSeats(req) {
  // the phase of ?at= for the previews (anyone: it only says which of the four dates that moment falls in)
  const at = atOf(req), preview = !isNaN(at), phase = phaseAt(preview ? at : Date.now());
  try {
    // 25/11: before the opening the counter is the founders' gifts, given in the order of the reservations (rank)
    const taken = phase === 'before' ? Number(await kv('GET', KEYS.reserved)) || 0 : await seats(stripe);
    // the CDN keeps it 30 s too (the doors open with a crowd); a preview is never kept
    return json({ taken, left: Math.max(0, CHEAP_SEATS - taken), phase }, 200, preview ? 'no-store' : 'public, max-age=0, s-maxage=30');
  } catch (e) {
    if (e.code === 'not_configured') return notConfigured({ phase });
    console.error('[club] seats', e.message);
    return fail(502, 'stripe', 'could not count the seats', { phase }); // the page hides the counter: no number is better than a wrong one
  }
}

async function verify(req) {
  if (await limited(req, 'verify', 10, 600)) return tooMany();
  const b = await body(req);
  if (!b) return fail(400, 'bad_request', 'bad request');
  const receipt = cleanReceipt(b.receipt);
  const typed = String(b.email || '').trim().slice(0, 120), email = cleanEmail(typed);
  if (b.receipt && !receipt) return fail(400, 'bad_request', 'The receipt number looks like 1415-7362.');
  if (b.email && !EMAIL.test(email)) return fail(400, 'bad_request', 'That email does not look right.');
  if (!receipt && !email) return fail(400, 'bad_request', 'Write the receipt number or the email you paid with.');
  try {
    let proof = '';
    if (receipt && (await receiptEmail(receipt))) proof = `r:${receipt}`;
    else if (email && (await isBuyerEmail(stripe, typed))) proof = `e:${email}`;
    if (!proof) return json({ buyer: false });
    const token = signToken(proof);
    if (!token) return notConfigured();
    return json({ buyer: true, token });
  } catch (e) {
    if (e.code === 'not_configured') return notConfigured();
    console.error('[club] verify', e.message);
    return fail(502, 'stripe', 'Could not check right now, try again in a minute.');
  }
}

const NO = {
  closed: 'THE 3D FUTURE opens on Saturday 28 November. Get on the list and we email you when it opens.',
  early: 'Until 18:00 the doors are open only for the waitlist and for who bought one of our guides.',
};

async function checkout(req) {
  if (await limited(req, 'checkout', 12, 600)) return tooMany();
  const b = await body(req);
  if (!b || b.company) return fail(400, 'bad_request', 'bad request'); // company: the hidden field, a bot filled it
  const name = String(b.name || '').trim().replace(/\s+/g, ' ').slice(0, 60);
  const typed = String(b.email || '').trim().slice(0, 120), email = cleanEmail(typed);
  const plan = b.plan === 'year' ? 'year' : b.plan === 'month' ? 'month' : '';
  const ig = String(b.ig || '').trim();
  const v = b.v === 'a' || b.v === 'b' ? b.v : '';
  // 25/11 Nico: what they want to build, what for and where they are with 3D (the join cards); anything else is dropped
  const q = /^[a-z]{0,12}\|[a-z]{0,12}\|[a-z]{0,12}$/.test(String(b.q || '')) && String(b.q) !== '||' ? String(b.q) : '';
  if (!name || !EMAIL.test(email) || !plan || (ig && !IG.test(ig)) || (b.token && String(b.token).length > 300) || (b.v && !v)) return fail(400, 'bad_request', 'Name, email and plan needed.');

  const now = clock(req), phase = phaseAt(now);
  try {
    // who is a guide buyer: a token from verify (receipt or email), or this email itself
    let proof = readToken(b.token) || '';
    if (!proof && (await isBuyerEmail(stripe, typed).catch((e) => { if (e.code === 'not_configured') return false; throw e; }))) proof = `e:${email}`;
    // one proof gives the €9 price to one member: a receipt already used by someone else does not count again
    let used = false;
    if (proof) { const owner = await kv('HGET', KEYS.proofs, proof); if (owner && owner !== email) { used = true; proof = ''; } }
    const buyer = !!proof;
    const waitlisted = phase === 'early' && !buyer ? (await isWaitlisted(email)) || (typed.toLowerCase() !== email && (await isWaitlisted(typed.toLowerCase()))) : false;
    // the early doors first: who may not come in yet hears it before Stripe is even asked. 24/11: the price is the date
    // and the buyer proof only (€9 until Fri 4/12 23:59 Rome, then €19, guide buyers €9), never the seat count
    const d = decide({ now, buyer, waitlisted, plan });
    if (!d.ok) return fail(403, d.error, NO[d.error], { phase });
    if (!stripe || !process.env.STRIPE_PUBLISHABLE_KEY) return notConfigured({ phase });
    const price = priceId(d.key);
    if (!price) return notConfigured({ phase });
    // empty ig / v / proof are left out (an empty value means "remove" for Stripe)
    const meta = Object.fromEntries(Object.entries({ club: CLUB, round: ROUND, ig: ig.replace(/^@/, ''), v, buyer: buyer ? 'yes' : 'no', name, plan, price: String(d.eur), proof, reserve: d.reserve ? '1' : '', q }).filter(([, x]) => x));
    // 25/11: a reservation (before the doors open): the card is saved now, nothing is charged until the doors open on
    // Sat 28/11 09:00 Rome (EARLY), when the first month starts and Stripe charges the card by itself
    const sub = d.reserve ? { metadata: meta, billing_cycle_anchor: Math.floor(EARLY / 1000), proration_behavior: 'none' } : { metadata: meta };
    const session = await stripe.checkout.sessions.create({
      ui_mode: b.ui === 'embedded' ? 'embedded' : 'elements',
      mode: 'subscription',
      line_items: [{ price, quantity: 1 }],
      // 26/11: card only (Apple Pay and Google Pay are cards, they stay). Amazon Pay and Satispay leave the page and come
      // back to the welcome page even when nothing was saved: 3 of 3 reservations that tried them on 25-26/11 failed
      // (Daksh twice from Instagram), against 4 of 4 by card. Klarna has no place in a €0 reservation.
      payment_method_types: ['card'],
      customer_email: email,
      metadata: meta,
      subscription_data: sub,
      return_url: `${SITE}/the-3d-future/welcome?session_id={CHECKOUT_SESSION_ID}`,
      // a checkout nobody finishes goes back after half an hour (Stripe's shortest)
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
    });
    return json({ client_secret: session.client_secret, pk: process.env.STRIPE_PUBLISHABLE_KEY, plan, price: d.eur, buyer, reserve: !!d.reserve, ...(used ? { note: 'That receipt already gave the €9 price to another member.' } : {}) });
  } catch (e) {
    if (e.code === 'not_configured') return notConfigured({ phase });
    console.error('[club] checkout', e.message);
    return fail(502, 'stripe', 'Could not open the payment, try again in a minute.', { phase });
  }
}

// 25/11 (Nico: «tutto nel sito»): the members' page /the-3d-future/inside
//   GET  /api/club/inside?m=<member link>  → what the page shows (api/_lib/club.js insideData)
//   GET  /api/club/preview (admin key)     → Nico's preview link of the page, open, with sample name and gift
//   POST /api/club/link  { email }          → the member link goes again to that email (always { ok: true })
//   POST /api/club/build { m, link, note }  → the build goes to Nico by email
async function inside(req) {
  const email = readMember(new URL(req.url).searchParams.get('m'));
  if (!email) return fail(403, 'bad_link', 'This link is not right. Write your email and we send you yours.');
  try { return json(await insideData(email)); } catch (e) { console.error('[club] inside', e.message); return fail(502, 'store', 'Could not open the club right now, try again in a minute.'); }
}
async function lostLink(req) {
  if (await limited(req, 'link', 5, 600)) return tooMany();
  const b = await body(req), email = cleanEmail(b?.email);
  if (!EMAIL.test(email)) return fail(400, 'bad_request', 'That email does not look right.');
  try { await sendInsideLink(email); } catch (e) { console.error('[club] link', e.message); }
  return json({ ok: true }); // the same answer for everyone: the page never says who is a member
}
async function sendBuild(req) {
  if (await limited(req, 'build', 6, 3600)) return tooMany();
  const b = await body(req), email = readMember(b?.m);
  if (!email) return fail(403, 'bad_link', 'Open the club from your own link to send your build.');
  const link = String(b.link || '').trim().slice(0, 300), note = String(b.note || '').trim().slice(0, 1500);
  if (!/^https?:\/\/[^\s]+\.[^\s]+$/i.test(link)) return fail(400, 'bad_request', 'Paste the link of your build, like https://your-tower.netlify.app');
  try { await noteBuild(email, link, note); return json({ ok: true }); } catch (e) { console.error('[club] build', e.message); return fail(502, 'mail', 'Could not send it right now, try again in a minute.'); }
}

async function welcome(req) {
  const id = new URL(req.url).searchParams.get('session_id') || '';
  if (!/^cs_(live|test)_[A-Za-z0-9]{8,200}$/.test(id)) return fail(400, 'bad_request', 'no payment to check');
  if (!stripe) return notConfigured();
  try {
    const s = await stripe.checkout.sessions.retrieve(id);
    const paid = s.status === 'complete' && (s.payment_status === 'paid' || s.payment_status === 'no_payment_required');
    if (!paid || s.metadata?.club !== CLUB) return fail(402, 'not_paid', 'not paid');
    // 25/11: a reservation shows "your seat is reserved" (Skool and the skill come on Saturday, when the card is charged)
    if (s.metadata?.reserve === '1') {
      const rank = Number(await kv('HGET', KEYS.rank, s.id).catch(() => 0)) || 0;
      return json({ reserved: true, name: firstName(s.metadata?.name || s.customer_details?.name), email: cleanEmail(s.customer_details?.email || s.customer_email), rank, gift: rank > 0 && rank <= CHEAP_SEATS, portal: PORTAL_URL });
    }
    let skill = '';
    try { skill = SITE + signedHref(HOUSE_SKILL_FILE, PAGE_TTL); } catch {}
    const em = cleanEmail(s.customer_details?.email || s.customer_email);
    return json({ name: firstName(s.metadata?.name || s.customer_details?.name), email: em, inside: em ? insideUrl(em) : '', skill, portal: PORTAL_URL });
  } catch (e) {
    console.error('[club] welcome', e.message);
    return e.statusCode === 404 ? fail(404, 'not_found', 'no such payment') : fail(502, 'stripe', 'could not check');
  }
}

// The withdrawal function (art. 54-bis Codice del consumo, from 19/6/2026): name, email and which purchase, then a
// confirmation screen with "Confirm withdrawal" (/withdraw). Saved with the time, a receipt to the person by email (the
// durable medium) and a line for Nico. No refund happens here: Nico handles it by hand.
async function withdraw(req) {
  if (await limited(req, 'withdraw', 5, 3600)) return fail(429, 'too_many', 'Too many tries, wait a while or write to info@omnyalab.com.');
  const b = await body(req);
  if (!b) return fail(400, 'bad_request', 'bad request');
  if (b.company) return json({ ok: true }); // the hidden field: a bot filled it
  const name = String(b.name || '').trim().replace(/\s+/g, ' ').slice(0, 80);
  const email = cleanEmail(b.email);
  const purchase = String(b.purchase || '').trim().replace(/\s+/g, ' ').slice(0, 200);
  if (!name || !EMAIL.test(email) || !purchase) return fail(400, 'bad_request', 'Name, email and purchase needed.');
  if (b.confirm !== true) return fail(400, 'bad_request', 'The withdrawal needs the Confirm withdrawal button.');
  const at = new Date();
  const id = `W-${at.toISOString().slice(0, 10).replace(/-/g, '')}-${randomBytes(3).toString('hex').toUpperCase()}`;
  const when = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', dateStyle: 'long', timeStyle: 'medium' }).format(at) + ' (Rome time)';
  const row = { id, at: at.toISOString(), name, email, purchase, ip: ipOf(req), ua: (req.headers.get('user-agent') || '').slice(0, 200) };
  try {
    await kv('LPUSH', KEYS.withdrawals, JSON.stringify(row));
  } catch (e) {
    console.error('[club] withdraw store', e.message);
    return fail(502, 'store', 'Could not save it, write to info@omnyalab.com.');
  }
  const lines = [`Withdrawal number: ${id}`, `Received on: ${when}`, `Name: ${name}`, `Email: ${email}`, `Purchase: ${purchase}`];
  let mailed = true;
  try {
    await sendMail({
      to: `${name} <${email}>`, replyTo: host.email,
      subject: `Your withdrawal is recorded · ${id}`,
      text: [`Hi ${firstName(name)},`, '', 'we received your withdrawal from the contract. This email is your receipt, keep it.', '', ...lines, '', 'We will get back to you by email about the refund.', '', 'Omnya Lab · Venice, Italy · VAT IT05578770264 · info@omnyalab.com'].join('\n'),
    });
  } catch (e) {
    mailed = false;
    console.error('[club] withdraw mail', e.message);
  }
  await sendMail({ to: host.email, replyTo: `${name} <${email}>`, subject: `[recesso] ${name} · ${purchase}`, text: [...lines, `Receipt email sent: ${mailed ? 'yes' : 'NO, send it by hand'}`, '', 'No refund was made automatically.'].join('\n') }).catch((e) => console.error('[club] withdraw notice', e.message));
  return json({ ok: true, id, at: row.at, when, mailed });
}
