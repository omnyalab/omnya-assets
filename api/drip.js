// /api/drip: the follow-up series after a free guide (api/_lib/drip.js has the four notes and why).
//
// GET ?tick=1        Vercel Cron every 15 minutes (or any call with the vercel-cron user agent): takes the new opt-ins, starts the people of the day, sends what is due.
//                    Sends nothing until Nico's ok is switched on (?key=…&on=1 sets omnya:drip:on).
// GET /m/<token>     (rewrite to ?c=) counts the click of mail N and opens the page of that note.
// GET ?o=<token>     the 1×1 picture: counts the open of mail N.
// GET ?key=IG_ADMIN_KEY&status=1 | &on=1|0 | &cap=N | &future=1|0 | &quiet=YYYY-MM-DD,… | &unquiet=… | &report=1
//     | &test=<email>&step=1..4[&free=free-stadium][&club=soon|open|closed][&live=1 with the P.S.]
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
import { renderNote, readToken, markMailed, OFFSETS, GUIDES, TARGETS, SITE, STEPS } from './_lib/drip.js';

const K = 'omnya:drip:';
const DAY = 86_400_000;
const PER_TICK = 12; // a tick never sends more than this (a burst of hundreds looks like a blast to Gmail)
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const dayOf = (ms) => new Date(ms).toISOString().slice(0, 10);
const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64');

const loadAdd = async (ms, n) => { const k = `${K}load:${dayOf(ms)}`; await redis('INCRBY', k, n); await redis('EXPIRE', k, 15 * 86400); };

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
  await redis('SET', `${K}cursor`, String(Math.max(...fresh.map((o) => o.at))));
  for (const o of fresh.reverse()) { // oldest first, so the latest sign-up of a person wins
    const email = String(o.email || '').trim().toLowerCase();
    if (!email || !GUIDES[o.free]) continue; // the 3D Future waitlist is not a guide: the club mails them itself
    if (await redis('HEXISTS', `${K}people`, email)) {
      // already in the series: a new opt-in today may have brought a delivery email, so no note today
      if (dayOf(o.at) === dayOf(now)) await markMailed(email, now);
      continue;
    }
    const nl = !!o.consent?.newsletter;
    await redis('HSET', `${K}who`, email, JSON.stringify({ n: o.name, f: o.free, at: o.at, nl }));
    await redis('ZADD', `${K}pool:${nl ? 'yes' : 'no'}`, o.at, email);
    await redis('ZREM', `${K}pool:${nl ? 'no' : 'yes'}`, email);
  }
  return fresh.length;
}

// who is past the window without being picked becomes the comparison group
async function prune(now) {
  for (const p of ['yes', 'no']) {
    const old = await redis('ZRANGEBYSCORE', `${K}pool:${p}`, '-inf', now - 28 * 3600_000);
    if (!old?.length) continue;
    for (const email of old) {
      const w = await redis('HGET', `${K}who`, email);
      if (w) await redis('HSET', `${K}ctrl`, email, JSON.stringify({ ...JSON.parse(w), ref: JSON.parse(w).at + DAY }));
      await redis('HDEL', `${K}who`, email);
    }
    await redis('ZREMRANGEBYSCORE', `${K}pool:${p}`, '-inf', now - 28 * 3600_000);
  }
}

// ---- 2. send one note; false = stop the tick (quota) ----
async function sendStep(email, person, step, now) {
  const live = (await redis('GET', `${K}future`)) === '1'; // the club page is online: the P.S. opens its door
  const m = renderNote(step, { email, name: person.n, free: person.f }, { live });
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
  // while it is off nothing is read, so the comparison group only holds people of the days the series ran
  if ((await redis('GET', `${K}on`)) !== '1' || !hasResend()) return { ok: true, off: true };
  const got = await ingest(now);
  await prune(now);
  const d = dayOf(now);
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
  if (want <= 0) return { ok: true, ...out };
  for (const p of ['yes', 'no']) { // who ticked the update box first
    if (want <= 0) break;
    const cands = (await redis('ZRANGEBYSCORE', `${K}pool:${p}`, now - 28 * 3600_000, now - 20 * 3600_000)) || [];
    for (let i = cands.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cands[i], cands[j]] = [cands[j], cands[i]]; }
    for (const email of cands) {
      if (want <= 0) break;
      await redis('ZREM', `${K}pool:${p}`, email);
      const w = JSON.parse((await redis('HGET', `${K}who`, email)) || 'null');
      await redis('HDEL', `${K}who`, email);
      if (!w || (await off(email)) || today.has(email) || (await redis('HEXISTS', `${K}people`, email))) continue;
      const person = { n: w.n, f: w.f, at: w.at, nl: w.nl, start: now, step: 0 };
      // once in a life: the HSETNX is the lock, a second tick can't start the same person
      if (Number(await redis('HSETNX', `${K}people`, email, JSON.stringify(person))) !== 1) continue;
      const r = await sendStep(email, person, 1, now);
      if (r === 'stop') { await redis('HDEL', `${K}people`, email); return { ok: true, stopped: d, ...out }; }
      if (r === 'fail') { await redis('HDEL', `${K}people`, email); continue; }
      person.step = 1; person.sent = [now];
      await redis('HSET', `${K}people`, email, JSON.stringify(person));
      await redis('ZADD', `${K}due`, now + OFFSETS[1] * DAY, email);
      for (const o of OFFSETS) await loadAdd(now + o * DAY, 1);
      await redis('INCR', `${K}s:${d}`); await redis('EXPIRE', `${K}s:${d}`, 2 * 86400);
      out.started++; want--;
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
  if (q.get('resetstat') === '1') { await redis('DEL', `${K}stat`); await redis('DEL', `${K}ev`); } // the counts of the test mails
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
