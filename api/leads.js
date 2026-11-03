// GET /api/leads?key=… → Nico's private list of the people the Instagram bot talked to.
// The key lives only in the Vercel env var IG_ADMIN_KEY.
// &action=subscribe switches the webhook on for @omnyalab (once, after the token is set).
import { listLeads, api } from './_lib/ig.js';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const stages = {
  new: 'Nuovo',
  opened: 'DM mandato, non ha toccato',
  nodm: 'DM bloccato, gli abbiamo scritto sotto',
  asked_follow: 'Deve seguirci',
  asked: 'Ha il Blueprint',
  project: 'Ha un progetto',
  curious: 'Solo curioso',
};

const when = (ms) => (ms ? new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(ms) : '');

export async function GET(request) {
  const q = new URL(request.url).searchParams;
  const key = process.env.IG_ADMIN_KEY;
  if (!key || q.get('key') !== key) return new Response('Not found', { status: 404 });

  if (q.get('action') === 'subscribe') {
    try {
      const r = await api('me/subscribed_apps', { method: 'POST', query: { subscribed_fields: 'comments,messages,messaging_postbacks,messaging_seen' } });
      return new Response(JSON.stringify(r), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 502, headers: { 'Content-Type': 'application/json' } });
    }
  }

  const leads = await listLeads();
  const count = (f) => leads.filter(f).length;
  const stats = [
    ['Contatti', leads.length],
    ['Hanno il Blueprint', count((l) => ['asked', 'project', 'curious'].includes(l.stage))],
    ['Nuovi follower', count((l) => l.follows && l.wasAskedFollow)],
    ['Con un progetto', count((l) => l.interest === 'project')],
  ];
  const rows = leads
    .map((l) => {
      const who = l.username ? `<a href="https://www.instagram.com/${esc(l.username)}/">@${esc(l.username)}</a>` : esc(l.id);
      const reel = l.permalink ? `<a href="${esc(l.permalink)}">${esc(l.word || 'reel')}</a>` : esc(l.word || '');
      const flags = [l.follows === true ? 'segue' : l.follows === false ? 'non segue' : '', l.human ? 'stai scrivendo tu' : '', l.nudged ? 'follow-up' : '', l.reminded ? 'promemoria' : ''].filter(Boolean).join(' · ');
      return `<tr class="${l.interest === 'project' ? 'hot' : ''}"><td>${when(l.at)}</td><td>${who}</td><td>${reel}</td><td>${esc(stages[l.stage] || l.stage)}${flags ? `<small>${esc(flags)}</small>` : ''}</td><td>${esc(l.wrote || l.comment || '')}</td></tr>`;
    })
    .join('');

  const html = `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Contatti Instagram</title>
<style>
:root{--bg:#edeae4;--ink:#111;--mute:#6b6761;--line:#d9d4cb;--accent:#b8613c}
@media (prefers-color-scheme:dark){:root{--bg:#141312;--ink:#f1eee8;--mute:#9b968e;--line:#2c2a27}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.45 -apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',Helvetica,Arial,sans-serif}
main{max-width:1100px;margin:0 auto;padding:40px 16px}
p.k{margin:0 0 8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--mute)}
h1{margin:0 0 28px;font-size:34px;letter-spacing:-.03em;font-weight:600}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:32px}
.stats div{border:1px solid var(--line);border-radius:16px;padding:16px}.stats b{display:block;font-size:30px;font-weight:600;letter-spacing:-.02em}.stats span{color:var(--mute);font-size:13px}
.wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;min-width:720px}
th{text-align:left;font-size:12px;font-weight:500;color:var(--mute);padding:8px 10px;border-bottom:1px solid var(--line)}
td{padding:12px 10px;border-bottom:1px solid var(--line);vertical-align:top}td small{display:block;color:var(--mute);font-size:12px}
td:first-child{white-space:nowrap;color:var(--mute)}a{color:inherit}tr.hot td:nth-child(4){color:var(--accent);font-weight:600}
.empty{color:var(--mute);padding:24px 0}
</style></head><body><main>
<p class="k">Omnya Lab · bot Instagram</p><h1>Contatti</h1>
<div class="stats">${stats.map(([t, n]) => `<div><b>${n}</b><span>${t}</span></div>`).join('')}</div>
${leads.length ? `<div class="wrap"><table><thead><tr><th>Quando</th><th>Chi</th><th>Parola</th><th>A che punto è</th><th>Cosa ha scritto</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="empty">Ancora nessuno.</p>'}
</main></body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
}
