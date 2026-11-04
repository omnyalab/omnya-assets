// The WhatsApp lead bot: WhatsApp Cloud API (Meta) in coexistence with Nico's WhatsApp Business app.
// Nico keeps using the app on his phone and sees everything; the bot answers only new leads,
// steps aside as soon as Nico writes in a chat, and sends him a push (ntfy) + an email
// whenever a chat needs him: prices, dates, calls, payments, discounts, files, "are you a bot?".
// State lives in Upstash Redis (the same store as bookings and the Instagram bot).
import { redis, hasStore } from './store.js';
import { sendMail } from './mail.js';
import { host } from './config.js';
import { think as realThink } from './wa-brain.js';

let think = realThink;
export const _setThink = (fn) => (think = fn); // local tests only

const GRAPH = process.env.WA_GRAPH_URL || 'https://graph.facebook.com';
const V = process.env.WA_API_VERSION || 'v24.0';
const TOKEN = () => process.env.WA_TOKEN;
const PHONE_ID = () => process.env.WA_PHONE_ID;
const P = 'omnya:wa:';

export const DEBOUNCE = Number(process.env.WA_DEBOUNCE_MS || 20_000); // leads send 2-3 messages in a row: wait, then answer all
export const RENOTIFY = 60 * 60_000; // a chat waiting for Nico pings him again at most once an hour
const MONTH_CAP = Number(process.env.WA_MONTH_CAP || 4000); // safety net on Meta costs, Nico is told when it's reached
const HISTORY = 40; // messages of the chat the bot reads

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const digits = (s) => String(s || '').replace(/\D/g, '');

// ---------- store (Redis, or memory for local tests) ----------
const mem = { kv: new Map(), sets: new Map(), lists: new Map(), hashes: new Map() };
export const _mem = mem;

async function get(k) {
  return hasStore() ? redis('GET', P + k) : mem.kv.get(k) ?? null;
}
async function set(k, v, ...opts) {
  if (hasStore()) return redis('SET', P + k, String(v), ...opts);
  if (opts[0] === 'NX' && mem.kv.has(k)) return null;
  mem.kv.set(k, String(v));
  return 'OK';
}
async function del(k) {
  return hasStore() ? redis('DEL', P + k) : mem.kv.delete(k);
}
async function incr(k) {
  if (hasStore()) return redis('INCR', P + k);
  const n = Number(mem.kv.get(k) || 0) + 1;
  mem.kv.set(k, String(n));
  return n;
}
async function sadd(k, ...v) {
  if (!v.length) return;
  if (hasStore()) return redis('SADD', P + k, ...v);
  const s = mem.sets.get(k) || new Set();
  v.forEach((x) => s.add(x));
  mem.sets.set(k, s);
}
async function srem(k, v) {
  return hasStore() ? redis('SREM', P + k, v) : mem.sets.get(k)?.delete(v);
}
async function sismember(k, v) {
  return hasStore() ? (await redis('SISMEMBER', P + k, v)) === 1 : Boolean(mem.sets.get(k)?.has(v));
}
export async function smembers(k) {
  return hasStore() ? redis('SMEMBERS', P + k) : [...(mem.sets.get(k) || [])];
}
async function rpush(k, v) {
  if (hasStore()) {
    await redis('RPUSH', P + k, v);
    await redis('LTRIM', P + k, -200, -1);
    return;
  }
  const l = mem.lists.get(k) || [];
  l.push(v);
  mem.lists.set(k, l.slice(-200));
}
async function lrange(k, n) {
  return hasStore() ? redis('LRANGE', P + k, -n, -1) : (mem.lists.get(k) || []).slice(-n);
}
async function hset(k, obj) {
  const flat = Object.entries(obj).flatMap(([a, b]) => [a, String(b)]);
  if (hasStore()) return redis('HSET', P + k, ...flat);
  mem.hashes.set(k, { ...(mem.hashes.get(k) || {}), ...Object.fromEntries(Object.entries(obj).map(([a, b]) => [a, String(b)])) });
}
async function hgetall(k) {
  if (!hasStore()) return mem.hashes.get(k) || {};
  const arr = (await redis('HGETALL', P + k)) || [];
  const o = {};
  for (let i = 0; i < arr.length; i += 2) o[arr[i]] = arr[i + 1];
  return o;
}

// ---------- public state helpers (admin page) ----------
export const isEnabled = async () => (await get('enabled')) === '1';
export const setEnabled = (on) => set('enabled', on ? '1' : '0');
export const excluded = () => smembers('excluded');
export const exclude = (n) => sadd('excluded', digits(n));
export const unexclude = (n) => srem('excluded', digits(n));
export const chatState = (n) => hgetall(`state:${n}`);
export const setStatus = (n, status) => hset(`state:${n}`, { status, changed: Date.now() });
export const chatLog = async (n, k = HISTORY) => (await lrange(`chat:${n}`, k)).map((r) => (typeof r === 'string' ? JSON.parse(r) : r));
export async function chats() {
  const ids = await smembers('chats');
  const rows = await Promise.all(ids.map(async (n) => ({ n, ...(await chatState(n)) })));
  return rows.sort((a, b) => Number(b.last || 0) - Number(a.last || 0));
}
export const monthKey = (t = Date.now()) => `count:${new Date(t).toISOString().slice(0, 7)}`;
export const monthCount = async () => Number((await get(monthKey())) || 0);

// ---------- Meta Graph API ----------
const sent = []; // local tests: what would have gone to WhatsApp
export const _sent = sent;

async function graph(body) {
  if (!TOKEN() || !PHONE_ID()) {
    sent.push(body);
    return { messages: [{ id: `local.${sent.length}` }] };
  }
  const res = await fetch(`${GRAPH}/${V}/${PHONE_ID()}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', ...body }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`whatsapp ${res.status}: ${j.error?.message || 'error'}`);
  return j;
}

/** Blue ticks + "typing…" on the lead's last message (lasts up to 25 s or until we send). */
const typing = (msgId) => graph({ status: 'read', message_id: msgId, typing_indicator: { type: 'text' } }).catch(() => {});

async function sendText(to, body) {
  const j = await graph({ to, type: 'text', text: { body, preview_url: /omnyalab\.com/.test(body) } });
  const id = j.messages?.[0]?.id;
  if (id) await set(`mine:${id}`, '1', 'EX', 7 * 86400); // so its echo (if any) is not taken for Nico
  return id;
}

// ---------- notifications to Nico ----------
export async function notify(n, title, text) {
  const topic = process.env.NTFY_TOPIC;
  const click = `https://wa.me/${n}`;
  const jobs = [];
  if (topic) {
    jobs.push(
      fetch(process.env.NTFY_URL || 'https://ntfy.sh/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, title, message: text, click, priority: 4, tags: ['speech_balloon'] }),
      }).catch((e) => console.error('[wa] ntfy', e.message)),
    );
  }
  if (process.env.RESEND_API_KEY) {
    jobs.push(sendMail({ to: host.email, subject: `WhatsApp · ${title}`, text: `${text}\n\nApri la chat: ${click}` }).catch((e) => console.error('[wa] mail', e.message)));
  }
  if (!jobs.length) sent.push({ notify: { n, title, text } });
  await Promise.all(jobs);
}

// ---------- inbound ----------
export function describe(m) {
  switch (m.type) {
    case 'text': return m.text?.body || '';
    case 'image': return `[foto]${m.image?.caption ? ' ' + m.image.caption : ''}`;
    case 'video': return `[video]${m.video?.caption ? ' ' + m.video.caption : ''}`;
    case 'document': return `[file: ${m.document?.filename || 'documento'}]${m.document?.caption ? ' ' + m.document.caption : ''}`;
    case 'audio': return '[vocale]';
    case 'sticker': return '[sticker]';
    case 'location': return '[posizione]';
    case 'contacts': return '[contatto]';
    case 'button': return m.button?.text || '';
    case 'interactive': return m.interactive?.button_reply?.title || m.interactive?.list_reply?.title || '';
    default: return `[${m.type}]`;
  }
}

const FILE_TYPES = new Set(['image', 'video', 'document']);

/** Who the bot may talk to. Returns null if it may answer, otherwise the reason it stays quiet. */
export async function blocked(n) {
  const allow = (process.env.WA_ALLOW || '').split(',').map(digits).filter(Boolean);
  if (allow.length && !allow.includes(n)) return 'not-in-test-list';
  if (!(await isEnabled())) return 'bot-off';
  if (await sismember('excluded', n)) return 'excluded';
  if (await sismember('known', n)) return 'existing-chat';
  return null;
}

/**
 * A message from a lead. Saves it and returns a job to run after the response
 * (waitUntil): wait DEBOUNCE, and if no newer message came in, answer.
 */
export async function onInbound(m, contact, { now = Date.now() } = {}) {
  if (m.type === 'reaction' || m.group_id) return null;
  const n = digits(m.from);
  if (!n) return null;
  if (await get(`seen:${m.id}`)) return null; // Meta retries
  await set(`seen:${m.id}`, '1', 'EX', 3 * 86400);

  const text = describe(m);
  await rpush(`chat:${n}`, JSON.stringify({ r: 'lead', t: text, ts: now, file: FILE_TYPES.has(m.type) || undefined }));
  await sadd('chats', n);
  const st = await chatState(n);
  await hset(`state:${n}`, { last: now, name: contact?.profile?.name || st.name || '', first: st.first || now, ...(st.status ? {} : { status: 'bot' }) });

  const why = await blocked(n);
  if (why) return null;
  const status = st.status || 'bot';
  if (status === 'nico') return null;
  if (status === 'waiting') {
    if (now - Number(st.notified || 0) > RENOTIFY) {
      await hset(`state:${n}`, { notified: now });
      await notify(n, `${st.name || '+' + n} ha scritto ancora`, `Ultimo messaggio: ${text}\n\nLa chat aspetta te.`);
    }
    return null;
  }
  await set(`pending:${n}`, m.id, 'EX', 3600);
  return async () => {
    await sleep(DEBOUNCE);
    if ((await get(`pending:${n}`)) !== m.id) return 'newer-message';
    return answer(n, m.id);
  };
}

/** Nico wrote from the app (smb_message_echoes): from now on the chat is his. */
export async function onEcho(e, { now = Date.now() } = {}) {
  const n = digits(e.to);
  if (!n || (await get(`mine:${e.id}`))) return null;
  await rpush(`chat:${n}`, JSON.stringify({ r: 'nico', t: describe(e), ts: now }));
  await sadd('chats', n);
  await hset(`state:${n}`, { status: 'nico', changed: now, last: now });
  await del(`pending:${n}`);
  return 'nico';
}

/** Chats imported at onboarding (history) and saved contacts (state sync) are existing clients. */
export const markKnown = (...ns) => sadd('known', ...ns.map(digits).filter(Boolean));

// ---------- the answer ----------
async function answer(n, lastId) {
  if (!(await set(`lock:${n}`, '1', 'NX', 'EX', 90))) return 'busy';
  try {
    if (await blocked(n)) return 'blocked';
    const st = await chatState(n);
    if (st.status && st.status !== 'bot') return 'not-bot';
    const count = await monthCount();
    if (count >= MONTH_CAP) {
      if (!(await get(`capped:${monthKey()}`))) {
        await set(`capped:${monthKey()}`, '1', 'EX', 32 * 86400);
        await notify(n, 'Bot fermo: tetto messaggi del mese', `Il bot ha mandato ${count} messaggi questo mese e si è fermato (WA_MONTH_CAP). Le chat nuove restano a te.`);
      }
      return 'cap';
    }

    await typing(lastId);
    const log = await chatLog(n);
    const out = await think(log, { name: st.name, now: Date.now() });
    const who = st.name ? `${st.name} (+${n})` : `+${n}`;

    if (out.decision === 'handoff') {
      await hset(`state:${n}`, { status: 'waiting', reason: out.reason, notified: Date.now(), summary: out.summary_it });
      const say = ['bot_question', 'files'].includes(out.reason) ? out.messages : [];
      await speak(n, say);
      await notify(n, `${who}: ${LABEL[out.reason] || 'serve te'}`, out.summary_it || 'Apri la chat.');
      return `handoff:${out.reason}`;
    }
    await speak(n, out.messages);
    await hset(`state:${n}`, { summary: out.summary_it || '' });
    return 'reply';
  } finally {
    await del(`lock:${n}`);
  }
}

const LABEL = {
  price: 'chiede un prezzo', date: 'chiede date o tempi', call: 'vuole una call', payment: 'parla di pagamento',
  discount: 'chiede uno sconto', files: 'ha mandato dei file', bot_question: 'chiede se è un bot', guard: 'risposta bloccata, serve te', other: 'serve te',
};

async function speak(n, messages) {
  for (const [i, msg] of messages.entries()) {
    if (i > 0) await sleep(Math.min(6000, 1200 + msg.length * 45));
    await sendText(n, msg);
    await incr(monthKey());
    await rpush(`chat:${n}`, JSON.stringify({ r: 'bot', t: msg, ts: Date.now() }));
  }
}
