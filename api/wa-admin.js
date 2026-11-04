// /api/wa-admin?key=WA_ADMIN_KEY: Nico's private page for the WhatsApp bot.
// Bot on/off, excluded numbers, every chat with its state, and "give it back to the bot".
import { isEnabled, setEnabled, excluded, exclude, unexclude, chats, setStatus, monthCount, chatLog, digits } from './_lib/wa.js';

const h = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const STATUS = { bot: 'bot', waiting: 'aspetta te', nico: 'tua' };
const ok = (key) => process.env.WA_ADMIN_KEY && key === process.env.WA_ADMIN_KEY;

export async function POST(request) {
  const url = new URL(request.url);
  if (!ok(url.searchParams.get('key'))) return new Response('Forbidden', { status: 403 });
  const f = await request.formData();
  const a = f.get('a');
  const n = digits(f.get('n'));
  if (a === 'on') await setEnabled(true);
  if (a === 'off') await setEnabled(false);
  if (a === 'exclude' && n) await exclude(n);
  if (a === 'unexclude' && n) await unexclude(n);
  if (a === 'bot' && n) await setStatus(n, 'bot');
  if (a === 'nico' && n) await setStatus(n, 'nico');
  return Response.redirect(`${url.origin}${url.pathname}?key=${encodeURIComponent(url.searchParams.get('key'))}${f.get('open') ? `&open=${n}` : ''}`, 303);
}

export async function GET(request) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  if (!ok(key)) return new Response('Forbidden', { status: 403 });
  const [on, ex, list, count] = await Promise.all([isEnabled(), excluded(), chats(), monthCount()]);
  const open = digits(url.searchParams.get('open'));
  const log = open ? await chatLog(open, 60) : [];
  const btn = (a, n, label) => `<form method="post"><input type="hidden" name="a" value="${a}"><input type="hidden" name="n" value="${h(n)}"><button>${label}</button></form>`;
  const rows = list.map((c) => `<tr><td><a href="?key=${h(key)}&open=${h(c.n)}">${h(c.name || '')}</a><br><small>+${h(c.n)}</small></td><td>${STATUS[c.status] || h(c.status)}${c.reason ? `<br><small>${h(c.reason)}</small>` : ''}</td><td><small>${h(c.summary || '')}</small></td><td>${c.status === 'bot' ? btn('nico', c.n, 'prendo io') : btn('bot', c.n, 'ridai al bot')}<a href="https://wa.me/${h(c.n)}">apri</a></td></tr>`).join('');
  const chat = log.map((m) => `<p class="${m.r}"><b>${m.r}</b> ${h(m.t)}</p>`).join('');
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bot WhatsApp</title>
<style>body{font:15px -apple-system,system-ui,sans-serif;max-width:900px;margin:24px auto;padding:0 16px;color:#111}table{width:100%;border-collapse:collapse}td{border-top:1px solid #ddd;padding:8px 6px;vertical-align:top}form{display:inline;margin-right:6px}button{font:inherit;padding:4px 10px;border-radius:8px;border:1px solid #bbb;background:#fff}p{margin:4px 0}.lead{color:#111}.bot{color:#0a6}.nico{color:#06c}small{color:#666}</style>
<h1>Bot WhatsApp</h1>
<p>Bot <b>${on ? 'acceso' : 'spento'}</b> ${btn(on ? 'off' : 'on', '', on ? 'spegni' : 'accendi')} · messaggi del bot questo mese: ${count}</p>
<h2>Numeri esclusi</h2><p>${ex.map((n) => `+${h(n)} ${btn('unexclude', n, 'togli')}`).join('<br>') || 'nessuno'}</p>
<form method="post"><input type="hidden" name="a" value="exclude"><input name="n" placeholder="+39 333 1234567"> <button>escludi</button></form>
<p><small>Le chat che esistevano già quando hai collegato il numero, e i contatti salvati in rubrica, sono esclusi da soli.</small></p>
${open ? `<h2>Chat +${h(open)}</h2>${chat}` : ''}
<h2>Chat</h2><table>${rows || '<tr><td>ancora nessuna</td></tr>'}</table>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
