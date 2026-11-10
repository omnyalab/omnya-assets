// Tries the mirror of Nico's app (api/centrale.js) end to end, with everything fake and on this computer:
// node scripts/centrale-test.mjs
// A fake Upstash Redis (REST, one JSON array per command, every command counted), a fake site that answers its own
// "page not found", a fake ntfy that only notes who rang, a fake Mac that takes the commands and answers them, and
// a fake phone: first by hand, then with the page's own small script (_lib/centrale-page.js) run as in a browser.
// Nothing is sent anywhere and no real key is used.
import http from 'node:http';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

for (const k of ['UPSTASH_REDIS_REST_URL', 'VERCEL']) delete process.env[k];

// ---- one fake server: Redis on POST /redis, ntfy on POST /ntfy/<channel>, the site's 404 for everything else ----
const kvs = new Map(), lists = new Map(), exp = new Map();
const used = [];
const bells = [];
const NOT_FOUND = '<!doctype html><html><head><title>Page not found · Omnya Lab</title></head><body><h1>This page does not exist</h1></body></html>';
let onBell = null;
const live = (k) => { if (exp.has(k) && exp.get(k) <= Date.now()) { kvs.delete(k); exp.delete(k); } };
const listOf = (k) => lists.get(k) || (lists.set(k, []), lists.get(k));
const run = ([op, ...a]) => {
  op = String(op).toUpperCase();
  used.push(op);
  a = a.map((x) => (typeof x === 'number' ? x : String(x)));
  const k = a[0];
  switch (op) {
    case 'GET': return live(k), kvs.has(k) ? kvs.get(k) : null;
    case 'MGET': return a.map((x) => (live(x), kvs.has(x) ? kvs.get(x) : null));
    case 'SET': {
      const o = a.slice(2).map((x) => String(x).toUpperCase());
      live(k);
      if (o.includes('NX') && kvs.has(k)) return null;
      kvs.set(k, String(a[1]));
      exp.delete(k);
      if (o.includes('EX')) exp.set(k, Date.now() + Number(a[2 + o.indexOf('EX') + 1]) * 1000);
      return 'OK';
    }
    case 'MSET': { for (let i = 0; i < a.length; i += 2) { kvs.set(a[i], String(a[i + 1])); exp.delete(a[i]); } return 'OK'; }
    case 'DEL': { let n = 0; for (const x of a) n += (kvs.delete(x) ? 1 : 0) + (lists.delete(x) ? 1 : 0); return n; }
    case 'RPUSH': return listOf(k).push(...a.slice(1));
    case 'LPUSH': return listOf(k).unshift(...a.slice(1).reverse());
    case 'LPOP': { const l = listOf(k); if (!l.length) return null; return a[1] === undefined ? l.shift() : l.splice(0, Number(a[1])); }
    case 'LLEN': return listOf(k).length;
    case 'LRANGE': { const l = listOf(k), to = Number(a[2]); return l.slice(Number(a[1]), to === -1 ? undefined : to + 1); }
    case 'LTRIM': { const l = listOf(k), from = Number(a[1]), to = Number(a[2]); lists.set(k, l.slice(from < 0 ? Math.max(0, l.length + from) : from, to === -1 ? undefined : to + 1)); return 'OK'; }
    default: throw new Error(`ERR unknown command '${op}'`);
  }
};
const server = http.createServer(async (req, res) => {
  let body = '';
  for await (const c of req) body += c;
  if (req.method === 'POST' && req.url === '/redis') {
    let o;
    try {
      if (req.headers.authorization !== 'Bearer redistoken') throw new Error('WRONGPASS');
      o = { result: run(JSON.parse(body)) };
    } catch (e) {
      o = { error: e.message };
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(o));
  }
  if (req.method === 'POST' && req.url.startsWith('/ntfy/')) {
    bells.push({ channel: req.url.slice(6), body });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('{}');
    if (onBell) setTimeout(onBell, 5);
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=0, must-revalidate' });
  res.end(NOT_FOUND);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const SITE = `http://127.0.0.1:${server.address().port}`;
process.env.KV_REST_API_URL = `${SITE}/redis`;
process.env.KV_REST_API_TOKEN = 'redistoken';
process.env.IG_ADMIN_KEY = 'chiave-del-mac-finta';

const C = await import('../api/centrale.js');
const Sales = await import('../api/_lib/centrale-sales.js');
const { shim } = await import('../api/_lib/centrale-page.js');

// ---- the fake Mac and the fake phone ----
const sha = (s) => createHash('sha256').update(s).digest('hex');
const KEY = 'chiave-del-telefono-finta-lunga-quarantatre-xx';
const PERMESSI = { '/api/arrivo': { approva: 1, togli: 1, 'wa-prova': 0 }, '/api/lead': { approva: 0, sentito: 1 }, '/api/aggiorna': { tutto: 1 } };
const INDEX = '<!doctype html>\n<html lang="it">\n<head>\n<meta charset="utf-8">\n<title>Centrale Omnya</title>\n<link rel="icon" type="image/png" href="/icona.png">\n<link rel="apple-touch-icon" href="/icona-180.png">\n<link rel="manifest" href="/manifest.webmanifest">\n<link rel="stylesheet" href="/app.css">\n</head>\n<body>\n<header class="barra"><a href="#oggi"><img src="/icona.png" width="36" height="36" alt=""></a></header>\n<main id="pagina"></main>\n<script src="/app.js"></script>\n</body>\n</html>\n';
const APPJS = "var vere = { zecca: '/zecca.png', trova: '/trova.png' };\nfetch('/api/oggi');\n";
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 1, 2, 3, 250, 251, 252]);
const FILES = [
  { n: 'index.html', t: 'text/html; charset=utf-8', h: 'h-index', x: 'txt', b: INDEX },
  { n: 'app.js', t: 'application/javascript; charset=utf-8', h: 'h-js', x: 'txt', b: APPJS },
  { n: 'app.css', t: 'text/css; charset=utf-8', h: 'h-css', x: 'txt', b: 'body{margin:0}' },
  { n: 'zecca.png', t: 'image/png', h: 'h-zecca', x: 'b64', b: PNG.toString('base64') },
  { n: 'icona-180.png', t: 'image/png', h: 'h-180', x: 'b64', b: PNG.toString('base64') },
  { n: 'copertina/DfSXvGDtt4s.jpg', t: 'image/jpeg', h: 'h-cop', x: 'b64', b: PNG.toString('base64') },
];
const LEAD = { da_sentire: [{ i: 3, nome: 'Mario Rossi', numero: '+39 333 1234567' }] };
const foto = (v, euro) => ({ versione: v, soldi_letti: '2026-11-10T21:00:00+01:00', schede: {
  oggi: { versione: v, oggi: euro }, bot: { versione: v, reel: [{ copertina: '/copertina/DfSXvGDtt4s.jpg?v=17' }] }, app: { versione: v, icone: ['/zecca.png', '/non-mia.png'] } } });
const metaOf = (over = {}) => ({
  chiave: sha(KEY), acceso: true, canale: 'omnya-specchio-0123456789abcdef', ntfy: `${SITE}/ntfy`, permessi: PERMESSI, v: 7, letta: '2026-11-10T21:00:00+01:00', letta_ms: Date.parse('2026-11-10T21:00:00+01:00'),
  h: { fotografia: 'f1', lead: 'l1', arrivo: 'a1', aggiorna: 'g1' }, file: Object.fromEntries(FILES.map((f) => [f.n, f.h])), pagina: 'p1', ...over,
});
const mac = async (body, key = process.env.IG_ADMIN_KEY, path = '/api/centrale') => {
  const headers = { 'Content-Type': 'application/json' };
  if (key) headers.Authorization = `Bearer ${key}`;
  const r = await C.POST(new Request(SITE + path, { method: 'POST', headers, body: JSON.stringify(body) }));
  return { status: r.status, text: await r.clone().text(), j: r.status === 200 ? await r.json() : null, r };
};
const phone = async (path, { key = KEY, cookie = true, method = 'GET', body, headers = {} } = {}) => {
  const h = { ...headers };
  if (key && cookie) h.Cookie = `altro=1; centrale_k=${key}`;
  if (body !== undefined) Object.assign(h, { 'Content-Type': 'application/json', 'X-Centrale': '1', ...headers });
  const req = new Request(`${SITE}/centrale${path}`, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
  const r = await (method === 'POST' ? C.POST(req) : C.GET(req));
  const text = await r.clone().text();
  let j = null;
  try { j = JSON.parse(text); } catch {}
  return { status: r.status, text, j, r };
};
const is404 = (x) => {
  assert.equal(x.status, 404);
  assert.equal(x.text, NOT_FOUND, 'the same page as an address that does not exist');
  assert.equal(x.r.headers.get('content-type'), 'text/html; charset=utf-8');
  assert.equal(x.r.headers.get('set-cookie'), null);
};
const command = (percorso, dati, o = {}) => phone('/comando', { method: 'POST', body: { percorso, dati }, ...o });
const setBeat = (msAgo) => { const m = JSON.parse(kvs.get('omnya:centrale:meta')); m.battito = Date.now() - msAgo; kvs.set('omnya:centrale:meta', JSON.stringify(m)); };

let ok = 0;
const test = async (name, fn) => {
  try {
    await fn();
    ok += 1;
    console.log(`ok  ${name}`);
  } catch (e) {
    console.error(`NO  ${name}\n`, e);
    process.exitCode = 1;
    server.close();
    process.exit(1);
  }
};

await test('before the Mac ever pushed: everything is the 404 of the site, key or no key', async () => {
  is404(await phone('', { key: '' }));
  is404(await phone(`?k=${KEY}`, { cookie: false }));
  is404(await phone('/stato'));
  is404(await phone('/dati?s=lead'));
  is404(await command('/api/arrivo', { azione: 'approva' }));
  assert.equal(kvs.size + lists.size, 0, 'nothing was written');
});

await test('a push with the wrong key, or with none, is the same 404 and writes nothing', async () => {
  is404(await mac({ meta: metaOf(), dati: { lead: LEAD } }, 'chiave-sbagliata'));
  is404(await mac({ meta: metaOf() }, ''));
  is404(await mac({ svuota: true }, 'chiave-sbagliata'));
  // the admin key in the address is not a way in either
  is404(await mac({ meta: metaOf() }, '', `/api/centrale?key=${process.env.IG_ADMIN_KEY}`));
  assert.equal(kvs.size + lists.size, 0);
  // and the other ways of asking
  for (const m of ['PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
    const r = await C[m](new Request(`${SITE}/centrale`, { method: m }));
    assert.equal(r.status, 404);
    assert.equal(await r.text(), NOT_FOUND);
  }
  const head = await C.HEAD(new Request(`${SITE}/centrale`, { method: 'HEAD' }));
  assert.equal(head.status, 404);
});

await test('the Mac pushes the page and the pack; a meta without the hash of the key is refused', async () => {
  assert.equal((await mac({ meta: { ...metaOf(), chiave: KEY } })).status, 400, 'the key itself never comes here, only its hash');
  used.length = 0;
  let r = await mac({ file: FILES });
  assert.equal(r.status, 200);
  assert.equal(used.length, FILES.length, 'one SET per file');
  used.length = 0;
  r = await mac({ meta: metaOf(), dati: { fotografia: foto(7, '12,00 €'), lead: LEAD, arrivo: { cose: [] }, aggiorna: { in_corso: false, manca: [], detto: '' } }, prendi: true });
  assert.deepEqual(r.j, { ok: true, comandi: [] });
  assert.deepEqual(used, ['MSET', 'LPOP'], 'the whole pack is one write, the commands in line one read');
  // the heartbeat: the small state alone
  used.length = 0;
  r = await mac({ meta: metaOf(), prendi: true });
  assert.deepEqual(used, ['MSET', 'LPOP'], 'a heartbeat is two Redis commands');
  const saved = JSON.parse(kvs.get('omnya:centrale:meta'));
  assert.ok(Math.abs(saved.battito - Date.now()) < 2000, 'the hour of the heartbeat is the site\'s own');
  assert.equal(saved.chiave, sha(KEY));
  assert.ok(![...kvs.values()].some((v) => v.includes(KEY)), 'the key is nowhere in Redis');
});

await test('without the key, and with a wrong one, still 404: page, files, data, state', async () => {
  for (const path of ['', '/stato', '/dati?s=lead', '/app.js', '/manifest.webmanifest', '/esito?id=00000000-0000-4000-8000-000000000000']) {
    is404(await phone(path, { key: '' }));
    is404(await phone(path, { key: 'una-chiave-sbagliata' }));
    is404(await phone(`${path}${path.includes('?') ? '&' : '?'}k=una-chiave-sbagliata`, { cookie: false }));
  }
  is404(await phone('/..%2Fmeta'));
  is404(await phone('/comando'));
});

let cookieLine = '';
await test('the first time with the link: the page, the cookie, the script in the head, nothing secret inside', async () => {
  used.length = 0;
  const r = await phone(`?k=${KEY}`, { cookie: false });
  assert.equal(r.status, 200);
  assert.deepEqual(used, ['MGET'], 'one Redis read for the page');
  cookieLine = r.r.headers.get('set-cookie');
  assert.match(cookieLine, new RegExp(`^centrale_k=${KEY}; Max-Age=\\d{8}; Path=/centrale; HttpOnly; Secure; SameSite=Lax$`));
  assert.equal(r.r.headers.get('cache-control'), 'no-store');
  assert.equal(r.r.headers.get('x-robots-tag'), 'noindex, nofollow');
  assert.equal(r.r.headers.get('referrer-policy'), 'no-referrer');
  const html = r.text;
  assert.match(html, /<head>\n?<meta name="robots" content="noindex, nofollow"><script>\(function shim\(C\)/, 'the script is the first thing in the head');
  assert.ok(html.indexOf('function shim') < html.indexOf('/centrale/app.js'), 'before the app');
  assert.ok(html.includes('<script src="/centrale/app.js?h=h-js"></script>'));
  assert.ok(html.includes('<link rel="stylesheet" href="/centrale/app.css?h=h-css">'));
  assert.ok(html.includes(`<link rel="manifest" href="/centrale/manifest.webmanifest?k=${KEY}">`), 'iOS fetches the manifest without the cookie');
  assert.ok(html.includes(`<link rel="apple-touch-icon" href="/centrale/icona-180.png?k=${KEY}">`));
  assert.ok(html.includes('<img src="/centrale/icona.png" width="36"'));
  assert.ok(html.includes('<a href="#oggi">'), 'the tabs are left alone');
  assert.ok(html.includes('"blocchi":["fotografia","lead","arrivo","aggiorna"]'));
  for (const secret of [sha(KEY), 'omnya-specchio-0123456789abcdef', process.env.IG_ADMIN_KEY, 'wa-prova', 'Mario Rossi']) assert.ok(!html.includes(secret), `no ${secret.slice(0, 12)}… in the page`);
  // then the cookie alone is enough, also for the app on the Home screen (its start address carries the key)
  const again = await phone('');
  assert.equal(again.status, 200);
  assert.equal((await phone('?k=un-link-vecchio')).status, 200, 'an old link on a phone that has the good cookie');
  const man = await phone(`/manifest.webmanifest?k=${KEY}`, { cookie: false });
  assert.equal(man.j.start_url, `/centrale?k=${KEY}`);
  assert.equal(man.j.display, 'standalone');
  assert.equal(man.j.scope, '/centrale');
  assert.equal(man.j.icons[0].src, `/centrale/icona-192.png?k=${KEY}`);
});

await test('the page\'s files: as the Mac sent them, with the pictures\' addresses moved under /centrale', async () => {
  const js = await phone('/app.js?h=h-js');
  assert.equal(js.text, "var vere = { zecca: '/centrale/zecca.png', trova: '/trova.png' };\nfetch('/api/oggi');\n", 'only the files the Mac pushed are moved');
  assert.equal(js.r.headers.get('cache-control'), 'private, max-age=31536000, immutable');
  assert.equal(js.r.headers.get('content-type'), 'application/javascript; charset=utf-8');
  assert.equal((await phone('/app.js?h=vecchio')).r.headers.get('cache-control'), 'private, max-age=600', 'an old address is not kept for a year');
  const png = await phone('/zecca.png');
  assert.deepEqual(Buffer.from(await png.r.arrayBuffer()), PNG);
  assert.equal(png.r.headers.get('content-type'), 'image/png');
  // as Vercel hands it over after the rewrite (/centrale/<file> → /api/centrale?f=<file>), and a cover in its folder
  const r = await C.GET(new Request(`${SITE}/api/centrale?f=copertina/DfSXvGDtt4s.jpg&v=17`, { headers: { Cookie: `centrale_k=${KEY}` } }));
  assert.equal(r.status, 200);
  assert.deepEqual(Buffer.from(await r.arrayBuffer()), PNG);
  is404(await phone('/non-esiste.png'));
});

await test('the pack there and back: the blocks exactly as pushed, the state without secrets, one Redis read each', async () => {
  used.length = 0;
  const r = await phone('/dati?s=fotografia,lead,arrivo,aggiorna,nonce');
  assert.deepEqual(used, ['MGET']);
  assert.equal(r.r.headers.get('cache-control'), 'no-store');
  assert.deepEqual(r.j.dati.lead, LEAD);
  assert.deepEqual(r.j.dati.fotografia, foto(7, '12,00 €'));
  assert.equal(r.j.dati.nonce, null);
  assert.deepEqual(Object.keys(r.j.stato).sort(), ['adesso', 'battito', 'h', 'letta', 'pagina', 'spento', 'v']);
  assert.equal(r.j.stato.v, 7);
  assert.equal(r.j.stato.spento, false);
  used.length = 0;
  const s = await phone('/stato');
  assert.deepEqual(used, ['MGET'], 'the check of every 20 seconds is one read');
  assert.deepEqual(s.j.h, { fotografia: 'f1', lead: 'l1', arrivo: 'a1', aggiorna: 'g1' });
  for (const t of [r.text, s.text]) for (const secret of [sha(KEY), 'omnya-specchio', 'permessi']) assert.ok(!t.includes(secret));
  // a sale: the Mac pushes only the block that changed, and the phone sees the new hash
  await mac({ meta: metaOf({ v: 8, h: { fotografia: 'f2', lead: 'l1', arrivo: 'a1', aggiorna: 'g1' } }), dati: { fotografia: foto(8, '17,99 €') } });
  assert.equal((await phone('/stato')).j.h.fotografia, 'f2');
  const d = await phone('/dati?s=fotografia');
  assert.equal(d.j.dati.fotografia.schede.oggi.oggi, '17,99 €');
  assert.deepEqual((await phone('/dati?s=lead')).j.dati.lead, LEAD, 'the others stay');
});

let firstId = '';
await test('a command: in line, the bell rings with no data, the Mac takes it once, its answer comes back', async () => {
  bells.length = 0;
  used.length = 0;
  const r = await command('/api/arrivo', { azione: 'approva', confermato: true, chiavi: ['m:1'] });
  assert.equal(r.status, 200);
  assert.deepEqual(used, ['GET', 'RPUSH']);
  assert.deepEqual([r.j.mac, r.j.coda, r.j.campanello], [true, true, true]);
  firstId = r.j.id;
  assert.deepEqual(bells, [{ channel: 'omnya-specchio-0123456789abcdef', body: 'specchio' }], 'the bell says only that there is a command');
  assert.equal((await phone(`/esito?id=${firstId}`)).j.esito, null, 'no answer yet');
  // the Mac asks with its key
  is404(await mac({ prendi: true }, 'chiave-sbagliata'));
  const got = await mac({ prendi: true });
  assert.equal(got.j.comandi.length, 1);
  const c = got.j.comandi[0];
  assert.deepEqual([c.id, c.p, c.d], [firstId, '/api/arrivo', { azione: 'approva', confermato: true, chiavi: ['m:1'] }]);
  assert.ok(c.s - c.t === 12 * 3_600_000, 'one that can wait is good for 12 hours');
  // the same command is never handed over twice
  assert.deepEqual((await mac({ prendi: true })).j.comandi, []);
  assert.deepEqual((await mac({ meta: metaOf(), prendi: true })).j.comandi, []);
  // the answer, with the fresh pack in the same push
  await mac({ esiti: [{ id: firstId, codice: 200, corpo: { ok: true, quante: 1 } }], meta: metaOf({ h: { fotografia: 'f2', lead: 'l1', arrivo: 'a2', aggiorna: 'g1' } }), dati: { arrivo: { cose: ['approvata'] } } });
  used.length = 0;
  const e = await phone(`/esito?id=${firstId}`);
  assert.deepEqual(used, ['MGET']);
  assert.deepEqual(e.j.esito, { codice: 200, corpo: { ok: true, quante: 1 } });
  // a second answer to the same command changes nothing
  await mac({ esiti: [{ id: firstId, codice: 500, corpo: { errore: 'due volte' } }] });
  assert.deepEqual((await phone(`/esito?id=${firstId}`)).j.esito, { codice: 200, corpo: { ok: true, quante: 1 } });
  // one that makes sense only now is good for 20 seconds
  const live2 = await command('/api/lead', { azione: 'approva', i: 3, nome_foglio: 'Mario Rossi', testo: 'ciao' });
  assert.deepEqual([live2.j.mac, live2.j.coda], [true, false]);
  const c2 = (await mac({ prendi: true })).j.comandi[0];
  assert.equal(c2.s - c2.t, 20_000);
});

await test('a command the Mac did not list is refused: nothing in line, no bell', async () => {
  bells.length = 0;
  for (const [p, d] of [['/api/app', { azione: 'telefono-chiave', confermato: true }], ['/api/arrivo', { azione: 'telefono-chiave' }], ['/api/arrivo', {}], ['/api/arrivo', { azione: '__proto__' }], ['/api/arrivo', { azione: 'constructor' }], ['/api/nuova', { azione: 'approva' }], ['__proto__', { azione: 'approva' }]]) {
    const r = await command(p, d);
    assert.equal(r.status, 400, `${p} ${d.azione}`);
    assert.equal(r.j.errore, 'Dallo specchio questo non si può fare: fallo dal Mac');
  }
  assert.equal((await phone('/comando', { method: 'POST', body: { percorso: '/api/arrivo' } })).status, 400);
  assert.equal((await phone('/comando', { method: 'POST', body: [1] })).status, 400);
  // not from the mirrored page: without its header, or from another site
  assert.equal((await command('/api/arrivo', { azione: 'approva' }, { headers: { 'X-Centrale': '0' } })).status, 400);
  assert.equal((await command('/api/arrivo', { azione: 'approva' }, { headers: { Origin: 'https://un-altro-sito.example' } })).status, 400);
  assert.equal((await command('/api/arrivo', { azione: 'approva' }, { headers: { Origin: SITE } })).status, 200, 'from the page itself it goes');
  await mac({ prendi: true });
  // without the key a command is the usual 404, and the key in the address is not enough for a command
  is404(await command('/api/arrivo', { azione: 'approva' }, { key: '' }));
  is404(await command('/api/arrivo', { azione: 'approva' }, { key: 'una-chiave-sbagliata' }));
  is404(await phone(`/comando?k=${KEY}`, { cookie: false, method: 'POST', body: { percorso: '/api/arrivo', dati: { azione: 'approva' } } }));
  assert.equal((lists.get('omnya:centrale:coda') || []).length, 0);
  assert.equal(bells.length, 1, 'only the one that went');
  // too long
  assert.equal((await command('/api/arrivo', { azione: 'approva', testo: 'x'.repeat(200_001) })).status, 413);
});

await test('Mac off: the state says since when, a command that can wait stays in line, the others are refused', async () => {
  setBeat(10 * 60_000);
  assert.equal((await phone('/stato')).j.spento, false, 'ten minutes without a heartbeat is not off yet');
  setBeat(12 * 60_000);
  bells.length = 0;
  const s = await phone('/stato');
  assert.equal(s.j.spento, true);
  assert.ok(Math.abs(s.j.adesso - s.j.battito - 12 * 60_000) < 2000);
  assert.equal(s.j.dopo, undefined, 'no payment after the last numbers');
  const q = await command('/api/arrivo', { azione: 'togli', chiave: 'm:1' });
  assert.deepEqual([q.status, q.j.mac, q.j.coda, q.j.campanello], [200, false, true, false]);
  const no = await command('/api/lead', { azione: 'approva', i: 3 });
  assert.deepEqual([no.status, no.j.errore], [503, 'Il Mac è spento: questo si fa quando è acceso']);
  assert.deepEqual((await command('/specchio/guarda', { scheda: 'bot' })).j, { mac: false });
  assert.equal(lists.get('omnya:centrale:coda').length, 1, 'only the one that can wait');
  assert.equal(bells.length, 0, 'nobody to ring for');
  // the Mac comes back: the command is there, once
  const back = await mac({ meta: metaOf(), prendi: true });
  assert.deepEqual(back.j.comandi.map((c) => [c.id, c.p, c.d.azione]), [[q.j.id, '/api/arrivo', 'togli']]);
  assert.equal((await phone('/stato')).j.spento, false);
  assert.deepEqual((await mac({ prendi: true })).j.comandi, []);
});

await test('Mac off: the payments the webhook noted after the last numbers are counted, each once', async () => {
  const letta = Date.parse('2026-11-10T21:00:00+01:00');
  const at = (ms) => ({ created: Math.floor((letta + ms) / 1000) });
  used.length = 0;
  Sales.noteSale(at(-60_000), { id: 'cs_live_prima', amount_total: 599, currency: 'eur' }, ['Full Tower Blueprint']); // already in the Mac's numbers
  Sales.noteSale(at(60_000), { id: 'cs_live_uno', amount_total: 599, currency: 'eur' }, ['Full Towers Blueprint']);
  Sales.noteSale(at(120_000), { id: 'cs_live_due', amount_total: 5900, currency: 'eur' }, ['Everything we teach']);
  Sales.noteSale(at(125_000), { id: 'cs_live_due', amount_total: 5900, currency: 'eur' }, ['Everything we teach']); // Stripe tried twice
  Sales.noteSale(at(180_000), { id: 'cs_live_tre', amount_total: 1200, currency: 'usd' }, ['A lesson']);
  await new Promise((r) => setTimeout(r, 150));
  assert.deepEqual(used.filter((x) => x === 'LPUSH').length, 5);
  const rows = lists.get(Sales.SALES).map((x) => JSON.parse(x));
  assert.deepEqual(Object.keys(rows[0]).sort(), ['a', 'c', 'i', 'n', 't'], 'hour, amount, currency, product names: no buyer');
  setBeat(30 * 60_000);
  const s = await phone('/stato');
  assert.deepEqual(s.j.dopo, { n: 3, somme: { eur: 6499, usd: 1200 }, ultimo: (at(180_000).created) * 1000 });
  assert.deepEqual((await phone('/dati?s=lead')).j.stato.dopo.n, 3);
  // Mac on again: the list is not even read
  await mac({ meta: metaOf(), prendi: true });
  used.length = 0;
  assert.equal((await phone('/stato')).j.dopo, undefined);
  assert.deepEqual(used, ['MGET']);
  // the list stays short, and noting a sale can never throw
  for (let i = 0; i < Sales.KEEP + 10; i++) Sales.noteSale(at(i), { id: `cs_${i}`, amount_total: 100 }, []);
  for (const bad of [[], [null, null, null], [{}, {}, 'x'], [undefined, { id: 5, amount_total: 'x', currency: 9 }, [1, null]]]) assert.doesNotThrow(() => Sales.noteSale(...bad));
  await new Promise((r) => setTimeout(r, 300));
  assert.ok(lists.get(Sales.SALES).length <= Sales.KEEP);
  lists.delete(Sales.SALES);
});

await test('the Stripe webhook: the row is noted only after the buyer\'s email, inside its own try/catch', async () => {
  const src = readFileSync(new URL('../api/stripe-webhook.js', import.meta.url), 'utf8');
  const mail = src.indexOf("replyTo: host.email"), note = src.indexOf('noteSale(event, session, productNames)'), failed = src.indexOf("return new Response('mail failed'");
  assert.ok(mail > 0 && note > mail && note < failed, 'after the delivery, before the end of its try');
  assert.match(src.slice(note - 40, note + 80), /try \{\s+noteSale\(event, session, productNames\);\s+\} catch \{\}/);
  assert.equal(src.split('noteSale').length - 1, 2, 'the import and the one call');
});

await test('the key is changed on the Mac: the old phones are out, here too', async () => {
  const NEW = 'chiave-nuova-del-telefono-altrettanto-lunga-yy';
  await mac({ meta: metaOf({ chiave: sha(NEW) }), prendi: true });
  for (const path of ['', '/stato', '/dati?s=lead', '/app.js']) is404(await phone(path));
  is404(await phone(`?k=${KEY}`, { cookie: false }));
  is404(await command('/api/arrivo', { azione: 'approva' }));
  assert.equal((await phone(`?k=${NEW}`, { cookie: false, key: NEW })).status, 200);
  assert.equal((await phone('/stato', { key: NEW })).status, 200);
  // the door closed on the Mac ("accesso dal telefono" off): nobody in, with any key
  await mac({ meta: metaOf({ acceso: false }), prendi: true });
  is404(await phone(''));
  is404(await phone('/stato'));
  await mac({ meta: metaOf(), prendi: true });
  assert.equal((await phone('/stato')).status, 200);
});

// ---- the page's own script, run as in a browser, against the function and a Mac that answers when the bell rings ----
const macDoes = [], macIds = [];
let macAnswer = (c) => ({ codice: 200, corpo: { ok: true, fatto: c.d.azione } });
let macOn = true;
onBell = async () => {
  if (!macOn) return;
  const got = await mac({ prendi: true });
  const esiti = [];
  for (const c of got.j.comandi) {
    if (c.p === '/specchio/guarda') { macDoes.push(['guarda', c.d.scheda]); continue; }
    macDoes.push([c.p, c.d.azione]);
    macIds.push(c.id);
    esiti.push({ id: c.id, ...macAnswer(c) });
  }
  if (esiti.length) await mac({ esiti });
};
const browser = () => {
  const events = {}, els = {};
  const doc = {
    hidden: false, activeElement: null, sent: [],
    body: { firstChild: null, insertBefore(x) { els[x.id] = x; }, innerHTML: '' },
    addEventListener(n, f) { (events[n] ||= []).push(f); },
    dispatchEvent(e) { doc.sent.push(e.type); return true; },
    getElementById: (id) => els[id] || null,
    querySelector: (q) => (q === '.barra' ? { offsetHeight: 56, parentNode: { insertBefore(x) { els[x.id] = x; } }, nextSibling: null } : null),
    createElement: () => ({ style: {}, setAttribute() {}, hidden: false, textContent: '' }),
  };
  const calls = [];
  const win = {
    addEventListener() {},
    fetch: async (u, o = {}) => {
      calls.push(`${o.method || 'GET'} ${u}`);
      const req = new Request(SITE + u, { method: o.method || 'GET', headers: { ...(o.headers || {}), Cookie: `centrale_k=${KEY}` }, body: o.body });
      return o.method === 'POST' ? C.POST(req) : C.GET(req);
    },
  };
  return { doc, win, calls, els };
};
const B = browser();
Object.assign(globalThis, { window: B.win, document: B.doc, location: { href: `${SITE}/centrale?k=${KEY}`, origin: SITE, reload() { B.reloaded = true; } }, sessionStorage: { m: {}, getItem(k) { return this.m[k] ?? null; }, setItem(k, v) { this.m[k] = v; } } });
const app = async (path, body) => {
  const r = await window.fetch(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Centrale': '1' }, body: JSON.stringify(body) } : { cache: 'no-store' });
  return { status: r.status, j: await r.json() };
};

await test('the page\'s script: the GETs of the app are answered from the pack, in memory', async () => {
  await mac({ meta: metaOf({ h: { fotografia: 'f2', lead: 'l1', arrivo: 'a2', aggiorna: 'g1' } }), prendi: true });
  shim({ base: '/centrale', blocchi: ['fotografia', 'lead', 'arrivo', 'aggiorna'], file: ['zecca.png', 'icona-180.png'], pagina: 'p1', ogni: 20000 });
  const oggi = await app('/api/oggi');
  assert.deepEqual(oggi, { status: 200, j: { versione: 8, oggi: '17,99 €' } });
  assert.deepEqual((await app('/api/lead')).j, LEAD);
  assert.deepEqual((await app('/api/versione')).j, { v: 8, letta: '2026-11-10T21:00:00+01:00' });
  assert.equal((await app('/api/fotografia')).j.schede.oggi.oggi, '17,99 €');
  assert.equal((await app('/api/bot')).j.reel[0].copertina, '/centrale/copertina/DfSXvGDtt4s.jpg?v=17', 'the cover is asked to the mirror');
  assert.deepEqual((await app('/api/app')).j.icone, ['/centrale/zecca.png', '/non-mia.png']);
  assert.deepEqual((await app('/api/ping')).j.ok, true);
  assert.equal((await app('/api/social')).status, 503, 'a tab the Mac never pushed says so');
  assert.equal((await app('/api/inventata')).status, 404);
  const net = B.calls.filter((c) => !c.includes('/comando'));
  assert.deepEqual(net, ['GET /centrale/dati?s=fotografia,lead,arrivo,aggiorna'], 'one call to the site for all of it');
  // the "anything new?" of the app (every 5 s at home) reaches the site at most every 20 s
  for (let i = 0; i < 5; i++) await app('/api/versione');
  assert.equal(B.calls.filter((c) => c.includes('/stato')).length, 0, 'the pack just taken already said how things are');
  assert.ok(!B.els['specchio-riga'] || B.els['specchio-riga'].hidden, 'Mac on: no line');
  // looking at a tab is told to the Mac once (it re-reads what that tab re-reads at home), not at every call
  await new Promise((r) => setTimeout(r, 60));
  assert.deepEqual(macDoes, [['guarda', 'oggi']]);
});

await test('the page\'s script: a tap goes to the Mac and its answer comes back as the real one', async () => {
  macDoes.length = 0;
  const t0 = Date.now();
  const r = await app('/api/arrivo', { azione: 'approva', confermato: true });
  assert.deepEqual(r, { status: 200, j: { ok: true, fatto: 'approva' } });
  assert.ok(Date.now() - t0 < 2500, 'well inside the 5 seconds');
  assert.deepEqual(macDoes, [['/api/arrivo', 'approva']]);
  // what the Mac refuses comes back as it is (never as 403, which the app reads as "the phone lost its key")
  macAnswer = () => ({ codice: 409, corpo: { errore: 'Il foglio è cambiato, ricarico' } });
  assert.deepEqual(await app('/api/arrivo', { azione: 'togli', chiave: 'm:1' }), { status: 409, j: { errore: 'Il foglio è cambiato, ricarico' } });
  macAnswer = () => ({ codice: 403, corpo: { errore: 'no' } });
  assert.equal((await app('/api/arrivo', { azione: 'togli' })).status, 400);
  // the pictures in the Mac's answer are moved too
  macAnswer = () => ({ codice: 200, corpo: { ok: true, reel: [{ copertina: '/copertina/abcde.jpg?v=2' }] } });
  assert.equal((await app('/api/arrivo', { azione: 'approva' })).j.reel[0].copertina, '/centrale/copertina/abcde.jpg?v=2');
  macAnswer = (c) => ({ codice: 200, corpo: { ok: true, fatto: c.d.azione } });
  // what the mirror may not do is said in plain words, and the Mac never hears of it
  macDoes.length = 0;
  const no = await app('/api/app', { azione: 'telefono-chiave', confermato: true });
  assert.deepEqual(no, { status: 400, j: { errore: 'Dallo specchio questo non si può fare: fallo dal Mac' } });
  assert.deepEqual(macDoes, []);
});

await test('the page\'s script: Mac off says it in plain words and the tap stays in line; the line under the bar', async () => {
  macOn = false;
  setBeat(40 * 60_000);
  const hour = new Date(Date.now() - 40 * 60_000);
  const hhmm = `${String(hour.getHours()).padStart(2, '0')}:${String(hour.getMinutes()).padStart(2, '0')}`;
  Sales.noteSale({ created: Math.floor(Date.now() / 1000) - 60 }, { id: 'cs_a', amount_total: 599, currency: 'eur' }, ['x']);
  Sales.noteSale({ created: Math.floor(Date.now() / 1000) - 30 }, { id: 'cs_b', amount_total: 599, currency: 'eur' }, ['x']);
  await new Promise((r) => setTimeout(r, 120));
  const r = await app('/api/arrivo', { azione: 'approva', confermato: true });
  assert.deepEqual(r, { status: 503, j: { errore: 'In coda: lo fa il Mac appena si riaccende' } });
  assert.equal(lists.get('omnya:centrale:coda').length, 1, 'it waits for the Mac');
  assert.deepEqual(await app('/api/lead', { azione: 'approva', i: 3 }), { status: 503, j: { errore: 'Il Mac è spento: questo si fa quando è acceso' } });
  // the numbers of before are still there, and the line says since when (the day changes the words)
  assert.equal((await app('/api/oggi')).j.oggi, '17,99 €');
  await new Promise((r) => setTimeout(r, 1700)); // the check that follows a tap
  const line = B.els['specchio-riga'];
  assert.ok(line && !line.hidden);
  const today = hour.getDate() === new Date().getDate();
  assert.equal(line.textContent, `Mac spento ${today ? 'dalle' : 'da ieri alle'} ${hhmm}, cifre ferme a quell'ora · dopo sono arrivati 2 pagamenti, +11,98 €`);
  assert.equal(line.style.top, '56px', 'under the bar');
  // the Mac is back: it takes the tap that waited, pushes, and the line goes away
  macOn = true;
  macDoes.length = 0;
  await mac({ meta: metaOf({ v: 9, h: { fotografia: 'f3', lead: 'l1', arrivo: 'a2', aggiorna: 'g1' } }), dati: { fotografia: foto(9, '29,97 €') } });
  await onBell();
  assert.deepEqual(macDoes, [['/api/arrivo', 'approva']]);
  lists.delete(Sales.SALES);
});

await test('the page\'s script: new numbers arrive by themselves, and "Aggiorna tutto" waits for the Mac\'s new pack', async () => {
  // 20 seconds later (here: the clock of the script is moved) the check sees the new hash and takes that block only
  const realNow = Date.now;
  let skew = 21_000;
  Date.now = () => realNow() + skew;
  try {
    B.calls.length = 0;
    B.doc.sent.length = 0;
    assert.deepEqual((await app('/api/versione')).j.v, 9);
    assert.deepEqual(B.calls.filter((c) => !c.includes('/comando')), ['GET /centrale/stato', 'GET /centrale/dati?s=fotografia']);
    assert.equal((await app('/api/oggi')).j.oggi, '29,97 €');
    assert.ok(B.els['specchio-riga'].hidden, 'Mac on again: the line is gone');
    assert.deepEqual(B.doc.sent, ['visibilitychange'], 'the tab on screen is told to take the new numbers');
    // Aggiorna tutto: the Mac answers at once "started", the pack with the re-read numbers comes later
    macAnswer = () => ({ codice: 200, corpo: { ok: true, in_corso: true } });
    const go = await app('/api/aggiorna', { azione: 'tutto' });
    assert.deepEqual(go.j, { ok: true, in_corso: true });
    const id = macIds.at(-1); // the command the Mac just answered
    assert.match(id, /^[0-9a-f-]{36}$/);
    assert.deepEqual((await app('/api/aggiorna')).j, { in_corso: true, manca: [], detto: '' }, 'the old "done" of the pack is not shown');
    await mac({ meta: metaOf({ v: 10, h: { fotografia: 'f4', lead: 'l1', arrivo: 'a2', aggiorna: 'g2' } }), dati: { fotografia: foto(10, '35,96 €'), aggiorna: { in_corso: false, manca: [], detto: 'Aggiornato adesso', _dopo: id } } });
    skew += 3000;
    assert.deepEqual((await app('/api/aggiorna')).j, { in_corso: false, manca: [], detto: 'Aggiornato adesso', _dopo: id });
    assert.equal((await app('/api/fotografia')).j.schede.oggi.oggi, '35,96 €', 'and the numbers are already the new ones');
    // the Mac pushed a new page (the app was updated): the open page takes it, once
    await mac({ meta: metaOf({ v: 10, pagina: 'p2', h: { fotografia: 'f4', lead: 'l1', arrivo: 'a2', aggiorna: 'g2' } }) });
    skew += 21_000;
    await app('/api/versione');
    assert.equal(B.reloaded, true);
    B.reloaded = false;
    skew += 21_000;
    await app('/api/versione');
    assert.equal(B.reloaded, false, 'never a second time for the same page');
  } finally {
    Date.now = realNow;
    macAnswer = (c) => ({ codice: 200, corpo: { ok: true, fatto: c.d.azione } });
  }
});

await test('the page\'s script: the key is changed while the page is open', async () => {
  await mac({ meta: metaOf({ chiave: sha('un-altra-chiave') }), prendi: true });
  const r = await app('/api/arrivo', { azione: 'approva' });
  assert.deepEqual(r, { status: 503, j: { errore: 'Questa chiave non vale più' } });
  assert.match(B.doc.body.innerHTML, /Questa chiave non vale più/);
  await mac({ meta: metaOf(), prendi: true });
});

await test('the mirror is switched off on the Mac: nothing of it stays in Redis', async () => {
  is404(await mac({ svuota: true }, 'chiave-sbagliata'));
  assert.ok(kvs.has('omnya:centrale:meta'));
  const r = await mac({ svuota: true });
  assert.equal(r.status, 200);
  const left = [...kvs.keys(), ...lists.keys()].filter((k) => k.startsWith('omnya:centrale:') && !k.includes(':e:'));
  assert.deepEqual(left, []);
  is404(await phone(''));
  is404(await phone('/stato'));
  is404(await phone('/dati?s=lead'));
});

await test('Redis does not answer: who has a key gets a plain 503, never a wrong 404; who has none still 404', async () => {
  await mac({ file: FILES });
  await mac({ meta: metaOf(), prendi: true });
  // the fake Redis answers with an error, as Upstash does when it refuses a command
  const realRun = server.listeners('request')[0];
  server.removeAllListeners('request');
  server.on('request', (req, res) => {
    if (req.url === '/redis') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end('{"error":"ERR max daily request limit exceeded"}'); }
    realRun(req, res);
  });
  try {
    assert.equal((await phone('/stato')).status, 503);
    assert.equal((await command('/api/arrivo', { azione: 'approva' })).status, 503);
    assert.equal((await mac({ meta: metaOf() })).status, 503);
    is404(await phone('/stato', { key: '' }));
    assert.doesNotThrow(() => Sales.noteSale({ created: 1 }, { id: 'cs_x', amount_total: 1 }, []));
    await new Promise((r) => setTimeout(r, 80));
  } finally {
    server.removeAllListeners('request');
    server.on('request', realRun);
  }
  assert.equal((await phone('/stato')).status, 200);
});

server.close();
console.log(`\n${ok} prove passate`);
process.exit(0);
