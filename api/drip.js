// /api/drip: the follow-up series after a free guide (api/_lib/drip.js has the four notes and why).
//
// GET ?tick=1        Vercel Cron every 15 minutes (or any call with the vercel-cron user agent): takes the new opt-ins, starts the people of the day, sends what is due.
//                    Sends nothing until Nico's ok is switched on (?key=…&on=1 sets omnya:drip:on).
// GET /m/<token>     (rewrite to ?c=) counts the click of mail N and opens the page of that note.
// GET ?o=<token>     the 1×1 picture: counts the open of mail N.
// GET ?key=IG_ADMIN_KEY&status=1 | &on=1|0 | &cap=N | &future=1|0 | &quiet=YYYY-MM-DD,… | &unquiet=… | &report=1
//     | &loadold=1 (the people we already had into pool:old) | &oldday=N (how many of them start a day)
//     | &launch=1 (THE 3D FUTURE launch mails) | &launchon=1|0 | &ltest=e1..e7[&to=][&as=<email for the A/B half>]
//     | &clubextra=email:Name,… | &test=<email>&step=1..4[&free=free-stadium][&club=soon|open|closed][&live=1 with the P.S.]
//
// The rules, decided with Nico on 20/11:
// - Resend only (never info@'s Microsoft 365 box), at most omnya:drip:cap a day (default DRIP_CAP or 80): Resend free sends
//   100 a day for everything and the buyers' PDFs keep the other 20. Over Resend's quota the series stops for the day.
// - Everyone who asks for a guide can get it, once in a life even after several opt-ins; with the cap, the people of each
//   day are picked at random among who asked for a guide 20-28 hours before, who ticked the update box first.
//   Who is not picked in that window is kept as the comparison group (omnya:drip:ctrl): that is the judge.
// - cap/4 people start each day, and only if every day of their four notes stays under the cap (omnya:drip:load:<day>),
//   so the series of someone who started always ends; from the 10th day the cap is used every day.
// - Never two of our emails on the same day: omnya:mail:day:<day> holds who got any of them (this, the buyers' PDFs,
//   THE 3D FUTURE's mails); a note due that day moves to the next one.
// - Unsubscribed (omnya:nl:off) = nothing more, at once.
// - THE 3D FUTURE (20/11, with the club session): on its launch days (omnya:drip:quiet, UTC dates) the series is silent,
//   and mail 4, which links the club page, waits until that page is online (omnya:drip:future = 1).
import { redis, hasStore, storeDown } from './_lib/store.js';
import { OFF_KEY } from './_lib/newsletter.js';
import { sendResend, hasResend } from './_lib/mail.js';
import { host } from './_lib/config.js';
import { LAUNCH, renderLaunch, variantOf } from './_lib/launch.js';
import { renderNote, readToken, markMailed, OFFSETS, GUIDES, TARGETS, SITE, STEPS } from './_lib/drip.js';

const K = 'omnya:drip:';
const DAY = 86_400_000;
const PER_TICK = 12; // a tick never sends more than this (a burst of hundreds looks like a blast to Gmail)
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const dayOf = (ms) => new Date(ms).toISOString().slice(0, 10);
const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64');

const loadAdd = async (ms, n) => { const k = `${K}load:${dayOf(ms)}`; await redis('INCRBY', k, n); await redis('EXPIRE', k, 15 * 86400); };

// Upstash's pipeline: many commands in one request (20/11: one request per row made the first tick, a thousand rows, run out
// of time). The tick never runs on the memory copy, so this goes straight to Upstash.
const RURL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const RTOK = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
async function pipe(cmds) {
  const out = [];
  for (let i = 0; i < cmds.length; i += 400) {
    const res = await fetch(`${RURL}/pipeline`, { method: 'POST', headers: { Authorization: `Bearer ${RTOK}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmds.slice(i, i + 400)) });
    const j = await res.json();
    if (!Array.isArray(j)) throw new Error(`redis pipeline: ${JSON.stringify(j).slice(0, 200)}`);
    for (const r of j) { if (r.error) throw new Error(`redis: ${r.error}`); out.push(r.result); }
  }
  return out;
}

// ---- 1. the new opt-ins since the last tick (the list is newest first) ----
async function ingest(now) {
  const cursor = Number(await redis('GET', `${K}cursor`)) || now - 2 * DAY;
  const fresh = [];
  for (let page = 0; page < 20; page++) {
    const raw = await redis('LRANGE', 'omnya:optin', page * 200, page * 200 + 199);
    if (!raw?.length) break;
    let older = false;
    for (const r of raw) {
      let o; try { o = JSON.parse(r); } catch { continue; }
      if (o.at <= cursor) { older = true; break; }
      fresh.push(o);
    }
    if (older || raw.length < 200) break;
  }
  if (!fresh.length) return 0;
  // the latest sign-up of each person wins (the list is newest first)
  const last = new Map();
  for (const o of fresh) {
    const email = String(o.email || '').trim().toLowerCase();
    if (email && GUIDES[o.free] && !last.has(email)) last.set(email, o); // the 3D Future waitlist is not a guide: the club mails them itself
  }
  const emails = [...last.keys()];
  const inSeries = emails.length ? await pipe(emails.map((e) => ['HEXISTS', `${K}people`, e])) : [];
  const cmds = [];
  const today = `omnya:mail:day:${dayOf(now)}`;
  emails.forEach((email, i) => {
    const o = last.get(email);
    if (Number(inSeries[i]) === 1) { // already in the series: a new opt-in today may have brought an email, so no note today
      if (dayOf(o.at) === dayOf(now)) cmds.push(['SADD', today, email], ['EXPIRE', today, 3 * 86400]);
      return;
    }
    const nl = !!o.consent?.newsletter;
    cmds.push(['HSET', `${K}who`, email, JSON.stringify({ n: o.name, f: o.free, at: o.at, nl })],
      ['ZADD', `${K}pool:${nl ? 'yes' : 'no'}`, o.at, email], ['ZREM', `${K}pool:${nl ? 'no' : 'yes'}`, email]);
  });
  if (cmds.length) await pipe(cmds);
  await redis('SET', `${K}cursor`, String(Math.max(...fresh.map((o) => o.at)))); // only once everything is in
  return fresh.length;
}

// who is past the window without being picked becomes the comparison group
async function prune(now) {
  const edge = now - 28 * 3600_000;
  for (const p of ['yes', 'no']) {
    const old = await redis('ZRANGEBYSCORE', `${K}pool:${p}`, '-inf', edge);
    if (!old?.length) continue;
    const ws = await pipe(old.map((e) => ['HGET', `${K}who`, e]));
    const cmds = [];
    old.forEach((email, i) => {
      if (ws[i]) { const w = JSON.parse(ws[i]); cmds.push(['HSET', `${K}ctrl`, email, JSON.stringify({ ...w, ref: w.at + DAY })]); }
      cmds.push(['HDEL', `${K}who`, email]);
    });
    cmds.push(['ZREMRANGEBYSCORE', `${K}pool:${p}`, '-inf', edge]);
    await pipe(cmds);
  }
}

// the people who asked for a guide before the series (or were not picked): pool:old, once, for &loadold=1.
// Only who ticked the update box (Nico 20/11: «the 1,957 who gave consent»), not unsubscribed, not already in the series,
// not in the comparison group (that is the judge until 28/11), the latest sign-up of each person.
async function loadOld(now) {
  const last = new Map();
  for (let page = 0; page < 50; page++) {
    const raw = await redis('LRANGE', 'omnya:optin', page * 1000, page * 1000 + 999);
    if (!raw?.length) break;
    for (const r of raw) {
      let o; try { o = JSON.parse(r); } catch { continue; }
      const email = String(o.email || '').trim().toLowerCase();
      if (!email || last.has(email)) continue; // newest first: the first row is the latest sign-up
      last.set(email, o);
    }
    if (raw.length < 1000) break;
  }
  const rows = [...last.entries()].filter(([, o]) => o.consent?.newsletter && GUIDES[o.free] && o.at < now - 28 * 3600_000);
  const checks = await pipe(rows.flatMap(([e]) => [['HEXISTS', `${K}people`, e], ['HEXISTS', `${K}ctrl`, e], ['SISMEMBER', OFF_KEY, e]]));
  const cmds = [];
  rows.forEach(([email, o], i) => {
    if (checks.slice(i * 3, i * 3 + 3).some((x) => Number(x) === 1)) return;
    cmds.push(['ZADD', `${K}pool:old`, o.at, email], ['HSET', `${K}whoold`, email, JSON.stringify({ n: o.name, f: o.free, at: o.at, nl: true })]);
  });
  if (cmds.length) await pipe(cmds);
  return cmds.length / 2;
}

// ---- THE 3D FUTURE launch mails (api/_lib/launch.js), sent from here on Nico's «sì, le mandi tu» (20/11) ----
// Off until omnya:launch:on = 1 (set once Resend Pro is active: 1,970 at a time don't fit the free 100 a day).
// On the UTC day of a mail, its people go into omnya:mail:day first thing, so the series leaves them alone that day;
// at 17:00 UTC it goes out through Resend's batch API, 100 per request, each person once (omnya:launch:<id>:sent),
// with a lock so two ticks never send the same batch, and it carries on at the next tick if time runs out.
const LK = 'omnya:launch:';
const isTest = (o, email) => /^check$/i.test(String(o.name || '').trim()) || /@omnyalab\.com$/i.test(email);

async function launchList(m) {
  const rows = new Map(); // email → name, the latest sign-up first
  for (let page = 0; page < 50; page++) {
    const raw = await redis('LRANGE', 'omnya:optin', page * 1000, page * 1000 + 999);
    if (!raw?.length) break;
    for (const r of raw) {
      let o; try { o = JSON.parse(r); } catch { continue; }
      const email = String(o.email || '').trim().toLowerCase();
      if (!email || rows.has(email) || isTest(o, email)) continue;
      const fits = m.list === 'club' ? o.free === 'waitlist-3d-future' : !!o.consent?.newsletter && o.free !== 'waitlist-3d-future';
      if (fits) rows.set(email, o.name);
    }
    if (raw.length < 1000) break;
  }
  if (m.list === 'club') { // the people who asked on WhatsApp (Nico's CSV), loaded with &clubextra=
    const ex = await redis('HGETALL', `${LK}club:extra`);
    for (let i = 0; i < (ex?.length || 0); i += 2) if (!rows.has(ex[i])) rows.set(ex[i], ex[i + 1]);
  }
  let emails = [...rows.keys()];
  if (!emails.length) return [];
  const checks = await pipe(emails.flatMap((e) => [['SISMEMBER', OFF_KEY, e], ...(m.seats ? [['HGET', 'omnya:club:members', e]] : [])]));
  const w = m.seats ? 2 : 1;
  emails = emails.filter((e, i) => {
    if (Number(checks[i * w]) === 1) return false; // unsubscribed
    if (m.seats && checks[i * w + 1]) { try { if (JSON.parse(checks[i * w + 1]).status !== 'canceled') return false; } catch { return false; } } // already inside the club
    return true;
  });
  return emails.map((e) => ({ email: e, name: rows.get(e) }));
}

async function launchTick(now) {
  if ((await redis('GET', `${LK}on`)) !== '1') return null;
  const d = dayOf(now);
  const m = LAUNCH.find((x) => x.at.slice(0, 10) === d);
  if (!m || (await redis('GET', `${LK}${m.id}:done`))) return null;
  if (Number(await redis('SET', `${LK}lock`, String(now), 'NX', 'EX', 55)) !== 1 && (await redis('GET', `${LK}lock`)) !== String(now)) return { launch: m.id, busy: true };
  try {
    const marked = await redis('GET', `${LK}${m.id}:marked`);
    if (marked && now < Date.parse(m.at)) return { launch: m.id, waiting: m.at, people: Number(marked) }; // marked, not yet time
    const people = await launchList(m);
    if (!marked) { // first tick of the day: the series leaves these people alone today
      const day = `omnya:mail:day:${d}`;
      await pipe([...people.map((p) => ['SADD', day, p.email]), ['EXPIRE', day, 3 * 86400]]);
      await redis('SET', `${LK}${m.id}:marked`, String(people.length), 'EX', 20 * 86400);
    }
    if (now < Date.parse(m.at)) return { launch: m.id, waiting: m.at, people: people.length };
    let seatsLeft;
    if (m.seats) {
      const r = await fetch(`${SITE}/api/club/seats`, { headers: { 'Cache-Control': 'no-cache' } }).then((x) => x.json()).catch(() => null);
      if (!r || typeof r.left !== 'number') return { launch: m.id, error: 'seats not readable, retry next tick' };
      seatsLeft = r.left;
    }
    const sentKey = `${LK}${m.id}:sent`;
    const already = await pipe(people.map((p) => ['SISMEMBER', sentKey, p.email]));
    const todo = people.filter((_, i) => Number(already[i]) !== 1);
    let sent = 0;
    const t0 = Date.now();
    for (let i = 0; i < todo.length && Date.now() - t0 < 35_000; i += 100) {
      const chunk = todo.slice(i, i + 100);
      const mails = chunk.map((p) => { const r = renderLaunch(m.id, p, { seatsLeft }); return { from: 'Nico <info@omnyalab.com>', to: [p.email], reply_to: host.email, subject: r.subject, html: r.html, text: r.text, headers: r.headers }; });
      await pipe([['SADD', sentKey, ...chunk.map((p) => p.email)], ['EXPIRE', sentKey, 40 * 86400]]); // before the request: never twice
      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `${m.id}-${chunk[0].email}-${chunk.length}` },
        body: JSON.stringify(mails),
      });
      if (!res.ok) {
        const err = (await res.text()).slice(0, 300);
        await redis('SREM', sentKey, ...chunk.map((p) => p.email));
        console.error('[launch]', m.id, res.status, err);
        await redis('SET', `${LK}${m.id}:error`, `${res.status} ${err}`, 'EX', 20 * 86400);
        return { launch: m.id, sent, error: res.status };
      }
      if (m.id === 'e1') await pipe(chunk.map((p) => ['HSET', `${LK}e1:v`, p.email, variantOf(p.email)]));
      sent += chunk.length;
      await new Promise((r) => setTimeout(r, 600)); // Resend: 2 requests a second
    }
    const left = todo.length - sent;
    if (!left) await redis('SET', `${LK}${m.id}:done`, String(Date.now()), 'EX', 40 * 86400);
    return { launch: m.id, sent, left };
  } finally {
    await redis('DEL', `${LK}lock`);
  }
}

// ---- 2. send one note; false = stop the tick (quota) ----
async function sendStep(email, person, step, now) {
  const live = (await redis('GET', `${K}future`)) === '1'; // the club page is online: the P.S. opens its door
  const m = renderNote(step, { email, name: person.n, free: person.f, at: person.at }, { live });
  try {
    await sendResend({ to: `${person.n || ''} <${email}>`.trim(), from: 'Nico <info@omnyalab.com>', replyTo: host.email, ...m });
  } catch (e) {
    const msg = String(e?.message || e);
    console.error('[drip] send', step, msg);
    if (/quota|limit|550|429/i.test(msg)) { await redis('SET', `${K}stop:${dayOf(now)}`, msg.slice(0, 200), 'EX', 2 * 86400); return 'stop'; }
    return 'fail';
  }
  const d = dayOf(now);
  await redis('INCR', `${K}n:${d}`); await redis('EXPIRE', `${K}n:${d}`, 40 * 86400);
  await markMailed(email, now);
  await redis('HINCRBY', `${K}stat`, `sent${step}`, 1);
  return 'ok';
}

async function tick() {
  if (!hasStore() || storeDown()) return { skipped: 'store' }; // on the memory copy "already sent" would be forgotten
  const now = Date.now();
  let launch = null;
  try { launch = await launchTick(now); } catch (e) { console.error('[launch] tick', e); launch = { error: String(e.message || e) }; }
  // while it is off nothing is read, so the comparison group only holds people of the days the series ran
  if ((await redis('GET', `${K}on`)) !== '1' || !hasResend()) return { ok: true, off: true, launch };
  const got = await ingest(now);
  await prune(now);
  const d = dayOf(now);
  if (launch) console.log('[launch]', JSON.stringify(launch));
  if (await redis('GET', `${K}stop:${d}`)) return { ok: true, stopped: d, got };
  // THE 3D FUTURE's launch days (UTC dates in omnya:drip:quiet): the series sends nothing, its notes move to the next day
  if (Number(await redis('SISMEMBER', `${K}quiet`, d)) === 1) return { ok: true, quiet: d, got };
  const cap = Number(await redis('GET', `${K}cap`)) || Number(process.env.DRIP_CAP) || 80;
  let room = Math.min(PER_TICK, cap - Number((await redis('GET', `${K}n:${d}`)) || 0));
  const out = { got, due: 0, started: 0, moved: 0 };
  if (room <= 0) return { ok: true, full: true, ...out };
  const today = new Set(await redis('SMEMBERS', `omnya:mail:day:${d}`));
  const off = async (email) => Number(await redis('SISMEMBER', OFF_KEY, email)) === 1;

  // a) the notes already due: who started first comes first
  const due = (await redis('ZRANGEBYSCORE', `${K}due`, '-inf', now, 'LIMIT', 0, room)) || [];
  for (const email of due) {
    const person = JSON.parse((await redis('HGET', `${K}people`, email)) || 'null');
    if (!person || (await off(email))) { await redis('ZREM', `${K}due`, email); continue; }
    if (today.has(email)) { // already one email from us today: tomorrow at the same hour
      await redis('ZADD', `${K}due`, now + DAY, email); await loadAdd(now, -1); await loadAdd(now + DAY, 1); out.moved++; continue;
    }
    const step = person.step + 1;
    // mail 4 links the club page: it waits until the club session says the page is online (omnya:drip:future = 1)
    if (step === STEPS && (await redis('GET', `${K}future`)) !== '1') { await redis('ZADD', `${K}due`, now + DAY, email); out.held = (out.held || 0) + 1; continue; }
    const r = await sendStep(email, person, step, now);
    if (r === 'stop') return { ok: true, stopped: d, ...out };
    if (r === 'fail') { await redis('ZADD', `${K}due`, now + 3600_000, email); continue; }
    person.step = step; (person.sent ||= []).push(now);
    await redis('HSET', `${K}people`, email, JSON.stringify(person));
    if (step < STEPS) await redis('ZADD', `${K}due`, Math.max(person.start + OFFSETS[step] * DAY, now + 20 * 3600_000), email); // a late note never brings the next one closer than a day
    else await redis('ZREM', `${K}due`, email);
    out.due++; room--;
  }
  if (room <= 0) return { ok: true, ...out };

  // b) new starts. Today's plan = cap/4 people (80 → 20), fewer if one of the days of their four notes is already full,
  // decided at the first tick of the day and spread over it, so the hour of the opt-in decides the hour of the notes.
  let plan = Number(await redis('GET', `${K}plan:${d}`));
  if (!(await redis('EXISTS', `${K}plan:${d}`))) {
    const loads = await Promise.all(OFFSETS.map(async (o) => Number((await redis('GET', `${K}load:${dayOf(now + o * DAY)}`)) || 0)));
    plan = Math.max(0, Math.min(Math.floor(cap / STEPS), ...loads.map((l) => cap - l))); // cap/4 a day: from day 10 every day is full, never an empty one
    await redis('SET', `${K}plan:${d}`, String(plan), 'EX', 2 * 86400);
  }
  const startedToday = Number((await redis('GET', `${K}s:${d}`)) || 0);
  const elapsed = (now - Date.parse(`${d}T00:00:00Z`) + 15 * 60_000) / DAY;
  let want = Math.min(room, Math.ceil(plan * Math.min(1, elapsed)) - startedToday);
  const oldDay = Number((await redis('GET', `${K}oldday`)) || 0);
  // one start: the HSETNX is the lock (once in a life, a second tick can't start the same person), then mail 1
  const start = async (email, w) => {
    if (!w || (await off(email)) || today.has(email) || (await redis('HEXISTS', `${K}people`, email))) return 'skip';
    const person = { n: w.n, f: w.f, at: w.at, nl: w.nl, start: now, step: 0, ...(w.old ? { old: 1 } : {}) };
    if (Number(await redis('HSETNX', `${K}people`, email, JSON.stringify(person))) !== 1) return 'skip';
    const r = await sendStep(email, person, 1, now);
    if (r !== 'ok') { await redis('HDEL', `${K}people`, email); return r; }
    person.step = 1; person.sent = [now];
    await redis('HSET', `${K}people`, email, JSON.stringify(person));
    await redis('ZADD', `${K}due`, now + OFFSETS[1] * DAY, email);
    for (const o of OFFSETS) await loadAdd(now + o * DAY, 1);
    out.started++; room--;
    return 'ok';
  };
  // who ticked the update box; who left it empty only with omnya:drip:all = 1 (never happens at 80 a day, the ticked ones
  // are always more than the room; with a bigger cap the people we already had with the box come first, see c)
  const pools = ['yes', ...((await redis('GET', `${K}all`)) === '1' && !oldDay ? ['no'] : [])];
  for (const p of want > 0 ? pools : []) {
    if (want <= 0) break;
    const cands = (await redis('ZRANGEBYSCORE', `${K}pool:${p}`, now - 28 * 3600_000, now - 20 * 3600_000)) || [];
    for (let i = cands.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cands[i], cands[j]] = [cands[j], cands[i]]; }
    for (const email of cands) {
      if (want <= 0) break;
      await redis('ZREM', `${K}pool:${p}`, email);
      const w = JSON.parse((await redis('HGET', `${K}who`, email)) || 'null');
      await redis('HDEL', `${K}who`, email);
      const r = await start(email, w);
      if (r === 'stop') return { ok: true, stopped: d, ...out };
      if (r === 'ok') { await redis('INCR', `${K}s:${d}`); await redis('EXPIRE', `${K}s:${d}`, 2 * 86400); want--; }
    }
  }

  // c) the people we already had (20/11, Nico: «send the new emails to the ones we already have, a few a day»):
  // omnya:drip:oldday a day from pool:old (loaded with &loadold=1), oldest first, spread over the day, and only while
  // every day of their four notes stays under the cap, so they never take the place of the new ones
  if (oldDay > 0 && room > 0) {
    let wantOld = Math.min(room, Math.ceil(oldDay * Math.min(1, elapsed)) - Number((await redis('GET', `${K}so:${d}`)) || 0));
    if (wantOld > 0) {
      const loads = await Promise.all(OFFSETS.map(async (o) => Number((await redis('GET', `${K}load:${dayOf(now + o * DAY)}`)) || 0)));
      wantOld = Math.min(wantOld, ...loads.map((l) => cap - l));
      const cands = wantOld > 0 ? (await redis('ZRANGE', `${K}pool:old`, 0, wantOld * 2)) || [] : []; // oldest first: THE 3D FUTURE's launch mails go to the most recent ones, so until 4/12 the two lists hardly meet
      for (const email of cands) {
        if (wantOld <= 0) break;
        await redis('ZREM', `${K}pool:old`, email);
        const w = JSON.parse((await redis('HGET', `${K}whoold`, email)) || 'null');
        await redis('HDEL', `${K}whoold`, email);
        const r = await start(email, w && { ...w, old: 1 });
        if (r === 'stop') return { ok: true, stopped: d, ...out };
        if (r === 'ok') { await redis('INCR', `${K}so:${d}`); await redis('EXPIRE', `${K}so:${d}`, 2 * 86400); wantOld--; out.old = (out.old || 0) + 1; }
      }
    }
  }
  return { ok: true, ...out };
}

// ---- opens and clicks: first time of each, per mail ----
async function seen(tok, kind) {
  const t = readToken(tok);
  if (!t) return null;
  if (hasStore() && !storeDown()) {
    const first = Number(await redis('HSETNX', `${K}ev`, `${t.email}|${kind}${t.step}`, String(Date.now())));
    if (first === 1) await redis('HINCRBY', `${K}stat`, `${kind}${t.step}`, 1);
  }
  return t;
}

export async function GET(request) {
  const q = new URL(request.url).searchParams;
  if (q.get('o')) {
    await seen(q.get('o'), 'open').catch(() => {});
    return new Response(GIF, { headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, max-age=0' } });
  }
  if (q.get('c')) {
    const t = await seen(q.get('c'), 'click').catch(() => null);
    const path = (t && TARGETS[t.t]) || '/';
    return Response.redirect(`${SITE}${path}${t ? `?ig=mail${t.step}` : ''}`, 302);
  }
  if (q.get('tick') || /^vercel-cron/i.test(request.headers.get('user-agent') || '')) {
    // Vercel Cron sends Authorization: Bearer CRON_SECRET when it is set; anyone else only gets "not found"
    const cs = process.env.CRON_SECRET;
    if (cs && request.headers.get('authorization') !== `Bearer ${cs}` && q.get('key') !== process.env.IG_ADMIN_KEY) return new Response('Not found', { status: 404 });
    try { return json(await tick()); } catch (e) { console.error('[drip] tick', e); return json({ error: String(e.message || e) }, 500); }
  }

  const key = process.env.IG_ADMIN_KEY;
  if (!key || q.get('key') !== key) return new Response('Not found', { status: 404 });
  if (q.get('test')) { // one note to one address (Nico's), outside the series and its counts
    const step = Math.min(STEPS, Math.max(1, Number(q.get('step')) || 1));
    const to = String(q.get('test')).trim().toLowerCase();
    const m = renderNote(step, { email: to, name: q.get('name') || 'Nico', free: q.get('free') || 'free-stadium' }, { ...(q.get('club') ? { club: q.get('club') } : {}), live: q.get('live') === '1' || (await redis('GET', `${K}future`)) === '1' });
    await sendResend({ to, from: 'Nico <info@omnyalab.com>', replyTo: host.email, ...m });
    return json({ ok: true, sent: m.subject, to });
  }
  if (q.get('on') === '1' || q.get('on') === '0') await redis('SET', `${K}on`, q.get('on'));
  if (q.get('cap')) await redis('SET', `${K}cap`, String(Math.max(0, Math.min(1000, Number(q.get('cap')) || 0))));
  if (q.get('launchon') === '1' || q.get('launchon') === '0') await redis('SET', `${LK}on`, q.get('launchon'));
  if (q.get('clubextra')) { // email:Name,email:Name — the club list people who asked on WhatsApp
    for (const pair of String(q.get('clubextra')).split(',')) { const [e, n] = pair.split(':'); if (/@/.test(e || '')) await redis('HSET', `${LK}club:extra`, e.trim().toLowerCase(), (n || '').trim()); }
  }
  if (q.get('ltest')) { // one launch mail to one address (Nico's), outside the counts
    const m = LAUNCH.find((x) => x.id === q.get('ltest'));
    if (!m) return json({ error: 'ltest = e1..e7' }, 400);
    const to = String(q.get('to') || host.email).trim().toLowerCase();
    const r = renderLaunch(m.id, { email: q.get('as') || to, name: q.get('name') || 'Nico' }, { seatsLeft: Number(q.get('seats')) || 100 });
    await sendResend({ to, from: 'Nico <info@omnyalab.com>', replyTo: host.email, subject: r.subject, html: r.html, text: r.text, headers: r.headers });
    return json({ ok: true, sent: r.subject, variant: r.variant, to });
  }
  if (q.get('launch') === '1') { // who would get each mail today, and what went
    const out = { on: (await redis('GET', `${LK}on`)) === '1', mails: [] };
    for (const m of LAUNCH) out.mails.push({ ...m, people: (await launchList(m)).length, sent: Number(await redis('SCARD', `${LK}${m.id}:sent`)), done: !!(await redis('GET', `${LK}${m.id}:done`)), error: await redis('GET', `${LK}${m.id}:error`) });
    return json(out);
  }
  if (q.get('loadold') === '1') return json({ ok: true, old: await loadOld(Date.now()) });
  if (q.get('all') === '1' || q.get('all') === '0') await redis('SET', `${K}all`, q.get('all'));
  if (q.get('oldday')) await redis('SET', `${K}oldday`, String(Math.max(0, Math.min(1000, Number(q.get('oldday')) || 0))));
  if (Number(q.get('cursor')) > 0) await redis('SET', `${K}cursor`, String(Date.now() - Number(q.get('cursor')) * 3600_000)); // read the opt-ins of the last N hours again
  if (q.get('resetstat') === '1') {
    // the counts again from the people of the series: sent from their notes, opens and clicks only theirs (the test mails
    // to @omnyalab.com addresses go). 20/11: the old reset deleted every event, real ones too.
    const pp = (a) => { const o = {}; for (let i = 0; i < (a?.length || 0); i += 2) o[a[i]] = a[i + 1]; return o; };
    const people = pp(await redis('HGETALL', `${K}people`)), ev = pp(await redis('HGETALL', `${K}ev`));
    const stat = {};
    for (const v of Object.values(people)) for (let i = 1; i <= (JSON.parse(v).step || 0); i++) stat[`sent${i}`] = (stat[`sent${i}`] || 0) + 1;
    const drop = [];
    for (const k of Object.keys(ev)) { const [e, kind] = k.split('|'); if (people[e]) stat[kind] = (stat[kind] || 0) + 1; else drop.push(k); }
    if (drop.length) await redis('HDEL', `${K}ev`, ...drop);
    await redis('DEL', `${K}stat`);
    for (const [f, n] of Object.entries(stat)) await redis('HSET', `${K}stat`, f, String(n));
  }
  if (q.get('future') === '1' || q.get('future') === '0') await redis('SET', `${K}future`, q.get('future'));
  for (const x of String(q.get('quiet') || '').split(',').filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x))) await redis('SADD', `${K}quiet`, x);
  for (const x of String(q.get('unquiet') || '').split(',').filter(Boolean)) await redis('SREM', `${K}quiet`, x);
  const d = dayOf(Date.now());
  const status = {
    on: (await redis('GET', `${K}on`)) === '1',
    cap: Number(await redis('GET', `${K}cap`)) || Number(process.env.DRIP_CAP) || 80,
    sentToday: Number((await redis('GET', `${K}n:${d}`)) || 0),
    startedToday: Number((await redis('GET', `${K}s:${d}`)) || 0),
    planToday: Number((await redis('GET', `${K}plan:${d}`)) || 0),
    stoppedToday: await redis('GET', `${K}stop:${d}`),
    quietDays: ((await redis('SMEMBERS', `${K}quiet`)) || []).sort(),
    mail4Live: (await redis('GET', `${K}future`)) === '1',
    people: Number(await redis('HLEN', `${K}people`)),
    due: Number(await redis('ZCARD', `${K}due`)),
    poolYes: Number(await redis('ZCARD', `${K}pool:yes`)),
    poolNo: Number(await redis('ZCARD', `${K}pool:no`)),
    comparison: Number(await redis('HLEN', `${K}ctrl`)),
    poolOld: Number(await redis('ZCARD', `${K}pool:old`)),
    oldPerDay: Number((await redis('GET', `${K}oldday`)) || 0),
    oldStartedToday: Number((await redis('GET', `${K}so:${d}`)) || 0),
    stat: await redis('HGETALL', `${K}stat`),
  };
  if (!q.get('report')) return json(status);
  // everything the local report needs (scripts/drip-report.py adds Stripe and the replies)
  const pairs = (a) => { const o = {}; for (let i = 0; i < (a?.length || 0); i += 2) o[a[i]] = a[i + 1]; return o; };
  const people = pairs(await redis('HGETALL', `${K}people`));
  const ctrl = pairs(await redis('HGETALL', `${K}ctrl`));
  const ev = pairs(await redis('HGETALL', `${K}ev`));
  return json({
    status,
    people: Object.entries(people).map(([email, v]) => ({ email, ...JSON.parse(v) })),
    comparison: Object.entries(ctrl).map(([email, v]) => ({ email, ...JSON.parse(v) })),
    events: ev,
  });
}
