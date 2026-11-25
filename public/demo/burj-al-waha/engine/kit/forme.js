// Motore choose-your · forme di base condivise da tutti i soggetti (stadi, torri, lotti).
import * as THREE from 'three';

export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ss = x => { x = clamp(x); return x * x * (3 - 2 * x); };

// numeri casuali ripetibili: stesso seme = stessa scena, così le riprese A/B/C combaciano
export function rng(seed = 1) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

// superellisse: n=2 ellisse, n alto = rettangolo stondato. t in [0, 2π)
export function sePoint(a, b, n, t) {
  const c = Math.cos(t), s = Math.sin(t), e = 2 / n;
  return [a * Math.sign(c) * Math.pow(Math.abs(c), e), b * Math.sign(s) * Math.pow(Math.abs(s), e)];
}
export function seNormal(a, b, n, x, z) {   // normale verso fuori, nel piano
  const nx = Math.sign(x) * Math.pow(Math.abs(x) / a, n - 1) / a, nz = Math.sign(z) * Math.pow(Math.abs(z) / b, n - 1) / b;
  const l = Math.hypot(nx, nz) || 1; return [nx / l, nz / l];
}
// campiona la curva a passo di lunghezza: ritorna punti con t, posizione, normale, lunghezza cumulata
export function seSample(a, b, n, N = 1440) {
  const P = []; let acc = 0, px, pz;
  for (let i = 0; i <= N; i++) {
    const t = i / N * Math.PI * 2, [x, z] = sePoint(a, b, n, t);
    if (i) acc += Math.hypot(x - px, z - pz); px = x; pz = z;
    const [nx, nz] = seNormal(a, b, n, x, z); P.push({ t, x, z, nx, nz, s: acc });
  }
  P.len = acc; return P;
}
// punto alla lunghezza s (interpolato)
export function atS(P, s) {
  s = ((s % P.len) + P.len) % P.len; let lo = 0, hi = P.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (P[m].s < s) lo = m; else hi = m; }
  const A = P[lo], B = P[hi], u = (s - A.s) / ((B.s - A.s) || 1);
  return { x: lerp(A.x, B.x, u), z: lerp(A.z, B.z, u), nx: lerp(A.nx, B.nx, u), nz: lerp(A.nz, B.nz, u), t: lerp(A.t, B.t, u) };
}

// spazza un profilo (lista di [d, y] = distanza verso fuori, altezza) lungo una famiglia di superellissi
// planOf(d) -> {a,b,n}. uRep = ripetizione texture lungo il giro (metri per unità)
export function sweepProfile(profile, planOf, N = 720, uMeters = 8) {
  const pos = [], uv = [], idx = [], cols = profile.length;
  let vAcc = 0; const vs = profile.map((p, i) => (i ? (vAcc += Math.hypot(p[0] - profile[i - 1][0], p[1] - profile[i - 1][1])) : 0));
  for (let i = 0; i <= N; i++) {
    const t = i / N * Math.PI * 2;
    for (let j = 0; j < cols; j++) {
      const [d, y] = profile[j], { a, b, n } = planOf(d), [x, z] = sePoint(a, b, n, t);
      pos.push(x, y, z); uv.push(i / N * (2 * Math.PI * (a + b) / 2) / uMeters, vs[j] / uMeters);
    }
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < cols - 1; j++) {
    const a = i * cols + j, b = (i + 1) * cols + j; idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}

// texture disegnata su canvas (ripetibile)
export function canvasTex(w, h, draw, { repeat = [1, 1], srgb = true, aniso = 8 } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); draw(x, w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t;
}

// rumore di valore 2D liscio (per macchie di verde, sabbia, nuvole)
export function noise2(seed = 3) {
  const R = rng(seed), G = 64, T = new Float32Array(G * G).map(() => R());
  const at = (i, j) => T[((j % G + G) % G) * G + ((i % G + G) % G)];
  return (x, y) => { const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    return lerp(lerp(at(i, j), at(i + 1, j), u), lerp(at(i, j + 1), at(i + 1, j + 1), u), v); };
}
export function fbm(n, x, y, oct = 4) { let a = 0, f = 1, s = 0.5, t = 0; for (let i = 0; i < oct; i++) { a += s * n(x * f, y * f); t += s; f *= 2; s *= 0.5; } return a / t; }

// unisce geometrie semplici (stessi attributi)
export function merge(geos) {
  let n = 0; for (const g of geos) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), idx = []; let o = 0;
  for (let g of geos) { g = g.index ? g : g; if (!g.attributes.normal) g.computeVertexNormals();
    pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
    if (g.index) for (const i of g.index.array) idx.push(i + o); else for (let i = 0; i < g.attributes.position.count; i++) idx.push(i + o);
    o += g.attributes.position.count; }
  const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); m.setIndex(idx); return m;
}

// unisce geometrie non indicizzate tenendo gli attributi comuni (position, normal, uv, color)
export function unisci(list) {
  let n = 0; for (const g0 of list) n += (g0.index ? g0.toNonIndexed() : g0).attributes.position.count;
  const L = list.map(g => g.index ? g.toNonIndexed() : g), keys = ['position', 'normal', 'uv', 'color'].filter(k => L.every(g => g.attributes[k])), out = new THREE.BufferGeometry();
  for (const k of keys) { const sz = L[0].attributes[k].itemSize, arr = new Float32Array(n * sz); let o = 0; for (const g of L) { arr.set(g.attributes[k].array, o * sz); o += g.attributes[k].count; } out.setAttribute(k, new THREE.BufferAttribute(arr, sz)); }
  if (!out.attributes.normal) out.computeVertexNormals(); return out;
}
