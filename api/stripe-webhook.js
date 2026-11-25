// POST /api/stripe-webhook — Stripe calls this right after every checkout. The /learn/thanks page
// is a one-time-offer flow (see views/Thanks.astro): the download sits under an upsell, and if a
// buyer closes the tab, loses the redirect (Instagram's in-app browser does this a lot) or just
// doesn't scroll, they never see their PDF again. This sends it straight to their inbox too, so the
// thanks page is a bonus, not the only way to get what they paid for.
import Stripe from 'stripe';
import { sendMail } from './_lib/mail.js';
import { filesForProduct, isPack, oneFullGuide } from './_lib/learn-files.js'; // 10/11: each file comes with a signed link good for one year (/api/file)
import { everythingUpgrade } from './_lib/learn-upgrade.js';
import { host } from './_lib/config.js';
import { upgrade, placeBid } from './_lib/city.js';
import { metaEvent } from './_lib/meta.js';
import { fixEmail } from './_lib/mail-fix.js';
import { noteSale } from './_lib/centrale-sales.js';
import { markMailed } from './_lib/drip.js';
import { clubJoined, clubLeft, clubCharged, noteBuyer, noteReceipt } from './_lib/club.js';

// Omnya City upsell (6/11/2026): these products move the buyer (client_reference_id = username, dots sent as dashes).
const CITY = { 'Omnya City · The penthouse': 'penthouse', 'Omnya City · The best villa in Omnyawood': 'villa', 'Omnya City · A house by the fountain': 'fountain',
  'Omnya City · A townhouse on the water': 'town', 'Omnya City · A seafront villa': 'sea' }; // 7/11 Payment Links

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// Step 2 by email (10/11, Nico): after ONE Full guide the email says, under the PDFs, that "Everything we teach" costs
// only the difference, €53, with the link /go/everything-upgrade. Only when the switch in _lib/learn-upgrade.js has the
// Stripe link (while it is empty the email is exactly as before) and never to who paid for the pack or for anything else.
const UPGRADE_URL = 'https://www.omnyalab.com/go/everything-upgrade';
const UPGRADE_LINE = ['You already paid €5.99, so for you ', 'Everything we teach', ' is €53 instead of €59, with the four Full guides, the three playbooks, the prompt files and the checklist, and '];
// 20/11 (Nico, X2): from Sat 28/11/2026 00:00 Rome the email no longer offers it (the club card takes its place on the
// thanks pages, components/FunnelUpgrade.astro removes the card there from the same moment)
const UPGRADE_UNTIL = Date.parse('2026-11-28T00:00:00+01:00');
export const upgradeFor = (productNames, files, now = Date.now()) => !!everythingUpgrade && now < UPGRADE_UNTIL && oneFullGuide(files) && !productNames.some(isPack);

// The Towers Scene File by email (10/11, Nico): when the cart of the Full Towers Blueprint also holds the scene (a
// recommended product of that payment link, €12), its zip comes under the PDF with one line that says what it is: the
// base 3D scene that runs in the browser, not the photorealistic film of the reel. Without the scene in the cart the
// email is exactly as before, in the HTML and in the text part.
// 16/11: every zip (the Towers scene, the Stadium Builder skill) carries its own line (note, api/_lib/learn-files.js)
const split = (files) => ({ pdfs: files.filter((f) => !f.kind), zips: files.filter((f) => f.kind === 'zip') });
export const subjectFor = (files) => {
  const { pdfs, zips } = split(files);
  if (!pdfs.length) return `Your ${zips[0]?.name.replace(/^The /, '') || 'files'}`;
  if (pdfs.length > 1) return 'Your Omnya Lab files';
  return `Your ${pdfs[0].name}` + (zips.length ? ` and ${zips.map((z) => z.name.replace(/^The /, 'the ')).join(' and ')}` : '');
};

// 20/11 (Nico): a P.S. at the end of every delivery email: who bought a guide keeps The 3D Future at €9 a month
const CLUB_URL = 'https://www.omnyalab.com/the-3d-future';
const CLUB_PS = ['P.S. You bought this guide, so your seat in THE 3D FUTURE stays €9 a month, even after the first 100 · ', 'omnyalab.com/the-3d-future'];

export function filesEmail(name, files, upgrade = false) {
  const { zips } = split(files); // files come with the PDFs first and the zips after them (filesForProduct)
  const btn = (f) =>
    `<a href="https://www.omnyalab.com${f.href.replace(/&/g, '&amp;')}" style="display:inline-block;background:#b8613c;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;margin:4px 8px 4px 0">${f.kind === 'zip' ? `${f.name} · zip` : f.name}</a>`;
  return `<!doctype html><html><body style="margin:0;background:#edeae4;font:16px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#111">
<div style="max-width:520px;margin:0 auto;padding:40px 24px">
<p style="margin:0 0 28px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#6b6761">Omnya Lab</p>
<h1 style="margin:0 0 20px;font-size:28px;line-height:1.1;letter-spacing:-.03em;font-weight:600">Thanks, ${name}.</h1>
<p style="margin:0 0 14px">Here ${files.length > 1 ? 'are your files' : 'is your file'}, straight to your inbox — so you always have ${files.length > 1 ? 'them' : 'it'}, whatever the site is doing.</p>
<p style="margin:28px 0${zips.length ? ' 14px' : ''}">${files.map(btn).join('')}</p>${zips.filter((z) => z.note).map((z) => `
<p style="margin:0 0 28px;font-size:15px;color:#3a3936"><b>${z.name}</b> ${z.note}</p>`).join('')}${upgrade ? `
<p style="margin:0;padding-top:22px;border-top:1px solid #d6d1c8;font-size:15px;color:#3a3936">${UPGRADE_LINE[0]}<b>${UPGRADE_LINE[1]}</b>${UPGRADE_LINE[2]}<a href="${UPGRADE_URL}" style="color:#b8613c;font-weight:600">you can upgrade here</a>.</p>` : ''}
<p style="margin:28px 0 0;font-size:15px;color:#3a3936">${CLUB_PS[0]}<a href="${CLUB_URL}" style="color:#b8613c;font-weight:600">${CLUB_PS[1]}</a></p>
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

  // 20/11 (Nico): THE 3D FUTURE. A member who leaves goes on the list to take off Skool; a receipt number that Stripe
  // gives after the checkout goes into the index of the guide buyers (api/_lib/club.js). Both need these events on the
  // webhook in Stripe: customer.subscription.deleted, charge.updated
  if (event.type === 'customer.subscription.deleted') {
    try { await clubLeft(stripe, event.data.object); } catch (e) { console.error('[stripe-webhook] club left', e); return new Response('club failed', { status: 502 }); }
    return new Response('ok');
  }
  if (event.type === 'charge.updated' || event.type === 'charge.succeeded') {
    await noteReceipt(event.data.object).catch((e) => console.error('[stripe-webhook] receipt', e.message));
    // 25/11: the Saturday charge of a reserved seat sends the welcome email W1 (and the founders' gift to the first 100).
    // Both events: charge.succeeded is the right one, charge.updated (already on the webhook) is the fallback; W1 leaves once
    {
      try { await clubCharged(stripe, event.data.object); } catch (e) { console.error('[stripe-webhook] club charged', e.message); return new Response('club failed', { status: 502 }); }
    }
    return new Response('ok');
  }
  const clubPaid = event.type === 'checkout.session.async_payment_succeeded' && event.data.object?.metadata?.club;
  if (event.type !== 'checkout.session.completed' && !clubPaid) return new Response('ok');
  const session = event.data.object;

  // 20/11 (Nico): someone joined THE 3D FUTURE (our club checkout, api/club.js): the member in Redis, the Skool list for
  // Nico, the welcome email W1 with the House Builder skill. Nothing of the guide delivery below runs for them.
  // A bank debit that is still on its way ('unpaid') waits for checkout.session.async_payment_succeeded.
  if (session.metadata?.club) {
    if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') return new Response('ok');
    try {
      await clubJoined(stripe, session);
    } catch (e) {
      console.error('[stripe-webhook] club', e.message);
      return new Response('club failed', { status: 502 }); // Stripe tries again; every step is safe to repeat
    }
    return new Response('ok');
  }

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
    const r = await upgrade(u, kind, session.metadata.look).catch((e) => ({ error: e.message }));
    let refunded = false;
    if (r.error && session.payment_intent) refunded = !!(await stripe.refunds.create({ payment_intent: session.payment_intent }).catch(() => null)); // sold out meanwhile: money back
    await sendMail({
      to: host.email,
      subject: r.error ? `[city] ${kind} paid, NOT moved (${r.error})${refunded ? ', refunded' : ''}` : `[city] @${u} bought the ${kind}`,
      text: r.error ? `@${u}: ${r.error}. ${refunded ? 'Refunded automatically.' : 'Refund by hand.'}` : r.job ? `@${u} is now ${r.job}.\nhttps://www.omnyalab.com/city/@${u}` : `@${u} moved from house #${r.house.from} to #${r.house.n}.${r.moved ? `\n@${r.moved.u} lived there and moved to #${r.moved.to}.` : ''}\nhttps://www.omnyalab.com/city/@${u}`,
    }).catch(() => {});
    return new Response('ok');
  }

  // 11/11: a slip in the domain (hoymail, gmial, gmail.con…) is put right before anything is sent, or the PDFs go to nobody
  const email = fixEmail(session.customer_details?.email);
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

    // 20/11: the email of a guide buyer goes into the index of THE 3D FUTURE (who bought a guide keeps €9 a month), with
    // the receipt number when Stripe has it. Nothing in it can stop the delivery
    await noteBuyer(stripe, session, productNames).catch((e) => console.error('[stripe-webhook] club buyer', e.message));

    const upgrade = upgradeFor(productNames, files);
    const { pdfs, zips } = split(files);
    await sendMail({
      to: `${name} <${email}>`,
      bcc: host.email,
      replyTo: host.email,
      subject: subjectFor(files),
      html: filesEmail(name, files, upgrade),
      text: [
        `Hi ${name},`,
        '',
        `Thanks for your order. Here ${files.length > 1 ? 'are your files' : 'is your file'}:`,
        '',
        ...pdfs.map((f) => `${f.name}: https://www.omnyalab.com${f.href}`),
        ...zips.flatMap((z, i) => [...(pdfs.length || i ? [''] : []), `${z.name} (zip): https://www.omnyalab.com${z.href}`, ...(z.note ? [`${z.name} ${z.note}`] : [])]),
        '',
        ...(upgrade ? [`${UPGRADE_LINE.join('')}you can upgrade here: ${UPGRADE_URL}`, ''] : []),
        'Nico · Omnya Lab',
        '',
        CLUB_PS[0] + CLUB_URL,
      ].join('\n'),
    });
    // 20/11: the follow-up series sends this buyer nothing more today (one email from us a day)
    await markMailed(email).catch(() => {});
    // the buyer is served: one row on the short list the mirror of Nico's app reads when his Mac is off (api/centrale.js).
    // Not waited for, and nothing in it can fail the delivery
    try {
      noteSale(event, session, productNames);
    } catch {}
  } catch (e) {
    console.error('[stripe-webhook] mail', e);
    return new Response('mail failed', { status: 502 });
  }

  return new Response('ok');
}
