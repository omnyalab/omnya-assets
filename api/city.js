// Omnya City API, one function for all of it (vercel.json sends /api/city/<action> here).
//   POST /api/city/link     { username, igId }  header X-City-Secret (or Bearer) = CITY_LINK_SECRET
//                           → { url } : ManyChat's External Request puts it on the "Reserve my spot" button
//   GET  /api/city/peek?k=  → whose link this is (the page shows the name, locked)
//   POST /api/city/reserve  { k } → { house } : uses the link, gives the next free lot
//   GET  /api/city/houses   → { houses: [[username, lot], …] } for the map
//   GET  /api/city/house?u= → { house, neighbour } for /city/@username
import { cleanName, linkFor, peek, reserve, allHouses, houseOf, onLot } from './_lib/city.js';

const SITE = 'https://omnyalab.com';

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
    return json({ error: 'server' }, 500);
  }
}

export async function GET(request) {
  const a = action(request);
  const q = new URL(request.url).searchParams;
  try {
    if (a === 'houses') {
      return json({ houses: await allHouses() }, 200, 'public, max-age=0, s-maxage=5, stale-while-revalidate=30');
    }
    if (a === 'peek') {
      const p = await peek(q.get('k'));
      return p ? json({ u: p.u, house: pub(p.house) }) : json({ error: 'used' }, 410);
    }
    if (a === 'house') {
      const u = cleanName(q.get('u'));
      const h = u ? await houseOf(u) : null;
      if (!h) return json({ error: 'none' }, 404);
      const next = await onLot(h.n + 1);
      return json({ house: pub(h), neighbour: next }, 200, 'public, max-age=0, s-maxage=5');
    }
    return json({ error: 'action' }, 404);
  } catch (e) {
    console.error('[city]', a, e);
    return json({ error: 'server' }, 500);
  }
}
