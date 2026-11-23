// 23/11 (Nico: «sei sicuro che tutti vedano quei pallini? … magari metti na foto bella?»): the 100 founders' seats in the
// launch mails become a picture in the style of the founders' card Nico approved (founders-v4.jpg), drawn by /api/seats with
// the real number of that mail. The table of squares it replaces was 566 px wide, too wide for a phone screen; a picture
// scales to any screen. The number is in the address, signed, so nobody can make our domain draw a number we didn't send.
import { createHmac, timingSafeEqual } from 'node:crypto';

const secret = () => process.env.NEWSLETTER_SECRET || process.env.IG_ADMIN_KEY || '';
const sig = (m, n) => createHmac('sha256', secret()).update(`seats|${m}|${n}`).digest('base64url').slice(0, 12);

export const W = 1200;
export const H = 864;
export const MODES = ['list', 'taken'];

/** the picture's address for one mail: m 'list' = n people on the club list (before Saturday), 'taken' = n seats taken */
export const seatsUrl = (m, n) => `https://www.omnyalab.com/api/seats?m=${m}&n=${n}&s=${sig(m, n)}`;

export function seatsOk(m, n, s) {
  if (!MODES.includes(m) || !Number.isInteger(n) || n < 0 || n > 100000 || typeof s !== 'string') return false;
  const a = Buffer.from(sig(m, n)); const b = Buffer.from(s);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** the words under "100 founders' seats", the same ones the mail says in text (for alt and for people with pictures off) */
export function seatsWords(m, n) {
  if (m === 'taken') { const left = Math.max(0, 100 - n); return { b: `${left} left`, rest: `${Math.min(100, n)} of 100 already taken` }; }
  return { b: `${n} ${n === 1 ? 'person' : 'people'}`, rest: 'already on the list' };
}

const h = (type, style, ...children) => ({ type, props: { style, children: children.length === 1 ? children[0] : children } });

/** the card as satori elements (founders-v4 top half: logo, "100 founders' seats", the real number, 10×10 seats) */
export function seatsCard(m, n, logoSrc) {
  const filled = Math.min(100, Math.max(0, n));
  const w = seatsWords(m, n);
  const cell = (on) => h('div', on
    ? { width: 43, height: 43, borderRadius: 12, border: '2.5px solid #7cc0ff', backgroundColor: '#3b9bff', boxShadow: '0 0 14px rgba(59,155,255,0.55)' }
    : { width: 43, height: 43, borderRadius: 12, border: '2.5px solid #3b9bff', backgroundColor: 'rgba(59,155,255,0.10)' });
  const rows = Array.from({ length: 10 }, (_, r) => h('div', { display: 'flex', gap: 12 }, ...Array.from({ length: 10 }, (_, c) => cell(r * 10 + c < filled))));
  return h('div', {
    // satori measures like CSS content-box: the size here is the inside, the padding goes around it (and a seat's border too)
    width: W - 160, height: H - 144, display: 'flex', flexDirection: 'column', gap: 44, padding: '72px 80px', color: '#edf1f9', fontFamily: 'Inter',
    backgroundColor: '#070b16', backgroundImage: 'radial-gradient(ellipse 120% 70% at 50% 0%, #0e2a5c 0%, #070b16 55%)',
  },
  h('div', { display: 'flex', alignItems: 'center', gap: 22 },
    { type: 'img', props: { src: logoSrc, width: 88, height: 88, style: { width: 88, height: 88 } } },
    h('div', { display: 'flex', fontWeight: 700, fontSize: 44, letterSpacing: -1.3 },
      h('span', {}, 'THE '),
      h('span', { backgroundImage: 'linear-gradient(180deg, #9fd0ff, #3b9bff 45%, #0a84ff)', backgroundClip: 'text', color: 'transparent', paddingRight: 4 }, '3D'),
      h('span', {}, ' FUTURE'))),
  h('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    h('div', { display: 'flex', flexDirection: 'column' },
      h('div', { fontWeight: 600, fontSize: 24, letterSpacing: 4.3, color: '#5aaeff' }, "FOUNDERS' DEAL"),
      h('div', { fontWeight: 700, fontSize: 150, lineHeight: 0.9, letterSpacing: -7.5, marginTop: 14 }, '100'),
      h('div', { fontWeight: 600, fontSize: 40, letterSpacing: -0.8, color: '#c9d6ee', marginTop: 14 }, "founders' seats"),
      h('div', { fontWeight: 700, fontSize: 42, letterSpacing: -0.8, color: '#9fd0ff', marginTop: 26 }, w.b), // bigger than on founders-v4: on a phone the card is a third of its size
      h('div', { fontWeight: 600, fontSize: 30, color: '#c9d6ee', marginTop: 6 }, w.rest)),
    h('div', { display: 'flex', flexDirection: 'column', gap: 12 }, ...rows)));
}
