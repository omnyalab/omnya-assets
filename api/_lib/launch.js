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
    subject: 'Why a developer signed €6,200 for one 3D',
    img: { src: '/club/mail/founders.jpg', alt: "THE 3D FUTURE founders' deal: 100 seats, €9 a month, 3 playbooks and the 3D AI Mastery course as a gift" },
    body: `Hey {name},

Last week a property developer signed a €6,200 project with us. Not for a website and not for a video: for one interactive 3D of his new project.

That's the skill behind everything you've seen from us, and it's what developers pay for. The stadium where you pick your seat, the tower where you choose your floor, the house that builds itself: every one of them is built with Claude, from an empty scene to a page you can show a client, and you don't need to know how to code.

On Saturday I'm opening the whole method to 100 people, inside THE 3D FUTURE.

{img}

In your first week you build your own stadium, in your colours, where people tap a stand and pick their seat, following a step-by-step video course where you see every click. Then every Friday a new build arrives with its own course, files and prompts, and every Monday I look at your work and tell you what to fix before you show it to a client.

Because it opens in Black Friday week, the first 100 get a founders' deal I won't run again. If you're one of them, you pay €9 a month instead of €19, locked for as long as you stay, and you get our three playbooks and the full 3D AI Mastery course as a gift that stays yours: more than €240 of files at our site's prices. Sell one 3D like the one I just told you about and the club pays for itself many times over. When the 100 seats are gone, or on Friday 4 December at the latest, the deal goes with them.

And if you follow the five lessons, post your build in the group and it still isn't live within 7 days, your first month is on us.

Thank you to everyone who already got on the list: you're in on Saturday at 9:00 (Rome), nine hours before everyone else, so some of the 100 seats may be gone before the doors open for the rest. If you want to be one of the first, get on the list now:
{link}

Nico

P.S. It's 100 seats because I look at every first build myself, and I can't do that for a thousand people.`,
  },
  e2: {
    subject: 'The mistake that ruins 3D photos',
    img: { src: '/club/mail/vault.jpg', alt: 'The six builds inside THE 3D FUTURE: The Towers, Riyadh Tower, Stadium, House that builds itself, Plane, Miami' },
    body: `Hey {name},

The most common mistake with 3D photos is making the next picture from the last one that came out, because every round drifts a little further from the real building. We start every round from the 3D again, with photos of the real materials, and that's why our towers look the same in every shot.

{img}

These are the six builds you'll find inside THE 3D FUTURE in 3 days, each with its files, prompts and Claude skill, next to the step-by-step video courses (the first one, your stadium, is ready on day one, and a new one comes every Friday), every Full guide, the House Builder skill and my comments on your work every Monday.

If you're one of the first 100 to join, you pay €9 a month instead of €19, locked for as long as you stay, and you get our three playbooks and the full 3D AI Mastery course as a gift: more than €240 of files at our site's prices, for €9. The deal ends when the 100 seats are gone, or on Friday 4 December at the latest.

The list gets in on Saturday at 9:00 (Rome), nine hours before everyone else:
{link}

Nico

P.S. If you follow the five lessons, post your build in the group and it still isn't live within 7 days, your first month is on us.`,
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

THE 3D FUTURE is open now and {seats_left} of the 100 seats at €9 are left (the counter on the page is the real one). The moment you join you get the first step-by-step video course, your own stadium in your colours where people pick their seat, then a new course every Friday, six builds from our reels with their files, prompts and Claude skills, the House Builder skill (€14.99 on our site), which stays yours even if you leave, and my comments on your work every Monday.

It's €9 a month for the first 100, locked for as long as you stay, and after that, or after Friday 4 December at 23:59 (Rome), it's €19:
{link}

Nico

P.S. You can cancel in one tap whenever you want.`,
  },
  e5: {
    subject: "Why our 3D videos don't wobble",
    body: `Hey {name},

When we turn a 3D into a video we make one clip at a time, each one a single straight move into the building with the fog moving, and every new clip starts from the real last frame of the one before, which is why the camera never jumps between shots.

All our clips are made like this, and the files of the stadium that did 2.36M views are inside THE 3D FUTURE, with the prompts and the skill that builds it again in your own colours. {seats_left} of the 100 seats at €9 are left, and the doors close on Friday at 23:59 (Rome):
{link}

Nico`,
  },
  e6: {
    subject: 'Closes tomorrow',
    body: `Hey {name},

If you put people in an architecture shot, keep them as a blur, a silhouette against the light or out of focus, because a sharp face is the first thing that makes a render look fake.

THE 3D FUTURE closes tomorrow, Friday 4 December, at 23:59 (Rome), and {seats_left} of the 100 seats at €9 are left. Once the doors close they stay closed until the next round, where it's €19:
{link}

Nico`,
  },
  e7: {
    subject: 'Tonight at 23:59',
    body: `Hey {name},

If you need the camera to move out instead of in, don't make a new clip, just play the one you have backwards: same light, same building, and it costs nothing.

The doors of THE 3D FUTURE close tonight at 23:59 (Rome), and {seats_left} seats at €9 are still left:
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
