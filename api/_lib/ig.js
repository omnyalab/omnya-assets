// The Instagram bot of @omnyalab, in place of ManyChat. Instagram Messaging and comments
// through the Facebook Page linked to @omnyalab (graph.facebook.com, Meta's "unified login" for new apps).
//
// The way it goes (decided with Nico, 3/11/2026; since 10/11/2026 for every reel ManyChat had):
// comment → it joins the line → its turn: public reply + one DM with a button (Instagram only
// allows one DM after a comment, and only once they tap can we see whether they follow) → tap →
// following: one DM with the link of the page; not following: "follow and tap Done" → Done → the link.
// Which page: api/_lib/ig-posts.js (by post or by the word in the caption). What it says: ig-texts.js.
// The line keeps the DMs under Meta's 750 an hour: the comments past that wait and go out later,
// in order, each one once (a private reply is allowed for 7 days after the comment).
// If the DM can't be sent: public reply "send us a text". DM unopened after 3 hours: public
// reply "check Requests". About 20 hours after their last message: one follow-up (a DM is only
// allowed within 24 hours of the person's last message).
//
// Without Redis or a token (local tests) it keeps everything in memory.
import { kv, z, h, clock, takePlace, leadIds, getMany } from './ig-store.js';
import { sendMail } from './mail.js';
import { host } from './config.js';
import * as T from './ig-texts.js';
import { resolvePost, codeOf, cleanCode, isDest, POSTS, WORDS } from './ig-posts.js';
import { linkFor, cleanName } from './city.js';

export { clock };

const GRAPH = process.env.IG_GRAPH_URL || 'https://graph.facebook.com';
const V = process.env.IG_API_VERSION || 'v24.0';
const APP_ID = process.env.IG_APP_ID || '1607399760453809'; // the Meta app "Omnya Bot"
const H = 3_600_000;
const DAY = 24 * H;

export const REMIND_AFTER = 3 * H;
export const NUDGE_AFTER = 20 * H;

/** Meta allows 750 private replies (the DM that answers a comment) an hour per account. Past that the comments wait in line. */
export const HOURLY_CAP = Number(process.env.IG_HOURLY_CAP) || 750;
/** A private reply is allowed for 7 days after the comment: a comment that waited longer than this is let go. */
const COMMENT_LIFE = 7 * DAY - 2 * H;
/** Minutes before a comment whose DM failed on Meta's side is tried again; after the last one it gets the public "send us a text". */
const RETRY_MINUTES = [2, 10, 30, 120, 360];
/** When Meta itself says "too many calls": nothing is sent for this long, the line keeps its order. */
const RATE_HOLD = 10 * 60_000;
/** This many failed DMs within 10 minutes and the bot stops for 2 minutes, then tries one, then waits longer (up to 15). */
const FAILS_BEFORE_HOLD = 5;

/** Words that start the flow in a DM sent out of nowhere (comments use the word in the caption). */
const DEFAULT_WORDS = (process.env.IG_WORDS || 'BLUEPRINT,PROJECT,3D,AI,CLAUDE,DUBAI').split(',').map((w) => w.trim().toUpperCase()).filter(Boolean);
// Tester mode: IG_ONLY="gghizzoo,1234" (usernames or ids) makes the bot answer only these people and
// leave everyone else alone; under posts without "Comment WORD" they can use the DM words too.
// Empty = the bot answers everyone.
const ONLY = new Set((process.env.IG_ONLY || '').split(',').map((w) => w.trim().replace(/^@/, '').toLowerCase()).filter(Boolean));
// words that follow "comment" in a caption without being the keyword
const NOT_WORDS = new Set(['BELOW', 'DOWN', 'HERE', 'THE', 'AND', 'FOR', 'TO', 'IF', 'YOUR', 'ME', 'US', 'SOTTO', 'QUI', 'LA', 'IL', 'WITH', 'NOW']);

// ---------- storage ----------

async function later(at, task) {
  await z.add('due', at, JSON.stringify(task));
}

/** Tasks that are due, each handed out once even if two ticks run together. */
async function takeDue(now) {
  const rows = await z.range('due', '-inf', now, 25);
  const out = [];
  for (const r of rows) if ((await z.rem('due', r)) === 1) out.push(JSON.parse(r));
  return out;
}

const getLead = (id) => kv.get(`lead:${id}`);

async function saveLead(lead) {
  lead.updated = clock.now();
  await kv.set(`lead:${lead.id}`, lead);
  await z.add('leads', lead.at, lead.id, true);
}

const newLead = (id) => ({ id, at: clock.now(), stage: 'new' });

/** The latest leads, newest first, for Nico's page. */
export async function listLeads(n = 300) {
  const ids = await leadIds(n);
  return (await getMany(ids.map((id) => `lead:${id}`))).filter(Boolean);
}

// ---------- the switch ----------

// Off = the bot does nothing at all (no answers, no line, no reminders), without a deploy:
// /api/leads?key=…&action=off, and action=on to start again. For going back to ManyChat in a hurry.
// Comments that arrive while it is off are not kept.
let off = { at: 0, v: false };
export async function isOff() {
  if (Date.now() - off.at > 15_000) off = { at: Date.now(), v: !!(await kv.get('off')) };
  return off.v;
}
export async function setOff(v) {
  if (v) await kv.set('off', 1, 400 * 86_400);
  else await kv.del('off');
  off = { at: Date.now(), v: !!v };
  console.log(v ? '[ig] the bot was switched OFF from /api/leads' : '[ig] the bot was switched ON from /api/leads');
  return off.v;
}

// ---------- errors ----------

/**
 * Every error of Meta (or ours) lands here: one clear line in the Vercel logs, found with "[ig] ERROR",
 * and a row in the list that /api/leads and the health check read. It never throws.
 */
export async function noteError(where, e, who = '') {
  const msg = String(e?.message || e).slice(0, 220);
  console.error(`[ig] ERROR ${where}${who ? ` ${who}` : ''}: ${msg}`);
  try {
    const now = clock.now();
    await z.add('errs', now, JSON.stringify({ at: now, where, msg, code: e?.code || 0, sub: e?.sub || 0, r: Math.random().toString(36).slice(2, 7) }));
    if (Math.random() < 0.05) await z.trim('errs', now - 2 * DAY);
  } catch (x) {
    console.error('[ig] ERROR error list:', x.message);
  }
}

/**
 * What kind of refusal this is:
 * 'rate'   Meta says too many calls → stop and wait
 * 'gone'   the comment is deleted or older than 7 days → nothing to do
 * 'user'   this person can't get DMs from us → the public "send us a text"
 * 'system' anything else (token, permissions, thread owned by another app, Meta down, network) → try again later
 */
export function errorKind(e) {
  const m = String(e?.message || '');
  const { code, sub, status } = e || {};
  if (status === 429 || [4, 17, 32, 613, 80002, 80006].includes(code) || /rate limit|too many calls|request limit reached/i.test(m)) return 'rate';
  if (sub === 2534022 || /outside (of )?(the )?allowed window|comment (was|is) (deleted|invalid)|invalid for a private reply/i.test(m)) return 'gone';
  if (code === 551 || [2534014, 1545041, 2018108, 2018028].includes(sub) || /cannot message|can.?t receive|isn.?t available|not available right now|user cannot be found|has blocked/i.test(m)) return 'user';
  return 'system';
}

// ---------- Instagram ----------

/**
 * IG_TOKEN is the system user token of the Omnya Lab business portfolio (never expires). Instagram
 * DMs go out as the Facebook Page linked to @omnyalab, so the bot swaps it for that Page's token
 * (also never expiring) and keeps it in Redis. A Page token put straight into IG_TOKEN works too.
 */
const envToken = () => String(process.env.IG_TOKEN || '').replace(/[^A-Za-z0-9]/g, ''); // Meta tokens are letters and digits only: a stray space, newline or ù from pasting is dropped

/** One call to Meta. Throws an Error that carries Meta's code, subcode and the HTTP status. */
async function graph(path, token, { method = 'GET', body, query } = {}) {
  const url = new URL(`${GRAPH}/${V}/${path}`);
  for (const [k, v] of Object.entries(query || {})) url.searchParams.set(k, v);
  url.searchParams.set('access_token', token);
  let res, j;
  try {
    res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body && JSON.stringify(body),
      signal: AbortSignal.timeout(12_000),
    });
    j = await res.json().catch(() => ({}));
  } catch (e) {
    throw Object.assign(new Error(`instagram ${method} ${path}: ${e.name === 'TimeoutError' ? 'no answer in 12 seconds' : e.message}`), { status: 0 });
  }
  if (!res.ok || j.error) {
    const er = j.error || {};
    throw Object.assign(new Error(`instagram ${method} ${path}: ${er.message || res.status}${er.code ? ` [code ${er.code}${er.error_subcode ? ` sub ${er.error_subcode}` : ''}]` : ''}`), {
      code: er.code, sub: er.error_subcode, type: er.type, status: res.status,
    });
  }
  return j;
}

export async function page(fresh = false) {
  const env = envToken();
  const t = fresh ? null : await kv.get('page');
  if (t && t.src === env) return t;
  const j = await graph('me/accounts', env, { query: { fields: 'id,name,access_token,instagram_business_account' } }).catch((e) => ({ failed: e.message }));
  const p = (j.data || []).find((x) => x.instagram_business_account);
  if (!p) return { token: env, failed: j.failed };
  const out = { src: env, token: p.access_token, id: p.id, name: p.name, ig: p.instagram_business_account.id };
  await kv.set('page', out, 30 * 86_400);
  return out;
}

export const api = async (path, opts) => graph(path, (await page()).token, opts);

async function send(recipient, message) {
  const j = await api('me/messages', { method: 'POST', body: { recipient, message } });
  // our own messages come back as echoes: remembered so they aren't taken for Nico typing
  if (j.message_id) await kv.once(`mine:${j.message_id}`, 7 * 86_400);
  return j;
}

const text = (id, t) => send({ id }, { text: t });

/** Instagram refused the message as built (not the person, not the hour): worth one try in plain form. */
const refusedShape = (e) => /template|button|attachment/i.test(e.message) || (errorKind(e) === 'system' && e.status === 400 && (!e.code || e.code === 100) && e.sub !== 2534037);

/** A message with one button; if Instagram refuses the button, a quick reply does the same job. */
async function button(recipient, t, label, payload, onSecond) {
  try {
    return await send(recipient, { attachment: { type: 'template', payload: { template_type: 'button', text: t, buttons: [{ type: 'postback', title: label, payload }] } } });
  } catch (e) {
    if (!refusedShape(e)) throw e;
    console.warn('[ig] button refused, quick reply instead:', e.message);
    if (onSecond) await onSecond();
    return send(recipient, { text: t, quick_replies: [{ content_type: 'text', title: label, payload }] });
  }
}

/** A message with buttons that open a page; if Instagram refuses the buttons, the links go in the text. */
async function linkButtons(id, t, links) {
  try {
    return await send({ id }, { attachment: { type: 'template', payload: { template_type: 'button', text: t, buttons: links.map(([title, url]) => ({ type: 'web_url', title, url })) } } });
  } catch (e) {
    if (!refusedShape(e)) throw e;
    console.warn('[ig] link button refused, link in the text instead:', e.message);
    return text(id, links.length === 1 ? `${t}\n\n${links[0][1]}` : `${t}\n\n${links.map(([title, url]) => `${title}: ${url}`).join('\n')}`);
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
    await noteError('follow check', e, `user ${id}`);
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

/** Whether a caption talks about a tower (the old rule, still used for posts that are not in ig-posts.js). */
export const postKind = (caption) => (/\b(towers?|torr[ei])\b/i.test(caption) ? 'tower' : 'blueprint');

// posts added from /api/leads?key=…&action=post, without a deploy: { code: dest }
let extra = { at: 0, map: {} };
export async function extraPosts() {
  if (Date.now() - extra.at > 30_000) extra = { at: Date.now(), map: (await kv.get('posts')) || {} };
  return extra.map;
}

/** Adds a post to the map at once (dest empty takes it out). Returns the map, or null when the code or the destination is wrong. */
export async function setPost(rawCode, dest) {
  const code = cleanCode(rawCode);
  if (!code || (dest && !isDest(dest))) return null;
  const map = { ...((await kv.get('posts')) || {}) };
  if (dest) map[code] = dest;
  else delete map[code];
  await kv.set('posts', map, 400 * 86_400);
  extra = { at: Date.now(), map };
  return map;
}

/**
 * What Instagram says about a post: the words its caption asks for, its link and code. Kept 6 hours
 * when the post gives something, 5 minutes when it doesn't (so a caption fixed after posting is read
 * again soon). When Instagram doesn't answer: { error: true }, and the comment waits in line.
 */
async function reelInfo(mediaId) {
  const key = `caption:${mediaId}`;
  const cached = await kv.get(key);
  if (cached) return { ...cached, code: cached.code || codeOf(cached.permalink), tower: cached.tower ?? cached.kind === 'tower' };
  try {
    const m = await api(mediaId, { query: { fields: 'caption,permalink' } });
    const caption = m.caption || '';
    const c = { words: captionWords(caption), permalink: m.permalink || '', code: codeOf(m.permalink), tower: postKind(caption) === 'tower' };
    await kv.set(key, c, resolvePost({ id: mediaId, ...c }, await extraPosts()) ? 6 * 3600 : 300);
    return c;
  } catch (e) {
    await noteError('caption', e, `post ${mediaId}`);
    return { error: true, words: [], permalink: '' };
  }
}

/** The same, and when Instagram doesn't answer but the post was added to the map by its number, that is enough to go on. */
async function infoFor(mediaId) {
  const info = await reelInfo(mediaId);
  if (!info.error || !resolvePost({ id: mediaId }, await extraPosts())) return info;
  const bare = { words: [], permalink: '', code: '', tower: false };
  await kv.set(`caption:${mediaId}`, bare, 300); // asked again in 5 minutes, not at every comment
  return bare;
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

// ---------- the link ----------

/**
 * The page's link with the post it came from: omnyalab.com/the-towers-blueprint?ig=DfXXXX. A redirect
 * in vercel.json sends links that carry ?ig= through /api/instagram, which counts the click for that
 * post and opens the page. If the redirect were ever missing the link opens the page all the same.
 */
const cleanPost = (p) => (/^[A-Za-z0-9_-]{1,40}$/.test(String(p || '')) ? String(p) : 'dm');
export const track = (url, post) => `${url}${url.includes('?') ? '&' : '?'}ig=${cleanPost(post)}`;

const SITE = 'https://www.omnyalab.com';
const pathOf = (url) => new URL(url).pathname.replace(/\/+$/, '');

/**
 * A click on a link the bot sent: counts it for its post and says where to go.
 * `go` is the page (the-towers-blueprint, 3d-to-film, city…), `post` the reel's code, `k` the City token.
 * Only our own pages can come out of here.
 */
export async function click(go, post, k, count = true) {
  const slug = String(go || '').replace(/^\/+|\/+$/g, '');
  const dest = T.KINDS.find((d) => d !== 'legacy' && (d === slug || pathOf(T.textsFor(d).url) === `/${slug}`));
  if (!dest) return `${SITE}/`;
  if (count) {
    try {
      await h.incr('stats', `${cleanPost(post)}|click:${dest}`);
    } catch (e) {
      await noteError('click', e);
    }
  }
  const url = `${SITE}${pathOf(T.textsFor(dest).url)}`;
  return dest === 'city' && /^[A-Za-z0-9_-]{10,40}$/.test(k || '') ? `${url}?k=${k}` : url;
}

// ---------- the flow ----------

/** The DM with the link of the page (and, on the first two Blueprints, the question under it). */
async function sendBlueprint(lead, newFollower) {
  const t = T.textsFor(lead.kind);
  const body = (newFollower ? t.blueprintNewFollower : t.blueprintFollower).replace(t.url, track(t.url, lead.post));
  if (t.ask) await question(lead.id, body);
  else await text(lead.id, body);
}

/** Omnya City: the personal one-time link, made by the same code as POST /api/city/link (ManyChat's External Request). */
async function sendHouse(lead) {
  const t = T.textsFor('city');
  const u = cleanName(lead.username);
  let url = t.url;
  if (u) {
    const r = await linkFor(u, String(lead.id).slice(0, 40));
    url = r.house ? `${t.url}/@${u}` : track(`${t.url}?k=${r.token}`, lead.post);
  } else await noteError('city', new Error('no username for the house link, sent the city map instead'), `user ${lead.id}`);
  await linkButtons(lead.id, t.link.text, [[t.link.button, url]]);
}

/** A tap on an old ManyChat button from someone we don't know: the pages to choose from. */
async function sendChoices(lead) {
  const t = T.textsFor('legacy');
  await linkButtons(lead.id, t.link.text, t.link.buttons.map(([title, dest]) => [title, track(T.textsFor(dest).url, lead.post)]));
}

async function sendLink(lead, newFollower) {
  if (lead.kind === 'city') await sendHouse(lead);
  else if (lead.kind === 'legacy') await sendChoices(lead);
  else await sendBlueprint(lead, newFollower);
  Object.assign(lead, { stage: 'asked', follows: true, sentAt: clock.now() });
  await h.incr('stats', `${cleanPost(lead.post)}|link:${lead.kind || 'blueprint'}`);
}

/** They tapped "Get the Blueprint" (afterDone false) or "Done" (true). */
async function giveBlueprint(lead, afterDone) {
  const p = await profile(lead.id);
  if (p.username) lead.username ||= p.username;
  // Instagram doesn't say: on Done we take their word for it, first time we ask for the follow
  if (p.follows === true || (p.follows === null && afterDone)) return sendLink(lead, afterDone || lead.stage === 'asked_follow');
  const t = T.textsFor(lead.kind);
  const msg = afterDone ? t.stillNotFollowing : t.followFirst;
  await button({ id: lead.id }, msg.text, msg.button, 'DONE');
  Object.assign(lead, { stage: 'asked_follow', follows: false, wasAskedFollow: true });
}

// ---------- comments: the line ----------

/** Whether this comment gets a DM: fills job.p with the post's destination, or says why not. */
async function accept(job, info) {
  const post = resolvePost({ id: job.m, code: info.code, words: info.words, tower: info.tower }, await extraPosts());
  // posts in the map answer any comment; the others only the word their caption asks for
  // (a tester, under a post that asks for nothing, can use the DM words)
  const word = post?.any ? matchWord(job.t, post.words) || post.words[0] || 'ANY' : matchWord(job.t, post ? post.words : ONLY.size ? DEFAULT_WORDS : []);
  if (!word) return 'no word';
  if (!(await kv.once(`once:${job.m}:${job.u}`))) return 'already';
  job.p = { dest: post?.dest || 'blueprint', code: info.code || cleanPost(job.m), word, link: info.permalink || '' };
  delete job.raw;
  return null;
}

/**
 * A comment under one of our posts. It is not answered here: it joins the line ('queued') and
 * drain() sends the DMs in order, at most 750 an hour. Returns why not when it gets nothing.
 */
export async function onComment(ownId, v) {
  const from = v.from || {};
  if (!from.id || String(from.id) === String(ownId) || !v.id) return 'skip';
  if (ONLY.size && !ONLY.has(String(from.id)) && !ONLY.has(String(from.username || '').toLowerCase())) return 'not tester';
  // Meta can deliver the same comment twice: the second one stops here
  if (!(await kv.once(`c:${v.id}`, 8 * 86_400))) return 'dup';
  const now = clock.now();
  const job = { c: v.id, u: from.id, n: from.username || '', m: v.media?.id || '', t: String(v.text || '').slice(0, 300), at: now, tries: 0 };
  const info = job.m ? await infoFor(job.m) : { words: [], permalink: '' };
  if (info.error) job.raw = true; // Instagram didn't give us the caption: decided when its turn comes
  else {
    const no = await accept(job, info);
    if (no) return no;
  }
  await kv.set(`job:${job.c}`, job, 8 * 86_400);
  await z.add('q', now, job.c);
  if (job.p) await h.incr('stats', `${job.p.code}|c`);
  return 'queued';
}

const done = async (cid) => {
  await z.rem('q', cid);
  await kv.del(`job:${cid}`);
};

/** Back in line for later. */
async function again(job, at) {
  await kv.set(`job:${job.c}`, job, 8 * 86_400);
  await z.add('q', at, job.c);
  await kv.del(`lease:${job.c}`);
}

/**
 * One comment's turn: the DM with the button (the private reply), the public reply under the comment,
 * the lead. Returns 'sent', 'nodm' (this person can't get DMs: public "send us a text"), 'retry'
 * (Meta's side failed, back in line), 'hold' (Meta said slow down), or why it was dropped.
 * ctx.stop is set when the line must stop for now.
 */
async function deliver(job, ctx) {
  const cid = job.c;
  const now = ctx.now;
  if (now - job.at > COMMENT_LIFE) {
    await noteError('line', new Error('a comment waited more than 7 days and was let go'), `comment ${cid}`);
    await z.rem('sent', cid);
    await done(cid);
    return 'expired';
  }
  if (job.raw) {
    const info = await infoFor(job.m);
    const no = info.error ? 'retry' : await accept(job, info);
    if (no) {
      await z.rem('sent', cid); // no DM went out: the place of the hour is free again
      if (no !== 'retry') return await done(cid), no;
      job.tries = (job.tries || 0) + 1;
      if (job.tries > RETRY_MINUTES.length) return await done(cid), 'no caption';
      await again(job, now + RETRY_MINUTES[job.tries - 1] * 60_000);
      return 'retry';
    }
    await h.incr('stats', `${job.p.code}|c`);
  }

  const p = job.p;
  const t = T.textsFor(p.dest);
  let uid = job.uid || job.u;
  if (!job.dm) {
    try {
      if (ONLY.size) await kv.set(`tester:${job.u}`, 1, 7 * 86_400);
      // the button carries its post, so the tap finds the right link even when Instagram gives the tap another id
      const r = await button({ comment_id: cid }, t.opener.text, t.opener.button, `GET:${p.dest}:${p.code}`, () => z.add('sent', now, `${cid}:2`));
      if (r.recipient_id) uid = r.recipient_id;
      if (ONLY.size) await kv.set(`tester:${uid}`, 1, 7 * 86_400);
      job.dm = 'sent';
      if (ctx.probing) {
        await kv.del('hold'); // it works again
        ctx.probing = false;
      }
    } catch (e) {
      const kind = errorKind(e);
      if (kind === 'user') console.warn('[ig] private reply refused for this person:', e.message);
      else await noteError('private reply', e, `comment ${cid} @${job.n}`);
      if (kind === 'rate') {
        // Meta counts differently from us (another app sent DMs too?): stop, keep the place in line
        await kv.set('hold', { until: now + RATE_HOLD, mins: 5, why: 'Meta: too many calls' }, 3600);
        await again(job, job.at);
        ctx.stop = true;
        return 'hold';
      }
      if (kind === 'gone') {
        await done(cid);
        return 'gone';
      }
      if (kind === 'system') {
        // not this person's fault: nobody is given up for it, the comment goes back in line
        if (ctx.probing) {
          const mins = Math.min((ctx.hold?.mins || 2) * 2, 15);
          await kv.set('hold', { until: now + mins * 60_000, mins, why: e.message.slice(0, 140) }, 3600);
          ctx.stop = true;
        } else if ((await kv.incr('fails', 600)) >= FAILS_BEFORE_HOLD) {
          await kv.set('hold', { until: now + 2 * 60_000, mins: 2, why: e.message.slice(0, 140) }, 3600);
          await kv.del('fails');
          ctx.stop = true;
        }
        job.tries = (job.tries || 0) + 1;
        if (job.tries <= RETRY_MINUTES.length) {
          await again(job, now + RETRY_MINUTES[job.tries - 1] * 60_000);
          return 'retry';
        }
      }
      job.dm = 'nodm';
    }
    job.uid = uid;
    await kv.set(`job:${cid}`, job, 8 * 86_400); // if this call dies before the end, the next one doesn't send the DM again
  }
  const dm = job.dm === 'sent';

  if (!job.pub) {
    try {
      await replyComment(cid, dm ? t.publicReplies[Math.floor(Math.random() * t.publicReplies.length)] : t.cantDm);
    } catch (e) {
      await noteError('public reply', e, `comment ${cid}`);
    }
    job.pub = true;
  }

  try {
    return await keep(job, uid, dm, now);
  } catch (e) {
    // Redis failed after the messages went out: remember that they did, so the next try sends nothing twice
    await kv.set(`job:${cid}`, job, 8 * 86_400).catch(() => {});
    throw e;
  }
}

/** After the DM and the public reply: the lead, the numbers, the reminder, and the comment leaves the line. */
async function keep(job, uid, dm, now) {
  const cid = job.c;
  const p = job.p;
  const lead = (await getLead(uid)) || newLead(uid);
  Object.assign(lead, {
    username: job.n || lead.username,
    media: job.m,
    permalink: p.link || lead.permalink,
    word: p.word,
    kind: p.dest,
    post: p.code,
    comment: job.t,
    commentId: cid,
    commentAt: job.at,
    stage: dm ? 'opened' : 'nodm',
    seen: false,
    reels: [...new Set([...(lead.reels || []), job.m])],
  });
  await saveLead(lead);
  await h.incr('stats', `${p.code}|${dm ? 'dm' : 'nodm'}`);
  if (dm) await later(now + REMIND_AFTER, { k: 'remind', id: uid, c: cid });
  await done(cid);
  return dm ? 'sent' : 'nodm';
}

/**
 * Sends the DMs of the comments in line, oldest first, and stops when the hour is full (750), when
 * Meta says slow down, or when the time for this call is over. Runs on every webhook call and on
 * every /api/igtick. Returns a Map: comment id → what happened.
 */
export async function drain({ budget = 6000, max = 100 } = {}) {
  const out = new Map();
  const started = Date.now();
  const now = clock.now();
  if (!(await z.range('q', '-inf', now, 1)).length) return out; // nobody waiting: one question to Redis and that's it
  const hold = await kv.get('hold');
  if (hold && hold.until > now) return out;
  // after a stop the first DM is a try: if it goes, back to normal; if not, a longer stop
  const ctx = { now, hold, probing: !!hold, stop: false };
  while (!ctx.stop && out.size < max && Date.now() - started < budget) {
    const ids = await z.range('q', '-inf', now, 20);
    let moved = false;
    for (const cid of ids) {
      if (ctx.stop || out.size >= max || Date.now() - started >= budget) break;
      if (out.has(cid)) continue;
      if (!(await takePlace('sent', cid, HOURLY_CAP, H, now))) return out; // the hour is full: the rest waits
      if (!(await kv.once(`lease:${cid}`, 120))) continue; // another call is on this one right now
      const job = await kv.get(`job:${cid}`);
      if (!job) {
        await z.rem('q', cid);
        await z.rem('sent', cid);
        continue;
      }
      try {
        out.set(cid, await deliver(job, ctx));
      } catch (e) {
        // our own fault (Redis, a bug): keep the comment, look again in two minutes
        await noteError('line', e, `comment ${cid}`);
        await z.add('q', now + 120_000, cid).catch(() => {});
        out.set(cid, 'error');
      }
      moved = true;
    }
    if (!moved) break;
  }
  return out;
}

/** The line and the hour, for the health check and Nico's page. */
export async function lineState() {
  const now = clock.now();
  const [waiting, first, sentLastHour, hold] = await Promise.all([z.card('q'), z.first('q'), z.count('sent', now - H + 1, '+inf'), kv.get('hold')]);
  return {
    waiting,
    oldestMinutes: first ? Math.max(0, Math.round((now - first.score) / 60_000)) : 0,
    sentLastHour,
    cap: HOURLY_CAP,
    stoppedUntil: hold && hold.until > now ? new Date(hold.until).toISOString() : null,
    stoppedWhy: hold && hold.until > now ? hold.why : null,
  };
}

// ---------- DMs and taps ----------

const OURS = new Set(['GET', 'DONE', 'PROJECT', 'CURIOUS']);
const plain = (s) => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/** A DM, a tap, a "seen" or an echo of a message sent from the account. */
export async function onMessaging(ownId, m) {
  const msg = m.message || {};
  const mid = msg.mid || m.postback?.mid;

  if (msg.is_echo) {
    // sent from @omnyalab but not by the bot: Nico is talking to them, the bot steps back
    // (our own messages are known by the app's id, or by their id kept when they were sent)
    if (mid && String(msg.app_id || '') !== APP_ID && !(await kv.get(`mine:${mid}`))) {
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
    if (await kv.get(`nottester:${uid}`)) return 'not tester';
    const p = await profile(uid);
    if (!ONLY.has(String(p.username || '').toLowerCase())) {
      await kv.set(`nottester:${uid}`, 1, 86_400);
      return 'not tester';
    }
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

  const raw = String(m.postback?.payload || msg.quick_reply?.payload || '');
  const said = String(msg.text || '').trim();
  if (!raw && !said) return 'skip'; // reactions, stickers, attachments only
  // Meta can deliver the same DM or tap twice: handled once (by its id, or by sender + time when it has none)
  const seen = mid ? `got:${mid}` : m.timestamp ? `got:${uid}:${m.timestamp}:${(raw || said).slice(0, 40)}` : '';
  if (seen && !(await kv.once(seen, 7 * 86_400))) return 'dup';

  // our buttons say what they are in the payload ("GET:towers:DfXXXX"); the buttons of the old
  // ManyChat DMs only have their label ("Get the Blueprint", "Following", "Get my house", "Done")
  const [act, tapDest, tapPost] = raw.split(':');
  let payload = OURS.has(act) ? act : '';
  let old = payload ? null : T.oldButtons[plain(m.postback ? m.postback.title : raw ? '' : said)];

  let lead = await getLead(uid);
  // typed, not tapped: the old words count only while the person is still waiting for the link
  if (old && !m.postback && lead && !['new', 'opened', 'nodm', 'asked_follow'].includes(lead.stage)) old = null;
  if (old) payload = old.payload;

  if (!lead) {
    // a DM out of nowhere: only a keyword or one of our buttons starts the flow, the rest is Nico's
    // (a tap on our button can come with an id we never saw: the comment's id is not always the DM's)
    const ours = ['GET', 'DONE'].includes(payload);
    const mapWord = !ours && said.split(/\s+/).length <= 2 ? WORDS.find((w) => matchWord(said, [w.word])) : null;
    const word = mapWord?.word || matchWord(said, DEFAULT_WORDS);
    if (!ours && !word) return 'not ours';
    lead = newLead(uid);
    lead.word = word || (old ? 'MANYCHAT' : 'BLUEPRINT');
    lead.kind = old ? old.kind : mapWord ? mapWord.dest : 'blueprint';
    lead.post = old ? 'manychat' : 'dm';
    lead.stage = 'opened';
  }
  // the tapped button says which post it was for (someone who commented under two reels taps the first DM)
  if (payload === 'GET' && isDest(tapDest)) Object.assign(lead, { kind: tapDest, post: cleanPost(tapPost) });
  lead.lastUserAt = clock.now();
  lead.seen = true;
  await later(lead.lastUserAt + NUDGE_AFTER, { k: 'nudge', id: uid });

  const isDone = payload === 'DONE' || (lead.stage === 'asked_follow' && /^(done|did it|followed|follow(ed|ing)? ?(done|you)?|ok(ay)?|fatto|yes|yep|si|sì)\b/i.test(said));
  let what = 'free';
  if (payload === 'GET') what = 'get';
  else if (isDone) what = 'done';
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

/** Reminders and follow-ups that are due. Runs on every webhook call and on every /api/igtick. */
export async function tick(now = clock.now()) {
  const out = [];
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
        const tx = T.textsFor(lead.kind);
        if (lead.stage === 'asked_follow') {
          const p = await profile(lead.id);
          if (p.follows === true) await sendLink(lead, true);
          else await button({ id: lead.id }, tx.nudgeFollow.text, tx.nudgeFollow.button, 'DONE');
        } else if (lead.stage === 'asked' && tx.nudgeQuestion) {
          if (tx.ask) await question(lead.id, tx.nudgeQuestion);
          else await text(lead.id, tx.nudgeQuestion);
        } else continue;
        lead.nudged = true;
      }
      await saveLead(lead);
      out.push(t.k);
    } catch (e) {
      await noteError(`tick ${t.k}`, e, `user ${t.id}`);
    }
  }
  return out;
}

// ---------- for Nico: the numbers and the health check ----------

/** Per post: comments taken, DMs sent, DMs refused, links sent, clicks. From the 'stats' counters. */
export async function postStats() {
  const all = await h.all('stats');
  const rows = new Map();
  for (const [field, n] of Object.entries(all)) {
    const [post, what] = field.split('|');
    const [name, dest] = String(what).split(':');
    const r = rows.get(post) || rows.set(post, { post, dest: new Set(), c: 0, dm: 0, nodm: 0, link: 0, click: 0 }).get(post);
    if (name in r && name !== 'post' && name !== 'dest') r[name] += Number(n);
    if (dest) r.dest.add(dest);
  }
  const extraMap = await extraPosts();
  return [...rows.values()]
    .map((r) => ({ ...r, dest: [...r.dest].join(', ') || extraMap[r.post] || POSTS.find((p) => p.code === r.post)?.dest || '' }))
    .sort((a, b) => b.c + b.link - (a.c + a.link));
}

/** The last errors, newest first, and how many in the last hour. */
export async function errorState(n = 10) {
  const now = clock.now();
  const [lastHour, rows] = await Promise.all([z.count('errs', now - H, '+inf'), z.last('errs', n)]);
  return { lastHour, last: rows.map((r) => JSON.parse(r)).map((e) => ({ at: new Date(e.at).toISOString(), where: e.where, msg: e.msg })) };
}

/** Remembers the last comment Meta sent us (any comment, also the ones that get nothing): proof that the webhook is on. */
export const noteComment = (v, did) =>
  kv.set('last', { at: clock.now(), from: v.from?.username || v.from?.id || '', media: v.media?.id || '', text: String(v.text || '').slice(0, 60), did }, 30 * 86_400).catch(() => {});

/** The posts and words the bot answers, as it sees them now. */
export async function postMap() {
  return {
    posts: [...POSTS.map(({ code, dest }) => ({ code, dest })), ...Object.entries(await extraPosts()).map(([code, dest]) => ({ code, dest, added: 'from /api/leads' }))],
    words: WORDS,
  };
}

/**
 * Everything Nico needs to know before a reel: is the token good, which webhook fields are on,
 * when the last comment came in, the line, the errors of the last hour. Asks Meta three things
 * (who am I, what is the Page subscribed to, what is the app subscribed to) and never throws.
 */
export async function health() {
  const now = clock.now();
  const out = { time: new Date(now).toISOString(), on: !(await isOff().catch(() => false)), mode: ONLY.size ? `only testers: ${[...ONLY].join(', ')}` : 'everyone' };
  let p = {};
  try {
    p = await page(true);
    if (p.id) out.token = { ok: true, page: p.name, pageId: p.id, instagram: p.ig };
    else {
      const me = await graph('me', p.token, { query: { fields: 'id,name' } });
      out.token = { ok: true, note: 'the token works but shows no Facebook Page with an Instagram account', id: me.id, name: me.name };
    }
  } catch (e) {
    out.token = { ok: false, error: e.message };
  }
  out.webhook = {};
  try {
    if (!p.id) throw new Error('no Page to ask');
    const j = await graph(`${p.id}/subscribed_apps`, p.token);
    out.webhook.page = (j.data || []).map((a) => ({ app: a.name || a.id, id: a.id, fields: a.subscribed_fields || [] }));
  } catch (e) {
    out.webhook.page = { error: e.message };
  }
  try {
    const secret = String(process.env.IG_APP_SECRET || '').trim();
    if (!secret) throw new Error('IG_APP_SECRET is not set');
    const j = await graph(`${APP_ID}/subscriptions`, `${APP_ID}|${secret}`);
    out.webhook.app = (j.data || []).map((s) => ({ object: s.object, active: s.active, url: s.callback_url, fields: (s.fields || []).map((f) => f.name || f) }));
    const igFields = out.webhook.app.filter((s) => s.object === 'instagram' && s.active).flatMap((s) => s.fields);
    out.webhook.missing = ['comments', 'messages', 'messaging_postbacks'].filter((f) => !igFields.includes(f));
  } catch (e) {
    out.webhook.app = { error: e.message };
  }
  try {
    const last = await kv.get('last');
    out.lastComment = last ? { at: new Date(last.at).toISOString(), minutesAgo: Math.round((now - last.at) / 60_000), from: last.from, text: last.text, post: last.media, did: last.did } : null;
    out.line = await lineState();
    out.errors = await errorState(5);
    out.map = await postMap();
  } catch (e) {
    out.store = { error: e.message };
  }
  return out;
}
