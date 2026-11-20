// The follow-up series after a free guide (20/11/2026). Nico: «the email they get must be a follow-up that makes them want
// more from us, Hormozi style, with nothing about money in it». Four plain notes signed Nico, on days 1, 3, 6 and 10 after
// the opt-in: each gives away one real lesson from our builds, one real proof and one light action (reply with a word,
// open a demo), never a price, an offer or "buy". Written like the free delivery note (text, one link, no design) so Gmail
// keeps them in Primary. The words and the rules live here; api/drip.js sends them.
import { createHmac } from 'node:crypto';
import { unsubUrl } from './newsletter.js';
import { redis, hasStore, storeDown } from './store.js';

export const SITE = 'https://www.omnyalab.com';

const dayOf = (ms) => new Date(ms).toISOString().slice(0, 10);
/** Who got one of our emails today (the series, a buyer's PDFs, THE 3D FUTURE): the series moves its note of that day
 * to the next one, so nobody gets two of our emails on the same day. Every sender calls it after it sends. */
export async function markMailed(email, ms = Date.now()) {
  if (!hasStore() || storeDown() || !email) return;
  const k = `omnya:mail:day:${dayOf(ms)}`;
  await redis('SADD', k, String(email).trim().toLowerCase());
  await redis('EXPIRE', k, 3 * 86400);
}

// mail 1 goes the day after the opt-in, the others N days after mail 1 (at the same hour, so the hour they were awake)
export const OFFSETS = [0, 2, 5, 9];

// the guide they asked for, as the notes say it
export const GUIDES = {
  'free-stadium': 'the Stadium Blueprint',
  'free-tower': 'the Tower Blueprint',
  'free-towers': 'the Towers Blueprint',
  'free-build': 'the Build Blueprint',
  'free-plane': 'the Plane Blueprint',
  'free-riyadh': 'the Riyadh Blueprint',
  'free-3d': 'the 3D to film Blueprint',
  'free-city': 'the City Blueprint',
  'free-miami': 'the Miami Blueprint',
  free: 'the Blueprint',
};

// where the links go (a closed list: the click link can never send anyone elsewhere); ?ig= tells the site and Stripe
// that the visit came from mail N (Base.astro keeps it as the source of the visit, /go/ adds client_reference_id=ig_mN)
export const TARGETS = {
  v: '/demo/choose-your-view',
  f: process.env.DRIP_FUTURE_PATH || '/the-3d-future',
};

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const firstName = (n) => {
  const f = String(n || '').trim().split(/\s+/)[0] || '';
  return f ? f.charAt(0).toUpperCase() + f.slice(1) : 'there';
};

const secret = () => process.env.NEWSLETTER_SECRET || process.env.IG_ADMIN_KEY || '';
const b64 = (s) => Buffer.from(s).toString('base64url');
const sig = (s) => createHmac('sha256', secret()).update(`drip|${s}`).digest('base64url').slice(0, 12);

/** token = who · which mail · which link, signed: /m/<token> counts the click, ?o=<token> the open */
export const token = (email, step, t = '-') => { const body = `${b64(email)}.${step}${t}`; return `${body}.${sig(body)}`; };
export function readToken(tok) {
  const m = /^([A-Za-z0-9_-]+)\.([1-4])([a-z-])\.([A-Za-z0-9_-]{12})$/.exec(String(tok || ''));
  if (!m || !secret() || sig(`${m[1]}.${m[2]}${m[3]}`) !== m[4]) return null;
  return { email: Buffer.from(m[1], 'base64url').toString(), step: Number(m[2]), t: m[3] };
}

// The four notes. {link} is the one link of the note (tracked), the rest is plain text.
// club = 'soon' | 'open' | 'closed': THE 3D FUTURE doors (DRIP_FUTURE_OPEN / DRIP_FUTURE_CLOSE), so mail 4 says it right.
const OPEN = () => Date.parse(process.env.DRIP_FUTURE_OPEN || '2026-11-28T17:00:00Z'); // 28/11 18:00 Rome, open to everyone (club plan L1; 9:00 is only for its list and buyers)
const CLOSE = () => Date.parse(process.env.DRIP_FUTURE_CLOSE || '2026-12-04T22:59:00Z'); // 4/12 23:59 Rome
export const clubState = (ms = Date.now()) => (ms < OPEN() ? 'soon' : ms <= CLOSE() ? 'open' : 'closed');
const NOTES = [
  {
    subject: 'the trick behind the one-take',
    body: ({ guide }) => [
      `you grabbed ${guide} yesterday, so here's the one thing that makes our videos look like a single camera move: every clip starts from the real last frame of the clip before it, never from the photo you planned.`,
      `Kling never lands exactly on the end image you give it, so if the next clip starts from your clean photo there's a tiny jump that the eye catches straight away, while if you take the true last frame out of the clip and use it as the next start image the cut disappears, which is why before moving on we check every clip, first and last frame against the start and end images.`,
      `That's how the stadium reel was made, six clips that look like one shot, and it passed a million views in less than 24 hours.`,
      `One question, and just reply with one word: what do you want to build first, a house, a tower, a stadium or something else? I read every reply.`,
    ],
  },
  {
    subject: 'why our first two clips went in the bin',
    link: 'v',
    body: ({ link }) => [
      `on the Burj our first two Kling clips went straight in the bin, and the reason is the most useful thing I can tell you about animating a 3D: Kling copies the movement of the 3D video you give it, so if your camera moves on a curve the clip curves too, and if your fog sits there flat and still Kling doesn't understand it's fog and makes something up.`,
      `Since then every camera move we make in the 3D is a straight line from one photo to the next, a clean zoom in, with the fog clearly visible and drifting a little in every frame.`,
      `And if you want to see where the two tricks lead together, here are our three towers: every view you jump to is a Kling clip that starts where the last one ends, and you can move through it yourself here: ${link('move through the three towers')}`,
    ],
  },
  {
    subject: 'never pay for the same clip twice',
    body: () => [
      `here's a small one that has saved us a lot of credits: if you need a clip from night to day and another one from day to night you only make the first, because the second is the same clip played backwards, and one line of ffmpeg (-vf reverse) gives it to you for free.`,
      `It works for zooms too, and it's the trick I like most: we make the zoom in as a zoom out, starting from the close photo and ending on the far one, then we reverse it, and in my test that single clip went from the first photo straight to the third, skipping the one in the middle.`,
      `So before you generate anything, look at your list of clips and ask which ones are just another one played backwards. If you try it, reply "done" and tell me how it went.`,
    ],
  },
  {
    subject: 'the only reference that matters',
    link: 'f',
    body: ({ link, club }) => [
      `one last thing before I tell you where we're taking all this: when you turn a 3D into a photo, the 3D has to be the only reference you give, because the moment you add a nicer photo "for the look" the model rebuilds the room or the building its own way and the framing you worked on is gone. So we give it the 3D alone, we describe only what you can see in that exact shot, we add a line with what is not there, and the photo lands on top of the 3D like a print.`,
      `The one-take, the straight camera moves, the reversed clips and the 3D-only photos all live inside THE 3D FUTURE, our new club, where you get the files, the prompts and the Claude skills behind the builds from our reels, a new build every Friday, and my comments on your own builds every Monday.`,
      club === 'open'
        ? `The doors are open now, and you can see everything that's inside here: ${link("see what's inside")}`
        : club === 'closed'
          ? `The doors are closed for this round, and you can get on the list for the next one here: ${link('get on the list')}`
          : `The doors open on Saturday 28 November, and you can see what's inside here: ${link("see what's inside")}`,
    ],
  },
];
export const STEPS = NOTES.length;

/**
 * One note of the series, ready for nodemailer. step = 1..4, p = { email, name, free }
 * Plain like the delivery note: hello, paragraphs, Nico, then one small grey line with why they get it and the unsubscribe.
 */
export function renderNote(step, p, { club = clubState() } = {}) {
  const n = NOTES[step - 1];
  const guide = GUIDES[p.free] || GUIDES.free;
  const url = n.link ? `${SITE}/m/${token(p.email, step, n.link)}` : '';
  const off = unsubUrl(p.email);
  const html = n.body({ guide: esc(guide), club, link: (label) => `<a href="${url}">${esc(label)}</a>` });
  const text = n.body({ guide, club, link: () => url });
  const why = `You're getting this because you asked for ${guide} on omnyalab.com. Omnya Lab, Venice, Italy.`;
  return {
    subject: n.subject,
    text: [`Hi ${firstName(p.name)},`, '', ...text.flatMap((t) => [t, '']), 'Nico', '', '--', why, `Unsubscribe: ${off}`].join('\n'),
    html: `<!doctype html><html><body><div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#222">
<p>Hi ${esc(firstName(p.name))},</p>
${html.map((t) => `<p>${t}</p>`).join('\n')}
<p>Nico</p>
<p style="margin-top:28px;font-size:12px;color:#888">${esc(why)} <a href="${off}" style="color:#888">Unsubscribe</a></p>
<img src="${SITE}/api/drip?o=${token(p.email, step)}" width="1" height="1" alt="" style="display:block;border:0">
</div></body></html>`,
    headers: { 'List-Unsubscribe': `<${off}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  };
}
