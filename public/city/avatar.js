// Omnya City characters (8/11/2026, Nico): drawn in code, no credits. Every top job has its own character
// (the CEO grey-haired with glasses, the captain with a white beard…); workers get a face from their username.
const INK = '#1a120c';
const hashU = (u) => { let h = 2166136261; for (const ch of String(u)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const SKINS = ['#F6D3B3', '#EDC29B', '#D9A27A', '#B97D57', '#8E5A3B', '#6B4128', '#F1C9A5', '#C68E66'];
const HAIRS = ['#1E1A17', '#3B2618', '#6B4126', '#B5762E', '#E3C27A', '#2A2A2A', '#5A3A28', '#9A3B22'];

// look per job: top colour, accent, hat, extra, hair style/colour, beard, glasses, age lines
const LOOK = {
  worker:   { top: '#FFFFFF', acc: '#FFD21F', extra: 'apron' },
  ceo:      { top: '#1E2833', acc: '#C9A34A', extra: 'tie', hair: 'swept', hc: '#9EA3A8', beard: 'stubble', bc: '#8C9095', glasses: true, lines: true },
  captain:  { top: '#FFFFFF', acc: '#1E3550', hat: 'captain', extra: 'stripes', hair: 'short', hc: '#E9E6E0', beard: 'full', bc: '#F2EFEA', lines: true },
  mmarket:  { top: '#2C5A9E', acc: '#FFD21F', extra: 'badge', hair: 'bald', hc: '#3B2618', mustache: true, glasses: true },
  mcafe:    { top: '#3B2A20', acc: '#FFD21F', extra: 'apron', hair: 'bun', hc: '#1E1A17', earrings: true, lips: true },
  msite:    { top: '#F28C1E', acc: '#FFFFFF', hat: 'hard', extra: 'vest', beard: 'full', bc: '#5A3A28' },
  driver:   { top: '#FFD21F', acc: INK, hat: 'cap', extra: 'badge', hair: 'short', hc: '#2A2A2A', mustache: true },
  gardener: { top: '#5C8A3A', acc: '#E8C25A', hat: 'straw', extra: 'apron', hair: 'long', hc: '#B5762E', freckles: true },
};

export function cityAvatar(u, job = 'worker') {
  const h = hashU(u), r = (k) => (h >>> (k * 3)) & 7;
  const L = LOOK[job] || LOOK.worker, id = `a${h.toString(36)}${job}`;
  const SK = SKINS[r(1)];
  const style = L.hair || ['short', 'swept', 'curly', 'long', 'bun'][r(3) % 5];
  const HC = L.hc || HAIRS[r(2)];
  const hair = {
    short: `<path d="M31 44 Q33 24 50 23 Q67 24 69 44 Q62 32 50 32 Q38 32 31 44Z" fill="${HC}"/>`,
    swept: `<path d="M30 46 Q30 22 52 21 Q70 23 70 44 Q64 30 46 31 Q36 33 30 46Z" fill="${HC}"/><path d="M38 30 Q50 22 66 30" fill="none" stroke="${INK}" stroke-width="1" opacity=".35"/>`,
    curly: `<g fill="${HC}">${[[34, 34], [40, 27], [48, 24], [56, 25], [63, 29], [67, 37], [32, 42]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6.5"/>`).join('')}</g>`,
    long: `<path d="M29 50 Q28 20 50 19 Q72 20 71 50 L72 66 Q66 42 50 33 Q36 38 28 66Z" fill="${HC}"/>`,
    bun: `<path d="M31 44 Q33 25 50 24 Q67 25 69 44 Q62 33 50 33 Q38 33 31 44Z" fill="${HC}"/><circle cx="50" cy="19" r="8" fill="${HC}"/>`,
    bald: `<path d="M31 50 Q30 40 33 36 L35 48Z M69 50 Q70 40 67 36 L65 48Z" fill="${HC}"/>`,
  }[style];
  const beard = L.beard === 'full' ? `<path d="M32 50 Q33 70 50 72 Q67 70 68 50 Q64 62 50 63 Q36 62 32 50Z" fill="${L.bc}" stroke="${INK}" stroke-width="1.5"/>`
    : L.beard === 'stubble' ? `<path d="M34 54 Q36 68 50 69 Q64 68 66 54 Q60 62 50 62 Q40 62 34 54Z" fill="${L.bc}" opacity=".55"/>` : '';
  const hat = {
    captain: `<path d="M30 34 Q50 14 70 34 Z" fill="#FFFFFF" stroke="${INK}" stroke-width="2.5"/><rect x="28" y="32" width="44" height="6" rx="2" fill="#1E3550" stroke="${INK}" stroke-width="2.5"/><circle cx="50" cy="26" r="3.2" fill="#C9A34A"/>`,
    cap: `<path d="M31 37 Q32 20 50 20 Q68 20 69 37 Z" fill="${L.top}" stroke="${INK}" stroke-width="2.5"/><path d="M48 36 L77 37 L75 41 L48 40Z" fill="${L.top}" stroke="${INK}" stroke-width="2.5"/>`,
    hard: `<path d="M29 37 Q30 17 50 17 Q70 17 71 37 Z" fill="#FFD21F" stroke="${INK}" stroke-width="2.5"/><rect x="25" y="35" width="50" height="5" rx="2.5" fill="#FFD21F" stroke="${INK}" stroke-width="2.5"/><rect x="47" y="18" width="6" height="17" fill="#F2B705"/>`,
    straw: `<ellipse cx="50" cy="34" rx="31" ry="6" fill="#E8C25A" stroke="${INK}" stroke-width="2.5"/><path d="M36 34 Q37 18 50 18 Q63 18 64 34Z" fill="#E8C25A" stroke="${INK}" stroke-width="2.5"/><rect x="36" y="29" width="28" height="4" fill="#C4532E"/>`,
  }[L.hat] || '';
  const extra = {
    tie: `<path d="M41 72 L50 80 L59 72 L57 71 L50 77 L43 71Z" fill="#FFFFFF" stroke="${INK}" stroke-width="1.5"/><path d="M50 77 L46.5 82 L50 98 L53.5 82Z" fill="${L.acc}" stroke="${INK}" stroke-width="1.8"/>`,
    apron: `<path d="M38 80 L62 80 L64 104 L36 104Z" fill="${L.acc}" stroke="${INK}" stroke-width="2"/>`,
    stripes: `<rect x="23" y="86" width="9" height="3" fill="#C9A34A"/><rect x="68" y="86" width="9" height="3" fill="#C9A34A"/><circle cx="50" cy="84" r="1.6" fill="#C9A34A"/><circle cx="50" cy="92" r="1.6" fill="#C9A34A"/>`,
    badge: `<rect x="56" y="82" width="10" height="6" rx="1.5" fill="${L.acc}" stroke="${INK}" stroke-width="1.5"/>`,
    vest: `<path d="M36 76 L44 76 L44 104 L36 104Z M56 76 L64 76 L64 104 L56 104Z" fill="#E8F04A" stroke="${INK}" stroke-width="1.5"/>`,
  }[L.extra] || '';
  const eyes = L.glasses
    ? `<circle cx="43" cy="48" r="5.2" fill="#FFFFFF" fill-opacity=".35" stroke="${INK}" stroke-width="2"/><circle cx="57" cy="48" r="5.2" fill="#FFFFFF" fill-opacity=".35" stroke="${INK}" stroke-width="2"/><path d="M48 48 L52 48" stroke="${INK}" stroke-width="2"/><circle cx="43" cy="48" r="2" fill="${INK}"/><circle cx="57" cy="48" r="2" fill="${INK}"/>`
    : `<circle cx="43" cy="48" r="2.4" fill="${INK}"/><circle cx="57" cy="48" r="2.4" fill="${INK}"/>`;
  const brows = L.lines ? `<path d="M38 41 Q43 39 47 41 M53 41 Q57 39 62 41" fill="none" stroke="${L.hc || INK}" stroke-width="2.4" stroke-linecap="round"/>` : '';
  const mouth = L.beard === 'full' ? `<path d="M45 59 Q50 62 55 59" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`
    : `<path d="M44 57 Q50 62 56 57" fill="${L.lips ? '#C4532E' : 'none'}" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`;
  const must = L.mustache ? `<path d="M42 55 Q46 52 50 54 Q54 52 58 55 Q54 57 50 56 Q46 57 42 55Z" fill="${L.hc && style !== 'bald' ? L.hc : '#3B2618'}"/>` : '';
  const frk = L.freckles ? [[39, 54], [41, 56], [61, 54], [59, 56]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".9" fill="#B5762E"/>`).join('') : '';
  const ear = L.earrings ? `<circle cx="31" cy="54" r="2" fill="#FFD21F" stroke="${INK}" stroke-width="1"/><circle cx="69" cy="54" r="2" fill="#FFD21F" stroke="${INK}" stroke-width="1"/>` : '';
  const lines = L.lines ? `<path d="M35 52 Q37 55 36 58 M65 52 Q63 55 64 58" fill="none" stroke="${INK}" stroke-width="1" opacity=".35"/>` : '';
  const bg = job === 'ceo' ? '#FFE08A' : job === 'worker' ? '#FFF4C9' : '#FFF0B8';
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${job}"><clipPath id="${id}"><circle cx="50" cy="50" r="48"/></clipPath>
<circle cx="50" cy="50" r="48" fill="${bg}"/><g clip-path="url(#${id})">
<path d="M18 106 Q19 72 50 70 Q81 72 82 106Z" fill="${L.top}" stroke="${INK}" stroke-width="2.5"/>${extra}
<rect x="44" y="60" width="12" height="12" fill="${SK}" stroke="${INK}" stroke-width="2"/>
${style === 'long' ? hair : ''}<ellipse cx="50" cy="47" rx="19" ry="21" fill="${SK}" stroke="${INK}" stroke-width="2.5"/>${ear}${beard}${style !== 'long' ? hair : ''}
${brows}${eyes}${lines}${must}${mouth}${frk}
<circle cx="38" cy="55" r="3" fill="#F08A7A" opacity=".4"/><circle cx="62" cy="55" r="3" fill="#F08A7A" opacity=".4"/>${hat}</g>
<circle cx="50" cy="50" r="48" fill="none" stroke="${INK}" stroke-width="3"/></svg>`;
}

// the jobs: everyone starts as a worker at one of these places; the top job of each place is one person only
export const PLACES = [['cafe', 'Omnya Café'], ['market', 'Supermarket'], ['site', 'Building site'], ['marina', 'The Marina'], ['metro', 'Omnya Metro'], ['gardens', 'Omnyawood']];
export const TOP_JOBS = [
  { id: 'ceo', title: 'CEO · Omnya Tower', line: 'The top office, your name on the tower', price: '€3.99', was: '€39', only: 'THE ONLY ONE', gold: true, at: 'hq' },
  { id: 'captain', title: 'Captain', line: 'You drive the boats of the city', price: '€1.99', was: '€19', at: 'marina' },
  { id: 'mmarket', title: 'Supermarket manager', line: 'You run the supermarket', price: '€1.99', was: '€19', at: 'market' },
  { id: 'mcafe', title: 'Café manager', line: 'You run the café', price: '€1.99', was: '€19', at: 'cafe' },
  { id: 'msite', title: 'Site manager', line: 'You build the next tower', price: '€1.99', was: '€19', at: 'site' },
  { id: 'driver', title: 'Metro driver', line: 'You drive the yellow train', price: '€0.99', was: '€9', at: 'metro' },
  { id: 'gardener', title: 'Head gardener', line: 'The palms on the hill are yours', price: '€0.99', was: '€9', at: 'gardens' },
];
export const workplaceOf = (u) => PLACES[hashU(u) % PLACES.length];

// "right now": what the job is doing at this hour of the day (the viewer's clock)
const NOW = {
  cafe: ['asleep, the café opens at 6', 'grinding the first coffee', 'pulling espressos for the morning rush', 'serving lunch on the terrace', 'iced lattes for the afternoon', 'stacking the chairs, closing up'],
  market: ['asleep, the shop opens at 7', 'unloading the morning trucks', 'filling the shelves', 'at the till, lunch queue', 'restocking the fridges', 'counting the till'],
  site: ['asleep, the crane starts at 7', 'coffee before the shift', 'carrying bricks up floor 9', 'lunch on the scaffolding', 'pouring concrete', 'locking the gate'],
  marina: ['asleep on the boat', 'washing the decks', 'taking a boat out', 'lunch on the pier', 'mooring the yachts', 'watching the sunset from the bow'],
  metro: ['asleep, first train at 5', 'first train of the day', 'rush hour, every 3 minutes', 'cleaning the stations', 'the evening rush', 'last train home'],
  gardens: ['asleep under a palm', 'watering the hill', 'trimming the palms', 'lunch under the letters', 'planting new trees', 'lighting the garden lamps'],
  hq: ['asleep in the penthouse', 'first call of the day', 'running the board meeting', 'lunch on the roof', 'signing the big deals', 'still in the office, lights on'],
};
export function rightNow(at, d = new Date()) {
  const hr = d.getHours(), k = hr < 6 ? 0 : hr < 8 ? 1 : hr < 12 ? 2 : hr < 14 ? 3 : hr < 19 ? 4 : 5;
  return (NOW[at] || NOW.cafe)[k];
}
