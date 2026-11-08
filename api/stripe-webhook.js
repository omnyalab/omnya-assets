// POST /api/stripe-webhook — Stripe calls this right after every checkout. The /learn/thanks page
// is a one-time-offer flow (see views/Thanks.astro): the download sits under an upsell, and if a
// buyer closes the tab, loses the redirect (Instagram's in-app browser does this a lot) or just
// doesn't scroll, they never see their PDF again. This sends it straight to their inbox too, so the
// thanks page is a bonus, not the only way to get what they paid for.
import Stripe from 'stripe';
import { sendMail } from './_lib/mail.js';
import { filesForProduct } from './_lib/learn-files.js';
import { host } from './_lib/config.js';
import { upgrade, placeBid } from './_lib/city.js';
import { metaEvent } from './_lib/meta.js';

// Omnya City upsell (6/11/2026): these products move the buyer (client_reference_id = username, dots sent as dashes).
const CITY = { 'Omnya City · The penthouse': 'penthouse', 'Omnya City · The best villa in Omnyawood': 'villa', 'Omnya City · A house by the fountain': 'fountain',
  'Omnya City · A townhouse on the water': 'town', 'Omnya City · A seafront villa': 'sea' }; // 7/11 Payment Links

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

function filesEmail(name, files) {
  const btn = (f) =>
    `<a href="https://www.omnyalab.com${f.href}" style="display:inline-block;background:#b8613c;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;margin:4px 8px 4px 0">${f.name}</a>`;
  return `<!doctype html><html><body style="margin:0;background:#edeae4;font:16px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#111">
<div style="max-width:520px;margin:0 auto;padding:40px 24px">
<p style="margin:0 0 28px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#6b6761">Omnya Lab</p>
<h1 style="margin:0 0 20px;font-size:28px;line-height:1.1;letter-spacing:-.03em;font-weight:600">Thanks, ${name}.</h1>
<p style="margin:0 0 14px">Here ${files.length > 1 ? 'are your files' : 'is your file'}, straight to your inbox — so you always have ${files.length > 1 ? 'them' : 'it'}, whatever the site is doing.</p>
<p style="margin:28px 0">${files.map(btn).join('')}</p>
</div></body></html>`;
}

export async function POST(request) {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('[stripe-webhook] missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET');
    return new Response('not configured', { status: 500 });
  }

  const sig = request.headers.get('stripe-signature');
  const raw = await request.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    console.error('[stripe-webhook] bad signature', e.message);
    return new Response('bad signature', { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') return new Response('ok');
  const session = event.data.object;

  // 7/11 Omnya City: a bid on the yacht or the island (the money is only held: capture_method 'manual', so not 'paid' yet)
  if (session.metadata?.auction) {
    const { auction: item, u } = session.metadata, amt = Number(session.metadata.amt), pi = session.payment_intent;
    try {
      const r = await placeBid(item, { u, amt, pi });
      const drop = r.error ? pi : r.prev?.pi && r.prev.pi !== pi ? r.prev.pi : null; // too late or outbid: release that hold
      if (drop) await stripe.paymentIntents.cancel(drop).catch((e) => console.error('[stripe-webhook] release', e.message));
      await sendMail({
        to: host.email,
        subject: r.error ? `[city] bid on the ${item} too late (${r.error}), hold released` : `[city] @${u} bids €${(amt / 100).toFixed(2)} on the ${item}`,
        text: r.error ? `@${u} €${(amt / 100).toFixed(2)}: ${r.error}. The hold was released.` : `Ends ${new Date(r.end).toISOString()}.${r.prev ? `\n@${r.prev.u} (€${(r.prev.amt / 100).toFixed(2)}) was outbid, hold released.` : ''}\nhttps://www.omnyalab.com/city/${item}`,
      }).catch(() => {});
    } catch (e) {
      console.error('[stripe-webhook] auction', e);
      return new Response('auction failed', { status: 502 });
    }
    return new Response('ok');
  }

  if (session.payment_status !== 'paid') return new Response('ok');

  // 7/11 Omnya City: townhouse on the water / seafront villa, bought with our own Checkout (metadata.buy)
  if (session.metadata?.buy) {
    const { buy: kind, u } = session.metadata;
    const r = await upgrade(u, kind).catch((e) => ({ error: e.message }));
    let refunded = false;
    if (r.error && session.payment_intent) refunded = !!(await stripe.refunds.create({ payment_intent: session.payment_intent }).catch(() => null)); // sold out meanwhile: money back
    await sendMail({
      to: host.email,
      subject: r.error ? `[city] ${kind} paid, NOT moved (${r.error})${refunded ? ', refunded' : ''}` : `[city] @${u} bought the ${kind}`,
      text: r.error ? `@${u}: ${r.error}. ${refunded ? 'Refunded automatically.' : 'Refund by hand.'}` : `@${u} moved from house #${r.house.from} to #${r.house.n}.${r.moved ? `\n@${r.moved.u} lived there and moved to #${r.moved.to}.` : ''}\nhttps://www.omnyalab.com/city/@${u}`,
    }).catch(() => {});
    return new Response('ok');
  }

  const email = session.customer_details?.email;
  const name = session.customer_details?.name || 'there';

  // Meta Conversions API (8/11): the Purchase comes from here, not from the browser. event_id = the Checkout
  // Session, so a Stripe retry of this webhook is counted once. Nothing is sent until META_CAPI_TOKEN is on Vercel.
  await metaEvent({
    name: 'Purchase',
    id: `purchase_${session.id}`,
    url: 'https://www.omnyalab.com/learn',
    email,
    firstName: session.customer_details?.name || '',
    value: (session.amount_total || 0) / 100,
    currency: session.currency || 'eur',
  }).catch((e) => console.error('[stripe-webhook] meta', e));

  // Omnya City: buy a better place
  try {
    const items = await stripe.checkout.sessions.listLineItems(session.id, { expand: ['data.price.product'] });
    const kind = items.data.map((it) => CITY[it.price?.product?.name || it.description || '']).find(Boolean);
    if (kind) {
      const u = String(session.client_reference_id || '').replace(/-/g, '.').toLowerCase(); // Instagram names have no dashes
      const r = u ? await upgrade(u, kind) : { error: 'no username on the payment' };
      await sendMail({
        to: host.email,
        subject: r.error ? `[city] ${kind} paid, NOT moved: ${r.error}` : `[city] @${u} bought the ${kind}`,
        text: r.error
          ? `@${u || '?'} (${email || 'no email'}) paid for ${kind} but: ${r.error}. Move or refund by hand.`
          : `@${u} moved from house #${r.house.from} to #${r.house.n}.${r.moved ? `\n@${r.moved.u} lived there and moved to #${r.moved.to} (a villa in Omnyawood).` : ''}\nhttps://www.omnyalab.com/city/@${u}`,
      }).catch((e) => console.error('[stripe-webhook] city mail', e));
      return new Response('ok');
    }
  } catch (e) {
    console.error('[stripe-webhook] city', e);
    return new Response('city failed', { status: 502 });
  }

  if (!email) return new Response('ok');

  try {
    const items = await stripe.checkout.sessions.listLineItems(session.id, { expand: ['data.price.product'] });
    const productNames = items.data.map((it) => it.price?.product?.name || it.description || '').filter(Boolean);
    const files = filesForProduct(productNames);

    if (!files.length) {
      // a lesson (Session/Build) or a product this mapping doesn't know yet: flag Nico, don't guess
      await sendMail({
        to: host.email,
        subject: `[stripe] no PDF mapped — ${productNames.join(', ') || 'unknown product'}`,
        text: `${name} <${email}> paid for:\n${productNames.join('\n')}\n\nNo file matched — check api/_lib/learn-files.js or this might be a lesson (expected).`,
      });
      return new Response('ok');
    }

    await sendMail({
      to: `${name} <${email}>`,
      bcc: host.email,
      replyTo: host.email,
      subject: files.length > 1 ? 'Your Omnya Lab playbooks' : `Your ${files[0].name}`,
      html: filesEmail(name, files),
      text: [
        `Hi ${name},`,
        '',
        `Thanks for your order. Here ${files.length > 1 ? 'are your files' : 'is your file'}:`,
        '',
        ...files.map((f) => `${f.name}: https://www.omnyalab.com${f.href}`),
        '',
        'Nico · Omnya Lab',
      ].join('\n'),
    });
  } catch (e) {
    console.error('[stripe-webhook] mail', e);
    return new Response('mail failed', { status: 502 });
  }

  return new Response('ok');
}
