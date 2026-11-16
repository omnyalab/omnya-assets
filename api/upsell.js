// POST /api/upsell {session_id, offer} — the one-tap offer on /learn/thanks/full-stadium (16/11, Nico, board T1 + T2).
// T1, who bought the Full Stadium Guide (€5.99): the Stadium Builder skill for €3.99 more.
// T2, who bought the Guide + Claude Skill (€9.99): Everything we teach for €45.99 more.
// The stadium checkout keeps the card for this (api/embed-checkout.js, setup_future_usage), so here we charge the
// same card again, once: the idempotency key is the payment + the offer, two taps never charge twice. The buyer gets
// the files at once on the page and by email, like after a checkout.
// When the card cannot be charged again like this (paid by a payment link, the bank wants a code, a refusal), the
// answer is a Stripe page for the same price, and the webhook delivers as after any payment.
// Only who holds the session id of a paid stadium checkout (in their thanks page address) gets here.
import Stripe from 'stripe';
import { filesForProduct, isPack, PAGE_TTL, MAIL_TTL } from './_lib/learn-files.js';
import { sendMail } from './_lib/mail.js';
import { host } from './_lib/config.js';
import { fixEmail } from './_lib/mail-fix.js';
import { filesEmail, subjectFor } from './stripe-webhook.js';

const SITE = 'https://www.omnyalab.com';
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

// the product names are the ones learn-files.js already knows: the skill rule gives the Full Stadium + the skill zip,
// "Everything we teach · upgrade" gives the whole pack
const OFFERS = {
  skill: { amount: 399, name: 'Stadium Builder skill · upgrade', back: 'full-stadium' },
  all: { amount: 4599, name: 'Everything we teach · upgrade', back: 'everything' },
};
const HOURS = 48;

export async function POST(request) {
  if (!stripe) return json({ error: 'not configured' }, 503);
  let body = {};
  try { body = await request.json(); } catch (e) {}
  const id = String(body.session_id || ''), o = OFFERS[body.offer];
  if (!o || !/^cs_(live|test)_[A-Za-z0-9]{8,200}$/.test(id)) return json({ error: 'bad request' }, 400);
  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(id, { expand: ['line_items.data.price.product', 'payment_intent'] });
  } catch (e) {
    return json({ error: 'no payment' }, 404);
  }
  if (session.status !== 'complete' || session.payment_status !== 'paid') return json({ error: 'not paid' }, 402);
  if (session.created * 1000 < Date.now() - HOURS * 3600e3) return json({ error: 'too old' }, 410);
  const names = (session.line_items?.data || []).map((it) => it.price?.product?.name || it.description || '');
  const stadium = names.some((n) => /stadium/i.test(n)), skill = names.some((n) => /skill/i.test(n)), pack = names.some(isPack);
  // T1 only after the Full alone, T2 after the guide + skill (or the Full), never after the pack
  if (!stadium || pack || (body.offer === 'skill' && skill)) return json({ error: 'not for this payment' }, 409);
  const email = fixEmail(session.customer_details?.email) || '';
  const name = (session.customer_details?.name || '').trim().split(/\s+/)[0] || 'there';
  const pi = session.payment_intent;
  const pm = pi && typeof pi === 'object' ? pi.payment_method : null;
  const customer = typeof session.customer === 'string' ? session.customer : session.customer?.id;

  // the same card, one tap
  if (customer && pm && pi.setup_future_usage === 'off_session') {
    try {
      const pay = await stripe.paymentIntents.create({
        amount: o.amount, currency: 'eur', customer, payment_method: typeof pm === 'string' ? pm : pm.id,
        off_session: true, confirm: true, description: o.name, receipt_email: email || undefined,
        metadata: { from: 'thanks-upsell', offer: body.offer, after: id, product: o.name },
      }, { idempotencyKey: `upsell-${id}-${body.offer}` });
      if (pay.status === 'succeeded') {
        const files = filesForProduct([o.name], { ttl: PAGE_TTL });
        if (email) {
          const mailFiles = filesForProduct([o.name], { ttl: MAIL_TTL });
          await sendMail({ to: `${name} <${email}>`, bcc: host.email, replyTo: host.email, subject: subjectFor(mailFiles), html: filesEmail(name, mailFiles),
            text: [`Hi ${name},`, '', 'Thanks for your order. Here are your files:', '', ...mailFiles.map((f) => `${f.name}${f.kind === 'zip' ? ' (zip)' : ''}: ${SITE}${f.href}`), '', 'Nico · Omnya Lab'].join('\n') }).catch((e) => console.error('[upsell] mail', e.message));
        }
        return json({ ok: true, files: files.map((f) => ({ name: f.name, href: f.href, ...(f.kind ? { kind: f.kind } : {}) })), email });
      }
    } catch (e) {
      console.error('[upsell] one tap', e.code || e.message);
    }
  }

  // otherwise a Stripe page for the same price, back to the thanks page of what they get
  try {
    const page = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: o.amount, product_data: { name: o.name } } }],
      ...(email ? { customer_email: email } : {}),
      success_url: `${SITE}/learn/thanks/${o.back}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE}/learn/thanks/full-stadium?session_id=${id}`,
      metadata: { from: 'thanks-upsell', offer: body.offer, after: id },
    });
    return json({ url: page.url });
  } catch (e) {
    console.error('[upsell] page', e.message);
    return json({ error: 'could not charge' }, 502);
  }
}
