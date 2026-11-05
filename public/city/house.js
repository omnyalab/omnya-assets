// /city/@username: one house on its lot, the camera turns around it (drag), the neighbours stay drawn around.
import { makeWorld, makeFrame, districtOf, seedOf, getJSON } from './world.js';

const $ = (id) => document.getElementById(id);
const raw = decodeURIComponent(location.pathname.split('/').filter(Boolean)[1] || '');
const u = raw.replace(/^@+/, '').toLowerCase();

const canvas = $('c');
const W = makeWorld(canvas);
const { THREE, renderer, scene, lots } = W;
const camera = new THREE.PerspectiveCamera(36, 1, 1, 9000);

const orbit = { x: 0, z: 0, az: 0.6, el: 0.42, d: matchMedia('(max-width: 899px)').matches ? 58 : 44 };
let spin = true, dirty = true;
function place() {
  const r = Math.cos(orbit.el) * orbit.d;
  camera.position.set(orbit.x + Math.sin(orbit.az) * r, 4 + Math.sin(orbit.el) * orbit.d, orbit.z + Math.cos(orbit.az) * r);
  camera.lookAt(orbit.x, 5, orbit.z);
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
  W.setHouses(all.houses || [[u, n]]);
  let L = lots[n - 1];
  if (!L) {
    // the city is full: the house waits in the new district, past the last street
    L = { x: W.ext.x + 60, z: 0, lw: 11, ld: 15, dist: 7, yaw: 0 };
    const g = W.city.makeHouse(null, seedOf(u), 7, 11);
    g.position.set(L.x, 0, L.z);
    scene.add(g);
  }
  orbit.x = L.x; orbit.z = L.z; orbit.az = L.yaw + 0.55;
  if (L.mega) orbit.d *= 1.3; // the downtown villas take two lots
  W.aimSun(new THREE.Vector3(L.x, 0, L.z), 90);
  W.setDetail(true);
  scene.add(makeFrame(THREE, L));
  place();

  document.title = `@${u}'s house in Omnya City`;
  $('name').textContent = '@' + u;
  $('num').textContent = '#' + n.toLocaleString('en');
  $('dist').textContent = lots[n - 1] ? districtOf(L.dist) : 'New district';
  $('nb').innerHTML = h.neighbour ? `<a href="/city/@${h.neighbour}">@${h.neighbour}</a>` : 'Still free';
  $('loading').hidden = true;
  $('found').hidden = false;
  $('offers').hidden = false;

  if (lots[n - 1] && L.dist <= 1) document.querySelector('[data-offer="downtown"]')?.remove(); // already downtown
  const ref = u.replace(/\./g, '-');
  for (const a of document.querySelectorAll('[data-offer]')) {
    if (a.dataset.stripe) {
      const url = new URL(a.href);
      url.searchParams.set('client_reference_id', ref);
      a.href = url.toString();
    } else {
      a.href = `${a.href.split('?')[0]}?text=${encodeURIComponent(`Hi Omnya! I'd like "${a.dataset.title}" for my house in Omnya City: @${u}, house #${n}.`)}`;
    }
  }

  $('share').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const url = `${location.origin}/city/@${u}`;
    const text = `I got a free house in Omnya City: house #${n}, ${districtOf(L.dist)}. Get yours before downtown is gone 🏠`;
    if (navigator.share) {
      try { await navigator.share({ title: 'My house in Omnya City', text, url }); } catch {}
      return;
    }
    try { await navigator.clipboard.writeText(`${text} ${url}`); btn.textContent = 'Link copied'; } catch {}
  });
}

function none() {
  $('loading').hidden = true;
  $('none-name').textContent = u ? '@' + u : 'Omnya City';
  $('none').hidden = false;
  orbit.x = 0; orbit.z = 0; orbit.d = 260; orbit.el = 0.7; place();
}

start().catch((e) => { console.error(e); none(); });
window.__house = { W, orbit, place };
