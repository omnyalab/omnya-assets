// Tries the Instagram bot end to end against a fake Instagram, without sending anything:
// node scripts/ig-test.mjs
// Four runs: everything on memory, then tester mode (IG_ONLY), then the main paths again on a
// fake Upstash Redis (so the real Redis commands are tried too), then the webhook as it runs on
// Vercel (200 to Meta at once, the DM right after).
import http from 'node:http';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

for (const k of ['KV_REST_API_URL', 'UPSTASH_REDIS_REST_URL', 'RESEND_API_KEY', 'VERCEL']) delete process.env[k];

// ---- fake graph.instagram.com ----
const OWN = '999';
const calls = [];
const state = { follows: {}, commentUser: {}, refuseTemplate: false, refuseDm: new Set(), failPrivate: null, failSend: null, captionDown: false, sid: {}, probeFail: null, probeBlank: false, noRecipient: false, failReply: null, media: [], mediaFail: null };
let mid = 0;
let simNow = () => Date.now(); // the bot's clock, set below: every fake call remembers the bot's time
// posts by the id Meta gives in the comment event: caption and link, as Instagram would answer
const posts = {
  client: { caption: 'DANA, full house teaser for our client', permalink: 'https://www.instagram.com/reel/dana/' },
  tower: { caption: 'You don’t send the buyer a brochure, you send them the tower 👇🏻 Comment “AI” and I’ll send you the full blueprint (it’s free)', permalink: 'https://www.instagram.com/p/tower/' },
  red: { caption: 'This is how you can do it too 👇🏻 Comment “AI” and I’ll send you the tower blueprint', permalink: 'https://www.instagram.com/reel/DfSXvGDtt4s/' },
  floors: { caption: 'Here’s how you can do it too, 1 DAY 👇🏻 Comment “AI”', permalink: 'https://www.instagram.com/reel/DfaH3QkN4qs/' },
  killed: { caption: 'Save this if you wanna do it too. Comment “3D”', permalink: 'https://www.instagram.com/reel/DfU-nniRvNQ/' },
  cooked: { caption: 'Here’s how you can recreate this. Comment “CLAUDE”', permalink: 'https://www.instagram.com/reel/DfPzJmMtf2B/' },
  buildreel: { caption: 'How Claude made me $2,900 in 2 hours 👇🏻\n\nLike and comment "BUILD" and I’ll send you the blueprint (follow first, or my DM can’t reach you)', permalink: 'https://www.instagram.com/reel/DfBUILDnew1/' },
  towersreel: { caption: 'HOW TO LET THE BUYER CHOOSE THE VIEW 👇🏻\n\nThree towers in the fog.\n\nLike and comment "TOWERS" and I’ll send you the blueprint (follow first, or my DM can’t reach you)', permalink: 'https://www.instagram.com/reel/DfTOWERS11/' },
  lazyreel: { caption: 'Comment TOWERS and I’ll send it', permalink: 'https://www.instagram.com/reel/DfTOWERS22/' },
  cityreel: { caption: 'The city is EXPANDING 🏠 Comment “HOUSE” and I’ll send you your free house', permalink: 'https://www.instagram.com/reel/DfCITYep2xx/' },
  city1: { caption: 'Don’t miss your house! 🏡', permalink: 'https://www.instagram.com/reel/DfXg47dtoyz/' },
  newreel: { caption: 'Three towers, pick your view 👀', permalink: 'https://www.instagram.com/reel/DfNEWREEL01/' },
  fablereel: { caption: 'Unlimited generations in Claude 👇🏻\n\nComment FABLE to get the link', permalink: 'https://www.instagram.com/reel/DfFABLE0001/' },
  villareel: { caption: 'HOW TO USE THIS COMBO 👇🏻\n\nLike and comment "VILLA" and I’ll send it', permalink: 'https://www.instagram.com/reel/DfVILLA0001/' },
};
const server = http.createServer(async (req, res) => {
  let body = '';
  for await (const c of req) body += c;
  const url = new URL(req.url, 'http://x');
  const path = url.pathname.replace(/^\/v[\d.]+\//, '');
  const j = body ? JSON.parse(body) : null;
  calls.push({ method: req.method, path, query: Object.fromEntries(url.searchParams), body: j, at: simNow() });
  const out = (o, s = 200) => { res.writeHead(s, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (state.tokenDead) return out({ error: { message: 'Error validating access token: the session is invalid', type: 'OAuthException', code: 190 } }, 400);
  if (path === 'me/accounts') return out({ data: [{ id: 'page1', name: 'Omnya Lab', access_token: 'pagetoken', instagram_business_account: { id: OWN } }] });
  // the app's own subscriptions (the fields switched on in the Meta dashboard): asked with the app token
  if (path === '1607399760453809/subscriptions') {
    if (url.searchParams.get('access_token') !== '1607399760453809|appsecret') return out({ error: { message: 'wrong app token', code: 190 } }, 400);
    return out({ data: [{ object: 'instagram', active: true, callback_url: 'https://www.omnyalab.com/api/instagram', fields: [{ name: 'messages' }, { name: 'messaging_postbacks' }, { name: 'standby' }] }] });
  }
  if (url.searchParams.get('access_token') !== 'pagetoken') return out({ error: { message: 'wrong token' } }, 401);
  if (path === 'page1/subscribed_apps') return out(req.method === 'POST' ? { success: true } : { data: [{ id: '1607399760453809', name: 'Omnya Bot', subscribed_fields: ['feed', 'messages', 'messaging_postbacks'] }] });
  if (path === 'me/messages') {
    if (state.refuseTemplate && j.message.attachment) return out({ error: { message: 'template not allowed' } }, 400);
    const cid = j.recipient.comment_id;
    if (cid && state.failPrivate) return out({ error: state.failPrivate }, state.failPrivate.status || 400);
    if (!cid && state.failSend) return out({ error: state.failSend }, 400);
    if (cid && state.refuseDm.has(cid)) return out({ error: { message: 'cannot message user' } }, 400);
    // the id Instagram gives for messaging can differ from the commenter's id (state.sid), or be missing
    const to = cid ? state.sid[state.commentUser[cid]] || state.commentUser[cid] : j.recipient.id;
    return out(cid && state.noRecipient ? { message_id: `m${++mid}` } : { recipient_id: to, message_id: `m${++mid}` });
  }
  if (path.endsWith('/replies')) return state.failReply ? out({ error: state.failReply }, 400) : out({ id: `r${++mid}` });
  // the account's last posts and reels, for /api/leads?action=media
  if (path === `${OWN}/media`) return state.mediaFail ? out({ error: state.mediaFail }, 400) : out({ data: state.media, paging: {} });
  if (posts[path]) return state.captionDown ? out({ error: { message: 'An unexpected error has occurred. Please retry your request later.', code: 2 } }, 500) : out(posts[path]);
  if (path.startsWith('media')) return out({ caption: 'From rough 3D to final photo ✨ Comment “PROJECT” below and I’ll send you The Blueprint', permalink: 'https://www.instagram.com/reel/abc/' });
  if (/^[a-z]\d+$/.test(path)) {
    if (state.probeFail) return out({ error: state.probeFail }, 400);
    return out(state.probeBlank ? { id: path } : { username: `name_${path}`, is_user_follow_business: !!state.follows[path] });
  }
  out({ error: { message: 'unknown ' + path } }, 404);
});
await new Promise((r) => server.listen(0, r));
process.env.IG_GRAPH_URL = `http://localhost:${server.address().port}`;
process.env.IG_TOKEN = 'test';
process.env.IG_ADMIN_KEY = 'k';
const ONLY_RUN = process.argv.includes('--only');
const REDIS_RUN = process.argv.includes('--redis');
const VERCEL_RUN = process.argv.includes('--vercel');
if (VERCEL_RUN) Object.assign(process.env, { VERCEL: '1', IG_APP_SECRET: 's3cret' });
process.env.IG_ONLY = ONLY_RUN ? '@name_t1' : '';

// ---- fake Upstash Redis (REST: one JSON array per command), only for the --redis run ----
const redisUsed = new Set();
if (REDIS_RUN) {
  const kvs = new Map(), zs = new Map(), hs = new Map(), exp = new Map();
  const live = (k) => { if (exp.has(k) && exp.get(k) <= Date.now()) { kvs.delete(k); zs.delete(k); exp.delete(k); } };
  const zOf = (k) => (live(k), zs.get(k) || (zs.set(k, new Map()), zs.get(k)));
  const b = (v) => (v === '-inf' ? -Infinity : v === '+inf' ? Infinity : Number(v));
  const sorted = (k) => [...zOf(k)].sort((x, y) => x[1] - y[1] || (x[0] < y[0] ? -1 : 1));
  const run = ([op, ...a]) => {
    op = String(op).toUpperCase();
    redisUsed.add(op);
    a = a.map((x) => (typeof x === 'number' ? x : String(x)));
    const k = a[0];
    switch (op) {
      case 'GET': return live(k), kvs.has(k) ? kvs.get(k) : null;
      case 'GETDEL': { live(k); const v = kvs.has(k) ? kvs.get(k) : null; kvs.delete(k); return v; }
      case 'MGET': return a.map((x) => (live(x), kvs.has(x) ? kvs.get(x) : null));
      case 'SET': {
        const o = a.slice(2).map((x) => String(x).toUpperCase());
        live(k);
        if (o.includes('NX') && kvs.has(k)) return null;
        kvs.set(k, String(a[1]));
        exp.delete(k);
        if (o.includes('EX')) exp.set(k, Date.now() + Number(a[2 + o.indexOf('EX') + 1]) * 1000);
        if (o.includes('PX')) exp.set(k, Date.now() + Number(a[2 + o.indexOf('PX') + 1]));
        return 'OK';
      }
      case 'DEL': { const had = kvs.delete(k) || zs.delete(k) || hs.delete(k); return had ? 1 : 0; }
      case 'INCR': { live(k); const n = Number(kvs.get(k) || 0) + 1; kvs.set(k, String(n)); return n; }
      case 'EXPIRE': exp.set(k, Date.now() + Number(a[1]) * 1000); return 1;
      case 'PEXPIRE': exp.set(k, Date.now() + Number(a[1])); return 1;
      case 'ZADD': {
        const nx = String(a[1]).toUpperCase() === 'NX';
        const [score, member] = nx ? a.slice(2) : a.slice(1);
        if (!Number.isFinite(Number(score)) || member === undefined) throw new Error('ERR syntax error');
        const z = zOf(k);
        if (z.has(member)) { if (!nx) z.set(member, Number(score)); return 0; }
        z.set(member, Number(score));
        return 1;
      }
      case 'ZREM': return zOf(k).delete(a[1]) ? 1 : 0;
      case 'ZSCORE': return zOf(k).has(a[1]) ? String(zOf(k).get(a[1])) : null;
      case 'ZCARD': return zOf(k).size;
      case 'ZCOUNT': return sorted(k).filter(([, sc]) => sc >= b(a[1]) && sc <= b(a[2])).length;
      case 'ZRANGEBYSCORE': {
        let r = sorted(k).filter(([, sc]) => sc >= b(a[1]) && sc <= b(a[2])).map(([m]) => m);
        if (String(a[3] || '').toUpperCase() === 'LIMIT') r = r.slice(Number(a[4]), Number(a[4]) + Number(a[5]));
        return r;
      }
      case 'ZREMRANGEBYSCORE': { let n = 0; for (const [m, sc] of zOf(k)) if (sc >= b(a[1]) && sc <= b(a[2])) { zOf(k).delete(m); n++; } return n; }
      case 'ZREVRANGE': return sorted(k).reverse().slice(Number(a[1]), Number(a[2]) + 1).map(([m]) => m);
      case 'ZRANGE': {
        const r = sorted(k).slice(Number(a[1]), Number(a[2]) === -1 ? undefined : Number(a[2]) + 1);
        return String(a[3] || '').toUpperCase() === 'WITHSCORES' ? r.flatMap(([m, sc]) => [m, String(sc)]) : r.map(([m]) => m);
      }
      case 'HINCRBY': { const hm = hs.get(k) || (hs.set(k, new Map()), hs.get(k)); hm.set(a[1], (hm.get(a[1]) || 0) + Number(a[2])); return hm.get(a[1]); }
      case 'HGETALL': return [...(hs.get(k) || [])].flatMap(([f, v]) => [f, String(v)]);
      case 'EVAL': {
        // the one script of the bot (a place in the hour), done here step by step as Redis would
        const [script, nkeys, key, now, windowMs, cap, member, cutoff] = a;
        if (Number(nkeys) !== 1 || !/ZREMRANGEBYSCORE[\s\S]*ZSCORE[\s\S]*ZCARD[\s\S]*ZADD[\s\S]*PEXPIRE/.test(script)) throw new Error('ERR unknown script');
        run(['ZREMRANGEBYSCORE', key, '-inf', cutoff]);
        if (run(['ZSCORE', key, member]) !== null) return 1;
        if (run(['ZCARD', key]) >= Number(cap)) return 0;
        run(['ZADD', key, now, member]);
        run(['PEXPIRE', key, windowMs]);
        return 1;
      }
      default: throw new Error(`ERR unknown command '${op}'`);
    }
  };
  const rs = http.createServer(async (req, res) => {
    let body = '';
    for await (const c of req) body += c;
    let o;
    try {
      if (req.headers.authorization !== 'Bearer redistoken') throw new Error('WRONGPASS');
      o = { result: run(JSON.parse(body)) };
    } catch (e) {
      o = { error: e.message };
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(o));
  });
  await new Promise((r) => rs.listen(0, r));
  rs.unref();
  process.env.KV_REST_API_URL = `http://localhost:${rs.address().port}`;
  process.env.KV_REST_API_TOKEN = 'redistoken';
  process.env.IG_HOURLY_CAP = '20';
}

const ig = await import('../api/_lib/ig.js');
const hook = await import('../api/instagram.js');
const leadsPage = await import('../api/leads.js');
const T = await import('../api/_lib/ig-texts.js');
const tickPage = await import('../api/igtick.js');
const P = await import('../api/_lib/ig-posts.js');
const city = await import('../api/_lib/city.js');
simNow = () => ig.clock.now();

const post = async (entry, headers = {}) => {
  const r = await hook.POST(new Request('http://x/api/instagram', { method: 'POST', body: JSON.stringify({ object: 'instagram', entry: [{ id: OWN, time: 1, ...entry }] }), headers }));
  return r.status === 200 ? (await r.json()).results : r.status;
};
let n = 0;
const comment = (user, text, media = 'media1') => {
  const id = `c${++n}`;
  state.commentUser[id] = user;
  return { id, res: post({ changes: [{ field: 'comments', value: { id, text, from: { id: user, username: `name_${user}` }, media: { id: media, media_product_type: 'REELS' } } }] }) };
};
const dm = (user, message) => post({ messaging: [{ sender: { id: user }, recipient: { id: OWN }, timestamp: Date.now(), message: { mid: `in${++n}`, ...message } }] });
const tap = (user, payload, title = 'x') => post({ messaging: [{ sender: { id: user }, recipient: { id: OWN }, timestamp: Date.now(), postback: { mid: `pb${++n}`, title, payload } }] });
const sent = () => calls.splice(0);
const msgText = (c) => c.body?.message?.text ?? c.body?.message?.attachment?.payload?.text;
const lead = async (id) => (await ig.listLeads()).find((l) => l.id === id);

let ok = 0;
const step = async (name, fn) => { await fn(); ok++; console.log('✓', name); };

if (ONLY_RUN) {
  await ig.setMode('gate'); // the tester run tries the whole round
  await step('tester mode: everyone else is left to ManyChat, comments and DMs', async () => {
    assert.deepEqual(await comment('x1', 'PROJECT').res, ['not tester']);
    assert.deepEqual(await dm('x1', { text: 'BLUEPRINT' }), ['not tester']);
    assert.deepEqual(await tap('x1', 'GET'), ['not tester']);
    assert.equal(sent().filter((c) => c.method === 'POST').length, 0);
  });
  await step('tester mode: the tester gets the whole flow, even under a post without Comment WORD', async () => {
    assert.deepEqual(await comment('t1', 'BLUEPRINT', 'client').res, ['sent']);
    assert.equal(sent().filter((x) => x.method === 'POST').length, 2);
    await tap('t1', 'GET');
    assert.equal(msgText(sent().find((x) => x.method === 'POST')), T.textsFor('blueprint').followFirst.text);
    state.follows.t1 = true;
    await tap('t1', 'DONE');
    assert.match(msgText(sent().find((x) => x.method === 'POST')), /omnyalab\.com/);
  });
  server.close();
  console.log(`\n${ok} prove tester passate`);
  process.exit(0);
}

if (VERCEL_RUN) {
  await step('as on Vercel: Meta gets its 200 at once, the DM and the public reply go out right after', async () => {
    state.commentUser.v1 = 'u1';
    const body = JSON.stringify({ object: 'instagram', entry: [{ id: OWN, time: 1, changes: [{ field: 'comments', value: { id: 'v1', text: 'TOWERS', from: { id: 'u1', username: 'name_u1' }, media: { id: 'towersreel' } } }], messaging: [{ sender: { id: 'u9' }, recipient: { id: OWN }, timestamp: 1, postback: { mid: 'p1', title: 'Get the Blueprint', payload: 'GET:towers:DfTOWERS11' } }] }] });
    const sig = `sha256=${createHmac('sha256', 's3cret').update(body).digest('hex')}`;
    assert.equal((await hook.POST(new Request('http://x/api/instagram', { method: 'POST', body }))).status, 401); // unsigned: refused
    const r = await hook.POST(new Request('http://x/api/instagram', { method: 'POST', body, headers: { 'x-hub-signature-256': sig } }));
    assert.equal(r.status, 200);
    assert.deepEqual((await r.json()).results, ['queued', '…']); // answered before anything was sent
    assert.equal(calls.filter((x) => x.path === 'me/messages').length, 0);
    for (let i = 0; i < 100 && calls.filter((x) => x.method === 'POST').length < 3; i++) await new Promise((res) => setTimeout(res, 20));
    const s = sent().filter((x) => x.method === 'POST');
    assert.equal(s.filter((x) => x.path === 'me/messages' && x.body.recipient.comment_id === 'v1').length, 1);
    // nothing was ever set: direct, the DM has the link on a button
    assert.equal(s.find((x) => x.body?.recipient?.comment_id === 'v1').body.message.attachment.payload.buttons[0].url, 'https://www.omnyalab.com/the-towers-blueprint?ig=DfTOWERS11');
    assert.equal(s.filter((x) => x.path === 'v1/replies').length, 1);
    assert.equal(s.filter((x) => x.path === 'me/messages' && x.body.recipient.id === 'u9').length, 1);
    assert.equal((await ig.lineState()).waiting, 0);
  });
  server.close();
  console.log(`\n${ok} prova come su Vercel passata`);
  process.exit(0);
}

if (REDIS_RUN) {
  const pr = (list) => list.filter((x) => x.path === 'me/messages' && x.body.recipient.comment_id);
  const urlOf = (c) => (msgText(c).match(/https:\/\/\S+/) || [])[0] || c.body?.message?.attachment?.payload?.buttons?.[0]?.url;
  let ahead = 0;
  ig.clock.now = () => Date.now() + ahead;

  await step('on Redis: direct by default (the link in the first DM, City too), then gate set from /api/leads', async () => {
    assert.equal(await ig.getMode(), 'direct');
    const c = comment('r1', 'TOWERS', 'towersreel');
    assert.deepEqual(await c.res, ['sent']);
    const c2 = comment('r2', 'house', 'cityreel');
    assert.deepEqual(await c2.res, ['sent']);
    const s = sent().filter((x) => x.method === 'POST');
    assert.equal(s.length, 4);
    assert.deepEqual(pr(s).map((x) => x.body.message.attachment.payload.buttons[0].type), ['web_url', 'web_url']);
    assert.equal(urlOf(pr(s)[0]), 'https://www.omnyalab.com/the-towers-blueprint?ig=DfTOWERS11');
    const k = urlOf(pr(s)[1]).match(/\/city\?k=([A-Za-z0-9_-]+)&ig=DfCITYep2xx$/)[1];
    assert.equal((await city.peek(k)).u, 'name_r2');
    assert.equal((await lead('r1')).stage, 'asked');
    // the button refused: text with the link, remembered on Redis
    state.refuseTemplate = true;
    const c3 = comment('r3', 'TOWERS', 'towersreel');
    await c3.res;
    const c4 = comment('r4', 'TOWERS', 'towersreel');
    await c4.res;
    state.refuseTemplate = false;
    const t = sent().filter((x) => x.path === 'me/messages');
    assert.equal(t.filter((x) => x.body.recipient.comment_id === c3.id).length, 2);
    assert.equal(t.filter((x) => x.body.recipient.comment_id === c4.id).length, 1);
    assert.match(t.at(-1).body.message.text, /\n\nhttps:\/\/www\.omnyalab\.com\/the-towers-blueprint\?ig=DfTOWERS11$/);
    assert.equal((await (await leadsPage.GET(new Request('http://x/api/leads?key=k&action=mode&value=gate'))).json()).mode, 'gate');
    assert.equal(await ig.getMode(), 'gate');
    ahead += 2 * 3_600_000; // a clean hour for the steps below
  });

  await step('on Redis: comment → DM + public reply → tap → follow → Done → the link, each event once', async () => {
    const c = comment('u1', 'TOWERS', 'towersreel');
    assert.deepEqual(await c.res, ['sent']);
    assert.deepEqual(await post({ changes: [{ field: 'comments', value: { id: c.id, text: 'TOWERS', from: { id: 'u1', username: 'name_u1' }, media: { id: 'towersreel' } } }] }), ['dup']);
    assert.deepEqual(await comment('u1', 'towers again', 'towersreel').res, ['already']);
    let s = sent().filter((x) => x.method === 'POST');
    assert.equal(pr(s).length, 1);
    assert.equal(s.filter((x) => x.path.endsWith('/replies')).length, 1);
    assert.deepEqual(await tap('u1', 'GET:towers:DfTOWERS11'), ['get']);
    assert.equal(msgText(sent().find((x) => x.method === 'POST')), T.textsFor('towers').followFirst.text);
    state.follows.u1 = true;
    const done = { messaging: [{ sender: { id: 'u1' }, recipient: { id: OWN }, timestamp: 5, postback: { mid: 'd1', title: 'Done ✅', payload: 'DONE' } }] };
    assert.deepEqual(await post(done), ['done']);
    assert.deepEqual(await post(done), ['dup']);
    s = sent().filter((x) => x.path === 'me/messages');
    assert.equal(s.length, 1);
    assert.equal(urlOf(s[0]), 'https://www.omnyalab.com/the-towers-blueprint?ig=DfTOWERS11');
    const l = await lead('u1');
    assert.equal(l.stage, 'asked');
    assert.equal(l.kind, 'towers');
  });

  await step('on Redis: City link, old ManyChat button, click count, reel added by hand', async () => {
    state.follows.u2 = true;
    await comment('u2', '🏠', 'cityreel').res;
    await tap('u2', 'GET:city:DfCITYep2xx');
    const url = sent().filter((x) => x.path === 'me/messages').pop().body.message.attachment.payload.buttons[0].url;
    const k = url.match(/\/city\?k=([A-Za-z0-9_-]+)&ig=DfCITYep2xx$/)[1];
    assert.equal((await city.reserve(k)).house.u, 'name_u2');
    assert.equal((await city.reserve(k)).error, 'used');
    state.follows.y1 = true;
    assert.deepEqual(await tap('y1', '{"mc":1}', 'Get the Blueprint'), ['get']);
    assert.equal(sent().filter((x) => x.path === 'me/messages').pop().body.message.attachment.payload.buttons.length, 3);
    for (let i = 0; i < 2; i++) await hook.GET(new Request('http://x/api/instagram?go=the-towers-blueprint&p=DfTOWERS11'));
    const row = (await ig.postStats()).find((r) => r.post === 'DfTOWERS11');
    assert.deepEqual([row.c, row.dm, row.link, row.click, row.dest], [4, 4, 4, 2, 'towers']); // three in direct in the first step, one in gate
    assert.deepEqual(await comment('u3', 'hello', 'newreel').res, ['no word']);
    await leadsPage.GET(new Request('http://x/api/leads?key=k&action=post&code=DfNEWREEL01&dest=towers'));
    assert.deepEqual(await comment('u4', 'hello', 'newreel').res, ['sent']);
    sent();
  });

  await step('on Redis: Meta answers #100 → counted, back in line, sent later once', async () => {
    state.failPrivate = { message: '(#100) Unsupported request', type: 'OAuthException', code: 100 };
    const c = comment('u5', 'towers', 'towersreel');
    assert.deepEqual(await c.res, ['retry']);
    state.failPrivate = null;
    assert.equal((await ig.errorState()).lastHour, 1);
    assert.equal((await ig.lineState()).waiting, 1);
    ahead += 3 * 60_000;
    assert.equal((await (await tickPage.GET()).json()).sent, 1);
    const tries = sent().filter((x) => x.path === 'me/messages' && x.body.recipient.comment_id === c.id);
    assert.equal(tries.length, 3); // refused with the button, refused in plain form, then the one that went
    assert.equal(tries.filter((x) => x.at >= ig.clock.now() - 1000).length, 1);
    assert.equal((await ig.lineState()).waiting, 0);
  });

  await step('on Redis: the hour is full (cap 20 here) → the rest waits and goes out later, nobody twice', async () => {
    ahead += 2 * 3_600_000;
    sent();
    const base = ahead;
    const ids = [];
    const rs = [];
    const quiet = console.log;
    console.log = () => {};
    for (let i = 0; i < 26; i++) {
      ahead = base + i * 60_000;
      const c = comment(`w${i}`, 'towers', 'towersreel');
      ids.push(c.id);
      rs.push(...(await c.res));
    }
    // two calls at the same moment must not pass the cap either
    console.log = quiet;
    assert.deepEqual(rs, [...Array(20).fill('sent'), ...Array(6).fill('queued')]);
    let line = await ig.lineState();
    assert.deepEqual([line.waiting, line.sentLastHour, line.cap], [6, 20, 20]);
    ahead = base + 3_600_000 + 2 * 60_000 + 1000; // the places of comments 0, 1 and 2 are free again
    const both = await Promise.all([tickPage.GET(), tickPage.GET()]);
    assert.equal((await both[0].json()).sent + (await both[1].json()).sent, 3);
    ahead = base + 2 * 3_600_000;
    assert.equal((await (await tickPage.GET()).json()).sent, 3);
    const all = pr(sent()).map((x) => x.body.recipient.comment_id);
    assert.deepEqual(all.slice().sort(), ids.slice().sort());
    assert.equal(new Set(all).size, 26);
    const j = await (await hook.GET(new Request('http://x/api/instagram?health=k'))).json();
    assert.equal(j.token.ok, true);
    assert.equal(j.line.waiting, 0);
    assert.equal(j.lastComment.from, 'name_w25');
    const html = await (await leadsPage.GET(new Request('http://x/api/leads?key=k'))).text();
    assert.match(html, /@name_u1/);
    assert.match(html, /Errori ultima ora/);
    await ig.tick(ig.clock.now() + 4 * 3_600_000); // the reminders run on Redis too
    for (const op of ['GET', 'SET', 'DEL', 'INCR', 'MGET', 'ZADD', 'ZREM', 'ZRANGEBYSCORE', 'ZREVRANGE', 'ZRANGE', 'ZCARD', 'ZCOUNT', 'HINCRBY', 'HGETALL', 'EVAL', 'GETDEL']) assert.ok(redisUsed.has(op), `${op} was never sent to Redis`);
  });

  await step('on Redis: follow probe counted, and comment mode (DM without the link → follow → comment again → the link)', async () => {
    const p0 = await ig.probeState();
    assert.ok(p0.follows + p0.notFollowing >= 20); // every DM above was probed
    assert.equal((await (await leadsPage.GET(new Request('http://x/api/leads?key=k&action=mode&value=comment'))).json()).mode, 'comment');
    state.sid.k1 = 's301';
    const c1 = comment('k1', 'TOWERS', 'towersreel');
    assert.deepEqual(await c1.res, ['sent']);
    assert.deepEqual(pr(sent())[0].body.message, { text: T.textsFor('towers').comment.ask });
    const c2 = comment('k1', 'done', 'towersreel');
    assert.deepEqual(await c2.res, ['sent']);
    assert.deepEqual(pr(sent())[0].body.message, { text: T.textsFor('towers').comment.almost });
    state.follows.s301 = true;
    const c3 = comment('k1', 'DONE', 'towersreel');
    assert.deepEqual(await c3.res, ['sent']);
    const s = sent();
    assert.equal(urlOf(pr(s)[0]), 'https://www.omnyalab.com/the-towers-blueprint?ig=DfTOWERS11');
    assert.equal(msgText(pr(s)[0]), T.textsFor('towers').comment.linkNew);
    assert.deepEqual(await comment('k1', 'again', 'towersreel').res, ['already']);
    assert.equal((await lead('s301')).stage, 'asked');
    assert.ok(redisUsed.has('EXPIRE'));
    // the testers' list is kept on Redis too
    assert.deepEqual((await (await leadsPage.GET(new Request('http://x/api/leads?key=k&action=gatefor&value=name_k1'))).json()).gateFor, ['name_k1']);
    const c5 = comment('k1', 'once more', 'towersreel');
    assert.deepEqual(await c5.res, ['sent']); // on the list: answered again, with the button of the whole round
    assert.equal(pr(sent())[0].body.message.attachment.payload.buttons[0].payload, 'GET:towers:DfTOWERS11');
    assert.deepEqual((await (await leadsPage.GET(new Request('http://x/api/leads?key=k&action=gatefor&value='))).json()).gateFor, []);
  });

  await step('on Redis: "every comment" switched off and on from /api/leads', async () => {
    ahead += 2 * 3_600_000; // a clean hour (the cap is 20 here)
    await leadsPage.GET(new Request('http://x/api/leads?key=k&action=mode&value=direct'));
    const json = async () => (await leadsPage.GET(new Request('http://x/api/leads?key=k&format=json'))).json();
    assert.equal((await json()).anyComment, true); // nothing was ever set: on
    assert.deepEqual(await comment('j1', 'so good 🔥', 'towersreel').res, ['sent']);
    assert.equal(urlOf(pr(sent())[0]), 'https://www.omnyalab.com/the-towers-blueprint?ig=DfTOWERS11');
    assert.deepEqual(await (await leadsPage.GET(new Request('http://x/api/leads?key=k&action=any&value=off'))).json(), { ok: true, anyComment: false });
    assert.equal((await json()).anyComment, false);
    assert.deepEqual(await comment('j2', 'so good 🔥', 'towersreel').res, ['no word']);
    assert.deepEqual(await comment('j2', 'towers', 'towersreel').res, ['sent']);
    assert.deepEqual(await (await leadsPage.GET(new Request('http://x/api/leads?key=k&action=any&value=on'))).json(), { ok: true, anyComment: true });
    assert.equal((await (await hook.GET(new Request('http://x/api/instagram?health=k'))).json()).anyComment, true);
    assert.deepEqual(await comment('j3', '😍', 'towersreel').res, ['sent']);
    assert.ok(redisUsed.has('DEL'));
    sent();
  });

  await step('on Redis: the media list of /api/leads?action=media is asked to Meta once and then read from Redis', async () => {
    state.media = [{ id: '18001', shortcode: 'DfTOWERS11', caption: 'HOW TO LET THE BUYER CHOOSE THE VIEW 👇🏻', permalink: 'https://www.instagram.com/reel/DfTOWERS11/', thumbnail_url: 'https://cdn.example/t.jpg', media_type: 'VIDEO', timestamp: '2026-11-11T17:00:00+0000' }];
    const media = async (more = '') => (await leadsPage.GET(new Request(`http://x/api/leads?key=k&action=media${more}`))).json();
    assert.equal((await media()).media[0].shortcode, 'DfTOWERS11');
    assert.equal((await media()).media[0].caption, 'HOW TO LET THE BUYER CHOOSE THE VIEW 👇🏻');
    assert.equal(sent().filter((x) => x.path === `${OWN}/media`).length, 1);
    state.mediaFail = { message: '(#10) Application does not have permission for this action', type: 'OAuthException', code: 10 };
    const bad = await media('&fresh=1');
    state.mediaFail = null;
    assert.match(bad.error, /#10/);
    assert.equal(bad.stale, true);
    assert.equal(bad.media.length, 1); // the last list we had
    sent();
  });

  await step('on Redis: the lines take turns per reel (the count is one INCR), and a city in the comment comes back in the public reply', async () => {
    ahead += 2 * 3_600_000; // a clean hour (the cap is 20 here)
    await leadsPage.GET(new Request('http://x/api/leads?key=k&action=mode&value=direct'));
    const tw = T.textsFor('towers');
    const reply = (s, id) => s.find((x) => x.path === `${id}/replies`).query.message;
    const replies = [];
    const dms = [];
    const quiet = console.log;
    console.log = () => {};
    try {
      for (let i = 0; i < 14; i++) {
        const c = comment(`q${i}`, 'TOWERS', 'lazyreel');
        assert.deepEqual(await c.res, ['sent']);
        const s = sent();
        replies.push(reply(s, c.id));
        dms.push(msgText(pr(s)[0]));
      }
    } finally {
      console.log = quiet;
    }
    for (let i = 1; i < 14; i++) {
      assert.notEqual(replies[i], replies[i - 1]);
      assert.notEqual(dms[i], dms[i - 1]);
    }
    assert.equal(new Set(replies).size, 12);
    assert.equal(new Set(dms).size, 5);
    for (const r of replies) assert.ok(tw.publicReplies.includes(r));
    for (const d of dms) assert.ok(tw.direct.texts.includes(d) && /follow @omnyalab so you catch the next one/.test(d));
    // a city: its own lines in the public reply, the usual DM
    const c = comment('q20', 'dubai 🇦🇪', 'lazyreel');
    assert.deepEqual(await c.res, ['sent']);
    const s = sent();
    assert.ok(T.placeReplies.map((say) => say('Dubai')).includes(reply(s, c.id)));
    assert.ok(tw.direct.texts.includes(msgText(pr(s)[0])));
    assert.equal(urlOf(pr(s)[0]), 'https://www.omnyalab.com/the-towers-blueprint?ig=DfTOWERS22');
    assert.equal((await lead('q20')).place, 'Dubai');
    const c2 = comment('q21', 'love it, greetings from Dubai', 'lazyreel');
    assert.deepEqual(await c2.res, ['sent']);
    assert.ok(tw.publicReplies.includes(reply(sent(), c2.id)));
  });

  server.close();
  console.log(`\n${ok} prove su Redis passate`);
  process.exit(0);
}

await step('the mode is "direct" when nothing was ever set; the tests of the whole round run in "gate"', async () => {
  assert.equal(await ig.getMode(), 'direct');
  assert.equal((await (await hook.GET(new Request('http://x/api/instagram?health=k'))).json()).flow, 'direct');
  assert.deepEqual(await (await leadsPage.GET(new Request('http://x/api/leads?key=k&action=mode&value=gate'))).json(), { ok: true, mode: 'gate' });
  assert.equal((await (await hook.GET(new Request('http://x/api/instagram?health=k'))).json()).flow, 'gate');
  sent();
});

await step('caption words', () => {
  assert.deepEqual(ig.captionWords('Comment “PROJECT” below'), ['PROJECT']);
  assert.deepEqual(ig.captionWords('Commenta 3D e ti mando tutto'), ['3D']);
  assert.deepEqual(ig.captionWords('comment the word AI'), ['AI']);
  assert.deepEqual(ig.captionWords('Comment below 👇'), []);
  assert.equal(ig.matchWord('Project 🔥🔥', ['PROJECT']), 'PROJECT');
  assert.equal(ig.matchWord('projet!', ['PROJECT']), 'PROJECT');
  assert.equal(ig.matchWord('so beautiful', ['PROJECT']), null);
  for (const c of ['Claude', 'claude 🔥', 'Caldue', 'Cluade', 'Claudee', 'CLAUD', 'Clade', 'Clàude']) assert.equal(ig.matchWord(c, ['CLAUDE']), 'CLAUDE', c);
  for (const c of ['Cloud', 'clouds', 'amazing', 'collab']) assert.equal(ig.matchWord(c, ['CLAUDE']), null, c);
  assert.equal(ig.matchWord('A1', ['AI']), null);
});

await step('comment without the word: nothing', async () => {
  assert.deepEqual(await comment('u1', 'wow amazing').res, ['no word']);
  assert.equal(sent().filter((c) => c.method === 'POST').length, 0);
});

await step('client teaser without a word in the caption: nothing, even for AI', async () => {
  assert.deepEqual(await comment('u1', 'AI?', 'client').res, ['no word']);
  assert.equal(sent().filter((c) => c.method === 'POST').length, 0);
});

await step('comment with the word: DM with button + public reply', async () => {
  const c = comment('u1', 'PROJECT 🙌');
  assert.deepEqual(await c.res, ['sent']);
  const s = sent().filter((x) => x.method === 'POST');
  assert.equal(s[0].body.recipient.comment_id, c.id);
  assert.equal(s[0].body.message.attachment.payload.buttons[0].payload, 'GET:blueprint:abc'); // the button carries its post
  assert.ok(T.publicReplies.includes(s[1].query.message));
  assert.equal((await lead('u1')).stage, 'opened');
});

await step('same person, same reel again: nothing', async () => {
  assert.deepEqual(await comment('u1', 'project').res, ['already']);
});

await step('tap, not following: follow message with Done', async () => {
  assert.deepEqual(await tap('u1', 'GET'), ['get']);
  const s = sent().filter((x) => x.method === 'POST');
  assert.equal(msgText(s[0]), T.followFirst.text);
  assert.equal(s[0].body.message.attachment.payload.buttons[0].payload, 'DONE');
});

await step('Done but still not following', async () => {
  await tap('u1', 'DONE');
  assert.equal(msgText(sent().find((x) => x.method === 'POST')), T.stillNotFollowing.text);
});

await step('follows now, types "done": Thanks for the follow + two choices', async () => {
  state.follows.u1 = true;
  assert.deepEqual(await dm('u1', { text: 'Done!' }), ['done']);
  const m = sent().find((x) => x.method === 'POST');
  assert.equal(msgText(m), T.blueprintNewFollower.replace(T.BLUEPRINT, `${T.BLUEPRINT}?ig=abc`)); // the link says which post it came from
  assert.deepEqual(m.body.message.quick_replies.map((q) => q.payload), ['PROJECT', 'CURIOUS']);
  assert.equal((await lead('u1')).stage, 'asked');
});

await step('taps "Working on a project": call link + email to Nico', async () => {
  await dm('u1', { text: T.choices.project, quick_reply: { payload: 'PROJECT' } });
  assert.equal(msgText(sent().find((x) => x.method === 'POST')), T.answerProject);
  assert.equal((await lead('u1')).interest, 'project');
});

await step('writes in words afterwards: no bot reply (Nico gets an email)', async () => {
  assert.deepEqual(await dm('u1', { text: 'It is a villa in Marbella, 400 sqm' }), ['free']);
  assert.equal(sent().filter((x) => x.method === 'POST').length, 0);
  assert.match((await lead('u1')).wrote, /Marbella/);
});

await step('already following when commenting: Blueprint straight away', async () => {
  state.follows.u2 = true;
  await comment('u2', 'project').res;
  sent();
  await tap('u2', 'GET');
  assert.equal(msgText(sent().find((x) => x.method === 'POST')), T.blueprintFollower.replace(T.BLUEPRINT, `${T.BLUEPRINT}?ig=abc`));
});

await step('DM refused: public "send us a text", then their text starts the flow', async () => {
  const c = comment('u3', 'project');
  state.refuseDm.add(c.id);
  assert.deepEqual(await c.res, ['nodm']);
  assert.equal(sent().find((x) => x.path.endsWith('/replies')).query.message, T.cantDm);
  await dm('u3', { text: 'hi' });
  assert.equal(msgText(sent().find((x) => x.method === 'POST')), T.followFirst.text);
});

await step('button refused by Instagram: quick reply instead', async () => {
  state.refuseTemplate = true;
  await comment('u4', 'project').res;
  const s = sent().filter((x) => x.path === 'me/messages');
  assert.equal(s.length, 2);
  assert.equal(s[1].body.message.quick_replies[0].payload, 'GET:blueprint:abc');
  state.refuseTemplate = false;
});

await step('DM unopened after 3 hours: "check Requests" under the comment; opened: nothing', async () => {
  const c5 = comment('u5', 'project');
  await c5.res;
  const c6 = comment('u6', 'project');
  await c6.res;
  await post({ messaging: [{ sender: { id: 'u6' }, recipient: { id: OWN }, read: { mid: 'm1' } }] });
  sent();
  await ig.tick(Date.now() + ig.REMIND_AFTER + 1000);
  const r = sent().filter((x) => x.path.endsWith('/replies'));
  assert.ok(r.some((x) => x.path === `${c5.id}/replies` && x.query.message === T.checkRequests));
  assert.ok(!r.some((x) => x.path === `${c6.id}/replies`));
});

await step('follow-up after 20 hours, once, never after 24', async () => {
  await comment('u7', 'project').res;
  await tap('u7', 'GET'); // not following
  sent();
  const at = (await lead('u7')).lastUserAt;
  await ig.tick(at + ig.NUDGE_AFTER + 1000);
  const first = sent().filter((x) => x.path === 'me/messages');
  assert.equal(msgText(first.find((x) => x.body.recipient.id === 'u7')), T.nudgeFollow.text);
  // u2 has the Blueprint and never answered: the question again
  assert.equal(msgText(first.find((x) => x.body.recipient.id === 'u2')), T.nudgeQuestion);
  await ig.tick(at + ig.NUDGE_AFTER + 2000);
  assert.equal(sent().filter((x) => x.path === 'me/messages').length, 0);
  // after 24 hours Instagram no longer allows it: nothing
  await comment('u9', 'project').res;
  await tap('u9', 'GET');
  sent();
  await ig.tick((await lead('u9')).lastUserAt + 25 * 3_600_000);
  assert.equal(sent().filter((x) => x.path === 'me/messages').length, 0);
});

await step('Nico writes by hand: the bot stops answering free text', async () => {
  await post({ messaging: [{ sender: { id: OWN }, recipient: { id: 'u2' }, message: { mid: 'nico1', text: 'Ciao!', is_echo: true } }] });
  assert.equal((await lead('u2')).human, true);
  await dm('u2', { text: 'hello?' });
  assert.equal(sent().filter((x) => x.path === 'me/messages').length, 0);
});

await step('a random DM is left to Nico', async () => {
  assert.deepEqual(await dm('u8', { text: 'Hi, how much for a render?' }), ['not ours']);
});

await step('signature checked when the app secret is set', async () => {
  process.env.IG_APP_SECRET = 's3cret';
  assert.equal(await post({ messaging: [] }, { 'x-hub-signature-256': 'sha256=bad' }), 401);
  const body = JSON.stringify({ object: 'instagram', entry: [] });
  const sig = `sha256=${createHmac('sha256', 's3cret').update(body).digest('hex')}`;
  const r = await hook.POST(new Request('http://x', { method: 'POST', body, headers: { 'x-hub-signature-256': sig } }));
  assert.equal(r.status, 200);
  delete process.env.IG_APP_SECRET;
});

await step('webhook check from Meta', async () => {
  process.env.IG_VERIFY_TOKEN = 'v';
  const r = await hook.GET(new Request('http://x/api/instagram?hub.mode=subscribe&hub.verify_token=v&hub.challenge=42'));
  assert.equal(await r.text(), '42');
  assert.equal((await hook.GET(new Request('http://x/api/instagram?hub.mode=subscribe&hub.verify_token=no&hub.challenge=42'))).status, 403);
});

await step('tower post: Tower Blueprint texts and link, all the way through', async () => {
  assert.equal(ig.postKind('you send them the tower'), 'tower');
  assert.equal(ig.postKind('From rough 3D to final photo'), 'blueprint');
  const tw = T.textsFor('tower');
  assert.deepEqual(await comment('u7', 'AI 🔥', 'tower').res, ['sent']);
  let s = sent().filter((x) => x.method === 'POST');
  assert.equal(msgText(s[0]), tw.opener.text);
  assert.ok(tw.publicReplies.includes(s[1].query.message));
  await tap('u7', 'GET');
  assert.equal(msgText(sent().find((x) => x.method === 'POST')), tw.followFirst.text);
  state.follows.u7 = true;
  await tap('u7', 'DONE');
  const m = msgText(sent().find((x) => x.method === 'POST'));
  assert.equal(m, tw.blueprintNewFollower.replace(T.TOWER_BLUEPRINT, `${T.TOWER_BLUEPRINT}?ig=tower`));
  assert.match(m, /the-tower-blueprint/);
  assert.equal((await lead('u7')).kind, 'tower');
});

await step('leads page: private, lists everyone', async () => {
  assert.equal((await leadsPage.GET(new Request('http://x/api/leads'))).status, 404);
  const html = await (await leadsPage.GET(new Request('http://x/api/leads?key=k'))).text();
  assert.match(html, /@name_u1/);
  assert.match(html, /Ha un progetto/);
  const sub = await (await leadsPage.GET(new Request('http://x/api/leads?key=k&action=subscribe'))).json();
  assert.equal(sub.success, true);
  assert.equal(sub.instagram, OWN);
});

// ===================== 10/11/2026: the bot takes over from ManyChat =====================

const privateReplies = (list) => list.filter((x) => x.path === 'me/messages' && x.body.recipient.comment_id);
const linkOf = (c) => (msgText(c).match(/https:\/\/\S+/) || [])[0] || c.body?.message?.attachment?.payload?.buttons?.[0]?.url;
const get = async (mod, url, headers) => mod.GET(new Request(`http://x${url}`, { headers }));
const TOWERS_PAGE = 'https://www.omnyalab.com/the-towers-blueprint';

await step('the map: post by its code, by the word in its caption, the old rule, nothing', () => {
  const r = (p) => P.resolvePost(p);
  assert.deepEqual(r({ code: 'DfSXvGDtt4s', words: ['AI'], tower: true }), { dest: 'tower', any: true, words: ['AI'] });
  assert.equal(r({ code: 'DfaH3QkN4qs' }).dest, 'floors');
  assert.equal(r({ code: 'DfU-nniRvNQ' }).dest, 'film');
  assert.equal(r({ code: 'DfPzJmMtf2B' }).dest, 'film');
  assert.equal(r({ code: 'Dfh1ppmtT8t' }).dest, 'build');
  assert.equal(r({ code: 'DfXg47dtoyz' }).dest, 'city');
  // a post nobody listed: the word its caption asks for decides, and "towers" is not the old tower page
  assert.deepEqual(r({ code: 'new', words: ['TOWERS'], tower: true }), { dest: 'towers', any: true, words: ['TOWERS'] });
  assert.equal(r({ code: 'new', words: ['BUILD'] }).dest, 'build');
  assert.equal(r({ code: 'new', words: ['HOUSE'] }).dest, 'city');
  assert.deepEqual(r({ code: 'new', words: ['AI'], tower: true }), { dest: 'tower', any: false, words: ['AI'] });
  assert.deepEqual(r({ code: 'new', words: ['PROJECT'] }), { dest: 'blueprint', any: false, words: ['PROJECT'] });
  assert.equal(r({ code: 'new', words: [] }), null);
  assert.equal(P.codeOf('https://www.instagram.com/reel/DfU-nniRvNQ/?igsh=abc'), 'DfU-nniRvNQ');
  assert.equal(P.cleanCode(' https://www.instagram.com/omnyalab/reel/DfTOWERS11/ '), 'DfTOWERS11');
  assert.deepEqual(ig.captionWords('Like and comment "TOWERS" and I’ll send you the blueprint (follow first)'), ['TOWERS']);
  // every destination has its texts, a page on our site, and never the words Nico doesn't want
  for (const k of T.KINDS) {
    const t = T.textsFor(k);
    assert.match(t.url, /^https:\/\/(www\.)?omnyalab\.com\//, k);
    const all = JSON.stringify(t);
    assert.doesNotMatch(all, /\bAI\b|before it.?s built|isn.?t real|\.pdf|first image|free image/i, k);
    for (const b of [t.opener.button, t.followFirst.button, t.stillNotFollowing.button, t.nudgeFollow.button, t.link?.button, ...(t.link?.buttons || []).map((x) => x[0])].filter(Boolean)) assert.ok(b.length <= 20, `${k}: "${b}" is longer than 20`);
  }
});

await step('TOWERS reel (caption says Comment "TOWERS", nobody wrote its id anywhere): /the-towers-blueprint, not the old tower page', async () => {
  const tw = T.textsFor('towers');
  sent();
  const c = comment('u20', 'TOWERS', 'towersreel');
  assert.deepEqual(await c.res, ['sent']);
  let s = sent().filter((x) => x.method === 'POST');
  assert.equal(s[0].body.recipient.comment_id, c.id);
  assert.equal(msgText(s[0]), tw.opener.text);
  assert.equal(s[0].body.message.attachment.payload.buttons[0].title, 'Get the Blueprint');
  assert.equal(s[0].body.message.attachment.payload.buttons[0].payload, 'GET:towers:DfTOWERS11');
  assert.ok(tw.publicReplies.includes(s[1].query.message));
  await tap('u20', 'GET:towers:DfTOWERS11');
  s = sent().filter((x) => x.method === 'POST');
  assert.equal(msgText(s[0]), tw.followFirst.text);
  assert.match(msgText(s[0]), /follow @omnyalab/);
  assert.equal(s.length, 1); // no link before the follow
  state.follows.u20 = true;
  await tap('u20', 'DONE');
  s = sent().filter((x) => x.method === 'POST');
  assert.equal(s.length, 1); // one DM with the link
  assert.equal(msgText(s[0]), tw.blueprintNewFollower.replace(TOWERS_PAGE, `${TOWERS_PAGE}?ig=DfTOWERS11`));
  assert.equal(linkOf(s[0]), `${TOWERS_PAGE}?ig=DfTOWERS11`);
  assert.doesNotMatch(msgText(s[0]), /the-tower-blueprint/);
  assert.equal(s[0].body.message.attachment, undefined); // a link in a message, no file attached
  const l = await lead('u20');
  assert.equal(l.kind, 'towers');
  assert.equal(l.stage, 'asked');
});

await step('posts in the map answer ANY comment and give their own page', async () => {
  const cases = [
    ['red', 'DfSXvGDtt4s', 'https://omnyalab.com/the-tower-blueprint', '🔥🔥🔥'],
    ['floors', 'DfaH3QkN4qs', 'https://omnyalab.com/the-tower-floors', 'how??'],
    ['killed', 'DfU-nniRvNQ', 'https://www.omnyalab.com/3d-to-film', 'send it'],
    ['cooked', 'DfPzJmMtf2B', 'https://www.omnyalab.com/3d-to-film', 'wow amazing'],
    ['buildreel', 'DfBUILDnew1', 'https://www.omnyalab.com/the-build-blueprint', 'me please'],
    ['towersreel', 'DfTOWERS11', TOWERS_PAGE, 'I need this 😍'],
  ];
  let i = 30;
  for (const [media, code, page, words] of cases) {
    const u = `u${i++}`;
    state.follows[u] = true;
    assert.deepEqual(await comment(u, words, media).res, ['sent'], media);
    const first = sent().filter((x) => x.method === 'POST');
    assert.equal(first.length, 2, media); // the DM with the button and the public reply
    await tap(u, first[0].body.message.attachment.payload.buttons[0].payload);
    const s = sent().filter((x) => x.method === 'POST');
    assert.equal(s.length, 1, media);
    assert.equal(linkOf(s[0]), `${page}?ig=${code}`, media);
  }
  // a post that is not in the map keeps its rule: only the word of its caption
  assert.deepEqual(await comment('u29', 'me please').res, ['no word']);
  sent();
});

await step('the tap comes with an id we never saw (Instagram does that): the button still knows its post', async () => {
  state.follows.z1 = true;
  assert.deepEqual(await tap('z1', 'GET:towers:DfTOWERS11'), ['get']);
  const s = sent().filter((x) => x.method === 'POST');
  assert.equal(linkOf(s[0]), `${TOWERS_PAGE}?ig=DfTOWERS11`);
  assert.equal((await lead('z1')).kind, 'towers');
});

await step('the same comment delivered twice by Meta: one DM, one public reply', async () => {
  state.commentUser.dup1 = 'u40';
  const ev = { changes: [{ field: 'comments', value: { id: 'dup1', text: 'TOWERS', from: { id: 'u40', username: 'name_u40' }, media: { id: 'towersreel' } } }] };
  assert.deepEqual(await post(ev), ['sent']);
  assert.deepEqual(await post(ev), ['dup']);
  // and twice at the same moment
  state.commentUser.dup2 = 'u41';
  const ev2 = { changes: [{ field: 'comments', value: { id: 'dup2', text: 'towers', from: { id: 'u41', username: 'name_u41' }, media: { id: 'towersreel' } } }] };
  const both = (await Promise.all([post(ev2), post(ev2)])).flat().sort();
  assert.deepEqual(both, ['dup', 'sent']);
  const s = sent();
  assert.equal(privateReplies(s).filter((x) => x.body.recipient.comment_id === 'dup1').length, 1);
  assert.equal(privateReplies(s).filter((x) => x.body.recipient.comment_id === 'dup2').length, 1);
  assert.equal(s.filter((x) => x.path === 'dup1/replies' || x.path === 'dup2/replies').length, 2);
});

await step('the same tap delivered twice: one DM', async () => {
  state.follows.u40 = true;
  const ev = { messaging: [{ sender: { id: 'u40' }, recipient: { id: OWN }, timestamp: 1762790000000, postback: { mid: 'sametap', title: 'Get the Blueprint', payload: 'GET:towers:DfTOWERS11' } }] };
  assert.deepEqual(await post(ev), ['get']);
  assert.deepEqual(await post(ev), ['dup']);
  // a tap that has no id of its own: same sender and same time is the same tap
  const noMid = { messaging: [{ sender: { id: 'u40' }, recipient: { id: OWN }, timestamp: 1762790000555, postback: { title: 'Get the Blueprint', payload: 'GET:towers:DfTOWERS11' } }] };
  assert.deepEqual(await post(noMid), ['get']);
  assert.deepEqual(await post(noMid), ['dup']);
  assert.equal(sent().filter((x) => x.path === 'me/messages').length, 2);
});

await step('old ManyChat buttons: "Get the Blueprint" and "Following" from someone we never saw get the pages after the follow', async () => {
  const lg = T.textsFor('legacy');
  // ManyChat's own code is in the payload, all we can read is the label
  assert.deepEqual(await tap('y1', '{"mc":"act::8f31"}', 'Get the Blueprint'), ['get']);
  let s = sent().filter((x) => x.method === 'POST');
  assert.equal(s.length, 1);
  assert.equal(msgText(s[0]), lg.followFirst.text); // not following: no link yet
  state.follows.y1 = true;
  assert.deepEqual(await tap('y1', '{"mc":"act::77aa"}', 'Following'), ['done']);
  s = sent().filter((x) => x.method === 'POST');
  assert.equal(s.length, 1);
  assert.deepEqual(
    s[0].body.message.attachment.payload.buttons.map((b) => [b.type, b.url]),
    [['web_url', 'https://omnyalab.com/the-tower-blueprint?ig=manychat'], ['web_url', 'https://www.omnyalab.com/3d-to-film?ig=manychat'], ['web_url', 'https://www.omnyalab.com/the-build-blueprint?ig=manychat']],
  );
  // the same words typed instead of tapped
  state.follows.y2 = true;
  assert.deepEqual(await dm('y2', { text: 'Following' }), ['done']);
  assert.equal(sent().filter((x) => x.method === 'POST')[0].body.message.attachment.payload.buttons.length, 3);
  // someone the bot knows taps an old button: the link of their own reel
  assert.deepEqual(await tap('u20', '{"mc":"act::1"}', 'Get the Blueprint'), ['get']);
  assert.equal(linkOf(sent().filter((x) => x.method === 'POST')[0]), `${TOWERS_PAGE}?ig=DfTOWERS11`);
  // if Instagram refuses the buttons, the links go in the text: never silence
  state.refuseTemplate = true;
  state.follows.y3 = true;
  await tap('y3', 'x', 'Get the Blueprint');
  const plainText = sent().filter((x) => x.method === 'POST').pop();
  assert.match(msgText(plainText), /the-tower-blueprint\?ig=manychat[\s\S]*3d-to-film\?ig=manychat[\s\S]*the-build-blueprint\?ig=manychat/);
  state.refuseTemplate = false;
});

await step('old ManyChat buttons: "Get my house" and "Done" get the personal City link', async () => {
  const ct = T.textsFor('city');
  assert.deepEqual(await tap('y5', '{"mc":"city"}', 'Get my house'), ['get']);
  let s = sent().filter((x) => x.method === 'POST');
  assert.equal(msgText(s[0]), ct.followFirst.text);
  assert.equal(s[0].body.message.attachment.payload.buttons[0].title, 'Done');
  state.follows.y5 = true;
  assert.deepEqual(await tap('y5', '{"mc":"city-done"}', 'Done'), ['done']);
  s = sent().filter((x) => x.method === 'POST');
  assert.equal(msgText(s[0]), ct.link.text);
  assert.match(s[0].body.message.attachment.payload.buttons[0].url, /^https:\/\/www\.omnyalab\.com\/city\?k=[A-Za-z0-9_-]{10,40}&ig=manychat$/);
  // "Done" from someone we never saw (the follow message was ManyChat's)
  state.follows.y6 = true;
  assert.deepEqual(await tap('y6', '{"mc":"city-done"}', 'Done'), ['done']);
  assert.match(linkOf(sent().filter((x) => x.method === 'POST')[0]), /\/city\?k=/);
});

await step('Omnya City (word HOUSE): Get my house → follow → the one-time link from the City code', async () => {
  const ct = T.textsFor('city');
  const c = comment('u50', 'house 🏠', 'cityreel');
  assert.deepEqual(await c.res, ['sent']);
  let s = sent().filter((x) => x.method === 'POST');
  assert.equal(msgText(s[0]), ct.opener.text);
  assert.equal(s[0].body.message.attachment.payload.buttons[0].title, 'Get my house');
  assert.ok(ct.publicReplies.includes(s[1].query.message));
  await tap('u50', s[0].body.message.attachment.payload.buttons[0].payload);
  s = sent().filter((x) => x.method === 'POST');
  assert.equal(msgText(s[0]), ct.followFirst.text); // the city is only for followers
  state.follows.u50 = true;
  await tap('u50', 'DONE');
  s = sent().filter((x) => x.method === 'POST');
  assert.equal(s.length, 1);
  assert.equal(msgText(s[0]), ct.link.text);
  const b = s[0].body.message.attachment.payload.buttons[0];
  assert.equal(b.title, 'Reserve my spot');
  const m = b.url.match(/^https:\/\/www\.omnyalab\.com\/city\?k=([A-Za-z0-9_-]{10,40})&ig=DfCITYep2xx$/);
  assert.ok(m, b.url);
  // the link is that person's (made for the username), and asking again gives the same one
  assert.equal((await city.peek(m[1])).u, 'name_u50');
  await tap('u50', 'GET');
  assert.equal(sent().filter((x) => x.method === 'POST')[0].body.message.attachment.payload.buttons[0].url, b.url);
  // the click goes through /api/instagram (vercel.json sends /city?k=…&ig=… there) and lands on the city with the token
  const go = await get(hook, `/api/instagram?go=city&p=DfCITYep2xx&k=${m[1]}`);
  assert.equal(go.status, 302);
  assert.equal(go.headers.get('location'), `https://www.omnyalab.com/city?k=${m[1]}`);
  // one link, one house: it works once
  const first = await city.reserve(m[1]);
  assert.equal(first.house.u, 'name_u50');
  assert.equal(first.fresh, true);
  assert.equal((await city.reserve(m[1])).error, 'used');
  // from now on the button opens their house
  await tap('u50', 'GET');
  assert.equal(sent().filter((x) => x.method === 'POST')[0].body.message.attachment.payload.buttons[0].url, 'https://www.omnyalab.com/city/@name_u50');
  // the first City reel is in the map by its code: any comment
  state.follows.u51 = true;
  assert.deepEqual(await comment('u51', '😍', 'city1').res, ['sent']);
  sent();
});

await step('a reel added from /api/leads?action=post, without a deploy', async () => {
  assert.deepEqual(await comment('u60', 'towers', 'newreel').res, ['no word']); // its caption asks for nothing
  assert.equal((await get(leadsPage, '/api/leads?key=k&action=post&code=nope&dest=xxx')).status, 400);
  const r = await (await get(leadsPage, '/api/leads?key=k&action=post&code=https://www.instagram.com/reel/DfNEWREEL01/&dest=towers')).json();
  assert.equal(r.added.DfNEWREEL01, 'towers');
  state.follows.u61 = true;
  assert.deepEqual(await comment('u61', 'yes please', 'newreel').res, ['sent']);
  const s = sent().filter((x) => x.method === 'POST');
  await tap('u61', s[0].body.message.attachment.payload.buttons[0].payload);
  assert.equal(linkOf(sent().filter((x) => x.method === 'POST')[0]), `${TOWERS_PAGE}?ig=DfNEWREEL01`);
});

await step('the switch: off from /api/leads and the bot does nothing, on and it works again', async () => {
  assert.deepEqual(await (await get(leadsPage, '/api/leads?key=k&action=off')).json(), { ok: true, bot: 'off' });
  sent();
  const r = await hook.POST(new Request('http://x/api/instagram', { method: 'POST', body: JSON.stringify({ object: 'instagram', entry: [{ id: OWN, changes: [{ field: 'comments', value: { id: 'offc1', text: 'TOWERS', from: { id: 'u65', username: 'name_u65' }, media: { id: 'towersreel' } } }] }] }) }));
  assert.equal(r.status, 200);
  assert.equal((await r.json()).off, true);
  assert.equal((await (await tickPage.GET()).json()).off, true);
  assert.equal(sent().length, 0); // not one call to Instagram
  assert.match(await (await get(leadsPage, '/api/leads?key=k')).text(), /BOT SPENTO/);
  assert.equal((await (await get(hook, '/api/instagram?health=k')).json()).on, false);
  assert.deepEqual(await (await get(leadsPage, '/api/leads?key=k&action=on')).json(), { ok: true, bot: 'on' });
  assert.deepEqual(await comment('u65', 'TOWERS', 'towersreel').res, ['sent']);
  sent();
});

await step('DMs in standby (another app still holds the chat) are answered like the others', async () => {
  state.follows.u62 = true;
  await comment('u62', 'towers', 'towersreel').res;
  sent();
  const r = await hook.POST(new Request('http://x/api/instagram', { method: 'POST', body: JSON.stringify({ object: 'instagram', entry: [{ id: OWN, time: 1, standby: [{ sender: { id: 'u62' }, recipient: { id: OWN }, timestamp: Date.now(), postback: { mid: 'sb1', title: 'Get the Blueprint', payload: 'GET:towers:DfTOWERS11' } }] }] }) }));
  assert.equal(r.status, 200);
  assert.equal(linkOf(sent().filter((x) => x.path === 'me/messages')[0]), `${TOWERS_PAGE}?ig=DfTOWERS11`);
});

// from here the bot's clock is moved by hand, only forward
let ahead = 0;
ig.clock.now = () => Date.now() + ahead;
const errorsNow = async () => (await ig.errorState()).lastHour;

await step('Meta answers #100 to a tap: 200 to Meta, a clear log line, the error is counted, nothing crashes', async () => {
  const before = await errorsNow();
  const logged = [];
  const realError = console.error;
  console.error = (...a) => { logged.push(a.join(' ')); };
  state.failSend = { message: '(#100) The action is invalid since it’s not the thread owner', type: 'IGApiException', code: 100, error_subcode: 2534037 };
  let res, res2;
  try {
    res = await tap('u62', 'GET:towers:DfTOWERS11');
    // and in standby
    res2 = await hook.POST(new Request('http://x/api/instagram', { method: 'POST', body: JSON.stringify({ object: 'instagram', entry: [{ id: OWN, standby: [{ sender: { id: 'u62' }, recipient: { id: OWN }, timestamp: Date.now(), postback: { mid: 'sb2', title: 'x', payload: 'GET' } }] }] }) }));
  } finally {
    console.error = realError;
    state.failSend = null;
  }
  assert.equal(res.length, 1);
  assert.match(res[0], /^error .*#100/);
  assert.equal(res2.status, 200);
  assert.ok(logged.some((l) => l.startsWith('[ig] ERROR DM') && l.includes('#100') && l.includes('sub 2534037')), logged.join('\n'));
  assert.ok(logged.some((l) => l.startsWith('[ig] ERROR standby DM')));
  assert.equal(await errorsNow(), before + 2);
  const html = await (await get(leadsPage, '/api/leads?key=k')).text();
  assert.match(html, /Errori ultima ora/);
  assert.match(html, /not the thread owner/);
  // the person taps again once it works: they get the link
  await tap('u62', 'GET:towers:DfTOWERS11');
  assert.equal(linkOf(sent().filter((x) => x.path === 'me/messages').pop()), `${TOWERS_PAGE}?ig=DfTOWERS11`);
});

await step('Meta answers #100 to the DM of a comment: counted, the comment stays in line and gets its DM later, once', async () => {
  const before = await errorsNow();
  state.failPrivate = { message: '(#100) Unsupported request - method type: post', type: 'OAuthException', code: 100 };
  const c = comment('u70', 'towers', 'towersreel');
  assert.deepEqual(await c.res, ['retry']);
  assert.ok((await errorsNow()) > before);
  let s = sent();
  assert.equal(s.filter((x) => x.path === `${c.id}/replies`).length, 0); // no "sent, check your DMs" for a DM that didn't go
  assert.equal((await ig.lineState()).waiting, 1);
  // five failures in a row: the bot stops sending for a while instead of burning everyone
  const more = [];
  const rs = [];
  for (let i = 71; i <= 76; i++) {
    more.push(comment(`u${i}`, 'towers', 'towersreel'));
    rs.push(...(await more.at(-1).res));
  }
  assert.deepEqual(rs, ['retry', 'retry', 'retry', 'retry', 'queued', 'queued']);
  const line = await ig.lineState();
  assert.equal(line.waiting, 7);
  assert.ok(line.stoppedUntil);
  sent();
  // Meta works again
  state.failPrivate = null;
  ahead += 11 * 60_000;
  const t = await (await tickPage.GET()).json();
  assert.equal(t.sent, 7);
  assert.equal(t.waiting, 0);
  s = sent();
  for (const m of [c, ...more]) {
    assert.equal(privateReplies(s).filter((x) => x.body.recipient.comment_id === m.id).length, 1, m.id);
    assert.equal(s.filter((x) => x.path === `${m.id}/replies`).length, 1, m.id);
  }
  assert.equal((await ig.lineState()).stoppedUntil, null);
});

await step('Meta itself says "too many calls": everything waits, nothing is lost', async () => {
  state.failPrivate = { message: '(#613) Calls to this api have exceeded the rate limit', type: 'OAuthException', code: 613 };
  const c = comment('u80', 'towers', 'towersreel');
  assert.deepEqual(await c.res, ['hold']);
  state.failPrivate = null;
  const c2 = comment('u81', 'towers', 'towersreel');
  assert.deepEqual(await c2.res, ['queued']); // still on hold: not even tried
  assert.equal(privateReplies(sent()).filter((x) => x.body.recipient.comment_id === c2.id).length, 0);
  ahead += 11 * 60_000;
  assert.equal((await (await tickPage.GET()).json()).sent, 2);
  const s = sent();
  assert.deepEqual(privateReplies(s).map((x) => x.body.recipient.comment_id), [c.id, c2.id]); // in the order they came
});

await step('Instagram doesn’t give the caption: the comment waits and is answered when it does', async () => {
  state.captionDown = true;
  const c = comment('u85', 'TOWERS', 'lazyreel');
  assert.deepEqual(await c.res, ['retry']);
  assert.equal(sent().filter((x) => x.method === 'POST').length, 0);
  state.captionDown = false;
  ahead += 3 * 60_000;
  assert.equal((await (await tickPage.GET()).json()).sent, 1);
  assert.equal(msgText(privateReplies(sent())[0]), T.textsFor('towers').opener.text);
  // and if Instagram never gives it, the post can be added by its number (it is in the error list and in the health check)
  state.captionDown = true;
  posts.nocaption = { caption: '', permalink: '' };
  const c2 = comment('u86', 'TOWERS', 'nocaption');
  assert.deepEqual(await c2.res, ['retry']);
  assert.match((await ig.errorState()).last[0].msg, /nocaption/);
  await get(leadsPage, '/api/leads?key=k&action=post&code=nocaption&dest=towers');
  ahead += 3 * 60_000;
  assert.equal((await (await tickPage.GET()).json()).sent, 1);
  state.follows.u86 = true;
  await tap('u86', privateReplies(sent())[0].body.message.attachment.payload.buttons[0].payload);
  assert.equal(linkOf(sent().filter((x) => x.path === 'me/messages')[0]), `${TOWERS_PAGE}?ig=nocaption`);
  state.captionDown = false;
});

await step('clicks on the link are counted per post and shown on /api/leads', async () => {
  const before = (await ig.postStats()).find((r) => r.post === 'DfTOWERS11').click;
  for (let i = 0; i < 3; i++) {
    const r = await get(hook, '/api/instagram?go=the-towers-blueprint&p=DfTOWERS11&ig=DfTOWERS11', { 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) Instagram 400.0' });
    assert.equal(r.status, 302);
    // the page without ?ig=, so it doesn't come back here, and with the reel's code as ?reel= for Stripe
    assert.equal(r.headers.get('location'), `${TOWERS_PAGE}?reel=DfTOWERS11`);
  }
  // the preview Instagram makes of the link is not a click
  await get(hook, '/api/instagram?go=the-towers-blueprint&p=DfTOWERS11', { 'user-agent': 'facebookexternalhit/1.1' });
  const row = (await ig.postStats()).find((r) => r.post === 'DfTOWERS11');
  assert.equal(row.click, before + 3);
  assert.equal(row.dest, 'towers');
  assert.ok(row.c >= 1 && row.dm >= 1 && row.link >= 1);
  // only our own pages come out of it
  assert.equal((await get(hook, '/api/instagram?go=https://evil.example&p=x')).headers.get('location'), 'https://www.omnyalab.com/');
  assert.equal((await get(hook, '/api/instagram?go=3d-to-film&p=DfU-nniRvNQ')).headers.get('location'), 'https://www.omnyalab.com/3d-to-film?reel=DfU-nniRvNQ');
  assert.equal((await get(hook, '/api/instagram?go=the-tower-blueprint&p=manychat')).headers.get('location'), 'https://www.omnyalab.com/the-tower-blueprint?reel=manychat');
  // a link without a reel's code opens the page as it is
  assert.equal((await get(hook, '/api/instagram?go=the-tower-blueprint')).headers.get('location'), 'https://www.omnyalab.com/the-tower-blueprint');
  const j = await (await get(leadsPage, '/api/leads?key=k&format=json')).json();
  assert.equal(j.posts.find((r) => r.post === 'DfTOWERS11').click, before + 3);
  assert.equal(j.posts.find((r) => r.post === 'manychat').click, 1);
  const html = await (await get(leadsPage, '/api/leads?key=k')).text();
  assert.match(html, /Clic sul link/);
  assert.match(html, /instagram\.com\/reel\/DfTOWERS11/);
  assert.match(html, /vecchi tasti ManyChat/);
});

await step('vercel.json: links with ?ig= pass through /api/instagram for every page the bot sends', async () => {
  const { readFileSync } = await import('node:fs');
  const v = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  const rules = v.redirects.filter((r) => (r.has || []).some((x) => x.type === 'query' && x.key === 'ig'));
  assert.ok(rules.length >= 1);
  const covers = (path) => rules.some((r) => new RegExp(`^${r.source.replace(/:(\w+)\(([^)]+)\)/g, '(?:$2)')}$`).test(path));
  for (const k of T.KINDS.filter((x) => x !== 'legacy')) assert.ok(covers(new URL(T.textsFor(k).url).pathname), `no ?ig= redirect for ${k}`);
  for (const r of rules) {
    assert.equal(r.permanent, false);
    assert.match(r.destination, /^\/api\/instagram\?go=/);
  }
  assert.ok(v.functions['api/instagram.js'].maxDuration >= 30);
  assert.ok(v.functions['api/igtick.js'].maxDuration >= 60);
  // Vercel Pro since 10/11: the line is emptied every minute
  assert.deepEqual(v.crons, [{ path: '/api/igtick', schedule: '* * * * *' }]);
});

await step('health check: token, webhook fields, last comment, the line, errors of the last hour', async () => {
  assert.equal((await get(hook, '/api/instagram?health=wrong')).status, 404);
  assert.equal((await get(hook, '/api/instagram')).status, 403);
  process.env.IG_APP_SECRET = 'appsecret';
  const j = await (await get(hook, '/api/instagram?health=k')).json();
  delete process.env.IG_APP_SECRET;
  assert.equal(j.mode, 'everyone');
  assert.deepEqual(j.token, { ok: true, page: 'Omnya Lab', pageId: 'page1', instagram: OWN });
  assert.deepEqual(j.webhook.page[0].fields, ['feed', 'messages', 'messaging_postbacks']);
  assert.deepEqual(j.webhook.app[0].fields, ['messages', 'messaging_postbacks', 'standby']);
  assert.deepEqual(j.webhook.missing, ['comments']); // the field that is paused on Meta today
  assert.equal(j.lastComment.from, 'name_u86');
  assert.equal(j.lastComment.post, 'nocaption');
  assert.ok(j.lastComment.minutesAgo >= 0);
  assert.deepEqual(Object.keys(j.line), ['waiting', 'oldestMinutes', 'sentLastHour', 'cap', 'stoppedUntil', 'stoppedWhy']);
  assert.equal(j.line.cap, 750);
  assert.equal(j.line.waiting, 0);
  assert.ok(j.errors.lastHour >= 3);
  assert.ok(j.errors.last[0].msg);
  assert.ok(j.map.posts.some((p) => p.code === 'DfNEWREEL01' && p.dest === 'towers'));
  assert.doesNotMatch(JSON.stringify(j), /pagetoken|appsecret/); // no keys in the answer
  // a dead token is said, not thrown
  const tok = process.env.IG_TOKEN;
  process.env.IG_TOKEN = 'dead';
  state.tokenDead = true;
  const bad = await (await get(hook, '/api/instagram?health=k')).json();
  state.tokenDead = false;
  process.env.IG_TOKEN = tok;
  assert.equal(bad.token.ok, false);
  await ig.page(true);
});

await step('800 comments in one hour: 750 DMs, 50 wait in line and go out as the hour frees, nobody twice', async () => {
  ahead += 10 * 24 * 3_600_000; // a clean hour, far from the tests above
  sent();
  const t0 = ig.clock.now();
  const base = ahead;
  const ids = [];
  const results = [];
  const quiet = console.log;
  console.log = () => {};
  try {
    for (let i = 0; i < 800; i++) {
      ahead = base + i * 4000; // one comment every 4 seconds: 800 in 53 minutes
      const c = comment(`w${i}`, i % 3 ? 'TOWERS' : 'towers 🔥', 'towersreel');
      ids.push(c.id);
      results.push(...(await c.res));
    }
  } finally {
    console.log = quiet;
  }
  assert.equal(results.filter((r) => r === 'sent').length, 750);
  assert.equal(results.filter((r) => r === 'queued').length, 50);
  assert.deepEqual(results.slice(750), Array(50).fill('queued')); // the last 50, in order
  let s = sent();
  const mine = new Set(ids);
  const dms = () => privateReplies(s).filter((x) => mine.has(x.body.recipient.comment_id));
  assert.equal(dms().length, 750);
  assert.equal(s.filter((x) => x.path.endsWith('/replies') && mine.has(x.path.split('/')[0])).length, 750); // no "check your DMs" before the DM
  let line = await ig.lineState();
  assert.equal(line.waiting, 50);
  assert.equal(line.sentLastHour, 750);
  // Meta delivers one of the waiting comments again: still one place in line
  state.commentUser[ids[790]] = 'w790';
  assert.deepEqual(await post({ changes: [{ field: 'comments', value: { id: ids[790], text: 'TOWERS', from: { id: 'w790', username: 'name_w790' }, media: { id: 'towersreel' } } }] }), ['dup']);
  assert.equal((await ig.lineState()).waiting, 50);
  // before the hour is over nothing more can go
  ahead = base + 59 * 60_000;
  assert.equal((await (await tickPage.GET()).json()).sent, 0);
  // one hour after the first DMs their places come free: the tick (cron) sends as many as that
  ahead = base + 3_600_000 + 20_000;
  let t = await (await tickPage.GET()).json();
  assert.equal(t.sent, 6); // the DMs of the first 20 seconds: comments 0…5
  assert.equal(t.waiting, 44);
  // and a webhook call does the same job as the tick: a new comment arrives, the line moves first
  ahead = base + 3_600_000 + 60_000;
  const late = comment('w900', 'towers', 'towersreel');
  ids.push(late.id);
  mine.add(late.id);
  assert.deepEqual(await late.res, ['queued']); // it waits its turn behind the 44
  assert.equal((await ig.lineState()).waiting, 35); // 10 more places came free and went to the oldest
  ahead = base + 3_600_000 + 5 * 60_000;
  t = await (await tickPage.GET()).json();
  assert.equal(t.sent, 35);
  assert.equal(t.waiting, 0);
  s = [...s, ...sent()];
  const all = dms();
  assert.equal(all.length, 801);
  assert.equal(new Set(all.map((x) => x.body.recipient.comment_id)).size, 801); // everyone, nobody twice
  assert.deepEqual(all.slice(750).map((x) => x.body.recipient.comment_id), ids.slice(750)); // in the order they commented
  assert.equal(s.filter((x) => x.path.endsWith('/replies') && mine.has(x.path.split('/')[0])).length, 801);
  // never more than 750 DMs in any 60 minutes
  const times = all.map((x) => x.at).sort((a, b) => a - b);
  for (let i = 750; i < times.length; i++) assert.ok(times[i] - times[i - 750] >= 3_600_000, `DM ${i} is the 751st within an hour`);
  assert.ok(times[0] >= t0);
});

// ===================== 10/11/2026 afternoon: "link diretto" =====================
// Live test of the morning: with Standard Access Meta never delivers the tap of someone who has no
// role on the app. So by default the DM that answers the comment already has the link.

// direct mode says the same thing in five wordings, taken in turn: any of them is the text of direct
const isDirect = (t, said) => t.direct.texts.includes(said);
const dmsFor = (list, cid) => list.filter((x) => x.path === 'me/messages' && x.body.recipient.comment_id === cid);
const urlButton = (c) => c.body.message.attachment?.payload?.buttons?.[0];
// what went out for one comment: DMs and public replies (reminders of older tests may be due at the same time)
const forComment = (list, cid) => list.filter((x) => x.method === 'POST' && (x.path === 'me/messages' || x.path === `${cid}/replies`));
const flushDue = async () => { for (let i = 0; i < 80; i++) await ig.tick(); sent(); };

await step('direct mode, switched on from /api/leads without a deploy', async () => {
  ahead += 2 * 3_600_000; // a clean hour
  assert.equal((await get(leadsPage, '/api/leads?key=k&action=mode&value=direct')).status, 200);
  assert.equal((await (await get(hook, '/api/instagram?health=k')).json()).flow, 'direct');
  assert.equal((await (await get(leadsPage, '/api/leads?key=k&format=json')).json()).mode, 'direct');
  assert.match(await (await get(leadsPage, '/api/leads?key=k')).text(), /link diretto/);
  await flushDue();
});

await step('direct: the comment gets ONE DM that already has the right link (TOWER, floors, 3D, BUILD, TOWERS, Blueprint), no tap needed', async () => {
  const cases = [
    ['red', 'DfSXvGDtt4s', 'https://omnyalab.com/the-tower-blueprint', 'tower', 'AI'],
    ['floors', 'DfaH3QkN4qs', 'https://omnyalab.com/the-tower-floors', 'floors', '🔥'],
    ['killed', 'DfU-nniRvNQ', 'https://www.omnyalab.com/3d-to-film', 'film', '3D'],
    ['buildreel', 'DfBUILDnew1', 'https://www.omnyalab.com/the-build-blueprint', 'build', 'Build'],
    ['towersreel', 'DfTOWERS11', TOWERS_PAGE, 'towers', 'TOWERS'],
    ['media1', 'abc', 'https://omnyalab.com/the-blueprint', 'blueprint', 'project'],
  ];
  let i = 10;
  for (const [media, code, page, dest, words] of cases) {
    const u = `d${i++}`;
    const t = T.textsFor(dest);
    const before = (await ig.postStats()).find((r) => r.post === code)?.link || 0;
    const c = comment(u, words, media);
    assert.deepEqual(await c.res, ['sent'], media);
    const all = sent();
    const s = forComment(all, c.id);
    assert.equal(s.length, 2, media); // one private reply, one public reply: nothing else
    assert.equal(s[0].path, 'me/messages');
    assert.equal(s[0].body.recipient.comment_id, c.id);
    assert.ok(isDirect(t, msgText(s[0])), msgText(s[0]));
    assert.match(msgText(s[0]), /follow @omnyalab/); // the follow is asked in words, it can't be checked
    assert.deepEqual(s[0].body.message.attachment.payload.buttons, [{ type: 'web_url', title: 'Get the Blueprint', url: `${page}?ig=${code}` }], media);
    assert.equal(s[1].path, `${c.id}/replies`);
    assert.ok(t.publicReplies.includes(s[1].query.message));
    // the follow is not a condition: the only question to Instagram about this person is the probe, after the DM
    assert.equal(all.filter((x) => x.path === u).length, 1);
    assert.ok(all.findIndex((x) => x.path === u) > all.findIndex((x) => x.path === 'me/messages'), media);
    const l = await lead(u);
    assert.deepEqual([l.stage, l.kind, l.post, l.direct], ['asked', dest, code, true]); // they have the link
    assert.equal((await ig.postStats()).find((r) => r.post === code).link, before + 1); // counted as a link sent
    assert.equal(t.direct.texts[0], t.direct.text); // the wording that was already there is still the first
    for (const w of t.direct.texts) {
      assert.ok(t.direct.button.length <= 20 && w.length < 640);
      assert.doesNotMatch(w, /\bAI\b|before it.?s built|free image|first image/i);
    }
  }
  // the same comment twice, the same person twice: still one DM
  state.commentUser.ddup = 'd19';
  const ev = { changes: [{ field: 'comments', value: { id: 'ddup', text: 'TOWERS', from: { id: 'd19', username: 'name_d19' }, media: { id: 'towersreel' } } }] };
  assert.deepEqual(await post(ev), ['sent']);
  assert.deepEqual(await post(ev), ['dup']);
  assert.deepEqual(await comment('d19', 'towers!!', 'towersreel').res, ['already']);
  assert.equal(dmsFor(sent(), 'ddup').length, 1);
  // no "check Requests" under the comment 3 hours later: in direct mode we can't know who opened the DM
  for (let k = 0; k < 80; k++) await ig.tick(ig.clock.now() + ig.REMIND_AFTER + 60_000);
  assert.equal(sent().filter((x) => x.path === 'ddup/replies').length, 0);
});

await step('direct: Omnya City, the personal one-time link is made when they comment, from the username of the comment', async () => {
  const ct = T.textsFor('city');
  const c = comment('d20', 'HOUSE 🏠', 'cityreel');
  assert.deepEqual(await c.res, ['sent']);
  const s = forComment(sent(), c.id);
  assert.equal(s.length, 2);
  assert.ok(isDirect(ct, msgText(s[0])), msgText(s[0]));
  const b = urlButton(s[0]);
  assert.deepEqual([b.type, b.title], ['web_url', 'Get my house']);
  const m = b.url.match(/^https:\/\/www\.omnyalab\.com\/city\?k=([A-Za-z0-9_-]{10,40})&ig=DfCITYep2xx$/);
  assert.ok(m, b.url);
  assert.equal((await city.peek(m[1])).u, 'name_d20');
  assert.equal((await city.reserve(m[1])).house.u, 'name_d20');
  assert.equal((await city.reserve(m[1])).error, 'used'); // one link, one house
  // someone who already has a house gets the link of their house
  const again = comment('d20', '🏡', 'city1');
  await again.res;
  assert.equal(urlButton(dmsFor(sent(), again.id)[0]).url, 'https://www.omnyalab.com/city/@name_d20');
});

await step('direct: Instagram refuses the link button → the same text with the link in it, and from then on at once', async () => {
  const t = T.textsFor('towers');
  const url = `${TOWERS_PAGE}?ig=DfTOWERS11`;
  state.refuseTemplate = true;
  const c = comment('d30', 'TOWERS', 'towersreel');
  assert.deepEqual(await c.res, ['sent']);
  let s = sent();
  let d = dmsFor(s, c.id);
  assert.equal(d.length, 2); // the button, refused, then the text
  assert.equal(d[1].body.message.attachment, undefined);
  assert.equal(d[1].body.message.text, `${msgText(d[0])}\n\n${url}`); // the same words as the refused button
  assert.ok(isDirect(t, msgText(d[0])));
  assert.equal(s.filter((x) => x.path === `${c.id}/replies`).length, 1);
  assert.equal((await ig.lineState()).sentLastHour >= 2, true); // both calls took their place in the hour
  // the next ones don't try the button again: one call per comment
  const c2 = comment('d31', 'TOWERS', 'towersreel');
  assert.deepEqual(await c2.res, ['sent']);
  d = dmsFor(sent(), c2.id);
  assert.equal(d.length, 1);
  assert.ok(t.direct.texts.some((w) => d[0].body.message.text === `${w}\n\n${url}`), d[0].body.message.text);
  assert.match((await (await get(hook, '/api/instagram?health=k')).json()).linkAs, /^text/);
  // City too
  const c3 = comment('d32', 'house', 'cityreel');
  await c3.res;
  assert.match(dmsFor(sent(), c3.id)[0].body.message.text, /made for your username[\s\S]*\n\nhttps:\/\/www\.omnyalab\.com\/city\?k=[A-Za-z0-9_-]+&ig=DfCITYep2xx$/);
  state.refuseTemplate = false;
  // setting the mode again makes the bot try the button again
  await get(leadsPage, '/api/leads?key=k&action=mode&value=direct');
  const c4 = comment('d33', 'TOWERS', 'towersreel');
  await c4.res;
  assert.equal(urlButton(dmsFor(sent(), c4.id)[0]).url, url);
  assert.equal((await (await get(hook, '/api/instagram?health=k')).json()).linkAs, 'button');
  // a refusal that is not about the button (Meta's side) doesn't switch to text: the comment waits and goes later, once
  state.failPrivate = { message: '(#100) Unsupported request - method type: post', type: 'OAuthException', code: 100 };
  const c5 = comment('d34', 'TOWERS', 'towersreel');
  assert.deepEqual(await c5.res, ['retry']);
  state.failPrivate = null;
  assert.equal((await (await get(hook, '/api/instagram?health=k')).json()).linkAs, 'button');
  sent();
  ahead += 3 * 60_000;
  assert.equal((await (await tickPage.GET()).json()).sent, 1);
  const late = sent();
  assert.equal(urlButton(dmsFor(late, c5.id)[0]).url, url);
  assert.equal(late.filter((x) => x.path === `${c5.id}/replies`).length, 1);
});

await step('direct: the taps and messages that do reach us (testers, people with a role) get the link at once', async () => {
  // a tap on a button sent while the bot was in gate mode, by someone who doesn't follow
  assert.deepEqual(await tap('d40', 'GET:towers:DfTOWERS11'), ['get']);
  let s = sent();
  assert.equal(linkOf(s.filter((x) => x.path === 'me/messages')[0]), `${TOWERS_PAGE}?ig=DfTOWERS11`);
  assert.equal(s.filter((x) => x.path === 'd40').length, 0); // no follow check
  // an old ManyChat button
  assert.deepEqual(await tap('d41', '{"mc":1}', 'Get my house'), ['get']);
  assert.match(sent().filter((x) => x.path === 'me/messages')[0].body.message.attachment.payload.buttons[0].url, /\/city\?k=/);
  // the word written in a DM
  assert.deepEqual(await dm('d42', { text: 'TOWERS' }), ['get']);
  assert.equal(linkOf(sent().filter((x) => x.path === 'me/messages')[0]), `${TOWERS_PAGE}?ig=dm`);
  // someone who got the direct DM and writes back: no second link, Nico gets the email
  assert.deepEqual(await dm('d14', { text: 'thanks man' }), ['free']);
  assert.equal(sent().filter((x) => x.path === 'me/messages').length, 0);
});

await step('direct: 800 comments in one hour → 750 DMs with the link, 50 wait in line, one call each, nobody twice', async () => {
  ahead += 10 * 24 * 3_600_000;
  await flushDue(); // the reminders of the gate tests above, out of the way
  const base = ahead;
  const ids = [];
  const results = [];
  const quiet = console.log;
  console.log = () => {};
  try {
    for (let i = 0; i < 800; i++) {
      ahead = base + i * 4000;
      const c = comment(`e${i}`, 'TOWERS', 'towersreel');
      ids.push(c.id);
      results.push(...(await c.res));
    }
  } finally {
    console.log = quiet;
  }
  assert.deepEqual(results, [...Array(750).fill('sent'), ...Array(50).fill('queued')]);
  const mine = new Set(ids);
  let s = sent();
  const dms = () => privateReplies(s).filter((x) => mine.has(x.body.recipient.comment_id));
  assert.equal(dms().length, 750); // one private reply per comment, the whole hour of Meta used and not one more
  assert.equal(s.filter((x) => x.method === 'POST').length, 1500); // 750 DMs + 750 public replies
  const line = await ig.lineState();
  assert.deepEqual([line.waiting, line.sentLastHour], [50, 750]);
  ahead = base + 59 * 60_000;
  assert.equal((await (await tickPage.GET()).json()).sent, 0);
  ahead = base + 3_600_000 + 5 * 60_000;
  const t = await (await tickPage.GET()).json();
  assert.deepEqual([t.sent, t.waiting], [50, 0]);
  s = [...s, ...sent()];
  const all = dms();
  assert.equal(all.length, 800);
  assert.equal(new Set(all.map((x) => x.body.recipient.comment_id)).size, 800);
  assert.deepEqual(all.slice(750).map((x) => x.body.recipient.comment_id), ids.slice(750));
  for (const x of all) assert.equal(urlButton(x).url, `${TOWERS_PAGE}?ig=DfTOWERS11`);
  const times = all.map((x) => x.at).sort((a, b) => a - b);
  for (let i = 750; i < times.length; i++) assert.ok(times[i] - times[i - 750] >= 3_600_000);
});

await step('back to gate from /api/leads: the whole round again (button to tap → follow check → link)', async () => {
  ahead += 2 * 3_600_000;
  assert.equal((await get(leadsPage, '/api/leads?key=k&action=mode&value=nope')).status, 400);
  assert.deepEqual(await (await get(leadsPage, '/api/leads?key=k&action=mode&value=gate')).json(), { ok: true, mode: 'gate' });
  const tw = T.textsFor('towers');
  const c = comment('d50', 'TOWERS', 'towersreel');
  assert.deepEqual(await c.res, ['sent']);
  let s = forComment(sent(), c.id);
  assert.equal(msgText(s[0]), tw.opener.text);
  assert.deepEqual(s[0].body.message.attachment.payload.buttons, [{ type: 'postback', title: 'Get the Blueprint', payload: 'GET:towers:DfTOWERS11' }]);
  assert.equal((await lead('d50')).stage, 'opened');
  await tap('d50', 'GET:towers:DfTOWERS11');
  assert.equal(msgText(sent().filter((x) => x.path === 'me/messages')[0]), tw.followFirst.text); // no link before the follow
  state.follows.d50 = true;
  await tap('d50', 'DONE');
  assert.equal(linkOf(sent().filter((x) => x.path === 'me/messages')[0]), `${TOWERS_PAGE}?ig=DfTOWERS11`);
});

// ===================== 10/11/2026: the follow probe, and the gate through comments =====================
// Comments reach us from everyone, messages don't. The answer to a private reply gives the commenter's
// messaging id: the probe asks Meta whether that id follows us (always on, only logs and counts), and
// "comment" mode (ready, off) uses it to ask for the follow before the link.

const logsOf = async (fn) => {
  const lines = [];
  const real = console.log;
  console.log = (...a) => { lines.push(a.join(' ')); };
  try { await fn(); } finally { console.log = real; }
  return lines;
};
const say = (id, user, text, media) => {
  state.commentUser[id] = user;
  return post({ changes: [{ field: 'comments', value: { id, text, from: { id: user, username: `name_${user}` }, media: { id: media } } }] });
};
const idx = (list, f) => list.findIndex(f);

await step('follow probe: after every DM to a comment, one log line and a count, in every mode; it can never stop the DM', async () => {
  ahead += 2 * 3_600_000;
  await get(leadsPage, '/api/leads?key=k&action=mode&value=direct');
  await flushDue();
  const before = await ig.probeState();
  // Instagram gives the tap/DM side another id than the comment's: s101 is p1's messaging id
  state.sid.p1 = 's101';
  state.follows.s101 = true;
  let lines = await logsOf(async () => assert.deepEqual(await say('pc1', 'p1', 'TOWERS', 'towersreel'), ['sent']));
  assert.ok(lines.includes('[ig] probe name_p1 → follows=true'), lines.join('\n'));
  let s = sent();
  assert.equal(s.filter((x) => x.method === 'GET' && x.path === 's101').length, 1);
  assert.equal(s.find((x) => x.path === 's101').query.fields, 'is_user_follow_business');
  assert.ok(idx(s, (x) => x.path === 's101') > idx(s, (x) => x.path === 'me/messages')); // after the DM, never before it
  lines = await logsOf(async () => assert.deepEqual(await say('pc2', 'p2', 'TOWERS', 'towersreel'), ['sent']));
  assert.ok(lines.includes('[ig] probe name_p2 → follows=false'));
  // Meta refuses to say: logged with its code, counted, and the DM and the public reply went out all the same
  state.probeFail = { message: '(#10) This action requires the user to have messaged the business first', type: 'OAuthException', code: 10, error_subcode: 2018108 };
  const errorsBefore = (await ig.errorState()).lastHour;
  lines = await logsOf(async () => assert.deepEqual(await say('pc3', 'p3', 'TOWERS', 'towersreel'), ['sent']));
  state.probeFail = null;
  assert.ok(lines.includes('[ig] probe name_p3 → ERROR 10/2018108 (#10) This action requires the user to have messaged the business first'), lines.join('\n'));
  s = sent();
  assert.equal(dmsFor(s, 'pc3').length, 1);
  assert.equal(s.filter((x) => x.path === 'pc3/replies').length, 1);
  assert.equal((await ig.errorState()).lastHour, errorsBefore); // the probe has its own count, it doesn't fill the error list
  // Meta answers without the field
  state.probeBlank = true;
  lines = await logsOf(async () => { await say('pc4', 'p4', 'TOWERS', 'towersreel'); });
  state.probeBlank = false;
  assert.ok(lines.includes('[ig] probe name_p4 → follows=unknown'));
  const now = await ig.probeState();
  assert.deepEqual([now.follows - before.follows, now.notFollowing - before.notFollowing, now.errors - before.errors, now.unknown - before.unknown], [1, 1, 1, 1]);
  assert.match(now.lastError.said, /^10\/2018108 \(#10\)/);
  assert.equal(now.lastError.who, 'name_p3');
  // readable from /api/leads and from the health check
  const j = await (await get(leadsPage, '/api/leads?key=k&format=json')).json();
  assert.deepEqual(j.followProbe, now);
  assert.match(await (await get(leadsPage, '/api/leads?key=k')).text(), /sonda del follow: \d+ seguono, \d+ non seguono, \d+ senza risposta, \d+ errori/);
  assert.deepEqual((await (await get(hook, '/api/instagram?health=k')).json()).followProbe, now);
  // gate mode probes too
  await get(leadsPage, '/api/leads?key=k&action=mode&value=gate');
  lines = await logsOf(async () => { await say('pc5', 'p5', 'TOWERS', 'towersreel'); });
  assert.ok(lines.includes('[ig] probe name_p5 → follows=false'));
  sent();
});

await step('comment mode, switched on from /api/leads: first comment → a DM without the link; they follow and comment again → the link', async () => {
  assert.deepEqual(await (await get(leadsPage, '/api/leads?key=k&action=mode&value=comment')).json(), { ok: true, mode: 'comment' });
  assert.equal((await (await get(hook, '/api/instagram?health=k')).json()).flow, 'comment');
  assert.match(await (await get(leadsPage, '/api/leads?key=k')).text(), /cancello a commenti/);
  const t = T.textsFor('towers');
  state.sid.k1 = 's201';
  assert.deepEqual(await say('kc1', 'k1', 'TOWERS', 'towersreel'), ['sent']);
  let s = sent();
  let mine = forComment(s, 'kc1');
  assert.equal(mine.length, 2);
  assert.deepEqual(mine[0].body.message, { text: t.comment.ask }); // no button, no link
  assert.doesNotMatch(t.comment.ask, /https?:|omnyalab\.com/);
  assert.match(t.comment.ask, /follow @omnyalab, then comment DONE under the reel/);
  assert.ok(t.comment.askReplies.includes(mine[1].query.message));
  assert.deepEqual([(await lead('s201')).stage, (await lead('s201')).wasAskedFollow], ['asked_follow', true]);
  // they follow and comment DONE: the follow is checked BEFORE answering, with the id the first DM gave us
  state.follows.s201 = true;
  assert.deepEqual(await say('kc2', 'k1', 'DONE', 'towersreel'), ['sent']);
  assert.deepEqual(await say('kc2', 'k1', 'DONE', 'towersreel'), ['dup']); // never two answers to the same comment
  s = sent();
  assert.ok(idx(s, (x) => x.method === 'GET' && x.path === 's201') < idx(s, (x) => x.path === 'me/messages'));
  mine = forComment(s, 'kc2');
  assert.equal(mine.length, 2);
  assert.equal(mine[0].body.recipient.comment_id, 'kc2'); // the private reply to THIS comment
  assert.equal(msgText(mine[0]), t.comment.linkNew);
  assert.deepEqual(urlButton(mine[0]), { type: 'web_url', title: 'Get the Blueprint', url: `${TOWERS_PAGE}?ig=DfTOWERS11` });
  assert.ok(t.publicReplies.includes(mine[1].query.message));
  const l = await lead('s201');
  assert.deepEqual([l.stage, l.follows, l.kind], ['asked', true, 'towers']);
  // they have it: a third comment under this reel gets nothing more
  assert.deepEqual(await say('kc3', 'k1', 'thanks!', 'towersreel'), ['already']);
  assert.equal(sent().filter((x) => x.method === 'POST').length, 0);
});

await step('comment mode: still not following at the second comment → "almost there"; the third comment gets the link anyway', async () => {
  const t = T.textsFor('towers');
  assert.deepEqual(await say('kd1', 'k2', 'towers', 'towersreel'), ['sent']);
  assert.equal(forComment(sent(), 'kd1')[0].body.message.text, t.comment.ask);
  assert.deepEqual(await say('kd2', 'k2', 'done', 'towersreel'), ['sent']);
  let mine = forComment(sent(), 'kd2');
  assert.equal(mine.length, 1); // the DM alone, nothing in public
  assert.deepEqual(mine[0].body.message, { text: t.comment.almost });
  assert.match(t.comment.almost, /^Almost there 👀 follow @omnyalab first, then comment again/);
  assert.equal((await lead('k2')).stage, 'asked_follow');
  assert.deepEqual(await say('kd3', 'k2', 'DONE!!', 'towersreel'), ['sent']);
  mine = forComment(sent(), 'kd3');
  assert.equal(mine.length, 2);
  assert.ok(isDirect(t, msgText(mine[0]))); // still asks for the follow, in words
  assert.match(msgText(mine[0]), /follow @omnyalab/);
  assert.equal(urlButton(mine[0]).url, `${TOWERS_PAGE}?ig=DfTOWERS11`);
  assert.equal((await lead('k2')).stage, 'asked');
  assert.deepEqual(await say('kd4', 'k2', 'done', 'towersreel'), ['already']); // three answers per reel at most
});

await step('comment mode: the follow check fails (Meta refuses) → the link at once, as in direct, and the error is logged', async () => {
  const t = T.textsFor('towers');
  await say('ke1', 'k3', 'towers', 'towersreel');
  sent();
  state.probeFail = { message: '(#200) Requires instagram_manage_messages permission', type: 'OAuthException', code: 200 };
  let res;
  const lines = await logsOf(async () => { res = await say('ke2', 'k3', 'DONE', 'towersreel'); });
  state.probeFail = null;
  assert.deepEqual(res, ['sent']);
  assert.ok(lines.some((l) => l.startsWith('[ig] probe name_k3 → ERROR 200 (#200) Requires instagram_manage_messages')), lines.join('\n'));
  const mine = forComment(sent(), 'ke2');
  assert.equal(mine.length, 2);
  assert.ok(isDirect(t, msgText(mine[0])), msgText(mine[0]));
  assert.equal(urlButton(mine[0]).url, `${TOWERS_PAGE}?ig=DfTOWERS11`);
  // and when Meta gives no id back with the first DM there is nothing to check at the second comment: the link
  state.noRecipient = true;
  await say('kf1', 'k4', 'towers', 'towersreel');
  state.noRecipient = false;
  assert.equal(forComment(sent(), 'kf1')[0].body.message.text, t.comment.ask);
  assert.deepEqual(await say('kf2', 'k4', 'DONE', 'towersreel'), ['sent']);
  assert.equal(urlButton(forComment(sent(), 'kf2')[0]).url, `${TOWERS_PAGE}?ig=DfTOWERS11`);
});

await step('comment mode: someone whose id we already know from another reel and who follows gets the link at the first comment', async () => {
  // k1 followed after the TOWERS reel: the BUILD reel answers with the link straight away
  assert.deepEqual(await say('kg1', 'k1', 'Build', 'buildreel'), ['sent']);
  let s = sent();
  let mine = forComment(s, 'kg1');
  assert.equal(mine.length, 2);
  assert.equal(msgText(mine[0]), T.textsFor('build').comment.linkFollower);
  assert.equal(urlButton(mine[0]).url, 'https://www.omnyalab.com/the-build-blueprint?ig=DfBUILDnew1');
  assert.equal(s.filter((x) => x.path === 's201').length, 1); // one check, before the DM, and no second probe after it
  // k2 is known too but doesn't follow: asked first, like anyone
  assert.deepEqual(await say('kg2', 'k2', 'Build', 'buildreel'), ['sent']);
  assert.equal(forComment(sent(), 'kg2')[0].body.message.text, T.textsFor('build').comment.ask);
});

await step('comment mode: a reel that wants its own word still takes "DONE" as the second comment; City gives the personal link after the follow', async () => {
  assert.deepEqual(await say('kh0', 'k5', 'so nice', 'media1'), ['no word']); // not the word, and nothing pending: nothing
  assert.deepEqual(await say('kh1', 'k5', 'PROJECT', 'media1'), ['sent']);
  assert.equal(forComment(sent(), 'kh1')[0].body.message.text, T.comment.ask);
  state.follows.k5 = true;
  assert.deepEqual(await say('kh2', 'k5', 'DONE', 'media1'), ['sent']);
  assert.equal(urlButton(forComment(sent(), 'kh2')[0]).url, 'https://omnyalab.com/the-blueprint?ig=abc');
  const ct = T.textsFor('city');
  assert.deepEqual(await say('ki1', 'k6', 'HOUSE', 'cityreel'), ['sent']);
  let mine = forComment(sent(), 'ki1');
  assert.deepEqual(mine[0].body.message, { text: ct.comment.ask });
  assert.ok(ct.comment.askReplies.includes(mine[1].query.message));
  state.follows.k6 = true;
  assert.deepEqual(await say('ki2', 'k6', 'done', 'cityreel'), ['sent']);
  mine = forComment(sent(), 'ki2');
  assert.equal(msgText(mine[0]), ct.comment.linkNew);
  const m = urlButton(mine[0]).url.match(/^https:\/\/www\.omnyalab\.com\/city\?k=([A-Za-z0-9_-]{10,40})&ig=DfCITYep2xx$/);
  assert.equal((await city.peek(m[1])).u, 'name_k6');
  // every answer is one private reply and takes one place of the hour, like any other
  const before = (await ig.lineState()).sentLastHour;
  await say('kj1', 'k7', 'towers', 'towersreel');
  await say('kj2', 'k7', 'done', 'towersreel');
  assert.equal((await ig.lineState()).sentLastHour, before + 2);
  // the texts of this mode keep Nico's rules
  for (const k of T.KINDS.filter((x) => x !== 'legacy')) {
    const c = T.textsFor(k).comment;
    assert.doesNotMatch(JSON.stringify(c), /\bAI\b|before it.?s built|first image|free image|https?:/i, k);
    assert.match(c.ask, /follow @omnyalab, then comment DONE under the reel/, k);
  }
  // back to direct: the default again
  assert.equal((await (await get(leadsPage, '/api/leads?key=k&action=mode&value=direct')).json()).mode, 'direct');
  sent();
});

// ===================== 10/11/2026: the whole round for the testers only (App Review screencast) =====================

await step('gate round for listed testers only: button → follow check → follow + Done → link, logged step by step, while everyone else stays in direct', async () => {
  ahead += 2 * 3_600_000;
  await flushDue();
  assert.equal(await ig.getMode(), 'direct');
  assert.deepEqual((await (await get(hook, '/api/instagram?health=k')).json()).gateFor, []);
  assert.deepEqual(await (await get(leadsPage, '/api/leads?key=k&action=gatefor&value=@Name_G1')).json(), { ok: true, gateFor: ['name_g1'] });
  assert.deepEqual((await (await get(hook, '/api/instagram?health=k')).json()).gateFor, ['name_g1']);
  assert.match(await (await get(leadsPage, '/api/leads?key=k')).text(), /giro completo solo per: name_g1/);
  const tw = T.textsFor('towers');
  const lines = await logsOf(async () => {
    // the tester: the DM has a button to tap, no link
    assert.deepEqual(await say('gc1', 'g1', 'TOWERS', 'towersreel'), ['sent']);
    let mine = forComment(sent(), 'gc1');
    assert.equal(msgText(mine[0]), tw.opener.text);
    assert.deepEqual(mine[0].body.message.attachment.payload.buttons, [{ type: 'postback', title: 'Get the Blueprint', payload: 'GET:towers:DfTOWERS11' }]);
    assert.ok(tw.publicReplies.includes(mine[1].query.message));
    // anyone else under the same reel, at the same time: direct, the link in the DM
    assert.deepEqual(await say('gc2', 'g2', 'TOWERS', 'towersreel'), ['sent']);
    assert.equal(urlButton(forComment(sent(), 'gc2')[0]).url, `${TOWERS_PAGE}?ig=DfTOWERS11`);
    // tap: the follow is checked, they don't follow → "follow + Done", no link
    assert.deepEqual(await tap('g1', 'GET:towers:DfTOWERS11', 'Get the Blueprint'), ['get']);
    let s = sent();
    assert.equal(s.filter((x) => x.method === 'GET' && x.path === 'g1').length, 1);
    let out = s.filter((x) => x.path === 'me/messages');
    assert.equal(out.length, 1);
    assert.equal(msgText(out[0]), tw.followFirst.text);
    assert.deepEqual(out[0].body.message.attachment.payload.buttons, [{ type: 'postback', title: 'Done ✅', payload: 'DONE' }]);
    // Done without following
    assert.deepEqual(await tap('g1', 'DONE', 'Done ✅'), ['done']);
    assert.equal(msgText(sent().filter((x) => x.path === 'me/messages')[0]), tw.stillNotFollowing.text);
    // they follow, Done: the link
    state.follows.g1 = true;
    assert.deepEqual(await tap('g1', 'DONE', 'Done ✅'), ['done']);
    out = sent().filter((x) => x.path === 'me/messages');
    assert.equal(out.length, 1);
    assert.equal(linkOf(out[0]), `${TOWERS_PAGE}?ig=DfTOWERS11`);
  });
  const steps = lines.filter((l) => l.startsWith('[ig] gate name_g1 step=')).map((l) => l.slice('[ig] gate name_g1 step='.length));
  assert.deepEqual(steps, [
    'comment "TOWERS" post=DfTOWERS11',
    'dm-sent with the button "Get the Blueprint"',
    'public-reply-sent',
    'tap "Get the Blueprint" → get',
    'follow-check follows=false',
    'ask-follow-sent (follow + Done button)',
    'tap "Done ✅" → done',
    'follow-check follows=false',
    'still-not-following-sent (follow + Done again)',
    'tap "Done ✅" → done',
    'follow-check follows=true',
    'link-sent page=/the-towers-blueprint',
  ]);
  assert.equal(lines.filter((l) => l.startsWith('[ig] gate name_g2')).length, 0); // only the listed ones
});

await step('gate round for testers: the scene can be shot again under the same reel, and the question project/curious is there where it belongs', async () => {
  // same person, same reel, a new comment: answered again (for everyone else it would be "already")
  assert.deepEqual(await say('gc3', 'g1', 'TOWERS', 'towersreel'), ['sent']);
  assert.deepEqual(await say('gc3', 'g1', 'TOWERS', 'towersreel'), ['dup']); // but never twice for the same comment
  assert.deepEqual(await say('gc4', 'g1', 'towers again', 'towersreel'), ['sent']);
  let s = sent();
  assert.equal(dmsFor(s, 'gc3').length, 1);
  assert.equal(dmsFor(s, 'gc4')[0].body.message.attachment.payload.buttons[0].type, 'postback');
  assert.deepEqual(await say('gc5', 'g2', 'TOWERS', 'towersreel'), ['already']);
  // the red tower: after the link, the question with the two choices
  const tr = T.textsFor('tower');
  await say('gc6', 'g1', 'AI', 'red');
  sent();
  const lines = await logsOf(async () => {
    await tap('g1', 'GET:tower:DfSXvGDtt4s', 'Get the Blueprint');
    const out = sent().filter((x) => x.path === 'me/messages');
    assert.equal(linkOf(out[0]), 'https://omnyalab.com/the-tower-blueprint?ig=DfSXvGDtt4s');
    assert.deepEqual(out[0].body.message.quick_replies.map((q) => q.payload), ['PROJECT', 'CURIOUS']);
    assert.deepEqual(await dm('g1', { text: T.choices.project, quick_reply: { payload: 'PROJECT' } }), ['project']);
    const a = msgText(sent().filter((x) => x.path === 'me/messages')[0]);
    assert.equal(a, tr.answerProject);
    assert.match(a, /omnyalab\.com\/book\/call[\s\S]*wa\.me\/393792220465/); // a call or WhatsApp, to see a 3D demo
    assert.match(a, /3D demo of your tower/);
  });
  assert.ok(lines.includes('[ig] gate name_g1 step=link-sent page=/the-tower-blueprint with the question project/curious'), lines.join('\n'));
  assert.ok(lines.includes('[ig] gate name_g1 step=choice "Working on a project" → project'));
  assert.ok(lines.includes('[ig] gate name_g1 step=project-answer-sent (call link and WhatsApp)'));
  // the free image is over: not in any message of any round
  for (const k of T.KINDS) assert.doesNotMatch(JSON.stringify(T.textsFor(k)), /first image|image is (free|on us)|free image|free sample/i, k);
  assert.doesNotMatch(T.answerProject + T.answerCurious + T.nudgeQuestion, /\bAI\b|free/);
});

await step('gate round for testers: also from the env var IG_GATE_FOR, and an empty list gives everyone the mode of the day', async () => {
  process.env.IG_GATE_FOR = 'someone_else, @name_g3';
  assert.deepEqual((await ig.gateFor()).sort(), ['name_g1', 'name_g3', 'someone_else']);
  assert.deepEqual(await say('gd1', 'g3', 'Build', 'buildreel'), ['sent']);
  assert.equal(forComment(sent(), 'gd1')[0].body.message.attachment.payload.buttons[0].payload, 'GET:build:DfBUILDnew1');
  // a tap that comes with an id we have no lead for: the username is asked to Instagram, and it is on the list
  state.follows.g9 = false;
  process.env.IG_GATE_FOR = 'name_g9';
  assert.deepEqual(await tap('g9', 'GET:towers:DfTOWERS11', 'Get the Blueprint'), ['get']);
  assert.equal(msgText(sent().filter((x) => x.path === 'me/messages')[0]), T.textsFor('towers').followFirst.text);
  delete process.env.IG_GATE_FOR;
  assert.deepEqual(await (await get(leadsPage, '/api/leads?key=k&action=gatefor&value=')).json(), { ok: true, gateFor: [] });
  // off the list: g1 is like anyone, direct
  assert.deepEqual(await say('gd2', 'g1', 'Build', 'buildreel'), ['sent']);
  assert.equal(urlButton(forComment(sent(), 'gd2')[0]).url, 'https://www.omnyalab.com/the-build-blueprint?ig=DfBUILDnew1');
  assert.deepEqual(await say('gd3', 'g1', 'Build', 'buildreel'), ['already']);
  assert.deepEqual(await tap('g9', 'GET:towers:DfTOWERS11', 'Get the Blueprint'), ['get']);
  assert.equal(linkOf(sent().filter((x) => x.path === 'me/messages')[0]), `${TOWERS_PAGE}?ig=DfTOWERS11`); // direct: the link at once
});

// ===================== 10/11/2026, evening: every comment, the refused public reply, the media list =====================

const S = await import('../api/_lib/ig-store.js');
const health = async () => (await get(hook, '/api/instagram?health=k')).json();
const numbers = async () => (await get(leadsPage, '/api/leads?key=k&format=json')).json();
const posts_ = (list) => list.filter((x) => x.method === 'POST');
// a comment as Meta sends it, with whatever else the test wants in it (parent_id, another sender)
const raw = (id, value) => post({ changes: [{ field: 'comments', value: { id, media: { id: 'towersreel', media_product_type: 'REELS' }, ...value } }] });

await step('every comment under a post of the map gets the public reply and the DM with the link of that reel, whatever it says', async () => {
  ahead += 2 * 3_600_000; // a clean hour
  await flushDue();
  assert.equal(await ig.getMode(), 'direct');
  assert.equal((await health()).anyComment, true); // on when nothing was ever set
  assert.equal((await numbers()).anyComment, true);
  assert.match(await (await get(leadsPage, '/api/leads?key=k')).text(), /risponde a ogni commento/);
  const tw = T.textsFor('towers');
  // no word at all: words, a question, emoji only
  let i = 1;
  for (const words of ['so beautiful', 'how did you make this??', '🔥🔥🔥', 'price?']) {
    const c = comment(`a${i++}`, words, 'towersreel');
    assert.deepEqual(await c.res, ['sent'], words);
    const s = forComment(sent(), c.id);
    assert.equal(s.length, 2, words); // one DM, one public reply
    assert.equal(s[0].body.recipient.comment_id, c.id);
    assert.ok(isDirect(tw, msgText(s[0])), msgText(s[0]));
    assert.equal(urlButton(s[0]).url, `${TOWERS_PAGE}?ig=DfTOWERS11`);
    assert.equal(s[1].path, `${c.id}/replies`);
    assert.ok(tw.publicReplies.includes(s[1].query.message));
  }
  assert.equal((await lead('a1')).stage, 'asked');
  assert.equal((await lead('a1')).kind, 'towers');
  // a reel pinned by its code, and City with a caption that asks for nothing: their own links
  let c = comment('a5', 'insane', 'red');
  assert.deepEqual(await c.res, ['sent']);
  assert.equal(urlButton(forComment(sent(), c.id)[0]).url, 'https://omnyalab.com/the-tower-blueprint?ig=DfSXvGDtt4s');
  c = comment('a6', 'where is this?', 'city1');
  assert.deepEqual(await c.res, ['sent']);
  assert.match(urlButton(forComment(sent(), c.id)[0]).url, /^https:\/\/www\.omnyalab\.com\/city\?k=[\w-]+&ig=DfXg47dtoyz$/);
  // someone else answering under another person's comment (a reply, with parent_id) is a comment like the others
  state.commentUser.aR1 = 'a7';
  assert.deepEqual(await raw('aR1', { text: '@name_a1 agree!', parent_id: 'c1', from: { id: 'a7', username: 'name_a7' } }), ['sent']);
  assert.equal(forComment(sent(), 'aR1').length, 2);
  // the same person again, under the same reel: nothing, whatever they write (also under our reply)
  assert.deepEqual(await comment('a1', 'thanks!', 'towersreel').res, ['already']);
  assert.deepEqual(await raw('aR2', { text: 'got it 🙏', parent_id: 'r1', from: { id: 'a2', username: 'name_a2' } }), ['already']);
  assert.deepEqual(await comment('a1', 'TOWERS', 'towersreel').res, ['already']);
  assert.equal(posts_(sent()).length, 0);
  // a post that is not in the map: without the word nothing, with the word as always
  assert.deepEqual(await comment('a8', 'so beautiful').res, ['no word']); // its caption says Comment "PROJECT"
  assert.deepEqual(await comment('a8', '🔥', 'client').res, ['no word']); // a client teaser: asks for nothing
  assert.equal(posts_(sent()).length, 0);
  c = comment('a8', 'project');
  assert.deepEqual(await c.res, ['sent']);
  assert.equal(urlButton(forComment(sent(), c.id)[0]).url, 'https://omnyalab.com/the-blueprint?ig=abc');
});

await step('our own comments and our own replies under the reels are never answered, by the account id and by its name', async () => {
  sent();
  // the public reply the bot just wrote comes back from Meta as a comment of ours
  assert.deepEqual(await raw('own1', { text: T.publicReplies[0], parent_id: 'c1', from: { id: OWN, username: 'omnyalab' } }), ['skip']);
  assert.deepEqual(await raw('own2', { text: 'New reel tomorrow 👀', from: { id: OWN, username: 'omnyalab' } }), ['skip']);
  // the same account seen with another id (Instagram has more than one id for an account): the name is enough
  assert.deepEqual(await raw('own3', { text: 'Sent 🙌🏻 check your DMs', parent_id: 'c1', from: { id: '17841400000000000', username: 'OmnyaLab' } }), ['skip']);
  assert.deepEqual(await raw('own4', { text: 'no sender' }), ['skip']);
  assert.equal(sent().length, 0); // not one call to Instagram, not even for the caption
  assert.equal((await ig.lineState()).waiting, 0);
  assert.equal(await lead(OWN), undefined);
});

await step('"every comment" switched off from /api/leads, without a deploy: back to the word only; on again and every comment counts', async () => {
  assert.equal((await get(leadsPage, '/api/leads?key=wrong&action=any&value=off')).status, 404);
  const no = await get(leadsPage, '/api/leads?key=k&action=any&value=maybe');
  assert.equal(no.status, 400);
  assert.equal((await no.json()).anyComment, true); // a wrong value changes nothing
  assert.deepEqual(await (await get(leadsPage, '/api/leads?key=k&action=any&value=off')).json(), { ok: true, anyComment: false });
  assert.equal((await health()).anyComment, false);
  assert.equal((await numbers()).anyComment, false);
  assert.match(await (await get(leadsPage, '/api/leads?key=k')).text(), /solo a chi scrive la parola/);
  assert.equal(await ig.getMode(), 'direct'); // the mode is another switch
  sent();
  // the TOWERS reel (in the map by the word of its caption): only the word, typos forgiven
  assert.deepEqual(await comment('a20', 'so beautiful', 'towersreel').res, ['no word']);
  assert.equal(posts_(sent()).length, 0);
  let c = comment('a20', 'Towers 🔥', 'towersreel'); // the comment without the word didn't use up their turn
  assert.deepEqual(await c.res, ['sent']);
  assert.equal(urlButton(forComment(sent(), c.id)[0]).url, `${TOWERS_PAGE}?ig=DfTOWERS11`);
  // a reel pinned by its code: the word its caption asks for
  assert.deepEqual(await comment('a21', 'insane', 'red').res, ['no word']);
  assert.deepEqual(await comment('a21', 'AI', 'red').res, ['sent']);
  // pinned, and its caption asks for nothing: the word of its page (HOUSE for City, TOWERS for a reel added by hand)
  assert.deepEqual(await comment('a22', '😍', 'city1').res, ['no word']);
  assert.deepEqual(await comment('a22', 'house', 'city1').res, ['sent']);
  assert.deepEqual(await comment('a23', 'yes please', 'newreel').res, ['no word']);
  assert.deepEqual(await comment('a23', 'towers', 'newreel').res, ['sent']);
  // posts outside the map are as before, on or off
  assert.deepEqual(await comment('a24', 'wow').res, ['no word']);
  assert.deepEqual(await comment('a24', 'project').res, ['sent']);
  assert.deepEqual(await comment('a24', 'AI', 'client').res, ['no word']);
  sent();
  // on again
  assert.deepEqual(await (await get(leadsPage, '/api/leads?key=k&action=any&value=on')).json(), { ok: true, anyComment: true });
  assert.equal((await health()).anyComment, true);
  assert.equal((await numbers()).anyComment, true);
  c = comment('a25', 'so beautiful', 'towersreel');
  assert.deepEqual(await c.res, ['sent']);
  assert.equal(forComment(sent(), c.id).length, 2);
});

await step('Instagram refuses the public reply (code 20 sub 1772107): the DM went out all the same, nothing stops, the error is readable', async () => {
  ahead += 2 * 3_600_000;
  await flushDue();
  assert.equal(ig.replyRefused({ code: 20, sub: 1772107 }), true);
  assert.equal(ig.replyRefused({ code: 100, message: 'instagram POST x/replies: (#100) Unsupported request' }), false);
  assert.equal(ig.replyRefused({ code: 190, message: 'Error validating access token' }), false);
  // exactly what Meta answered on 10/11 at 09:56
  state.failReply = { message: 'This API call does not support the requested response format', type: 'OAuthException', code: 20, error_subcode: 1772107, is_transient: false, error_user_title: 'Instagram Comment Not Added', error_user_msg: 'Your Instagram comment was not added' };
  const before = await errorsNow();
  const newest = async () => (await ig.errorState(3)).last.map((e) => e.msg); // two errors can fall in the same millisecond
  const cs = [];
  const lines = [];
  const realErr = console.error;
  console.error = (...a) => { lines.push(a.join(' ')); };
  try {
    // more in a row than the five failed DMs that stop the line: a refused public reply never counts for that
    for (let i = 1; i <= 7; i++) {
      cs.push(comment(`q${i}`, i % 2 ? 'love it' : 'TOWERS', 'towersreel'));
      assert.deepEqual(await cs.at(-1).res, ['sent'], `q${i}`);
    }
  } finally {
    console.error = realErr;
  }
  let s = sent();
  for (const c of cs) {
    const d = dmsFor(s, c.id);
    assert.equal(d.length, 1, c.id); // the DM, once
    assert.equal(urlButton(d[0]).url, `${TOWERS_PAGE}?ig=DfTOWERS11`);
    assert.equal(s.filter((x) => x.path === `${c.id}/replies`).length, 1, c.id); // tried once, not again (Meta says it is not transient)
    assert.ok(idx(s, (x) => x === d[0]) < idx(s, (x) => x.path === `${c.id}/replies`), 'the DM goes first');
  }
  const line = await ig.lineState();
  assert.equal(line.stoppedUntil, null); // no stop
  assert.equal(line.waiting, 0); // nobody back in line
  assert.equal(line.sentLastHour, 7);
  assert.equal(await errorsNow(), before + 7); // each one counted
  const last = (await ig.errorState(1)).last[0];
  assert.equal(last.where, 'public reply');
  assert.match(last.msg, /^Instagram did not add our public reply \[code 20 sub 1772107\], the DM went out all the same: /);
  assert.ok(lines.some((l) => l.startsWith(`[ig] ERROR public reply comment ${cs[0].id} @name_q1: Instagram did not add our public reply [code 20 sub 1772107]`)), lines.join('\n'));
  assert.equal((await lead('q1')).stage, 'asked'); // they have the link
  assert.match(await (await get(leadsPage, '/api/leads?key=k')).text(), /Instagram did not add our public reply \[code 20 sub 1772107\]/);
  // the next minute's tick finds nothing to do again: no second DM, no second try of the reply
  assert.equal((await (await tickPage.GET()).json()).sent, 0);
  assert.deepEqual(await say(cs[0].id, 'q1', 'love it', 'towersreel'), ['dup']);
  assert.deepEqual(await comment('q1', 'did you send it?', 'towersreel').res, ['already']);
  assert.equal(posts_(sent()).length, 0);
  // someone who can't get DMs, and the reply under their comment is refused too: said, counted, and the line goes on
  const c8 = comment('q8', 'me too', 'towersreel');
  state.refuseDm.add(c8.id);
  assert.deepEqual(await c8.res, ['nodm']);
  assert.ok((await newest()).some((m) => /\[code 20 sub 1772107\], and the DM could not go either/.test(m)));
  assert.equal((await ig.lineState()).stoppedUntil, null);
  // any other error of a public reply keeps Meta's own words, and doesn't stop anything either
  state.failReply = { message: '(#10) Application does not have permission for this action', type: 'OAuthException', code: 10 };
  assert.deepEqual(await comment('q9', 'wow', 'towersreel').res, ['sent']);
  assert.ok((await newest()).some((m) => /replies: \(#10\) Application does not have permission/.test(m)));
  state.failReply = null;
  sent();
  // Instagram takes the replies again: the next comment has both
  const c10 = comment('q10', 'wow', 'towersreel');
  assert.deepEqual(await c10.res, ['sent']);
  assert.equal(forComment(sent(), c10.id).length, 2);
});

await step('/api/leads?action=media: the last posts and reels of the account, asked to Meta at most once every 10 minutes', async () => {
  state.media = [
    { id: '18001', shortcode: 'DfTOWERS11', caption: 'HOW TO LET THE BUYER CHOOSE THE VIEW 👇🏻\n\nLike and comment "TOWERS"', permalink: 'https://www.instagram.com/reel/DfTOWERS11/', thumbnail_url: 'https://cdn.example/towers.jpg', media_url: 'https://cdn.example/towers.mp4', media_type: 'VIDEO', timestamp: '2026-11-11T17:00:00+0000' },
    { id: '18002', permalink: 'https://www.instagram.com/p/DfPHOTO0001/', media_url: 'https://cdn.example/photo.jpg', media_type: 'IMAGE', timestamp: '2026-11-09T11:00:00+0000' }, // a photo without a caption
    { id: 18003, shortcode: 'DfCAROUSEL1', caption: '5 houses', permalink: 'https://www.instagram.com/p/DfCAROUSEL1/', media_type: 'CAROUSEL_ALBUM', timestamp: '2026-11-08T11:00:00+0000' },
  ];
  sent();
  assert.equal((await get(leadsPage, '/api/leads?action=media')).status, 404); // the same key as the rest
  assert.equal((await get(leadsPage, '/api/leads?key=wrong&action=media')).status, 404);
  const r = await get(leadsPage, '/api/leads?key=k&action=media');
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /application\/json/);
  const j = await r.json();
  assert.deepEqual(Object.keys(j), ['media']);
  assert.equal(j.media.length, 3);
  for (const m of j.media) assert.deepEqual(Object.keys(m), ['id', 'shortcode', 'caption', 'permalink', 'thumbnail_url', 'media_type', 'timestamp']);
  assert.deepEqual(j.media[0], { id: '18001', shortcode: 'DfTOWERS11', caption: state.media[0].caption, permalink: 'https://www.instagram.com/reel/DfTOWERS11/', thumbnail_url: 'https://cdn.example/towers.jpg', media_type: 'VIDEO', timestamp: '2026-11-11T17:00:00+0000' });
  assert.deepEqual(j.media[1], { id: '18002', shortcode: 'DfPHOTO0001', caption: '', permalink: 'https://www.instagram.com/p/DfPHOTO0001/', thumbnail_url: 'https://cdn.example/photo.jpg', media_type: 'IMAGE', timestamp: '2026-11-09T11:00:00+0000' });
  assert.deepEqual(j.media[2], { id: '18003', shortcode: 'DfCAROUSEL1', caption: '5 houses', permalink: 'https://www.instagram.com/p/DfCAROUSEL1/', thumbnail_url: '', media_type: 'CAROUSEL_ALBUM', timestamp: '2026-11-08T11:00:00+0000' });
  // one call, to the account the bot already uses, with its token
  let asked = sent().filter((x) => x.path === `${OWN}/media`);
  assert.equal(asked.length, 1);
  assert.equal(asked[0].method, 'GET');
  assert.equal(asked[0].query.limit, '30');
  assert.ok(asked[0].query.fields.startsWith('id,shortcode,caption,permalink,thumbnail_url,media_type,timestamp'));
  assert.equal(asked[0].query.access_token, 'pagetoken');
  // opened again within 10 minutes: Meta is not asked
  state.media = state.media.slice(0, 2);
  assert.equal((await (await get(leadsPage, '/api/leads?key=k&action=media')).json()).media.length, 3);
  assert.equal(sent().filter((x) => x.path === `${OWN}/media`).length, 0);
  // after 10 minutes it is, and &fresh=1 asks at once
  ahead += 11 * 60_000;
  assert.equal((await (await get(leadsPage, '/api/leads?key=k&action=media')).json()).media.length, 2);
  state.media = state.media.slice(0, 1);
  assert.equal((await (await get(leadsPage, '/api/leads?key=k&action=media&fresh=1')).json()).media.length, 1);
  assert.equal(sent().filter((x) => x.path === `${OWN}/media`).length, 2);
});

await step('/api/leads?action=media when Meta refuses: { media: [], error }, a 200, and the bot goes on as if nothing happened', async () => {
  const before = await errorsNow();
  state.mediaFail = { message: '(#10) Application does not have permission for this action', type: 'OAuthException', code: 10 };
  // with a list from before: that list, marked stale, and the error
  let r = await get(leadsPage, '/api/leads?key=k&action=media&fresh=1');
  assert.equal(r.status, 200);
  let j = await r.json();
  assert.match(j.error, /\(#10\) Application does not have permission/);
  assert.equal(j.stale, true);
  assert.equal(j.media.length, 1);
  // with nothing kept: an empty list and the error
  await S.kv.del('media');
  r = await get(leadsPage, '/api/leads?key=k&action=media');
  assert.equal(r.status, 200);
  j = await r.json();
  assert.deepEqual(Object.keys(j), ['media', 'error']);
  assert.deepEqual(j.media, []);
  assert.match(j.error, /\(#10\) Application does not have permission/);
  assert.doesNotMatch(JSON.stringify(j), /pagetoken|access_token/); // no keys in the answer
  // a dead token, Meta not answering in JSON: the same shape, never a crash
  state.tokenDead = true;
  j = await (await get(leadsPage, '/api/leads?key=k&action=media')).json();
  state.tokenDead = false;
  assert.deepEqual(j.media, []);
  assert.match(j.error, /access token/);
  // the bot's own errors and line are untouched, and a comment is answered as always
  assert.equal(await errorsNow(), before);
  assert.equal((await ig.lineState()).stoppedUntil, null);
  sent();
  const c = comment('a40', 'wow', 'towersreel');
  assert.deepEqual(await c.res, ['sent']);
  assert.equal(forComment(sent(), c.id).length, 2);
  // Meta is back: the list too
  state.mediaFail = null;
  j = await (await get(leadsPage, '/api/leads?key=k&action=media')).json();
  assert.equal(j.media.length, 1);
  assert.equal(j.error, undefined);
});

// ---------- 10/11/2026: many wordings in turn, the follow asked but not required, "comment your city" ----------

const Places = await import('../api/_lib/ig-places.js');
const EMOJI = /\p{Extended_Pictographic}/gu;
const quietly = async (fn) => { const log = console.log; console.log = () => {}; try { return await fn(); } finally { console.log = log; } };
/** n comments under a reel, one person each, in order: their public replies and their DMs. */
const wave = async (prefix, n, media, words = () => 'TOWERS') => {
  const out = [];
  await quietly(async () => {
    for (let i = 0; i < n; i++) {
      const c = comment(`${prefix}${i}`, words(i), media);
      assert.deepEqual(await c.res, ['sent'], `${prefix}${i}`);
      const s = forComment(sent(), c.id);
      assert.equal(s.length, 2); // one DM, one public reply, as always
      out.push({ dm: s[0], said: msgText(s[0]), reply: s[1].query.message });
    }
  });
  return out;
};
const noTwiceInARow = (list, what) => { for (let i = 1; i < list.length; i++) assert.notEqual(list[i], list[i - 1], `${what}: the same line twice in a row at ${i}: ${list[i]}`); };

await step('ten or more public replies and five DMs for every page: short, one emoji, the follow asked in every DM', async () => {
  for (const dest of ['blueprint', 'tower', 'floors', 'film', 'build', 'towers', 'city', 'fable']) {
    const t = T.textsFor(dest);
    assert.ok(t.publicReplies.length >= 10, `${dest}: ${t.publicReplies.length} public replies`);
    assert.equal(new Set(t.publicReplies).size, t.publicReplies.length, `${dest}: a public reply is there twice`);
    for (const line of t.publicReplies) {
      assert.match(line, /DMs?\b|inbox/, line); // every one says where it is
      assert.ok(line.length <= 60, line);
      assert.equal((line.match(EMOJI) || []).length, 1, line); // one emoji, no more
      assert.doesNotMatch(line, /\bAI\b|before it.?s built|free image|first image|isn.?t real|—/i, line);
      assert.doesNotMatch(line, /https?:|omnyalab\.com/, line); // never a link in public
    }
    assert.equal(t.direct.texts.length, 5, dest);
    assert.equal(new Set(t.direct.texts).size, 5, dest);
    assert.equal(t.direct.texts[0], t.direct.text);
    for (const w of t.direct.texts) {
      // the follow is written in every wording, and nothing in it makes it a condition
      assert.match(w, dest === 'city' ? /follow @omnyalab so you watch the city grow/ : /follow @omnyalab so you catch the next one/, w);
      assert.doesNotMatch(w, /first|before I|then I|once you|unless|comment DONE|tap Done/i, w);
      assert.ok(w.length < 640);
    }
  }
  // the six lines that were already there are still there
  for (const old of ['Sent 🙌🏻 check your DMs for The Blueprint', 'Just sent it, check your DMs 👀', 'Done! It’s in your DMs 🫶🏻', 'Check your DMs, The Blueprint is there 🙌🏻', 'Sent you a DM 👇🏻 enjoy The Blueprint', 'It’s in your inbox now 🙌🏻']) assert.ok(T.publicReplies.includes(old), old);
  for (const old of ['Sent it to your DMs 👀', 'Just sent you the link, check your DMs 👇🏻']) assert.ok(T.textsFor('film').publicReplies.includes(old), old);
  for (const old of ['Sent you a DM 🏠 your lot is waiting', 'Done! Check your DMs (or Requests) 🏠']) assert.ok(T.textsFor('city').publicReplies.includes(old), old);
});

await step('the lines are taken in turn: never the same twice in a row, every line used, whatever the count', () => {
  for (const n of [2, 3, 5, 7, 10, 12, 14]) {
    const lines = Array.from({ length: n }, (_, i) => `line ${i}`);
    for (const salt of ['p:towersreel', 'd:red', '']) {
      const got = Array.from({ length: n * 40 }, (_, turn) => ig.lineAt(lines, turn, salt));
      noTwiceInARow(got, `${n} lines`);
      for (let r = 0; r < 40; r++) assert.equal(new Set(got.slice(r * n, (r + 1) * n)).size, n, `${n} lines: round ${r} doesn't use every line once`);
    }
  }
  const twelve = T.textsFor('towers').publicReplies;
  // the order changes from round to round and from reel to reel
  const round = (r, salt) => Array.from({ length: 12 }, (_, i) => ig.lineAt(twelve, r * 12 + i, salt)).join('|');
  assert.notEqual(round(0, 'p:a'), round(1, 'p:a'));
  assert.notEqual(round(0, 'p:a'), round(0, 'p:b'));
  // one line alone is that line, and a broken count still falls on a line
  assert.equal(ig.lineAt(['only'], 7), 'only');
  for (const bad of [NaN, -3, undefined, 2.7, 1e9, Infinity]) assert.ok(twelve.includes(ig.lineAt(twelve, bad, 'x')), String(bad));
});

await step('under the same reel: 40 comments, no public reply and no DM twice in a row, all twelve replies and all five DMs used', async () => {
  ahead += 2 * 3_600_000;
  await flushDue();
  await get(leadsPage, '/api/leads?key=k&action=mode&value=direct');
  const tw = T.textsFor('towers');
  const got = await wave('rot', 40, 'lazyreel');
  const replies = got.map((g) => g.reply);
  const dms = got.map((g) => g.said);
  noTwiceInARow(replies, 'public reply');
  noTwiceInARow(dms, 'DM');
  for (const r of replies) assert.ok(tw.publicReplies.includes(r), r);
  assert.equal(new Set(replies).size, 12); // every wording came out
  assert.equal(new Set(dms).size, 5);
  for (const g of got) {
    assert.ok(isDirect(tw, g.said));
    assert.deepEqual(g.dm.body.message.attachment.payload.buttons, [{ type: 'web_url', title: 'Get the Blueprint', url: 'https://www.omnyalab.com/the-towers-blueprint?ig=DfTOWERS22' }]); // the same button under every wording
  }
  // each reel keeps its own turn: another reel, and City with its own lines
  const red = await wave('rotred', 14, 'red', () => 'AI');
  noTwiceInARow(red.map((g) => g.reply), 'public reply, red tower');
  for (const g of red) assert.ok(T.textsFor('tower').publicReplies.includes(g.reply) && isDirect(T.textsFor('tower'), g.said));
  const ct = T.textsFor('city');
  const houses = await wave('rothouse', 12, 'cityreel', () => 'HOUSE');
  noTwiceInARow(houses.map((g) => g.reply), 'public reply, City');
  noTwiceInARow(houses.map((g) => g.said), 'DM, City');
  for (const g of houses) {
    assert.ok(ct.publicReplies.includes(g.reply) && isDirect(ct, g.said));
    assert.equal(urlButton(g.dm).title, 'Get my house');
  }
});

await step('the turn of the lines can never stop a comment: Redis not counting, and a DM tried again says the same words', async () => {
  ahead += 2 * 3_600_000;
  const tw = T.textsFor('towers');
  // Redis can't count the turns: the DM and the public reply go out all the same, with a line at random
  const incr = S.kv.incr;
  S.kv.incr = async (k, ttl) => { if (String(k).startsWith('rot:')) throw new Error('redis is down'); return incr(k, ttl); };
  const errs = await errorsNow();
  let c;
  const warn = console.warn;
  const warned = [];
  console.warn = (...a) => warned.push(a.join(' '));
  try {
    c = comment('rz1', 'TOWERS', 'towersreel');
    assert.deepEqual(await c.res, ['sent']);
  } finally {
    S.kv.incr = incr;
    console.warn = warn;
  }
  let s = forComment(sent(), c.id);
  assert.equal(s.length, 2);
  assert.ok(isDirect(tw, msgText(s[0])) && tw.publicReplies.includes(s[1].query.message));
  assert.equal(urlButton(s[0]).url, `${TOWERS_PAGE}?ig=DfTOWERS11`);
  assert.equal(warned.filter((w) => /turn of the lines/.test(w)).length, 2); // said in the logs, once for the DM and once for the reply
  assert.equal(await errorsNow(), errs); // and it is not an error of the bot
  assert.equal((await ig.lineState()).stoppedUntil, null);
  // Meta fails the DM, the comment goes back in line: the second try says the same words as the first
  state.failPrivate = { message: '(#100) Unsupported request', type: 'OAuthException', code: 100 };
  c = comment('rz2', 'TOWERS', 'towersreel');
  assert.deepEqual(await c.res, ['retry']);
  state.failPrivate = null;
  const first = dmsFor(sent(), c.id).map(msgText);
  ahead += 3 * 60_000;
  await tickPage.GET();
  const second = dmsFor(sent(), c.id).map(msgText);
  assert.equal(second.length, 1);
  assert.ok(first.length >= 1 && first.every((w) => w.split('\n\n')[0] === second[0]), `${first.join(' / ')} → ${second[0]}`); // (the refused tries: the button, then the same words with the link in the text)
  await S.kv.del('fails');
  sent();
});

await step('the follow is asked in the DM and never checked: who doesn’t follow gets the link all the same; gate and comment are still there, off', async () => {
  ahead += 2 * 3_600_000;
  assert.equal(await ig.getMode(), 'direct');
  assert.deepEqual(ig.MODES, ['direct', 'gate', 'comment']); // the other two rounds stay in the code
  const tw = T.textsFor('towers');
  for (const follows of [false, true]) {
    const u = `nf${follows ? 1 : 0}`;
    state.follows[u] = follows;
    const c = comment(u, 'TOWERS', 'towersreel');
    assert.deepEqual(await c.res, ['sent']);
    const all = sent();
    const s = forComment(all, c.id);
    assert.equal(s.length, 2);
    assert.equal(urlButton(s[0]).url, `${TOWERS_PAGE}?ig=DfTOWERS11`); // the link is already there
    assert.match(msgText(s[0]), /follow @omnyalab so you catch the next one/);
    assert.ok(isDirect(tw, msgText(s[0])));
    // nothing about this person is asked to Instagram before the DM goes out
    assert.ok(all.findIndex((x) => x.path === u) > all.findIndex((x) => x.path === 'me/messages'));
    assert.equal((await lead(u)).stage, 'asked');
    // and commenting again changes nothing: no "almost there", no second DM
    assert.deepEqual(await comment(u, 'done', 'towersreel').res, ['already']);
    assert.equal(posts_(sent()).length, 0);
  }
});

await step('"comment your city": the list knows cities and countries in their common spellings, only when the whole short comment is one', () => {
  assert.ok(Places.PLACE_COUNT.cities >= 300 && Places.PLACE_COUNT.countries >= 190, JSON.stringify(Places.PLACE_COUNT));
  const yes = {
    Dubai: 'Dubai', 'dubai!!': 'Dubai', 'DUBAI 🔥🔥': 'Dubai', '  Dubai 🇦🇪 ': 'Dubai', '#dubai': 'Dubai', 'دبي': 'Dubai', 'Дубай': 'Dubai',
    'new york': 'New York', NYC: 'New York', 'New York City': 'New York', 'los angeles': 'Los Angeles', LA: 'LA', 'L.A.': 'LA',
    'são paulo': 'São Paulo', 'Sao Paulo 🇧🇷': 'São Paulo', milano: 'Milan', Milan: 'Milan', 'Köln': 'Cologne', koln: 'Cologne', 'İstanbul': 'Istanbul',
    Lagos: 'Lagos', 'Rio de Janeiro': 'Rio de Janeiro', 'Dar es Salaam': 'Dar es Salaam', 'Ho Chi Minh': 'Ho Chi Minh City', Tashkent: 'Tashkent',
    Italy: 'Italy', italia: 'Italy', 'ITALY!!!': 'Italy', UAE: 'UAE', 'United Arab Emirates': 'UAE', usa: 'USA', US: 'USA', 'saudi arabia': 'Saudi Arabia',
    'Côte d’Ivoire': 'Ivory Coast', "cote d'ivoire": 'Ivory Coast', Nigeria: 'Nigeria', 'Россия': 'Russia', Türkiye: 'Turkey',
    // a city with its country, both in the list: the city
    'Milan, Italy': 'Milan', 'Dubai UAE': 'Dubai', 'Lagos Nigeria 🇳🇬': 'Lagos', 'Paris, France': 'Paris',
  };
  for (const [said, place] of Object.entries(yes)) assert.equal(Places.placeIn(said), place, said);
  const no = [
    'I love Dubai', 'from Dubai', 'Dubai baby', 'Dubai is the best city in the world', 'Dubai 2026', 'dubai dubai dubai dubai', // not the whole comment, or too long
    'la', 'us', 'ny', // small letters: everyday words
    'nice', 'Nice', 'casa', 'wow', 'TOWERS', 'towers', 'build', 'house', 'AI', '🔥🔥🔥', '', '   ', '@dubai', 'hey @paris', // words, the keywords, emoji, mentions
    'ho chi minh city', // four words: past the limit, the normal reply
    'Atlantis', 'Gotham', 'Dubaii', 'constructor', '__proto__', 'toString', 'x'.repeat(200),
  ];
  for (const said of no) assert.equal(Places.placeIn(said), null, said);
  assert.equal(Places.placeIn(null), null);
  assert.equal(Places.placeIn(undefined), null);
  // what comes out is always a name of the list as we spell it, never the comment
  assert.equal(Places.placeIn('dUbAi'), 'Dubai');
  assert.equal(Places.placeIn('SÃO PAULO'), 'São Paulo');
  // the lines that say the place back: six or more, short, one emoji, all of them say where it is
  assert.ok(T.placeReplies.length >= 6);
  const lines = T.placeReplies.map((say) => say('Dubai'));
  assert.equal(new Set(lines).size, lines.length);
  for (const line of lines) {
    assert.match(line, /Dubai/);
    assert.match(line, /DMs?\b|inbox/);
    assert.equal((line.match(EMOJI) || []).length, 1, line);
    assert.ok(line.length <= 60, line);
  }
  assert.equal(lines[0], 'Dubai, nice 🙌🏻 check your DMs');
});

await step('"comment your city": a city or a country in the comment → the public reply says it back, the DM is the one of always; never a word of the comment that is not in the list', async () => {
  ahead += 2 * 3_600_000;
  await flushDue();
  const tw = T.textsFor('towers');
  const placeLines = (place) => T.placeReplies.map((say) => say(place));
  let i = 0;
  const one = async (words, media = 'towersreel') => {
    const u = `pl${i++}`;
    const c = comment(u, words, media);
    assert.deepEqual(await quietly(() => c.res), ['sent'], words);
    const s = forComment(sent(), c.id);
    assert.equal(s.length, 2, words);
    return { u, said: msgText(s[0]), dm: s[0], reply: s[1].query.message };
  };
  // a city, a country, other spellings, capitals and emoji: the name comes back as the list spells it
  for (const [words, place] of [['dubai!!', 'Dubai'], ['ITALY 🇮🇹', 'Italy'], ['são paulo', 'São Paulo'], ['milano', 'Milan'], ['Lagos, Nigeria', 'Lagos'], ['NYC', 'New York']]) {
    const g = await one(words);
    assert.ok(placeLines(place).includes(g.reply), `${words} → ${g.reply}`);
    // the DM is the same as for the word: one of the five wordings, the button with the link of the reel
    assert.ok(isDirect(tw, g.said), g.said);
    assert.doesNotMatch(g.said, new RegExp(place, 'i'));
    assert.deepEqual(g.dm.body.message.attachment.payload.buttons, [{ type: 'web_url', title: 'Get the Blueprint', url: `${TOWERS_PAGE}?ig=DfTOWERS11` }]);
    const l = await lead(g.u);
    assert.deepEqual([l.stage, l.kind, l.place], ['asked', 'towers', place]); // kept with the lead, for Nico
  }
  // the word wins over everything, and it is never taken for a place
  for (const words of ['TOWERS', 'towers 🔥', 'Towerss']) {
    const g = await one(words);
    assert.ok(tw.publicReplies.includes(g.reply), `${words} → ${g.reply}`);
    assert.equal((await lead(g.u)).place, undefined);
  }
  // free text around a place, an unknown place, a long comment: the normal replies, and nothing of the comment comes back
  for (const words of ['I love Dubai so much', 'Dubai baby', 'from Dubai bro', 'Dubai is the best city ever, greetings from the Marina', 'Atlantis', 'Dubaii', 'visit mysite.xyz', 'Dubai <b>free</b> money', '@dubai']) {
    const g = await one(words);
    assert.ok(tw.publicReplies.includes(g.reply), `${words} → ${g.reply}`);
    assert.ok(isDirect(tw, g.said));
    for (const bit of ['Dubai', 'baby', 'bro', 'Marina', 'Atlantis', 'mysite', 'money', '<b>']) assert.ok(!g.reply.includes(bit) && !g.said.includes(bit), `${words}: "${bit}" came back`);
  }
  // the city replies take turns too: the same city ten times, never the same line twice in a row, every line used
  const many = [];
  for (let k = 0; k < 14; k++) many.push((await one('Dubai')).reply);
  noTwiceInARow(many, 'city reply');
  assert.equal(new Set(many).size, T.placeReplies.length);
  for (const r of many) assert.ok(placeLines('Dubai').includes(r), r);
  // every page: City (word HOUSE) and a reel pinned by its code say the place back too, with their own DM
  let g = await one('Miami', 'cityreel');
  assert.ok(placeLines('Miami').includes(g.reply), g.reply);
  assert.ok(isDirect(T.textsFor('city'), g.said));
  assert.equal(urlButton(g.dm).title, 'Get my house');
  g = await one('Abu Dhabi 🇦🇪', 'red');
  assert.ok(placeLines('Abu Dhabi').includes(g.reply), g.reply);
  assert.equal(urlButton(g.dm).url, 'https://omnyalab.com/the-tower-blueprint?ig=DfSXvGDtt4s');
});

await step('"comment your city" changes nothing where a comment gets no answer: posts outside the map, "every comment" off, one answer per person', async () => {
  ahead += 2 * 3_600_000;
  // a post that only answers its own word (not in the map), and a client teaser: a city is not the word
  assert.deepEqual(await comment('pm1', 'Dubai').res, ['no word']);
  assert.deepEqual(await comment('pm1', 'Dubai', 'client').res, ['no word']);
  // "every comment" off: only the word, a city gets nothing; the word after it still works, with the normal reply
  await get(leadsPage, '/api/leads?key=k&action=any&value=off');
  assert.deepEqual(await comment('pm2', 'Dubai', 'towersreel').res, ['no word']);
  assert.equal(posts_(sent()).length, 0);
  let c = comment('pm2', 'TOWERS', 'towersreel');
  assert.deepEqual(await c.res, ['sent']);
  assert.ok(T.textsFor('towers').publicReplies.includes(forComment(sent(), c.id)[1].query.message));
  await get(leadsPage, '/api/leads?key=k&action=any&value=on');
  // one answer per person per reel, city or not
  c = comment('pm3', 'Riyadh', 'towersreel');
  assert.deepEqual(await c.res, ['sent']);
  assert.match(forComment(sent(), c.id)[1].query.message, /Riyadh/);
  assert.deepEqual(await comment('pm3', 'Jeddah', 'towersreel').res, ['already']);
  assert.equal(posts_(sent()).length, 0);
  // the DM can't go (this person doesn't take messages): the public "send us a text", not the city line
  c = comment('pm4', 'Doha', 'towersreel');
  state.refuseDm.add(c.id);
  assert.deepEqual(await c.res, ['nodm']);
  const pub = sent().filter((x) => x.path === `${c.id}/replies`);
  assert.equal(pub.length, 1);
  assert.equal(pub[0].query.message, T.textsFor('towers').cantDm);
  // Instagram refuses the city reply (code 20): the DM went out, nothing stops
  state.failReply = { message: 'This API call does not support the requested response format', type: 'OAuthException', code: 20, error_subcode: 1772107 };
  c = comment('pm5', 'Cairo', 'towersreel');
  const res = await quietly(async () => { const e = console.error; console.error = () => {}; try { return await c.res; } finally { console.error = e; } });
  state.failReply = null;
  assert.deepEqual(res, ['sent']);
  assert.equal(dmsFor(sent(), c.id).length, 1);
  assert.equal((await ig.lineState()).stoppedUntil, null);
});

// ---------- 10/11/2026: words registered without a deploy, the FABLE page ----------

const FABLE_PAGE = 'https://www.omnyalab.com/fable';
const leadsJson = async (more = '') => (await get(leadsPage, `/api/leads?key=k${more}`)).json();
/** What went out for one comment: its DM and its public reply (a follow-up of an older test that comes due is not it). */
const own = (list, cid) => list.filter((x) => x.method === 'POST' && ((x.path === 'me/messages' && x.body.recipient.comment_id === cid) || x.path === `${cid}/replies`));

await step('a word registered from /api/leads?action=word, without a deploy: its reel goes to its page like TOWERS, the fixed words always win', async () => {
  ahead += 2 * 3_600_000;
  await quietly(flushDue); // the follow-ups of the tests above that come due with the clock
  sent();
  // before: a caption with a word nobody knows answers only that word, with the normal Blueprint
  assert.deepEqual(await comment('wd1', 'so good 🔥', 'villareel').res, ['no word']);
  // the key, a real word, a destination that exists, never a fixed word
  assert.equal((await get(leadsPage, '/api/leads?action=word&word=VILLA&dest=film')).status, 404);
  for (const bad of ['&word=&dest=film', '&dest=film', '&word=VILLA&dest=nope', '&word=VILLA&dest=legacy', '&word=two words&dest=film', '&word=THE&dest=film', '&word=x&dest=film', `&word=${'A'.repeat(25)}&dest=film`]) {
    const r = await get(leadsPage, `/api/leads?key=k&action=word${bad}`);
    assert.equal(r.status, 400, bad);
    const j = await r.json();
    assert.ok(j.error, bad);
    assert.match(j.dests, /blueprint, tower, floors, film, build, towers, city, fable/);
  }
  for (const fixed of ['TOWERS', 'towers', 'BUILD', 'HOUSE', 'FABLE']) {
    const r = await get(leadsPage, `/api/leads?key=k&action=word&word=${fixed}&dest=film`);
    assert.equal(r.status, 400, fixed);
    assert.match((await r.json()).error, /fixed word/);
  }
  assert.deepEqual((await leadsJson('&format=json')).map.words, P.WORDS); // nothing was registered
  assert.deepEqual(P.WORDS.map((w) => `${w.word}:${w.dest}`), ['TOWERS:towers', 'BUILD:build', 'HOUSE:city', 'FABLE:fable']);

  // registered: written small, kept in capitals
  const r = await leadsJson('&action=word&word=villa&dest=film');
  assert.deepEqual([r.ok, r.word, r.dest, r.words], [true, 'VILLA', 'film', { VILLA: 'film' }]);
  // in the json next to the fixed words, and in the health check
  const words = (await leadsJson('&format=json')).map.words;
  assert.deepEqual(words.slice(0, P.WORDS.length), P.WORDS);
  assert.deepEqual(words.slice(P.WORDS.length), [{ word: 'VILLA', dest: 'film', added: 'from /api/leads' }]);
  assert.deepEqual((await health()).map.words.at(-1), { word: 'VILLA', dest: 'film', added: 'from /api/leads' });
  assert.match(await (await get(leadsPage, '/api/leads?key=k')).text(), /VILLA → film \(registrata\)/);

  // the reel whose caption says Comment "VILLA" now answers ANY comment with its page, exactly as a TOWERS reel does
  const fm = T.textsFor('film');
  let c = comment('wd2', 'so good 🔥', 'villareel');
  assert.deepEqual(await c.res, ['sent']);
  let s = own(sent(), c.id);
  assert.equal(s.length, 2);
  assert.ok(isDirect(fm, msgText(s[0])));
  assert.deepEqual(urlButton(s[0]), { type: 'web_url', title: 'Get the Blueprint', url: 'https://www.omnyalab.com/3d-to-film?ig=DfVILLA0001' });
  assert.ok(fm.publicReplies.includes(s[1].query.message));
  assert.deepEqual([(await lead('wd2')).kind, (await lead('wd2')).post], ['film', 'DfVILLA0001']);
  // a city under it is said back, as under any post of the map; one answer per person
  c = comment('wd3', 'Dubai', 'villareel');
  assert.deepEqual(await c.res, ['sent']);
  assert.match(own(sent(), c.id)[1].query.message, /Dubai/);
  assert.deepEqual(await comment('wd3', 'villa', 'villareel').res, ['already']);
  // "every comment" off: the registered word is the word of its reel, typos forgiven
  await get(leadsPage, '/api/leads?key=k&action=any&value=off');
  assert.deepEqual(await comment('wd4', 'love it', 'villareel').res, ['no word']);
  assert.deepEqual(await comment('wd4', 'vila', 'villareel').res, ['sent']);
  await get(leadsPage, '/api/leads?key=k&action=any&value=on');
  sent();

  // the reels that were already linked answer as before: TOWERS by its word, the red tower by its code
  c = comment('wd5', 'TOWERS', 'towersreel');
  assert.deepEqual(await c.res, ['sent']);
  assert.equal(urlButton(own(sent(), c.id)[0]).url, `${TOWERS_PAGE}?ig=DfTOWERS11`);
  c = comment('wd5', 'AI', 'red');
  assert.deepEqual(await c.res, ['sent']);
  assert.equal(urlButton(own(sent(), c.id)[0]).url, 'https://omnyalab.com/the-tower-blueprint?ig=DfSXvGDtt4s');

  // the fixed words always win, the pinned posts too, and a word with a destination that doesn't exist is no word at all
  const more = { VILLA: 'film', TOWERS: 'film', BUILD: 'city', BAD: 'nope', OLD: 'legacy' };
  assert.equal(P.resolvePost({ code: 'new', words: ['TOWERS'] }, {}, more).dest, 'towers');
  assert.equal(P.resolvePost({ code: 'new', words: ['VILLA', 'BUILD'] }, {}, more).dest, 'build');
  assert.deepEqual(P.resolvePost({ code: 'new', words: ['VILLA'] }, {}, more), { dest: 'film', any: true, words: ['VILLA'] });
  assert.equal(P.resolvePost({ code: 'DfSXvGDtt4s', words: ['VILLA'] }, {}, more).dest, 'tower');
  assert.equal(P.resolvePost({ code: 'new', words: ['VILLA'] }, { new: 'towers' }, more).dest, 'towers');
  assert.deepEqual(P.resolvePost({ code: 'new', words: ['BAD'] }, {}, more), { dest: 'blueprint', any: false, words: ['BAD'] });
  assert.deepEqual(P.resolvePost({ code: 'new', words: ['OLD'], tower: true }, {}, more), { dest: 'tower', any: false, words: ['OLD'] });
  assert.deepEqual(P.resolvePost({ code: 'new', words: ['CONSTRUCTOR'] }, {}, {}), { dest: 'blueprint', any: false, words: ['CONSTRUCTOR'] });
  assert.deepEqual(P.resolvePost({ code: 'new', words: ['VILLA'] }), { dest: 'blueprint', any: false, words: ['VILLA'] }); // without the registered words: as before
  // even written by hand in Redis, a fixed word or a broken row never gets in
  await S.kv.set('words', { VILLA: 'film', TOWERS: 'film', 'two words': 'film', X: 'film', PIZZA: 'nope' });
  ahead += 31_000; // the words are read again every 30 seconds
  assert.deepEqual((await leadsJson('&format=json')).map.words.slice(P.WORDS.length), [{ word: 'VILLA', dest: 'film', added: 'from /api/leads' }]);
  c = comment('wd6', 'TOWERS', 'towersreel');
  assert.deepEqual(await c.res, ['sent']);
  assert.equal(urlButton(own(sent(), c.id)[0]).url, `${TOWERS_PAGE}?ig=DfTOWERS11`);

  // Redis doesn't answer for the words: nothing breaks, the fixed words go on (and the words read before are still there)
  const getKv = S.kv.get;
  const warn = console.warn;
  const warned = [];
  S.kv.get = async (k) => { if (k === 'words') throw new Error('redis is down'); return getKv(k); };
  console.warn = (...a) => warned.push(a.join(' '));
  try {
    ahead += 31_000;
    c = comment('wd7', 'nice', 'towersreel');
    assert.deepEqual(await c.res, ['sent']);
    assert.equal(urlButton(own(sent(), c.id)[0]).url, `${TOWERS_PAGE}?ig=DfTOWERS11`);
    c = comment('wd7', 'house', 'cityreel');
    assert.deepEqual(await c.res, ['sent']);
    c = comment('wd7', 'nice', 'villareel');
    assert.deepEqual(await c.res, ['sent']);
    assert.equal(urlButton(own(sent(), c.id)[0]).url, 'https://www.omnyalab.com/3d-to-film?ig=DfVILLA0001');
    assert.ok(warned.some((w) => /registered words were not read/.test(w)));
    // the page and the json still open
    assert.equal((await get(leadsPage, '/api/leads?key=k')).status, 200);
    assert.deepEqual((await leadsJson('&format=json')).map.words.slice(0, P.WORDS.length), P.WORDS);
    // and saving a word while Redis is down says so, without a crash
    const down = await get(leadsPage, '/api/leads?key=k&action=word&word=PIZZA&dest=film');
    assert.equal(down.status, 502);
    assert.match((await down.json()).error, /not saved/);
  } finally {
    S.kv.get = getKv;
    console.warn = warn;
  }

  // taken out with an empty dest: the reel goes back to its own word only
  ahead += 31_000;
  const out = await leadsJson('&action=word&word=VILLA&dest=');
  assert.deepEqual([out.ok, out.word, out.dest, out.words], [true, 'VILLA', null, {}]);
  assert.deepEqual((await leadsJson('&format=json')).map.words, P.WORDS);
  assert.deepEqual(await comment('wd8', 'so good 🔥', 'villareel').res, ['no word']);
  // with nothing registered and Redis down: only the fixed words, and the Towers reel answers
  S.kv.get = async (k) => { if (k === 'words') throw new Error('redis is down'); return getKv(k); };
  console.warn = () => {};
  try {
    ahead += 31_000;
    assert.deepEqual(await ig.extraWords(), {});
    c = comment('wd9', 'TOWERS', 'towersreel');
    assert.deepEqual(await c.res, ['sent']);
    assert.equal(urlButton(own(sent(), c.id)[0]).url, `${TOWERS_PAGE}?ig=DfTOWERS11`);
  } finally {
    S.kv.get = getKv;
    console.warn = warn;
  }
  ahead += 31_000;
  sent();
});

await step('FABLE: the reel that says "Comment FABLE to get the link" goes to /fable, the bot talks about the link and the click is counted', async () => {
  ahead += 2 * 3_600_000;
  await quietly(flushDue); // the follow-ups of the tests above that come due with the clock
  const fb = T.textsFor('fable');
  assert.ok(T.KINDS.includes('fable') && P.isDest('fable'));
  assert.equal(fb.url, FABLE_PAGE);
  assert.deepEqual(P.resolvePost({ code: 'new', words: ['FABLE'] }), { dest: 'fable', any: true, words: ['FABLE'] });
  assert.deepEqual(ig.captionWords(posts.fablereel.caption), ['FABLE']);
  // the words: the link, never the blueprint; the same numbers as the other pages (twelve and five), the button "Get the link"
  assert.equal(fb.publicReplies.length, 12);
  assert.equal(fb.direct.texts.length, 5);
  assert.equal(fb.direct.button, 'Get the link');
  assert.equal(fb.opener.button, 'Get the link');
  assert.equal(fb.publicReplies[0], 'sent 🙌🏻 the link is in your DMs');
  assert.equal(fb.direct.texts[0], 'Hey 🙌🏻 here’s the link 👇🏻 follow @omnyalab so you catch the next one, we drop a new build every week');
  for (const line of [...fb.publicReplies, ...fb.direct.texts, fb.cantDm, fb.opener.text, fb.nudgeFollow.text, fb.nudgeQuestion, fb.followFirst.text, ...Object.values(fb.comment).flat()]) assert.doesNotMatch(line, /blueprint|\bAI\b|%|\bdays?\b/i, line);
  assert.ok(fb.publicReplies.filter((l) => /link/.test(l)).length >= 7);
  for (const w of fb.direct.texts) assert.match(w, /\blink\b/);
  // the other pages say what they said
  assert.equal(T.textsFor('towers').direct.button, 'Get the Blueprint');
  assert.equal(T.textsFor('towers').publicReplies[0], 'Sent 🙌🏻 check your DMs for The Towers Blueprint');

  // any comment under the reel: one DM with the button that opens /fable?ig=<code>, one public reply
  sent();
  let c = comment('fa1', '🔥🔥', 'fablereel');
  assert.deepEqual(await c.res, ['sent']);
  let s = own(sent(), c.id);
  assert.equal(s.length, 2);
  assert.ok(isDirect(fb, msgText(s[0])), msgText(s[0]));
  assert.deepEqual(urlButton(s[0]), { type: 'web_url', title: 'Get the link', url: `${FABLE_PAGE}?ig=DfFABLE0001` });
  assert.ok(fb.publicReplies.includes(s[1].query.message));
  const l = await lead('fa1');
  assert.deepEqual([l.stage, l.kind, l.post, l.direct], ['asked', 'fable', 'DfFABLE0001', true]);
  // in turn like the others: 14 comments, never the same line twice in a row, all twelve and all five used
  await quietly(flushDue);
  const got = [{ dm: s[0], said: msgText(s[0]), reply: s[1].query.message }, ...(await wave('fw', 14, 'fablereel', (i) => (i % 2 ? 'FABLE' : 'fable please')))];
  noTwiceInARow(got.map((g) => g.reply), 'fable public replies');
  noTwiceInARow(got.map((g) => g.said), 'fable DMs');
  assert.equal(new Set(got.map((g) => g.reply)).size, 12);
  assert.equal(new Set(got.map((g) => g.said)).size, 5);
  for (const g of got) assert.ok(fb.publicReplies.includes(g.reply) && fb.direct.texts.includes(g.said) && urlButton(g.dm).url === `${FABLE_PAGE}?ig=DfFABLE0001`);
  // Instagram refuses the button: the same words with the link written in
  state.refuseTemplate = true;
  c = comment('fa2', 'fable', 'fablereel');
  assert.deepEqual(await quietly(async () => { const w = console.warn; console.warn = () => {}; try { return await c.res; } finally { console.warn = w; } }), ['sent']);
  state.refuseTemplate = false;
  s = dmsFor(sent(), c.id);
  assert.match(msgText(s.at(-1)), /\n\nhttps:\/\/www\.omnyalab\.com\/fable\?ig=DfFABLE0001$/);
  await quietly(() => get(leadsPage, '/api/leads?key=k&action=mode&value=direct')); // setting the mode again makes the bot try the button again

  // the click: vercel.json sends /fable?ig=<code> to /api/instagram, which counts it and opens /fable?reel=<code>
  const { readFileSync } = await import('node:fs');
  const rule = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')).redirects[0];
  assert.match('/fable', new RegExp(`^${rule.source.replace(/:(\w+)\(([^)]+)\)/g, '(?:$2)')}$`));
  assert.equal(rule.destination, '/api/instagram?go=:page&p=:post');
  for (const page of ['the-blueprint', 'the-tower-blueprint', 'the-tower-floors', '3d-to-film', 'the-build-blueprint', 'the-towers-blueprint']) assert.ok(rule.source.includes(page), page); // the pages that were there are still there
  const r = await get(hook, '/api/instagram?go=fable&p=DfFABLE0001', { 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) Instagram 400.0' });
  assert.equal(r.status, 302);
  assert.equal(r.headers.get('location'), `${FABLE_PAGE}?reel=DfFABLE0001`);
  const row = (await ig.postStats()).find((x) => x.post === 'DfFABLE0001');
  assert.deepEqual([row.click, row.dest], [1, 'fable']);
  assert.ok(row.c >= 15 && row.link >= 15);
  // by hand too: &action=post&dest=fable
  assert.equal((await leadsJson('&action=post&code=DfNEWFABLE1&dest=fable')).added.DfNEWFABLE1, 'fable');
  await leadsJson('&action=post&code=DfNEWFABLE1');
});

server.close();
console.log(`\n${ok} prove passate`);
const { execFileSync } = await import('node:child_process');
execFileSync(process.execPath, [new URL(import.meta.url).pathname, '--only'], { stdio: 'inherit' });
execFileSync(process.execPath, [new URL(import.meta.url).pathname, '--redis'], { stdio: 'inherit' });
execFileSync(process.execPath, [new URL(import.meta.url).pathname, '--vercel'], { stdio: 'inherit' });
