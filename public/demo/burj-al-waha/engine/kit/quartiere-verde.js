// Motore choose-your · verde del quartiere (Dubai Hills, 21/11): palme da dattero potate come nelle strade di Dubai,
// alberi tondi per il golf e i giardini, siepi di ficus, muretti e cancelli. Tutto a misura vera e in istanze (poche chiamate di disegno).
import * as THREE from 'three';
import { canvasTex, rng, lerp, unisci } from './forme.js';

// ---------------- foglia di palma (texture con le foglioline, trasparente) ----------------
function texFoglia(seed = 3) {
  const R = rng(seed);
  return canvasTex(512, 256, (c, w, h) => {
    c.clearRect(0, 0, w, h); const mid = h / 2;
    for (let i = 0; i < 150; i++) {
      const u = i / 150, x = 14 + u * (w - 26), len = (1 - Math.pow(u, 1.6)) * h * 0.46 + 6, ang = 0.5 + R() * 0.15;
      for (const s of [-1, 1]) {
        const g = 70 + R() * 30, col = `rgb(${Math.round(g * 0.82)},${Math.round(g + 26)},${Math.round(g * 0.62)})`;
        c.strokeStyle = col; c.lineWidth = 2.2 + R() * 1.2; c.lineCap = 'round';
        c.beginPath(); c.moveTo(x, mid); c.quadraticCurveTo(x + len * Math.cos(ang) * 0.5, mid + s * len * Math.sin(ang) * 0.55, x + len * Math.cos(ang), mid + s * len * Math.sin(ang)); c.stroke();
      }
    }
    c.strokeStyle = '#8a8a52'; c.lineWidth = 4; c.beginPath(); c.moveTo(6, mid); c.lineTo(w - 6, mid); c.stroke();
  }, { aniso: 8 });
}
function texTronco() {   // corteccia a scaglie della palma potata (ananas)
  const R = rng(9);
  return canvasTex(128, 512, (c, w, h) => {
    c.fillStyle = '#7a6550'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h + 16; y += 14) for (let x = (y / 14 % 2) * 16; x < w + 16; x += 32) {
      const v = 90 + R() * 50; c.fillStyle = `rgb(${v + 20},${v},${v - 22})`;
      c.beginPath(); c.moveTo(x, y - 10); c.lineTo(x + 15, y); c.lineTo(x, y + 10); c.lineTo(x - 15, y); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(40,30,20,0.55)'; c.lineWidth = 2; c.stroke();
    }
  }, { aniso: 4 });
}
// una fronda: nastro lungo L che parte inclinato di «pitch» e si piega giù, piegato a V lungo la nervatura
function fronda(L, W, pitch, yaw, droop) {
  const N = 9, pos = [], uv = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, d = u * L, y = Math.sin(pitch) * d - droop * u * u * L * 0.55, r = Math.cos(pitch) * d, w = W * (u < 0.12 ? u / 0.12 : 1 - Math.pow((u - 0.12) / 0.88, 1.8) * 0.85);
    for (const [s, v] of [[-1, 0], [0, 0.5], [1, 1]]) {
      const lat = s * w * 0.5, up = Math.abs(s) * w * 0.22;   // le due metà salgono un poco: V
      pos.push(Math.cos(yaw) * r - Math.sin(yaw) * lat, y + up, Math.sin(yaw) * r + Math.cos(yaw) * lat); uv.push(u, v);
    }
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < 2; j++) { const a = i * 3 + j, b = (i + 1) * 3 + j; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g.toNonIndexed();
}
export function palmaGeo(seed = 5) {   // chioma di una palma da dattero potata: 26 fronde da 3,6-4,6 m (misure da vivaio, STIMA)
  const R = rng(seed), parts = [];
  for (let i = 0; i < 26; i++) {
    const t = i / 26, pitch = lerp(1.05, -0.35, t) + (R() - 0.5) * 0.18, yaw = i * 2.39996 + R() * 0.2, L = lerp(3.4, 4.6, Math.sin(t * Math.PI)) * (0.9 + R() * 0.2);
    parts.push(fronda(L, 1.25, pitch, yaw, lerp(0.35, 0.8, t)));
  }
  const cuore = new THREE.SphereGeometry(0.42, 10, 8).toNonIndexed(); const n = cuore.attributes.position.count, uvc = new Float32Array(n * 2).fill(0.02); for (let i = 0; i < n; i++) uvc[i * 2 + 1] = 0.5; cuore.setAttribute('uv', new THREE.BufferAttribute(uvc, 2)); parts.push(cuore);
  return unisci(parts);
}
export function palme(lista, { ombre = true, seme = 5 } = {}) {   // lista: [x, z, altezzaTronco, scala]
  const G = new THREE.Group(); if (!lista.length) return G; const R = rng(seme);
  const mFo = new THREE.MeshStandardMaterial({ map: texFoglia(), alphaTest: 0.42, side: THREE.DoubleSide, roughness: 0.78, color: '#c9cfb0' });
  const mTr = new THREE.MeshStandardMaterial({ map: texTronco(), roughness: 0.95 }); mFo.name = 'palma_foglie'; mTr.name = 'palma_tronco';
  const tronco = new THREE.CylinderGeometry(0.27, 0.36, 1, 9, 4, true).translate(0, 0.5, 0); { const uv = tronco.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * 6); }
  const chioma = palmaGeo(seme);
  const T = new THREE.InstancedMesh(tronco, mTr, lista.length), C = new THREE.InstancedMesh(chioma, mFo, lista.length), M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
  lista.forEach(([x, z, h, s = 1], i) => {
    M4.compose(new THREE.Vector3(x, 0, z), q.setFromEuler(new THREE.Euler(0, R() * 6.28, 0)), new THREE.Vector3(s, h, s)); T.setMatrixAt(i, M4);
    M4.compose(new THREE.Vector3(x, h, z), q.setFromEuler(new THREE.Euler((R() - 0.5) * 0.12, R() * 6.28, (R() - 0.5) * 0.12)), new THREE.Vector3(s, s, s)); C.setMatrixAt(i, M4);
    col.setHSL(0.2 + (R() - 0.5) * 0.04, 0.25 + R() * 0.12, 0.62 + R() * 0.2); C.setColorAt(i, col);
  });
  C.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: mFo.map, alphaTest: 0.42 });
  T.castShadow = C.castShadow = ombre; T.receiveShadow = C.receiveShadow = true; G.add(T, C); G.userData.n = lista.length; return G;
}

// ---------------- alberi ombrosi (Ghaf, Delonix: chioma a ombrello larga 5-6 m, alta 5-7 m, note strada STIMA) ----------------
// chioma fatta di tante «carte» di foglie trasparenti con le normali verso fuori: da lontano è morbida e piena, da vicino ha le foglie.
function texFoglie(seed = 17) {
  const R = rng(seed);
  return canvasTex(256, 256, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    for (let i = 0; i < 520; i++) { const a = R() * 6.28, r = Math.pow(R(), 0.6) * w * 0.46, x = w / 2 + Math.cos(a) * r, y = h / 2 + Math.sin(a) * r, v = R();
      c.fillStyle = v < 0.3 ? '#3f5a24' : v < 0.75 ? '#5d7a34' : '#86a04c'; c.save(); c.translate(x, y); c.rotate(R() * 6.28); c.beginPath(); c.ellipse(0, 0, 5 + R() * 4, 2.2 + R() * 1.5, 0, 0, 7); c.fill(); c.restore(); }
  }, { aniso: 8 });
}
function chiomaGeo(seed = 13, n = 90) {
  const R = rng(seed), pos = [], nor = [], uv = [], C = [0, 5.0, 0], rx = 3.0, ry = 1.7;
  for (let i = 0; i < n; i++) {
    let p; do { p = [R() * 2 - 1, R() * 2 - 1, R() * 2 - 1]; } while (p[0] * p[0] + p[1] * p[1] + p[2] * p[2] > 1);
    const c = [C[0] + p[0] * rx, C[1] + p[1] * ry, C[2] + p[2] * rx], sz = 1.5 + R() * 0.9, q = new THREE.Quaternion().setFromEuler(new THREE.Euler(R() * 6.28, R() * 6.28, R() * 6.28));
    const ax = new THREE.Vector3(sz / 2, 0, 0).applyQuaternion(q), ay = new THREE.Vector3(0, sz / 2, 0).applyQuaternion(q);
    const v = [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]];
    for (const [a, b] of v) { const x = c[0] + ax.x * a + ay.x * b, y = c[1] + ax.y * a + ay.y * b, z = c[2] + ax.z * a + ay.z * b; pos.push(x, y, z);
      const nn = new THREE.Vector3((x - C[0]) / rx, (y - C[1] + 0.6) / ry, (z - C[2]) / rx).normalize(); nor.push(nn.x, nn.y, nn.z); uv.push((a + 1) / 2, (b + 1) / 2); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); return g;
}
export function alberi(lista, { colore = '#ffffff', seme = 11 } = {}) {   // lista: [x, z, scala]
  const G = new THREE.Group(); if (!lista.length) return G; const R = rng(seme);
  const chioma = chiomaGeo(seme), tronco = unisci([new THREE.CylinderGeometry(0.14, 0.24, 4.2, 7).translate(0, 2.1, 0), new THREE.CylinderGeometry(0.06, 0.1, 2.2, 5).rotateZ(0.7).translate(0.7, 4.2, 0), new THREE.CylinderGeometry(0.06, 0.1, 2.2, 5).rotateZ(-0.7).rotateY(2).translate(-0.4, 4.2, 0.5)].map(g => { g.deleteAttribute('uv'); return g.toNonIndexed(); }));
  const mC = new THREE.MeshStandardMaterial({ map: texFoglie(), color: colore, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.85 }), mT = new THREE.MeshStandardMaterial({ color: '#5a4636', roughness: 0.95 }); mC.name = 'albero_foglie'; mT.name = 'albero_tronco';
  const T = new THREE.InstancedMesh(tronco, mT, lista.length), C = new THREE.InstancedMesh(chioma, mC, lista.length), M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
  lista.forEach(([x, z, s = 1], i) => { q.setFromEuler(new THREE.Euler(0, R() * 6.28, 0)); const sw = s * (0.85 + R() * 0.3); M4.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(sw, s * (0.85 + R() * 0.3), sw)); T.setMatrixAt(i, M4); C.setMatrixAt(i, M4); col.setHSL(0.22 + (R() - 0.5) * 0.05, 0.25 + R() * 0.2, 0.8 + R() * 0.25); C.setColorAt(i, col); });
  C.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: mC.map, alphaTest: 0.45 });
  T.castShadow = C.castShadow = true; T.receiveShadow = C.receiveShadow = true; G.add(T, C); return G;
}

// ---------------- scatole con UV in metri (siepi, muretti, pilastri, cancelli) ----------------
export function scatola(w, h, d, x, y, z, yaw = 0) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]); }
  g.rotateY(yaw); g.translate(x, y + h / 2, z); return g.toNonIndexed();
}
export function texSiepe() {   // ficus potato: foglie piccole fitte, luce e ombra
  const R = rng(21);
  return canvasTex(512, 512, (c, w, h) => {
    c.fillStyle = '#3c5a26'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { const x = R() * w, y = R() * h, v = R(); c.fillStyle = v < 0.33 ? 'rgba(28,48,18,0.75)' : v < 0.8 ? 'rgba(78,112,46,0.7)' : 'rgba(132,160,78,0.75)'; c.beginPath(); c.ellipse(x, y, 3 + R() * 4, 2 + R() * 2.5, R() * 3, 0, 7); c.fill(); }
  }, { repeat: [0.5, 0.5], aniso: 8 });
}
export function texPietra(base = '#d9cfbf') {   // lastre di pietra chiara (muretti, pilastri, marciapiede)
  const R = rng(33);
  return canvasTex(512, 512, (c, w, h) => {
    c.fillStyle = base; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 64) for (let x = (y / 64 % 2) * 64; x < w; x += 128) { c.fillStyle = `rgba(${R() < 0.5 ? '255,250,240' : '120,105,90'},${0.04 + R() * 0.06})`; c.fillRect(x, y, 128, 64); }
    c.strokeStyle = 'rgba(110,95,80,0.28)'; c.lineWidth = 1.5; for (let y = 0; y < h; y += 64) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); for (let x = (y / 64 % 2) * 64; x < w; x += 128) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 64); c.stroke(); } }
  }, { repeat: [0.5, 0.5], aniso: 8 });
}
export function texCancello() {   // cancello scorrevole a doghe orizzontali bronzo scuro (come le ville di Golf Place, STIMA dalle foto)
  return canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#2c2621'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) { c.fillStyle = '#4a3f35'; c.fillRect(0, y, w, 11); c.fillStyle = 'rgba(255,230,200,0.08)'; c.fillRect(0, y, w, 2); }
  }, { repeat: [0.5, 0.5], aniso: 8 });
}
