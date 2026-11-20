// The B2 badges of THE 3D FUTURE ("game trophy": tiered metal hexagon, gem, rays, outlined glyph, ribbon with stars),
// chosen by Nico on board A, Giro 3 (20/11). A straight port of badgeSVG(key, 'B2') of the board, drawn at build time
// as inline SVG (no script on the page). Every id inside one badge starts with its own prefix `u`.

type Pal = { bg: [string, string]; tier: 'bronze' | 'silver' | 'gold' | 'plat'; [role: string]: any };
const BPAL: Record<string, Pal> = {
  founder: { bg: ['#b28aff', '#5626d0'], t: '#fff3b8', m: '#ffc93a', s: '#e0921a', d: '#8a5600', l: '#ffffff', a: '#ff4f8f', y: '#4fd8ff', n: '#ffffff', tier: 'plat' },
  first: { bg: ['#6fb6ff', '#1d5ae0'], t: '#d6edff', m: '#5ca4ff', s: '#2556d8', d: '#0b2a7a', l: '#ffffff', a: '#ffd84d', tier: 'bronze' },
  streak: { bg: ['#ffae5e', '#df3418'], t: '#ffb92e', m: '#ff7a1a', s: '#e8461c', d: '#6e1600', l: '#ffffff', y: '#fff27e', tier: 'silver' },
  tower: { bg: ['#a08eff', '#3c2ccc'], t: '#e4f1ff', m: '#8cc0ff', s: '#3a6ee8', d: '#1b2f7a', l: '#ffffff', y: '#ffd27a', c: '#ffffff', tier: 'gold' },
  stadium: { bg: ['#3fd8c6', '#0a6c7a'], t: '#f6f8fc', m: '#ff554a', s: '#8a96ac', d: '#2b3446', l: '#ffffff', a: '#45d96c', y: '#ffe066', tier: 'gold' },
  plane: { bg: ['#62d2ff', '#0a74d2'], t: '#ffffff', m: '#e4eaf4', s: '#a6b3c8', d: '#2f3d58', l: '#ffffff', a: '#ff6a3d', c: '#ffffff', tier: 'gold' },
  house: { bg: ['#ffcf5c', '#ee6e10'], t: '#fff8ea', m: '#ffeacb', s: '#d6a067', d: '#6e3518', l: '#ffffff', a: '#e5432a', y: '#ffe27a', g: '#4cc46a', tier: 'silver' },
  lesson: { bg: ['#7be08f', '#138a4c'], t: '#d6ebff', m: '#4f8dff', s: '#9aa6bd', d: '#24304a', l: '#ffffff', a: '#ff5a4f', tier: 'gold' },
  month: { bg: ['#ff82c2', '#b51d70'], t: '#fff3b8', m: '#ffc93a', s: '#e0921a', d: '#7a4a00', l: '#ffffff', y: '#ffe680', tier: 'plat' },
};
/* glyphs on a 100 grid: [role, path, 'k' for a stroke, width] */
const BGLY: Record<string, [string, string, string?, (number | string)?][]> = {
  first: [['t', 'M50 12L86 32L50 52L14 32Z'], ['m', 'M14 32L50 52L50 92L14 72Z'], ['s', 'M86 32L50 52L50 92L86 72Z'], ['l', 'M50 53V91', 'k', 1.6], ['a', 'M82 2L85 11L94 14L85 17L82 26L79 17L70 14L79 11Z']],
  stadium: [['d', 'M22 16H26V54H22ZM74 16H78V54H74Z'], ['y', 'M16 8H32A2 2 0 0 1 34 10V16A2 2 0 0 1 32 18H16A2 2 0 0 1 14 16V10A2 2 0 0 1 16 8ZM68 8H84A2 2 0 0 1 86 10V16A2 2 0 0 1 84 18H68A2 2 0 0 1 66 16V10A2 2 0 0 1 68 8Z'], ['s', 'M8 58V70A42 20 0 0 0 92 70V58A42 20 0 0 1 8 58Z'], ['t', 'M8 58A42 20 0 1 0 92 58A42 20 0 1 0 8 58Z'], ['m', 'M17 58A33 14.5 0 1 0 83 58A33 14.5 0 1 0 17 58Z'], ['a', 'M26 58A24 9.5 0 1 0 74 58A24 9.5 0 1 0 26 58Z'], ['l', 'M50 49V67M44 58A6 2.6 0 1 0 56 58A6 2.6 0 1 0 44 58', 'k', 1.4]],
  tower: [['m', 'M50 8L45 30L42 30L39 56L35 56L31 92H50Z'], ['s', 'M50 8L55 30L58 30L61 56L65 56L69 92H50Z'], ['t', 'M49 0H51V10H49Z'], ['y', 'M36 62H45V66H36ZM35 70H45V74H35ZM34 78H45V82H34ZM43 36H47V40H43ZM42 44H47V48H42Z'], ['t', 'M55 62H63V66H55ZM55 70H64V74H55ZM53 36H56V40H53ZM53 44H57V48H53Z'], ['l', 'M47 16L43.4 40', 'k', 1.8], ['c', 'M10 96A10 10 0 0 1 22 84A13 13 0 0 1 44 80A11 11 0 0 1 61 84A10 10 0 0 1 77 82A10 10 0 0 1 90 96Z']],
  plane: [['s', 'M47 38L10 61L10 68L47 56ZM53 38L90 61L90 68L53 56Z'], ['d', 'M26 57H33V66A3.5 3.5 0 0 1 26 66ZM67 57H74V66A3.5 3.5 0 0 1 67 66Z'], ['s', 'M47 76L33 85L33 90L48 86ZM53 76L67 85L67 90L52 86Z'], ['m', 'M50 5C56 5 57 14 57 22V78C57 86 54 95 50 95C46 95 43 86 43 78V22C43 14 44 5 50 5Z'], ['t', 'M50 5C44 5 43 14 43 22V78C43 86 46 95 50 95Z'], ['d', 'M46.5 17C46.5 12 53.5 12 53.5 17V22H46.5Z'], ['a', 'M48.4 80L50 71L51.6 80V93H48.4Z']],
  house: [['g', 'M10 86H90A4 4 0 0 1 90 94H10A4 4 0 0 1 10 86Z'], ['s', 'M64 18H74V42H64Z'], ['m', 'M22 50L50 28L78 50V87H22Z'], ['a', 'M50 13L90 45A4.5 4.5 0 0 1 85 52.5L50 25L15 52.5A4.5 4.5 0 0 1 10 45Z'], ['d', 'M43 87V69A7 7 0 0 1 57 69V87Z'], ['y', 'M28 58H39V69H28ZM61 58H72V69H61Z'], ['s', 'M33.5 58V69M28 63.5H39M66.5 58V69M61 63.5H72', 'k', 1.4], ['t', 'M63 15H75V20H63Z']],
  streak: [['m', 'M50 4C58 18 78 30 78 56C78 78 65 94 50 94C35 94 22 78 22 58C22 44 30 34 38 26C39 36 42 42 46 44C44 32 45 16 50 4Z'], ['s', 'M50 4C58 18 78 30 78 56C78 78 65 94 50 94C62 86 68 74 68 58C68 40 57 28 50 4Z'], ['t', 'M50 38C58 50 66 56 66 70C66 84 58 90 50 90C42 90 34 84 34 70C34 60 42 54 50 38Z'], ['y', 'M50 56C55 63 59 67 59 74C59 82 55 86 50 86C45 86 41 82 41 74C41 68 45 64 50 56Z'], ['d', 'M40 58H60L48 85', 'k', 7]],
  founder: [['m', 'M14 32L32 50L50 16L68 50L86 32L79 70H21Z'], ['s', 'M21 61H79L77.6 72H22.4Z'], ['a', 'M44 16A6 6 0 1 0 56 16A6 6 0 1 0 44 16Z'], ['y', 'M9 32A5 5 0 1 0 19 32A5 5 0 1 0 9 32ZM81 32A5 5 0 1 0 91 32A5 5 0 1 0 81 32Z'], ['a', 'M46 66.5A4 4 0 1 0 54 66.5A4 4 0 1 0 46 66.5Z'], ['n', 'text', '100']],
  month: [['s', 'M30 24H16C16 44 24 52 36 54', 'k', 6], ['s', 'M70 24H84C84 44 76 52 64 54', 'k', 6], ['m', 'M26 16H74V38C74 56 63 64 50 64C37 64 26 56 26 38Z'], ['s', 'M50 16H74V38C74 56 63 64 50 64Z'], ['t', 'M23 11H77A3.5 3.5 0 0 1 77 18H23A3.5 3.5 0 0 1 23 11Z'], ['s', 'M44 64H56V77H44Z'], ['d', 'M30 78H70A3 3 0 0 1 73 81V92H27V81A3 3 0 0 1 30 78Z'], ['y', 'M40 83H60V87H40Z'], ['l', 'M50 25L54 33.5L63 34.5L56.5 40.5L58.3 49.5L50 45L41.7 49.5L43.5 40.5L37 34.5L46 33.5Z']],
  lesson: [['s', 'M40 76H60L65 90H35Z'], ['d', 'M12 18H88A7 7 0 0 1 95 25V69A7 7 0 0 1 88 76H12A7 7 0 0 1 5 69V25A7 7 0 0 1 12 18Z'], ['m', 'M13 25H87V69H13Z'], ['l', 'M41 34L63 47L41 60Z'], ['a', 'M17 62H55V65H17Z']],
};
const BROT: Record<string, number> = { plane: 45 };
const BTIER = { bronze: ['#ffe2c6', '#cf8748', '#ffd5ab', '#7a3c12'], silver: ['#ffffff', '#b1bccb', '#eff3f8', '#5c6778'], gold: ['#fff7c6', '#f2b42c', '#ffefa0', '#965e00'], plat: ['#ffffff', '#c6e6ff', '#f2e6ff', '#7a8ab4'] };
const B_INK = '#170d2c';

const hx = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const cmix = (a: string, b: string, t: number) => { const x = hx(a), y = hx(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const cLite = (c: string, t: number) => cmix(c, '#ffffff', t), cDark = (c: string, t: number) => cmix(c, '#000000', t);
function polyD(n: number, r: number, rot: number, cx: number, cy: number) { let d = ''; for (let i = 0; i < n; i++) { const a = (rot + i * 360 / n) * Math.PI / 180; d += (i ? 'L' : 'M') + (cx + r * Math.cos(a)).toFixed(2) + ' ' + (cy + r * Math.sin(a)).toFixed(2); } return d + 'Z'; }
const rays = (cy: number, n = 16, op = 0.12) => Array.from({ length: n }, (_, i) => { const a = (i * 360 / n) * Math.PI / 180, w = Math.PI / n * 0.45; return `<path d="M60 ${cy}L${(60 + 80 * Math.cos(a - w)).toFixed(1)} ${(cy + 80 * Math.sin(a - w)).toFixed(1)}L${(60 + 80 * Math.cos(a + w)).toFixed(1)} ${(cy + 80 * Math.sin(a + w)).toFixed(1)}Z" fill="#fff" opacity="${op}"/>`; }).join('');
const lgrad = (id: string, stops: [string, number, number?][], dir = 'x1="0" y1="0" x2="0" y2="1"') => `<linearGradient id="${id}" ${dir}>${stops.map(([c, o, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</linearGradient>`;
const shadowF = (id: string, dy: number, sd: number, op: number) => `<filter id="${id}" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="${dy}" stdDeviation="${sd}" flood-color="#000" flood-opacity="${op}"/></filter>`;

function glyphParts(key: string, paint: (r: string) => string, solid: (r: string) => string, outline = false) {
  return BGLY[key].map(([r, d, k, w]) => {
    if (d === 'text') return `<text x="50" y="95" text-anchor="middle" font-family="Geist, -apple-system, system-ui, sans-serif" font-weight="800" font-size="23" letter-spacing="-.5" ${outline ? `fill="${B_INK}" stroke="${B_INK}" stroke-width="8" stroke-linejoin="round"` : `fill="${paint(r)}"`}>${k}</text>`;
    if (k === 'k') return `<path d="${d}" fill="none" stroke="${outline ? B_INK : solid(r)}" stroke-width="${outline ? (w as number) + 7 : w}" stroke-linecap="round" stroke-linejoin="round"/>`;
    return `<path d="${d}" fill="${outline ? B_INK : paint(r)}"${outline ? ` stroke="${B_INK}" stroke-width="7" stroke-linejoin="round"` : ''}/>`;
  }).join('');
}

/** B2 game trophy, as an SVG string; `u` makes the ids unique on the page */
export function badgeB2(key: string, u = 'bd-' + key) {
  const p = BPAL[key], roles = ['t', 'm', 's', 'd', 'l', 'a', 'y', 'c', 'g', 'n'].filter((r) => p[r]);
  const rot = BROT[key] ? ` rotate(${BROT[key]} 50 50)` : '';
  const T = BTIER[p.tier], cy = 55, R = 49, gem = p.a || p.y;
  let defs = lgrad(u + 'fr', [[T[0], 0], [T[1], 0.44], [T[2], 0.56], [T[3], 1]])
    + `<radialGradient id="${u}fd" cx=".5" cy=".38" r=".7"><stop offset="0" stop-color="${cLite(p.bg[0], 0.2)}"/><stop offset=".55" stop-color="${p.bg[0]}"/><stop offset="1" stop-color="${p.bg[1]}"/></radialGradient>`
    + lgrad(u + 'rb', [[cLite(p.bg[1], 0.28), 0], [p.bg[1], 1]])
    + `<clipPath id="${u}cl"><path d="${polyD(6, R * 0.8 * 1.07, -90, 60, cy)}"/></clipPath>`
    + shadowF(u + 'ds', 2, 1.4, 0.35) + `<filter id="${u}sh"><feGaussianBlur stdDeviation="3"/></filter>`;
  roles.forEach((r) => (defs += lgrad(`${u}${r}`, [[cLite(p[r], 0.38), 0], [cLite(p[r], 0.38), 0.42], [p[r], 0.43], [p[r], 1]])));
  const paint = (r: string) => `url(#${u}${r})`, solid = (r: string) => p[r];
  const n = { bronze: 1, silver: 2, gold: 3, plat: 3 }[p.tier];
  const star = (x: number, y: number) => `<path d="M${x} ${y - 4.6}L${x + 1.35} ${y - 1.4}L${x + 4.4} ${y - 1.2}L${x + 2.1} ${y + 1}L${x + 2.8} ${y + 4.2}L${x} ${y + 2.5}L${x - 2.8} ${y + 4.2}L${x - 2.1} ${y + 1}L${x - 4.4} ${y - 1.2}L${x - 1.35} ${y - 1.4}Z" fill="#ffe36e" stroke="${B_INK}" stroke-width="1.1" stroke-linejoin="round"/>`;
  const body = `<ellipse cx="60" cy="112" rx="36" ry="5" fill="#000" opacity=".32" filter="url(#${u}sh)"/>`
    + `<path d="${polyD(6, R * 1.07, -90, 60, cy)}" fill="url(#${u}fr)" stroke="${B_INK}" stroke-width="3" stroke-linejoin="round"/>`
    + `<path d="${polyD(6, R * 0.92 * 1.07, -90, 60, cy)}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.4" stroke-linejoin="round"/>`
    + `<path d="${polyD(6, R * 0.86 * 1.07, -90, 60, cy)}" fill="${cDark(T[3], 0.25)}" stroke-linejoin="round"/>`
    + `<path d="${polyD(6, R * 0.8 * 1.07, -90, 60, cy)}" fill="url(#${u}fd)"/>`
    + `<g clip-path="url(#${u}cl)">${rays(cy - 4, 14, 0.16)}</g>`
    + `<path d="${polyD(6, R * 0.8 * 1.07, -90, 60, cy)}" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="2.4" stroke-linejoin="round"/>`
    + `<path d="M60 -1L67 6L60 14L53 6Z" fill="${gem}" stroke="${B_INK}" stroke-width="1.8" stroke-linejoin="round"/><path d="M60 1.5L64 6L60 6Z" fill="#fff" opacity=".75"/>`
    + `<g transform="translate(60 ${cy - 4}) scale(.48) translate(-50 -50)${rot}" filter="url(#${u}ds)">${glyphParts(key, paint, solid, true)}${glyphParts(key, paint, solid)}</g>`
    + `<path d="M8 89H30V105H8L14 97Z" fill="${cDark(p.bg[1], 0.3)}" stroke="${B_INK}" stroke-width="2.2" stroke-linejoin="round"/><path d="M112 89H90V105H112L106 97Z" fill="${cDark(p.bg[1], 0.3)}" stroke="${B_INK}" stroke-width="2.2" stroke-linejoin="round"/>`
    + `<path d="M19 87Q60 80 101 87V101Q60 94 19 101Z" fill="url(#${u}rb)" stroke="${B_INK}" stroke-width="2.4" stroke-linejoin="round"/>`
    + Array.from({ length: n }, (_, i) => star(60 + (i - (n - 1) / 2) * 12, 91)).join('');
  return `<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false"><defs>${defs}</defs>${body}</svg>`;
}
