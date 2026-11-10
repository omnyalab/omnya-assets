// /centrale — the mirror of Nico's own app (the "Centrale Omnya" that runs on his Mac), so the phone opens it from
// anywhere, also when the Mac is off. The app does not move: the Mac keeps doing the work and pushes here what its
// page shows, this function keeps it in Redis and gives it back to the phone. One function, no new env var, no new service.
//
// Who gets in
//   the Mac    POST /api/centrale with "Authorization: Bearer IG_ADMIN_KEY" (never in the address)
//   the phone  /centrale?k=<key> the first time, then a cookie (HttpOnly, Secure, SameSite=Lax, only for /centrale).
//              The key is made on the Mac and only its SHA-256 comes here, inside the pack: "Cambia la chiave" on the
//              Mac pushes a new hash and the old phones are out
//   anybody else gets the 404 of a page that does not exist, whatever they ask and however they ask it
//
// What the Mac pushes (specchio.py in the app, one POST, every part optional)
//   meta    the small state: hash of the key, version and hour of the money, a hash per block and per file, the list
//           of what the phone may ask the Mac to do, the private ntfy channel of the bell. Every push with meta is
//           also the heartbeat ("the Mac is on")
//   dati    the blocks that changed: the JSON answers of the page's GETs, as the phone sees them
//   file    the page itself (index.html, app.js, app.css, icons, reel covers), only when it changes: when the app on
//           the Mac is updated the mirror follows by itself, without a deploy
//   esiti   the answers to the phone's commands · prendi: hand me the commands in line · svuota: delete everything
//
// What the phone asks (all under /centrale/…, rewritten here by vercel.json)
//   /centrale                 the page, with the small script of _lib/centrale-page.js in its head
//   /centrale/<file>          the page's files
//   /centrale/stato           "anything new?": one Redis read
//   /centrale/dati?s=a,b      those blocks and the state, in one Redis read
//   POST /centrale/comando    a command for the Mac: it goes in line in Redis and the bell rings on the Mac's private
//                             ntfy channel (the message says only "specchio", no data). Only what the Mac listed
//   /centrale/esito?id=       the Mac's answer to that command, when it is there
//
// Inside the blocks there are names and numbers of leads: nothing is logged, every answer with data is no-store, and
// nothing leaves without the key. Redis is the one of the Instagram bot, so every request here is one or two commands.
import { createHash, timingSafeEqual, randomUUID } from 'node:crypto';
import { redis, hasStore } from './_lib/store.js';
import { SALES, KEEP, salesAfter } from './_lib/centrale-sales.js';
import { shim } from './_lib/centrale-page.js';

const P = 'omnya:centrale:';
const K = { meta: `${P}meta`, coda: `${P}coda`, d: (n) => `${P}d:${n}`, f: (n) => `${P}f:${n}`, e: (id) => `${P}e:${id}` };
const BASE = '/centrale';
const COOKIE = 'centrale_k';
const OFF_AFTER = 11 * 60_000; // the Mac says "I'm on" every 5 minutes: two missed and it is off
const QUEUE_MS = 12 * 3_600_000; // a command that can wait for the Mac stays good this long
const LIVE_MS = 20_000; // one that makes sense only now (it opens WhatsApp, it previews) is thrown away after this
const MAX_QUEUE = 60;
const CHECK_MS = 20_000; // how often the open page asks "anything new?"
const GUARDA = '/specchio/guarda';
const BLOCK = /^[a-z]{2,24}$/;
const FILE = /^(?!.*\.\.)[A-Za-z0-9][A-Za-z0-9._/-]{0,90}$/;
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const OWN = ['index.html', 'app.js', 'app.css'];

const SAFE = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' };
const json = (o, status = 200) => new Response(typeof o === 'string' ? o : JSON.stringify(o), { status, headers: { ...SAFE, 'Content-Type': 'application/json; charset=utf-8' } });
const sha = (s) => createHash('sha256').update(String(s)).digest('hex');
const same = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const parse = (s) => {
  try {
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
};

const origin = (request) => {
  const u = new URL(request.url);
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || u.host;
  const proto = request.headers.get('x-forwarded-proto') || u.protocol.replace(':', '');
  return /^[A-Za-z0-9.:-]+$/.test(host) ? `${proto}://${host}` : u.origin;
};

// Without the key the answer is the site's own "page not found": asked once to the site itself (an address that
// does not exist) and kept, so here there is nothing to tell this address from one that was never there.
let page404 = null;
async function notFound(request) {
  if (!page404 || Date.now() - page404.at > 3_600_000) {
    try {
      const r = await fetch(`${origin(request)}/page-not-found`, { signal: AbortSignal.timeout(3000) });
      if (r.status === 404) page404 = { body: await r.text(), type: r.headers.get('content-type'), cache: r.headers.get('cache-control'), at: Date.now() };
    } catch {}
  }
  const p = page404 || { body: 'Not Found', type: 'text/plain; charset=utf-8', cache: null };
  const headers = { 'Content-Type': p.type || 'text/html; charset=utf-8' };
  if (p.cache) headers['Cache-Control'] = p.cache;
  return new Response(request.method === 'HEAD' ? null : p.body, { status: 404, headers });
}

const cookie = (request) => {
  for (const part of (request.headers.get('cookie') || '').split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === COOKIE) return rest.join('=').trim();
  }
  return '';
};
const setCookie = (key) => `${COOKIE}=${key}; Max-Age=34560000; Path=${BASE}; HttpOnly; Secure; SameSite=Lax`;

/** What is asked: '' is the page; the rest comes from the rewrite (/centrale/<what> → ?f=<what>) or from the path. */
const what = (url) => {
  const f = url.searchParams.getAll('f');
  if (f.length) return f.join('/').replace(/^\/+|\/+$/g, '');
  const m = url.pathname.match(/^\/centrale\/(.+?)\/?$/);
  return m ? m[1] : '';
};

const isMac = (request) => {
  const key = process.env.IG_ADMIN_KEY;
  const got = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  return !!key && !!got && same(sha(got), sha(key));
};
/** The phone's key is good when its hash is the one the Mac pushed, and the Mac did not close the door. */
const opens = (meta, key) => !!meta && meta.acceso !== false && !!key && key.length <= 200 && same(sha(key), meta.chiave);
const isOff = (meta, now = Date.now()) => now - (Number(meta.battito) || 0) > OFF_AFTER;

/** What the open page needs to know: never the key's hash, the channel of the bell or the list of commands. */
async function stateFor(meta) {
  const now = Date.now();
  const s = { v: meta.v || 0, letta: meta.letta || '', h: meta.h || {}, pagina: meta.pagina || '', battito: Number(meta.battito) || 0, adesso: now, spento: isOff(meta, now) };
  if (s.spento) {
    try {
      // Mac off: the payments the Stripe webhook noted after the last numbers the Mac read
      const dopo = salesAfter(await redis('LRANGE', SALES, 0, KEEP - 1), Number(meta.letta_ms) || s.battito);
      if (dopo.n) s.dopo = dopo;
    } catch {}
  }
  return s;
}

// ---------- the page ----------

const staticNames = (meta) => Object.keys(meta.file || {}).filter((n) => !OWN.includes(n) && !n.startsWith('copertina/'));

function page(html, meta, key) {
  const k = `?k=${encodeURIComponent(key)}`;
  const ver = (n) => (meta.file?.[n] ? `?h=${meta.file[n]}` : '');
  // the page's own files live under /centrale/ here. The manifest and the touch icon are fetched by iOS on its own,
  // without the cookie, so they carry the key in their address (as the Mac does at home)
  let out = html.replace(/<(link|script|img)\b[^>]*>/g, (tag) =>
    tag.replace(/\b(href|src)="\/(?!\/)([^"?#]*)"/, (m, attr, path) => `${attr}="${BASE}/${path}${/^<link\b/.test(tag) && /rel="(manifest|apple-touch-icon)"/.test(tag) ? k : ver(path)}"`),
  );
  const C = { base: BASE, blocchi: Object.keys(meta.h || {}), file: staticNames(meta), pagina: meta.pagina || '', ogni: CHECK_MS };
  const head = `<meta name="robots" content="noindex, nofollow"><script>(${shim.toString()})(${JSON.stringify(C).replace(/</g, '\\u003c')});</script>`;
  out = /<head[^>]*>/i.test(out) ? out.replace(/<head[^>]*>/i, (m) => m + head) : head + out;
  return out;
}

/** app.js names a few pictures from the Mac's root ('/zecca.png'): here they are under /centrale/. */
function fixPaths(js, meta) {
  let out = js;
  for (const n of staticNames(meta)) out = out.split(`'/${n}'`).join(`'${BASE}/${n}'`).split(`"/${n}"`).join(`"${BASE}/${n}"`);
  return out;
}

const manifest = (key) => {
  const k = `?k=${encodeURIComponent(key)}`;
  return {
    name: 'Centrale Omnya', short_name: 'Centrale', lang: 'it', start_url: `${BASE}${k}`, scope: BASE, display: 'standalone',
    background_color: '#ffffff', theme_color: '#ffffff',
    icons: [192, 512].map((n) => ({ src: `${BASE}/icona-${n}.png${k}`, sizes: `${n}x${n}`, type: 'image/png' })),
  };
};

export async function GET(request) {
  const url = new URL(request.url);
  const keys = [url.searchParams.get('k'), cookie(request)].filter((x) => x && x.length <= 200);
  if (!hasStore() || !keys.length) return notFound(request);
  const w = what(url);
  const blocks = (url.searchParams.get('s') || '').split(',').filter((n) => BLOCK.test(n)).slice(0, 20);
  const id = url.searchParams.get('id') || '';
  const extra = w === '' ? [K.f('index.html')] : w === 'stato' || w === 'manifest.webmanifest' ? [] : w === 'dati' ? blocks.map(K.d) : w === 'esito' ? (ID.test(id) ? [K.e(id)] : null) : w !== 'comando' && FILE.test(w) ? [K.f(w)] : null;
  if (!extra) return notFound(request);
  let meta, rest;
  try {
    const got = await redis('MGET', K.meta, ...extra);
    meta = parse(got[0]);
    rest = got.slice(1);
  } catch (e) {
    console.error('[centrale] redis', e.message);
    return json({ errore: 'Lo specchio adesso non risponde' }, 503);
  }
  const key = keys.find((x) => opens(meta, x)); // an old link opened on a phone that already has the good cookie still gets in
  if (!key) return notFound(request);

  if (w === '') {
    const f = parse(rest[0]);
    if (!f || typeof f.b !== 'string') return new Response('La pagina non è ancora arrivata dal Mac', { status: 503, headers: { ...SAFE, 'Content-Type': 'text/plain; charset=utf-8' } });
    return new Response(page(f.b, meta, key), { headers: { ...SAFE, 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': setCookie(key) } });
  }
  if (w === 'stato') return json(await stateFor(meta));
  if (w === 'dati') {
    // the blocks go out as the Mac wrote them, without being read here
    const body = `{"stato":${JSON.stringify(await stateFor(meta))},"dati":{${blocks.map((n, i) => `${JSON.stringify(n)}:${rest[i] || 'null'}`).join(',')}}}`;
    return json(body);
  }
  if (w === 'esito') return json({ esito: parse(rest[0]) });
  if (w === 'manifest.webmanifest') return new Response(JSON.stringify(manifest(key)), { headers: { ...SAFE, 'Content-Type': 'application/manifest+json; charset=utf-8' } });

  const f = parse(rest[0]);
  if (!f || typeof f.b !== 'string') return notFound(request);
  const body = f.x === 'b64' ? Buffer.from(f.b, 'base64') : w === 'app.js' ? fixPaths(f.b, meta) : f.b;
  // the page's files hold no data: the phone may keep them (only the phone: private), the address changes with the file
  const keep = url.searchParams.get('h') === f.h ? 'private, max-age=31536000, immutable' : url.searchParams.has('v') ? 'private, max-age=2592000' : 'private, max-age=600';
  return new Response(body, { headers: { ...SAFE, 'Cache-Control': keep, 'Content-Type': f.t || 'application/octet-stream' } });
}

// ---------- the phone asks the Mac to do something ----------

async function ring(meta) {
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(meta.canale || '') || !/^(https:\/\/|http:\/\/127\.0\.0\.1:)/.test(meta.ntfy || '')) return false;
  try {
    const r = await fetch(`${String(meta.ntfy).replace(/\/+$/, '')}/${meta.canale}`, { method: 'POST', body: 'specchio', headers: { Cache: 'no', Firebase: 'no' }, signal: AbortSignal.timeout(2500) });
    return r.ok;
  } catch {
    return false;
  }
}

async function fromPhone(request) {
  const key = cookie(request);
  if (!key || key.length > 200) return notFound(request);
  const meta = parse(await redis('GET', K.meta));
  if (!opens(meta, key)) return notFound(request);
  // only the mirrored page itself: its own header, and no other site behind it
  const from = request.headers.get('origin');
  if (request.headers.get('x-centrale') !== '1' || (from && from !== origin(request))) return json({ errore: 'Richiesta non capita' }, 400);
  const raw = await request.text();
  if (raw.length > 200_000) return json({ errore: 'Troppo lungo' }, 413);
  const body = parse(raw);
  const percorso = body && typeof body.percorso === 'string' ? body.percorso : '';
  const dati = body && body.dati && typeof body.dati === 'object' && !Array.isArray(body.dati) ? body.dati : null;
  if (!percorso || !dati) return json({ errore: 'Richiesta non capita' }, 400);

  // only what the Mac says a phone may do; 1 = it can wait in line for the Mac, 0 = only while the Mac is on
  const guarda = percorso === GUARDA;
  const list = meta.permessi && typeof meta.permessi === 'object' ? meta.permessi[percorso] : null;
  const azione = String(dati.azione ?? '');
  const waits = guarda ? 0 : list && Object.prototype.hasOwnProperty.call(list, azione) ? (list[azione] ? 1 : 0) : null;
  if (waits === null) return json({ errore: 'Dallo specchio questo non si può fare: fallo dal Mac' }, 400);
  const now = Date.now();
  const off = isOff(meta, now);
  if (off && !waits) return guarda ? json({ mac: false }) : json({ errore: 'Il Mac è spento: questo si fa quando è acceso' }, 503);

  const id = randomUUID();
  const n = await redis('RPUSH', K.coda, JSON.stringify({ id, p: percorso, d: dati, t: now, s: now + (waits ? QUEUE_MS : LIVE_MS) }));
  if (n > MAX_QUEUE) await redis('LTRIM', K.coda, -MAX_QUEUE, -1);
  const campanello = off ? false : await ring(meta);
  return json({ id, mac: !off, coda: !!waits, campanello });
}

// ---------- the Mac pushes ----------

const hashes = (o, re) => Object.fromEntries(Object.entries(o && typeof o === 'object' ? o : {}).filter(([n, h]) => re.test(n) && typeof h === 'string' && h.length <= 64));

function cleanMeta(m) {
  if (!m || typeof m !== 'object' || !/^[0-9a-f]{64}$/.test(m.chiave || '')) return null;
  return {
    chiave: m.chiave, acceso: m.acceso !== false, canale: String(m.canale || '').slice(0, 80), ntfy: String(m.ntfy || '').slice(0, 200),
    permessi: m.permessi && typeof m.permessi === 'object' ? m.permessi : {}, v: Number(m.v) || 0, letta: String(m.letta || '').slice(0, 40), letta_ms: Number(m.letta_ms) || 0,
    h: hashes(m.h, BLOCK), file: hashes(m.file, FILE), pagina: String(m.pagina || '').slice(0, 64), battito: Date.now(),
  };
}

async function fromMac(request) {
  const body = parse(await request.text());
  if (!body || typeof body !== 'object') return json({ errore: 'non capito' }, 400);
  const out = { ok: true };

  if (body.svuota) {
    // the mirror is switched off on the Mac: nothing of it stays here (the list of the payments is the webhook's, and has no names)
    const old = parse(await redis('GET', K.meta)) || {};
    const keys = [K.meta, K.coda, ...Object.keys(old.h || {}).map(K.d), ...Object.keys(old.file || {}).map(K.f)];
    await redis('DEL', ...keys);
    return json({ ok: true, tolte: keys.length });
  }

  for (const f of Array.isArray(body.file) ? body.file : []) {
    if (!f || !FILE.test(f.n || '') || typeof f.b !== 'string') continue;
    await redis('SET', K.f(f.n), JSON.stringify({ t: String(f.t || '').slice(0, 80), h: String(f.h || '').slice(0, 64), x: f.x === 'b64' ? 'b64' : 'txt', b: f.b }));
  }
  const gone = (Array.isArray(body.togli) ? body.togli : []).filter((n) => FILE.test(n || ''));
  if (gone.length) await redis('DEL', ...gone.map(K.f));

  // the blocks that changed and the state go in together (one MSET): the phone never reads a state without its blocks
  const set = [];
  for (const [n, v] of Object.entries(body.dati && typeof body.dati === 'object' ? body.dati : {})) if (BLOCK.test(n)) set.push([K.d(n), JSON.stringify(v)]);
  const meta = body.meta ? cleanMeta(body.meta) : null;
  if (body.meta && !meta) return json({ errore: 'meta non capito' }, 400);
  if (meta) set.push([K.meta, JSON.stringify(meta)]);
  let size = 0, batch = [];
  for (const [k, v] of set) {
    if (batch.length && size + v.length > 700_000 && k !== K.meta) {
      await redis('MSET', ...batch); // a pack too big for one Redis request: the state still goes in last, with the last blocks
      batch = [];
      size = 0;
    }
    batch.push(k, v);
    size += v.length;
  }
  if (batch.length) await redis('MSET', ...batch);

  // the Mac's answers to the phone's commands: kept 15 minutes, and the first answer to a command is the only one
  for (const e of Array.isArray(body.esiti) ? body.esiti : []) {
    if (!e || !ID.test(e.id || '')) continue;
    await redis('SET', K.e(e.id), JSON.stringify({ codice: Number(e.codice) || 500, corpo: e.corpo ?? {} }), 'EX', 900, 'NX');
  }
  // the commands in line: taken out as they are handed over (LPOP), so the same command is never handed over twice
  if (body.prendi) out.comandi = ((await redis('LPOP', K.coda, 30)) || []).map(parse).filter(Boolean);
  if (body.leggi) out.meta = parse(await redis('GET', K.meta));
  return json(out);
}

export async function POST(request) {
  if (!hasStore()) return notFound(request);
  const w = what(new URL(request.url));
  try {
    if (w === 'comando') return await fromPhone(request);
    if (w === '' && isMac(request)) return await fromMac(request);
  } catch (e) {
    console.error('[centrale]', e.message);
    return json({ errore: 'Lo specchio adesso non risponde' }, 503);
  }
  return notFound(request);
}

// every other way of asking gets the same "page not found"
export { notFound as HEAD, notFound as PUT, notFound as PATCH, notFound as DELETE, notFound as OPTIONS };
