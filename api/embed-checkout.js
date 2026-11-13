// POST /api/embed-checkout {p, email} — the real Stripe Checkout inside our funnel page (13/11, Nico: "the same
// Stripe checkout, with our mask on top"). It opens a Checkout Session in embedded mode with the very same prices
// as the product's payment link, so the webhook, the PDFs and the thanks page
// work exactly as with the links: same products, same names, return to /learn/thanks/<id>?session_id=….
// Needs STRIPE_PUBLISHABLE_KEY on Vercel (pk_live_…, Stripe > Developers > API keys). Without it, or if anything
// fails, it answers 503 and the page sends the buyer to the payment link, with the email filled in.
import Stripe from 'stripe';

const SITE = 'https://www.omnyalab.com';
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

// product -> the prices of its live payment link (src/lib/learn.ts), copied from the Stripe dashboard on 13/11: the
// live secret key may not read payment links ("permission denied"), so the prices are written here. If a payment
// link changes price, change it here too. The thanks page it returns to is the same as the link's.
const P = {
  'full-towers': { items: ['price_1UZz2fATIF7pxfqfRyPDkrrS'], back: 'full-towers' }, // buy.stripe.com/28E00i2Kp4g04lEbmB8so0E · 5,99
  'full-towers-scene': { items: ['price_1UZz2fATIF7pxfqfRyPDkrrS', 'price_1UaAr6ATIF7pxfqfbRzsrio6'], back: 'full-towers' }, // 7sY3cu2KpbIsaK2duJ8so0H · 5,99 + scene 12
  'full-build': { items: ['price_1UZs1KATIF7pxfqfhu30zYy6'], back: 'full-build' }, // 5kQ3cuacR3bW2dwgGV8so0D · 5,99
  'full-tower': { items: ['price_1UZTEcATIF7pxfqfwl2Vl0eu'], back: 'full-tower' }, // cNi9AS1GlfYI5pI4Yd8so0z · 5,99
  everything: { items: ['price_1UZlPGATIF7pxfqf9vf0kJhG'], back: 'everything' }, // 5kQcN4bgVbIs6tMeyN8so0C · 59
};

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
      line_items: p.items.map((price) => ({ price, quantity: 1 })),
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
