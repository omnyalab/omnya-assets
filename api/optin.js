// POST /api/optin — the free blueprint form (E3, 7/11): saves the name and email and sends the PDF.
// The form promises "only the email with your blueprint, no spam and nothing else", so this list
// is for our records and counts, not for newsletters. GET ?key=IG_ADMIN_KEY → the list as CSV.
import { sendMail } from './_lib/mail.js';
import { host } from './_lib/config.js';
import { redis, hasStore } from './_lib/store.js';

const SITE = 'https://www.omnyalab.com';
const FREE = {
  'free-tower': { name: 'The Tower Blueprint', file: '/learn/free/omnya-lab-tower-blueprint.pdf' },
  'free-3d': { name: 'The 3D to film Blueprint', file: '/learn/free/omnya-lab-3d-to-film-blueprint.pdf' },
  'free-city': { name: 'The City Blueprint', file: '/learn/free/omnya-lab-city-blueprint.pdf' },
  free: { name: 'The Blueprint', file: '/learn/free/omnya-lab-blueprint.pdf' },
};
const KEY = 'omnya:optin';
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });

function mailHtml(name, f) {
  return `<!doctype html><html><body style="margin:0;background:#05070a;font:16px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#fff">
<div style="max-width:520px;margin:0 auto;padding:40px 24px">
<p style="margin:0 0 28px;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#2997ff;font-weight:700">Omnya Lab</p>
<h1 style="margin:0 0 18px;font-size:28px;line-height:1.1;letter-spacing:-.02em">Here it is, ${esc(name)}.</h1>
<p style="margin:0 0 26px;color:#ffffffc0">${esc(f.name)}, the method in five steps. Open it next to your screen and follow it step by step.</p>
<p style="margin:0 0 30px"><a href="${SITE}${f.file}" style="display:inline-block;background:#2997ff;color:#fff;text-decoration:none;padding:14px 24px;border-radius:999px;font-weight:700">Download ${esc(f.name)}</a></p>
<p style="margin:0;color:#ffffff80;font-size:13px">You get this because you asked for it on omnyalab.com. This is the only email we send you.</p>
</div></body></html>`;
}

export async function POST(request) {
  let b;
  try { b = await request.json(); } catch { return json({ error: 'bad request' }, 400); }
  const name = String(b.name || '').trim().slice(0, 60);
  const email = String(b.email || '').trim().toLowerCase().slice(0, 120);
  const f = FREE[b.free];
  if (b.company) return json({ ok: true }); // the hidden field: a bot filled it
  if (!f || !name || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({ error: 'name, email and blueprint needed' }, 400);

  const row = { at: Date.now(), name, email, free: b.free, page: String(b.page || '').slice(0, 40), k: String(b.k || '').slice(0, 20) };
  if (hasStore()) {
    try { await redis('LPUSH', KEY, JSON.stringify(row)); } catch (e) { console.error('[optin] store', e); }
  }
  try {
    await sendMail({
      to: `${name} <${email}>`,
      replyTo: host.email,
      subject: `Your ${f.name.replace(/^The /, '')}`, // "Your Tower Blueprint", not "Your The Tower Blueprint"
      html: mailHtml(name, f),
      text: `Here it is, ${name}.\n\n${f.name}: ${SITE}${f.file}\n\nYou get this because you asked for it on omnyalab.com. This is the only email we send you.\n\nNico · Omnya Lab`,
    });
  } catch (e) {
    console.error('[optin] mail', e);
    return json({ error: 'mail failed' }, 502);
  }
  return json({ ok: true });
}

export async function GET(request) {
  const q = new URL(request.url).searchParams;
  const key = process.env.IG_ADMIN_KEY;
  if (!key || q.get('key') !== key) return new Response('Not found', { status: 404 });
  const rows = hasStore() ? (await redis('LRANGE', KEY, 0, -1)).map((r) => JSON.parse(r)) : [];
  const csv = ['date,name,email,blueprint,page,word', ...rows.map((r) => [new Date(r.at).toISOString(), r.name, r.email, r.free, r.page, r.k].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
  return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="omnya-optin.csv"' } });
}
