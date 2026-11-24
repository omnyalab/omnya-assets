// THE 3D FUTURE public page (/the-3d-future, 20/11, Nico's board A "Giro 3": A1 with H6, A2 with P1, B2 badges).
// Words and numbers of the page in one place. 24/11: 5,813,386 views in 30 days (Nico's Insights), stadium reel 2,548,472 and 18,863 followers (Graph API), €5,000+ sales this month (Nico). Before: the real ones read on 20/11 (Instagram of @omnyalab,
// 30 days, and Stripe), as written on the board: change them here only with a new source line.

/** Round 1 (Europe/Rome, +01:00 for the whole window), the same instants as api/_lib/club.js */
export const EARLY = '2026-11-28T09:00:00+01:00'; // doors open for the waitlist and the guide buyers
export const OPEN = '2026-11-28T18:00:00+01:00'; // doors open for everyone
// 24/11 Nico: «le porte son sempre aperte»: 4/12 23:59 ends only the founders' €9, the doors stay open at €19
export const FOUNDERS_END = '2026-12-05T00:00:00+01:00'; // the first moment after Fri 4/12 23:59
export const SEATS = 100; // the founders' gifts (23/11): the whole round is €9

export const NAME = { a: 'THE 3D FUTURE', b: '3D THAT SELLS' } as const;
export const SUB = 'The club where you learn to build the 3D that sells';

/** l = the label; a "|" breaks it in two lines, the same on every small tile so the labels of a row share one baseline */
export const PROOF = [
  { n: 5.8, dec: 1, suf: 'M', l: 'views in 30 days', bv: 1, big: true },
  { n: 2.5, dec: 1, suf: 'M', l: 'views on|one reel', bv: 3 },
  { n: 18800, suf: '+', l: 'followers|on Instagram', bv: 2 },
  { n: 5000, pre: '€', suf: '+', l: 'in sales|this month', bv: 5 },
  { n: 4800, suf: '+', l: 'emails|in 13 days', bv: 4 },
] as { n: number; dec?: number; pre?: string; suf?: string; l: string; bv: number; big?: boolean }[];
export const SOURCE = 'Instagram and Stripe, 24 November 2026';
export const proofTxt = (s: (typeof PROOF)[number]) => (s.pre || '') + (s.dec ? s.n.toFixed(s.dec) : s.n.toLocaleString('en-US')) + (s.suf || '');

/** The Vault at launch: six builds open, then the card of the next Friday (no project name: not decided yet).
    img = the real photo of each build, from its funnel in public/learn (Towers: the reel poster watch/p_towers.jpg, so the
    photo of the 4.7M tile is not repeated; then ry_, sd_, bd_, pl_, mi_hero), made smaller
    in public/club/v-<img>(-760).webp. The Burtville photos stay only on the number tiles (Nico, 20/11). */
export const DROPS = [
  { t: 'The Towers', w: 'Towers', type: '3D scene', img: 'towers' },
  { t: 'Riyadh Tower', w: 'Riyadh', type: 'Phone remote', img: 'riyadh' },
  { t: 'Stadium', w: 'Stadium', type: 'Skill', img: 'stadium' },
  { t: 'House that builds itself', w: 'House', type: 'Skill', img: 'house' },
  { t: 'Plane', w: 'Plane', type: 'Skill and kit', img: 'plane' },
  { t: 'Miami', w: 'Miami', type: 'Skill', img: 'miami' },
];
export const vImg = (k: string) => `/club/v-${k}-760.webp`;
export const vSet = (k: string) => `/club/v-${k}-760.webp 760w, /club/v-${k}.webp 1400w`;

/** What's inside, the courses first (the badges are the B2 game trophies of the board) */
export const INSIDE = [
  { k: 'lesson', t: 'Step-by-step video courses on our builds', d: 'The first one, your own tower where buyers choose their floor, is ready on day one, and a new course comes every Friday with the build of the week' },
  { k: 'first', t: 'Six builds from our reels', d: 'With the files, the prompts and the Claude skills' },
  { k: 'month', t: 'My comments on your builds', d: 'Every Monday' },
  { k: 'house', t: 'The House Builder skill', d: 'Yours to keep' },
];

export const VALUE: [string, string][] = [
  ['Step-by-step video courses', 'new, only inside'],
  ['Six builds from our reels with files, prompts and Claude skills', '€85+ on our site'],
  ['Every Full guide', '€53+ on our site'],
  ['House Builder skill, yours to keep', '€14.99'],
  ['A new build every Friday', ''],
  ['My comments on your builds every Monday', ''],
];

export const FAQ: [string, string][] = [
  ['Do I need to code?', 'No. The Claude skills and the prompts do the building, the course shows you each step.'],
  ['What do I need?', 'A computer and Claude Pro or Claude Code for the skills. Higgsfield for photos and video.'],
  ['Can I cancel?', 'Yes, in one tap, whenever you want.'],
  ['Who gets the founders\' gifts?', 'The first 100 who join by Friday 4 December: our three playbooks and the full 3D AI Mastery course, yours to keep.'],
  ['I bought a guide, what do I pay?', '€9 a month, after Friday 4 December too: enter your receipt number.'],
  ['When do new builds arrive?', 'Every Friday.'],
];

/** A2 step 1 */
export const WANTS = [
  { k: 'tower', i: 'cube', t: 'A tower people climb floor by floor' },
  { k: 'stadium', i: 'seat', t: 'A stadium where you pick your seat' },
  { k: 'house', i: 'home', t: 'A house that builds itself' },
  { k: 'own', i: 'spark', t: 'Something of my own' },
];

export const bv = (i: number, w?: 800) => `/club/bv-${i}${w ? '-' + w : ''}.webp`;
export const bvSet = (i: number) => `${bv(i, 800)} 800w, ${bv(i)} 1600w`;
