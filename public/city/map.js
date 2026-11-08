// /city: the map of Omnya City from above. ?k=TOKEN (from the Instagram DM) shows the locked
// username and "Reserve my spot"; without it, "I already have a house" finds a house by name.
import { makeWorld, makePin, placeName, getJSON, makeGoldLabel } from './world.js';

const $ = (id) => document.getElementById(id);
const canvas = $('c');
const W = makeWorld(canvas);
const { THREE, renderer, scene, lots } = W;
const camera = new THREE.PerspectiveCamera(38, 1, 2, 9000);

// ---------- camera: pan with one finger, zoom with two (or the wheel) ----------
const mobile = matchMedia('(max-width: 899px)').matches;
const EL = 0.98; // elevation (rad), the reel's top-down look
// 8/11 (Nico: the map opens on everything): on phones the camera looks from the west, so the long city fits a tall screen
const AZ = mobile ? -1.82 : -0.28;
// 8/11: the map opens on the whole city (old town, Omnyawood, The Residences, the sea, the yacht and the island)
const ALL = mobile ? { x: -380, z: 170, d: 2600 } : { x: -170, z: 140, d: 1650 };
const view = { ...ALL };
const lim = () => ({ x: 1050, z: (W.ext.zn || W.ext.z) * 0.95 + 160, zs: 560 }); // 7/11: down to the sea, the yacht and the island // Ep.2: Omnyawood to the east, The Residences to the west
let anim = null, dirty = true;
function place() {
  const L = lim();
  view.x = Math.max(-L.x, Math.min(L.x, view.x));
  view.z = Math.max(-L.z, Math.min(L.zs, view.z));
  view.d = Math.max(45, Math.min(3000, view.d));
  const h = Math.sin(EL) * view.d, r = Math.cos(EL) * view.d;
  camera.position.set(view.x + Math.sin(AZ) * r, h, view.z + Math.cos(AZ) * r);
  camera.lookAt(view.x, 0, view.z);
  W.setDetail(h < 230);
  W.aimSun(new THREE.Vector3(view.x, 0, view.z), Math.min(900, 80 + view.d * 0.75));
  scene.fog.near = 700 + h * 1.5; scene.fog.far = 3800 + h * 4;
  dirty = true;
}
function flyTo(x, z, d, ms = 1600) {
  const a = { ...view }, t0 = performance.now();
  anim = (now) => {
    const k = Math.min(1, (now - t0) / ms), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    view.x = a.x + (x - a.x) * e; view.z = a.z + (z - a.z) * e;
    view.d = a.d + (d - a.d) * e + Math.sin(Math.PI * e) * Math.min(260, Math.hypot(x - a.x, z - a.z) * 0.35);
    place();
    if (k >= 1) anim = null;
  };
}

const ptrs = new Map();
let moved = 0, pinch = null;
const ground = (cx, cy) => {
  const r = canvas.getBoundingClientRect();
  const v = new THREE.Vector3(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1, 0.5).unproject(camera).sub(camera.position).normalize();
  const t = -camera.position.y / v.y;
  return t > 0 ? camera.position.clone().addScaledVector(v, t) : null;
};
canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  moved = 0; anim = null;
  if (ptrs.size === 2) { const [p, q] = [...ptrs.values()]; pinch = { dist: Math.hypot(p.x - q.x, p.y - q.y), d: view.d }; }
});
canvas.addEventListener('pointermove', (e) => {
  const prev = ptrs.get(e.pointerId);
  if (!prev) return;
  const cur = { x: e.clientX, y: e.clientY };
  if (ptrs.size === 1) {
    const a = ground(prev.x, prev.y), b = ground(cur.x, cur.y);
    if (a && b) { view.x += a.x - b.x; view.z += a.z - b.z; place(); }
    moved += Math.hypot(cur.x - prev.x, cur.y - prev.y);
  }
  ptrs.set(e.pointerId, cur);
  if (ptrs.size === 2 && pinch) {
    const [p, q] = [...ptrs.values()];
    view.d = pinch.d * (pinch.dist / Math.max(10, Math.hypot(p.x - q.x, p.y - q.y)));
    moved = 99; place();
  }
});
const up = (e) => {
  const was = ptrs.has(e.pointerId);
  ptrs.delete(e.pointerId);
  if (ptrs.size < 2) pinch = null;
  if (was && ptrs.size === 0 && moved < 6) tap(e.clientX, e.clientY);
};
canvas.addEventListener('pointerup', up);
canvas.addEventListener('pointercancel', (e) => { ptrs.delete(e.pointerId); pinch = null; });
canvas.addEventListener('wheel', (e) => { e.preventDefault(); anim = null; view.d *= Math.exp(e.deltaY * 0.0012); place(); }, { passive: false });

// ---------- houses ----------
let houses = [];           // [[username, house number], …]
let ep2 = null;            // the first house of Ep.2 (from the API): from there on, new places
const owner = new Map();   // place → { u, n }
const at = (n) => W.placeOf(n, ep2);
const pin = makePin(THREE); pin.visible = false; scene.add(pin);
// 7/11: the yacht and the island, one of each, sold by auction: a gold name always on screen over each of them
const gold = {};
for (const [item, P, y] of [['yacht', W.yachtAt, 30], ['island', W.islandAt, 34]]) {
  if (!P) continue;
  const sp = makeGoldLabel(THREE, `${item === 'yacht' ? 'YACHT' : 'ISLAND'} OF ???`, 'tap to view');
  sp.scale.multiplyScalar(mobile ? .42 : .3); sp.center.set(.5, -.25); sp.position.set(P.x, y, P.z); scene.add(sp); gold[item] = sp;
}
// Part 3 (8/11): the places where people work, a name over each (only when the jobs are on)
const J = W.jobsAt || {};
for (const [k, t, sub] of [['hq', 'OMNYA TOWER HQ', '10 offices · be the CEO'], ['market', 'SUPERMARKET', 'because you asked'], ['cafe', 'OMNYA CAFÉ', 'dishwasher wanted'], ['station', 'OMNYA METRO', 'central station'], ['site', 'BUILDING SITE', 'builders wanted']]) {
  const P = J[k]; if (!P) continue;
  const sp = makeGoldLabel(THREE, t, sub); sp.scale.multiplyScalar(mobile ? .42 : .3); sp.center.set(.5, -.25); sp.position.set(P.x, P.y, P.z); scene.add(sp);
}
function auctionsDraw(a = {}) {
  for (const item of ['yacht', 'island']) {
    const A = a[item] || {}, word = item === 'yacht' ? 'Yacht' : 'Island';
    const who = A.winner ? '@' + A.winner.toUpperCase() : '???';
    gold[item]?.set(`${word.toUpperCase()} OF ${who}`, A.winner ? '' : A.leader ? `bid €${(A.bid / 100).toFixed(2)} · tap to view` : 'tap to view');
    const el = $(`go-${item}`);
    if (el) el.querySelector('b').textContent = `${word} of ${A.winner ? '@' + A.winner : '???'}`;
  }
  dirty = true;
}
let mine = null;

function draw(list, e2 = ep2) {
  houses = list; ep2 = e2 || null;
  owner.clear();
  for (const [u, n] of list) { const P = at(n); if (P) owner.set(P, { u, n }); }
  W.setHouses(list, ep2);
  // 8/11 (Nico): the counter at the top is gone
  if ($('count')) $('count').textContent = list.length ? `${list.length.toLocaleString('en')} ${list.length === 1 ? 'house' : 'houses'} · next: ${placeName(at(Math.max(0, ...list.map((h) => h[1])) + 1))}` : 'House #1 is still empty';
  dirty = true;
}

const chip = $('chip');
let chipLot = null;
function tap(cx, cy) {
  const g = ground(cx, cy);
  const L = g && W.lotAt(g.x, g.z);
  if (L && (L.yacht || L.island)) { location.href = `/city/${L.yacht ? 'yacht' : 'island'}`; return; }
  if (!L) { chip.hidden = true; chipLot = null; return; }
  const o = owner.get(L);
  chipLot = L;
  chip.innerHTML = o
    ? `<a href="/city/@${o.u}"><b>@${o.u}</b><span>House #${o.n} · ${placeName(L)}</span><i>View →</i></a>`
    : `<div><b>${L.town ? 'A townhouse on the water' : L.sea ? 'A seafront villa' : L.pent ? 'A penthouse' : L.hills ? (L.premium ? 'A top villa in Omnyawood' : 'A villa in Omnyawood') : `Lot #${L.n}`}</b><span>${L.town ? 'for sale on any house page · €0.99' : L.sea ? 'for sale on any house page · €2.99' : L.premium ? 'for sale on any house page · €0.99' : L.floor || L.hills ? 'for the next followers' : `${placeName(L)} · still free`}</span></div>`;
  chip.hidden = false;
  placeChip();
}
function placeChip() {
  if (!chipLot || chip.hidden) return;
  const v = new THREE.Vector3(chipLot.x, (chipLot.y || 0) + (chipLot.floor ? 8 : 14), chipLot.z).project(camera);
  const r = canvas.getBoundingClientRect();
  chip.style.transform = `translate(${((v.x + 1) / 2) * r.width}px, ${((1 - v.y) / 2) * r.height}px) translate(-50%, -100%)`;
}

// name labels over the houses near the middle of the view, when close enough to read them
const labels = $('labels');
const pool = [];
function placeLabels() {
  const show = view.d < 330;
  let k = 0;
  if (show) {
    const r = canvas.getBoundingClientRect();
    const near = houses.map(([u, n]) => [u, at(n)]).filter(([, L]) => L && Math.abs(L.x - view.x) < view.d * 0.7 && Math.abs(L.z - view.z) < view.d * 0.9)
      .sort((a, b) => (b[0] === mine) - (a[0] === mine) || Math.hypot(a[1].x - view.x, a[1].z - view.z) - Math.hypot(b[1].x - view.x, b[1].z - view.z));
    for (const [u, L] of near.slice(0, 60)) {
      const v = new THREE.Vector3(L.x, (L.y || 0) + (L.floor ? 4 : 12), L.z).project(camera);
      if (v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) continue;
      const el = pool[k] || (pool[k] = labels.appendChild(document.createElement('span')));
      el.textContent = '@' + u;
      el.className = u === mine ? 'me' : '';
      el.style.transform = `translate(${((v.x + 1) / 2) * r.width}px, ${((1 - v.y) / 2) * r.height}px) translate(-50%, -100%)`;
      el.hidden = false;
      k++;
    }
  }
  for (; k < pool.length; k++) pool[k].hidden = true;
}

// ---------- the sheet ----------
const sheet = $('sheet');
const show = (id) => { for (const s of sheet.querySelectorAll('[data-s]')) s.hidden = s.dataset.s !== id; sheet.hidden = false; };
const params = new URLSearchParams(location.search);
const k = params.get('k');

function landOn(house) {
  const L = at(house.n);
  mine = house.u;
  $('home-name').textContent = '@' + house.u;
  $('home-lot').textContent = `House #${house.n} · ${placeName(L)}`;
  $('home-go').href = `/city/@${house.u}`;
  show('home');
  if (L) { pin.position.set(L.x, (L.y || 0) + (L.floor ? 8 : 0), L.z); pin.visible = true; flyTo(L.x, L.z + (mobile ? 38 : 0), mobile ? 190 : 160, 2200); }
}

async function start() {
  const [h] = await Promise.all([getJSON('/api/city/houses'), k ? null : Promise.resolve()]);
  draw(h.houses || [], h.ep2);
  auctionsDraw(h.auctions);
  if (!k) return show('find');
  const p = await getJSON(`/api/city/peek?k=${encodeURIComponent(k)}`);
  if (p.house) return landOn(p.house);
  if (!p.ok) { $('find-note').textContent = 'This link was already used. Search your name below.'; return show('find'); }
  $('me-name').textContent = '@' + p.u;
  // 8/11: only the free houses count (the bought places start at 100,000: "next" said "Townhouse on the water")
  const next = (Math.max(0, ...houses.map((x) => x[1]).filter((n) => n < 100000)) + 1);
  const L = at(next);
  $('me-next').textContent = L ? `Next up: ${L.floor || L.hills ? '' : `lot #${next.toLocaleString('en')} in `}${placeName(L)}.` : '';
  show('reserve');
}

$('reserve').addEventListener('click', async (e) => {
  const b = e.currentTarget;
  b.disabled = true; b.textContent = 'Building your house…';
  const r = await getJSON('/api/city/reserve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ k }) });
  if (r.house) {
    history.replaceState(null, '', '/city');
    const h = await getJSON('/api/city/houses');
    draw(h.houses && h.houses.some((x) => x[0] === r.house.u) ? h.houses : [...houses, [r.house.u, r.house.n]], h.ep2 || r.ep2 || ep2);
    return landOn(r.house);
  }
  b.disabled = false; b.textContent = 'Reserve my spot';
  $('find-note').textContent = r.status === 410 ? 'This link was already used. Search your name below.' : 'Something went wrong, try again in a moment.';
  show('find');
});

$('find').addEventListener('submit', async (e) => {
  e.preventDefault();
  const u = $('find-u').value.trim().replace(/^@+/, '').toLowerCase();
  if (!u) return;
  const r = await getJSON(`/api/city/house?u=${encodeURIComponent(u)}`);
  if (r.house) location.href = `/city/@${r.house.u}`;
  else $('find-note').textContent = `No house for @${u} yet. Comment HOUSE under our reel to get your link.`;
});

// ---------- loop ----------
function resize() { W.resize(camera); dirty = true; }
addEventListener('resize', resize);
resize();
view.d *= 1.15; place();
flyTo(ALL.x, ALL.z, ALL.d, 2200);
function frame(now) {
  if (anim) anim(now);
  if (pin.visible) { pin.children[0].position.y = 26 + Math.sin(now / 300) * 1.5; pin.rotation.y = now / 900; dirty = true; }
  if (dirty) { renderer.render(scene, camera); placeLabels(); placeChip(); dirty = false; }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
document.documentElement.classList.add('ready');
window.__readyAt = performance.now();
start().catch((e) => { console.error(e); show('find'); });
window.__city = { W, view, place, flyTo, lots };
