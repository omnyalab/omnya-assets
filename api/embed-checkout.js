// POST /api/embed-checkout {p, email} — the real Stripe Checkout inside our funnel page (13/11, Nico: "the same
// Stripe checkout, with our mask on top"). It opens a Checkout Session in embedded mode with the very same prices
// as the product's payment link (read from Stripe, not copied here), so the webhook, the PDFs and the thanks page
// work exactly as with the links: same products, same names, return to /learn/thanks/<id>?session_id=….
// Needs STRIPE_PUBLISHABLE_KEY on Vercel (pk_live_…, Stripe > Developers > API keys). Without it, or if anything
// fails, it answers 503 and the page sends the buyer to the payment link, with the email filled in.
import Stripe from 'stripe';

const SITE = 'https://www.omnyalab.com';
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

// product -> its live payment link (src/lib/learn.ts) and the thanks page it returns to
const P = {
  'full-towers': { link: 'https://buy.stripe.com/28E00i2Kp4g04lEbmB8so0E', back: 'full-towers' },
  'full-towers-scene': { link: 'https://buy.stripe.com/7sY3cu2KpbIsaK2duJ8so0H', back: 'full-towers' },
  'full-build': { link: 'https://buy.stripe.com/5kQ3cuacR3bW2dwgGV8so0D', back: 'full-build' },
  'full-tower': { link: 'https://buy.stripe.com/cNi9AS1GlfYI5pI4Yd8so0z', back: 'full-tower' },
  everything: { link: 'https://buy.stripe.com/5kQcN4bgVbIs6tMeyN8so0C', back: 'everything' },
};

// the prices of each payment link, read once per warm instance
let LINKS = null;
async function itemsFor(url) {
  if (!LINKS) {
    LINKS = new Map();
    for await (const pl of stripe.paymentLinks.list({ limit: 100, active: true })) LINKS.set(pl.url, pl.id);
  }
  const id = LINKS.get(url);
  if (!id) throw new Error('payment link not found');
  const li = await stripe.paymentLinks.listLineItems(id, { limit: 10 });
  return li.data.map((x) => ({ price: x.price.id, quantity: x.quantity || 1 }));
}

export async function POST(request) {
  const pk = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!stripe || !pk) return json({ error: 'not configured' }, 503);
  let body = {};
  try { body = await request.json(); } catch (e) {}
  const p = P[body.p];
  if (!p) return json({ error: 'unknown product' }, 400);
  const email = String(body.email || '').trim();
  try {
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded_page',
      mode: 'payment',
      line_items: await itemsFor(p.link),
      return_url: `${SITE}/learn/thanks/${p.back}?session_id={CHECKOUT_SESSION_ID}`,
      ...(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? { customer_email: email } : {}),
      metadata: { from: 'watch-funnel' },
    });
    return json({ cs: session.client_secret, pk });
  } catch (e) {
    console.error('[embed-checkout]', e.message);
    return json({ error: 'could not open' }, 503);
  }
}
