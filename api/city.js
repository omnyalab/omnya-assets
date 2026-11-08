// Omnya City API, one function for all of it (vercel.json sends /api/city/<action> here).
//   POST /api/city/link     { username, igId }  header X-City-Secret (or Bearer) = CITY_LINK_SECRET
//                           → { url } : ManyChat's External Request puts it on the "Reserve my spot" button
//   GET  /api/city/peek?k=  → whose link this is (the page shows the name, locked)
//   POST /api/city/reserve  { k } → { house } : uses the link, gives the next free lot
//   GET  /api/city/houses   → { houses: [[username, lot], …] } for the map
//   GET  /api/city/house?u= → { house, neighbour } for /city/@username
//   GET  /api/city/buy?kind=town|sea&u=  → 303 to our Stripe Checkout (7/11: townhouses €0.99, seafront villas €2.99)
//   GET  /api/city/auction                → the yacht and the island: leader, bid, minimum, end (closes them when the time is up)
//   POST /api/city/bid { item, u, amount } → { url } : Stripe Checkout that only holds the money (see api/_lib/city.js)
import Stripe from 'stripe';
import { cleanName, linkFor, peek, reserve, allHouses, houseOf, onLot, heal, neighbourOf, jobOf, ep2From, forSale, stockOf, PRICES, TITLES,
  AUCTIONS, auctionState, minBid, auctionOpen, closeAuction, markAuction, publicAuctions } from './_lib/city.js';
import { sendMail } from './_lib/mail.js';
import { host } from './_lib/config.js';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

/** Captures the winner's held payment once the timer is over (called on every map and auction read). */
async function settleAuctions() {
  for (const item of Object.keys(AUCTIONS)) {
    const st = await auctionState(item);
    if (st.done || !st.end || Date.now() < st.end || !st.top) continue;
    const won = await closeAuction(item);
    if (!won) continue;
    let ok = true, why = '';
    try { if (stripe && won.top.pi) await stripe.paymentIntents.capture(won.top.pi); } catch (e) { ok = false; why = e.message; }
    await markAuction(item, { captured: ok, why });
    await sendMail({
      to: host.email,
      subject: ok ? `[city] @${won.top.u} won ${AUCTIONS[item].title} for €${(won.top.amt / 100).toFixed(2)}` : `[city] ${AUCTIONS[item].title}: capture FAILED for @${won.top.u}`,
      text: ok ? `Paid and captured. https://www.omnyalab.com/city/${item}` : `The hold could not be captured (${why}). Check Stripe: ${won.top.pi}`,
    }).catch((e) => console.error('[city] auction mail', e));
  }
}

const SITE = 'https://www.omnyalab.com'; // the apex answers 308 to www

const json = (body, status = 200, cache = 'no-store') =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': cache } });

const action = (request) => {
  const url = new URL(request.url);
  return url.searchParams.get('action') || url.pathname.replace(/\/+$/, '').split('/').pop();
};

const pub = (h) => (h ? { u: h.u, n: h.n, t: h.t } : null);

async function body(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function authorised(request) {
  const secret = process.env.CITY_LINK_SECRET;
  if (!secret) return false;
  const got = request.headers.get('x-city-secret') || (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  return got === secret;
}

export async function POST(request) {
  const a = action(request);
  try {
    if (a === 'link') {
      if (!authorised(request)) return json({ error: 'secret' }, 401);
      const b = await body(request);
      const u = cleanName(b.username ?? b.ig_username ?? b.name);
      if (!u) return json({ error: 'username' }, 400);
      const r = await linkFor(u, String(b.igId ?? b.ig_id ?? b.user_id ?? b.id ?? '').slice(0, 40));
      const url = r.house ? `${SITE}/city/@${u}` : `${SITE}/city?k=${r.token}`;
      return json({ url, username: u, has_house: Boolean(r.house), lot: r.house?.n ?? null });
    }
    if (a === 'bid') {
      const b = await body(request);
      const item = String(b.item || ''), u = cleanName(b.u), amt = Math.round(Number(b.amount) * 100);
      if (!AUCTIONS[item]) return json({ error: 'item' }, 400);
      if (!u || !(await houseOf(u))) return json({ error: 'nohouse' }, 404);
      const st = await auctionState(item);
      if (!auctionOpen(st)) return json({ error: 'ended' }, 409);
      const min = minBid(item, st);
      if (!Number.isFinite(amt) || amt < min) return json({ error: 'low', min }, 409);
      if (amt > 1_000_000) return json({ error: 'high' }, 400);
      if (!stripe) return json({ error: 'stripe' }, 503);
      const name = `Omnya City · ${AUCTIONS[item].title} of @${u} (bid)`;
      const s = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: amt, product_data: { name } } }],
        payment_intent_data: { capture_method: 'manual', description: name, metadata: { auction: item, u, amt: String(amt) } },
        metadata: { auction: item, u, amt: String(amt) },
        client_reference_id: u.replace(/\./g, '-'),
        success_url: `${SITE}/city/${item}?bid=ok`,
        cancel_url: `${SITE}/city/${item}`,
        expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
      });
      return json({ url: s.url });
    }
    if (a === 'reserve') {
      const b = await body(request);
      const r = await reserve(String(b.k || ''));
      if (r.error === 'used') return json({ error: 'used' }, 410);
      if (r.error) return json({ error: r.error }, 409);
      return json({ house: pub(r.house), fresh: r.fresh });
    }
    return json({ error: 'action' }, 404);
  } catch (e) {
    console.error('[city]', a, e);
    return json({ error: 'server', stripe: e?.type?.startsWith?.('Stripe') ? e.code || e.type : undefined }, 500);
  }
}

export async function GET(request) {
  const a = action(request);
  const q = new URL(request.url).searchParams;
  try {
    if (a === 'houses') {
      await settleAuctions().catch((e) => console.error('[city] settle', e));
      await heal().then((d) => d.length && console.log('[city] healed', JSON.stringify(d))).catch((e) => console.error('[city] heal', e));
      const [houses, ep2, sale, auctions] = await Promise.all([allHouses(), ep2From(), forSale(), publicAuctions()]);
      return json({ houses, ep2, forSale: sale, auctions }, 200, 'public, max-age=0, s-maxage=5, stale-while-revalidate=30');
    }
    if (a === 'auction') {
      await settleAuctions().catch((e) => console.error('[city] settle', e));
      return json({ auctions: await publicAuctions(), now: Date.now() });
    }
    if (a === 'buy') {
      const kind = q.get('kind'), u = cleanName(q.get('u'));
      const back = `${SITE}/city/@${u}`;
      if (!PRICES[kind] || !u || !(await houseOf(u))) return Response.redirect(`${SITE}/city`, 303);
      if (!(await stockOf(kind))) return Response.redirect(`${back}?sold=${kind}`, 303);
      if (!stripe) return json({ error: 'stripe' }, 503);
      const name = `Omnya City · ${TITLES[kind]}`;
      const s = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: PRICES[kind], product_data: { name } } }],
        payment_intent_data: { description: `${name} for @${u}`, metadata: { buy: kind, u } },
        metadata: { buy: kind, u },
        client_reference_id: u.replace(/\./g, '-'),
        success_url: `${back}?moved=${kind}`,
        cancel_url: back,
      });
      return Response.redirect(s.url, 303);
    }
    if (a === 'peek') {
      const p = await peek(q.get('k'));
      return p ? json({ u: p.u, house: pub(p.house) }) : json({ error: 'used' }, 410);
    }
    if (a === 'house') {
      const u = cleanName(q.get('u'));
      const h = u ? await houseOf(u) : null;
      if (!h) return json({ error: 'none' }, 404);
      const next = await neighbourOf(h.n);
      return json({ house: pub(h), neighbour: next, job: await jobOf(u) }, 200, 'public, max-age=0, s-maxage=5');
    }
    return json({ error: 'action' }, 404);
  } catch (e) {
    console.error('[city]', a, e);
    return json({ error: 'server', stripe: e?.type?.startsWith?.('Stripe') ? e.code || e.type : undefined }, 500);
  }
}
