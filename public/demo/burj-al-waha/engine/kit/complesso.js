// Motore choose-your · KIT COMPLESSO DI VILLE SUL LAGO = la foto 2 di Nico, identica, portata a Dubai (23/11/2026, cartella 17).
// Nico 23/11: «DEVI COPIARE QUESTA PREDISPOSIZIONE, non a caso, QUESTA IDENTICA, case fighe e grandi alla Dubai golf club».
// Metodo: camera matching della foto 2 (strumenti/camera_foto.py: drone a 60 m, -30,4°, 71,5° verticali) e ricalco di strade, aiuola, lago, ogni villa,
// piscine e macchie di verde (strumenti/traccia_villa_lago.py → riferimenti/villa-lago/pianta.json). Qui il 3D si costruisce da quella pianta, in metri.
// Coordinate di pianta: u = metri a destra, v = metri in avanti dal punto sotto la camera della foto; nel mondo x = -u, z = v.
// Il 3D serve per camera, inquadrature e maschere: le foto vere escono da Seedream con la foto 2 come guida (mai il three.js grezzo a Nico).
import * as THREE from 'three';
import { canvasTex, rng, lerp, clamp, noise2, fbm } from './forme.js';
import { Water } from '../../vendor/addons/objects/Water.js';
import { palme, alberi, texSiepe, texPietra } from './quartiere-verde.js';
import { villaB2 } from './villa-b2.js';
import { villaEroe } from './villa-eroe.js';
import { skylineDubai } from './dubai-skyline.js';

const W = (u, v) => [-u, v];

// ---------------- nastro (strade, marciapiedi, cordoli) lungo una polilinea in pianta ----------------
function nastro(pts, w0, w1, y, chiuso = false) {   // da w0 a w1 = distanze laterali (negativo = sinistra)
  const pos = [], uv = [], idx = [], n = pts.length; let s = 0;
  for (let i = 0; i < n; i++) {
    const p = pts[i], a = pts[chiuso ? (i - 1 + n) % n : Math.max(0, i - 1)], b = pts[chiuso ? (i + 1) % n : Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nu = dy / l, nv = -dx / l;
    if (i) s += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
    for (const w of [w0, w1]) { const [x, z] = W(p[0] + nu * w, p[1] + nv * w); pos.push(x, y, z); uv.push(w, s); }
  }
  const M = chiuso ? n : n - 1; for (let i = 0; i < M; i++) { const a = i * 2, b = ((i + 1) % n) * 2; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  if (g.attributes.normal.getY(0) < 0) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } g.computeVertexNormals(); }
  return g;
}
function nastroTaglia(pts, w0, w1, y, tieni) {   // come nastro, ma solo i tratti dove tieni(u, v) è vero (cordoli tagliati agli incroci)
  const pos = [], idx = []; let s = 0;
  for (let i = 0; i < pts.length; i++) { const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nu = dy / l, nv = -dx / l;
    for (const w of [w0, w1]) { const [x, z] = W(p[0] + nu * w, p[1] + nv * w); pos.push(x, y, z); } }
  for (let i = 0; i < pts.length - 1; i++) { const m = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2], d = [pts[i + 1][1] - pts[i][1], -(pts[i + 1][0] - pts[i][0])], l = Math.hypot(...d) || 1, w = (w0 + w1) / 2;
    if (!tieni(m[0] + d[0] / l * w, m[1] + d[1] / l * w)) continue; const a = i * 2, b = (i + 1) * 2; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  if (idx.length && g.attributes.normal.getY(idx[0]) < 0) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } g.computeVertexNormals(); }
  return g;
}
const curva = (pts, passo = 2) => { const c = new THREE.CatmullRomCurve3(pts.map(([u, v]) => new THREE.Vector3(u, 0, v)), false, 'centripetal'), L = c.getLength(), n = Math.max(2, Math.round(L / passo)); return c.getSpacedPoints(n).map(p => [p.x, p.z]); };
const arco = (cu, cv, r, a0, a1, passo = 1.5) => { const n = Math.max(8, Math.round(Math.abs(a1 - a0) * r / passo)), o = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; o.push([cu + Math.cos(a) * r, cv + Math.sin(a) * r]); } return o; };

// ---------------- texture ----------------
function texPrato(seed = 3, base = [104, 138, 50]) {
  const R = rng(seed), N = noise2(seed);
  return canvasTex(1024, 1024, (c, w, h) => {
    const im = c.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const f = fbm(N, x / 90, y / 90, 4), g = (R() - 0.5) * 18, o = (y * w + x) * 4, k = 0.74 + f * 0.42;
      im.data[o] = base[0] * k + g; im.data[o + 1] = base[1] * k + g; im.data[o + 2] = base[2] * k + g * 0.6; im.data[o + 3] = 255; }
    c.putImageData(im, 0, 0);
    for (let i = 0; i < 60; i++) { c.strokeStyle = `rgba(255,255,230,${0.025 + R() * 0.02})`; c.lineWidth = 40 + R() * 30; const y = R() * h; c.beginPath(); c.moveTo(0, y); c.lineTo(w, y + (R() - 0.5) * 60); c.stroke(); }   // righe del taglio
  }, { repeat: [1 / 60, 1 / 60], aniso: 16 });
}
function texAsfalto() {
  const R = rng(8);
  return canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#2b2c2e'; c.fillRect(0, 0, w, h); for (let i = 0; i < 26000; i++) { const v = 30 + R() * 34; c.fillStyle = `rgba(${v},${v},${v + 3},0.35)`; c.fillRect(R() * w, R() * h, 1.6, 1.6); } }, { repeat: [1 / 8, 1 / 8], aniso: 16 });
}
function texIntonaco(base = '#f3f1ec', seed = 61) { const R = rng(seed); return canvasTex(512, 512, (c, w, h) => { c.fillStyle = base; c.fillRect(0, 0, w, h); for (let i = 0; i < 14000; i++) { c.fillStyle = `rgba(${R() < 0.5 ? '255,255,255' : '120,110,95'},${0.03 + R() * 0.04})`; c.fillRect(R() * w, R() * h, 2 + R() * 3, 2 + R() * 3); } }, { repeat: [1 / 3, 1 / 3], aniso: 8 }); }
function texLegno(seed = 63) { const R = rng(seed); return canvasTex(256, 512, (c, w, h) => { c.fillStyle = '#9e6a3f'; c.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 12) { c.fillStyle = `rgba(${R() < 0.5 ? '255,220,180' : '60,35,15'},${0.08 + R() * 0.12})`; c.fillRect(x, 0, 10, h); c.fillStyle = 'rgba(40,22,10,0.5)'; c.fillRect(x + 10, 0, 2, h); } }, { repeat: [1 / 1.5, 1 / 3], aniso: 8 }); }
function texMosaico() { const R = rng(65); return canvasTex(256, 256, (c, w, h) => { for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) { const v = R(); c.fillStyle = `rgb(${60 + v * 30},${170 + v * 30},${190 + v * 25})`; c.fillRect(x, y, 7, 7); } }, { repeat: [1 / 2, 1 / 2] }); }
function texSabbia() { const R = rng(12); return canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#e6d6b8'; c.fillRect(0, 0, w, h); for (let i = 0; i < 20000; i++) { c.fillStyle = `rgba(${R() < 0.5 ? '255,250,235' : '170,140,100'},0.12)`; c.fillRect(R() * w, R() * h, 2, 2); } }, { repeat: [1 / 10, 1 / 10] }); }
function texCitta() {   // il deserto urbanizzato visto da lontano: blocchi chiari, strade, macchie di verde (Al Quoz / Al Khail, STIMA)
  const R = rng(51);
  return canvasTex(2048, 2048, (c, w, h) => {
    c.fillStyle = '#cdbfa6'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { const v = R(); c.fillStyle = v < 0.15 ? '#8c9a6a' : v < 0.6 ? '#ddd2bd' : v < 0.85 ? '#b9ac96' : '#e9e3d6'; const bw = 8 + R() * 40, bh = 8 + R() * 40; c.fillRect(R() * w, R() * h, bw, bh); }
    c.strokeStyle = '#7d7b78'; for (let i = 0; i < 70; i++) { c.lineWidth = 2 + R() * 5; c.beginPath(); if (R() < 0.5) { const y = R() * h; c.moveTo(0, y); c.lineTo(w, y + (R() - 0.5) * 200); } else { const x = R() * w; c.moveTo(x, 0); c.lineTo(x + (R() - 0.5) * 200, h); } c.stroke(); }
  }, { repeat: [1 / 3000, 1 / 3000], aniso: 16 });
}

// ---------------- villa tipo stile Emirates Hills (due piani bianchi, lastre sottili che sporgono, travertino, teak, vetro, terrazza sul tetto) ----------------
// coordinate locali: X lungo la facciata da sinistra (0) a destra (lungo), Z dalla facciata verso il retro, y in alto
function villaTipo(R, lungo, prof, piani = 2) {
  // villa tipo di Dubai (Nico 23/11: «villette moderne alla Dubai, molto più simili fra loro»): la stessa casa ripetuta come in una comunità Emaar,
  // bianca a due piani con tetti piani sottili, una lama in pietra beige in facciata, grandi vetrate scure e l'ingresso in bronzo; cambia solo il verso (specchiata)
  const B = [], sp = false, L = 24, D = 17,   /* tutte identiche (Nico 23/11): stessa misura, stesso verso */ h1 = 3.9, h2 = 3.6, x = X => sp ? L - X : X, add = (k, X0, X1, y0, y1, Z0, Z1) => B.push({ k, X0: Math.min(x(X0), x(X1)), X1: Math.max(x(X0), x(X1)), y0, y1, Z0, Z1 });
  add('pietra', -0.6, L + 0.6, 0, 0.3, -1.0, D + 3.5);                     // zoccolo e terrazza dietro
  add('bianco', 0, L, 0.3, h1, 0, D);                                       // piano terra
  add('vetro', 0.08 * L, 0.48 * L, 0.5, h1 - 0.25, -0.05, 0.04);            // vetrata davanti
  add('legno', 0.53 * L, 0.6 * L, 0.3, h1 - 0.5, -0.06, 0.03);              // portone in bronzo
  add('vetro', 0.05 * L, 0.95 * L, 0.5, h1 - 0.25, D - 0.04, D + 0.05);     // vetrata sul retro
  add('tetto', -0.5, L + 0.5, h1, h1 + 0.32, -0.9, D + 0.9);                // solaio sottile che sporge
  add('bianco', 0, 0.64 * L, h1 + 0.32, h1 + 0.32 + h2, -0.6, D - 2.2);     // piano di sopra, un filo a sbalzo sul fronte
  add('vetro', 0.08 * L, 0.56 * L, h1 + 0.75, h1 + h2, -0.66, -0.58); add('vetro', 0.08 * L, 0.56 * L, h1 + 0.75, h1 + h2, D - 2.26, D - 2.16);
  add('travertino', 0.64 * L, 0.68 * L, 0.3, h1 + h2 + 0.7, -0.9, D - 2.2); // lama in pietra beige dal suolo al tetto
  add('tetto', -0.4, 0.64 * L + 0.4, h1 + 0.32 + h2, h1 + 0.62 + h2, -1.0, D - 1.8);   // tetto sottile
  return B;
}

// la foto 2 vede solo un cono stretto (3:4): nel 16:9 i lati si riempiono con altre ville, strade e verde nello stesso stile, senza toccare quello che si vede nella foto
const CAM2 = { h: 60, pitch: -30.4, vfov: 71.5, W: 1043, H: 1389 };
export function nellaFoto(u, v, h = 0) { const t = CAM2.pitch * Math.PI / 180, TV = Math.tan(CAM2.vfov * Math.PI / 360), TH = TV * CAM2.W / CAM2.H;
  const py = h - CAM2.h, z = py * Math.sin(t) + v * Math.cos(t), y = py * Math.cos(t) - v * Math.sin(t); if (z <= 1) return false; const x = u / z / TH, yy = y / z / TV; return Math.abs(x) <= 1.02 && Math.abs(yy) <= 1.02; }

export function complesso(opz = {}) {
  const P = opz.pianta, G = new THREE.Group(); G.name = 'complesso'; const R = rng(opz.seme || 23);
  const M = {
    prato: new THREE.MeshStandardMaterial({ map: texPrato(3), roughness: 1 }),
    pratoChiaro: new THREE.MeshStandardMaterial({ map: texPrato(4, [118, 160, 66]), roughness: 1 }),
    pratoIsola: new THREE.MeshStandardMaterial({ map: texPrato(6, [110, 150, 60]), roughness: 1 }),
    asfalto: new THREE.MeshStandardMaterial({ map: texAsfalto(), roughness: 0.92, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    cordolo: new THREE.MeshStandardMaterial({ color: '#dcdad5', roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }),
    riga: new THREE.MeshStandardMaterial({ color: '#f2f2ee', roughness: 0.6 }),
    sabbia: new THREE.MeshStandardMaterial({ map: texSabbia(), roughness: 1 }),
    lastre: new THREE.MeshStandardMaterial({ map: texPietra('#d9cdb8'), roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
    citta: new THREE.MeshStandardMaterial({ map: texCitta(), roughness: 1 }),
    siepe: new THREE.MeshStandardMaterial({ map: texSiepe(), roughness: 1 }),
    bianco: new THREE.MeshStandardMaterial({ map: texIntonaco(), roughness: 0.85 }),
    tetto: new THREE.MeshStandardMaterial({ map: texIntonaco('#ecebe6', 67), roughness: 0.8 }),
    pietra: new THREE.MeshStandardMaterial({ map: texPietra('#e2d7c3'), roughness: 0.85 }),
    travertino: new THREE.MeshStandardMaterial({ color: '#e3d6bf', roughness: 0.7 }),
    legno: new THREE.MeshStandardMaterial({ map: texLegno(), roughness: 0.55 }),
    pergola: new THREE.MeshStandardMaterial({ color: '#efece6', roughness: 0.8 }),
    vetro: new THREE.MeshStandardMaterial({ color: '#33414a', roughness: 0.06, metalness: 0.75, envMapIntensity: 1.4 }),
    acqua: new THREE.MeshStandardMaterial({ map: texMosaico(), color: '#bfefff', roughness: 0.05, metalness: 0.1, emissive: '#0b6a7c', emissiveIntensity: 0.25, envMapIntensity: 1.0 }),
  };
  for (const k in M) M[k].name = 'cx_' + k;
  // superfici a terra disegnate come decalcomanie, una sopra l'altra in ordine fisso: niente righe che lampeggiano dove si sovrappongono
  const ORDINE = { pratoChiaro: 1, sabbia: 3, asfalto: 4, lastre: 5, cordolo: 6, riga: 7, acqua: 8 };
  const decal = (mat, o) => { const m = mat.clone(); m.transparent = true; m.opacity = 1; m.depthWrite = false; m.polygonOffset = true; m.polygonOffsetFactor = -1 - o; m.polygonOffsetUnits = -1 - o; m.userData.ordine = o; return m; };
  const D = {}; for (const [k, o] of Object.entries(ORDINE)) D[k] = decal(M[k], o);
  const mesh = (g, m, ombra = false) => { const o = new THREE.Mesh(g, m); o.receiveShadow = true; o.castShadow = ombra; if (m.userData && m.userData.ordine) o.renderOrder = m.userData.ordine; G.add(o); return o; };
  const poli = (pts, mat, y) => { const sh = new THREE.Shape(pts.map(([u, v]) => new THREE.Vector2(-u, -v))), g = new THREE.ShapeGeometry(sh, 24); g.rotateX(-Math.PI / 2); const m = mesh(g, mat); m.position.y = y; return m; };   // poligono piatto in pianta (x = -u, z = v)
  const lastra = (pts, mat, h, matLato) => { const sh = new THREE.Shape(pts.map(([u, v]) => new THREE.Vector2(-u, -v))), g = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false }); g.rotateX(-Math.PI / 2); const o = new THREE.Mesh(g, matLato ? [mat, matLato] : mat); o.receiveShadow = true; o.castShadow = false; G.add(o); return o; };   // lastra piena appoggiata a terra (niente piani sospesi)
  const piscine = [];
  const piscina = (pc, conBordo = true) => { const cu = pc.reduce((s, p) => s + p[0] / pc.length, 0), cv = pc.reduce((s, p) => s + p[1] / pc.length, 0), bordo = pc.map(p => [cu + (p[0] - cu) * 1.12, cv + (p[1] - cv) * 1.25]);
    if (conBordo) lastra(bordo, M.pietra, 0.3); poli(pc.map(p => [cu + (p[0] - cu) * 0.94, cv + (p[1] - cv) * 0.9]), D.acqua, 0.3); piscine.push(bordo); };   // bordo in pietra pieno a terra, acqua dentro
  const dentroPol = (p, g) => { let ins = false; for (let i = 0, j = g.length - 1; i < g.length; j = i++) { const [xi, yi] = g[i], [xj, yj] = g[j]; if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi) ins = !ins; } return ins; };

  // ---------------- terreno: prato del complesso; oltre il lago golf e boschetti (al posto delle colline della foto), poi la città chiara ----------------
  const terra = mesh(new THREE.PlaneGeometry(3000, 3000).rotateX(-Math.PI / 2), M.prato); terra.position.set(0, -0.02, 600); terra.name = 'terra';
  const citta = mesh(new THREE.PlaneGeometry(20000, 20000).rotateX(-Math.PI / 2), M.citta); citta.position.set(0, -0.6, 6000);

  // ---------------- lago (Water che riflette) con la spiaggia di sabbia chiara: larga davanti, sottile in fondo, come nella foto ----------------
  const LG = P.lago, cL = LG.reduce((s, p) => [s[0] + p[0] / LG.length, s[1] + p[1] / LG.length], [0, 0]);
  const fuori = (p, d) => { const du = p[0] - cL[0], dv = p[1] - cL[1], l = Math.hypot(du, dv) || 1; return [p[0] + du / l * d, p[1] + dv / l * d]; };
  const spiaggia = LG.map(p => fuori(p, p[1] < cL[1] ? 9 : 4));
  mesh(nastro(LG, -0.4, 7, 0.02, true), D.sabbia);   // spiaggia: un anello di sabbia attorno all'acqua (larga 7 m), sotto l'acqua niente
  const normali = canvasTex(256, 256, (c, w, h) => { const im = c.createImageData(w, h), H = (x, y) => Math.sin(x * 6.2832 * 3 / w + Math.sin(y * 6.2832 * 2 / h) * 1.3) * 0.5 + Math.sin(y * 6.2832 * 5 / h + x * 6.2832 * 2 / w) * 0.35 + Math.sin((x + y) * 6.2832 * 7 / w) * 0.15;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const dx = H(x + 1, y) - H(x - 1, y), dy = H(x, y + 1) - H(x, y - 1), l = Math.hypot(dx * 4, dy * 4, 1), o = (y * w + x) * 4; im.data[o] = (-dx * 4 / l * 0.5 + 0.5) * 255; im.data[o + 1] = (-dy * 4 / l * 0.5 + 0.5) * 255; im.data[o + 2] = (1 / l * 0.5 + 0.5) * 255; im.data[o + 3] = 255; }
    c.putImageData(im, 0, 0); }, { srgb: false });
  // lago blu come la foto (acqua limpida: più chiara verso la spiaggia, blu pieno al centro); il Water a specchio lo faceva bianco col cielo chiaro
  const texLago = canvasTex(512, 512, (c, w, h) => { const g = c.createRadialGradient(w / 2, h / 2, w * 0.05, w / 2, h / 2, w * 0.55); g.addColorStop(0, '#1f6390'); g.addColorStop(0.7, '#2a79a3'); g.addColorStop(1, '#5aa9bf'); c.fillStyle = g; c.fillRect(0, 0, w, h); }, { repeat: [1, 1] });
  const gLago = new THREE.ShapeGeometry(new THREE.Shape(LG.map(([u, v]) => new THREE.Vector2(-u, -v))), 48); { const bb = LG.reduce((s, p) => [Math.min(s[0], -p[0]), Math.min(s[1], -p[1]), Math.max(s[2], -p[0]), Math.max(s[3], -p[1])], [1e9, 1e9, -1e9, -1e9]), pa = gLago.attributes.position, uv = gLago.attributes.uv; for (let i = 0; i < pa.count; i++) uv.setXY(i, (pa.getX(i) - bb[0]) / (bb[2] - bb[0]), (pa.getY(i) - bb[1]) / (bb[3] - bb[1])); }
  const acqua = new THREE.Mesh(gLago, decal(new THREE.MeshStandardMaterial({ map: texLago, roughness: 0.12, metalness: 0.0, envMapIntensity: 0.55, normalMap: normali, normalScale: new THREE.Vector2(0.15, 0.15) }), 2)); acqua.renderOrder = 2;
  acqua.material.uniforms = { time: { value: 0 } }; acqua.rotation.x = -Math.PI / 2; acqua.position.y = 0.0; acqua.name = 'lago'; acqua.receiveShadow = true; G.add(acqua);

  // ---------------- strade dalla foto: vialetto della villa grande, bivio, strada del cancello, strade in basso attorno all'aiuola ----------------
  const STR = Object.entries(P.strade).map(([k, s]) => ({ k, larg: s.larg, pts: curva(s.pts, 1.2) }));
  // rete chiusa (Nico 23/11: «le strade finiscono a caso»): la strada del cancello prosegue verso est fuori quadro; da lì un anello sale a destra,
  // passa dietro la riva nord e scende a sinistra fino alla strada in basso (fuori quadro). Nessuna strada finisce nel prato.
  { const PS = P.strade, c = STR.find(r => r.k === 'cancello'); c.pts = curva([...PS.cancello.pts, [100, 88], [150, 110], [205, 132], [330, 172], [520, 225]], 1.2);
    const dx = STR.find(r => r.k === 'basso_dx'); dx.pts = curva([...PS.basso_dx.pts, [48, 6], [90, -40], [150, -120]], 1.2);   // esce fuori quadro verso sud-est
    STR.push({ k: 'anello', larg: 7, pts: curva([[150, 110], [176, 160], [193, 230], [197, 300], [183, 362], [132, 398], [40, 413], [-50, 411], [-132, 393], [-183, 350], [-201, 280], [-197, 200], [-179, 130], [-146, 75], [-102, 38], [-62, 24], PS.basso_sx.pts[PS.basso_sx.pts.length - 1]], 1.5) });
  }
  const suStrada = (u, v, salta) => STR.some(r => r.k !== salta && r.pts.some(p => Math.hypot(p[0] - u, p[1] - v) < r.larg / 2 + 0.25));
  const zoneAsfalto = [];   // piazzale del bivio e corte davanti alla villa: anche lì niente cordoli
  const fuoriAsfalto = (u, v, salta) => !suStrada(u, v, salta) && !zoneAsfalto.some(z => dentroPol([u, v], z));
  // il bivio: piazzale d'asfalto fra le tre strade (foto: grande slargo sopra l'aiuola)
  { const c = [P.strade.vialetto.pts[0], P.strade.cancello.pts[2], P.strade.basso_dx.pts[2], P.strade.basso_sx.pts[1]]; const cc = c.reduce((s, p) => [s[0] + p[0] / 4, s[1] + p[1] / 4], [0, 0]);
    const r = []; for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; r.push([cc[0] + Math.cos(a) * 9.5, cc[1] + Math.sin(a) * 6.5]); } zoneAsfalto.push(r); poli(r, D.asfalto, 0.055); }
  // corte d'arrivo della villa grande: asfalto come il vialetto, dal vialetto fino all'ingresso e al box (dove sta la Lambo)
  { const H = P.ville.H, ex = [(H.b[0] - H.a[0]) / H.lungo, (H.b[1] - H.a[1]) / H.lungo], hw = (X, Z) => [H.a[0] + ex[0] * X + H.n[0] * Z, H.a[1] + ex[1] * X + H.n[1] * Z];
    const loc = p => { const d = [p[0] - H.a[0], p[1] - H.a[1]]; return [d[0] * ex[0] + d[1] * ex[1], d[0] * H.n[0] + d[1] * H.n[1]]; };
    const cb = [loc(P.eroe.carport.a), loc(P.eroe.carport.b)], X1 = Math.max(cb[0][0], cb[1][0]) + (opz.spostaBox || 0), CZ = Math.min(cb[0][1], cb[1][1]);
    const corte = [hw(4, -2.6), hw(X1 + 2, -2.6), hw(X1 + 2, CZ - 9.5), hw(4, CZ - 9.5)]; zoneAsfalto.push(corte); poli(corte, D.lastre, 0.055); }   // corte in masselli chiari (come i vialetti delle ville di Dubai): la Lambo nera si vede
  for (const r of STR) { mesh(nastro(r.pts, -r.larg / 2, r.larg / 2, 0.06), D.asfalto);
    for (const [a, b] of [[-r.larg / 2 - 0.3, -r.larg / 2], [r.larg / 2, r.larg / 2 + 0.3]]) mesh(nastroTaglia(r.pts, a, b, 0.12, (u, v) => fuoriAsfalto(u, v, r.k)), D.cordolo);
    if (r.larg >= 6.5) { let s0 = 0; const tratt = []; for (let i = 0; i < r.pts.length; i++) { if (i) s0 += Math.hypot(r.pts[i][0] - r.pts[i - 1][0], r.pts[i][1] - r.pts[i - 1][1]); tratt.push(s0); }
      mesh(nastroTaglia(r.pts, -0.07, 0.07, 0.07, (u, v) => { const j = r.pts.reduce((bj, p, k) => Math.hypot(p[0] - u, p[1] - v) < Math.hypot(r.pts[bj][0] - u, r.pts[bj][1] - v) ? k : bj, 0); return (tratt[j] % 6) < 3 && fuoriAsfalto(u, v, r.k) && !zoneAsfalto.some(z => dentroPol([u, v], z)); }), D.riga); } }   // riga bianca tratteggiata al centro (3 m sì, 3 m no)
  lastra(P.isola, M.pratoIsola, 0.16, M.cordolo);   // aiuola piena col cordolo vero (non un piano sospeso)
  { const sp = curva([[-40.5, 59.5], ...P.sentiero], 0.5); let acc = 0;   // sentiero a lastre separate (come la foto): dal solarium della villa a sinistra fino alla strada in basso
    for (let i = 1; i < sp.length; i++) { acc += Math.hypot(sp[i][0] - sp[i - 1][0], sp[i][1] - sp[i - 1][1]); if (acc < 0.95) continue; acc = 0;
      const d = [sp[i][0] - sp[i - 1][0], sp[i][1] - sp[i - 1][1]], l = Math.hypot(...d), t = [d[0] / l, d[1] / l], nn = [t[1], -t[0]], c = sp[i], w = 1.35, h = 0.28;
      lastra([[c[0] - nn[0] * w - t[0] * h, c[1] - nn[1] * w - t[1] * h], [c[0] + nn[0] * w - t[0] * h, c[1] + nn[1] * w - t[1] * h], [c[0] + nn[0] * w + t[0] * h, c[1] + nn[1] * w + t[1] * h], [c[0] - nn[0] * w + t[0] * h, c[1] - nn[1] * w + t[1] * h]], M.pietra, 0.05); } }

  // ---------------- guardiola e cancello scorrevole sulla strada di destra (foto) ----------------
  { const [a, b] = P.cancello.guardiola, cu = (a[0] + b[0]) / 2, cv = (a[1] + b[1]) / 2 + 2.5, ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const gr = new THREE.Group(); gr.position.set(-cu, 0, cv); gr.rotation.y = ang; G.add(gr);
    const p = (w, h, d, x, y, z, m) => { const q = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); q.position.set(x, y, z); q.castShadow = q.receiveShadow = true; gr.add(q); };
    p(4.5, 3.0, 3.6, 0, 1.5, 0, M.bianco); p(6.5, 0.35, 5.2, 0, 3.2, 0, M.tetto); p(3.2, 1.3, 0.05, 0, 1.8, -1.82, M.vetro);
    const [s0, s1] = P.cancello.sbarra, su = (s0[0] + s1[0]) / 2, sv = (s0[1] + s1[1]) / 2, sl = Math.hypot(s1[0] - s0[0], s1[1] - s0[1]), sa = Math.atan2(s1[1] - s0[1], s1[0] - s0[0]);
    const cg = new THREE.Mesh(new THREE.BoxGeometry(sl, 1.8, 0.12), new THREE.MeshStandardMaterial({ color: '#2b2a28', metalness: 0.6, roughness: 0.4 })); cg.position.set(-su, 0.9, sv); cg.rotation.y = sa; cg.castShadow = true; G.add(cg); }

  // ---------------- ville della foto: ognuna al suo posto, con la sua misura e la sua rotazione ----------------
  const box = new THREE.BoxGeometry(1, 1, 1), liste = {}, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
  const metti = (k, m) => (liste[k] = liste[k] || []).push(m.clone());
  const ville = [];
  const locale = (V) => { const ex = [(V.b[0] - V.a[0]) / V.lungo, (V.b[1] - V.a[1]) / V.lungo], n = V.n; return { ex, n, w: (X, Z) => [V.a[0] + ex[0] * X + n[0] * Z, V.a[1] + ex[1] * X + n[1] * Z], th: Math.atan2(ex[1], ex[0]) }; };
  for (const [id, V] of Object.entries(P.ville)) {
    if (V.stile === 'eroe') continue;   // anche la riva nord (F3) è una villa tipo: tutte uguali tranne la nostra
    const lun = Math.min(27, Math.max(22, V.lungo)), LC = locale({ ...V, lungo: V.lungo }), Rv = rng(200 + id.charCodeAt(0) * 7 + (id.charCodeAt(1) || 0));
    const BB = villaTipo(Rv, lun, V.prof, V.piani); if (false && V.tetto === 'solare') {   /* tutte identiche: niente variante col tetto solare */ for (const b of BB) if (b.k === 'tetto') b.k = 'tettoGrigio'; const top = Math.max(...BB.filter(b => b.k === 'tettoGrigio').map(b => b.y1)), tb = BB.filter(b => b.k === 'tettoGrigio' && b.y1 === top)[0];
      for (let k = 0; k < 6; k++) BB.push({ k: 'solare', X0: tb.X0 + 1.5 + k * ((tb.X1 - tb.X0 - 3) / 6), X1: tb.X0 + 1.5 + (k + 0.85) * ((tb.X1 - tb.X0 - 3) / 6), y0: top, y1: top + 0.12, Z0: tb.Z0 + 2, Z1: tb.Z0 + 2 + Math.min(5, (tb.Z1 - tb.Z0) * 0.4) }); }   // tetto grigio coi pannelli solari, come nella foto
    for (const b of BB) { const X = (b.X0 + b.X1) / 2, Z = (b.Z0 + b.Z1) / 2, [u, v] = LC.w(X, Z);
      ps.set(-u, (b.y0 + b.y1) / 2, v); sc.set(b.X1 - b.X0, b.y1 - b.y0, b.Z1 - b.Z0); m4.compose(ps, q.setFromAxisAngle(Y, LC.th), sc); metti(b.k, m4); }
    // piscina: quella della foto, se c'è, altrimenti dietro casa
    const pc = V.pisc ? V.pisc : [LC.w(lun * 0.2, V.prof + 5), LC.w(lun * 0.7, V.prof + 5), LC.w(lun * 0.7, V.prof + 10), LC.w(lun * 0.2, V.prof + 10)];
    { const inv = p => { const d = [p[0] - V.a[0], p[1] - V.a[1]]; return [d[0] * LC.ex[0] + d[1] * LC.ex[1], d[0] * LC.n[0] + d[1] * LC.n[1]]; }, q2 = pc.map(inv), X0 = Math.min(...q2.map(p => p[0])), X1 = Math.max(...q2.map(p => p[0])), Z0 = Math.min(...q2.map(p => p[1])), Z1 = Math.max(...q2.map(p => p[1]));
      let d = null; if (Z1 < 0.5) d = [X0 - 1.6, X1 + 1.6, Z0 - 1.6, 0.2]; else if (Z0 > V.prof - 0.5) d = [X0 - 1.6, X1 + 1.6, V.prof - 0.2, Z1 + 1.6]; else if (X1 < 0.5) d = [X0 - 1.6, 0.2, Z0 - 1.6, Z1 + 1.6]; else if (X0 > lun - 0.5) d = [lun - 0.2, X1 + 1.6, Z0 - 1.6, Z1 + 1.6];
      if (d) { const dp = [LC.w(d[0], d[2]), LC.w(d[1], d[2]), LC.w(d[1], d[3]), LC.w(d[0], d[3])]; lastra(dp, M.pietra, 0.3); piscina(pc, false); piscine.push(dp); } else piscina(pc); }   // solarium pieno che va dalla casa alla piscina
    // siepi di confine ai fianchi
    for (const X of [-4, lun + 4]) { const [u, v] = LC.w(X, V.prof / 2); ps.set(-u, 0.9, v); sc.set(0.9, 1.8, V.prof + 16); m4.compose(ps, q.setFromAxisAngle(Y, LC.th), sc); metti('siepe', m4); }
    ville.push({ id, c: LC.w(lun / 2, V.prof / 2), V, L: LC, lun, h: V.piani > 1 ? 8.5 : 4.6 });
  }
  // ---------------- ville lungo l'anello (fuori dalla foto): una ogni ~64 m, sfalsate ai due lati, ognuna col suo lotto, mai attaccate ----------------
  // controllo d'ingombro vero (Nico 23/11: «niente deve sormontare», «le case non sono così appiccicate»): il lotto (casa + giardino + piscina + 6 m di prato
  // intorno) non tocca nessun altro lotto, nessuna strada, la spiaggia o quello che si vede nella foto 2
  { const Rx = rng(311), lotti = [];
    const rettangolo = (a, ex, nrm, lun, prof, m) => { const w = (X, Z) => [a[0] + ex[0] * X + nrm[0] * Z, a[1] + ex[1] * X + nrm[1] * Z]; return [w(-m, -5), w(lun + m, -5), w(lun + m, prof + 22), w(-m, prof + 22)]; };
    const campioni = P4 => { const o = []; for (let i = 0; i <= 6; i++) for (let j = 0; j <= 6; j++) { const u = i / 6, v = j / 6; o.push([0, 1].map(k => P4[0][k] * (1 - u) * (1 - v) + P4[1][k] * u * (1 - v) + P4[2][k] * u * v + P4[3][k] * (1 - u) * v)); } return o; };
    const tocca = (A, B) => campioni(A).some(p => dentroPol(p, B)) || campioni(B).some(p => dentroPol(p, A));
    for (const w of ville) { const LCw = w.L, l = w.lun, pr = w.V.prof; lotti.push([LCw.w(-6, -9), LCw.w(l + 6, -9), LCw.w(l + 6, pr + 16), LCw.w(-6, pr + 16)]); }
    { const H = P.ville.H, ex = [(H.b[0] - H.a[0]) / H.lungo, (H.b[1] - H.a[1]) / H.lungo], hw = (X, Z) => [H.a[0] + ex[0] * X + H.n[0] * Z, H.a[1] + ex[1] * X + H.n[1] * Z]; lotti.push([hw(-6, -28), hw(H.lungo + 6, -28), hw(H.lungo + 6, 48), hw(-6, 48)]); }   // lotto della villa grande
    const tutte = STR.flatMap(r => r.pts.filter((_, i) => i % 2 === 0).map(p => [p, r.larg / 2 + 1.5]));
    const libera = R4 => !lotti.some(L4 => tocca(R4, L4)) && !campioni(R4).some(p => nellaFoto(p[0], p[1], 0) || dentroPol(p, spiaggia) || tutte.some(([q, r]) => Math.hypot(q[0] - p[0], q[1] - p[1]) < r));
    const mettiVilla = (a, ex, nrm, lun, prof, id) => {
      const LC = { w: (X, Z) => [a[0] + ex[0] * X + nrm[0] * Z, a[1] + ex[1] * X + nrm[1] * Z], th: Math.atan2(ex[1], ex[0]) };
      for (const b of villaTipo(Rx, lun, prof, 2)) { const X = (b.X0 + b.X1) / 2, Z = (b.Z0 + b.Z1) / 2, [u, v] = LC.w(X, Z); ps.set(-u, (b.y0 + b.y1) / 2, v); sc.set(b.X1 - b.X0, b.y1 - b.y0, b.Z1 - b.Z0); m4.compose(ps, q.setFromAxisAngle(Y, LC.th), sc); metti(b.k, m4); }
      piscina([LC.w(lun * 0.2, prof + 5.2), LC.w(lun * 0.72, prof + 5.2), LC.w(lun * 0.72, prof + 10.2), LC.w(lun * 0.2, prof + 10.2)]);
      for (const X of [-4, lun + 4]) { const [u, v] = LC.w(X, prof / 2 + 3); ps.set(-u, 0.9, v); sc.set(0.8, 1.8, prof + 22); m4.compose(ps, q.setFromAxisAngle(Y, LC.th), sc); metti('siepe', m4); }   // siepi ai fianchi del lotto
      poli([LC.w(lun * 0.62, 0), LC.w(lun * 0.62 + 5, 0), LC.w(lun * 0.62 + 5, -10.5), LC.w(lun * 0.62, -10.5)], D.asfalto, 0.05);   // vialetto fino alla strada
      ville.push({ id, c: LC.w(lun / 2, prof / 2), V: { prof, piani: 2, lungo: lun }, L: LC, lun, h: 8.5, fuori: true }); };
    const an = STR.find(r => r.k === 'anello').pts; let acc = 0, lato = 1;
    for (let i = 1; i < an.length; i++) { acc += Math.hypot(an[i][0] - an[i - 1][0], an[i][1] - an[i - 1][1]); if (acc < 40) continue;
      const dd = [an[i][0] - an[i - 1][0], an[i][1] - an[i - 1][1]], l = Math.hypot(...dd), nn = [dd[1] / l, -dd[0] / l], nrm = [nn[0] * lato, nn[1] * lato], ex = [-nrm[1], nrm[0]];
      const lun = 24 + Rx() * 2, prof = 17 + Rx(), f = [an[i][0] + nrm[0] * 14.5, an[i][1] + nrm[1] * 14.5], a = [f[0] - ex[0] * lun / 2, f[1] - ex[1] * lun / 2], R4 = rettangolo(a, ex, nrm, lun, prof, 12);
      if (libera(R4)) { lotti.push(R4); mettiVilla(a, ex, nrm, lun, prof, 'X' + ville.length); acc = 0; lato = -lato; } else if (acc > 70) { acc = 0; lato = -lato; } }
    G.userData.stradeEst = []; G.userData.lotti = lotti; }
  M.tettoGrigio = new THREE.MeshStandardMaterial({ map: texIntonaco('#8f8f8c', 71), roughness: 0.85 }); M.solare = new THREE.MeshStandardMaterial({ color: '#1c2a44', roughness: 0.25, metalness: 0.5 });
  const mats = { tettoGrigio: M.tettoGrigio, solare: M.solare, bianco: M.bianco, tetto: M.tetto, pietra: M.pietra, travertino: M.travertino, legno: M.legno, vetro: M.vetro, acqua: M.acqua, siepe: M.siepe, pergola: M.pergola };
  for (const k in liste) { const im = new THREE.InstancedMesh(box, mats[k], liste[k].length); liste[k].forEach((m, i) => im.setMatrixAt(i, m)); im.castShadow = k !== 'acqua'; im.receiveShadow = true; im.name = 'ville_' + k; G.add(im); }

  // ---------------- la villa grande (eroe) e la villa 2 al loro posto ----------------
  const solV = opz.sole || new THREE.Vector3(0.4, 0.7, -0.5);
  const HV = P.ville.H, HL = locale(HV), toL = (LC, p) => { const d = [p[0] - LC.a[0], p[1] - LC.a[1]]; return [d[0] * LC.ex[0] + d[1] * LC.ex[1], d[0] * LC.n[0] + d[1] * LC.n[1]]; };
  HL.a = HV.a; const e = P.eroe, cp = [toL(HL, e.carport.a), toL(HL, e.carport.b)], al = e.alto.map(p => toL(HL, p)), pi = e.piscina.map(p => toL(HL, p));
  const eroe = villaEroe({ lungo: HV.lungo, prof: HV.prof, ingresso: opz.ingresso, box: [Math.min(cp[0][0], cp[1][0]) + (opz.spostaBox || 0), Math.max(cp[0][0], cp[1][0]) + (opz.spostaBox || 0), Math.min(cp[0][1], cp[1][1])],
    alto: [Math.min(...al.map(p => p[0])), Math.max(...al.map(p => p[0]))], piscina: [Math.min(...pi.map(p => p[0])), Math.max(...pi.map(p => p[0]))] });
  eroe.gruppo.position.set(-HV.a[0], 0, HV.a[1]); eroe.gruppo.rotation.y = HL.th; eroe.gruppo.updateMatrixWorld(true); G.add(eroe.gruppo);
  const V2d = P.ville.F4, V2L = locale(V2d); V2L.a = V2d.a;
  const V2 = villaB2({ pal: opz.pal2 || 'P3', seme: 31, sole: solV }); const m2 = [(V2d.a[0] + V2d.b[0]) / 2, (V2d.a[1] + V2d.b[1]) / 2];
  V2.gruppo.position.set(-m2[0], 0, m2[1]); V2.gruppo.rotation.y = V2L.th; V2.gruppo.updateMatrixWorld(true); G.add(V2.gruppo);  V2.gruppo.visible = false;   // (23/11) la seconda villa B2 era diversa e stava sopra la villa tipo F4: spenta, tutte le ville sono uguali

  // ---------------- verde: palme da dattero e palme alte, alberi tropicali, cicas, dentro le macchie ricalcate dalla foto ----------------
  const pal = [], alb = [], cic = [];
  const libero = (u, v, r) => !ville.some(w => Math.hypot(w.c[0] - u, w.c[1] - v) < Math.max(w.lun, w.V.prof) / 2 + r) && !dentroPol([u, v], P.ville.H ? [HL.w(-3, -16), HL.w(HV.lungo + 3, -16), HL.w(HV.lungo + 3, HV.prof + 14), HL.w(-3, HV.prof + 14)] : []) && !dentroPol([u, v], spiaggia);
  const strade = STR.flatMap(r => r.pts.filter((_, i) => i % 2 === 0));
  const lontanoStrada = (u, v, d) => !strade.some(p => Math.hypot(p[0] - u, p[1] - v) < d);
  const asse0 = (u, v) => opz.corridoio && opz.corridoio(u, v);   // il corridoio del giro resta libero
  const strE0 = () => (G.userData.stradeEst || []).flatMap(a => curva(a, 3));
  let SE = null; const asse = (u, v) => { SE = SE || strE0(); return asse0(u, v) || !lontanoStrada(u, v, 5) || SE.some(p => Math.hypot(p[0] - u, p[1] - v) < 6) || piscine.some(pc => dentroPol([u, v], pc)) || zoneAsfalto.some(z => dentroPol([u, v], z)) || dentroPol([u, v], P.isola) && false; };   // mai su strade, piscine, corti
  for (const [k, Vd] of Object.entries(P.verde)) {
    const pol = Vd.pol, bb = pol.reduce((s, p) => [Math.min(s[0], p[0]), Math.min(s[1], p[1]), Math.max(s[2], p[0]), Math.max(s[3], p[1])], [1e9, 1e9, -1e9, -1e9]);
    const prova = (n, fn) => { let k2 = 0; for (let i = 0; i < n * 30 && k2 < n; i++) { const u = bb[0] + R() * (bb[2] - bb[0]), v = bb[1] + R() * (bb[3] - bb[1]); if (!dentroPol([u, v], pol) || !libero(u, v, 1) || !lontanoStrada(u, v, 4.5) || asse(u, v)) continue; fn(u, v); k2++; } };
    prova(Math.round((Vd.palme || 0) * 0.8), (u, v) => pal.push([-u, v, Vd.basse ? 6 + R() * 5 : 8 + R() * 6, 0.62 + R() * 0.14]));
    prova(Vd.alberi || 0, (u, v) => alb.push([-u, v, 1.0 + R() * 0.7]));
    prova(Vd.cicas || 0, (u, v) => cic.push([-u, v, 0.4 + R() * 0.5, 0.55 + R() * 0.25]));
  }
  for (const [u, v] of P.palme) if (!asse(u, v) && !dentroPol([u, v], spiaggia)) pal.push([-u, v, 12 + R() * 4, 0.72]);
  // palme lungo la spiaggia e intorno alle ville lontane, boschetti e golf oltre la riva nord (le colline della foto diventano il verde di un golf club di Dubai)
  for (let i = 0; i < spiaggia.length; i += 2) { const p = fuori(spiaggia[i], 3); if (R() < 0.3 && libero(p[0], p[1], 2) && !asse(p[0], p[1])) pal.push([-p[0], p[1], 9 + R() * 5, 0.7]); }
  const NZ = noise2(91);
  for (let i = 0; i < 2600; i++) { const u = (R() - 0.5) * 700, v = 120 + R() * 220; if (dentroPol([u, v], spiaggia) || !libero(u, v, 6) || asse(u, v) || dentroPol([u, v], P.prato_lago)) continue;
    const f = fbm(NZ, u / 50, v / 50, 3); if (f < 0.52) continue; if (R() < 0.25) pal.push([-u, v, 9 + R() * 5, 0.8]); else alb.push([-u, v, 1.1 + R() * 0.7]); }
  // bosco fitto dietro la riva nord, come le colline a bosco della foto 2: una massa verde continua fino all'orizzonte, lo skyline di Dubai sopra
  const bosco = []; for (let i = 0; i < 9000; i++) { const u = (R() - 0.5) * 2600, v = 330 + Math.pow(R(), 0.8) * 1500; if (!libero(u, v, 4) || dentroPol([u, v], spiaggia)) continue; if (v < 345 && Math.abs(u) < 200) continue; bosco.push([-u, v, 1.5 + R() * 1.1]); }
  G.add(alberi(bosco, { colore: '#d4e4bf', seme: 29 }));
  // verde fitto fuori dalla foto (lati del 16:9): palme e alberi tropicali fra le ville, come la foto
  { const strE = (G.userData.stradeEst || []).flatMap(a => curva(a, 3)); for (let i = 0; i < 7000; i++) { const u = (R() - 0.5) * 900, v = -40 + R() * 420; if (nellaFoto(u, v, 0) || dentroPol([u, v], spiaggia) || !libero(u, v, 5) || strE.some(p => Math.hypot(p[0] - u, p[1] - v) < 6) || asse(u, v)) continue;
    const f = fbm(NZ, u / 40, v / 40, 3); if (f < 0.46) continue; if (R() < 0.3) pal.push([-u, v, 9 + R() * 6, 0.7]); else alb.push([-u, v, 1.1 + R() * 0.8]); } }
  // palme in fila lungo le strade, come i viali di Dubai: una ogni 16 m per lato, sul prato a bordo strada (mai su vialetti, corti, piscine o incroci)
  for (const r of STR) { if (r.k === 'vialetto') continue; let acc = 0;
    for (let i = 1; i < r.pts.length; i++) { acc += Math.hypot(r.pts[i][0] - r.pts[i - 1][0], r.pts[i][1] - r.pts[i - 1][1]); if (acc < 16) continue; acc = 0;
      const d = [r.pts[i][0] - r.pts[i - 1][0], r.pts[i][1] - r.pts[i - 1][1]], l = Math.hypot(...d), nn = [d[1] / l, -d[0] / l];
      for (const sd of [-1, 1]) { const u = r.pts[i][0] + nn[0] * sd * (r.larg / 2 + 3.2), v = r.pts[i][1] + nn[1] * sd * (r.larg / 2 + 3.2);
        if (!libero(u, v, 2) || asse0(u, v) || piscine.some(pc => dentroPol([u, v], pc)) || zoneAsfalto.some(z => dentroPol([u, v], z)) || STR.some(o => o !== r && o.pts.some(p => Math.hypot(p[0] - u, p[1] - v) < o.larg / 2 + 2.5)) || (G.userData.lotti || []).some(L4 => dentroPol([u, v], L4))) continue;
        pal.push([-u, v, 7.5, 0.95]); } } }
  // controllo finale (Nico 23/11: «niente in mezzo a caso»): nessuna palma, albero o cicas su corti, vialetti, strade, piscine o solarium
  const vicino = (u, v, poly, m) => [[0, 0], [m, 0], [-m, 0], [0, m], [0, -m], [m * 0.7, m * 0.7], [-m * 0.7, m * 0.7], [m * 0.7, -m * 0.7], [-m * 0.7, -m * 0.7]].some(([du, dv]) => dentroPol([u + du, v + dv], poly));
  const vietato = ([x, z]) => { const u = -x, v = z; return zoneAsfalto.some(zz => vicino(u, v, zz, 3)) || piscine.some(pc => vicino(u, v, pc, 2)) || STR.some(r => r.pts.some(p => Math.hypot(p[0] - u, p[1] - v) < r.larg / 2 + 2.4)); };   // 3 m di margine da corti e piscine
  for (const L of [pal, alb, cic]) { const ok = L.filter(t => !vietato(t)); L.length = 0; L.push(...ok); }
  // giardino della villa grande verso il lago (Nico 23/11: «piscina orizzontale e poi giardino verso il lago»): vialetto a lastre sull'asse dalla piscina alla spiaggia,
  // due file di ulivi ai lati e bordure basse di lavanda; il resto prato
  { const ax = (opz.ingresso ?? 11.5) + 2.1, hw = (X, Z) => HL.w ? HL.w(X, Z) : [0, 0];
    for (let z = 29.5; z < 86; z += 1.15) { const c = hw(ax, z), t = [HL.n[0], HL.n[1]], nn = [HL.ex[0], HL.ex[1]], w = 1.2, h = 0.4;
      lastra([[c[0] - nn[0] * w - t[0] * h, c[1] - nn[1] * w - t[1] * h], [c[0] + nn[0] * w - t[0] * h, c[1] + nn[1] * w - t[1] * h], [c[0] + nn[0] * w + t[0] * h, c[1] + nn[1] * w + t[1] * h], [c[0] - nn[0] * w + t[0] * h, c[1] - nn[1] * w + t[1] * h]], M.pietra, 0.05); }
    const ulivi = []; for (let z = 33; z < 84; z += 8.5) for (const dx of [-5.5, 5.5]) { const [u, v] = hw(ax + dx, z); ulivi.push([-u, v, 0.62]); }
    G.add(alberi(ulivi, { colore: '#c9d3b8', seme: 41 }));
    for (const dx of [-2.4, 2.4]) for (let z = 31; z < 84; z += 8.5) { const [u, v] = hw(ax + dx, z + 3.5); ps.set(-u, 0.25, v); sc.set(0.7, 0.5, 6); m4.compose(ps, q.setFromAxisAngle(Y, HL.th), sc); (liste.lav = liste.lav || []).push(m4.clone()); }
    if (liste.lav) { const im = new THREE.InstancedMesh(box, new THREE.MeshStandardMaterial({ color: '#8f86b8', roughness: 1 }), liste.lav.length); liste.lav.forEach((m, i) => im.setMatrixAt(i, m)); im.receiveShadow = true; im.castShadow = true; im.name = 'lavanda'; G.add(im); } }
  G.add(palme(pal, { seme: 7 })); G.add(alberi(alb, { colore: '#d9e8c4', seme: 13 })); G.add(palme(cic, { seme: 11, ombre: false }));

  if (opz.citta && opz.citta.length) {
    const burj = opz.citta.find(t => /Burj Khalifa/.test(t.nome)), dist = opz.distBurj || 8000, latO = burj.lat - dist / 110574, lonO = burj.lon - (opz.burjDestra || 0) / (111320 * Math.cos(burj.lat * Math.PI / 180));
    const SK = skylineDubai([latO, lonO], opz.citta, { bassi: 0 }); SK.rotation.y = Math.PI; G.add(SK);   // girato: il nord va a +z, l'est a destra dello schermo
  }
  return { gruppo: G, eroe, V2, V2L, HL, ville, acqua, M, P };
}
