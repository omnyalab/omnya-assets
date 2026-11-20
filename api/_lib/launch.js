// THE 3D FUTURE launch mails E1-E7 (20/11/2026). Texts approved by Nico with his «vai» on the club brief
// (board KyGjMc7cAxkE7VYHgFjAW4, section 5), sent by the follow-up series' engine (api/drip.js) on Nico's «sì, le mandi
// tu», so one engine holds the list, the unsubscribes and the one-email-a-day rule. Times are 18:00 Rome = 17:00 UTC.
// No email addresses in this file: the repo is public, the extra people of the club list live in Redis.
import { unsubUrl } from './newsletter.js';

export const LAUNCH = [
  { id: 'e1', at: '2026-11-20T17:00:00Z', list: 'consent' }, // 20/11 Nico: «oggi si inizia, mai domani» (was Monday 23/11)
  { id: 'e2', at: '2026-11-25T17:00:00Z', list: 'consent' },
  { id: 'e3', at: '2026-11-27T17:00:00Z', list: 'club' },
  { id: 'e4', at: '2026-11-28T17:00:00Z', list: 'consent', seats: true },
  { id: 'e5', at: '2026-11-30T17:00:00Z', list: 'consent', seats: true },
  { id: 'e6', at: '2026-12-03T17:00:00Z', list: 'consent', seats: true },
  { id: 'e7', at: '2026-12-04T17:00:00Z', list: 'consent', seats: true },
];

const PAGE = 'omnyalab.com/the-3d-future';

const TEXTS = {
  e1: {
    subject: { a: 'the 3d future opens saturday', b: '3d that sells opens saturday' },
    body: `Hey {name},

Our stadium reel did 2.36M views, and what we learned from it is simple: people scroll past a 3D, but they stop for a choice. So we didn't show a stadium, we let them pick their seat. Try it on your next project: give people one thing to choose (a seat, a floor, a view) and watch the comments.

That's the kind of thing we teach inside THE 3D FUTURE, the club where you learn to build the 3D that sells. It opens on Saturday 28 November at 9:00 (Rome), and inside you'll find:
• video courses that walk you step by step through our builds, so you make them exactly the way we do: the first one, your own stadium in your colours where people pick their seat, is ready on day one, and a new one comes every Friday
• the files of six builds from our reels (three towers, the Riyadh tower, the stadium, the house that builds itself, the plane, Miami), with the prompts we used and the Claude skill or the code that builds each one again for you
• my comments on your builds every Monday

Get on the list and you're in nine hours before everyone else:
{link}

Nico

P.S. There are only 100 seats, because I look at everyone's first build myself.`,
  },
  e2: {
    subject: 'the mistake that ruins 3D photos',
    body: `Hey {name},

The most common mistake with 3D photos is making the next picture from the last one that came out, because every round drifts a little further from the real building. We start every single round from the 3D again, with the brief and photos of the real materials, and that's why our towers look the same in every shot.

That method, with the exact prompts, is one of the things inside THE 3D FUTURE when the doors open on Saturday:
• step-by-step video courses on our builds, the first one ready on day one and a new one every Friday
• six builds from our reels with their files, prompts and Claude skills
• my comments on your work every Monday

The list gets in first, on Saturday at 9:00 (Rome):
{link}

Nico

P.S. 100 seats, and the doors close on Friday 4 December at 23:59.`,
  },
  e3: {
    subject: "you're first tomorrow",
    body: `Hey {name}, we said we'd email you today, so here it is.

One thing first: before we build a real place in 3D, we look up the real heights of the buildings around it, because a tower that's even a little too short looks fake next to its neighbours.

Tomorrow at 9:00 (Rome) the doors of THE 3D FUTURE open for the list only, nine hours before everyone else, and you're on the list. Your link works from 9:00:
{link}

Nico`,
  },
  e4: {
    subject: 'doors are open',
    body: `Hey {name},

When you turn a 3D into a photo, give the model pictures of the real materials, the actual stone and the actual wood, and never a nice photo of someone else's house, or it copies that house and forgets yours.

THE 3D FUTURE is open, and right now {seats_left} of the 100 seats at €9 are left. The counter on the page is the real one. The moment you join you get:
• the first step-by-step video course, your own stadium in your colours where people pick their seat, and a new course every Friday
• six builds from our reels with their files, prompts and Claude skills
• the House Builder skill (€14.99 on our site), yours to keep even if you leave
• my comments on your work every Monday

€9 a month for the first 100, locked for as long as you stay. After that, or after Friday 4 December at 23:59 (Rome), it's €19.

{link}

Nico

P.S. You can cancel in one tap whenever you want.`,
  },
  e5: {
    subject: "why our 3D videos don't wobble",
    body: `Hey {name},

When we turn a 3D into a video we make one clip at a time, each one a single straight move into the building with the fog moving, and every new clip starts from the real last frame of the one before. That's why the camera never jumps between shots.

All our clips are made like this, and the files of the stadium that did 2.36M views are inside THE 3D FUTURE with the prompts and the skill that builds it again in your own colours.

{seats_left} of the 100 seats at €9 are left, and the doors close on Friday at 23:59 (Rome).

{link}

Nico`,
  },
  e6: {
    subject: 'closes tomorrow',
    body: `Hey {name},

If you put people in an architecture shot, keep them as a blur, a silhouette against the light or out of focus, because a sharp face is the first thing that makes a render look fake.

THE 3D FUTURE closes tomorrow, Friday 4 December, at 23:59 (Rome). {seats_left} of the 100 seats at €9 are left, and when the doors close they stay closed until the next round, where it's €19.

{link}

Nico`,
  },
  e7: {
    subject: 'tonight at 23:59',
    body: `Hey {name},

If you need the camera to move out instead of in, don't make a new clip: play the one you have backwards. Same light, same building, and it costs nothing.

The doors of THE 3D FUTURE close tonight at 23:59 (Rome), and {seats_left} seats at €9 are left.

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
  const html = paras.map((para) => `<p>${esc(para).replace(/\n/g, '<br>').replace('{link}', `<a href="${url}">${PAGE}</a>`)}</p>`).join('\n');
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
