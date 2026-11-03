// Tries the Instagram bot end to end against a fake Instagram, without Redis and without sending
// anything: node scripts/ig-test.mjs
import http from 'node:http';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

for (const k of ['KV_REST_API_URL', 'UPSTASH_REDIS_REST_URL', 'RESEND_API_KEY', 'VERCEL']) delete process.env[k];

// ---- fake graph.instagram.com ----
const calls = [];
const state = { follows: {}, commentUser: {}, refuseTemplate: false, refuseDm: new Set() };
let mid = 0;
const server = http.createServer(async (req, res) => {
  let body = '';
  for await (const c of req) body += c;
  const url = new URL(req.url, 'http://x');
  const path = url.pathname.replace(/^\/v[\d.]+\//, '');
  const j = body ? JSON.parse(body) : null;
  calls.push({ method: req.method, path, query: Object.fromEntries(url.searchParams), body: j });
  const out = (o, s = 200) => { res.writeHead(s, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (path === 'me/messages') {
    if (state.refuseTemplate && j.message.attachment) return out({ error: { message: 'template not allowed' } }, 400);
    const cid = j.recipient.comment_id;
    if (cid && state.refuseDm.has(cid)) return out({ error: { message: 'cannot message user' } }, 400);
    return out({ recipient_id: cid ? state.commentUser[cid] : j.recipient.id, message_id: `m${++mid}` });
  }
  if (path.endsWith('/replies')) return out({ id: `r${++mid}` });
  if (path.startsWith('media')) return out({ caption: 'From rough 3D to final photo ✨ Comment “PROJECT” below and I’ll send you The Blueprint', permalink: 'https://www.instagram.com/reel/abc/' });
  if (path.startsWith('u')) return out({ username: `name_${path}`, is_user_follow_business: !!state.follows[path] });
  out({ error: { message: 'unknown ' + path } }, 404);
});
await new Promise((r) => server.listen(0, r));
process.env.IG_GRAPH_URL = `http://localhost:${server.address().port}`;
process.env.IG_TOKEN = 'test';
process.env.IG_ADMIN_KEY = 'k';

const ig = await import('../api/_lib/ig.js');
const hook = await import('../api/instagram.js');
const leadsPage = await import('../api/leads.js');
const T = await import('../api/_lib/ig-texts.js');

const OWN = '999';
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
const tap = (user, payload) => post({ messaging: [{ sender: { id: user }, recipient: { id: OWN }, timestamp: Date.now(), postback: { mid: `pb${++n}`, title: 'x', payload } }] });
const sent = () => calls.splice(0);
const msgText = (c) => c.body?.message?.text ?? c.body?.message?.attachment?.payload?.text;
const lead = async (id) => (await ig.listLeads()).find((l) => l.id === id);

let ok = 0;
const step = async (name, fn) => { await fn(); ok++; console.log('✓', name); };

await step('caption words', () => {
  assert.deepEqual(ig.captionWords('Comment “PROJECT” below'), ['PROJECT']);
  assert.deepEqual(ig.captionWords('Commenta 3D e ti mando tutto'), ['3D']);
  assert.deepEqual(ig.captionWords('comment the word AI'), ['AI']);
  assert.deepEqual(ig.captionWords('Comment below 👇'), []);
  assert.equal(ig.matchWord('Project 🔥🔥', ['PROJECT']), 'PROJECT');
  assert.equal(ig.matchWord('projet!', ['PROJECT']), 'PROJECT');
  assert.equal(ig.matchWord('so beautiful', ['PROJECT']), null);
});

await step('comment without the word: nothing', async () => {
  assert.deepEqual(await comment('u1', 'wow amazing').res, ['no word']);
  assert.equal(sent().filter((c) => c.method === 'POST').length, 0);
});

await step('comment with the word: DM with button + public reply', async () => {
  const c = comment('u1', 'PROJECT 🙌');
  assert.deepEqual(await c.res, ['sent']);
  const s = sent().filter((x) => x.method === 'POST');
  assert.equal(s[0].body.recipient.comment_id, c.id);
  assert.equal(s[0].body.message.attachment.payload.buttons[0].payload, 'GET');
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
  assert.equal(msgText(m), T.blueprintNewFollower);
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
  assert.equal(msgText(sent().find((x) => x.method === 'POST')), T.blueprintFollower);
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
  assert.equal(s[1].body.message.quick_replies[0].payload, 'GET');
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

await step('leads page: private, lists everyone', async () => {
  assert.equal((await leadsPage.GET(new Request('http://x/api/leads'))).status, 404);
  const html = await (await leadsPage.GET(new Request('http://x/api/leads?key=k'))).text();
  assert.match(html, /@name_u1/);
  assert.match(html, /Ha un progetto/);
});

server.close();
console.log(`\n${ok} prove passate`);
