// Omnya City on omnyalab.com: the scene of the reel (style Z), shared by the map (/city) and the house page (/city/@name).
// Lots are numbered from the fountain outwards: lot 1 is the closest to the centre, the first reservation gets it.
import * as THREE from './three.module.min.js';
import { buildCity, STYLES, hashStr } from './city.js';

export { THREE };
const KEY = 'Z';

export const districtOf = (dist) => (dist <= 1 ? 'Downtown' : dist <= 3 ? 'Midtown' : dist <= 5 ? 'Garden District' : 'Outskirts');
/** The name of a place: a lot, a villa in Omnyawood or a floor of The Residences. */
export const PREM = 100000; // house numbers of the places that are only bought
export const placeName = (P) => (!P ? 'New district' : P.town ? 'Townhouse on the water · The Residences' : P.sea ? 'Seafront villa · The Beach' : P.floor ? (P.pent ? 'Penthouse · The Residences' : `Floor ${P.f} · The Residences`) : P.hills ? (P.premium ? 'Omnyawood · top terrace' : 'Omnyawood') : districtOf(P.dist));

/** The seed of a person's house: the reel used hashStr('@name'). */
export const seedOf = (u) => hashStr('@' + u);

// THE SWITCH for Ep.2 (6/11/2026). false = the map exactly as in Ep.1 (the Ep.1 reel is live and points here).
// true = Omnyawood, The Residences, river, marina, the golden-hour look and the new places for new followers.
// Flip it here AND in api/_lib/city.js (EP2_LIVE) the day the Ep.2 reel goes out, then push.
export const EP2_LIVE = true;
const EP2 = { hills: true, river: true, marina: true, residences: true, refresh: true, sea: true }; // sea: the 7/11 seafront
// Part 3 (8/11): jobs. Off until Nico picks from the board; ?p3=J1T1 (or J2T2, J1T1T2…) previews it.
const P3 = (() => { try { const q = new URLSearchParams(location.search).get('p3'); return q ? { jobs: true, hq: q.includes('J2') ? 'J2' : 'J1', transit: q, hqLit: 3 } : {}; } catch { return {}; } })();
Object.assign(EP2, P3);

export function makeWorld(canvas, { mobile = matchMedia('(max-width: 899px)').matches, districts = EP2_LIVE ? EP2 : {}, towerFloors } = {}) {
  const ep2Look = Object.values(districts).some((v) => v === true); // the reel renders always get the new look
  const st = STYLES[KEY];
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', logarithmicDepthBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75));
  renderer.shadowMap.enabled = true;
  // Ep.2 look: golden hour, soft haze, filmic colours
  if (ep2Look) { renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.18; }
  renderer.shadowMap.type = mobile ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const HAZE = ep2Look ? '#F4D9B4' : '#EFE8D5';
  scene.background = new THREE.Color(HAZE);
  scene.fog = new THREE.Fog(ep2Look ? HAZE : '#E4E2D6', 700, 3800);
  // a sky that goes from blue overhead to warm haze at the horizon (seen when the camera looks up)
  const skyTex = (() => { const c = document.createElement('canvas'); c.width = 4; c.height = 256; const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#5F9FD8'); g.addColorStop(.55, '#B9D3E6'); g.addColorStop(.85, '#F6DDB8'); g.addColorStop(1, HAZE); x.fillStyle = g; x.fillRect(0, 0, 4, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(8000, 32, 16), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false }));
  sky.geometry.attributes.uv.array.forEach((v, i, a) => { if (i % 2) a[i] = Math.min(1, Math.max(0, (v - .5) * 3.2)); });
  sky.renderOrder = -1;
  sky.visible = ep2Look;
  scene.add(sky);

  // soft environment for water and glass, as in the reel
  const es = new THREE.Scene();
  const sp = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true }));
  const p = sp.geometry.attributes.position, col = [], a = new THREE.Color(ep2Look ? '#6FA6DA' : st.sky[0]), b = new THREE.Color(ep2Look ? '#FFD6A6' : st.sky[1]), gg = new THREE.Color(ep2Look ? '#8FA86C' : st.ground);
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 10; const c = y > 0 ? b.clone().lerp(a, Math.pow(y, 0.6)) : b.clone().lerp(gg, Math.min(1, -y * 3)); col.push(c.r, c.g, c.b); }
  sp.geometry.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  es.add(sp);
  const envTex = new THREE.PMREMGenerator(renderer).fromScene(es).texture;

  scene.add(ep2Look ? new THREE.HemisphereLight('#FFE9CF', '#8FA872', .8) : new THREE.HemisphereLight(st.hemi[0], st.hemi[1], st.hemi[2]));
  const sun = ep2Look ? new THREE.DirectionalLight('#FFD29A', 3.1) : new THREE.DirectionalLight(st.sun[0], st.sun[1]);
  scene.add(sun, sun.target);
  sun.castShadow = true;
  sun.shadow.mapSize.set(mobile ? 1024 : 4096, mobile ? 1024 : 4096);
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.3;

  const city = buildCity(scene, KEY, { empty: true, lite: mobile, districts: { ...districts, towerFloors } });
  const useEnv = (root) => root.traverse((o) => { if (o.isMesh && o.material && (o.material.metalness > 0.05 || o.material.roughness < 0.4)) { o.material.envMap = envTex; o.material.needsUpdate = true; } });
  useEnv(scene);

  // Downtown (the ring around the fountain) the villas are huge: two side-by-side lots make one (Nico, 5/11).
  const merged = [];
  const byRow = new Map();
  for (const L of city.lots) { const k = `${L.i},${L.j},${L.r}`; if (!byRow.has(k)) byRow.set(k, []); byRow.get(k).push(L); }
  for (const row of byRow.values()) {
    row.sort((a, b) => a.c - b.c);
    for (let c = 0; c < row.length; c++) {
      const L = row[c], M = row[c + 1];
      if (L.dist <= 1 && M) {
        const x = (L.x + M.x) / 2;
        merged.push({ ...L, x, lw: L.lw + M.lw, mega: true, base: new THREE.Matrix4().makeRotationY(L.yaw).setPosition(x, 0, L.z) });
        c++;
      } else merged.push(L);
    }
  }
  // lots from the centre outwards; ties broken by angle so the order never changes
  const lots = merged.sort((l, m) => {
    const d = Math.hypot(l.x, l.z) - Math.hypot(m.x, m.z);
    return Math.abs(d) > 0.01 ? d : Math.atan2(l.z, l.x) - Math.atan2(m.z, m.x);
  });
  lots.forEach((L, k) => (L.n = k + 1));
  // Ep.2 (6/11/2026): from the first house reserved after Ep.2 went live (the API keeps that number as ep2),
  // new people get the penthouse first, then a villa in Omnyawood, a floor lower, a villa… The houses before ep2 never move.
  const floors = [];
  for (const [i, t] of city.residences.entries()) for (let f = t.floors; f >= 1; f--) floors.push({ floor: true, tower: i, f, x: t.x, z: t.z, y: 6.4 + (f - 0.5) * 3.4, top: !!t.main && f === t.floors, lw: 30, ld: 24, yaw: 0 });
  // the upsell (€0.99 each, never given for free): the penthouses of the 3 tallest towers and the villas of Omnyawood's
  // top terrace, under the letters. Their house numbers are PREM + k (api/_lib/city.js uses the same order).
  const topRow = Math.max(-1, ...city.hillLots.map((L) => L.row));
  const premium = [
    // not the main tower: its penthouse is the first free Ep.2 place (house #211 got it on 6/11)
    ...city.residences.map((t, i) => ({ t, i })).filter(({ t }) => !t.main).sort((a, b) => b.t.floors - a.t.floors).slice(0, 3)
      .map(({ t, i }) => floors.find((F) => F.tower === i && F.f === t.floors)),
    ...city.hillLots.filter((L) => L.row === topRow),
  ].filter(Boolean);
  // 7/11 (Nico): 20 townhouses on the water (PREM+13…32, sold in tranches of 6, 6, 8) and 10 seafront villas (PREM+33…42, 2 at a time).
  // Appended at the end, so the 13 places already sold keep their numbers.
  if (premium.length === 13) premium.push(...(city.townLots || []), ...(city.seaLots || []));
  for (const P of premium) P.premium = true;
  for (const F of floors) if (F.f === city.residences[F.tower].floors) F.pent = true; // every tower's top floor is a penthouse
  const freeFloors = floors.filter((F) => !F.premium), freeVillas = city.hillLots.filter((L) => !L.premium);
  const seq = [];
  for (let i = 0; i < Math.max(freeFloors.length, freeVillas.length); i++) { if (freeFloors[i]) seq.push(freeFloors[i]); if (freeVillas[i]) seq.push(freeVillas[i]); }
  /** Where house number n lives. */
  function placeOf(n, ep2) {
    if (n >= PREM) return premium[n - PREM] || null;
    if (!ep2 || n < ep2 || !seq.length) return lots[n - 1] || null; // before Ep.2 (or with the switch off): the old lots
    const i = n - ep2;
    return seq[i] || lots[n - seq.length - 1] || null;
  }

  let housesGroup = null;
  /** Draws every reserved house ([[username, lot], …]) in one group. */
  let modelsGroup = null;
  function setHouses(list, ep2, { models = true } = {}) {
    for (const g of [housesGroup, modelsGroup]) if (g) { scene.remove(g); g.traverse((o) => o.isInstancedMesh && o.dispose()); }
    const items = [], taken = new Set();
    for (const [u, n] of list) { const L = placeOf(n, ep2); if (L && !L.floor && !L.town) { items.push({ L, seed: seedOf(u) }); taken.add(L); } }
    housesGroup = city.makeHouses(items);
    useEnv(housesGroup);
    scene.add(housesGroup);
    // the free villas of Omnyawood stand there as white models
    modelsGroup = !models ? null : city.makeModels([...city.hillLots, ...(city.seaLots || [])].filter((L) => !taken.has(L)).map((L) => ({ L, seed: hashStr(L.sea ? `sea-${L.c}` : `model-${L.row}-${L.c}`) })));
    if (modelsGroup) scene.add(modelsGroup);
  }

  /** Points the sun's shadow box at what the camera sees. */
  function aimSun(target, size) {
    const d = (ep2Look ? new THREE.Vector3(.62, .48, -.42) : new THREE.Vector3(st.sunDir[0], st.sunDir[1], st.sunDir[2])).normalize(); // Ep.2: lower, warmer sun
    sun.position.copy(target).addScaledVector(d, 600);
    sun.target.position.copy(target);
    const sc = sun.shadow.camera;
    sc.left = -size; sc.right = size; sc.top = size; sc.bottom = -size; sc.near = 1; sc.far = 1600;
    sc.updateProjectionMatrix();
  }

  function resize(camera) {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  /** The lot under a point of the ground. */
  function lotAt(x, z) {
    return lots.find((L) => Math.abs(x - L.x) < L.lw / 2 && Math.abs(z - L.z) < L.ld / 2)
      || city.hillLots.find((L) => Math.hypot(x - L.x, z - L.z) < 10)
      || (city.townLots || []).find((L) => Math.abs(x - L.x) < 4.2 && Math.abs(z - L.z) < 9)
      || (city.seaLots || []).find((L) => Math.abs(x - L.x) < 12 && Math.abs(z - L.z) < 13)
      || [city.yachtAt, city.islandAt].find((L) => L && Math.hypot(x - L.x, z - L.z) < (L.yacht ? 34 : 50))
      || floors.find((F) => F.pent && Math.abs(x - F.x) < 18 && Math.abs(z - F.z) < 15) || null;
  }

  // night for the reel's ending: 0 day, 1 night
  const hemi = scene.children.find((o) => o.isHemisphereLight);
  const day = { bg: scene.background.clone(), fog: scene.fog.color.clone(), sun: sun.color.clone(), si: sun.intensity, hc: hemi.color.clone(), hg: hemi.groundColor.clone(), hi: hemi.intensity, ex: renderer.toneMappingExposure };
  const NB = new THREE.Color('#0E1A33'), MOON = new THREE.Color('#9DB6FF');
  function setNight(k) {
    scene.background.copy(day.bg).lerp(NB, k); scene.fog.color.copy(day.fog).lerp(NB, k);
    sky.material.color.setRGB(1, 1, 1).lerp(new THREE.Color('#33467E'), k); renderer.toneMappingExposure = day.ex * (1 + k * .3);
    sun.color.copy(day.sun).lerp(MOON, k); sun.intensity = day.si * (1 - k * .82);
    hemi.color.copy(day.hc).lerp(new THREE.Color('#5A6FB0'), k); hemi.groundColor.copy(day.hg).lerp(new THREE.Color('#1C2338'), k); hemi.intensity = day.hi * (1 + k * .15);
    city.setNight(k);
  }
  return { yachtAt: city.yachtAt, islandAt: city.islandAt, THREE, renderer, setNight, sky, useEnv, placeOf, seq, floors, premium, hillLots: city.hillLots, scene, city, lots, setHouses, aimSun, resize, lotAt, jobsAt: city.jobsAt, ext: city.ext, setDetail: city.setDetail };
}

/** Pin over a lot: a yellow disc with a stem, like the reel's marker. */
export function makePin(THREE) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: '#FFD21F', toneMapped: false });
  const head = new THREE.Mesh(new THREE.SphereGeometry(2.6, 24, 16), mat);
  head.position.y = 26;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(1.6, 6, 16), mat);
  tip.rotation.x = Math.PI; tip.position.y = 21.5;
  g.add(head, tip);
  return g;
}

/** Yellow outline around a lot (the reel's frame), lying on the lawn. */
export function makeFrame(THREE, L) {
  const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: '#FFD21F', toneMapped: false });
  const w = L.lw - 0.5, d = L.ld - 0.5, t = 0.45;
  for (const [x, z, sx, sz] of [[0, -d / 2, w, t], [0, d / 2, w, t], [-w / 2, 0, t, d], [w / 2, 0, t, d]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.25, sz), m); b.position.set(x, 0.62, z); g.add(b);
  }
  g.position.set(L.x, 0, L.z); g.rotation.y = L.yaw || 0;
  return g;
}

export async function getJSON(url, opts) {
  const r = await fetch(url, { cache: 'no-store', ...opts });
  let j = {};
  try { j = await r.json(); } catch {}
  return { ok: r.ok, status: r.status, ...j };
}

/** 7/11: the gold name over the yacht and the island ("YACHT OF ???" until the auction ends). Always on top, same size at any zoom. */
export function makeGoldLabel(THREE, text, sub = '') {
  const c = document.createElement('canvas'), x = c.getContext('2d'), W = 1024, H = 300;
  c.width = W; c.height = H;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, depthWrite: false, toneMapped: false, sizeAttenuation: false }));
  sp.renderOrder = 999;
  sp.set = (t, s2 = '') => {
    x.clearRect(0, 0, W, H);
    x.font = '400 112px "Lilita One", Lilita, system-ui, sans-serif';
    const w = Math.min(W - 20, x.measureText(t).width + 110), x0 = (W - w) / 2;
    const g = x.createLinearGradient(0, 20, 0, 190); g.addColorStop(0, '#FFE9A3'); g.addColorStop(.5, '#F4C542'); g.addColorStop(1, '#C8901A');
    x.fillStyle = 'rgba(40,24,0,.35)'; x.beginPath(); x.roundRect(x0 + 6, 30, w, 170, 85); x.fill();
    x.fillStyle = g; x.beginPath(); x.roundRect(x0, 20, w, 170, 85); x.fill();
    x.lineWidth = 8; x.strokeStyle = '#FFF6D6'; x.stroke();
    x.fillStyle = '#3A2400'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(t, W / 2, 110, w - 60);
    if (s2) { x.font = '700 54px system-ui, sans-serif'; x.fillStyle = '#FFFFFF'; x.strokeStyle = 'rgba(0,0,0,.55)'; x.lineWidth = 10; x.strokeText(s2, W / 2, 252); x.fillText(s2, W / 2, 252); }
    tex.needsUpdate = true;
  };
  sp.set(text, sub);
  sp.scale.set(.32, .32 * H / W, 1);
  return sp;
}
