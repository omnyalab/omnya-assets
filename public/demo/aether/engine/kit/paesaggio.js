// Motore choose-your · paesaggio intorno al soggetto: terreno dipinto, parco verde, strade che curvano con i lampioni,
// alberi e palme a macchie, città bassa all'orizzonte, qualche torre lontana nella foschia.
import * as THREE from 'three';
import { canvasTex, rng, noise2, fbm, lerp, clamp, merge, unisci } from './forme.js';

// p.strade: [{ punti: [[x,z],...], largh, lampioni, chiusa }]; p.vuoti: funzione (x,z) => true dove non vanno alberi (soggetto, piazze)
export function paesaggio(p) {
  const G = new THREE.Group(); G.name = 'paesaggio'; const R = rng(p.seme || 3), S = p.lato, half = S / 2, n = noise2(p.seme || 3);
  // maschera del verde (0..1) calcolata su griglia bassa
  const MG = 512, mask = new Float32Array(MG * MG);
  for (let j = 0; j < MG; j++) for (let i = 0; i < MG; i++) {
    const x = (i / MG - 0.5) * S, z = (j / MG - 0.5) * S; let m = 0;
    for (const v of p.verde) { const dx = (x - v.x) / v.rx, dz = (z - v.z) / v.rz, r = Math.hypot(dx, dz) + (fbm(n, x / 260, z / 260, 3) - 0.5) * 0.55; m = Math.max(m, clamp((1 - r) / 0.18)); }
    mask[j * MG + i] = m;
  }
  const greenAt = (x, z) => { const i = clamp(Math.floor((x / S + 0.5) * MG), 0, MG - 1), j = clamp(Math.floor((z / S + 0.5) * MG), 0, MG - 1); return mask[j * MG + i]; };
  const roads = (p.strade || []).map(r => ({ ...r, P: smoothPath(r.punti, r.chiusa) }));
  const distRoad = (x, z) => { let best = 1e9; for (const r of roads) for (let i = 0; i < r.P.length - 1; i += 2) { const a = r.P[i], b = r.P[i + 1] || r.P[i]; best = Math.min(best, segDist(x, z, a, b) - r.largh / 2); } return best; };

  // terreno dipinto
  const TX = 4096, k = TX / S;
  const ground = canvasTex(TX, TX, (c) => {
    const low = document.createElement('canvas'); low.width = low.height = MG; const lx = low.getContext('2d'), im = lx.createImageData(MG, MG);
    for (let j = 0; j < MG; j++) for (let i = 0; i < MG; i++) {
      const x = (i / MG - 0.5) * S, z = (j / MG - 0.5) * S, m = mask[j * MG + i], v = fbm(n, x / 90, z / 90, 4), o = (j * MG + i) * 4;
      const des = p.colori.terra, gr = p.colori.prato, dk = p.colori.pratoScuro;
      const g2 = lerp(gr[0], dk[0], v), g3 = lerp(gr[1], dk[1], v), g4 = lerp(gr[2], dk[2], v), dv = (v - 0.5) * 26;
      im.data[o] = lerp(des[0] + dv, g2, m); im.data[o + 1] = lerp(des[1] + dv, g3, m); im.data[o + 2] = lerp(des[2] + dv * 0.8, g4, m); im.data[o + 3] = 255;
    }
    lx.putImageData(im, 0, 0); c.imageSmoothingQuality = 'high'; c.drawImage(low, 0, 0, TX, TX);
    // isolati della città: righe di lotti chiari fuori dal verde
    c.globalAlpha = 0.5;
    for (let q = 0; q < (p.citta.lotti ?? 9000); q++) { const x = (R() - 0.5) * S, z = (R() - 0.5) * S; if (greenAt(x, z) > 0.05 || Math.hypot(x, z) < p.citta.da) continue;
      c.fillStyle = R() < 0.5 ? '#cdbca0' : '#bfae92'; c.fillRect((x + half) * k, (z + half) * k, (14 + R() * 30) * k, (14 + R() * 30) * k); }
    c.globalAlpha = 1;
    // strade
    for (const r of roads) {
      c.lineCap = c.lineJoin = 'round';
      c.strokeStyle = r.colore || '#3a3836'; c.lineWidth = r.largh * k; path(c, r.P, k, half, r.chiusa); c.stroke();
      if (r.mezzeria) { c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 0.3 * k; c.setLineDash([3 * k, 6 * k]); path(c, r.P, k, half, r.chiusa); c.stroke(); c.setLineDash([]); }
    }
    for (const pz of p.piazze || []) pz.disegna(c, k, half);
  }, { repeat: [1, 1] });
  // strade e sentieri che si accendono la sera (mappa di luce sul terreno)
  const glow = canvasTex(2048, 2048, (c) => { const k2 = 2048 / S; c.fillStyle = '#000'; c.fillRect(0, 0, 2048, 2048); c.lineCap = c.lineJoin = 'round';
    for (const r of roads) { if (r.luce === false) continue; c.strokeStyle = r.luceColore || p.luceColore || '#ffb066'; c.shadowColor = r.luceColore || p.luceColore || '#ffa050'; c.shadowBlur = 10; c.lineWidth = Math.max(1.2, r.largh * k2 * (r.luceLarg ?? 0.5)); path(c, r.P, k2, half, r.chiusa); c.stroke(); }
    for (const pz of p.piazze || []) if (pz.luce) pz.luce(c, k2, half); }, { repeat: [1, 1] });
  const gm = new THREE.Mesh(new THREE.PlaneGeometry(S, S), new THREE.MeshStandardMaterial({ map: ground, roughness: 0.96, emissive: 0xffffff, emissiveMap: glow, emissiveIntensity: 0 }));
  gm.material.userData.notte = p.luceStrade ?? 1.1;
  if (p.buco) {   // catino interrato: il terreno ha un buco sulla pianta dello stadio (alphaTest), così il campo si vede sotto la quota della piazza
    gm.material.alphaMap = canvasTex(2048, 2048, (c) => { const k2 = 2048 / S; c.fillStyle = '#fff'; c.fillRect(0, 0, 2048, 2048); c.fillStyle = '#000'; c.beginPath(); p.buco.forEach(([x, z], i) => i ? c.lineTo((x + half) * k2, (z + half) * k2) : c.moveTo((x + half) * k2, (z + half) * k2)); c.closePath(); c.fill(); }, { srgb: false });
    gm.material.alphaTest = 0.5;
  }
  gm.rotation.x = -Math.PI / 2; gm.position.y = -0.05; gm.receiveShadow = true; G.add(gm);
  // terreno oltre il quadrato, in tinta, fino alla foschia
  const far = new THREE.Mesh(new THREE.RingGeometry(S * 0.5, S * 6, 64), new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(...p.colori.terra.map(v => v / 255)).convertSRGBToLinear(), roughness: 1 }));
  far.rotation.x = -Math.PI / 2; far.position.y = -0.1; G.add(far);

  // alberi a macchie (tondi) e palme lungo i viali
  const trees = [], palms = [];
  for (let q = 0; q < p.alberi * 6 && trees.length < p.alberi; q++) {
    const x = (R() - 0.5) * S * 0.9, z = (R() - 0.5) * S * 0.9, m = greenAt(x, z), cl = fbm(n, x / 70 + 40, z / 70, 3);
    if (m < 0.5 || cl < 0.48 || (p.vuoti && p.vuoti(x, z)) || distRoad(x, z) < 5) continue; trees.push([x, z, 0.7 + R() * 0.7]);
  }
  for (const r of roads) if (r.palme) for (let i = 0; i < r.P.length; i += r.palme) { const a = r.P[i], b = r.P[Math.min(i + 1, r.P.length - 1)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
    for (const s of [-1, 1]) { const x = a[0] - dz / l * s * (r.largh / 2 + 3), z = a[1] + dx / l * s * (r.largh / 2 + 3); if (!(p.vuoti && p.vuoti(x, z))) palms.push([x, z, 0.85 + R() * 0.3]); } }
  G.add(instanced(treeGeo(), new THREE.MeshStandardMaterial({ color: p.colori.alberi, roughness: 0.9, flatShading: true }), trees, R, true));
  const palm = palmGeo(); G.add(instanced(palm.trunk, new THREE.MeshStandardMaterial({ color: 0x8a7255, roughness: 0.9 }), palms, R, false));
  G.add(instanced(palm.crown, new THREE.MeshStandardMaterial({ color: p.colori.palme, roughness: 0.85, side: THREE.DoubleSide, flatShading: true }), palms, R, false));

  // lampioni (si accendono la sera)
  const lampPts = []; for (const r of roads) if (r.lampioni) for (let i = 0; i < r.P.length; i += r.lampioni) { const a = r.P[i]; lampPts.push([a[0], a[1]]); }
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffb36b }); lampMat.userData.sera = true;
  const lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(1.1, 6, 4), lampMat, Math.max(1, lampPts.length)); lamps.count = lampPts.length; lamps.name = 'lampioni';
  const M4 = new THREE.Matrix4(); lampPts.forEach(([x, z], i) => { M4.makeTranslation(x, 9, z); lamps.setMatrixAt(i, M4); }); G.add(lamps);

  // città bassa + torri lontane
  const blocks = [];
  for (let q = 0; q < p.citta.edifici * 4 && blocks.length < p.citta.edifici; q++) {
    const ang = R() * Math.PI * 2, rad = lerp(p.citta.da, p.citta.a, Math.sqrt(R())), x = Math.cos(ang) * rad, z = Math.sin(ang) * rad;
    if (greenAt(x, z) > 0.05 || distRoad(x, z) < 18) continue;
    const tall = R() < p.citta.torri ? lerp(60, p.citta.hMax, R() ** 2) : p.citta.h ? lerp(p.citta.h[0], p.citta.h[1], R()) : 6 + R() * 18; blocks.push({ x, z, w: 16 + R() * 34, d: 16 + R() * 34, h: tall });
  }
  const bm = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, emissive: 0xffc58a, emissiveIntensity: 0, emissiveMap: windowsTex() });
  bm.userData.notte = p.citta.luce ?? 0.9;
  const city = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), bm, blocks.length); city.name = 'citta';
  const C = new THREE.Color();
  blocks.forEach((b, i) => { M4.compose(new THREE.Vector3(b.x, 0, b.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, R() * 0.2, 0)), new THREE.Vector3(b.w, b.h, b.d)); city.setMatrixAt(i, M4);
    C.set(p.colori.citta[Math.floor(R() * p.colori.citta.length)]); city.setColorAt(i, C); });
  city.castShadow = true; city.receiveShadow = true; G.add(city);
  extra(p, G, R, greenAt, distRoad);
  G.position.y = p.quota || 0;   // quota della piazza (0 = come il campo)
  return { gruppo: G, luci: [bm, gm.material], lampioni: lampMat, verde: greenAt };
}

// ---------- utilità ----------
function smoothPath(pts, closed, step = 4) {   // Catmull-Rom centripeta campionata a passo fisso (metri)
  const v = pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), cu = new THREE.CatmullRomCurve3(v, !!closed, 'centripetal');
  const n = Math.max(8, Math.round(cu.getLength() / step)); return cu.getSpacedPoints(n).map(q => [q.x, q.z]);
}
function path(c, P, k, half, closed) { c.beginPath(); P.forEach(([x, z], i) => i ? c.lineTo((x + half) * k, (z + half) * k) : c.moveTo((x + half) * k, (z + half) * k)); if (closed) c.closePath(); }
function segDist(x, z, a, b) { const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1, t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / l2); return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz); }
function instanced(geo, mat, list, R, shadow) {
  const m = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length)); m.count = list.length; const M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), C = new THREE.Color();
  list.forEach(([x, z, s], i) => { e.set(0, R() * 6.28, 0); q.setFromEuler(e); M4.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(s, s * (0.85 + R() * 0.3), s)); m.setMatrixAt(i, M4);
    C.setHSL(0, 0, 0.82 + R() * 0.3); m.setColorAt(i, C); });
  m.castShadow = shadow; m.receiveShadow = true; return m;
}
function acaciaGeo() { const t = new THREE.CylinderGeometry(0.22, 0.35, 4.2, 5).translate(0, 2.1, 0), c = new THREE.IcosahedronGeometry(4.2, 0).scale(1.25, 0.32, 1.1).translate(0.4, 4.9, 0), c2 = new THREE.IcosahedronGeometry(2.6, 0).scale(1.2, 0.35, 1).translate(-1.8, 4.4, 1); return merge([t.toNonIndexed(), c.toNonIndexed(), c2.toNonIndexed()]); }
function treeGeo() { const t = new THREE.CylinderGeometry(0.25, 0.35, 3, 5).translate(0, 1.5, 0), c = new THREE.IcosahedronGeometry(3.2, 0).scale(1, 0.8, 1).translate(0, 5, 0), c2 = new THREE.IcosahedronGeometry(2.2, 0).translate(1.4, 6.2, 0.6); return merge([t.toNonIndexed(), c.toNonIndexed(), c2.toNonIndexed()]); }
function palmGeo() {
  const trunk = new THREE.CylinderGeometry(0.22, 0.32, 9, 5).translate(0, 4.5, 0); const leaves = [];
  for (let i = 0; i < 9; i++) { const l = new THREE.PlaneGeometry(0.9, 4.2, 1, 3); const pa = l.attributes.position; for (let j = 0; j < pa.count; j++) { const y = pa.getY(j) + 2.1; pa.setY(j, y); pa.setZ(j, -0.09 * y * y); }
    l.rotateX(-Math.PI / 2 + 0.55); l.rotateY(i / 9 * Math.PI * 2); l.translate(0, 9, 0); leaves.push(l.toNonIndexed()); }
  return { trunk, crown: merge(leaves) };
}
function windowsTex() {
  return canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); const R = rng(77);
    for (let y = 8; y < h; y += 16) for (let x = 6; x < w; x += 12) if (R() < 0.45) { c.fillStyle = `rgba(255,${190 + R() * 50},${120 + R() * 60},${0.5 + R() * 0.5})`; c.fillRect(x, y, 6, 8); } });
}

// ---------- pezzi in più (facoltativi, dal soggetto): padiglioni a tetto verde, campi d'allenamento, viadotto della metro,
// pannelli solari, alberi sparsi nel deserto, capannoni. Servono allo stadio 2034 (render Populous), le torri non li usano.
function extra(p, G, R, greenAt, distRoad) {
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), Sc = new THREE.Vector3();
  if (p.padiglioni) {   // cunei col tetto verde inclinato e la vetrata accesa sul lato basso
    const roofs = [], walls = [], glass = [];
    for (const b of p.padiglioni) {
      const { x, z, w, d, h, rot } = b, ca = Math.cos(rot), sa = Math.sin(rot), P = (u, v, y) => [x + u * ca - v * sa, y, z + u * sa + v * ca];
      if (b.forma === 'tri') {   // scheggia: lato davanti basso e vetrato, punta dietro alta (tetto verde inclinato a triangolo)
        const hf = Math.max(1.6, h * 0.22), A = P(-w / 2, d / 2, hf), B = P(w / 2, d / 2, hf), Cc = P((b.storto || 0) * w, -d / 2, h);
        roofs.push(quad(A, B, Cc, Cc));
        glass.push(quad([A[0], hf * 0.95, A[2]], [B[0], hf * 0.95, B[2]], [B[0], 0.2, B[2]], [A[0], 0.2, A[2]]));
        for (const [U, V2] of [[B, Cc], [Cc, A]]) walls.push(quad([U[0], U[1], U[2]], [V2[0], V2[1], V2[2]], [V2[0], 0, V2[2]], [U[0], 0, U[2]]));
        continue;
      }
      const hb = h, hf = Math.max(1.2, h * 0.25);   // dietro alto, davanti basso (il tetto scende verso la piazza)
      const c = [P(-w / 2, -d / 2, hb), P(w / 2, -d / 2, hb), P(w / 2, d / 2, hf), P(-w / 2, d / 2, hf)], mid = P((b.storto || 0) * w, 0, (hb + hf) / 2 + h * 0.18);
      roofs.push(quad(c[0], c[1], mid, mid), quad(c[1], c[2], mid, mid), quad(c[2], c[3], mid, mid), quad(c[3], c[0], mid, mid));
      const g0 = [P(-w / 2, d / 2, 0), P(w / 2, d / 2, 0)];
      glass.push(quad([g0[0][0], hf * 0.92, g0[0][2]], [g0[1][0], hf * 0.92, g0[1][2]], [g0[1][0], 0.2, g0[1][2]], [g0[0][0], 0.2, g0[0][2]]));
      const b0 = [P(-w / 2, -d / 2, 0), P(w / 2, -d / 2, 0)];
      walls.push(quad([b0[1][0], hb, b0[1][2]], [b0[0][0], hb, b0[0][2]], b0[0], b0[1]));
      for (const s of [-1, 1]) { const A = P(s * w / 2, -d / 2, 0), B = P(s * w / 2, d / 2, 0); walls.push(quad([A[0], hb, A[2]], [B[0], hf, B[2]], B, A, s > 0)); }
    }
    const gT = canvasTex(256, 256, (c, w, h) => { const n = noise2(5), im = c.createImageData(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = fbm(n, x / 6, y / 6, 3), o = (y * w + x) * 4; im.data[o] = 80 + v * 60; im.data[o + 1] = 118 + v * 70; im.data[o + 2] = 44 + v * 24; im.data[o + 3] = 255; } c.putImageData(im, 0, 0); }, { repeat: [1, 1] });
    const rm = new THREE.Mesh(unisci(roofs), new THREE.MeshStandardMaterial({ map: gT, color: '#b4d49a', roughness: 0.96, flatShading: true, side: THREE.DoubleSide, emissive: new THREE.Color('#ffb066'), emissiveIntensity: 0 }));
    rm.material.userData.notte = 0.04;
    const wm = new THREE.Mesh(unisci(walls), new THREE.MeshStandardMaterial({ color: p.colori.muri || '#a87650', roughness: 0.92, side: THREE.DoubleSide }));
    const gm = new THREE.Mesh(unisci(glass), new THREE.MeshStandardMaterial({ color: '#2a2420', roughness: 0.15, metalness: 0.5, emissive: new THREE.Color('#ffbd78'), emissiveIntensity: 0, side: THREE.DoubleSide }));
    gm.material.userData.notte = 2.4;
    for (const m of [rm, wm, gm]) { m.castShadow = m !== gm; m.receiveShadow = true; G.add(m); }
  }
  if (p.gente) {   // persone a puntini nella piazza intorno allo stadio (da lontano danno la vita della sera)
    const q = p.gente, pm = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }), L = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.28, 0.32, 1.7, 5).translate(0, 0.85, 0), pm, q.n), C = new THREE.Color(); let k = 0;
    for (let i = 0; i < q.n * 3 && k < q.n; i++) { const a = R() * Math.PI * 2, r = q.da + Math.sqrt(R()) * (q.a - q.da), x = Math.cos(a) * r * (q.sx || 1), z = Math.sin(a) * r; if (distRoad(x, z) > 6 && R() < 0.6) continue;
      M4.makeTranslation(x, 0, z); L.setMatrixAt(k, M4); C.set(R() < 0.5 ? '#f2f0ea' : R() < 0.6 ? '#1d7a40' : '#2a2622'); L.setColorAt(k, C); k++; }
    L.count = k; G.add(L);
  }
  if (p.campi) {   // campi d'allenamento: prato a strisce, righe bianche, accesi la sera
    const fT = canvasTex(512, 340, (c, w, h) => { c.fillStyle = '#3f7d34'; c.fillRect(0, 0, w, h); for (let i = 0; i < 12; i++) { c.fillStyle = i % 2 ? '#478a3b' : '#3b7430'; c.fillRect(i * w / 12, 0, w / 12 + 1, h); }
      c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 3; c.strokeRect(14, 12, w - 28, h - 24); c.beginPath(); c.moveTo(w / 2, 12); c.lineTo(w / 2, h - 12); c.stroke(); c.beginPath(); c.arc(w / 2, h / 2, 34, 0, 7); c.stroke(); c.strokeRect(14, h / 2 - 70, 70, 140); c.strokeRect(w - 84, h / 2 - 70, 70, 140); });
    const mat = new THREE.MeshStandardMaterial({ map: fT, roughness: 0.9, emissive: new THREE.Color('#e8f4d8'), emissiveMap: fT, emissiveIntensity: 0 }); mat.userData.notte = 0.22;
    for (const c of p.campi) for (let i = 0; i < (c.n || 1); i++) for (let j = 0; j < (c.m || 1); j++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(105, 68), mat); m.rotation.x = -Math.PI / 2; m.rotation.z = -(c.rot || 0);
      const u = (i - ((c.n || 1) - 1) / 2) * 124, v = (j - ((c.m || 1) - 1) / 2) * 86, ca = Math.cos(c.rot || 0), sa = Math.sin(c.rot || 0);
      m.position.set(c.x + u * ca - v * sa, 0.15, c.z + u * sa + v * ca); m.receiveShadow = true; G.add(m);
    }
  }
  if (p.viadotto) {   // metro sopraelevata: impalcato su piloni, che curva lontano
    const v = p.viadotto, cu = new THREE.CatmullRomCurve3(v.punti.map(([x, z]) => new THREE.Vector3(x, v.h, z)), false, 'centripetal'), n = Math.round(cu.getLength() / 6), pts = cu.getSpacedPoints(n), deck = [], pil = [];
    for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1, nx = -dz / l * v.largo / 2, nz = dx / l * v.largo / 2;
      deck.push(quad([a.x - nx, a.y, a.z - nz], [a.x + nx, a.y, a.z + nz], [b.x + nx, b.y, b.z + nz], [b.x - nx, b.y, b.z - nz]), quad([a.x + nx, a.y, a.z + nz], [a.x + nx, a.y - 2.2, a.z + nz], [b.x + nx, b.y - 2.2, b.z + nz], [b.x + nx, b.y, b.z + nz]), quad([a.x - nx, a.y - 2.2, a.z - nz], [a.x - nx, a.y, a.z - nz], [b.x - nx, b.y, b.z - nz], [b.x - nx, b.y - 2.2, b.z - nz]));
      if (i % 6 === 0) { const g = new THREE.BoxGeometry(2.2, v.h, 2.2); g.translate(a.x, v.h / 2 - 2, a.z); pil.push(g.toNonIndexed()); } }
    const m = new THREE.Mesh(unisci([...deck, ...pil]), new THREE.MeshStandardMaterial({ color: '#cfc4b2', roughness: 0.85, side: THREE.DoubleSide })); m.castShadow = m.receiveShadow = true; G.add(m);
    const lm = new THREE.MeshBasicMaterial({ color: 0xffc27a }); lm.userData.sera = true; const L = new THREE.InstancedMesh(new THREE.SphereGeometry(0.9, 6, 4), lm, Math.ceil(pts.length / 3));
    let k = 0; for (let i = 0; i < pts.length; i += 3) { M4.makeTranslation(pts[i].x, v.h + 1.2, pts[i].z); L.setMatrixAt(k++, M4); } L.count = k; G.add(L);
  }
  if (p.pannelli) {   // campi di pannelli solari (rettangoli blu scuri a righe)
    const pT = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#1d2a44'; c.fillRect(0, 0, w, h); c.fillStyle = '#3c4f73'; for (let y = 0; y < h; y += 16) c.fillRect(0, y, w, 10); }, { repeat: [8, 8] });
    for (const q of p.pannelli) { const m = new THREE.Mesh(new THREE.PlaneGeometry(q.w, q.d), new THREE.MeshStandardMaterial({ map: pT, roughness: 0.35, metalness: 0.3 })); m.rotation.x = -Math.PI / 2; m.rotation.z = -(q.rot || 0); m.position.set(q.x, 0.4, q.z); G.add(m); }
  }
  if (p.capannoni) {   // grandi edifici bassi (palazzetti, centri sportivi), tetto verde o terra, finestre calde
    const bT = canvasTex(256, 128, (c, w, h) => { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); for (let x = 4; x < w; x += 10) { c.fillStyle = `rgba(255,${200 + (x % 30)},140,0.9)`; c.fillRect(x, h * 0.25, 6, h * 0.5); } }, { srgb: false });
    for (const q of p.capannoni) { const g = new THREE.BoxGeometry(q.w, q.h, q.d); g.translate(0, q.h / 2, 0); const m = new THREE.Mesh(g, [0, 1, 2, 3, 4, 5].map(i => i === 2 ? new THREE.MeshStandardMaterial({ color: q.tetto || '#5d7a3c', roughness: 0.95 }) : Object.assign(new THREE.MeshStandardMaterial({ color: q.colore || '#a8805c', roughness: 0.9, emissive: new THREE.Color('#ffbf80'), emissiveMap: bT, emissiveIntensity: 0 }), { userData: { notte: 1.2 } })));
      m.rotation.y = q.rot || 0; m.position.set(q.x, 0, q.z); m.castShadow = m.receiveShadow = true; G.add(m); }
  }
  if (p.alberiSparsi) {   // savana: alberi radi fino all'orizzonte, fuori dal verde
    const s = p.alberiSparsi, list = []; for (let q = 0; q < s.n * 3 && list.length < s.n; q++) { const a = R() * Math.PI * 2, r = s.da + Math.sqrt(R()) * (s.a - s.da), x = Math.cos(a) * r, z = Math.sin(a) * r; if (distRoad(x, z) < 8 || (p.vuoti && p.vuoti(x, z))) continue; list.push([x, z, 0.9 + R() * 1.1]); }
    G.add(instanced(s.forma === 'acacia' ? acaciaGeo() : treeGeo(), new THREE.MeshStandardMaterial({ color: s.colore || '#3d5530', roughness: 0.95, flatShading: true }), list, R, false));
  }
  if (p.luciSparse) {   // case lontane: solo puntini caldi nella savana scura
    const s = p.luciSparse, lm = new THREE.MeshBasicMaterial({ color: s.colore || 0xffc07a }); lm.userData.sera = true;
    const L = new THREE.InstancedMesh(new THREE.SphereGeometry(1.6, 6, 4), lm, s.n); let k = 0;
    for (let q = 0; q < s.n * 3 && k < s.n; q++) { const a = R() * Math.PI * 2, r = s.da + Math.sqrt(R()) * (s.a - s.da), x = Math.cos(a) * r, z = Math.sin(a) * r; if (p.vuoti && p.vuoti(x, z)) continue;
      const n0 = 1 + Math.floor(R() * 4); for (let j = 0; j < n0 && k < s.n; j++) { M4.makeTranslation(x + (R() - 0.5) * 60, 2.5, z + (R() - 0.5) * 60); L.setMatrixAt(k++, M4); } }
    L.count = k; G.add(L);
  }
  function quad(a, b, c, d, flip) { const pos = flip ? [...a, ...c, ...b, ...a, ...d, ...c] : [...a, ...b, ...c, ...a, ...c, ...d]; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const uv = []; for (let i = 0; i < 6; i++) uv.push(pos[i * 3] / 20, pos[i * 3 + 2] / 20); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); return g; }
}
