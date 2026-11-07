// /city/yacht and /city/island (7/11/2026): the 3D view turns around the only yacht / the only island, the card runs the auction.
import { makeWorld, makeGoldLabel, getJSON } from './world.js';

const $ = (id) => document.getElementById(id);
const seg = location.pathname.split('/').filter(Boolean).pop();
const item = ['yacht', 'island'].includes(seg) ? seg : new URLSearchParams(location.search).get('i') === 'island' ? 'island' : 'yacht';
const WORD = item === 'yacht' ? 'YACHT' : 'ISLAND';
const mobile = matchMedia('(max-width: 899px)').matches;

const canvas = $('c');
const W = makeWorld(canvas);
const { THREE, renderer, scene } = W;
const camera = new THREE.PerspectiveCamera(36, 1, 1, 9000);
const P = item === 'yacht' ? W.yachtAt : W.islandAt;
const orbit = { az: 0.6, el: item === 'yacht' ? 0.5 : 0.55, d: item === 'yacht' ? (mobile ? 230 : 170) : (mobile ? 300 : 230) };
const label = makeGoldLabel(THREE, `${WORD} OF ???`);
label.position.set(P.x, item === 'yacht' ? 30 : 36, P.z);
// 7/11 (Nico, phone): no gold sign over the 3D here, the card already has the name; it covered the top buttons
label.visible = false;
let dirty = true, spin = true, drag = null;
function place() {
  const r = Math.cos(orbit.el) * orbit.d;
  // phones: the card covers the bottom, so the object sits higher in the frame
  camera.position.set(P.x + Math.sin(orbit.az) * r, Math.sin(orbit.el) * orbit.d, P.z + Math.cos(orbit.az) * r);
  camera.lookAt(P.x, 6, P.z);
  dirty = true;
}
canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, az: orbit.az }; spin = false; });
addEventListener('pointermove', (e) => { if (drag) { orbit.az = drag.az - (e.clientX - drag.x) * 0.008; place(); } });
addEventListener('pointerup', () => (drag = null));
// the card covers the lower part of the screen: the object is drawn in the upper part
function resize() { W.resize(camera); const w = canvas.clientWidth, h = canvas.clientHeight, card = $('card').getBoundingClientRect().height; camera.setViewOffset(w, h, 0, Math.min(h * .3, card * .5), w, h); dirty = true; }
addEventListener('resize', resize);
resize();
W.aimSun(new THREE.Vector3(P.x, 0, P.z), 140);
W.setDetail(true);
place();
function frame(now) {
  if (spin && now > 20000) spin = false;
  if (spin) { orbit.az += 0.002; place(); }
  if (dirty) { renderer.render(scene, camera); dirty = false; }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---------- the auction ----------
const eur = (c) => `€${(c / 100).toFixed(2)}`;
$('line').textContent = item === 'yacht'
  ? 'The only yacht in the city, at anchor in the open sea, with a helipad and a pool. Win it and it takes your name.'
  : 'A villa alone on its own island, a helipad, and you get there only by boat. The only one. Win it and it takes your name.';
let A = null, offset = 0, min = 399;
const amt = $('amt');
const setAmt = (c) => { amt.value = (Math.max(min, c) / 100).toFixed(2); $('go').textContent = `Bid ${eur(Math.max(min, c))}`; };
const cents = () => Math.round(parseFloat(String(amt.value).replace(',', '.')) * 100) || 0;
$('minus').onclick = () => setAmt(cents() - 100);
$('plus').onclick = () => setAmt(cents() + 100);
amt.addEventListener('input', () => { $('go').textContent = `Bid ${eur(Math.max(min, cents()))}`; });
try { const saved = localStorage.getItem('city-u'); if (saved) $('u').value = saved; } catch {}

function show() {
  if (!A) return;
  const who = A.winner ? '@' + A.winner.toUpperCase() : '???';
  $('title').textContent = `${WORD} OF ${who}`;
  label.set(`${WORD} OF ${who}`); dirty = true;
  document.title = `${item === 'yacht' ? 'Yacht' : 'Island'} of ${A.winner ? '@' + A.winner : '???'} · Omnya City`;
  const first = min === 399 && !A.leader;
  min = A.min;
  if (cents() < min || first) setAmt(min);
  $('bidlab').textContent = A.leader ? 'Top bid' : 'Starting bid';
  $('bid').textContent = eur(A.leader ? A.bid : A.min);
  $('lead').innerHTML = A.done ? `Sold to <b>@${A.winner}</b> for ${eur(A.bid)}.` : A.leader ? `<b>@${A.leader}</b> is winning. Next bid from ${eur(A.min)}.` : 'The 12-hour timer starts with the first bid.';
  $('f').hidden = !!A.done;
  $('bids').innerHTML = (A.bids || []).map((b, i) => `<li${i === 0 ? ' class="top"' : ''}><span>@${b.u}</span><b>${eur(b.amt)}</b></li>`).join('');
  tick();
}
function tick() {
  if (!A) return;
  if (!A.end) { $('left').textContent = '12:00:00'; return; }
  const ms = Math.max(0, A.end - (Date.now() + offset)), s = Math.floor(ms / 1000);
  $('left').textContent = A.done || !ms ? 'Ended' : [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map((v) => String(v).padStart(2, '0')).join(':');
}
setInterval(tick, 1000);
async function load() {
  const r = await getJSON('/api/city/auction');
  if (r.now) offset = r.now - Date.now();
  if (r.auctions) { A = r.auctions[item]; show(); }
}
load();
setInterval(load, 8000);
if (new URLSearchParams(location.search).get('bid') === 'ok') {
  $('note').textContent = 'Your bid is in. If it is still the top one when the timer ends, it is yours.';
  history.replaceState(null, '', location.pathname);
}

$('f').addEventListener('submit', async (e) => {
  e.preventDefault();
  const u = $('u').value.trim().replace(/^@+/, '').toLowerCase();
  if (!u) { $('note').textContent = 'Write your Instagram username first.'; return $('u').focus(); }
  const c = cents();
  if (c < min) { setAmt(min); $('note').textContent = `The next bid starts at ${eur(min)}.`; return; }
  try { localStorage.setItem('city-u', u); } catch {}
  $('go').disabled = true; $('go').textContent = 'Opening…';
  const r = await getJSON('/api/city/bid', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item, u, amount: c / 100 }) });
  if (r.url) { location.href = r.url; return; }
  $('go').disabled = false; setAmt(r.min || c);
  $('note').innerHTML = r.error === 'nohouse' ? `No house for @${u} yet. Comment <b>HOUSE</b> under our reel on Instagram to get yours first.`
    : r.error === 'low' ? `Someone just bid more. The next bid starts at ${eur(r.min)}.`
    : r.error === 'ended' ? 'This auction has ended.' : 'Something went wrong, try again in a moment.';
  load();
});
document.documentElement.classList.add('ready');
