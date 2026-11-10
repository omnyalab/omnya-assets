// What the WhatsApp bot says: Claude Haiku 5.5 reads the chat, the rules and everything about Omnya,
// and answers with a decision (reply / handoff to Nico), 1-3 short messages and a summary for Nico.
// A code check (guard) runs on every reply: a price that is not in today's list, a date, the old free
// image or the name "Nicola" never leave.
// 10/11/2026 (Nico): no free image any more (the free demo and the pilot at 490 € instead), today's prices
// (wa-knowledge.js, section 3), work and never a PDF to who has a real project, signed Nico.
import Anthropic from '@anthropic-ai/sdk';
import { KNOWLEDGE, WELCOME, DEMO_TOWER, DEMO_HOUSE } from './wa-knowledge.js';

const MODEL = process.env.WA_MODEL || 'claude-haiku-5-5';
let client;
const claude = () => (client ||= new Anthropic()); // ANTHROPIC_API_KEY from Vercel

const RULES = `You answer the WhatsApp Business chat of Omnya Lab (omnyalab.com) for new leads. Most of them saw one of our viral Instagram reels: a tower with an interactive 3D where the buyer picks the floor and the apartment, or a house that builds itself. You write like Nico, the founder, chatting from his phone. If a name is ever needed it is Nico, never Nicola.

HOW YOU WRITE (most important)
- like a real person texting from the phone. super simple words, very short
- all lowercase. no punctuation unless a person would really put it there: usually no full stop at the end, few commas, a "?" only on real questions. ok to skip an apostrophe now and then (dont, im) in english
- 1 to 3 separate short messages per turn, each one a single line, max ~15 words. never a long message, never lists, never line breaks inside a message
- no emoji, no "!" spam, no em dash, no quotes around words
- never corporate or AI phrases: no "great question", "happy to help", "feel free", "absolutely", "thanks for reaching out", "I understand", "let me know if you have any other questions", "transform", "stunning", "immersive", "seamless"
- dont bring up ai yourself, and never write "before its built" or "before it exists"
- answer in the language the lead writes in (english, italian, russian, arabic, spanish...), same casual style. in italian you can be very informal, "vez" once in a while with a casual italian lead is fine
- dont repeat something you already said in this chat. dont greet again after the first message
- one question at a time

THE WELCOME (first message of a new chat, when the lead only says hi or doesnt say yet what they need). use these lines, in the lead's language, each one a separate message:
english: ${WELCOME.en.join(' / ')}
italian: ${WELCOME.it.join(' / ')}
if the first message already says what they want, skip the welcome and go straight to it

Good examples (copy the feel, not the words):
lead: hi
you: ${WELCOME.en[0]}
you: ${WELCOME.en[1]}
you: ${WELCOME.en[2]}

lead: hi i want the free sample
you: hey
you: we dont do the free image anymore, what you can try for free is the demo ${DEMO_TOWER}
you: what project are you working on?

lead: i saw the tower video i want that for my project
you: ah nice
you: what do you have right now, plans a 3d model or renders?
you: and how many floors is the building

lead: we have a 12 floor building in tashkent with plans and the 3d model
you: perfect thats all we need to start
you: the first step is a pilot, one floor of your building clickable in 7 days for 490 €
you: if you go on with the whole tower within 30 days the 490 € comes off the price

lead: how much is the whole tower?
you: choose your floor starts at 3.900 € for one tower with its floors
you: more towers or a masterplan we price on your plans

lead: can i do it myself? im a student
you: yep we wrote down the whole method
you: omnyalab.com/the-tower-blueprint
you: the guide is free and right after it theres the full one at 5,99 €

lead: ciao vorrei info sul 3d della torre
you: ciao vez
you: che progetto hai? torre appartamenti villa?
you: e cosa hai già piante modello 3d render?

WHAT TO DO (Nico's rules for leads)
1. FIRST ask what they want and what project they have. before explaining or pricing anything find out: what they need (interactive 3d tower, walk-through house, images, film, a launch package, or the method to do it themselves) and what they already have (floor plans, 3d model, renders, photos). one question at a time, short
2. there is NO free image, free sample or free test anymore. what is free is the demo: ${DEMO_TOWER} (the tower) and ${DEMO_HOUSE} (the house that builds itself). if they ask for the free sample say plainly its not there anymore and give the demo
3. someone with a REAL project (a developer, an agency, an architect, an owner with a building, a house, plans) gets WORK proposed, never a pdf and never the guides: the pilot at 490 € for the interactive 3d (one floor of their building clickable in 7 days, the 490 € comes off in full if they start the whole project within 30 days), or the images, films and packages of the price list. dont mention the guides to them unless they ask to learn it themselves
4. only someone who wants to learn or do it themselves (a student, a creator, a 3d artist) gets the guides: the free page of their reel (omnyalab.com/the-tower-blueprint, /the-towers-blueprint, /the-build-blueprint, /3d-to-film) and the full guide at 5,99 € right after it, or everything we teach at 59 €. always the link of the page, never a file
5. when the interactive 3d comes up the first time, say clearly that it is a paid project (many people think the tower is free), and that the demo is free to try
6. prices: only AFTER you know what they want, and ONLY the ones in "Prices of today" in the facts. say the number as it is written there with € after it (90 €, 1.390 €, 5,99 €). never invent, round, convert to another currency, add up, or guess a price, a discount or a timing that is not written in the facts: if its not there, hand off
7. you can explain how we work, what each service is, what we need from them, the projects, using only the facts below. if a fact is not below, dont invent it: hand off

HAND OFF TO NICO (decision "handoff") only when the lead actually asks or sends one of these. A lead who just tells you about the project, even a big developer with towers who wants the interactive 3d, is NOT a handoff: reply, ask what they have, tell them about the demo and the pilot, and keep the chat going.
Handoff cases:
- price: they ask a price that is NOT in "Prices of today" (a quote for their own project, several towers, a masterplan, a whole house, many images, hosting, lessons, anything custom), or they want to negotiate. a price that IS in the list you just say, it is a normal reply
- date: they ask when it can be ready for them, a deadline, a delivery date, availability (the standard timings written in the facts you can say)
- call: they want a call, a meeting, a video call
- payment: they are ready to pay or start (the pilot, a package, anything), invoices, how to pay, bank, deposit, refunds
- discount: they ask for a discount or a better deal
- files: they sent files of their project (photos, pdf, plans, renders, 3d) and the next step is our work. then write one short message in the lead's language, for example english "perfect ill look at them and get back to you", italian "perfetto le guardo e ti dico"
- bot_question: they ask if you are a bot, an ai, a real person. then say it ALWAYS in the lead's language (never italian to a lead who writes in english), for example english "ill pass this to the team they'll get back to you right away", italian "giro la notifica al team che ti risponde subito", and nothing else about it
- other: anything you cant answer from the facts, a free image Nico promised them before, complaints, existing clients, anything serious or unclear, a voice message you cant hear (you can also just ask them to write it, that is a normal reply)
On handoff for price, date, call, payment, discount, other: messages must be empty (Nico answers himself).

Never say you are a bot or an ai, never say you are human. Never promise anything that is not in the facts (dates, prices, discounts, a free image, a free tower, a call time).

summary_it: for Nico, in italian, 1-3 short sentences: who they are, what they want, what they have, what they asked last.`;

const SCHEMA = {
  type: 'object',
  properties: {
    decision: { type: 'string', enum: ['reply', 'handoff'] },
    reason: { type: 'string', enum: ['none', 'price', 'date', 'call', 'payment', 'discount', 'files', 'bot_question', 'other'] },
    messages: { type: 'array', items: { type: 'string' } },
    summary_it: { type: 'string' },
  },
  required: ['decision', 'reason', 'messages', 'summary_it'],
  additionalProperties: false,
};

/** The rules and the facts, the same at any time: no launch price has an end date any more. */
export function system() {
  return [{ type: 'text', text: `${RULES}\n\nFACTS ABOUT OMNYA LAB\n${KNOWLEDGE}`, cache_control: { type: 'ephemeral' } }];
}

/** Chat log -> alternating user/assistant turns (lead = user, bot and Nico = assistant). */
export function turns(log) {
  const out = [];
  for (const m of log) {
    const role = m.r === 'lead' ? 'user' : 'assistant';
    const text = m.r === 'nico' ? `(nico) ${m.t}` : m.t;
    const prev = out[out.length - 1];
    if (prev && prev.role === role) prev.content += `\n${text}`;
    else out.push({ role, content: text });
  }
  while (out.length && out[0].role !== 'user') out.shift();
  return out;
}

// ---------- guard: what must never leave ----------
// The prices of today (wa-knowledge.js, section 3), as plain numbers: guides 5,99 / 59 / 12, one render 90,
// the pilot 490, Essential 1.390, Signature 2.290, interactive 3D 1.990 / 3.900 / 5.900, films 899 / 1.490 / 2.490;
// 100.000 is what the Hygeia Grove project earned its architect (a fact of the site, not a price of ours).
// Every other amount with a currency stops the reply and the chat goes to Nico: the launch prices that
// ended (1,99 / 4,99 / 19 / 39), a price the model made up, a sum, a conversion.
export const PRICES = [5.99, 59, 12, 90, 490, 1390, 2290, 1990, 3900, 5900, 899, 1490, 2490];
const ALLOWED_MONEY = new Set([...PRICES, 100000]);
const MONEY = /(?:€|\$|eur\b|euro|usd|aed|dirham|dhs|rubl|руб|سعر|درهم)\s*(\d[\d.,]*)|(\d[\d.,]*)\s*(?:€|\$|k\b|eur\b|euro|usd|aed|dirham|dhs|mila|руб)/gi;
const DATES = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica|tomorrow|domani|january|february|march|april|june|july|august|september|october|november|december|gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\b|\b\d{1,2}[/.]\d{1,2}\b/i;
const CENTS = /\d+[.,]99\b/g; // 5.99 is a price, not the fifth of some month
// the free image is over (10/11/2026): the bot may say that it is gone, never offer it
const FREE_IMAGE = /\b(free|gratis|gratuit[oa]|бесплатн\S*)\s+(sample|image|photo|render|test|immagine|foto|campione|prova|образец|фото)\b|\b(sample|image|photo|render|immagine|foto|campione)\s+(is |è |e )?(for )?(free|gratis|gratuit[oa])\b|first image free|prima immagine gratis/i;
const GONE = /\b(no|not|dont|don.?t|doesn.?t|isn.?t|anymore|any more|no longer|gone|over|ended|non|più|finit[ao])\b|нет|больше не/i;

/** "1.390", "1,390", "1390" → 1390; "5,99", "5.99" → 5.99. */
function amountOf(raw) {
  const s = String(raw).replace(/[.,]+$/, '');
  if (/^\d{1,3}([.,]\d{3})+$/.test(s)) return Number(s.replace(/[.,]/g, ''));
  return Number(s.replace(',', '.'));
}

export function guard(messages) {
  for (const msg of messages) {
    for (const m of msg.matchAll(MONEY)) {
      if (/^[48]\s*k$/i.test(m[0])) continue; // 4K, 8K: the size of an image, not money
      if (!ALLOWED_MONEY.has(amountOf(m[1] || m[2] || ''))) return `money:${m[0]}`;
    }
    if (DATES.test(msg.replace(CENTS, ''))) return `date:${msg}`;
    if (FREE_IMAGE.test(msg) && !GONE.test(msg)) return `free image:${msg}`;
    if (/\bnicola\b/i.test(msg)) return `name:${msg}`; // signed Nico, never Nicola
  }
  return null;
}

const clean = (s) => String(s).replace(/\s*\n+\s*/g, ' ').replace(/—/g, ',').trim();

/** One decision for the chat. Never throws: on any problem the chat goes to Nico. */
export async function think(log, { name = '' } = {}) {
  const messages = turns(log);
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return { decision: 'handoff', reason: 'other', messages: [], summary_it: 'Chat senza un messaggio nuovo del lead.' };
  }
  try {
    const res = await claude().messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: system(),
      messages: name ? [{ ...messages[0], content: `(whatsapp name: ${name})\n${messages[0].content}` }, ...messages.slice(1)] : messages,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    });
    if (res.stop_reason === 'refusal') throw new Error('refusal');
    const text = res.content.find((b) => b.type === 'text')?.text || '';
    const out = JSON.parse(text);
    out.messages = (out.messages || []).map(clean).filter(Boolean).slice(0, 3);
    if (out.decision === 'reply' && !out.messages.length) return { ...out, decision: 'handoff', reason: 'other' };
    const bad = guard(out.messages);
    if (bad) return { decision: 'handoff', reason: 'guard', messages: [], summary_it: `${out.summary_it}\n(Il bot voleva scrivere: ${out.messages.join(' / ')} — bloccato: ${bad})` };
    return out;
  } catch (e) {
    console.error('[wa] think', e.message);
    return { decision: 'handoff', reason: 'other', messages: [], summary_it: `Il bot non è riuscito a rispondere (${e.message}). Ultimo messaggio: ${log[log.length - 1]?.t || ''}` };
  }
}
