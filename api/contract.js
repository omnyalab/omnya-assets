// /api/contract — private contracts signed on omnyalab.com (19/11, Nico: "a private link only he can open, it has to
// hold up if they don't pay"). Each contract lives in Redis under a short slug (/contract/cubic-7k2m), never in this
// repo (the repo is public). Signing is a simple electronic signature with its evidence:
//   1. the page asks for a 6-digit code, sent to the email written in the contract (never to one typed on the page),
//      so the signer proves they hold the client's mailbox;
//   2. name, role, the drawn signature, the "I agree" box, date and time, IP, browser and the SHA-256 of the exact
//      text shown are saved together, and a copy goes by email to the client and to Omnya Lab.
// 20/11 (Nico: "can't contracts already be signed automatically? and remind them to sign, otherwise we don't start"):
//   - contracts arrive already signed by Nico (the Mac tool ~/Omnya Automazioni/contratti/nuovo.py stamps his signature);
//   - every open is counted (first, last, how many, the client's time zone), except the preview link (?p=<peek>);
//   - reminders by email 24 and 72 hours after the link was sent (or first opened, whichever comes first), only between
//     9:00 and 19:00 of the client's time zone and never on Sunday; after the second one Nico gets an email too.
//     Real clients get them only once Nico has approved the texts (the switch omnya:contracts:remind = 1); test
//     contracts always. The hourly Vercel cron calls GET ?tick=1.
//   - omnya:contracts is a small hash (slug → summary, no text, no signature image): the list Tana reads.
// GET  ?slug=[&p=peek]                → the contract for the page (text, status)
// POST {action:'code', slug}          → sends the code
// POST {action:'sign', slug, code, name, role, signature, agree}
// PUT  ?key=IG_ADMIN_KEY  {slug, title, client, email, html, contact, phone, project, goal, tz, test, internal, remind, sentAt}
// PATCH ?key=IG_ADMIN_KEY&slug=  {sentAt:'now'|iso|null, remindFrom:iso|null, remind, contact, phone, project, goal, tz, internal}
// PATCH ?key=IG_ADMIN_KEY&remind=on|off                         → reminders to real clients on or off
// GET  ?key=IG_ADMIN_KEY&slug=&full=1                          → everything, signature and evidence included
// GET  ?key=IG_ADMIN_KEY&list=1[&rebuild=1]                    → the summaries (rebuild: from the contracts in Redis)
// GET  ?tick=1[&key=…&now=iso]                                 → sends the reminders that are due (now= only for test contracts)
import { createHash, randomInt, randomBytes } from 'node:crypto';
import { redis as upstash, hasStore } from './_lib/store.js';
import { sendMail } from './_lib/mail.js';

// local preview without Upstash: a small memory copy with the few commands used here
const MEM = new Map();
const local = async (c, k, ...a) => {
  const C = String(c).toUpperCase(), now = Date.now(), v = MEM.get(k);
  if (v && v.x && v.x <= now) MEM.delete(k);
  const cur = MEM.get(k);
  if (C === 'GET') return cur ? cur.v : null;
  if (C === 'SET') {
    const up = a.map(String).map((s) => s.toUpperCase()), ex = up.indexOf('EX');
    if (up.includes('NX') && cur) return null;
    MEM.set(k, { v: String(a[0]), x: ex >= 0 ? now + Number(a[ex + 1]) * 1000 : 0 }); return 'OK';
  }
  if (C === 'INCR') { const n = Number(cur ? cur.v : 0) + 1; MEM.set(k, { v: String(n), x: cur ? cur.x : 0 }); return n; }
  if (C === 'EXPIRE') { if (cur) cur.x = now + Number(a[0]) * 1000; return cur ? 1 : 0; }
  if (C === 'DEL') return MEM.delete(k) ? 1 : 0;
  if (C === 'HSET') { const h = cur ? cur.v : new Map(); for (let i = 0; i < a.length; i += 2) h.set(String(a[i]), String(a[i + 1])); MEM.set(k, { v: h, x: 0 }); return 1; }
  if (C === 'HGETALL') return cur ? [...cur.v].flat() : [];
  if (C === 'HDEL') return cur && cur.v.delete(String(a[0])) ? 1 : 0;
  if (C === 'SCAN') return ['0', [...MEM.keys()].filter((x) => x.startsWith('omnya:contract:'))];
  return null;
};
const redis = (...cmd) => (hasStore() ? upstash(...cmd) : local(...cmd));
const K = (slug) => `omnya:contract:${slug}`;
const IDX = 'omnya:contracts';            // hash slug → summary (JSON), what Tana and the reminders read
const ON = 'omnya:contracts:remind';      // '1' = reminders to real clients are on (texts approved by Nico)
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+){0,4}$/;
const NOTIFY = process.env.CONTRACT_NOTIFY || 'info@omnyalab.com';
const SITE = 'https://www.omnyalab.com';
const H1 = 24, H2 = 72;                    // hours after the link was sent (or first opened) for the two reminders
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const sha = (s) => createHash('sha256').update(String(s)).digest('hex');
const admin = (url) => process.env.IG_ADMIN_KEY && url.searchParams.get('key') === process.env.IG_ADMIN_KEY;
const mask = (e) => String(e).replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + '•'.repeat(Math.min(6, b.length)) + c);
const ipOf = (req) => (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || '';
const where = (req) => ({ tz: req.headers.get('x-vercel-ip-timezone') || '', country: req.headers.get('x-vercel-ip-country') || '' });
const link = (c) => `${SITE}/contract/${c.slug}`;
const short = (c) => `omnyalab.com/contract/${c.slug}`;
const iso = (ms = Date.now()) => new Date(ms).toISOString();

async function load(slug) {
  if (!SLUG.test(slug || '')) return null;
  const raw = await redis('GET', K(slug));
  return raw ? JSON.parse(raw) : null;
}
// the summary: everything Tana and the reminders need, without the text and the signature image
const meta = (c) => ({
  slug: c.slug, title: c.title, client: c.client, email: c.email, contact: c.contact || '', phone: c.phone || '',
  project: c.project || '', goal: c.goal || '', tz: c.tz || '', test: !!c.test, internal: !!c.internal, remind: c.remind !== false,
  createdAt: c.createdAt, sentAt: c.sentAt || null, remindFrom: c.remindFrom || null,
  firstOpened: c.firstOpened ? { at: c.firstOpened.at, tz: c.firstOpened.tz || '', country: c.firstOpened.country || '' } : null,
  lastOpened: c.lastOpened || (c.firstOpened ? c.firstOpened.at : null), opens: c.opens || (c.firstOpened ? 1 : 0),
  signed: c.signed ? { name: c.signed.name, role: c.signed.role, at: c.signed.at } : null,
  reminders: c.reminders || [], nicoAlert: c.nicoAlert || null, peek: c.peek || '',
});
const save = async (c) => { await redis('SET', K(c.slug), JSON.stringify(c)); await redis('HSET', IDX, c.slug, JSON.stringify(meta(c))); };
async function summaries() {
  const flat = (await redis('HGETALL', IDX)) || [];
  const out = [];
  for (let i = 0; i < flat.length; i += 2) { try { out.push(JSON.parse(flat[i + 1])); } catch {} }
  return out.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

// ---------- reminders ----------
// remindFrom (set by hand) wins: e.g. a client out of office until Monday
const startOf = (m) => (m.remindFrom && Number.isFinite(Date.parse(m.remindFrom)) ? Date.parse(m.remindFrom)
  : Math.min(...[m.sentAt, m.firstOpened && m.firstOpened.at].filter(Boolean).map(Date.parse).filter(Number.isFinite)));
function due(m, now) {
  const start = startOf(m);
  if (!Number.isFinite(start)) return 0;                     // never sent, never opened: nothing to remind yet
  const h = (now - start) / 36e5, have = new Set((m.reminders || []).map((r) => r.n));
  const last = Math.max(0, ...(m.reminders || []).map((r) => Date.parse(r.at) || 0));
  if (h >= H2 && !have.has(2) && now - last >= 20 * 36e5) return 2;   // never two reminders within a day
  if (h >= H1 && !have.has(1) && !have.has(2)) return 1;
  return 0;
}
function daytime(now, tz) {
  const f = (zone) => new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: 'numeric', hourCycle: 'h23', weekday: 'short' }).formatToParts(new Date(now));
  let p;
  try { p = f(tz || 'Europe/Rome'); } catch { p = f('Europe/Rome'); }
  const hour = Number(p.find((x) => x.type === 'hour').value), day = p.find((x) => x.type === 'weekday').value;
  return day !== 'Sun' && hour >= 9 && hour < 19;
}
const fromNico = () => {
  const addr = (process.env.BOOKING_FROM || 'Omnya Lab <booking@omnyalab.com>').match(/<([^>]+)>/);
  return `Nico · Omnya Lab <${addr ? addr[1] : 'booking@omnyalab.com'}>`;
};
const para = (lines) => `<div style="font:15px/1.55 -apple-system,Helvetica,Arial,sans-serif;color:#111;max-width:560px">${lines.map((l) => `<p style="margin:0 0 14px">${l}</p>`).join('')}</div>`;

// the two emails to the client (texts approved by Nico on …, see docs/CONTRACTS.md)
export function reminderMail(c, n) {
  const hi = c.contact ? `Hi ${c.contact},` : 'Hi,';
  const what = c.project || c.title;
  const a = `<a href="${link(c)}" style="color:#111">${short(c)}</a>`;
  if (n === 1) return {
    subject: `Your ${what} agreement is ready to sign`,
    text: `${hi}\n\nYour ${what} agreement is ready, it takes a minute to sign from your phone:\n${link(c)}\n\nWe start the day it's signed and the first payment is in, so the sooner it's done, the sooner you see the first preview.\n\nCan you sign it today?\n\nNico\nOmnya Lab`,
    html: para([esc(hi), `Your ${esc(what)} agreement is ready, it takes a minute to sign from your phone:<br>${a}`, 'We start the day it’s signed and the first payment is in, so the sooner it’s done, the sooner you see the first preview.', 'Can you sign it today?', 'Nico<br>Omnya Lab']),
  };
  const goal = c.goal ? `Are you still looking to ${c.goal}?` : `Are you still looking to get the ${what} project started?`;
  return {
    subject: c.contact ? `Still on, ${c.contact}?` : 'Still on?',
    text: `${hi}\n\n${goal}\n\nIf yes, it's one signature here and we start as soon as the first payment is in:\n${link(c)}\n\nIf something in the agreement doesn't work for you, just reply and tell me what, and we'll sort it out.\n\nNico\nOmnya Lab`,
    html: para([esc(hi), esc(goal), `If yes, it’s one signature here and we start as soon as the first payment is in:<br>${a}`, 'If something in the agreement doesn’t work for you, just reply and tell me what, and we’ll sort it out.', 'Nico<br>Omnya Lab']),
  };
}
function nicoMail(c) {
  const m = meta(c), fmt = (s) => (s ? new Date(s).toLocaleString('it-IT', { timeZone: 'Europe/Rome', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
  const righe = [
    `Il contratto di <b>${esc(c.client)}</b> (${esc(c.email)}) non è ancora firmato dopo 3 giorni: è partito il secondo promemoria.`,
    `Mandato: ${fmt(m.sentAt)} · aperto ${m.opens} ${m.opens === 1 ? 'volta' : 'volte'}${m.lastOpened ? `, l'ultima ${fmt(m.lastOpened)}` : ''} · promemoria: ${(m.reminders || []).map((r) => `${r.n}° ${fmt(r.at)}`).join(', ')}`,
    'Adesso tocca a te: una chiamata o un messaggio. Il messaggio WhatsApp pronto è in Tana.',
    `<a href="${link(c)}">${short(c)}</a>`,
  ];
  return { to: NOTIFY, subject: `⏳ Non firmato da 3 giorni: ${c.title}`, text: righe.join('\n\n').replace(/<[^>]+>/g, ''), html: para(righe) };
}

async function tick(url) {
  const fake = admin(url) && url.searchParams.get('now') ? Date.parse(url.searchParams.get('now')) : NaN;
  const on = (await redis('GET', ON)) === '1';
  const done = [];
  for (const m of await summaries()) {
    if (m.signed || m.internal || m.remind === false || (!m.test && !on)) continue;
    const now = m.test && Number.isFinite(fake) ? fake : Date.now();
    const n = due(m, now);
    if (!n || !daytime(now, (m.firstOpened && m.firstOpened.tz) || m.tz)) continue;
    const lock = `${K(m.slug)}:r${n}`;
    if ((await redis('SET', lock, '1', 'NX', 'EX', 60 * 86400)) !== 'OK') continue;   // the cron and a manual tick never both send
    const c = await load(m.slug);
    if (!c || c.signed) continue;
    try {
      await sendMail({ from: fromNico(), replyTo: NOTIFY, to: c.email, ...reminderMail(c, n) });
    } catch (e) {
      await redis('DEL', lock);
      done.push({ slug: c.slug, n, error: String(e && e.message).slice(0, 200) });
      continue;
    }
    const at = iso(now);
    c.reminders = [...(c.reminders || []), { n, at, to: c.email, via: 'email' }];
    if (n === 2) { c.nicoAlert = at; await sendMail(nicoMail(c)).catch((e) => console.error('[contract] nico alert', e.message)); }
    await save(c);
    done.push({ slug: c.slug, n, to: mask(c.email) });
  }
  if (done.length) console.log('[contract] reminders', JSON.stringify(done));
  return { ok: true, on, done };
}

async function rebuild() {
  let cur = '0', n = 0;
  do {
    const [next, keys] = await redis('SCAN', cur, 'MATCH', 'omnya:contract:*', 'COUNT', 500);
    for (const k of keys) {
      const slug = k.slice('omnya:contract:'.length);
      if (!SLUG.test(slug)) continue;
      const c = await load(slug);
      if (c && c.html) { await redis('HSET', IDX, slug, JSON.stringify(meta(c))); n++; }
    }
    cur = String(next);
  } while (cur !== '0');
  return n;
}

const pick = (b) => {
  const o = {};
  for (const f of ['contact', 'project', 'goal', 'tz']) if (typeof b[f] === 'string') o[f] = b[f].trim().slice(0, 200);
  if (typeof b.phone === 'string') o.phone = b.phone.replace(/\D/g, '').slice(0, 20);
  for (const f of ['internal', 'remind']) if (typeof b[f] === 'boolean') o[f] = b[f];
  for (const f of ['sentAt', 'remindFrom']) {
    if (b[f] === null) o[f] = null;
    else if (b[f] === 'now') o[f] = iso();
    else if (typeof b[f] === 'string' && Number.isFinite(Date.parse(b[f]))) o[f] = iso(Date.parse(b[f]));
  }
  return o;
};

export async function GET(req) {
  const url = new URL(req.url);
  if (url.searchParams.has('tick') || /vercel-cron/i.test(req.headers.get('user-agent') || '')) return json(await tick(url));
  if (admin(url) && url.searchParams.get('list')) {
    const rebuilt = url.searchParams.get('rebuild') ? await rebuild() : undefined;
    return json({ ok: true, now: iso(), remindOn: (await redis('GET', ON)) === '1', hours: [H1, H2], rebuilt, contracts: await summaries() });
  }
  const slug = url.searchParams.get('slug') || '';
  const c = await load(slug);
  if (!c) return json({ error: 'not_found' }, 404);
  if (admin(url) && url.searchParams.get('full')) return json(c);
  const preview = !!c.peek && url.searchParams.get('p') === c.peek;   // Nico's preview link: it doesn't count as an open
  if (!preview && !c.signed) {
    const at = iso();
    if (!c.firstOpened) c.firstOpened = { at, ip: ipOf(req), ua: req.headers.get('user-agent') || '', ...where(req) };
    c.opens = (c.opens || (c.lastOpened || c.firstOpened.at !== at ? 1 : 0)) + 1;
    c.lastOpened = at;
    await save(c);
  }
  return json({
    title: c.title, client: c.client, html: c.html, hash: c.hash, emailHint: mask(c.email), preview,
    signed: c.signed ? { name: c.signed.name, role: c.signed.role, at: c.signed.at, signature: c.signed.signature } : null,
  });
}

export async function PUT(req) {
  const url = new URL(req.url);
  if (!admin(url)) return json({ error: 'forbidden' }, 403);
  const b = await req.json();
  if (!SLUG.test(b.slug || '') || !b.html || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.email || '')) return json({ error: 'bad_input' }, 400);
  const old = await load(b.slug);
  if (old && old.signed && !url.searchParams.get('force')) return json({ error: 'already_signed' }, 409);
  // a corrected text keeps the history of the link (sent, opens, reminders) unless ?reset=1
  const keep = old && !url.searchParams.get('reset')
    ? Object.fromEntries(['sentAt', 'remindFrom', 'firstOpened', 'lastOpened', 'opens', 'reminders', 'nicoAlert'].filter((f) => old[f] != null).map((f) => [f, old[f]]))
    : {};
  const c = {
    slug: b.slug, test: !!b.test, title: String(b.title || 'Agreement'), client: String(b.client || ''), email: b.email.trim().toLowerCase(),
    html: String(b.html), hash: sha(b.html), createdAt: (old && old.createdAt) || iso(), updatedAt: old ? iso() : undefined,
    peek: (old && old.peek) || randomBytes(6).toString('hex'), ...keep, ...pick(b),
  };
  await save(c);
  return json({ ok: true, slug: c.slug, hash: c.hash, url: link(c), preview: `${link(c)}?p=${c.peek}` });
}

export async function PATCH(req) {
  const url = new URL(req.url);
  if (!admin(url)) return json({ error: 'forbidden' }, 403);
  const sw = url.searchParams.get('remind');
  if (sw) { if (sw === 'on') await redis('SET', ON, '1'); else await redis('DEL', ON); return json({ ok: true, remindOn: sw === 'on' }); }
  const c = await load(url.searchParams.get('slug') || '');
  if (!c) return json({ error: 'not_found' }, 404);
  let b = {};
  try { b = await req.json(); } catch {}
  Object.assign(c, pick(b));
  for (const f of ['sentAt', 'remindFrom']) if (c[f] === null) delete c[f];
  await save(c);
  return json({ ok: true, contract: meta(c) });
}

export async function POST(req) {
  let b;
  try { b = await req.json(); } catch { return json({ error: 'bad_input' }, 400); }
  const c = await load(b.slug);
  if (!c) return json({ error: 'not_found' }, 404);
  if (c.signed) return json({ error: 'already_signed', signed: { name: c.signed.name, role: c.signed.role, at: c.signed.at } }, 409);

  if (b.action === 'code') {
    const n = await redis('INCR', `${K(c.slug)}:codes`);
    if (n === 1) await redis('EXPIRE', `${K(c.slug)}:codes`, 3600);
    if (n > 6) return json({ error: 'too_many' }, 429);
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await redis('SET', `${K(c.slug)}:code`, sha(`${c.slug}:${code}`), 'EX', 900);
    await redis('DEL', `${K(c.slug)}:tries`);
    await sendMail({
      to: c.email,
      subject: `${code} is your signing code · ${c.title}`,
      text: `Your code to sign "${c.title}" on omnyalab.com is ${code}\n\nIt works for 15 minutes. If you didn't ask for it, just ignore this email.\n\nOmnya Lab`,
      html: `<div style="font:15px/1.5 -apple-system,Helvetica,Arial,sans-serif;color:#111">Your code to sign <b>${esc(c.title)}</b> on omnyalab.com is<div style="font-size:32px;font-weight:600;letter-spacing:6px;margin:14px 0">${code}</div>It works for 15 minutes. If you didn't ask for it, just ignore this email.<br><br>Omnya Lab</div>`,
    });
    // local preview only (no Upstash, no Vercel): the code comes back so the page can be tried without email
    return json({ ok: true, sentTo: mask(c.email), ...((!hasStore() && !process.env.VERCEL) || c.test ? { devCode: code } : {}) });
  }

  if (b.action === 'sign') {
    const tries = await redis('INCR', `${K(c.slug)}:tries`);
    if (tries > 8) return json({ error: 'too_many' }, 429);
    const want = await redis('GET', `${K(c.slug)}:code`);
    if (!want || want !== sha(`${c.slug}:${String(b.code || '').trim()}`)) return json({ error: 'bad_code' }, 400);
    const name = String(b.name || '').trim().slice(0, 120);
    const role = String(b.role || '').trim().slice(0, 120);
    const sig = String(b.signature || '');
    if (!name || !b.agree || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(sig) || sig.length > 400_000 || sig.length < 400) return json({ error: 'bad_input' }, 400);
    if (b.hash && b.hash !== c.hash) return json({ error: 'changed' }, 409);
    const at = new Date().toISOString();
    c.signed = {
      name, role, at, email: c.email, ip: ipOf(req), ua: req.headers.get('user-agent') || '',
      agreeText: String(b.agreeText || '').slice(0, 300), hash: c.hash, signature: sig, method: 'email code + drawn signature',
    };
    await save(c);
    await redis('DEL', `${K(c.slug)}:code`);
    const when = new Date(at).toUTCString();
    const rows = [['Agreement', c.title], ['Client', c.client], ['Signed by', `${name}${role ? `, ${role}` : ''}`], ['Email verified', c.email], ['Date and time', when], ['IP address', c.signed.ip], ['Document fingerprint (SHA-256)', c.hash]];
    const table = rows.map(([k, v]) => `<tr><td style="padding:6px 14px 6px 0;color:#666;vertical-align:top">${esc(k)}</td><td style="padding:6px 0">${esc(v)}</td></tr>`).join('');
    const htmlMail = (intro) => `<div style="font:15px/1.5 -apple-system,Helvetica,Arial,sans-serif;color:#111">${intro}<table style="border-collapse:collapse;margin:16px 0;font-size:14px">${table}</table><div style="margin:8px 0 4px;color:#666;font-size:13px">Signature</div><img src="cid:sig" alt="signature" style="max-width:320px;border-bottom:1px solid #ccc"><br><br>Omnya Lab · omnyalab.com</div>`;
    const att = [{ filename: 'signature.png', content: sig.split(',')[1], encoding: 'base64', cid: 'sig' }];
    const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n');
    const thanks = `Thank you, the agreement is signed. You can open it with both signatures at any time at ${link(c)}, and we start as soon as the first payment is in.`;
    await Promise.allSettled([
      sendMail({ to: c.email, subject: `Signed · ${c.title}`, text: `${thanks}\n\n${text}\n\nOmnya Lab`, html: htmlMail(`Thank you, the agreement is signed. You can open it with both signatures at any time at <a href="${link(c)}" style="color:#111">${short(c)}</a>, and we start as soon as the first payment is in.`), attachments: att }),
      sendMail({ to: NOTIFY, subject: `✍️ Signed: ${c.title}`, text: `${text}\n\n${link(c)}`, html: htmlMail(`<b>${esc(c.client)}</b> has signed.`), attachments: att }),
    ]);
    return json({ ok: true, signed: { name, role, at, signature: sig } });
  }

  return json({ error: 'bad_input' }, 400);
}
