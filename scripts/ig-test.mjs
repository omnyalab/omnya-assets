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
const state = { follows: {}, commentUser: {}, refuseTemplate: false, refuseDm: new Set(), failPrivate: null, failSend: null, captionDown: false };
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
    return out({ recipient_id: cid ? state.commentUser[cid] : j.recipient.id, message_id: `m${++mid}` });
  }
  if (path.endsWith('/replies')) return out({ id: `r${++mid}` });
  if (posts[path]) return state.captionDown ? out({ error: { message: 'An unexpected error has occurred. Please retry your request later.', code: 2 } }, 500) : out(posts[path]);
  if (path.startsWith('media')) return out({ caption: 'From rough 3D to final photo ✨ Comment “PROJECT” below and I’ll send you The Blueprint', permalink: 'https://www.instagram.com/reel/abc/' });
  if (/^[a-z]\d+$/.test(path)) return out({ username: `name_${path}`, is_user_follow_business: !!state.follows[path] });
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
    assert.deepEqual([row.c, row.dm, row.link, row.click, row.dest], [1, 1, 1, 2, 'towers']);
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

  server.close();
  console.log(`\n${ok} prove su Redis passate`);
  process.exit(0);
}

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
    assert.doesNotMatch(all, /\bAI\b|before it.?s built|isn.?t real|\.pdf/i, k);
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
    assert.equal(r.headers.get('location'), TOWERS_PAGE); // the page without ?ig=, so it doesn't come back here
  }
  // the preview Instagram makes of the link is not a click
  await get(hook, '/api/instagram?go=the-towers-blueprint&p=DfTOWERS11', { 'user-agent': 'facebookexternalhit/1.1' });
  const row = (await ig.postStats()).find((r) => r.post === 'DfTOWERS11');
  assert.equal(row.click, before + 3);
  assert.equal(row.dest, 'towers');
  assert.ok(row.c >= 1 && row.dm >= 1 && row.link >= 1);
  // only our own pages come out of it
  assert.equal((await get(hook, '/api/instagram?go=https://evil.example&p=x')).headers.get('location'), 'https://www.omnyalab.com/');
  assert.equal((await get(hook, '/api/instagram?go=3d-to-film&p=DfU-nniRvNQ')).headers.get('location'), 'https://www.omnyalab.com/3d-to-film');
  assert.equal((await get(hook, '/api/instagram?go=the-tower-blueprint&p=manychat')).headers.get('location'), 'https://www.omnyalab.com/the-tower-blueprint');
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
  // the every-minute cron is added on the Pro plan only (docs/INSTAGRAM-BOT.md): when it is there, it must call the tick
  for (const c of v.crons || []) assert.equal(c.path, '/api/igtick');
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

server.close();
console.log(`\n${ok} prove passate`);
const { execFileSync } = await import('node:child_process');
execFileSync(process.execPath, [new URL(import.meta.url).pathname, '--only'], { stdio: 'inherit' });
execFileSync(process.execPath, [new URL(import.meta.url).pathname, '--redis'], { stdio: 'inherit' });
execFileSync(process.execPath, [new URL(import.meta.url).pathname, '--vercel'], { stdio: 'inherit' });
