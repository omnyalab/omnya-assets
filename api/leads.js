// GET /api/leads?key=… → Nico's private list of the people the Instagram bot talked to.
// The key lives only in the Vercel env var IG_ADMIN_KEY.
// The same page shows how the bot is doing: the line of comments waiting for their DM, the DMs of
// the last hour against Meta's 750, the errors of the last hour, and per post the comments, the DMs,
// the links sent and the clicks on the link.
// &action=subscribe switches the webhook on for @omnyalab (once, after the token is set).
// &action=post&code=<reel code or link>&dest=<tower|floors|film|build|towers|city|fable|blueprint> adds a reel
//   to the map at once, without a deploy (no dest = takes it out); the lasting place is api/_lib/ig-posts.js.
// &action=word&word=<WORD>&dest=<a destination> registers a word without a deploy: a reel whose caption says
//   Comment "WORD" then goes to that destination by itself, as TOWERS does (empty dest = takes the word out).
//   The fixed words of ig-posts.js can't be changed from here, and always win.
// &action=posted is the "Postato" button at the top of the page ("Reel di oggi"): the newest reel of the account,
//   not older than 3 hours, is pinned in the map with the destination of the word its caption asks for; the page
//   (or the JSON, with &format=json) says which page it was linked to, or what is missing.
// &action=mode&value=direct|gate|comment changes how the bot answers, without a deploy: direct (the default) = the DM
//   that answers the comment already has the link; gate = button, follow check, then the link; comment = the
//   follow is asked first and checked when they comment again, then the link.
// The page also shows the follow probe: how many times Meta told us whether a commenter follows (yes, no, no answer, error).
// &action=gatefor&value=gghizzoo (usernames, commas; empty = nobody) gives these people the whole round (button, follow
//   check, link) whatever the mode, and no "one answer per reel": for the screencast of Meta's App Review.
// &action=any&value=on|off: on (the default) = under a post of the map every comment of another person gets the public
//   reply and the DM, whatever it says; off = only who writes the word. Without a deploy, kept in Redis.
// &action=media gives the last 30 posts and reels of the account as JSON ({ media: [{ id, shortcode, caption, permalink,
//   thumbnail_url, media_type, timestamp }] }), for the titles in Nico's app on the Mac; asked to Meta at most once every
//   10 minutes (&fresh=1 asks now). When Meta refuses: { media: [], error }.
// &action=off stops the bot at once, without a deploy (it answers nobody and keeps nothing), &action=on starts it again.
// &format=json gives the numbers alone.
import { listLeads, api, page, lineState, errorState, postStats, postMap, setPost, setWord, posted, setOff, isOff, getMode, setMode, MODES, probeState, gateFor, setGateFor, anyComment, setAnyComment, recentMedia } from './_lib/ig.js';
import { DESTS } from './_lib/ig-posts.js';

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

/** What "Postato" did, in words Nico reads on the phone. */
function saidPosted(r) {
  const ago = (m) => (m < 1 ? 'adesso' : m < 90 ? `${m} min fa` : `${Math.round(m / 60)} ore fa`);
  if (r.ok) {
    const where = `omnyalab.com${r.page}`;
    return r.already
      ? `Il reel ${r.reel.code} (parola ${r.word}, postato ${ago(r.reel.minutesAgo)}) era già collegato a ${where}, non ho cambiato niente`
      : `Collegato: il reel ${r.reel.code} (parola ${r.word}, postato ${ago(r.reel.minutesAgo)}) porta a ${where}`;
  }
  if (r.why === 'no-reel') {
    return r.last
      ? `Nessun reel nuovo: l’ultimo che Instagram mi dà (${r.last.code}) è di ${ago(r.last.minutesAgo)}, e ne cerco uno delle ultime 3 ore. Se l’hai appena pubblicato aspetta un minuto e premi di nuovo`
      : 'Nessun reel nuovo: Instagram non mi dà nessun reel. Se l’hai appena pubblicato aspetta un minuto e premi di nuovo';
  }
  if (r.why === 'no-word') return `Il reel ${r.reel.code} c’è (postato ${ago(r.reel.minutesAgo)}), ma nella caption manca la parola: serve scritto Comment "PAROLA". Correggi la caption e premi di nuovo`;
  if (r.why === 'unknown-word') return `Il reel ${r.reel.code} chiede la parola ${r.words.join(', ')}, che non è registrata: non l’ho collegato. Registrala con &action=word&word=${r.words[0]}&dest=… (${DESTS.join(', ')}) e premi di nuovo`;
  return `Instagram non mi ha dato i contenuti (${r.error || 'nessuna risposta'}): non ho cambiato niente, riprova tra un minuto`;
}

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

  if (q.get('action') === 'any') {
    const v = String(q.get('value') || '').toLowerCase();
    const known = v === 'on' || v === 'off';
    return new Response(JSON.stringify(known ? { ok: true, anyComment: await setAnyComment(v === 'on') } : { error: 'value must be on or off', anyComment: await anyComment() }), {
      status: known ? 200 : 400,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }

  if (q.get('action') === 'media') {
    const r = await recentMedia(q.get('fresh') === '1').catch((e) => ({ media: [], error: String(e?.message || e) }));
    return new Response(JSON.stringify(r, null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
  }

  if (q.get('action') === 'gatefor') {
    return new Response(JSON.stringify({ ok: true, gateFor: await setGateFor(q.get('value') || '') }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
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
    return new Response(JSON.stringify(map ? { ok: true, added: map, map: await postMap() } : { error: 'code or dest not valid', dests: DESTS.join(', ') }, null, 2), {
      status: map ? 200 : 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  if (q.get('action') === 'word') {
    let r;
    try {
      r = await setWord(q.get('word'), q.get('dest') || '');
    } catch (e) {
      r = { error: `not saved, the store did not answer: ${String(e?.message || e).slice(0, 120)}`, status: 502 };
    }
    const { status = r.error ? 400 : 200, ...out } = r;
    return new Response(JSON.stringify(r.error ? { ...out, dests: DESTS.join(', ') } : { ok: true, ...out, map: await postMap() }, null, 2), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  // "Postato": the newest reel is pinned to the page of its word. As JSON for the app, or on top of the page below.
  let postedNow = null;
  if (q.get('action') === 'posted') {
    postedNow = await posted().catch((e) => ({ ok: false, why: 'meta', error: String(e?.message || e).slice(0, 200) }));
    postedNow.say = saidPosted(postedNow);
    if (q.get('format') === 'json') return new Response(JSON.stringify(postedNow, null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
  }

  const [leads, line, errors, posts, botOff, flow, probe, gateList, every, map] = await Promise.all([listLeads(), lineState(), errorState(8), postStats(), isOff(), getMode(), probeState(), gateFor(), anyComment(), postMap()]);
  if (q.get('format') === 'json') {
    return new Response(JSON.stringify({ on: !botOff, mode: flow, anyComment: every, gateFor: gateList, followProbe: probe, line, errors, posts, map }, null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
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
    flow === 'direct' ? 'link diretto: il primo DM ha già il link' : flow === 'comment' ? 'cancello a commenti: prima il follow, poi commenta DONE e arriva il link' : 'giro completo: tasto, controllo del follow, link',
    every ? 'sui reel in mappa risponde a ogni commento' : 'sui reel in mappa risponde <b>solo a chi scrive la parola</b> (si riaccende con &amp;action=any&amp;value=on)',
    gateList.length ? `giro completo solo per: ${esc(gateList.join(', '))}` : '',
    `sonda del follow: ${probe.follows} seguono, ${probe.notFollowing} non seguono, ${probe.unknown} senza risposta, ${probe.errors} errori${probe.lastError ? ` (ultimo: ${esc(probe.lastError.said)})` : ''}`,
    line.waiting ? `il commento più vecchio in coda aspetta da ${line.oldestMinutes} min` : '',
    line.stoppedUntil ? `invii fermi fino alle ${when(Date.parse(line.stoppedUntil))} (${esc(line.stoppedWhy || '')})` : '',
    `parole che collegano un reel da sole: ${map.words.map((w) => `${esc(w.word)} → ${esc(w.dest)}${w.added ? ' (registrata)' : ''}`).join(', ')}`,
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
.today{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:0 0 14px;padding:12px 12px 12px 18px;border:1px solid var(--line);border-radius:18px}
.today span{font-size:17px;font-weight:600;letter-spacing:-.01em}
.today a{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 26px;border-radius:999px;background:var(--ink);color:var(--bg);font-size:16px;font-weight:600;text-decoration:none;-webkit-tap-highlight-color:transparent}
.said{margin:0 0 14px;padding:14px 18px;border-radius:18px;font-size:16px;line-height:1.4;overflow-wrap:anywhere}
.said.ok{background:#1f8a4c;color:#fff}.said.no{background:var(--accent);color:#fff}
.today+h1,.said+h1{margin-top:22px}
</style></head><body><main>
<p class="k">Omnya Lab · bot Instagram</p>
<div class="today"><span>Reel di oggi</span><a href="?key=${encodeURIComponent(q.get('key'))}&amp;action=posted">Postato</a></div>
${postedNow ? `<p class="said ${postedNow.ok ? 'ok' : 'no'}" role="status">${esc(postedNow.say)}</p>` : ''}
<h1>Contatti</h1>
<div class="stats">${stats.map(([t, n]) => `<div><b>${n}</b><span>${t}</span></div>`).join('')}</div>
<p class="state">${state}</p>
${postRows ? `<h2>Post</h2><div class="wrap"><table class="small"><thead><tr><th>Post</th><th>Porta a</th><th>Commenti</th><th>DM mandati</th><th>DM bloccati</th><th>Link mandati</th><th>Clic sul link</th><th>Lo apre</th></tr></thead><tbody>${postRows}</tbody></table></div>` : ''}
${errRows ? `<h2>Ultimi errori</h2><div class="wrap"><table class="small"><thead><tr><th>Quando</th><th>Dove</th><th>Cosa ha detto Meta</th></tr></thead><tbody>${errRows}</tbody></table></div>` : ''}
<h2>Persone</h2>
${leads.length ? `<div class="wrap"><table><thead><tr><th>Quando</th><th>Chi</th><th>Parola</th><th>A che punto è</th><th>Cosa ha scritto</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="empty">Ancora nessuno.</p>'}
</main></body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
}
