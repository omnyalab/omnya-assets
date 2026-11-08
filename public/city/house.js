// /city/@username: one house on its lot, the camera turns around it (drag), the neighbours stay drawn around.
import { makeWorld, makeFrame, placeName, seedOf, getJSON } from './world.js';
import { cityAvatar, TOP_JOBS, workplaceOf, rightNow, LOOK_OPTS, parseLook, lookCode, defaultLook } from './avatar.js';

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
  // 8/11: a bought place shows its number among its kind (#3 of the top villas), not the inner 100,012
  const R = [[100000, 3], [100003, 10], [100013, 20], [100033, 10], [100043, 8]].find(([a, k]) => n >= a && n < a + k);
  const shown = R ? n - R[0] + 1 : n;
  $('num').textContent = '#' + shown.toLocaleString('en');
  $('dist').textContent = placeName(W.placeOf(n, all.ep2));

  // 8/11 Part 3: the character (its look comes from the job) and the job line with what it is doing right now
  const job = h.job || null, T = TOP_JOBS.find((t) => t.id === job);
  // 8/11 (Nico): the job takes the neighbour's box; the line under it changes the character (€0.99 at save)
  const look = h.look || null, myJob = job || 'worker'; window.__look = look;
  $('av').innerHTML = cityAvatar(u, myJob, look);
  const wp = workplaceOf(u);
  $('jobt').textContent = T ? T.title.split(' · ')[0] : 'Worker';
  $('jobwhere').textContent = T ? (T.title.split(' · ')[1] || '') : wp[1];
  fitOne($('jobt')); addEventListener('resize', () => fitOne($('jobt')));
  $('jobnow').textContent = `right now: ${rightNow(T ? T.at : wp[0])}`;
  const peek = [[2, 4, 3, 2, 1], [5, 3, 0, 0, 0], [1, 1, 4, 1, 0]].map(([s2, h2, c2, b2, g2]) => cityAvatar(u + s2, myJob, { s: s2, h: h2, c: c2, b: b2, g: g2 }));
  $('avs').innerHTML = peek.map((v) => `<i>${v}</i>`).join('');
  $('charline').hidden = false;
  // the look editor
  const cur = parseLook(look) || defaultLook(u);
  const ROWS = [['s', 'Skin'], ['h', 'Hair'], ['c', 'Hair colour'], ['b', 'Beard'], ['g', 'Glasses']];
  const drawLook = () => {
    $('lookav').innerHTML = cityAvatar(u, myJob, cur);
    $('lookopts').innerHTML = ROWS.map(([k, name]) => `<div class="lrow"><small>${name}</small><div>${LOOK_OPTS[k].map((v, i) => {
      const prev = k === 's' || k === 'c' ? `<i style="background:${v}"></i>` : `<span>${cityAvatar(u, myJob, { ...cur, [k]: i })}</span>`;
      return `<button type="button" class="${cur[k] === i ? 'on' : ''}" data-lk="${k}" data-lv="${i}" aria-label="${name} ${i + 1}">${prev}</button>`; }).join('')}</div></div>`).join('');
    const same = look && lookCode(cur) === look;
    $('lookgo').href = same ? '#' : `/api/city/buy?kind=look&u=${encodeURIComponent(u)}&look=${lookCode(cur)}`;
    $('lookgo').textContent = same ? 'This is your character' : 'Save my character · €0.99';
  };
  drawLook();
  $('lookopts').addEventListener('click', (e) => { const b = e.target.closest('[data-lk]'); if (!b) return; cur[b.dataset.lk] = +b.dataset.lv; drawLook(); });
  // the jobs in the "Get a top spot" section, under the Jobs tab
  const tops0 = (all.forSale && all.forSale.jobs) || {};
  $('jobcards').innerHTML = TOP_JOBS.map((t) => { const who = tops0[t.id], mine = who === u;
    const tag = mine ? 'Your job' : who ? `Taken by @${who}` : t.only || 'Only 1 left';
    return `<button class="pl jobc${t.gold ? ' gold' : ''}${who && !mine ? ' off' : ''}" type="button" ${who ? '' : `data-open="move" data-tab="jobs" data-pickjob="${t.id}"`}><span class="im jav">${cityAvatar(u, t.id, look)}</span><div class="bd"><span class="cnt">${tag}</span><div class="bar"><i style="width:${who ? 100 : 96}%"></i></div><b>${t.title.split(' · ')[0]}</b><p>${t.line}</p><div class="pr"><span><strong>${who ? '—' : t.price}</strong>${who ? '' : `<s>${t.was}</s>`}</span><em>${mine ? 'Yours' : who ? 'Taken' : 'Take'}</em></div></div></button>`; }).join('');
  const tops = (all.forSale && all.forSale.jobs) || {};
  $('jobs').innerHTML = TOP_JOBS.map((t) => { const who = tops[t.id], mine = who === u, off = who && !mine;
    const tag = mine ? 'Your job' : off ? `Taken by @${who}` : t.only || 'Only 1 left';
    return `<label class="${off || mine ? 'off' : ''}${t.gold ? ' gold' : ''}" data-job="${t.id}" data-href="/api/city/buy?kind=job_${t.id}&u=${encodeURIComponent(u)}" data-btn="Become the ${t.title.split(' · ')[0]} · ${t.price}"><i></i><span class="av">${cityAvatar(u, t.id, look)}</span><div>${t.title}<span>${t.line}</span><em class="tag">${tag}</em></div><strong>${t.price}<s>${t.was}</s></strong></label>`; }).join('');
  $('loading').hidden = true;
  $('found').hidden = false;
  ready();

  // 7/11 upsell (board approved by Nico): MOVE UP opens the place picker, only with what is still for sale
  const sale = all.forSale || {};
  const left = sale.left || {};
  const mine = { np: !!L.newTower, penthouse: !!L.pent, villa: !!(L.hills && L.premium), fountain: !L.floor && !L.hills && !L.town && !L.sea && n <= 8, town: !!L.town, sea: !!L.sea, sky: !!L.pent };
  const open = Object.fromEntries(['fountain', 'sky', 'np', 'villa', 'town', 'sea', 'penthouse'].map((k) => [k, !!sale[k] && !mine[k] && (left[k] ?? 1) > 0]));
  const auc = all.auctions || {};
  for (const k of ['yacht', 'island']) open[k] = !!auc[k] && !auc[k].done; // 7/11: one of each, by auction (only "View")
  const where = `#${shown.toLocaleString('en')} in ${placeName(L)}`;
  document.querySelectorAll('[data-where]').forEach((e) => (e.textContent = where));
  document.querySelectorAll('[data-where-kick]').forEach((e) => (e.textContent = `Your house · #${shown.toLocaleString('en')} · ${placeName(L)}`));
  const ref = u.replace(/\./g, '-');
  const tr = sale.tranche || {};
  for (const k of Object.keys(open)) {
    // 7/11 (Nico): townhouses in tranches of 6/6/8: the first only "Only n left", then "Only n remaining out of 12",
    // the last "Only n remaining out of 20 · they're going fast"; seafront villas 2 at a time
    const T = tr[k];
    const nLeft = T ? T.left : left[k];
    const txt = !nLeft ? '' : T && k === 'town' && T.no > 1 ? `Only ${nLeft} remaining out of ${T.upTo}${T.no === 3 ? ' · going fast' : ''}` : `Only ${nLeft} left`;
    // Nico 7/11: the bars look almost full on purpose
    const bar = nLeft ? Math.max(84, 100 - nLeft * 1.5) : 100;
    document.querySelectorAll(`[data-left="${k}"]`).forEach((e) => (e.textContent = txt));
    document.querySelectorAll(`[data-bar="${k}"]`).forEach((e) => (e.style.width = bar + '%'));
    document.querySelectorAll(`[data-left-tag="${k}"]`).forEach((e) => (txt ? (e.textContent = txt) : e.remove()));
    document.querySelectorAll(`[data-left-line="${k}"]`).forEach((e) => (e.textContent = !['penthouse', 'sky', 'town', 'sea', 'fountain', 'np'].includes(k) && nLeft && !(T && k === 'town' && T.no > 1) ? ` · only ${nLeft} left` : ''));
    if (k === 'yacht' || k === 'island') { const A = auc[k] || {}; const t = A.leader ? `Top bid €${(A.bid / 100).toFixed(2)}` : 'Starts at €3.99';
      document.querySelectorAll(`[data-left-line="${k}"]`).forEach((e) => (e.textContent = ` · ${t}`));
      // 8/11 (Nico): the cards say the price like the others, and the same counter line
      document.querySelectorAll(`[data-left="${k}"]`).forEach((e) => (e.textContent = 'Only 1 · auction'));
      document.querySelectorAll(`[data-auc="${k}"]`).forEach((e) => (e.textContent = A.leader ? `€${(A.bid / 100).toFixed(2)}` : 'From €3.99'));
      document.querySelectorAll(`[data-auc-sub="${k}"]`).forEach((e) => (e.textContent = A.leader ? `top bid · @${A.leader}` : 'no bids yet')); }
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
  document.querySelector('.three[data-spane="places"]')?.style.setProperty('--n', document.querySelectorAll('.three[data-spane="places"] .pl').length);
  $('jobcards').style.setProperty('--n', 4);

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

function fitOne(el) {
  if (!el) return;
  el.style.fontSize = '';
  const box = el.clientWidth, w = el.scrollWidth;
  if (w > box && box > 0) el.style.fontSize = `${Math.max(0.62, box / w) * parseFloat(getComputedStyle(el).fontSize)}px`;
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
function pickJob(l) {
  if (l.classList.contains('off')) return;
  document.querySelectorAll('#jobs label').forEach((x) => x.classList.toggle('on', x === l));
  const sh = $('shot'); sh.style.backgroundImage = ''; sh.classList.add('job');
  sh.querySelector('.bigav')?.remove(); sh.insertAdjacentHTML('beforeend', `<span class="bigav">${cityAvatar(u, l.dataset.job, window.__look || null)}</span>`);
  $('shotname').textContent = l.querySelector('div').firstChild.textContent;
  $('movego').href = l.dataset.href; $('movego').textContent = l.dataset.btn; $('movego').target = '';
}
function showTab(tab) {
  document.querySelectorAll('#move [data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  document.querySelectorAll('#move [data-pane]').forEach((p) => (p.hidden = p.dataset.pane !== tab));
  if (tab === 'jobs') { const l = document.querySelector('#jobs label.on:not(.off)') || document.querySelector('#jobs label:not(.off)'); if (l) pickJob(l); else $('movego').removeAttribute('href'); }
  else { $('shot').classList.remove('job'); $('shot').querySelector('.bigav')?.remove(); const l = document.querySelector('#move .pick[data-g="move"] label.on') || document.querySelector('#move .pick[data-g="move"] label'); if (l) pickPlace(l); }
}
function pickPlace(l) {
  document.querySelectorAll('#move label').forEach((x) => x.classList.toggle('on', x === l));
  $('shot').style.backgroundImage = `url(${l.dataset.img})`;
  $('shotname').textContent = l.dataset.name;
  $('movego').href = l.dataset.href;
  $('movego').textContent = l.dataset.btn || 'Move my house · €0.99';
  $('movego').target = l.dataset.stripe ? '_blank' : '';
}
let lastFocus = null;
function openDialog(id, pick, tab, job) {
  lastFocus = document.activeElement;
  if (id === 'move') showTab(tab || 'places');
  if (job) { const l = document.querySelector(`#jobs label[data-job="${job}"]`); if (l) pickJob(l); }
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
  if (o) { e.preventDefault(); return openDialog(o.dataset.open, o.dataset.pick, o.dataset.tab, o.dataset.pickjob); }
  const gt = e.target.closest('[data-goto]');
  if (gt) { e.preventDefault(); return document.getElementById(gt.dataset.goto)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  const st2 = e.target.closest('[data-stab]');
  if (st2) { e.preventDefault(); document.querySelectorAll('[data-stab]').forEach((b) => b.classList.toggle('on', b === st2)); document.querySelectorAll('[data-spane]').forEach((p) => (p.hidden = p.dataset.spane !== st2.dataset.stab)); return; }
  const tb = e.target.closest('#move .tabs [data-tab]');
  if (tb) { e.preventDefault(); return showTab(tb.dataset.tab); }
  if (e.target.closest('[data-close]') || e.target.classList.contains('dim')) { e.preventDefault(); return closeDialog(); }
  const l = e.target.closest('.pick label');
  if (!l) return;
  const g = l.closest('.pick');
  if (g.dataset.g === 'move') return pickPlace(l);
  if (g.dataset.g === 'jobs') return pickJob(l);
  g.querySelectorAll('label').forEach((x) => x.classList.toggle('on', x === l));
  const go = g.parentElement.querySelector('.bookgo');
  if (go) { go.href = l.dataset.go; go.textContent = `Get it · €${l.dataset.p}`; }
});
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDialog(); });

// After Sunday 8 November (Rome) the Full City Guide is €5.99, Nico 8/11 (same switch as the funnels)
if (Date.now() >= Date.parse(window.__cityDeal || '2026-11-08T23:59:59+01:00')) {
  document.querySelectorAll('label[data-p="1.99"]').forEach((l) => { l.dataset.p = '5.99'; l.querySelector('[data-full]').innerHTML = '€5.99'; });
  document.querySelectorAll('.bookgo').forEach((g) => (g.textContent = 'Get it · €5.99'));
  document.querySelectorAll('[data-kick]').forEach((k) => (k.textContent = 'The full guide'));
}

start().catch((e) => { console.error(e); none(); });
window.__house = { W, orbit, place };
