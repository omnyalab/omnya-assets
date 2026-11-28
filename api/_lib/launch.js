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
  // 26/11 (Nico: «remember to pre sub so you won't miss the pack», gentle, alla Hormozi): the list and who opened the card step
  // without finishing (Daksh: Amazon Pay sent him back with nothing saved) hear that only the card saves the seat and the gift.
  // First of its day, so e2b skips whoever got it (never two launch mails on the same day); held until &lgo=r2
  { id: 'r2', at: '2026-11-26T08:00:00Z', list: 'reserve', seats: true, hold: true },
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
  r2: {
    // 26/11 fourth round (Nico, M1 on board SycwEeXgJPv3fh9ACHRJJA): what they always find inside, the club as an Instagram made
    // only of 3D (Nico looks at every post and writes privately), «Step inside» before the €9 (S1, the real club page on a phone,
    // example name Alex), no money but the €9, fewer founder spots every day, AI is the future, «remember to reserve your spot
    // with your card» at the end. NOTE: the feed with likes, comments and shares is not in the club page yet: it must be
    // online before &lgo=r2. Sent only as a test to Nico (&ltest=r2) until he says ok
    subject: 'Your seat is one step away',
    img2: { src: '/club/mail/step-inside-d3.jpg', alt: 'Step inside: the club page from the inside, your courses, the Vault and my comments' },
    img: { src: '/club/mail/gifts.jpg', alt: "The founders' gift for the first 100: our three playbooks and the full 3D AI Mastery course" },
    body: `Hey {name},

You put your name down for THE 3D FUTURE, and I don't want you to lose your spot over a small detail: the list keeps your place in line, but only your card saves the seat.

Here's what's waiting for you inside. On Saturday you start with your own tower, the kind where buyers pick their floor, in 11 short video steps where you see every click, and next to it you get six builds from our reels with their files, prompts and Claude skills. And it doesn't stop there: every Friday a new course comes in with the build of the week, so there's always something new to build.

Everything you build, you post inside the club. Think of it as an Instagram made only of 3D: towers, villas and stadiums made by the people in the club. Everyone sees what you can do, you get likes, comments and shares, and I look at every single post and write to you privately with what works and what I'd change.

{img2}

These tutorials will keep paying off for years, because AI is the future of 3D, and the earlier you learn it the further ahead you are. It's €9 a month, locked for as long as you stay. You add your card today and nothing is charged, your first month starts on Saturday at 9:00 (Rome), and if you change your mind before then you cancel in one tap.

The first 100 who reserve also get the founders' gift: our three playbooks and the full 3D AI Mastery course, unlocked inside your own club page and yours to keep. There are fewer founder spots left every day, so take this as a friendly reminder not to let it slip.

{img}

Remember to reserve your spot with your card: without it your seat isn't saved, and the founders' gift goes to someone else. It takes a minute (and if the page didn't take your card last time, try again with a card, Apple Pay or Google Pay):
{link}

Nico`,
  },
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
  // 26/11 (Nico: «le mail ora solo incentrate nell'entrare… non farti scappare sta opportunità perché non capita più», spoilers SV and
  // SP yes, SG no): every mail is about getting in. The urgency is the real one: the founders' gift stops on Saturday at 9:00 for
  // everyone and never comes back; the €9 closes on Friday 4 December at 23:59 and becomes €19. {Seats_words} follows the real
  // count, so «almost gone» appears only when it's true. SP («Founding member») only before Saturday, when reserving makes you one.
  e2b: {
    subject: "Your founders' gift ends Saturday at 9:00",
    img: { src: '/club/mail/sp-founding-member.jpg', alt: 'A small spoiler: the profile of a founding member in the club page, with the Founder badge' },
    body: `Hey {name},

On Saturday at 9:00 (Rome) the doors of THE 3D FUTURE open, and at that exact moment the founders' gift stops. Whoever has reserved by then, among the first 100, becomes a founding member and gets our three playbooks and the full 3D AI Mastery course, unlocked inside their own club page. Whoever comes after doesn't, and it won't come back.

{img}

Reserving takes a minute: you add your card, nothing is charged today, and on Saturday your month starts at €9, locked for as long as you stay. From day one you have the course where you build your own tower step by step, the Vault with the files of our builds and a new course every Friday, and if you change your mind before Saturday you cancel in one tap and pay nothing.

{Seats_words}, so don't leave it for tomorrow:
{link}

Nico`,
  },
  e3b: {
    subject: "Last night to get the founders' gift",
    img: { src: '/club/mail/sg-your-gift.jpg', alt: "A small spoiler: the founders' gifts page inside the club, our three playbooks and the full 3D AI Mastery course" },
    body: `Hey {name},

Tomorrow at 9:00 (Rome) THE 3D FUTURE opens, so tonight is the last night to reserve your seat with the founders' gift. After 9:00 the gift is gone for good, even for someone who joins a minute later.

{img}

The gift is our three playbooks and the full 3D AI Mastery course, unlocked inside your own club page and yours to keep, on top of everything the club gives you: the course where you build your own tower step by step, the Vault with the files of our builds and a new course every Friday.

Tonight you add your card and nothing is charged. Tomorrow your first month starts at €9, locked for as long as you stay, and if you change your mind before 9:00 you cancel and pay nothing. {Seats_words}:
{link}

Nico`,
  },
  e3: {
    subject: "You're first tomorrow",
    img: { src: '/club/mail/sg-your-gift.jpg', alt: "A small spoiler: the founders' gifts page inside the club, our three playbooks and the full 3D AI Mastery course" },
    body: `Hey {name},

Tomorrow at 9:00 (Rome) the doors of THE 3D FUTURE open, and because you're on the list you get in nine hours before everyone else. There's one thing the list can't do for you, though: the founders' gift goes only to people who reserve their seat with a card before 9:00, and after that it's gone.

{img}

You add your card tonight and nothing is charged. Tomorrow your month starts at €9, locked for as long as you stay, and our three playbooks and the full 3D AI Mastery course are waiting inside your club page, yours to keep. {Seats_words}, so this is the moment:
{link}

Nico`,
  },
  // 28/11 (Nico: «you're almost in» for who is on the list without a card, alla Hormozi): who reserved is skipped
  // (seats: true) and gets W1 «you're in» from the Saturday charge
  e4a: {
    subject: "You're almost in",
    img: { src: '/club/mail/sv-the-vault.jpg', alt: 'A small spoiler: the Vault of the club page, six builds from our reels with their files' },
    body: `Hey {name},

The doors of THE 3D FUTURE just opened and you're almost in, because you're on the list, so you can join now, before everyone else gets in at 18:00 (Rome), and the only step left is your card, which locks your seat at the founders' price of €9 a month for as long as you stay.

{img}

The moment you join, your own club page opens with the first course, 11 short steps where you see every click and build your own tower, the kind where buyers choose their floor, and next to it the Vault with six builds from our reels and their files, every Full guide and the Feed, where everyone posts their builds and I comment on every single one, and then a new course lands every Friday with the build of the week.

The €9 lasts until Friday 4 December at 23:59 (Rome), then it goes up to €19 and the founders' round doesn't come back, and if you follow the 11 steps, send me your build and it still isn't live within 7 days, your first month is on us. Join with this same email, so the site knows you're on the list, it takes a minute:
{link}

Nico`,
  },
  e4: {
    subject: 'Doors are open',
    img: { src: '/club/mail/sv-the-vault.jpg', alt: 'A small spoiler: the Vault of the club page, six builds from our reels with their files' },
    body: `Hey {name},

THE 3D FUTURE is open, and until Friday you get in at the founders' price: €9 a month, locked for as long as you stay.

{img}

The moment you join you start the first course, 11 short steps where you see every click and build your own tower, the kind where buyers choose their floor. Then a new course comes every Friday with the build of the week, next to six builds from our reels with their files, prompts and Claude skills, every Full guide and the Feed, where everyone in the club posts their builds and I look at every single one.

On Friday 4 December at 23:59 (Rome) the founders' price closes and it goes up to €19 for good. And if you follow the 11 steps, send me your build and it still isn't live within 7 days, your first month is on us:
{link}

Nico`,
  },
  e5: {
    subject: 'Four days left at €9',
    img: { src: '/club/mail/inside-v2.jpg', alt: 'Inside THE 3D FUTURE: the course player with the steps of your first tower' },
    body: `Hey {name},

The founders' price of THE 3D FUTURE closes on Friday 4 December at 23:59 (Rome). Until then you get in at €9 a month, locked for as long as you stay, and from Saturday it's €19.

{img}

Inside, you build your own tower step by step in 11 short videos, and every Friday a new course comes in with the build of the week, so the club keeps growing with you. AI is changing the way 3D gets made, and the earlier you learn it, the further ahead you'll be.

You can cancel in one tap whenever you want, so the only way to lose here is to wait:
{link}

Nico`,
  },
  e6: {
    subject: '€9 ends tomorrow',
    img: { src: '/club/mail/vault-files.jpg', alt: 'One build from the Vault of THE 3D FUTURE: the build kit, the exact prompts, the 3D scene and the Full guide' },
    body: `Hey {name},

Tomorrow at 23:59 (Rome) the founders' price of THE 3D FUTURE closes. Whoever is inside by then keeps €9 a month for as long as they stay, and everyone after pays €19.

{img}

If you're still deciding, here are the usual doubts. You don't need to code, because the Claude skills and the prompts do the building and the course shows you every click. And you don't need much time either: the whole first course is about 30 minutes of video.

Don't let this one go, because it doesn't come back:
{link}

Nico`,
  },
  e7: {
    subject: '€9 ends tonight',
    img: { src: '/club/mail/doors.jpg', alt: 'THE 3D FUTURE: your first course is your own tower, floor by floor' },
    body: `Hey {name},

Tonight at 23:59 (Rome) the founders' price of THE 3D FUTURE closes, and from tomorrow the same club costs €19.

{img}

If you join today you get in at €9 a month, locked for as long as you stay: the course where you build your own tower step by step, a new course every Friday, the Vault with the files of our builds and the Feed, where everyone posts their builds and I comment on them.

It takes a minute and you can cancel in one tap whenever you want, so don't let it slip:
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
  const list = LAUNCH.find((x) => x.id === id)?.list;
  const why = list === 'club' // the club list's own mails (e3, e4a)
    ? `You're getting this because you joined the list of ${v === 'b' ? '3D THAT SELLS' : 'THE 3D FUTURE'}. Omnya Lab, Venice, Italy.`
    : list === 'reserve' // 26/11: r2, the list and the reservations left halfway
      ? "You're getting this because you joined the list of THE 3D FUTURE or started reserving your seat. Omnya Lab, Venice, Italy."
      : "You're getting this because you asked for one of our guides on omnyalab.com and said yes to updates. Omnya Lab, Venice, Italy.";
  const paras = body.split('\n\n');
  const picOf = (im) => (im ? `<p><img src="https://www.omnyalab.com${im.src}" alt="${esc(im.alt)}" width="560" style="display:block;width:100%;max-width:560px;height:auto;border:0;border-radius:12px"></p>` : '');
  const pic = picOf(t.img), pic2 = picOf(t.img2); // 26/11: r2 has two pictures, «Step inside» ({img2}) and the gifts ({img})
  const html = paras.map((para) => (para.trim() === '{img}' ? pic : para.trim() === '{img2}' ? pic2 : para.trim() === '{bar}' ? bar : `<p>${esc(para).replace(/\n/g, '<br>').replace('{link}', `<a href="${url}">${PAGE}</a>`)}</p>`)).filter(Boolean).join('\n');
  body = body.replace(/\n\n\{img\}(?=\n\n)/, '').replace(/\n\n\{img2\}(?=\n\n)/, '');
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
