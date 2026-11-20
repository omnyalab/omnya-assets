// THE 3D FUTURE, the paid club (20/11, Nico): one function for all of it, like api/city.js (vercel.json sends
// /api/club/<action> here). The rules (dates, prices, seats, proofs) are in api/_lib/club.js. The addresses below are the
// ones the club page (src/pages/the-3d-future/index.astro) is built on: keep them as they are.
//   GET  /api/club/seats[?at=<ISO date>]     → { taken, left, phase: 'before'|'early'|'open'|'closed' }
//        ?at= previews the phase of another moment, like the cards (?at= on the thanks pages); taken is always the real one
//   POST /api/club/verify   { receipt?, email? }   → { buyer: bool, token? } (the token, 24 hours, is for checkout)
//   POST /api/club/checkout { name, email, plan: 'month'|'year', token?, ig?, v?, ui? }
//        → { client_secret, pk, plan, price, buyer } of a Stripe Checkout Session in subscription mode, embedded in our
//          page (ui 'elements' like api/embed-checkout.js, the default, or ui 'embedded' for Stripe's own form).
//          v = the variant of the name test ('a' THE 3D FUTURE, 'b' 3D THAT SELLS), kept in the metadata with ig
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
  CLUB, ROUND, CHEAP_SEATS, phaseAt, decide, priceId, seats, EMAIL, cleanEmail, cleanReceipt, firstName, signToken, readToken,
  limited, ipOf, receiptEmail, isBuyerEmail, isWaitlisted, fillWaitlist, backfill, lists, KEYS,
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
    const taken = await seats(stripe);
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
  closed: 'The doors of THE 3D FUTURE are closed right now. Get on the list and we email you when they open.',
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
  if (!name || !EMAIL.test(email) || !plan || (ig && !IG.test(ig)) || (b.token && String(b.token).length > 300) || (b.v && !v)) return fail(400, 'bad_request', 'Name, email and plan needed.');

  const now = clock(req), phase = phaseAt(now);
  if (phase === 'before' || phase === 'closed') return fail(403, 'closed', NO.closed, { phase });
  try {
    // who is a guide buyer: a token from verify (receipt or email), or this email itself
    let proof = readToken(b.token) || '';
    if (!proof && (await isBuyerEmail(stripe, typed).catch((e) => { if (e.code === 'not_configured') return false; throw e; }))) proof = `e:${email}`;
    // one proof gives the €9 price to one member: a receipt already used by someone else does not count again
    let used = false;
    if (proof) { const owner = await kv('HGET', KEYS.proofs, proof); if (owner && owner !== email) { used = true; proof = ''; } }
    const buyer = !!proof;
    const waitlisted = phase === 'early' && !buyer ? (await isWaitlisted(email)) || (typed.toLowerCase() !== email && (await isWaitlisted(typed.toLowerCase()))) : false;
    // the early doors first: who may not come in yet hears it before Stripe is even asked
    const pre = decide({ now, taken: 0, buyer, waitlisted, plan });
    if (!pre.ok) return fail(403, pre.error, NO[pre.error], { phase });
    if (!stripe || !process.env.STRIPE_PUBLISHABLE_KEY) return notConfigured({ phase });
    const taken = buyer ? 0 : await seats(stripe); // a buyer pays €9 whatever the count
    const d = decide({ now, taken, buyer, waitlisted, plan });
    const price = priceId(d.key);
    if (!price) return notConfigured({ phase });
    // empty ig / v / proof are left out (an empty value means "remove" for Stripe)
    const meta = Object.fromEntries(Object.entries({ club: CLUB, round: ROUND, ig: ig.replace(/^@/, ''), v, buyer: buyer ? 'yes' : 'no', name, plan, price: String(d.eur), proof }).filter(([, x]) => x));
    const session = await stripe.checkout.sessions.create({
      ui_mode: b.ui === 'embedded' ? 'embedded' : 'elements',
      mode: 'subscription',
      line_items: [{ price, quantity: 1 }],
      customer_email: email,
      metadata: meta,
      subscription_data: { metadata: meta },
      return_url: `${SITE}/the-3d-future/welcome?session_id={CHECKOUT_SESSION_ID}`,
      // a €9 seat held in a checkout nobody finishes goes back after half an hour (Stripe's shortest)
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
    });
    return json({ client_secret: session.client_secret, pk: process.env.STRIPE_PUBLISHABLE_KEY, plan, price: d.eur, buyer, ...(used ? { note: 'That receipt already gave the €9 price to another member.' } : {}) });
  } catch (e) {
    if (e.code === 'not_configured') return notConfigured({ phase });
    console.error('[club] checkout', e.message);
    return fail(502, 'stripe', 'Could not open the payment, try again in a minute.', { phase });
  }
}

async function welcome(req) {
  const id = new URL(req.url).searchParams.get('session_id') || '';
  if (!/^cs_(live|test)_[A-Za-z0-9]{8,200}$/.test(id)) return fail(400, 'bad_request', 'no payment to check');
  if (!stripe) return notConfigured();
  try {
    const s = await stripe.checkout.sessions.retrieve(id);
    const paid = s.status === 'complete' && (s.payment_status === 'paid' || s.payment_status === 'no_payment_required');
    if (!paid || s.metadata?.club !== CLUB) return fail(402, 'not_paid', 'not paid');
    let skill = '';
    try { skill = SITE + signedHref(HOUSE_SKILL_FILE, PAGE_TTL); } catch {}
    return json({ name: firstName(s.metadata?.name || s.customer_details?.name), email: cleanEmail(s.customer_details?.email || s.customer_email), skool: process.env.CLUB_SKOOL_URL || '', skill, portal: process.env.CLUB_PORTAL_URL || '' });
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
