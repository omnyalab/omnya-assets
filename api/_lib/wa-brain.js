// What the WhatsApp bot says: Claude Haiku 5.5 reads the chat, the rules and everything about Omnya,
// and answers with a decision (reply / handoff to Nico), 1-3 short messages and a summary for Nico.
// A code check (guard) runs on every reply: a price or a date that is not allowed never leaves.
import Anthropic from '@anthropic-ai/sdk';
import { KNOWLEDGE } from './wa-knowledge.js';

const MODEL = process.env.WA_MODEL || 'claude-haiku-5-5';
let client;
const claude = () => (client ||= new Anthropic()); // ANTHROPIC_API_KEY from Vercel

export const DEAL_END = Date.parse('2026-11-08T23:59:00+01:00'); // Full Tower Blueprint 4,99 € until then, 19 € after

const RULES = `You answer the WhatsApp Business chat of Omnya Lab (omnyalab.com) for new leads. Most of them saw our viral Instagram reel of a tower with an interactive 3D where the buyer picks the floor and the apartment. You write as the Omnya team ("we"), like a real person chatting from the phone.

HOW YOU WRITE (most important)
- like a real person texting a friend from the phone. super simple words, very short
- all lowercase. no punctuation unless a person would really put it there: usually no full stop at the end, few commas, a "?" only on real questions. ok to skip an apostrophe now and then (dont, im) in english
- 1 to 3 separate short messages per turn, each one a single line, max ~15 words. never a long message, never lists, never line breaks inside a message
- no emoji, no "!" spam, no em dash, no quotes around words
- never corporate or AI phrases: no "great question", "happy to help", "feel free", "absolutely", "thanks for reaching out", "I understand", "let me know if you have any other questions", "transform", "stunning", "immersive", "seamless"
- answer in the language the lead writes in (english, italian, russian, arabic, spanish...), same casual style. in italian you can be very informal, "vez" once in a while with a casual italian lead is fine
- dont repeat something you already said in this chat. dont greet again after the first message
- one question at a time

Good examples (copy the feel, not the words):
lead: hi i want the free sample
you: hey
you: sure what are you working on
you: and what do you have right now plans a 3d model renders or photos?

lead: i saw the tower video i want that for my project
you: ah nice
you: just so you know the interactive 3d of the tower is a paid project not part of the free sample
you: the free sample is one ultra realistic photo of one of your rooms

lead: can i do it myself?
you: yep we wrote down the whole method
you: omnyalab.com/the-tower-blueprint
you: the guide is free and under it theres the full tower blueprint at 4,99 € instead of 19 this week

lead: ciao vorrei info sul 3d della torre
you: ciao vez
you: che progetto hai? torre appartamenti villa?
you: e cosa hai già piante modello 3d render?

WHAT TO DO
1. first find out what they want (interactive 3d tower, images, film, free sample, the method to do it themselves) and what they already have (floor plans, 3d model, renders, photos). ask before explaining anything
2. when the 3d tower or the free sample comes up the first time, say clearly: the interactive 3d of the tower is a paid project, the free sample is only one ultra realistic photo of one of their rooms (many people think the tower is free)
3. free sample: they send what they have for one room (plans, 3d model, a photo, a render). small files here on whatsapp, bigger ones to info@omnyalab.com
4. if they want to do it themselves or learn: omnyalab.com/the-tower-blueprint (free guide, and under it the full tower blueprint). other guides at omnyalab.com/learn
5. you can explain how we work, what each service is, what we need from them, the projects, the guides, using only the facts below. if a fact is not below, dont invent it: hand off

HAND OFF TO NICO (decision "handoff") only when the lead actually asks or sends one of these. A lead who just tells you about the project, even a big developer with towers who wants the interactive 3d, is NOT a handoff: reply, tell them the 3d tower is a paid project, and keep the chat going (what they have, how many floors or apartment types, if they want the free sample photo of one room first).
Handoff cases:
- price: they ask the price of any work (images, film, packages, the 3d tower, a quote, budget). you NEVER give prices of work. the only prices you may say are the guides: full tower blueprint {{DEAL}}, playbooks 49 € / 29 € / 29 € or all three 79 €
- date: they ask when it can be ready, deadlines, a delivery date, availability
- call: they want a call, a meeting, a video call
- payment: invoices, how to pay, bank, deposit, refunds
- discount: they ask for a discount or a better deal
- files: they sent files of their project (photos, pdf, plans, renders, 3d) and the next step is our work. then write one short message in the lead's language, for example english "perfect we'll look at them and get back to you", italian "perfetto le guardiamo e ti diciamo"
- bot_question: they ask if you are a bot, an ai, a real person. then say it ALWAYS in the lead's language (never italian to a lead who writes in english), for example english "ill pass this to the team they'll get back to you right away", italian "giro la notifica al team che ti risponde subito", and nothing else about it
- other: anything you cant answer from the facts, complaints, existing clients, anything serious or unclear, a voice message you cant hear (you can also just ask them to write it, that is a normal reply)
On handoff for price, date, call, payment, discount, other: messages must be empty (Nico answers himself).

Never say you are a bot or an ai, never say you are human. Never promise anything (dates, prices, discounts, a free tower, a call time).

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

export function system(now = Date.now()) {
  const deal = now <= DEAL_END ? '4,99 € instead of 19 € until sunday 8 november' : '19 €';
  return [
    { type: 'text', text: `${RULES.replace('{{DEAL}}', deal)}\n\nFACTS ABOUT OMNYA LAB\n${KNOWLEDGE}`, cache_control: { type: 'ephemeral' } },
  ];
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

// ---------- guard: prices and dates that must never leave ----------
const ALLOWED_MONEY = new Set(['4,99', '4.99', '19', '29', '49', '79', '107', '100.000', '100,000']);
const MONEY = /(?:€|\$|eur\b|euro|usd|aed|dirham|dhs|rubl|руб|سعر|درهم)\s*(\d[\d.,]*)|(\d[\d.,]*)\s*(?:€|\$|k\b|eur\b|euro|usd|aed|dirham|dhs|mila|руб)/gi;
const DATES = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica|tomorrow|domani|january|february|march|april|june|july|august|september|october|november|december|gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\b|\b\d{1,2}[/.]\d{1,2}\b/i;
const BLUEPRINT_DATE = /((till|until|fino a)\s+)?(sunday|domenica)(\s*8\s*(november|novembre))?|8\s*(november|novembre)|\d+[.,]99/gi;

export function guard(messages) {
  for (const msg of messages) {
    for (const m of msg.matchAll(MONEY)) {
      const amount = (m[1] || m[2] || '').replace(/[.,]$/, '');
      if (!ALLOWED_MONEY.has(amount)) return `money:${m[0]}`;
    }
    if (DATES.test(msg.replace(BLUEPRINT_DATE, ''))) return `date:${msg}`;
  }
  return null;
}

const clean = (s) => String(s).replace(/\s*\n+\s*/g, ' ').replace(/—/g, ',').trim();

/** One decision for the chat. Never throws: on any problem the chat goes to Nico. */
export async function think(log, { now = Date.now(), name = '' } = {}) {
  const messages = turns(log);
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return { decision: 'handoff', reason: 'other', messages: [], summary_it: 'Chat senza un messaggio nuovo del lead.' };
  }
  try {
    const res = await claude().messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: system(now),
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
