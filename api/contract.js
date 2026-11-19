// /api/contract — private contracts signed on omnyalab.com (19/11, Nico: "a private link only he can open, it has to
// hold up if they don't pay"). Each contract lives in Redis under a short slug (/contract/cubic-7k2m), never in this
// repo (the repo is public). Signing is a simple electronic signature with its evidence:
//   1. the page asks for a 6-digit code, sent to the email written in the contract (never to one typed on the page),
//      so the signer proves they hold the client's mailbox;
//   2. name, role, the drawn signature, the "I agree" box, date and time, IP, browser and the SHA-256 of the exact
//      text shown are saved together, and a copy goes by email to the client and to Omnya Lab.
// GET  ?slug=                         → the contract for the page (text, status)
// POST {action:'code', slug}          → sends the code
// POST {action:'sign', slug, code, name, role, signature, agree}
// PUT  ?key=IG_ADMIN_KEY  {slug, title, client, email, html}   → saves a contract (from the Mac)
// GET  ?key=IG_ADMIN_KEY&slug=&full=1                          → everything, signature and evidence included
import { createHash, randomInt } from 'node:crypto';
import { redis as upstash, hasStore } from './_lib/store.js';
import { sendMail } from './_lib/mail.js';

// local preview without Upstash: a small memory copy with the few commands used here
const MEM = new Map();
const local = async (c, k, ...a) => {
  const C = String(c).toUpperCase(), now = Date.now(), v = MEM.get(k);
  if (v && v.x && v.x <= now) MEM.delete(k);
  const cur = MEM.get(k);
  if (C === 'GET') return cur ? cur.v : null;
  if (C === 'SET') { const ex = a.map(String).map((s) => s.toUpperCase()).indexOf('EX'); MEM.set(k, { v: String(a[0]), x: ex >= 0 ? now + Number(a[ex + 1]) * 1000 : 0 }); return 'OK'; }
  if (C === 'INCR') { const n = Number(cur ? cur.v : 0) + 1; MEM.set(k, { v: String(n), x: cur ? cur.x : 0 }); return n; }
  if (C === 'EXPIRE') { if (cur) cur.x = now + Number(a[0]) * 1000; return cur ? 1 : 0; }
  if (C === 'DEL') return MEM.delete(k) ? 1 : 0;
  return null;
};
const redis = (...cmd) => (hasStore() ? upstash(...cmd) : local(...cmd));
const K = (slug) => `omnya:contract:${slug}`;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+){0,4}$/;
const NOTIFY = process.env.CONTRACT_NOTIFY || 'info@omnyalab.com';
const SITE = 'https://www.omnyalab.com';
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const sha = (s) => createHash('sha256').update(String(s)).digest('hex');
const admin = (url) => process.env.IG_ADMIN_KEY && url.searchParams.get('key') === process.env.IG_ADMIN_KEY;
const mask = (e) => String(e).replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + '•'.repeat(Math.min(6, b.length)) + c);
const ipOf = (req) => (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || '';

async function load(slug) {
  if (!SLUG.test(slug || '')) return null;
  const raw = await redis('GET', K(slug));
  return raw ? JSON.parse(raw) : null;
}
const save = (c) => redis('SET', K(c.slug), JSON.stringify(c));

export async function GET(req) {
  const url = new URL(req.url);
  const slug = url.searchParams.get('slug') || '';
  const c = await load(slug);
  if (!c) return json({ error: 'not_found' }, 404);
  if (admin(url) && url.searchParams.get('full')) return json(c);
  if (!c.firstOpened) { c.firstOpened = { at: new Date().toISOString(), ip: ipOf(req), ua: req.headers.get('user-agent') || '' }; await save(c); }
  return json({
    title: c.title, client: c.client, html: c.html, hash: c.hash, emailHint: mask(c.email),
    signed: c.signed ? { name: c.signed.name, role: c.signed.role, at: c.signed.at } : null,
  });
}

export async function PUT(req) {
  const url = new URL(req.url);
  if (!admin(url)) return json({ error: 'forbidden' }, 403);
  const b = await req.json();
  if (!SLUG.test(b.slug || '') || !b.html || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.email || '')) return json({ error: 'bad_input' }, 400);
  const old = await load(b.slug);
  if (old && old.signed && !url.searchParams.get('force')) return json({ error: 'already_signed' }, 409);
  const c = { slug: b.slug, title: String(b.title || 'Agreement'), client: String(b.client || ''), email: b.email.trim().toLowerCase(), html: String(b.html), hash: sha(b.html), createdAt: new Date().toISOString() };
  await save(c);
  return json({ ok: true, slug: c.slug, hash: c.hash, url: `${SITE}/contract/${c.slug}` });
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
    return json({ ok: true, sentTo: mask(c.email), ...(!hasStore() && !process.env.VERCEL ? { devCode: code } : {}) });
  }

  if (b.action === 'sign') {
    const tries = await redis('INCR', `${K(c.slug)}:tries`);
    if (tries > 8) return json({ error: 'too_many' }, 429);
    const want = await redis('GET', `${K(c.slug)}:code`);
    if (!want || want !== sha(`${c.slug}:${String(b.code || '').trim()}`)) return json({ error: 'bad_code' }, 400);
    const name = String(b.name || '').trim().slice(0, 120);
    const role = String(b.role || '').trim().slice(0, 120);
    const sig = String(b.signature || '');
    if (!name || !b.agree || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(sig) || sig.length > 400_000 || sig.length < 1500) return json({ error: 'bad_input' }, 400);
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
    await Promise.allSettled([
      sendMail({ to: c.email, subject: `Signed · ${c.title}`, text: `Thank you, the agreement is signed.\n\n${text}\n\nThe countersigned PDF follows from Omnya Lab.\n\nOmnya Lab`, html: htmlMail('Thank you, the agreement is signed. The countersigned PDF follows from Omnya Lab.'), attachments: att }),
      sendMail({ to: NOTIFY, subject: `✍️ Signed: ${c.title}`, text: `${text}\n\n${SITE}/contract/${c.slug}`, html: htmlMail(`<b>${esc(c.client)}</b> has signed.`), attachments: att }),
    ]);
    return json({ ok: true, signed: { name, role, at } });
  }

  return json({ error: 'bad_input' }, 400);
}
