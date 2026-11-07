// /city/@username: one house on its lot, the camera turns around it (drag), the neighbours stay drawn around.
import { makeWorld, makeFrame, placeName, seedOf, getJSON } from './world.js';

const $ = (id) => document.getElementById(id);
const raw = decodeURIComponent(location.pathname.split('/').filter(Boolean)[1] || '');
const u = raw.replace(/^@+/, '').toLowerCase();

const canvas = $('c');
const W = makeWorld(canvas);
const { THREE, renderer, scene, lots } = W;
const camera = new THREE.PerspectiveCamera(36, 1, 1, 9000);

const orbit = { x: 0, y: 0, z: 0, az: 0.6, el: 0.42, d: matchMedia('(max-width: 899px)').matches ? 58 : 44 };
let spin = true, dirty = true;
function place() {
  const r = Math.cos(orbit.el) * orbit.d;
  camera.position.set(orbit.x + Math.sin(orbit.az) * r, orbit.y + 4 + Math.sin(orbit.el) * orbit.d, orbit.z + Math.cos(orbit.az) * r);
  camera.lookAt(orbit.x, orbit.y + 5, orbit.z);
  dirty = true;
}

// drag sideways to turn, up/down to tilt; the page still scrolls vertically on phones (touch-action: pan-y)
let drag = null;
canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, az: orbit.az, el: orbit.el }; spin = false; $('hint').hidden = true; });
addEventListener('pointermove', (e) => {
  if (!drag) return;
  orbit.az = drag.az - (e.clientX - drag.x) * 0.008;
  if (e.pointerType === 'mouse') orbit.el = Math.max(0.12, Math.min(1.25, drag.el + (e.clientY - drag.y) * 0.005));
  place();
});
addEventListener('pointerup', () => (drag = null));
addEventListener('pointercancel', () => (drag = null));

function resize() { W.resize(camera); dirty = true; }
addEventListener('resize', resize);
resize();
place();

function frame(now) {
  if (spin && now > 15000) spin = false; // stop turning by itself after 15 s: the phone stops drawing frames
  if (spin) { orbit.az += 0.0025; place(); }
  if (dirty) { renderer.render(scene, camera); dirty = false; }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

async function start() {
  if (!u) return none();
  const [h, all] = await Promise.all([getJSON(`/api/city/house?u=${encodeURIComponent(u)}`), getJSON('/api/city/houses')]);
  if (!h.house) return none();
  const { n } = h.house;
  W.setHouses(all.houses || [[u, n]], all.ep2);
  let L = W.placeOf(n, all.ep2);
  if (!L) {
    // the city is full: the house waits in the new district, past the last street
    L = { x: W.ext.x + 60, z: 0, lw: 11, ld: 15, dist: 7, yaw: 0 };
    const g = W.city.makeHouse(null, seedOf(u), 7, 11);
    g.position.set(L.x, 0, L.z);
    scene.add(g);
  }
  orbit.x = L.x; orbit.z = L.z; orbit.y = L.y || 0; orbit.az = L.yaw + 0.55;
  if (L.floor) { orbit.d *= 2.4; orbit.el = 0.18; } // a floor of The Residences: the tower, the floor in yellow
  if (L.mega) orbit.d *= 1.3; // the downtown villas take two lots
  W.aimSun(new THREE.Vector3(L.x, 0, L.z), 90);
  W.setDetail(true);
  const fr = makeFrame(THREE, L); fr.position.y = (L.y || 0) + (L.floor ? -1.5 : 0); scene.add(fr);
  place();

  document.title = `@${u}'s house in Omnya City`;
  $('name').textContent = '@' + u;
  $('num').textContent = '#' + n.toLocaleString('en');
  $('dist').textContent = placeName(W.placeOf(n, all.ep2));
  $('nb').innerHTML = h.neighbour ? `<a href="/city/@${h.neighbour}">@${h.neighbour}</a>` : 'Still free';
  $('loading').hidden = true;
  $('found').hidden = false;
  ready();

  // 7/11 upsell (board approved by Nico): MOVE UP opens the place picker, only with what is still for sale
  const sale = all.forSale || {};
  const left = sale.left || {};
  const mine = { penthouse: !!L.pent, villa: !!(L.hills && L.premium), fountain: !L.floor && !L.hills && !L.town && !L.sea && n <= 8, town: !!L.town, sea: !!L.sea, sky: !!L.pent };
  const open = Object.fromEntries(['fountain', 'sky', 'villa', 'town', 'sea', 'penthouse'].map((k) => [k, !!sale[k] && !mine[k] && (left[k] ?? 1) > 0]));
  const auc = all.auctions || {};
  for (const k of ['yacht', 'island']) open[k] = !!auc[k] && !auc[k].done; // 7/11: one of each, by auction (only "View")
  const where = `#${n.toLocaleString('en')} in ${placeName(L)}`;
  document.querySelectorAll('[data-where]').forEach((e) => (e.textContent = where));
  document.querySelectorAll('[data-where-kick]').forEach((e) => (e.textContent = `Your house · #${n.toLocaleString('en')} · ${placeName(L)}`));
  const ref = u.replace(/\./g, '-');
  const tr = sale.tranche || {};
  for (const k of Object.keys(open)) {
    // 7/11 (Nico): townhouses in tranches of 6/6/8: the first only "Only n left", then "Only n remaining out of 12",
    // the last "Only n remaining out of 20 · they're going fast"; seafront villas 2 at a time
    const T = tr[k];
    const nLeft = T ? T.left : left[k];
    const txt = !nLeft || (T && k === 'town' && T.no === 1) ? '' : T && k === 'town' && T.no > 1 ? `Only ${nLeft} remaining out of ${T.upTo}${T.no === 3 ? ' · going fast' : ''}` : `Only ${nLeft} left`;
    // Nico 7/11: the bars look almost full on purpose
    const bar = nLeft ? Math.max(84, 100 - nLeft * 1.5) : 100;
    document.querySelectorAll(`[data-left="${k}"]`).forEach((e) => (e.textContent = txt));
    document.querySelectorAll(`[data-bar="${k}"]`).forEach((e) => (e.style.width = bar + '%'));
    document.querySelectorAll(`[data-left-tag="${k}"]`).forEach((e) => (txt ? (e.textContent = txt) : e.remove()));
    document.querySelectorAll(`[data-left-line="${k}"]`).forEach((e) => (e.textContent = !['penthouse', 'sky', 'town', 'sea', 'fountain'].includes(k) && nLeft && !(T && k === 'town' && T.no > 1) ? ` · only ${nLeft} left` : ''));
    if (k === 'yacht' || k === 'island') { const A = auc[k] || {}; const t = A.leader ? `Top bid €${(A.bid / 100).toFixed(2)}` : 'Starts at €3.99';
      document.querySelectorAll(`[data-left-line="${k}"]`).forEach((e) => (e.textContent = ` · ${t}`)); }
    if (!open[k]) document.querySelectorAll(`[data-place="${k}"]`).forEach((e) => e.remove());
  }
  for (const l of document.querySelectorAll('#move label')) {
    if (l.dataset.buy) l.dataset.href = `${l.dataset.href}&u=${encodeURIComponent(u)}`;
    else if (l.dataset.href.startsWith('/city/')) continue; // yacht and island: their page
    else if (l.dataset.stripe) { const x = new URL(l.dataset.href); x.searchParams.set('client_reference_id', ref); l.dataset.href = x.toString(); }
    else l.dataset.href = `${l.dataset.href.split('?')[0]}?text=${encodeURIComponent(`Hi Omnya! I'd like "${l.dataset.title}" for my house in Omnya City: @${u}, house #${n}.`)}`;
  }
  const any = Object.values(open).some(Boolean);
  if (any) {
    $('up').hidden = false;
    const first = document.querySelector('#move label');
    if (first) pickPlace(first);
  } else {
    document.querySelectorAll('[data-up]').forEach((e) => e.remove()); // nothing left to buy: no MOVE UP
  }
  document.querySelector('.three')?.style.setProperty('--n', document.querySelectorAll('.three .pl').length);

  $('share').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const url = `${location.origin}/city/@${u}`;
    const text = `I got a free house in Omnya City: house #${n}, ${placeName(L)}. Get yours before the penthouse floors are gone 🏠`;
    if (navigator.share) {
      try { await navigator.share({ title: 'My house in Omnya City', text, url }); } catch {}
      return;
    }
    try { await navigator.clipboard.writeText(`${text} ${url}`); btn.textContent = 'Link copied'; } catch {}
  });
}

function none() {
  ready();
  $('loading').hidden = true;
  $('none-name').textContent = u ? '@' + u : 'Omnya City';
  $('none').hidden = false;
  orbit.x = 0; orbit.z = 0; orbit.d = 260; orbit.el = 0.7; place();
}

// the page fades in once the house is found (no loading screen, 7/11)
function ready() { requestAnimationFrame(() => document.body.classList.replace('wait', 'in')); }
setTimeout(ready, 4000); // never stay hidden

// ---- dialogs: MOVE UP (places) and the book (Full City / Everything) ----
function pickPlace(l) {
  document.querySelectorAll('#move label').forEach((x) => x.classList.toggle('on', x === l));
  $('shot').style.backgroundImage = `url(${l.dataset.img})`;
  $('shotname').textContent = l.dataset.name;
  $('movego').href = l.dataset.href;
  $('movego').textContent = l.dataset.btn || 'Move my house · €0.99';
  $('movego').target = l.dataset.stripe ? '_blank' : '';
}
let lastFocus = null;
function openDialog(id, pick) {
  lastFocus = document.activeElement;
  document.querySelectorAll('.ux.dim').forEach((d) => (d.hidden = d.id !== id));
  document.documentElement.classList.add('locked');
  if (pick) { const l = document.querySelector(`#move label[data-place="${pick}"]`); if (l) pickPlace(l); }
  $(id).querySelector('.x')?.focus({ preventScroll: true });
}
function closeDialog() {
  document.querySelectorAll('.ux.dim').forEach((d) => (d.hidden = true));
  document.documentElement.classList.remove('locked');
  lastFocus?.focus?.({ preventScroll: true });
}
document.addEventListener('click', (e) => {
  const v = e.target.closest('[data-view]');
  if (v) { e.preventDefault(); location.href = v.dataset.view; return; }
  const o = e.target.closest('[data-open]');
  if (o) { e.preventDefault(); return openDialog(o.dataset.open, o.dataset.pick); }
  if (e.target.closest('[data-close]') || e.target.classList.contains('dim')) { e.preventDefault(); return closeDialog(); }
  const l = e.target.closest('.pick label');
  if (!l) return;
  const g = l.closest('.pick');
  if (g.dataset.g === 'move') return pickPlace(l);
  g.querySelectorAll('label').forEach((x) => x.classList.toggle('on', x === l));
  const go = g.parentElement.querySelector('.bookgo');
  if (go) { go.href = l.dataset.go; go.textContent = `Get it · €${l.dataset.p}`; }
});
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDialog(); });

// After Sunday 8 November (Rome) the Full City Guide is €19 (same switch as the funnels)
if (Date.now() >= Date.parse(window.__cityDeal || '2026-11-08T23:59:59+01:00')) {
  document.querySelectorAll('label[data-p="1.99"]').forEach((l) => { l.dataset.p = '19'; l.querySelector('[data-full]').innerHTML = '€19'; });
  document.querySelectorAll('.bookgo').forEach((g) => (g.textContent = 'Get it · €19'));
  document.querySelectorAll('[data-kick]').forEach((k) => (k.textContent = 'The full guide'));
}

start().catch((e) => { console.error(e); none(); });
window.__house = { W, orbit, place };
