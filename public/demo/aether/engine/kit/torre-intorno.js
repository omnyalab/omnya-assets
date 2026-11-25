// Motore choose-your · intorno della torre come nella foto di The Split: piazza in pietra chiara con le strisce di prato
// davanti all'ingresso, filari di alberi tondi ai lati, gente piccola (solo traccia), città bassa nella foschia
// e, se il soggetto la dà, la skyline vera (torri con altezza e posizione dal web).
import * as THREE from 'three';
import { canvasTex, rng, noise2, fbm, lerp, clamp, merge } from './forme.js';

export function intorno(p) {
  const G = new THREE.Group(); G.name = 'paesaggio'; const R = rng(p.seme || 4), n = noise2(p.seme || 4), C = p.colori;
  // ---------- terreno largo (città, strade) ----------
  const S = p.lato || 4000, half = S / 2, TX = 2048, k = TX / S;
  const terra = canvasTex(TX, TX, c => {
    const im = c.createImageData(TX, TX); for (let j = 0; j < TX; j++) for (let i = 0; i < TX; i++) { const v = fbm(n, i / 40, j / 40, 3), o = (j * TX + i) * 4; im.data[o] = C.terra[0] + (v - 0.5) * 30; im.data[o + 1] = C.terra[1] + (v - 0.5) * 28; im.data[o + 2] = C.terra[2] + (v - 0.5) * 22; im.data[o + 3] = 255; }
    c.putImageData(im, 0, 0);
    c.globalAlpha = 0.55; for (let q = 0; q < 14000; q++) { const x = (R() - 0.5) * S, z = (R() - 0.5) * S; if (Math.hypot(x, z) < (p.citta?.da || 400) * 0.8) continue; c.fillStyle = R() < 0.5 ? C.lotti[0] : C.lotti[1]; c.fillRect((x + half) * k, (z + half) * k, (12 + R() * 26) * k, (12 + R() * 26) * k); }
    c.globalAlpha = 1; c.strokeStyle = C.strada; c.lineCap = 'round';
    for (const s of p.strade || []) { c.lineWidth = s.largh * k; c.beginPath(); s.punti.forEach(([x, z], i) => i ? c.lineTo((x + half) * k, (z + half) * k) : c.moveTo((x + half) * k, (z + half) * k)); c.stroke(); }
    // parchi verdi intorno alla piazza
    for (const v of p.verde || []) { const g = c.createRadialGradient((v.x + half) * k, (v.z + half) * k, 0, (v.x + half) * k, (v.z + half) * k, v.r * k); g.addColorStop(0, C.prato); g.addColorStop(0.8, C.prato); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.beginPath(); c.arc((v.x + half) * k, (v.z + half) * k, v.r * k, 0, 7); c.fill(); }
  });
  const gm = new THREE.Mesh(new THREE.PlaneGeometry(S, S), new THREE.MeshStandardMaterial({ map: terra, roughness: 0.95 })); gm.rotation.x = -Math.PI / 2; gm.position.y = -0.06; gm.receiveShadow = true; G.add(gm);
  const far = new THREE.Mesh(new THREE.RingGeometry(half, S * 6, 64), new THREE.MeshStandardMaterial({ color: new THREE.Color(`rgb(${C.terra.join(',')})`).convertSRGBToLinear(), roughness: 1 })); far.rotation.x = -Math.PI / 2; far.position.y = -0.1; G.add(far);

  // ---------- piazza davanti alla torre (texture fine: lastre di pietra, strisce di prato, aiuole) ----------
  const PZ = p.piazza, PW = PZ.w, PD = PZ.d, PT = 4096, kx = PT / PW, kz = PT / PD;
  const piazza = canvasTex(PT, PT, c => {
    c.fillStyle = C.pietra; c.fillRect(0, 0, PT, PT);
    // lastre 1,2 x 0,6 m con piccole differenze di tono
    for (let z = 0; z < PD; z += 0.6) for (let x = (Math.floor(z / 0.6) % 2) * 0.6; x < PW; x += 1.2) { const v = R(); c.fillStyle = `rgba(${v < 0.5 ? '255,250,240' : '150,140,125'},${0.05 + R() * 0.07})`; c.fillRect(x * kx, z * kz, 1.2 * kx, 0.6 * kz); }
    c.strokeStyle = 'rgba(120,110,96,0.22)'; c.lineWidth = 1; for (let z = 0; z < PD; z += 0.6) { c.beginPath(); c.moveTo(0, z * kz); c.lineTo(PT, z * kz); c.stroke(); }
    const X = x => (x + PW / 2) * kx, Z = z => (z - PZ.z0) * kz;
    for (const r of PZ.prati || []) {   // strisce di prato (rettangoli) con bordo in pietra
      const g = c.createLinearGradient(0, Z(r[1]), 0, Z(r[1] + r[3])); g.addColorStop(0, C.pratoChiaro); g.addColorStop(1, C.prato); c.fillStyle = g; c.fillRect(X(r[0]), Z(r[1]), r[2] * kx, r[3] * kz);
      for (let q = 0; q < r[2] * r[3] * 6; q++) { c.fillStyle = `rgba(${R() < 0.5 ? '40,70,20' : '160,190,90'},0.18)`; c.fillRect(X(r[0]) + R() * r[2] * kx, Z(r[1]) + R() * r[3] * kz, 2, 2); }
    }
    for (const r of PZ.aiuole || []) { c.fillStyle = C.aiuola; c.fillRect(X(r[0]), Z(r[1]), r[2] * kx, r[3] * kz); for (let q = 0; q < r[2] * r[3] * 4; q++) { c.fillStyle = `rgba(${R() < 0.5 ? '30,55,22' : '90,120,50'},0.5)`; c.beginPath(); c.arc(X(r[0]) + R() * r[2] * kx, Z(r[1]) + R() * r[3] * kz, 3 + R() * 6, 0, 7); c.fill(); } }
  }, { aniso: 16 });
  const pm = new THREE.Mesh(new THREE.PlaneGeometry(PW, PD), new THREE.MeshStandardMaterial({ map: piazza, roughness: 0.62, metalness: 0.02 }));
  pm.rotation.x = -Math.PI / 2; pm.position.set(0, 0.0, PZ.z0 + PD / 2); pm.receiveShadow = true; G.add(pm);
  // panchine e cordoli bassi lungo le strisce
  const pietra2 = new THREE.MeshStandardMaterial({ color: C.cordolo || '#d8cfbf', roughness: 0.7 });
  for (const r of PZ.prati || []) { const b = new THREE.Mesh(new THREE.BoxGeometry(r[2] + 0.3, 0.12, r[3] + 0.3), pietra2); b.position.set(r[0] + r[2] / 2, 0.02, r[1] + r[3] / 2); b.receiveShadow = true; G.add(b); }

  if (PZ.panchine) { const bm2 = new THREE.MeshStandardMaterial({ color: '#cfc6b6', roughness: 0.7 }); for (const r of PZ.aiuole || []) for (const sx of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 2.2), bm2); b.position.set(r[0] + r[2] / 2 + sx * (r[2] / 2 + 1.6), 0.22, r[1] + r[3] / 2); b.castShadow = b.receiveShadow = true; G.add(b); } }
  // ---------- alberi tondi (filari e macchie), con colori diversi ----------
  const alberi = []; for (const f of p.alberi || []) { if (f.fila) { const [x0, z0, x1, z1] = f.fila, nn = f.n; for (let i = 0; i < nn; i++) { const t = nn > 1 ? i / (nn - 1) : 0; alberi.push([lerp(x0, x1, t) + (R() - 0.5) * (f.jit || 1), lerp(z0, z1, t) + (R() - 0.5) * (f.jit || 1), (f.s || 1) * (0.85 + R() * 0.3)]); } }
    else { for (let i = 0; i < f.n; i++) { const a = R() * Math.PI * 2, r = Math.sqrt(R()) * f.r, x = f.x + Math.cos(a) * r, z = f.z + Math.sin(a) * r; if (p.vuoti && p.vuoti(x, z)) continue; alberi.push([x, z, (f.s || 1) * (0.7 + R() * 0.6)]); } } }
  const tg = alberoGeo(R), tronchi = tg.tronco, chiome = tg.chioma;
  const IM = (geo, mat, list, shadow) => { const m = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length)); m.count = list.length; const M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color();
    list.forEach(([x, z, s], i) => { e.set(0, R() * 6.28, 0); q.setFromEuler(e); const sw = s * (0.8 + R() * 0.4); M4.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(sw, s * (0.85 + R() * 0.55), sw * (0.85 + R() * 0.3))); m.setMatrixAt(i, M4); col.setHSL(0.24 + (R() - 0.5) * 0.05, 0.42 + R() * 0.15, 0.72 + R() * 0.28); m.setColorAt(i, col); });
    m.castShadow = shadow; m.receiveShadow = true; return m; };
  G.add(IM(tronchi, new THREE.MeshStandardMaterial({ color: 0x5b4a3a, roughness: 0.9 }), alberi, true));
  G.add(IM(chiome, new THREE.MeshStandardMaterial({ color: C.chioma || '#5f7f3e', roughness: 0.85 }), alberi, true));

  // ---------- gente piccola (solo traccia: sagome scure lontane) ----------
  if (p.gente) { const q = p.gente, pm2 = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }), L = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.19, 1.3, 3, 8).translate(0, 0.84, 0), pm2, q.n), col = new THREE.Color(), M4 = new THREE.Matrix4(); let k2 = 0;
    for (let i = 0; i < q.n * 4 && k2 < q.n; i++) { const x = (R() - 0.5) * q.w, z = q.z0 + R() * q.d; if (p.vuoti && p.vuoti(x, z)) continue; const hh = 0.9 + R() * 0.15; M4.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion(), new THREE.Vector3(1, hh, 1)); L.setMatrixAt(k2, M4); col.set(['#2b2a29', '#3c3a37', '#6a5f55', '#55504a', '#1e2026', '#7d6a5a'][Math.floor(R() * 6)]); L.setColorAt(k2, col); k2++; }
    L.count = k2; L.castShadow = true; G.add(L); }

  // ---------- città bassa nella foschia + skyline vera (se c'è) ----------
  const ct = p.citta || {}, blocks = [];
  for (let q = 0; q < (ct.n || 0) * 3 && blocks.length < (ct.n || 0); q++) { const a = R() * Math.PI * 2, r = lerp(ct.da, ct.a, Math.sqrt(R())), x = Math.cos(a) * r, z = Math.sin(a) * r; if (p.vuoti && p.vuoti(x, z)) continue; if (ct.libero && ct.libero(x, z)) continue;
    blocks.push({ x, z, w: 18 + R() * 40, d: 18 + R() * 40, h: lerp(ct.h[0], ct.h[1], Math.pow(R(), 1.6)), rot: (R() - 0.5) * 0.3 }); }
  for (const t of ct.torri || []) { if (t.forma === 'burj') { G.add(burj(t)); continue; } blocks.push({ x: t.x, z: t.z, w: t.w || 34, d: t.d || 34, h: t.h, rot: t.rot || 0, torre: true }); }
  const bm = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.25, emissive: 0xffc58a, emissiveIntensity: 0, emissiveMap: finestreTex() }); bm.userData.notte = ct.luce ?? 0.8;
  const city = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), bm, Math.max(1, blocks.length)); city.count = blocks.length; city.name = 'citta';
  const M4 = new THREE.Matrix4(), col = new THREE.Color();
  blocks.forEach((b, i) => { M4.compose(new THREE.Vector3(b.x, 0, b.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, b.rot, 0)), new THREE.Vector3(b.w, b.h, b.d)); city.setMatrixAt(i, M4); col.set(b.torre ? C.torriCitta || '#9aa6b4' : C.citta[Math.floor(R() * C.citta.length)]); city.setColorAt(i, col); });
  city.castShadow = true; city.receiveShadow = true; G.add(city);
  return { gruppo: G, luci: [bm] };
}

function burj(t) {   // Burj Khalifa riconoscibile: tre ali a Y che salgono a gradoni, poi la guglia (828 m, fonte Wikipedia/CTBUH)
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: '#c9d0d8', metalness: 0.85, roughness: 0.18 }), H = t.h, k = H / 828;
  const tappe = [[0, 30], [140, 27], [230, 23], [320, 19], [400, 15], [470, 11], [540, 8], [600, 5.5]];
  tappe.forEach(([y0, r], i) => { const y1 = (tappe[i + 1] ? tappe[i + 1][0] : 640) * k; for (let a = 0; a < 3; a++) { const ala = new THREE.Mesh(new THREE.BoxGeometry(r * 1.0, y1 - y0 * k, r * 2.3), m); const ang = a * Math.PI * 2 / 3 + (i % 2) * 0.12; ala.position.set(t.x + Math.sin(ang) * r * 0.9, (y0 * k + y1) / 2, t.z + Math.cos(ang) * r * 0.9); ala.rotation.y = ang; ala.castShadow = true; g.add(ala); }
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r * 0.8, y1 - y0 * k, 24), m); c.position.set(t.x, (y0 * k + y1) / 2, t.z); g.add(c); });
  const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 4.5, (828 - 640) * k, 12), m); sp.position.set(t.x, (640 + (828 - 640) / 2) * k, t.z); g.add(sp);
  return g;
}
function alberoGeo(R) {   // tronco + chioma tonda fatta di 6 sfere morbide (latifoglia come nella foto)
  const t = new THREE.CylinderGeometry(0.16, 0.26, 4.2, 6).translate(0, 2.1, 0);
  const parts = []; const P = [[0, 6.6, 0, 2.6], [1.5, 6.1, 0.4, 1.9], [-1.4, 6.2, -0.3, 2.0], [0.3, 7.8, -0.5, 1.8], [-0.4, 5.6, 1.3, 1.7], [0.6, 5.7, -1.4, 1.7]];
  for (const [x, y, z, r] of P) { const g = new THREE.SphereGeometry(r, 18, 12); const pa = g.attributes.position; for (let i = 0; i < pa.count; i++) { const k = 1 + (Math.sin(pa.getX(i) * 3.1 + pa.getY(i) * 2.3) * 0.07) + Math.sin(pa.getZ(i) * 4.7) * 0.04; pa.setXYZ(i, pa.getX(i) * k, pa.getY(i) * k * 0.92, pa.getZ(i) * k); } g.translate(x, y, z); parts.push(g.toNonIndexed()); }
  const ch = merge(parts); return { tronco: t, chioma: ch };
}
function finestreTex() {
  return canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); const R = rng(77);
    for (let y = 8; y < h; y += 16) for (let x = 6; x < w; x += 12) if (R() < 0.45) { c.fillStyle = `rgba(255,${190 + R() * 50},${120 + R() * 60},${0.5 + R() * 0.5})`; c.fillRect(x, y, 6, 8); } });
}
