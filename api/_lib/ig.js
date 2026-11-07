// The Instagram bot of @omnyalab, in place of ManyChat. Instagram Messaging and comments
// through the Facebook Page linked to @omnyalab (graph.facebook.com, Meta's "unified login" for new apps).
//
// The way it goes (decided with Nico, 3/11/2026):
// comment with the word → public reply + one DM with a button (Instagram only allows one DM
// after a comment, and only once they tap can we see whether they follow) → tap → following:
// The Blueprint; not following: "follow and tap Done" → Done → The Blueprint → "project or
// just curious?" → project: call link + email to Nico.
// If the DM can't be sent: public reply "send us a text". DM unopened after 3 hours: public
// reply "check Requests". About 20 hours after their last message: one follow-up (a DM is only
// allowed within 24 hours of the person's last message).
//
// Without Redis or a token (local tests) it keeps everything in memory.
import { redis, hasStore } from './store.js';
import { sendMail } from './mail.js';
import { host } from './config.js';
import * as T from './ig-texts.js';

const GRAPH = process.env.IG_GRAPH_URL || 'https://graph.facebook.com';
const V = process.env.IG_API_VERSION || 'v24.0';
const P = 'omnya:ig:';
const H = 3_600_000;
const DAY = 24 * H;
const KEEP = 180 * 86_400; // seconds a lead is kept

export const REMIND_AFTER = 3 * H;
export const NUDGE_AFTER = 20 * H;

/** Words that start the flow in a DM sent out of nowhere (comments use the word in the caption). */
const DEFAULT_WORDS = (process.env.IG_WORDS || 'BLUEPRINT,PROJECT,3D,AI,CLAUDE,DUBAI').split(',').map((w) => w.trim().toUpperCase()).filter(Boolean);
// words that follow "comment" in a caption without being the keyword
// Tester mode: IG_ONLY="gghizzoo,1234" (usernames or ids) makes the bot answer only these people and
// leave everyone else to ManyChat; under posts without "Comment WORD" they can use the DM words too.
const ONLY = new Set((process.env.IG_ONLY || '').split(',').map((w) => w.trim().replace(/^@/, '').toLowerCase()).filter(Boolean));
const NOT_WORDS = new Set(['BELOW', 'DOWN', 'HERE', 'THE', 'AND', 'FOR', 'TO', 'IF', 'YOUR', 'ME', 'US', 'SOTTO', 'QUI', 'LA', 'IL', 'WITH', 'NOW']);

// ---------- storage ----------

const mem = { kv: new Map(), due: new Map(), leads: new Map() };

const kv = {
  async get(k) {
    if (!hasStore()) return mem.kv.has(k) ? structuredClone(mem.kv.get(k)) : null;
    const v = await redis('GET', P + k);
    return v == null ? null : JSON.parse(v);
  },
  async set(k, v, ttl = KEEP) {
    if (hasStore()) await redis('SET', P + k, JSON.stringify(v), 'EX', ttl);
    else mem.kv.set(k, structuredClone(v));
  },
  /** True only the first time (per ttl). */
  async once(k, ttl = KEEP) {
    if (hasStore()) return (await redis('SET', P + k, '1', 'NX', 'EX', ttl)) === 'OK';
    if (mem.kv.has(k)) return false;
    mem.kv.set(k, 1);
    return true;
  },
};

async function later(at, task) {
  const m = JSON.stringify(task);
  if (hasStore()) await redis('ZADD', P + 'due', at, m);
  else mem.due.set(m, at);
}

/** Tasks that are due, each handed out once even if two ticks run together. */
async function takeDue(now) {
  if (!hasStore()) {
    const out = [...mem.due].filter(([, at]) => at <= now).map(([m]) => m);
    out.forEach((m) => mem.due.delete(m));
    return out.map((m) => JSON.parse(m));
  }
  const rows = await redis('ZRANGEBYSCORE', P + 'due', '-inf', now, 'LIMIT', 0, 25);
  const out = [];
  for (const r of rows) if ((await redis('ZREM', P + 'due', r)) === 1) out.push(JSON.parse(r));
  return out;
}

const getLead = (id) => kv.get(`lead:${id}`);

async function saveLead(lead) {
  lead.updated = Date.now();
  await kv.set(`lead:${lead.id}`, lead);
  if (hasStore()) await redis('ZADD', P + 'leads', 'NX', lead.at, lead.id);
  else mem.leads.set(lead.id, lead.at);
}

const newLead = (id) => ({ id, at: Date.now(), stage: 'new' });

/** The latest leads, newest first, for Nico's page. */
export async function listLeads(n = 300) {
  const ids = hasStore()
    ? await redis('ZREVRANGE', P + 'leads', 0, n - 1)
    : [...mem.leads].sort((a, b) => b[1] - a[1]).slice(0, n).map(([id]) => id);
  if (!ids.length) return [];
  const rows = hasStore() ? await redis('MGET', ...ids.map((id) => `${P}lead:${id}`)) : ids.map((id) => JSON.stringify(mem.kv.get(`lead:${id}`) || null));
  return rows.map((r) => (r ? JSON.parse(r) : null)).filter(Boolean);
}

// ---------- Instagram ----------

/**
 * IG_TOKEN is the system user token of the Omnya Lab business portfolio (never expires). Instagram
 * DMs go out as the Facebook Page linked to @omnyalab, so the bot swaps it for that Page's token
 * (also never expiring) and keeps it in Redis. A Page token put straight into IG_TOKEN works too.
 */
export async function page() {
  // Meta tokens are letters and digits only: a stray space, newline or ù from pasting is dropped
  const env = String(process.env.IG_TOKEN || '').replace(/[^A-Za-z0-9]/g, '');
  const t = await kv.get('page');
  if (t && t.src === env) return t;
  const url = new URL(`${GRAPH}/${V}/me/accounts`);
  url.searchParams.set('fields', 'id,name,access_token,instagram_business_account');
  url.searchParams.set('access_token', env);
  const j = await (await fetch(url)).json().catch(() => ({}));
  const p = (j.data || []).find((x) => x.instagram_business_account);
  if (!p) return { token: env };
  const out = { src: env, token: p.access_token, id: p.id, name: p.name, ig: p.instagram_business_account.id };
  await kv.set('page', out, 30 * 86_400);
  return out;
}

export async function api(path, { method = 'GET', body, query } = {}) {
  const url = new URL(`${GRAPH}/${V}/${path}`);
  for (const [k, v] of Object.entries(query || {})) url.searchParams.set(k, v);
  url.searchParams.set('access_token', (await page()).token);
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body && JSON.stringify(body),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.error) throw new Error(`instagram ${method} ${path}: ${j.error?.message || res.status}`);
  return j;
}

async function send(recipient, message) {
  const j = await api('me/messages', { method: 'POST', body: { recipient, message } });
  // our own messages come back as echoes: remembered so they aren't taken for Nico typing
  if (j.message_id) await kv.once(`mine:${j.message_id}`, 7 * 86_400);
  return j;
}

const text = (id, t) => send({ id }, { text: t });

/** A message with one button; if Instagram refuses the button, a quick reply does the same job. */
async function button(recipient, t, label, payload) {
  try {
    return await send(recipient, { attachment: { type: 'template', payload: { template_type: 'button', text: t, buttons: [{ type: 'postback', title: label, payload }] } } });
  } catch (e) {
    console.warn('[ig] button refused, quick reply instead:', e.message);
    return send(recipient, { text: t, quick_replies: [{ content_type: 'text', title: label, payload }] });
  }
}

const question = (id, t) =>
  send({ id }, { text: t, quick_replies: [{ content_type: 'text', title: T.choices.project, payload: 'PROJECT' }, { content_type: 'text', title: T.choices.curious, payload: 'CURIOUS' }] });

const replyComment = (commentId, message) => api(`${commentId}/replies`, { method: 'POST', query: { message } });

/** Whether they follow @omnyalab: true, false, or null when Instagram doesn't say. */
async function profile(id) {
  try {
    const j = await api(id, { query: { fields: 'username,is_user_follow_business' } });
    return { follows: typeof j.is_user_follow_business === 'boolean' ? j.is_user_follow_business : null, username: j.username };
  } catch (e) {
    console.warn('[ig] profile', e.message);
    return { follows: null };
  }
}

// ---------- the word ----------

/** "Comment PROJECT", "Commenta “3D”", "comment the word AI" → ['PROJECT'], ['3D'], ['AI']. */
export function captionWords(caption) {
  const out = new Set();
  const re = /\bcomm?ent(?:a|ate|i)?\b[\s:\-–—]*(?:(?:the\s+word|la\s+parola)\s+)?["“”'‘’«]?([\p{L}\p{N}]{2,24})/giu;
  for (const m of String(caption).matchAll(re)) {
    const w = m[1].toUpperCase();
    if (!NOT_WORDS.has(w)) out.add(w);
  }
  return [...out];
}

/** Typing distance, with two swapped letters counting as one mistake (CALDUE → CLAUDE = 2). */
function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  return d[a.length][b.length];
}

/** Mistakes allowed: none on short words (3D, AI), one on 4–5 letters, two from 6 letters up. */
const slack = (w) => (w.length <= 3 ? 0 : w.length <= 5 ? 1 : 2);

/** How many letters one word has that the other hasn't (CALDUE vs CLAUDE: 0, CLOUD vs CLAUDE: 3). */
function letterGap(a, b) {
  const n = {};
  for (const c of a) n[c] = (n[c] || 0) + 1;
  for (const c of b) n[c] = (n[c] || 0) - 1;
  return Object.values(n).reduce((s, v) => s + Math.abs(v), 0);
}

/** One typo is always fine; two only when the letters are (almost) the same, just shuffled: Caldue yes, Cloud no. */
function close(t, w) {
  const max = slack(w);
  if (!max || Math.abs(t.length - w.length) > max) return false;
  const d = lev(t, w);
  return d <= 1 || (d <= max && letterGap(t, w) <= 1);
}

/** The keyword in a comment: capitals, accents, emoji and spaces don't matter, nor small typos (Claude, Caldue, Cluade, Claudee). */
export function matchWord(comment, words) {
  const tokens = String(comment).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toUpperCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  for (const w of words) for (const t of tokens) if (t === w || close(t, w)) return w;
  return null;
}

/** Which Blueprint a post gives: 'tower' when the caption talks about a tower, otherwise the normal one. */
export const postKind = (caption) => (/\b(towers?|torr[ei])\b/i.test(caption) ? 'tower' : 'blueprint');

/** The caption's words, kept 6 hours; a caption Instagram didn't give us is asked again next time. */
async function reelInfo(mediaId) {
  const key = `caption:${mediaId}`;
  const cached = await kv.get(key);
  if (cached) return cached;
  try {
    const m = await api(mediaId, { query: { fields: 'caption,permalink' } });
    const c = { words: captionWords(m.caption || ''), permalink: m.permalink || '', kind: postKind(m.caption || '') };
    await kv.set(key, c, 6 * 3600);
    return c;
  } catch (e) {
    console.warn('[ig] caption', e.message);
    return { words: [], permalink: '' };
  }
}

// ---------- Nico ----------

async function tellNico(lead, subject, lines = []) {
  const who = lead.username ? `@${lead.username}` : `utente ${lead.id}`;
  const body = [
    ...lines,
    '',
    lead.username ? `Profilo: https://www.instagram.com/${lead.username}/` : '',
    lead.permalink ? `Reel: ${lead.permalink}` : '',
    lead.comment ? `Commento: ${lead.comment}` : '',
    'Rispondi da qui: https://www.instagram.com/direct/inbox/',
  ].filter((l) => l !== null);
  try {
    await sendMail({ to: host.email, subject: `Instagram · ${who} ${subject}`, text: body.join('\n') });
  } catch (e) {
    console.error('[ig] mail', e.message);
  }
}

// ---------- the flow ----------

async function sendBlueprint(lead, newFollower) {
  const t = T.textsFor(lead.kind);
  await question(lead.id, newFollower ? t.blueprintNewFollower : t.blueprintFollower);
  Object.assign(lead, { stage: 'asked', follows: true, sentAt: Date.now() });
}

/** They tapped "Get the Blueprint" (afterDone false) or "Done" (true). */
async function giveBlueprint(lead, afterDone) {
  const p = await profile(lead.id);
  if (p.username) lead.username ||= p.username;
  // Instagram doesn't say: on Done we take their word for it, first time we ask for the follow
  if (p.follows === true || (p.follows === null && afterDone)) return sendBlueprint(lead, afterDone || lead.stage === 'asked_follow');
  const t = T.textsFor(lead.kind);
  const msg = afterDone ? t.stillNotFollowing : t.followFirst;
  await button({ id: lead.id }, msg.text, msg.button, 'DONE');
  Object.assign(lead, { stage: 'asked_follow', follows: false, wasAskedFollow: true });
}

/** A comment under one of our posts. */
export async function onComment(ownId, v) {
  const from = v.from || {};
  if (!from.id || from.id === ownId || !v.id) return 'skip';
  const mediaId = v.media?.id;
  if (ONLY.size && !ONLY.has(String(from.id)) && !ONLY.has(String(from.username || '').toLowerCase())) return 'not tester';
  const reel = mediaId ? await reelInfo(mediaId) : { words: [], permalink: '' };
  // only under posts whose caption asks for a word: client teasers and the rest are left alone
  const word = matchWord(v.text || '', reel.words.length || !ONLY.size ? reel.words : DEFAULT_WORDS);
  if (!word) return 'no word';
  if (!(await kv.once(`once:${mediaId}:${from.id}`))) return 'already';

  const t = T.textsFor(reel.kind);
  let uid = from.id;
  let dm = true;
  try {
    if (ONLY.size) await kv.set(`tester:${from.id}`, 1, 7 * 86_400);
    const r = await button({ comment_id: v.id }, t.opener.text, t.opener.button, 'GET');
    if (r.recipient_id) uid = r.recipient_id;
    if (ONLY.size) await kv.set(`tester:${uid}`, 1, 7 * 86_400);
  } catch (e) {
    console.error('[ig] private reply', e.message);
    dm = false;
  }
  try {
    await replyComment(v.id, dm ? t.publicReplies[Math.floor(Math.random() * t.publicReplies.length)] : t.cantDm);
  } catch (e) {
    console.error('[ig] public reply', e.message);
  }

  const lead = (await getLead(uid)) || newLead(uid);
  Object.assign(lead, {
    username: from.username || lead.username,
    media: mediaId,
    permalink: reel.permalink || lead.permalink,
    word,
    kind: reel.kind || 'blueprint',
    comment: String(v.text || '').slice(0, 300),
    commentId: v.id,
    commentAt: Date.now(),
    stage: dm ? 'opened' : 'nodm',
    seen: false,
    reels: [...new Set([...(lead.reels || []), mediaId])],
  });
  await saveLead(lead);
  if (dm) await later(Date.now() + REMIND_AFTER, { k: 'remind', id: uid, c: v.id });
  return dm ? 'sent' : 'nodm';
}

/** A DM, a tap, a "seen" or an echo of a message sent from the account. */
export async function onMessaging(ownId, m) {
  const msg = m.message || {};
  const mid = msg.mid || m.postback?.mid;

  if (msg.is_echo) {
    // sent from @omnyalab but not by the bot: Nico is talking to them, the bot steps back
    if (mid && !(await kv.get(`mine:${mid}`))) {
      const lead = await getLead(m.recipient?.id);
      if (lead && !lead.human) {
        lead.human = true;
        await saveLead(lead);
      }
    }
    return 'echo';
  }

  const uid = m.sender?.id;
  if (!uid || uid === ownId) return 'skip';
  if (ONLY.size && !ONLY.has(String(uid)) && !(await kv.get(`tester:${uid}`))) {
    // a tap can come with a different id from the comment's: ask Instagram who it is
    const p = await profile(uid);
    if (!ONLY.has(String(p.username || '').toLowerCase())) return 'not tester';
    await kv.set(`tester:${uid}`, 1, 7 * 86_400);
  }

  if (m.read) {
    const lead = await getLead(uid);
    if (lead && !lead.seen) {
      lead.seen = true;
      await saveLead(lead);
    }
    return 'seen';
  }
  if (mid && !(await kv.once(`got:${mid}`, 7 * 86_400))) return 'dup';

  const payload = m.postback?.payload || msg.quick_reply?.payload || '';
  const said = String(msg.text || '').trim();
  if (!payload && !said) return 'skip'; // reactions, stickers, attachments only

  let lead = await getLead(uid);
  if (!lead) {
    // a DM out of nowhere: only the keyword or one of our buttons starts the flow, the rest is Nico's
    // (a tap on our button can come with an id we never saw: the comment's id is not always the DM's)
    const ours = ['GET', 'DONE'].includes(payload);
    if (!ours && !matchWord(said, DEFAULT_WORDS)) return 'not ours';
    lead = newLead(uid);
    lead.word = matchWord(said, DEFAULT_WORDS) || 'BLUEPRINT';
    lead.stage = 'opened';
  }
  lead.lastUserAt = Date.now();
  lead.seen = true;
  await later(lead.lastUserAt + NUDGE_AFTER, { k: 'nudge', id: uid });

  const done = payload === 'DONE' || (lead.stage === 'asked_follow' && /^(done|did it|followed|follow(ed|ing)? ?(done|you)?|ok(ay)?|fatto|yes|yep|si|sì)\b/i.test(said));
  let what = 'free';
  if (payload === 'GET') what = 'get';
  else if (done) what = 'done';
  else if (payload === 'PROJECT' || (lead.stage === 'asked' && /\b(project|progett|working on|client|house|villa|render)/i.test(said))) what = 'project';
  else if (payload === 'CURIOUS' || (lead.stage === 'asked' && /\b(curious|curios|just looking|learn)/i.test(said))) what = 'curious';
  else if (['new', 'opened', 'nodm'].includes(lead.stage)) what = 'get'; // they wrote instead of tapping

  if (what === 'get' && (payload === 'GET' || !lead.human)) await giveBlueprint(lead, false);
  else if (what === 'done') await giveBlueprint(lead, true);
  else if (what === 'project') {
    await text(uid, T.textsFor(lead.kind).answerProject);
    Object.assign(lead, { stage: 'project', interest: 'project' });
    await saveLead(lead);
    await tellNico(lead, 'ha un progetto', ['Ha detto che sta lavorando a un progetto. Gli è arrivato il link della call gratis.', said && `Ha scritto: ${said}`].filter(Boolean));
  } else if (what === 'curious') {
    await text(uid, T.textsFor(lead.kind).answerCurious);
    Object.assign(lead, { stage: 'curious', interest: lead.interest || 'curious' });
  } else if (['asked', 'project', 'curious'].includes(lead.stage) && (await kv.once(`told:${uid}`, 3600))) {
    // a real answer in words: the bot doesn't improvise, Nico does
    lead.wrote = said.slice(0, 500);
    await tellNico(lead, 'ti ha scritto', [`Ha scritto: ${said}`]);
  }
  await saveLead(lead);
  return what;
}

/** Reminders and follow-ups that are due. Runs on every webhook call and every half hour. */
export async function tick(now = Date.now()) {
  const done = [];
  for (const t of await takeDue(now)) {
    try {
      const lead = await getLead(t.id);
      if (!lead) continue;
      if (t.k === 'remind') {
        if (lead.stage !== 'opened' || lead.seen || lead.lastUserAt || lead.commentId !== t.c) continue;
        await replyComment(t.c, T.checkRequests);
        lead.reminded = true;
      } else if (t.k === 'nudge') {
        if (lead.human || lead.nudged || !lead.lastUserAt) continue;
        const since = now - lead.lastUserAt;
        if (since < NUDGE_AFTER - 60_000 || since > DAY - 10 * 60_000) continue; // a newer one is queued, or too late
        if (lead.stage === 'asked_follow') {
          const p = await profile(lead.id);
          if (p.follows === true) await sendBlueprint(lead, true);
          else await button({ id: lead.id }, T.textsFor(lead.kind).nudgeFollow.text, T.textsFor(lead.kind).nudgeFollow.button, 'DONE');
        } else if (lead.stage === 'asked') await question(lead.id, T.textsFor(lead.kind).nudgeQuestion);
        else continue;
        lead.nudged = true;
      }
      await saveLead(lead);
      done.push(t.k);
    } catch (e) {
      console.error('[ig] tick', t.k, e.message);
    }
  }
  return done;
}
