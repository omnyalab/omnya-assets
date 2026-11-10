// GET /api/files?session_id=cs_…&lang=en — what a buyer downloads on /learn/thanks/<product> (10/11).
// The page shows the PDFs only if Stripe itself says this Checkout Session is paid: the id comes back in the
// return address of every payment link (…/learn/thanks/<product>?session_id={CHECKOUT_SESSION_ID}).
// The files are the ones of the products on that payment, whatever page is asked for, as 24-hour signed links
// (api/file.js). The id works for 30 days after the payment; after that the buyer has the email.
// Fail closed: no id, a wrong one, not paid, Stripe not answering, no key → no links, and the page says the
// PDFs are in the buyer's inbox (the webhook sends them, with or without this page).
// GET ?key=IG_ADMIN_KEY → a fresh 30-day link for every file, as text: for Nico, to answer a buyer by hand.
import Stripe from 'stripe';
import { filesForProduct, allFiles, signedHref, isPack, PAGE_TTL, DAY } from './_lib/learn-files.js';

const SITE = 'https://www.omnyalab.com';
const DAYS = 30;
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export async function GET(request) {
  const q = new URL(request.url).searchParams;

  if (q.has('key')) {
    const key = process.env.IG_ADMIN_KEY;
    if (!key || q.get('key') !== key) return new Response('Not found', { status: 404 });
    try {
      const rows = allFiles().map((f) => `${f.name}\n${SITE}${signedHref(f.file, DAYS * DAY)}`);
      return new Response(`Links good for ${DAYS} days, one per file. Send only the ones the buyer paid for.\n\n${rows.join('\n\n')}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
    } catch (e) {
      return new Response('not configured', { status: 503 });
    }
  }

  const id = q.get('session_id') || '';
  if (!/^cs_(live|test)_[A-Za-z0-9]{8,200}$/.test(id)) return json({ error: 'no payment to check' }, 400);
  if (!stripe) {
    console.error('[files] missing STRIPE_SECRET_KEY');
    return json({ error: 'not configured' }, 503);
  }
  try {
    const session = await stripe.checkout.sessions.retrieve(id, { expand: ['line_items.data.price.product'] });
    const paid = session.status === 'complete' && (session.payment_status === 'paid' || session.payment_status === 'no_payment_required');
    if (!paid) return json({ error: 'not paid' }, 402);
    if (session.created * 1000 < Date.now() - DAYS * DAY * 1000) return json({ error: 'too old' }, 410);
    // the Omnya City products are houses, not PDFs (the webhook handles them before the files too)
    const names = (session.line_items?.data || []).map((it) => it.price?.product?.name || it.description || '').filter((n) => n && !/^omnya city/i.test(n));
    const files = filesForProduct(names, { ttl: PAGE_TTL, lang: q.get('lang') === 'it' ? 'it' : 'en' });
    // pack: this payment already holds "Everything we teach" (any of its prices), so the page does not offer the upgrade
    return json({ files: files.map((f) => ({ name: f.name, href: f.href })), pack: names.some(isPack) });
  } catch (e) {
    console.error('[files]', e.message);
    return json({ error: 'could not check' }, e.statusCode === 404 ? 404 : 502);
  }
}
