// THE 3D FUTURE launch mails E1-E7 (20/11/2026). Texts approved by Nico with his «vai» on the club brief
// (board KyGjMc7cAxkE7VYHgFjAW4, section 5), sent by the follow-up series' engine (api/drip.js) on Nico's «sì, le mandi
// tu», so one engine holds the list, the unsubscribes and the one-email-a-day rule. Times are 18:00 Rome = 17:00 UTC.
// No email addresses in this file: the repo is public, the extra people of the club list live in Redis.
import { unsubUrl } from './newsletter.js';
import { seatsUrl } from './seats-card.js';

export const LAUNCH = [
  { id: 'e1', at: '2026-11-20T17:00:00Z', list: 'consent' }, // 20/11 Nico: «oggi si inizia, mai domani» (was Monday 23/11)
  { id: 'e1b', at: '2026-11-23T17:00:00Z', list: 'consent', hold: true }, // 23/11 Nico: «si inizia DA OGGI»; goes only after &lgo=e1b
  // 25/11 Nico «basta contatore, solo sempre meno posti disponibili»: no number and no counter words in the mails, one fixed
  // sentence about the 100 founders' gifts; seats: true only so that who already reserved is skipped
  { id: 'e2', at: '2026-11-25T17:00:00Z', list: 'consent', seats: true },
  // 23/11 (Nico: «mandami tutto così vediamo»): the rest of the launch, each held until &lgo=<id>
  { id: 'e2b', at: '2026-11-26T17:00:00Z', list: 'consent', seats: true, hold: true },
  { id: 'e3b', at: '2026-11-27T17:00:00Z', list: 'consent', seats: true, hold: true }, // everyone, before the club list of the same day
  { id: 'e3', at: '2026-11-27T17:00:00Z', list: 'club', seats: true, hold: true },
  { id: 'e4a', at: '2026-11-28T08:00:00Z', list: 'club', seats: true, hold: true }, // 9:00 Rome, when the list gets in
  { id: 'e4', at: '2026-11-28T17:00:00Z', list: 'consent', seats: true, hold: true },
  { id: 'e5', at: '2026-11-30T17:00:00Z', list: 'consent', seats: true, hold: true },
  { id: 'e6', at: '2026-12-03T17:00:00Z', list: 'consent', seats: true, hold: true },
  { id: 'e7', at: '2026-12-04T17:00:00Z', list: 'consent', seats: true, hold: true },
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
    img: { src: '/club/mail/founders-v4.jpg', alt: "THE 3D FUTURE founders' deal: 100 founders' seats, 27 people already on the list, €9 a month locked if you join by Friday 4 December, 3 playbooks and the 3D AI Mastery course as a gift for the first 100" },
    body: `Hey {name},

Every week, developers around the world sign contracts like this: more than €6,000, often much more, for a single interactive 3D of their project. Not a website and not a video: one 3D where their buyers explore the building and choose.

Here's the part that matters to you: you can build the same thing. Every 3D you've seen from us, the stadium where you pick your seat, the tower where you choose your floor, the house that builds itself, is built with Claude, from an empty scene to a page you can show a client, without writing code. And every week developers write to us asking for one.

On Saturday 28 November I'm opening the whole method inside THE 3D FUTURE.

{img}

In your first week you build your own tower, in your colours, where buyers choose their floor, following a step-by-step video course where you see every click. Then every Friday a new build arrives with its own course, files and prompts, and every Monday I look at your work and tell you what to fix before you show it to a client.

It opens in Black Friday week, so if you join by Friday 4 December you pay €9 a month instead of €19, locked for as long as you stay. If you're one of the first 100, you also get our three playbooks and the full 3D AI Mastery course as a gift that stays yours: more than €240 of files at our site's prices. Sell one 3D like that and the club pays for itself many times over.

And if you follow the 11 steps, send me your build from the club page and it still isn't live within 7 days, your first month is on us.

Thank you to everyone who already got on the list: you get in before everyone else, first in line for the 100 gifts. If you want to be one of the first, get on the list now:
{link}

Nico`,
  },
  e2: {
    subject: 'The mistake that ruins 3D photos',
    img: { src: '/club/mail/tower-choose.gif', alt: 'A tower where buyers choose their floor: the mouse passes over the floors and each one shows its name, height and size' },
    body: `Hey {name},

The most common mistake with 3D photos is making the next picture from the last one that came out. Every round drifts a little further from the real building, until the client looks at it and says "that's not my tower".

The fix isn't a better prompt, it's a method: you start every round from the 3D again, with photos of the real materials, so the building stays the same in every shot. That method, with the exact prompts, is what we teach inside THE 3D FUTURE, step by step, on real builds. Here's the kind of 3D you learn to build there:

{img}

This is what you'll find inside from Saturday: step-by-step video courses where you see every click (the first one is your own tower where buyers choose their floor, ready on day one, and a new one comes every Friday with the build of the week), six builds from our reels with their files, prompts and Claude skills, every Full guide, the House Builder skill and my comments on your work every Monday.

If you join by Friday 4 December you pay €9 a month instead of €19, locked for as long as you stay. And if you follow the 11 steps, send me your build from the club page and it still isn't live within 7 days, your first month is on us.

You can reserve your seat right now: you add your card, nothing is charged today, and on Saturday your €9 month starts by itself. Every day there are fewer of the 100 founders' gifts left: our three playbooks and the full 3D AI Mastery course, theirs to keep, and only the people who reserve can get them. If you change your mind before Saturday, you cancel and pay nothing:
{link}

Nico`,
  },
  e2b: {
    subject: 'What stops the scroll in the first second',
    img: { src: '/club/mail/vault-files.jpg', alt: 'One build from the Vault of THE 3D FUTURE: the build kit, the exact prompts, the 3D scene and the Full guide' },
    body: `Hey {name},

This week we measured our own reels, and one thing stood out: when the first second shows a price or a result, far fewer people swipe away than when it only shows the building. It's tempting to save the best part for the end, and that's exactly where most viewers are already gone.

The fix is to plan the video backwards: the result first, then how you got there. It's how we build every reel, and inside THE 3D FUTURE you get the files behind them.

{img}

This is one build from the Vault: the kit that builds it again in your colours, the exact prompts we used, the 3D scene and the Full guide that explains every step. On Saturday you get six of them, and a new one every Friday, next to the step-by-step video courses, starting with your own tower where buyers choose their floor.

If you reserve your seat before Saturday, nothing is charged today and your €9 a month is locked for as long as you stay. Every day there are fewer of the 100 founders' gifts left: our three playbooks and the full 3D AI Mastery course, and only the people who reserve can get them. The doors open in 2 days:
{link}

Nico`,
  },
  e3b: {
    subject: 'Black Friday ends tonight',
    img: { src: '/club/mail/gifts.jpg', alt: "The founders' gift for the first 100: our three playbooks and the full 3D AI Mastery course" },
    body: `Hey {name},

Black Friday ends tonight, and tomorrow THE 3D FUTURE opens. Tonight is the last night to reserve your seat: you add your card, nothing is charged today, and there are fewer of the 100 founders' gifts left every day:
{link}

{img}

One last tip before the doors open: before we build a real place in 3D, we look up the real heights of the buildings around it, because a tower that's even a little too short looks fake next to its neighbours. That's the level of detail of the courses inside.

If you reserve tonight you pay €9 a month from tomorrow, locked for as long as you stay, and if you're one of the first 100 who reserve you also get these as a gift: our three playbooks and the full 3D AI Mastery course. Who joins after the doors open still gets the €9 until Friday, but not the gift.

If you change your mind before tomorrow morning, you cancel and pay nothing, so the risk is ours, not yours.

Nico`,
  },
  e3: {
    subject: "You're first tomorrow",
    img: { src: '/club/mail/gifts.jpg', alt: "The founders' gift for the first 100: our three playbooks and the full 3D AI Mastery course" },
    body: `Hey {name}, we said we'd email you today, so here it is.

Tomorrow the doors of THE 3D FUTURE open, and you're on the list, so you get in before everyone else, with €9 a month locked for as long as you stay. The founders' gift, our three playbooks and the full 3D AI Mastery course, is only for the people who reserve their seat before the doors open, and fewer of them are left every day. Tonight you still can: you add your card, nothing is charged today, and if you change your mind before tomorrow you cancel and pay nothing.

{img}

One last thing before you build: before we make a real place in 3D, we look up the real heights of the buildings around it, because a tower that's even a little too short looks fake next to its neighbours. Reserve your seat here:
{link}

Nico`,
  },
  e4a: {
    subject: 'The doors are open for you',
    img: { src: '/club/mail/doors.jpg', alt: 'THE 3D FUTURE: doors are open, your first course is your own tower, floor by floor' },
    body: `Hey {name},

THE 3D FUTURE is open, and you're on the list, so you're in nine hours before everyone else, at the founders' price.

{img}

Inside you start with the step-by-step course where you build your own tower, where buyers choose their floor, then a new build every Friday, six builds from our reels with their files and Claude skills, and my comments on your work every Monday. It's €9 a month, locked for as long as you stay:
{link}

Nico`,
  },
  // 23/11 night (Nico: «più ci avviciniamo più sono per farti entrare»): from Saturday every mail pushes harder to join than the one
  // before. Saturday what you get and what it's worth, Monday what one project pays for and the guarantee, Thursday the usual doubts
  // answered, Friday the last call. Every number is real: the €150+ is the page's VALUE list (€85+ builds, €53+ guides, €14.99 skill),
  // the 11 steps are about 30 minutes of video (25/11), the €6,000 is the market line Nico approved on 23/11.
  e4: {
    subject: 'Doors are open',
    img: { src: '/club/mail/doors.jpg', alt: 'THE 3D FUTURE: doors are open, your first course is your own tower, floor by floor' },
    body: `Hey {name},

THE 3D FUTURE is open, and until Friday you get in at the founders' price.

{img}

The moment you join you get the first step-by-step video course: 11 short steps where you see every click and build your own tower in your colours, the kind where buyers choose their floor. Then a new course every Friday with the build of the week, six builds from our reels with their files, prompts and Claude skills, every Full guide, the House Builder skill and my comments on your work every Monday.

Bought one by one on our site, the builds, the guides and the skill alone cost more than €150. If you join by Friday 4 December you get all of it for €9 a month, locked for as long as you stay. After Friday it's €19.

And if you follow the 11 steps, send me your build from the club page and it still isn't live within 7 days, your first month is on us. You can cancel in one tap whenever you want:
{link}

Nico`,
  },
  e5: {
    subject: 'What a single 3D pays for',
    img: { src: '/club/mail/inside-v2.jpg', alt: 'Inside THE 3D FUTURE: the step-by-step course to build your own tower where buyers choose their floor, and a new build every Friday' },
    body: `Hey {name},

Every week, developers around the world sign contracts for 3D like the tower in our first course: more than €6,000, often much more. If you join THE 3D FUTURE by Friday it costs you €9 a month, €108 a year, so one project like that pays for more than fifty years of it.

What stops most people isn't talent, it's not knowing the steps. That's exactly what the first course fixes: 11 short steps where you see every click, and at the end your own tower, where buyers choose their floor, is online in your colours.

{img}

If you follow the 11 steps, send me your build from the club page and it still isn't live within 7 days, your first month is on us, so the risk is ours, not yours. The €9 price ends on Friday:
{link}

Nico`,
  },
  // 24/11 (Nico: «le porte son sempre aperte»): the doors never close, so E6 and E7 speak only of the €9 that ends on Friday
  e6: {
    subject: '€9 ends tomorrow',
    img: { src: '/club/mail/vault-files.jpg', alt: 'One build from the Vault of THE 3D FUTURE: the build kit, the exact prompts, the 3D scene and the Full guide' },
    body: `Hey {name},

The €9 price of THE 3D FUTURE ends tomorrow, Friday 4 December.

If you're still deciding, these are the usual doubts, with the honest answer to each. You don't need to code: the Claude skills and the prompts do the building, and the course shows you each step. You don't need much time: the first course is 11 short steps, about 30 minutes of video in all. And if it doesn't work for you, follow the 11 steps, send me your build from the club page, and if it still isn't live within 7 days your first month is on us.

{img}

Join by tomorrow and you pay €9 a month, locked for as long as you stay, for the courses, the six builds from our reels with their files and Claude skills, every Full guide, the House Builder skill and my comments every Monday. From Saturday it's €19 a month:
{link}

Nico`,
  },
  e7: {
    subject: '€9 ends tonight',
    img: { src: '/club/mail/inside-v2.jpg', alt: 'Inside THE 3D FUTURE: the step-by-step course to build your own tower where buyers choose their floor, and a new build every Friday' },
    body: `Hey {name},

Tonight the €9 price of THE 3D FUTURE ends.

{img}

If you join today, this is what's waiting for you: the course where you build your own tower step by step, the kind where buyers choose their floor, then a new course every Friday, six builds from our reels with their files, prompts and Claude skills, every Full guide, the House Builder skill and my comments on your work every Monday, all for €9 a month, locked for as long as you stay.

The guarantee covers you: follow the 11 steps, send me your build from the club page, and if it still isn't live within 7 days your first month is on us. After tonight it's €19 a month:
{link}

Nico`,
  },
};

// 23/11 night (Nico: «non mettere più quanti posti, ma dire sempre meno… quasi stanno per terminare»): no number in the mails any
// more. The words follow the real counter, so "almost gone" only appears when it's true. Before Saturday nobody has a seat yet, so
// those mails speak of the list that grows and gets in first.
export function seatsWords(left) {
  const n = Number(left);
  if (left == null || left === '' || !Number.isFinite(n) || n >= 100) return "the 100 founders' gifts go to the first who reserve";
  if (n >= 50) return "fewer of the 100 founders' gifts are left every day";
  if (n > 20) return "more than half of the 100 founders' gifts are already gone";
  if (n > 10) return "only a few of the 100 founders' gifts are left";
  if (n > 0) return "the 100 founders' gifts are almost gone";
  return "the 100 founders' gifts are all gone";
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// "Colin" → Colin; "O. Silva" or an empty name → there
const first = (n) => { const f = String(n || '').trim().split(/\s+/)[0] || ''; return f.replace(/\./g, '').length >= 2 ? f.charAt(0).toUpperCase() + f.slice(1) : 'there'; };

/** E1's name test: half the people see THE 3D FUTURE (a), half 3D THAT SELLS (b), always the same half for one email */
export const variantOf = (email) => { let h = 0; for (const c of String(email)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 2 ? 'b' : 'a'; };

/** one launch mail for one person: { subject, text, html, headers } */
export function renderLaunch(id, p, { seatsLeft, listCount } = {}) {
  const t = TEXTS[id];
  const v = id === 'e1' ? variantOf(p.email) : null;
  const url = `https://${PAGE}?${v ? `v=${v}&` : ''}ig=${id}`;
  let body = t.body.replace('{name}', first(p.name)).replace(/\{seats_left\}/g, String(seatsLeft ?? '')).replace(/\{seats_words\}/g, seatsWords(seatsLeft)).replace(/\{Seats_words\}/g, seatsWords(seatsLeft).replace(/^./, (c) => c.toUpperCase())).replace(/\{list_count\}/g, String(listCount ?? ''));
  // 23/11: the 100 founders' seats, filled with real numbers only (the list before Saturday, the seats taken after).
  // 23/11 evening (Nico: «sei sicuro che tutti vedano quei pallini? metti na foto bella»): a picture in the style of the founders'
  // card, drawn by /api/seats with this mail's number, instead of the table of squares (566 px wide, too wide for a phone).
  // People with pictures off still read the number in the sentence above it and in the alt.
  const nSeats = t.bar === 'taken' ? 100 - Number(seatsLeft) : Number(listCount);
  const seatsImg = t.bar && Number.isInteger(nSeats) && nSeats >= 0 && (t.bar === 'taken' ? seatsLeft != null : listCount != null) ? seatsUrl(t.bar, nSeats) : null;
  const seatsAlt = t.bar === 'taken' ? `${100 - nSeats} of the 100 founders' seats left` : `${nSeats} people are already on the list, first in line for the 100 founders' gifts`;
  const bar = seatsImg ? `<p><img src="${seatsImg}" alt="${esc(seatsAlt)}" width="560" style="display:block;width:100%;max-width:560px;height:auto;border:0;border-radius:12px"></p>` : '';
  if (v === 'b') body = body.replace(/THE 3D FUTURE/g, '3D THAT SELLS');
  const subject = typeof t.subject === 'string' ? t.subject : t.subject[v];
  const off = unsubUrl(p.email);
  const why = LAUNCH.find((x) => x.id === id)?.list === 'club' // the club list's own mails (e3, e4a)
    ? `You're getting this because you joined the list of ${v === 'b' ? '3D THAT SELLS' : 'THE 3D FUTURE'}. Omnya Lab, Venice, Italy.`
    : "You're getting this because you asked for one of our guides on omnyalab.com and said yes to updates. Omnya Lab, Venice, Italy.";
  const paras = body.split('\n\n');
  const pic = t.img ? `<p><img src="https://www.omnyalab.com${t.img.src}" alt="${esc(t.img.alt)}" width="560" style="display:block;width:100%;max-width:560px;height:auto;border:0;border-radius:12px"></p>` : '';
  const html = paras.map((para) => (para.trim() === '{img}' ? pic : para.trim() === '{bar}' ? bar : `<p>${esc(para).replace(/\n/g, '<br>').replace('{link}', `<a href="${url}">${PAGE}</a>`)}</p>`)).filter(Boolean).join('\n');
  body = body.replace(/\n\n\{img\}(?=\n\n)/, '');
  body = body.replace(/(:?)\n\n\{bar\}(?=\n\n)/, (_, c) => (c ? '.' : '')); // in the text version the sentence before the picture ends with a full stop
  return {
    subject,
    variant: v,
    seatsImg,
    text: `${body.replace('{link}', url)}\n\n--\n${why}\nUnsubscribe: ${off}`,
    html: `<!doctype html><html><body><div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#222">
${html}
<p style="margin-top:28px;font-size:12px;color:#888">${esc(why)} <a href="${off}" style="color:#888">Unsubscribe</a></p>
</div></body></html>`,
    headers: { 'List-Unsubscribe': `<${off}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  };
}
