// POST /api/optin — the free blueprint form (E3, 7/11): saves the name and email and sends the PDF.
// Each row keeps the consent (date, exact checkbox text, page): with the v1 text ("only the email with your
// blueprint") the person is NOT in the newsletter (api/_lib/newsletter.js). The emails are never sold.
// GET ?key=IG_ADMIN_KEY → everyone as CSV; &list=newsletter → only who accepted the newsletter and didn't leave.
// Meta (8/11): if the visitor accepted cookies, a server Lead with the same event_id as the browser one.
import { sendFreeMail as sendMail, hasM365 } from './_lib/mail.js';
import { host } from './_lib/config.js';
import { redis, hasStore } from './_lib/store.js';
import { CONSENT_TEXTS, OFF_KEY, unsubUrl } from './_lib/newsletter.js';
import { metaEvent } from './_lib/meta.js';
import { waitUntil } from '@vercel/functions';

const SITE = 'https://www.omnyalab.com';
const FREE = {
  'free-tower': { name: 'The Tower Blueprint', file: '/learn/free/omnya-lab-tower-blueprint.pdf' },
  'free-3d': { name: 'The 3D to film Blueprint', file: '/learn/free/omnya-lab-3d-to-film-blueprint.pdf' },
  'free-city': { name: 'The City Blueprint', file: '/learn/free/omnya-lab-city-blueprint.pdf' },
  'free-build': { name: 'The Build Blueprint', file: '/learn/free/omnya-lab-build-blueprint.pdf' },
  'free-towers': { name: 'The Towers Blueprint', file: '/learn/free/omnya-lab-towers-blueprint.pdf' },
  free: { name: 'The Blueprint', file: '/learn/free/omnya-lab-blueprint.pdf' },
};
const KEY = 'omnya:optin';
const FREE_CAP = hasM365() ? Number(process.env.FREE_MAIL_CAP || 5000) : Number(process.env.FREE_MAIL_CAP || 65); // free blueprint emails a day; with Resend Pro set FREE_MAIL_CAP on Vercel to 1500
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });

function mailHtml(name, f, unsub) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#05070a" bgcolor="#05070a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#05070a" style="background:#05070a"><tr><td align="center" bgcolor="#05070a" style="background:#05070a">
<div style="max-width:520px;margin:0 auto;padding:40px 24px;text-align:left;background:#05070a;font:16px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#ffffff">
<p style="margin:0 0 28px;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#2997ff;font-weight:700">Omnya Lab</p>
<h1 style="margin:0 0 18px;font-size:28px;line-height:1.1;letter-spacing:-.02em;color:#ffffff">Here it is, ${esc(name)}.</h1>
<p style="margin:0 0 26px;color:#c7cad1">${esc(f.name)}, the method in five steps. Open it next to your screen and follow it step by step.</p>
<p style="margin:0 0 30px"><a href="${SITE}${f.file}" style="display:inline-block;background:#2997ff;color:#fff;text-decoration:none;padding:14px 24px;border-radius:999px;font-weight:700">Download ${esc(f.name)}</a></p>
<p style="margin:0 0 30px;color:#c7cad1;font-size:14px">The photos and clips in our guides are made on Higgsfield, and right now new users get unlimited generations inside Claude with Higgsfield MCP: <a href="https://higgsfield.ai?fpr=omnya-5b7f71" style="color:#2997ff">higgsfield.ai</a> (affiliate link, it costs you nothing more)</p>
<p style="margin:0;color:#8b9099;font-size:13px">You get this because you asked for it on omnyalab.com. No spam, ever. <a href="${unsub}" style="color:#8b9099">Unsubscribe</a> in one click.</p>
</div></td></tr></table></body></html>`;
}

export async function POST(request) {
  let b;
  try { b = await request.json(); } catch { return json({ error: 'bad request' }, 400); }
  const name = String(b.name || '').trim().slice(0, 60);
  const email = String(b.email || '').trim().toLowerCase().slice(0, 120);
  const f = FREE[b.free];
  if (b.company) return json({ ok: true }); // the hidden field: a bot filled it
  if (!f || !name || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({ error: 'name, email and blueprint needed' }, 400);

  const page = String(b.page || '').slice(0, 40);
  const cv = CONSENT_TEXTS[b.cv] ? b.cv : 'v1'; // the checkbox version the form showed
  const newsletter = CONSENT_TEXTS[cv].newsletter && b.nl === true; // only a ticked box (v3: the box starts empty)
  const consent = { at: new Date().toISOString(), version: cv, text: newsletter ? CONSENT_TEXTS[cv].text : CONSENT_TEXTS[cv].base || CONSENT_TEXTS[cv].text, page, newsletter };
  const row = { at: Date.now(), name, email, free: b.free, page, k: String(b.k || '').slice(0, 20), consent };
  if (hasStore()) {
    try {
      await redis('LPUSH', KEY, JSON.stringify(row));
      if (consent.newsletter) await redis('SREM', OFF_KEY, email); // signed up again: back in
    } catch (e) { console.error('[optin] store', e); }
  }
  if (b.ads === true && /^[a-z0-9_-]{6,60}$/i.test(String(b.eid || ''))) {
    await metaEvent({
      name: 'Lead', id: String(b.eid), url: `https://www.omnyalab.com/${page}`, email, firstName: name, content: b.free,
      ip: (request.headers.get('x-forwarded-for') || '').split(',')[0].trim(), ua: request.headers.get('user-agent') || '',
      fbp: String(b.fbp || '').slice(0, 120) || undefined,
    }).catch((e) => console.error('[optin] meta', e));
  }
  // 11/11 (a buyer from Brazil paid and got no email): Resend's free plan sends 100 emails a day and the free blueprints
  // were using all of them, so the PDFs of who PAID never left. The free email now stops at FREE_CAP a day (UTC), and
  // the rest of the quota stays for the paid ones, the bookings and Nico's notices. Over the cap the form answers
  // 'mail later' and the page goes on as when a mail fails: the free PDF opens on the next page (components/OptIn.astro).
  if (hasStore()) {
    try {
      const day = `omnya:mail:free:${new Date().toISOString().slice(0, 10)}`;
      const n = await redis('INCR', day);
      if (n === 1) await redis('EXPIRE', day, 172800);
      if (n > FREE_CAP) {
        await redis('LPUSH', 'omnya:mail:owed', JSON.stringify({ at: Date.now(), name, email, free: b.free })).catch(() => {}); // to send when the quota is bigger
        return json({ error: 'mail later' }, 503);
      }
    } catch (e) { console.error('[optin] cap', e); }
  }
  try {
    await sendMail({
      to: `${name} <${email}>`,
      replyTo: host.email,
      subject: `Your ${f.name.replace(/^The /, '')}`, // "Your Tower Blueprint", not "Your The Tower Blueprint"
      html: mailHtml(name, f, unsubUrl(email)),
      headers: { 'List-Unsubscribe': `<${unsubUrl(email)}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      text: `Here it is, ${name}.\n\n${f.name}: ${SITE}${f.file}\n\nYou get this because you asked for it on omnyalab.com. No spam, ever. Unsubscribe in one click: ${unsubUrl(email)}\n\nNico · Omnya Lab`,
    });
  } catch (e) {
    console.error('[optin] mail', e);
    return json({ error: 'mail failed' }, 502);
  }
  // 13/11 night (Nico: "they must always arrive"): the people held back by the old daily cap get their email now,
  // a few at a time after each new send, oldest first, once each (omnya:mail:owed:sent), within the day's cap
  if (hasStore()) waitUntil(drainOwed(hasM365() ? 10 : 3).catch((e) => console.error('[optin] owed', e))); // after the answer: the visitor never waits
  return json({ ok: true });
}

async function drainOwed(max) {
  const day = `omnya:mail:free:${new Date().toISOString().slice(0, 10)}`;
  for (let i = 0; i < max; i++) {
    if (Number(await redis('GET', day)) >= FREE_CAP) return;
    const raw = await redis('RPOP', 'omnya:mail:owed');
    if (!raw) return;
    let o; try { o = JSON.parse(raw); } catch { continue; }
    const f = FREE[o.free], email = String(o.email || '').toLowerCase();
    if (!f || !email) continue;
    if (Number(await redis('SADD', 'omnya:mail:owed:sent', `${email}|${o.free}`)) !== 1) continue; // already sent
    await redis('INCR', day);
    try {
      await sendMail({
        to: `${o.name} <${email}>`, replyTo: host.email, subject: `Your ${f.name.replace(/^The /, '')}`,
        html: mailHtml(o.name, f, unsubUrl(email)),
        headers: { 'List-Unsubscribe': `<${unsubUrl(email)}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
        text: `Here it is, ${o.name}.\n\n${f.name}: ${SITE}${f.file}\n\nNico · Omnya Lab`,
      });
    } catch (e) {
      await redis('SREM', 'omnya:mail:owed:sent', `${email}|${o.free}`).catch(() => {});
      await redis('RPUSH', 'omnya:mail:owed', raw).catch(() => {});
      return;
    }
  }
}

export async function GET(request) {
  const q = new URL(request.url).searchParams;
  const key = process.env.IG_ADMIN_KEY;
  if (!key || q.get('key') !== key) return new Response('Not found', { status: 404 });
  let rows = hasStore() ? (await redis('LRANGE', KEY, 0, -1)).map((r) => JSON.parse(r)) : [];
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  if (q.get('list') === 'newsletter') {
    // only who ticked a newsletter text, the latest sign-up per email, minus who unsubscribed
    const off = new Set(hasStore() ? await redis('SMEMBERS', OFF_KEY) : []);
    const seen = new Set();
    rows = rows.filter((r) => r.consent?.newsletter && !off.has(r.email) && !seen.has(r.email) && seen.add(r.email));
    const csv = ['email,name,consent_date,consent_text,page,unsubscribe_link', ...rows.map((r) => [r.email, r.name, r.consent.at, r.consent.text, r.consent.page, unsubUrl(r.email)].map(cell).join(','))].join('\n');
    return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="omnya-newsletter.csv"' } });
  }
  const csv = ['date,name,email,blueprint,page,word,consent_version,newsletter', ...rows.map((r) => [new Date(r.at).toISOString(), r.name, r.email, r.free, r.page, r.k, r.consent?.version || 'v1', r.consent?.newsletter ? 'yes' : 'no'].map(cell).join(','))].join('\n');
  return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="omnya-optin.csv"' } });
}
