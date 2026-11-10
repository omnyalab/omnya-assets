// Tests for the WhatsApp bot, with no Meta, no Redis and no Claude (a fake brain).
// Run: ~/.local/node/bin/node scripts/wa-test.mjs
process.env.WA_DEBOUNCE_MS = '30';
delete process.env.KV_REST_API_URL;
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.ANTHROPIC_API_KEY;

const wa = await import('../api/_lib/wa.js');
const { guard, turns, system, PRICES } = await import('../api/_lib/wa-brain.js');
const { KNOWLEDGE, WELCOME, DEMO_TOWER, DEMO_HOUSE } = await import('../api/_lib/wa-knowledge.js');
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
await run(msg('972222', 'hi'));
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

// guard: today's prices pass, every other amount, the dates, the old free image and "Nicola" never leave
for (const said of [
  'one image is 90 €', 'the pilot is 490 € one floor of your building clickable in 7 days', 'essential is 1.390 € and signature 2.290 €',
  'choose your floor starts at 3.900 €', 'the house starts at 1.990 € and the full tower launch 5.900 €', 'films are 899 € 1.490 € or 2.490 €',
  'the full guide is 5,99 €', '5.99 € for the full one', 'everything we teach is 59 €', 'the scene file is 12 €', '€1,390 for essential', '1390 eur',
]) ok(guard([said]) === null, `guard: today's price ok: ${said}`);
for (const said of [
  'the full tower blueprint is 4,99 € instead of 19 this week', 'its 19 €', '1,99 € until sunday', 'all three for 39 €', 'playbooks 49 € or all three 79 €',
  'a render is 70 €', 'around 2k usd', 'about 4000 €', 'the two together are 6.390 €', 'thats 2000 aed', 'we can do 1.200 € for you',
]) ok(guard([said]) !== null, `guard: blocked: ${said}`);
ok(guard(['we can deliver friday']) !== null, 'guard: weekday blocked');
ok(guard(['ready by 12/11']) !== null, 'guard: date blocked');
ok(guard(['first views in 1-2 working days']) === null, 'guard: process timing ok');
ok(guard(['online in 7 days and if you start within 30 days the 490 € comes off']) === null, 'guard: pilot timing ok');
ok(guard(['delivered in 4k in every format']) === null, 'guard: 4k is not money');
ok(guard(['the free sample is one photo of your room']) !== null, 'guard: free sample offer blocked');
ok(guard(['sure send me the plan and we make the first image free']) !== null, 'guard: first image free blocked');
ok(guard(['ti facciamo una foto gratis del tuo progetto']) !== null, 'guard: foto gratis blocked');
ok(guard(['we dont do the free image anymore']) === null, 'guard: saying the free image is gone is fine');
ok(guard(['you can try the free demo here ' + DEMO_TOWER]) === null, 'guard: free demo ok');
ok(guard(['nicola will get back to you']) !== null, 'guard: "Nicola" blocked');
ok(guard(['nico will get back to you']) === null, 'guard: "Nico" ok');

// what the bot knows and says (10/11): the demo and the pilot in place of the free image, today's prices, Nico's rules
const brainText = system()[0].text;
ok(brainText.includes(KNOWLEDGE), 'the facts are in what the bot reads');
ok(KNOWLEDGE.includes(DEMO_TOWER) && KNOWLEDGE.includes(DEMO_HOUSE), 'facts: the two free demos');
ok(DEMO_TOWER === 'https://www.omnyalab.com/demo/choose-your-floor' && DEMO_HOUSE === 'https://www.omnyalab.com/demo/hold-to-build', 'the demo links');
ok(/pilot, 490 €: ONE floor of THEIR building, clickable, online in 7 days/i.test(KNOWLEDGE) && /within 30 days, the 490 € comes off its price in full/.test(KNOWLEDGE), 'facts: the pilot');
for (const price of ['90 €', '899 €', '1.490 €', '2.490 €', '1.390 €', '2.290 €', '1.990 €', '3.900 €', '5.900 €', '490 €', '5,99 €', '59 €', '12 €']) ok(KNOWLEDGE.includes(price), `facts: ${price}`);
ok(PRICES.length === 13 && guard(PRICES.map((n) => `${n} €`)) === null, 'the guard knows the same 13 prices');
// every amount written in what the bot reads is one of today's prices: no 19 €, no launch price left anywhere
const moneyStops = brainText.split('\n').map((l) => guard([l])).filter((r) => r && r.startsWith('money:'));
ok(moneyStops.length === 0, `every amount in the rules and the facts is one of today's prices: ${moneyStops.join(' | ')}`);
ok(!/\b19 ?€|€ ?19\b|(?<![\d.,])[14][.,]99(?!\d)|\b39 ?€|\b79 ?€|\b29 ?€|\b49 ?€|167|instead of|\{\{/.test(brainText), 'no old price, no "instead of", no empty placeholder');
ok(!/first image free|first image is free|free sample \(one image\)|ONE photorealistic image/i.test(brainText), 'the free image is not offered anywhere');
ok(/NO free image/.test(brainText) && /no longer there|not there anymore/.test(brainText), 'the bot is told the free image is gone');
ok(!/nicola/i.test(brainText.replace('never Nicola', '')), 'Nico, never Nicola');
ok(/FIRST ask what they want/.test(brainText), 'rule: first ask what they want');
ok(/REAL project[^\n]*gets WORK proposed, never a pdf/.test(brainText), 'rule: a real project gets work, never the PDF');
ok(/never invent, round, convert[^\n]*a price, a discount or a timing that is not written in the facts/.test(brainText), 'rule: never a price or a timing that is not in the list');
ok(/max ~15 words/.test(brainText), 'rule: short messages');

// the welcome: short, lowercase, asks about the project and what they need, the demo link, signed Nico
for (const [lang, lines] of Object.entries(WELCOME)) {
  ok(lines.length === 3 && lines.every((l) => l.length <= 100 && !l.includes('\n')), `welcome ${lang}: three short lines`);
  ok(lines.every((l) => l === l.toLowerCase()), `welcome ${lang}: lowercase`);
  ok(/\bnico\b/.test(lines[0]) && !/nicola/.test(lines.join(' ')), `welcome ${lang}: signed nico`);
  ok(/project|progetto/.test(lines[1]) && /need|serve/.test(lines[1]) && lines[1].endsWith('?'), `welcome ${lang}: asks what project and what they need`);
  ok(lines[2].endsWith(DEMO_TOWER), `welcome ${lang}: the demo link`);
  ok(guard(lines) === null, `welcome ${lang}: passes the guard`);
  ok(!/\p{Extended_Pictographic}|!|—/u.test(lines.join(' ')), `welcome ${lang}: no emoji, no "!"`);
  ok(lines.every((l) => brainText.includes(l)), `welcome ${lang}: the bot has it in its rules`);
}

// the welcome goes out as three separate messages (here the fake brain says it, as the real one is told to)
reset();
brain = () => ({ decision: 'reply', reason: 'none', messages: WELCOME.en, summary_it: 'lead nuovo, ha solo salutato' });
await run(msg('971700000001', 'hello'));
ok(texts().length === 3 && texts()[2].includes(DEMO_TOWER), 'welcome: three messages, the last with the demo link');
ok(wa._sent.filter((s) => s.type === 'text').at(-1).text.preview_url === true, 'welcome: the demo link shows its preview');

// turns
const t = turns([{ r: 'bot', t: 'x' }, { r: 'lead', t: 'a' }, { r: 'lead', t: 'b' }, { r: 'bot', t: 'c' }, { r: 'lead', t: 'd' }]);
ok(t.length === 3 && t[0].role === 'user' && t[0].content === 'a\nb', 'turns merge and start with the lead');

console.log(`${pass} ok, ${fail} failed`);
process.exit(fail ? 1 : 0);
