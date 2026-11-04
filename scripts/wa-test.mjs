// Tests for the WhatsApp bot, with no Meta, no Redis and no Claude (a fake brain).
// Run: ~/.local/node/bin/node scripts/wa-test.mjs
process.env.WA_DEBOUNCE_MS = '30';
delete process.env.KV_REST_API_URL;
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.ANTHROPIC_API_KEY;

const wa = await import('../api/_lib/wa.js');
const { guard, turns } = await import('../api/_lib/wa-brain.js');
const { handle } = await import('../api/whatsapp.js');

let pass = 0;
let fail = 0;
const ok = (cond, name) => (cond ? pass++ : (fail++, console.log('FAIL', name)));

let brain = () => ({ decision: 'reply', reason: 'none', messages: ['hey', 'what are you working on'], summary_it: 'lead nuovo' });
let brainCalls = 0;
wa._setThink(async (log, o) => (brainCalls++, brain(log, o)));

let id = 0;
const msg = (from, body, type = 'text') => ({
  entry: [{ changes: [{ field: 'messages', value: { contacts: [{ wa_id: from, profile: { name: 'Lead ' + from } }], messages: [{ id: `m${++id}`, from, type, ...(type === 'text' ? { text: { body } } : { [type]: { filename: 'plan.pdf' } }) }] } }] }],
});
const run = async (body) => Promise.all((await handle(body)).map((j) => j()));
const texts = () => wa._sent.filter((s) => s.type === 'text').map((s) => s.text.body);
const reset = () => (wa._sent.length = 0);

// 1. bot off: nothing
reset();
await run(msg('971111', 'hi'));
ok(texts().length === 0, 'bot off stays quiet');

await wa.setEnabled(true);

// 2. new lead: answers with 2 messages + read/typing
reset();
await run(msg('972222', 'hi free sample?'));
ok(texts().length === 2, 'new lead gets 2 messages');
ok(wa._sent.some((s) => s.typing_indicator), 'typing indicator sent');

// 3. two messages in a row: one answer only
reset();
brainCalls = 0;
const a = handle(msg('973333', 'hi'));
const b = handle(msg('973333', 'i saw the tower'));
const jobs = [...(await a), ...(await b)];
await Promise.all(jobs.map((j) => j()));
ok(brainCalls === 1, 'burst of messages = one answer');

// 4. Nico writes from the app: the chat is his
reset();
await handle({ entry: [{ changes: [{ field: 'smb_message_echoes', value: { message_echoes: [{ id: 'e1', from: '97379', to: '972222', type: 'text', text: { body: 'ciao sono nico' } }] } }] }] });
await run(msg('972222', 'ok thanks nico'));
ok(texts().length === 0, 'after Nico writes the bot is quiet');
ok((await wa.chatState('972222')).status === 'nico', 'chat marked as Nico');

// 5. existing chats from history and saved contacts are excluded
reset();
await handle({ entry: [{ changes: [{ field: 'history', value: { history: [{ threads: [{ id: '974444' }] }] } }] }] });
await handle({ entry: [{ changes: [{ field: 'smb_app_state_sync', value: { state_sync: [{ type: 'contact', action: 'add', contact: { phone_number: '+97 555 5555' } }] } }] }] });
await run(msg('974444', 'ciao fabrizio qui'));
await run(msg('395555555', 'ciao'));
ok(texts().length === 0, 'history and contacts excluded');

// 6. manual exclusion list
reset();
await wa.exclude('+97 666');
await run(msg('97666', 'hello'));
ok(texts().length === 0, 'excluded number');
await wa.unexclude('97666');
await run(msg('97666', 'hello?'));
ok(texts().length === 2, 'removed from exclusion list');

// 7. price question: silent handoff + notification, then waits for Nico
reset();
brain = () => ({ decision: 'handoff', reason: 'price', messages: ['it costs 90 €'], summary_it: 'chiede il prezzo del 3d' });
await run(msg('977777', 'how much for the tower?'));
ok(texts().length === 0, 'price handoff sends nothing');
ok(wa._sent.some((s) => s.notify && /prezzo/.test(s.notify.title)), 'Nico notified for price');
ok((await wa.chatState('977777')).status === 'waiting', 'chat waits for Nico');
reset();
brain = () => ({ decision: 'reply', reason: 'none', messages: ['x'], summary_it: '' });
await run(msg('977777', 'hello??'));
ok(texts().length === 0, 'waiting chat: bot stays quiet');

// 8. "are you a bot": holding line + notification
reset();
brain = () => ({ decision: 'handoff', reason: 'bot_question', messages: ['giro la notifica al team che ti risponde subito'], summary_it: 'chiede se è un bot' });
await run(msg('978888', 'sei un bot?'));
ok(texts().length === 1 && /team/.test(texts()[0]), 'bot question: one holding line');
ok(wa._sent.some((s) => s.notify), 'bot question notifies Nico');

// 9. give the chat back to the bot from the admin page
await wa.setStatus('978888', 'bot');
reset();
brain = () => ({ decision: 'reply', reason: 'none', messages: ['ok'], summary_it: '' });
await run(msg('978888', 'ok'));
ok(texts().length === 1, 'chat given back to the bot');

// 10. test list: only allowed numbers while on the test number
process.env.WA_ALLOW = '97999';
reset();
await run(msg('971234', 'hi'));
ok(texts().length === 0, 'not in test list');
await run(msg('97999', 'hi'));
ok(texts().length === 1, 'in test list');
delete process.env.WA_ALLOW;

// 11. groups and reactions ignored, Meta retries ignored
reset();
const g = msg('970001', 'hi');
g.entry[0].changes[0].value.messages[0].group_id = 'G1';
await run(g);
const r = msg('970002', 'hi');
await run(r);
await run(r);
ok(texts().length === 1, 'group ignored, duplicate delivery answered once');

// 12. Italian numbers: Nico answers them himself
reset();
brain = () => ({ decision: 'reply', reason: 'none', messages: ['ok'], summary_it: '' });
await run(msg('393401112233', 'ciao info'));
ok(texts().length === 0, 'italian number left to Nico');
await run(msg('971501112233', 'hi'));
ok(texts().length === 1, 'foreign number answered');
process.env.WA_ALLOW = '393401112233';
reset();
await run(msg('393401112233', 'prova'));
ok(texts().length === 1, 'test list wins over the italian rule');
delete process.env.WA_ALLOW;

// guard
ok(guard(['the full tower blueprint is 4,99 € instead of 19 this week']) === null, 'guard: blueprint price ok');
ok(guard(['playbooks 49 € or all three 79 €']) === null, 'guard: playbook prices ok');
ok(guard(['a render is 90 €']) !== null, 'guard: work price blocked');
ok(guard(['around 2k usd']) !== null, 'guard: 2k blocked');
ok(guard(['we can deliver friday']) !== null, 'guard: weekday blocked');
ok(guard(['ready by 12/11']) !== null, 'guard: date blocked');
ok(guard(['4,99 € until sunday 8 november']) === null, 'guard: deal end ok');
ok(guard(['first views in 1-2 working days']) === null, 'guard: process timing ok');

// turns
const t = turns([{ r: 'bot', t: 'x' }, { r: 'lead', t: 'a' }, { r: 'lead', t: 'b' }, { r: 'bot', t: 'c' }, { r: 'lead', t: 'd' }]);
ok(t.length === 3 && t[0].role === 'user' && t[0].content === 'a\nb', 'turns merge and start with the lead');

console.log(`${pass} ok, ${fail} failed`);
process.exit(fail ? 1 : 0);
