// GET /api/leads?key=… → Nico's private list of the people the Instagram bot talked to.
// The key lives only in the Vercel env var IG_ADMIN_KEY.
// The same page shows how the bot is doing: the line of comments waiting for their DM, the DMs of
// the last hour against Meta's 750, the errors of the last hour, and per post the comments, the DMs,
// the links sent and the clicks on the link.
// &action=subscribe switches the webhook on for @omnyalab (once, after the token is set).
// &action=post&code=<reel code or link>&dest=<tower|floors|film|build|towers|city|blueprint> adds a reel
//   to the map at once, without a deploy (no dest = takes it out); the lasting place is api/_lib/ig-posts.js.
// &action=mode&value=direct|gate changes how the bot answers, without a deploy: direct (the default) = the DM
//   that answers the comment already has the link; gate = button, follow check, then the link.
// &action=off stops the bot at once, without a deploy (it answers nobody and keeps nothing), &action=on starts it again.
// &format=json gives the numbers alone.
import { listLeads, api, page, lineState, errorState, postStats, postMap, setPost, setOff, isOff, getMode, setMode, MODES } from './_lib/ig.js';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const stages = {
  new: 'Nuovo',
  opened: 'DM mandato, non ha toccato',
  // in direct mode 'asked' means the DM with the link went out
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
      const p = await page();
      if (!p.id) throw new Error('no Facebook Page with an Instagram account found for IG_TOKEN');
      const r = { page: p.name, instagram: p.ig, ...(await api(`${p.id}/subscribed_apps`, { method: 'POST', query: { subscribed_fields: 'feed,messages,messaging_postbacks' } })) };
      return new Response(JSON.stringify(r), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 502, headers: { 'Content-Type': 'application/json' } });
    }
  }

  if (q.get('action') === 'off' || q.get('action') === 'on') {
    const nowOff = await setOff(q.get('action') === 'off');
    return new Response(JSON.stringify({ ok: true, bot: nowOff ? 'off' : 'on' }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  }

  if (q.get('action') === 'mode') {
    const set = await setMode(q.get('value') || '');
    return new Response(JSON.stringify(set ? { ok: true, mode: set } : { error: 'value must be one of: ' + MODES.join(', '), mode: await getMode() }), {
      status: set ? 200 : 400,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }

  if (q.get('action') === 'post') {
    const map = await setPost(q.get('code'), q.get('dest') || '');
    return new Response(JSON.stringify(map ? { ok: true, added: map, map: await postMap() } : { error: 'code or dest not valid', dests: 'blueprint, tower, floors, film, build, towers, city' }, null, 2), {
      status: map ? 200 : 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  const [leads, line, errors, posts, botOff, flow] = await Promise.all([listLeads(), lineState(), errorState(8), postStats(), isOff(), getMode()]);
  if (q.get('format') === 'json') {
    return new Response(JSON.stringify({ on: !botOff, mode: flow, line, errors, posts, map: await postMap() }, null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
  }
  const count = (f) => leads.filter(f).length;
  const stats = [
    ['Contatti', leads.length],
    ['Hanno il Blueprint', count((l) => ['asked', 'project', 'curious'].includes(l.stage))],
    ['Nuovi follower', count((l) => l.follows && l.wasAskedFollow)],
    ['Con un progetto', count((l) => l.interest === 'project')],
    ['In coda per il DM', line.waiting],
    [`DM ultima ora (tetto ${line.cap})`, line.sentLastHour],
    ['Errori ultima ora', errors.lastHour],
  ];
  const only = (process.env.IG_ONLY || '').trim();
  const state = [
    botOff ? '<b>BOT SPENTO</b> (si riaccende con &amp;action=on)' : only ? `Modalità prova: risponde solo a ${esc(only)}` : 'Risponde a tutti',
    flow === 'direct' ? 'link diretto: il primo DM ha già il link' : 'giro completo: tasto, controllo del follow, link',
    line.waiting ? `il commento più vecchio in coda aspetta da ${line.oldestMinutes} min` : '',
    line.stoppedUntil ? `invii fermi fino alle ${when(Date.parse(line.stoppedUntil))} (${esc(line.stoppedWhy || '')})` : '',
  ].filter(Boolean).join(' · ');
  const postRows = posts
    .map((r) => {
      const named = { dm: 'parola scritta in DM', manychat: 'vecchi tasti ManyChat' }[r.post];
      const link = named || (/^\d+$/.test(r.post) ? esc(r.post) : `<a href="https://www.instagram.com/reel/${esc(r.post)}/">${esc(r.post)}</a>`);
      return `<tr><td>${link}</td><td>${esc(r.dest)}</td><td>${r.c}</td><td>${r.dm}</td><td>${r.nodm}</td><td>${r.link}</td><td>${r.click}</td><td>${r.link ? Math.round((100 * r.click) / r.link) + '%' : ''}</td></tr>`;
    })
    .join('');
  const errRows = errors.last.map((e) => `<tr><td>${when(Date.parse(e.at))}</td><td>${esc(e.where)}</td><td>${esc(e.msg)}</td></tr>`).join('');
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
h2{margin:36px 0 10px;font-size:20px;letter-spacing:-.02em;font-weight:600}.state{margin:-12px 0 0;color:var(--mute)}
table.small td:first-child{color:inherit}table.small{min-width:560px}
</style></head><body><main>
<p class="k">Omnya Lab · bot Instagram</p><h1>Contatti</h1>
<div class="stats">${stats.map(([t, n]) => `<div><b>${n}</b><span>${t}</span></div>`).join('')}</div>
<p class="state">${state}</p>
${postRows ? `<h2>Post</h2><div class="wrap"><table class="small"><thead><tr><th>Post</th><th>Porta a</th><th>Commenti</th><th>DM mandati</th><th>DM bloccati</th><th>Link mandati</th><th>Clic sul link</th><th>Lo apre</th></tr></thead><tbody>${postRows}</tbody></table></div>` : ''}
${errRows ? `<h2>Ultimi errori</h2><div class="wrap"><table class="small"><thead><tr><th>Quando</th><th>Dove</th><th>Cosa ha detto Meta</th></tr></thead><tbody>${errRows}</tbody></table></div>` : ''}
<h2>Persone</h2>
${leads.length ? `<div class="wrap"><table><thead><tr><th>Quando</th><th>Chi</th><th>Parola</th><th>A che punto è</th><th>Cosa ha scritto</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="empty">Ancora nessuno.</p>'}
</main></body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
}
