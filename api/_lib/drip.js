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
// the end of every P.S. (and of mail 4): the club's door, said the way it is that day
const door = (club, link) =>
  club === 'open'
    ? `and the doors are open now: ${link('join THE 3D FUTURE', 'f')}`
    : club === 'closed'
      ? `and the doors are closed for this round, but you can get on the list for the next one here: ${link('get on the list', 'f')}`
      : `and the doors open on Saturday 28 November, so you can get on the list here: ${link('get on the list', 'f')}`;

// Mails 1-3 end with a P.S. that opens the club's door (Nico 20/11: «these emails are to bring people into the community»),
// only while the club page is online (live); mail 4 is the invitation itself and waits for the page.
const NOTES = [
  {
    subject: 'why our videos look like one shot',
    body: ({ guide, ago }) => [
      `you grabbed ${guide} ${ago}, so here's a small thing that makes a big difference. Our stadium video looks like one camera flying through the whole stadium, but it's six short clips put together, and the reason you can't see where one ends and the next one starts is simple: every new clip starts from the very last picture of the clip before it, not from the photo we had planned.`,
      `The video tool (we use Kling) rarely stops exactly on the photo you asked for, it usually ends a tiny bit off, so if you start the next clip from your planned photo you see a little jump. Save the last frame of the clip as a picture instead, start the next clip from that, and the jump is gone.`,
      `That stadium video passed a million views in less than 24 hours.`,
      `Quick question, and just reply with one word: what would you like to build first, a house, a tower, a stadium or something else? I read every reply.`,
    ],
    ps: ({ link, club }) => `If you'd rather build our stadium yourself, step by step, the one where people pick their seat, it's the first video course inside THE 3D FUTURE, our new club, ${door(club, link)}`,
  },
  {
    subject: 'why we threw away our first two clips',
    link: 'v',
    body: ({ link }) => [
      `on one of our towers, the Burj, we threw away the first two clips we made, and what we learned there is the most useful thing I can tell you about turning a 3D into a video.`,
      `We give Kling a rough 3D video of the camera move we want, and Kling copies it, so when our camera in the 3D was turning on a curve the clip came out turning too, and when the fog in the 3D was just a flat grey layer that didn't move, Kling didn't understand it was fog and made up something else.`,
      `So now we keep it simple: in the 3D the camera only moves in a straight line, slowly forward, and the fog is thick and drifts a little in every frame, so Kling knows exactly what it's looking at.`,
      `If you want to see where this goes, you can click through our three towers yourself here, where every view is a Kling clip that starts where the last one ended: ${link('click through the three towers')}`,
    ],
    ps: ({ link, club }) => `Inside THE 3D FUTURE, our new club, you get the files, the prompts and the Claude skills behind builds like these, plus my comments on your own builds every Monday, ${door(club, link)}`,
  },
  {
    subject: 'never pay for the same clip twice',
    body: () => [
      `here's one that has saved us a lot of credits: if your video goes from night to day and later from day back to night, you only need to make the first clip, because the second one is the same clip played backwards. You don't generate it again, you just flip it (any video editor can play a clip in reverse, we do it with one line of ffmpeg).`,
      `The same trick works when the camera flies in close, and it's my favourite: I ask Kling for the opposite, a clip that starts close and flies out, and then I flip it. When I tested it, that one clip took me from the first photo straight to the third, so I didn't even need the one in the middle.`,
      `So before you make anything, look at your list of clips and check which ones are just another one played backwards. If you try it, reply "done" and tell me how it went.`,
    ],
    ps: ({ link, club }) => `If you want to learn all of this properly instead of one trick at a time, that's what THE 3D FUTURE, our new club, is for, ${door(club, link)}`,
  },
  {
    subject: "where we're taking all this",
    link: 'f',
    body: ({ link, club }) => [
      `one last tip before I tell you where we're taking all this: when you turn a 3D into a realistic photo, give the image tool your 3D and nothing else. The moment you add a nice photo "for the look", it starts redesigning the room or the building its own way and the view you worked on is gone, while with the 3D alone, and a prompt that describes only what you can see in that exact view, the photo comes out matching your 3D.`,
      `Everything I sent you in these emails, and a lot more, is inside THE 3D FUTURE, our new club: first of all a video course that walks you step by step through one of our builds, so you can make it exactly the way we do, and a new course every Friday with the build of the week, then the files, the prompts and the Claude skills behind the builds from our reels, and my comments on your own builds every Monday.`,
      club === 'open'
        ? `The doors are open now, and you can join here: ${link('join THE 3D FUTURE')}`
        : club === 'closed'
          ? `The doors are closed for this round, but you can get on the list for the next one here: ${link('get on the list')}`
          : `The doors open on Saturday 28 November, and you can get on the list here: ${link('get on the list')}`,
    ],
  },
];
export const STEPS = NOTES.length;

/**
 * One note of the series, ready for nodemailer. step = 1..4, p = { email, name, free }
 * Plain like the delivery note: hello, paragraphs, Nico, then one small grey line with why they get it and the unsubscribe.
 */
export function renderNote(step, p, { club = clubState(), live = false } = {}) {
  const n = NOTES[step - 1];
  const guide = GUIDES[p.free] || GUIDES.free;
  const url = (t) => `${SITE}/m/${token(p.email, step, t)}`;
  const off = unsubUrl(p.email);
  const ago = p.at && Date.now() - p.at > 36 * 3600_000 ? 'a little while ago' : 'yesterday'; // the people we already had signed up days ago
  const H = { guide: esc(guide), ago, club, link: (label, t = n.link) => `<a href="${url(t)}">${esc(label)}</a>` };
  const T = { guide, ago, club, link: (label, t = n.link) => url(t) };
  const html = n.body(H), text = n.body(T);
  const ps = live && n.ps ? [n.ps(H), n.ps(T)] : null;
  const why = `You're getting this because you asked for ${guide} on omnyalab.com. Omnya Lab, Venice, Italy.`;
  return {
    subject: n.subject,
    text: [`Hi ${firstName(p.name)},`, '', ...text.flatMap((t) => [t, '']), 'Nico', ...(ps ? ['', `P.S. ${ps[1]}`] : []), '', '--', why, `Unsubscribe: ${off}`].join('\n'),
    html: `<!doctype html><html><body><div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#222">
<p>Hi ${esc(firstName(p.name))},</p>
${html.map((t) => `<p>${t}</p>`).join('\n')}
<p>Nico</p>
${ps ? `<p>P.S. ${ps[0]}</p>\n` : ''}<p style="margin-top:28px;font-size:12px;color:#888">${esc(why)} <a href="${off}" style="color:#888">Unsubscribe</a></p>
<img src="${SITE}/api/drip?o=${token(p.email, step)}" width="1" height="1" alt="" style="display:block;border:0">
</div></body></html>`,
    headers: { 'List-Unsubscribe': `<${off}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  };
}
