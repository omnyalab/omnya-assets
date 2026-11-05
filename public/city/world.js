// Omnya City on omnyalab.com: the scene of the reel (style Z), shared by the map (/city) and the house page (/city/@name).
// Lots are numbered from the fountain outwards: lot 1 is the closest to the centre, the first reservation gets it.
import * as THREE from './three.module.min.js';
import { buildCity, STYLES, hashStr } from './city.js';

export { THREE };
const KEY = 'Z';

export const districtOf = (dist) => (dist <= 1 ? 'Downtown' : dist <= 3 ? 'Midtown' : dist <= 5 ? 'Garden District' : 'Outskirts');

/** The seed of a person's house: the reel used hashStr('@name'). */
export const seedOf = (u) => hashStr('@' + u);

export function makeWorld(canvas, { mobile = matchMedia('(max-width: 899px)').matches } = {}) {
  const st = STYLES[KEY];
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', logarithmicDepthBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 2 : 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#EFE8D5');
  scene.fog = new THREE.Fog('#E4E2D6', 700, 3800);

  // soft environment for water and glass, as in the reel
  const es = new THREE.Scene();
  const sp = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true }));
  const p = sp.geometry.attributes.position, col = [], a = new THREE.Color(st.sky[0]), b = new THREE.Color(st.sky[1]), gg = new THREE.Color(st.ground);
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 10; const c = y > 0 ? b.clone().lerp(a, Math.pow(y, 0.6)) : b.clone().lerp(gg, Math.min(1, -y * 3)); col.push(c.r, c.g, c.b); }
  sp.geometry.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  es.add(sp);
  const envTex = new THREE.PMREMGenerator(renderer).fromScene(es).texture;

  scene.add(new THREE.HemisphereLight(st.hemi[0], st.hemi[1], st.hemi[2]));
  const sun = new THREE.DirectionalLight(st.sun[0], st.sun[1]);
  scene.add(sun, sun.target);
  sun.castShadow = true;
  sun.shadow.mapSize.set(mobile ? 2048 : 4096, mobile ? 2048 : 4096);
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.3;

  const city = buildCity(scene, KEY, { empty: true });
  const useEnv = (root) => root.traverse((o) => { if (o.isMesh && o.material && (o.material.metalness > 0.05 || o.material.roughness < 0.4)) { o.material.envMap = envTex; o.material.needsUpdate = true; } });
  useEnv(scene);

  // lots from the centre outwards; ties broken by angle so the order never changes
  const lots = city.lots.slice().sort((l, m) => {
    const d = Math.hypot(l.x, l.z) - Math.hypot(m.x, m.z);
    return Math.abs(d) > 0.01 ? d : Math.atan2(l.z, l.x) - Math.atan2(m.z, m.x);
  });
  lots.forEach((L, k) => (L.n = k + 1));

  let housesGroup = null;
  /** Draws every reserved house ([[username, lot], …]) in one group. */
  function setHouses(list) {
    if (housesGroup) { scene.remove(housesGroup); housesGroup.traverse((o) => o.isInstancedMesh && o.dispose()); }
    const items = [];
    for (const [u, n] of list) { const L = lots[n - 1]; if (L) items.push({ L, seed: seedOf(u) }); }
    housesGroup = city.makeHouses(items);
    useEnv(housesGroup);
    scene.add(housesGroup);
  }

  /** Points the sun's shadow box at what the camera sees. */
  function aimSun(target, size) {
    const d = new THREE.Vector3(st.sunDir[0], st.sunDir[1], st.sunDir[2]).normalize();
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
    return lots.find((L) => Math.abs(x - L.x) < L.lw / 2 && Math.abs(z - L.z) < L.ld / 2) || null;
  }

  return { THREE, renderer, scene, city, lots, setHouses, aimSun, resize, lotAt, ext: city.ext, setDetail: city.setDetail };
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
