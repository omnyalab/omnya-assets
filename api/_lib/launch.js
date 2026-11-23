// THE 3D FUTURE launch mails E1-E7 (20/11/2026). Texts approved by Nico with his «vai» on the club brief
// (board KyGjMc7cAxkE7VYHgFjAW4, section 5), sent by the follow-up series' engine (api/drip.js) on Nico's «sì, le mandi
// tu», so one engine holds the list, the unsubscribes and the one-email-a-day rule. Times are 18:00 Rome = 17:00 UTC.
// No email addresses in this file: the repo is public, the extra people of the club list live in Redis.
import { unsubUrl } from './newsletter.js';

export const LAUNCH = [
  { id: 'e1', at: '2026-11-20T17:00:00Z', list: 'consent' }, // 20/11 Nico: «oggi si inizia, mai domani» (was Monday 23/11)
  { id: 'e1b', at: '2026-11-23T17:00:00Z', list: 'consent', hold: true }, // 23/11 Nico: «si inizia DA OGGI»; goes only after &lgo=e1b
  { id: 'e2', at: '2026-11-25T17:00:00Z', list: 'consent' },
  { id: 'e3', at: '2026-11-27T17:00:00Z', list: 'club' },
  { id: 'e4', at: '2026-11-28T17:00:00Z', list: 'consent', seats: true },
  { id: 'e5', at: '2026-11-30T17:00:00Z', list: 'consent', seats: true },
  { id: 'e6', at: '2026-12-03T17:00:00Z', list: 'consent', seats: true },
  { id: 'e7', at: '2026-12-04T17:00:00Z', list: 'consent', seats: true },
];

const PAGE = 'omnyalab.com/the-3d-future';

// 20/11 evening (Nico): «testi più fluidi e umani», subjects with a capital first letter and the club's name in capitals.
// Same facts as the approved brief, written as one person talking, no bullet lists.
const TEXTS = {
  e1: {
    subject: { a: 'THE 3D FUTURE opens Saturday', b: '3D THAT SELLS opens Saturday' },
    body: `Hey {name},

Our stadium reel did 2.36M views, and the one thing it taught us is simple: people scroll past a 3D, but they stop when you give them a choice, so instead of showing a stadium we let them pick their seat. Try it on your next project, give people one thing to choose (a seat, a floor, a view) and then watch the comments.

That's exactly what we teach inside THE 3D FUTURE, our new club where you learn to build the 3D that sells, and it opens on Saturday 28 November at 9:00 (Rome). Inside there's a video course that walks you step by step through your own stadium in your colours, the one where people pick their seat, and a new course every Friday after that, plus the files, the prompts and the Claude skills behind six builds from our reels, and my comments on your builds every Monday.

If you get on the list now, you're in nine hours before everyone else:
{link}

Nico

P.S. There are only 100 seats, because I look at everyone's first build myself.`,
  },
  e1b: {
    subject: 'Why developers pay more than €6,000 for a single 3D',
    img: { src: '/club/mail/founders-v3.jpg', alt: "THE 3D FUTURE founders' deal: 100 founders' seats, 230+ people already have early access, €9 a month locked if you join by Friday 4 December, 3 playbooks and the 3D AI Mastery course as a gift for the first 100" },
    body: `Hey {name},

Every week, developers around the world sign contracts like this: more than €6,000, often much more, for a single interactive 3D of their project. Not a website and not a video: one 3D where their buyers explore the building and choose.

Here's the part that matters to you: you can build the same thing. Every 3D you've seen from us, the stadium where you pick your seat, the tower where you choose your floor, the house that builds itself, is built with Claude, from an empty scene to a page you can show a client, without writing code. And every week developers write to us asking for one.

On Saturday 28 November I'm opening the whole method inside THE 3D FUTURE.

{img}

In your first week you build your own tower, in your colours, where buyers choose their floor, following a step-by-step video course where you see every click. Then every Friday a new build arrives with its own course, files and prompts, and every Monday I look at your work and tell you what to fix before you show it to a client.

It opens in Black Friday week, so if you join by Friday 4 December you pay €9 a month instead of €19, locked for as long as you stay. If you're one of the first 100, you also get our three playbooks and the full 3D AI Mastery course as a gift that stays yours: more than €240 of files at our site's prices. Sell one 3D like that and the club pays for itself many times over.

And if you follow the five lessons, post your build in the group and it still isn't live within 7 days, your first month is on us.

Thank you to everyone who already got on the list: you get in before everyone else, first in line for the 100 gifts. If you want to be one of the first, get on the list now:
{link}

Nico`,
  },
  e2: {
    subject: 'The mistake that ruins 3D photos',
    img: { src: '/club/mail/inside-v2.jpg', alt: 'Inside THE 3D FUTURE: the step-by-step course to build your own tower where buyers choose their floor, and a new build every Friday' },
    body: `Hey {name},

The most common mistake with 3D photos is making the next picture from the last one that came out. Every round drifts a little further from the real building, until the client looks at it and says "that's not my tower".

The fix isn't a better prompt, it's a method: you start every round from the 3D again, with photos of the real materials, so the building stays the same in every shot. That method, with the exact prompts, is what we teach inside THE 3D FUTURE, step by step, on real builds.

{img}

This is what you'll find inside from Saturday: step-by-step video courses where you see every click (the first one is your own tower where buyers choose their floor, ready on day one, and a new one comes every Friday with the build of the week), six builds from our reels with their files, prompts and Claude skills, every Full guide, the House Builder skill and my comments on your work every Monday.

If you join by Friday 4 December you pay €9 a month instead of €19, locked for as long as you stay, and if you're one of the first 100 you also get our three playbooks and the full 3D AI Mastery course as a gift. And if you follow the five lessons, post your build in the group and it still isn't live within 7 days, your first month is on us.

The doors open in 3 days:
{link}

Nico`,
  },
  e3: {
    subject: "You're first tomorrow",
    body: `Hey {name}, we said we'd email you today, so here it is.

One thing first: before we build a real place in 3D, we look up the real heights of the buildings around it, because a tower that's even a little too short looks fake next to its neighbours.

Tomorrow at 9:00 (Rome) the doors of THE 3D FUTURE open for the list only, nine hours before everyone else, and you're on the list, so your link works from 9:00:
{link}

Nico`,
  },
  e4: {
    subject: 'Doors are open',
    body: `Hey {name},

When you turn a 3D into a photo, give the model pictures of the real materials, the actual stone and the actual wood, and never a nice photo of someone else's house, or it copies that house and forgets yours.

THE 3D FUTURE is open now, and {seats_left} of the 100 founders' gifts are left (the counter on the page is the real one). The moment you join you get the first step-by-step video course, your own tower in your colours where buyers choose their floor, then a new course every Friday, six builds from our reels with their files, prompts and Claude skills, the House Builder skill (€14.99 on our site), which stays yours even if you leave, and my comments on your work every Monday.

If you join by Friday 4 December at 23:59 (Rome) you pay €9 a month, locked for as long as you stay, and if you're one of the first 100 you also get our three playbooks and the full 3D AI Mastery course as a gift. After Friday it's €19:
{link}

Nico

P.S. You can cancel in one tap whenever you want.`,
  },
  e5: {
    subject: "Why our 3D videos don't wobble",
    body: `Hey {name},

When we turn a 3D into a video we make one clip at a time, each one a single straight move into the building with the fog moving, and every new clip starts from the real last frame of the one before, which is why the camera never jumps between shots.

All our clips are made like this, and the files of the stadium that did 2.36M views are inside THE 3D FUTURE, with the prompts and the skill that builds it again in your own colours. {seats_left} of the 100 founders' gifts are left, and the €9 price ends on Friday at 23:59 (Rome):
{link}

Nico`,
  },
  e6: {
    subject: 'Closes tomorrow',
    body: `Hey {name},

If you put people in an architecture shot, keep them as a blur, a silhouette against the light or out of focus, because a sharp face is the first thing that makes a render look fake.

THE 3D FUTURE closes tomorrow, Friday 4 December, at 23:59 (Rome), and {seats_left} of the 100 founders' gifts are left. Once the doors close they stay closed until the next round, where it's €19:
{link}

Nico`,
  },
  e7: {
    subject: 'Tonight at 23:59',
    body: `Hey {name},

If you need the camera to move out instead of in, don't make a new clip, just play the one you have backwards: same light, same building, and it costs nothing.

The doors of THE 3D FUTURE close tonight at 23:59 (Rome), and the €9 price goes with them ({seats_left} of the 100 founders' gifts are still left):
{link}

Nico`,
  },
};

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// "Colin" → Colin; "O. Silva" or an empty name → there
const first = (n) => { const f = String(n || '').trim().split(/\s+/)[0] || ''; return f.replace(/\./g, '').length >= 2 ? f.charAt(0).toUpperCase() + f.slice(1) : 'there'; };

/** E1's name test: half the people see THE 3D FUTURE (a), half 3D THAT SELLS (b), always the same half for one email */
export const variantOf = (email) => { let h = 0; for (const c of String(email)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 2 ? 'b' : 'a'; };

/** one launch mail for one person: { subject, text, html, headers } */
export function renderLaunch(id, p, { seatsLeft } = {}) {
  const t = TEXTS[id];
  const v = id === 'e1' ? variantOf(p.email) : null;
  const url = `https://${PAGE}?${v ? `v=${v}&` : ''}ig=${id}`;
  let body = t.body.replace('{name}', first(p.name)).replace(/\{seats_left\}/g, String(seatsLeft ?? ''));
  if (v === 'b') body = body.replace(/THE 3D FUTURE/g, '3D THAT SELLS');
  const subject = typeof t.subject === 'string' ? t.subject : t.subject[v];
  const off = unsubUrl(p.email);
  const why = id === 'e3'
    ? `You're getting this because you joined the list of ${v === 'b' ? '3D THAT SELLS' : 'THE 3D FUTURE'}. Omnya Lab, Venice, Italy.`
    : "You're getting this because you asked for one of our guides on omnyalab.com and said yes to updates. Omnya Lab, Venice, Italy.";
  const paras = body.split('\n\n');
  const pic = t.img ? `<p><img src="https://www.omnyalab.com${t.img.src}" alt="${esc(t.img.alt)}" width="560" style="display:block;width:100%;max-width:560px;height:auto;border:0;border-radius:12px"></p>` : '';
  const html = paras.map((para) => (para.trim() === '{img}' ? pic : `<p>${esc(para).replace(/\n/g, '<br>').replace('{link}', `<a href="${url}">${PAGE}</a>`)}</p>`)).filter(Boolean).join('\n');
  body = body.replace(/\n\n\{img\}(?=\n\n)/, '');
  return {
    subject,
    variant: v,
    text: `${body.replace('{link}', url)}\n\n--\n${why}\nUnsubscribe: ${off}`,
    html: `<!doctype html><html><body><div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#222">
${html}
<p style="margin-top:28px;font-size:12px;color:#888">${esc(why)} <a href="${off}" style="color:#888">Unsubscribe</a></p>
</div></body></html>`,
    headers: { 'List-Unsubscribe': `<${off}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  };
}
