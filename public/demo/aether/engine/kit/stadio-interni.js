// Motore choose-your · dentro lo stadio 2034: fascia LED verde a 360° sotto il soffitto (logo Saudi 2034), nastri LED sulle
// balconate degli skybox, cartelloni a bordo campo, pubblico (un omino per posto, a istanze) e giocatori che corrono piano.
// Come nel render interno Populous (web6): tutto pieno di tifosi in verde e bianco, luci verdi tutto intorno.
import * as THREE from 'three';
import { sweepProfile, canvasTex, rng, lerp, clamp, unisci, sePoint } from './forme.js';

export function interni(info, p, R) {
  const G = new THREE.Group(); G.name = 'interni';
  const plan = info.plan, tiers = info.tiers, last = tiers[tiers.length - 1], tt = p.tetto, I = p.interni || {};
  let logo = null; const pronta = new Promise(res => { const im = new Image(); im.onload = () => { logo = im; res(); }; im.onerror = () => res(); im.src = new URL('../../assets/loghi/saudi-2034.svg', import.meta.url).href; });

  // ---------- fascia LED a 360° (in cima all'anello alto, fino al soffitto, bordo alto ondulato come nel render interno) ----------
  const dB = last.dEnd + 0.45, y0 = last.yEnd + 1.25, yC = (tt.hSottoFondo ?? tt.hSotto ?? Math.min(tt.hRim, tt.hSpalla) - tt.spessore) - 0.35, hB = yC - y0;
  { const NB = 2880, pos = [], uv = [], idx = []; let acc = 0, px, pz; const pl = plan(dB);
    for (let i = 0; i <= NB; i++) { const th = i / NB * Math.PI * 2, [x, z] = sePoint(pl.a, pl.b, pl.n, th); if (i) acc += Math.hypot(x - px, z - pz); px = x; pz = z;
      const top = yC - 1.6 + Math.sin(th * 16 + 0.7) * 1.2 + Math.sin(th * 5 + 2) * 0.5; pos.push(x, y0, z, x, top, z); uv.push(acc / (I.ledPasso || 150), 0, acc / (I.ledPasso || 150), (top - y0) / hB);
      if (i) { const o = (i - 1) * 2; idx.push(o, o + 2, o + 1, o + 1, o + 2, o + 3); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const band = new THREE.Mesh(g, ledMat(8192, 640, (c, w, h) => schermo(c, w, h, logo), hB, 8, 1.0)); band.name = 'fascia-led'; G.add(band);
    // cornice scura sotto lo schermo (la passerella in cima all'anello alto)
    G.add(new THREE.Mesh(sweepProfile([[dB - 0.05, y0 - 0.25], [dB - 0.05, y0 + 0.02]], plan, 1440, 1), new THREE.MeshStandardMaterial({ color: '#1b1d1c', roughness: 0.6 }))); }
  // ---------- nastri LED sulle balconate degli anelli 2 e 3 ----------
  for (let k = 1; k < tiers.length; k++) { const t = tiers[k], a = t.y0 - 0.2, b = t.y0 + 1.07, h = b - a;
    G.add(new THREE.Mesh(sweepProfile([[t.d0 - 0.56, a], [t.d0 - 0.56, b]], plan, 1440, h), ledMat(2048, 128, (c, w, hh) => fasciaLed(c, w, hh, logo, 'nastro'), h, 16)));
    const so = p.soffitto ?? 2.6, a2 = t.y0 - so, b2 = t.y0 - so + 0.45;   // riga verde sottile sotto la balconata (sopra i vetri degli skybox)
    G.add(new THREE.Mesh(sweepProfile([[t.d0 - 0.5, a2], [t.d0 - 0.5, b2]], plan, 1440, 1), ledMat(64, 8, (c, w, hh) => { c.fillStyle = '#5dff7a'; c.fillRect(0, 0, w, hh); }, 1, 1, 1.4)));
    const pv = tiers[k - 1]; if (pv.vano) { const d = pv.vano.d - 0.15; G.add(new THREE.Mesh(sweepProfile([[d, pv.vano.y0 - 0.05], [d, pv.vano.y0 + 0.28]], plan, 1440, 1), ledMat(64, 8, (c, w, hh) => { c.fillStyle = '#46e86a'; c.fillRect(0, 0, w, hh); }, 1, 1, 1.1))); } }
  // muro davanti alla prima fila: tabelloni LED continui (niente muro bianco)
  { const t0 = tiers[0], h = t0.y0 + 1.0; G.add(new THREE.Mesh(sweepProfile([[-1.26, 0.15], [-1.26, h]], plan, 1440, h), ledMat(2048, 160, (c, w, hh) => fasciaLed(c, w, hh, logo, 'bordo'), h, 12.8, 0.5))); }
  // ---------- cartelloni a bordo campo ----------
  { const W = 52.5 + 5.5, D = 34 + 4.2, h = 0.95, segs = [[[-W, -D], [W, -D]], [[W, -D], [W, D]], [[W, D], [-W, D]], [[-W, D], [-W, -D]]], geos = [];
    for (const [[x0, z0], [x1, z1]] of segs) { const L = Math.hypot(x1 - x0, z1 - z0), g = new THREE.PlaneGeometry(L, h); g.translate(0, h / 2, 0); g.rotateY(Math.atan2(-(z1 - z0), x1 - x0)); g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
      const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * L / (h * 12)); geos.push(g.toNonIndexed()); }
    const m = new THREE.Mesh(unisci(geos), ledMat(1536, 128, (c, w, hh) => fasciaLed(c, w, hh, logo, 'bordo'), 1, 1)); m.name = 'cartelloni'; G.add(m); }

  // ---------- corrimano bianchi lungo le scale fra i blocchi ----------
  { const geos = []; for (const B of info.blocks) { const t = tiers[B.anello], pts = [];
      for (let r = 0; r < t.rows.length; r += 1) { const row = t.rows[r], pl = plan(row.d), [x, z] = sePoint(pl.a, pl.b, pl.n, B.t0); pts.push(new THREE.Vector3(x, row.y + 0.95, z)); }
      if (pts.length > 2) geos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, 0.025, 5, false).toNonIndexed()); }
    if (geos.length) { const m = new THREE.Mesh(unisci(geos), new THREE.MeshStandardMaterial({ color: '#9aa0a6', roughness: 0.35, metalness: 0.7 })); m.name = 'corrimano'; G.add(m); } }

  // ---------- pubblico: un omino per posto (busto + testa), maglie verdi e bianche ----------
  const S = info.seats, N = S.N, rr = rng(p.seme * 13 + 5);
  const busto = new THREE.BoxGeometry(0.42, 0.52, 0.26); busto.translate(0, 0.74, 0.06);
  const testa = new THREE.SphereGeometry(0.115, 7, 5); testa.scale(1, 1.12, 1); testa.translate(0, 1.13, 0.04);
  const mb = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }), mt = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
  const fB = new THREE.InstancedMesh(busto, mb, N), fT = new THREE.InstancedMesh(testa, mt, N); fB.name = 'folla'; fT.name = 'folla-teste';
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), SC = new THREE.Vector3(), C = new THREE.Color();
  const maglie = I.maglie || [['#147236', 36], ['#1b8a45', 20], ['#0d4f27', 18], ['#e9ebe6', 8], ['#24262a', 10], ['#b9a487', 2]];
  const teste = [['#2e2119', 60], ['#e8e6e0', 26], ['#c24848', 4], ['#6a4a35', 10]];
  const pick = (L) => { let t = 0; for (const [, w] of L) t += w; let x = rr() * t; for (const [c, w] of L) { x -= w; if (x <= 0) return c; } return L[0][0]; };
  const inPiedi = new Uint8Array(N), sc = new Float32Array(N), gira = new Float32Array(N);
  function matrice(i, su) { E.set(su ? 0 : -0.05, S.yaw[i] + gira[i], 0); Q.setFromEuler(E); V.set(S.x[i], S.y[i] + (su ? 0.42 : 0), S.z[i]); SC.set(sc[i], sc[i] * (su ? 1.18 : 1), sc[i]); return M4.compose(V, Q, SC); }
  for (let i = 0; i < N; i++) {
    inPiedi[i] = rr() < (I.inPiedi ?? 0.1) ? 1 : 0; sc[i] = 0.92 + rr() * 0.16; gira[i] = (rr() - 0.5) * 0.4; matrice(i, inPiedi[i]);
    fB.setMatrixAt(i, M4); fT.setMatrixAt(i, M4); C.set(pick(maglie)).offsetHSL(0, 0, (rr() - 0.5) * 0.06); fB.setColorAt(i, C); C.set(pick(teste)); fT.setColorAt(i, C);
  }
  fB.receiveShadow = fT.receiveShadow = true; G.add(fB, fT);
  // bandiere verdi sventolate qua e là (come nei render), visibili solo col pubblico
  const nF = I.bandiere ?? 900, flagG = new THREE.PlaneGeometry(1.3, 0.85, 4, 1); flagG.translate(0.65, 2.05, 0);
  { const pa = flagG.attributes.position; for (let j = 0; j < pa.count; j++) pa.setZ(j, Math.sin(pa.getX(j) * 3.2) * 0.12); flagG.computeVertexNormals(); }
  const flagT = canvasTex(256, 168, (c, w, h) => { c.fillStyle = '#0f7a3a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#f4f4f0'; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); for (let x = 46; x < 212; x += 6) { const y = 70 + Math.sin(x / 9) * 9 + Math.sin(x / 23) * 6; x === 46 ? c.moveTo(x, y) : c.lineTo(x, y); } c.stroke(); c.lineWidth = 5; c.beginPath(); c.moveTo(56, 118); c.lineTo(196, 118); c.stroke(); c.beginPath(); c.moveTo(196, 112); c.lineTo(206, 118); c.lineTo(196, 124); c.stroke(); });
  const fl = new THREE.InstancedMesh(flagG, new THREE.MeshStandardMaterial({ map: flagT, side: THREE.DoubleSide, roughness: 0.8 }), nF); fl.name = 'bandiere';
  const flagSeat = new Int32Array(nF), flagM = [];
  for (let q = 0; q < nF; q++) { const i = Math.floor(rr() * N); flagSeat[q] = i; E.set((rr() - 0.5) * 0.5, rr() * 6.28, (rr() - 0.5) * 0.6); Q.setFromEuler(E); V.set(S.x[i], S.y[i], S.z[i]); SC.set(1, 1, 1); M4.compose(V, Q, SC); fl.setMatrixAt(q, M4); flagM.push(M4.clone()); }
  G.add(fl);
  const follaVis = v => { fB.visible = fT.visible = fl.visible = v; };
  const liberi = new Uint8Array(N);   // posti liberi: nessuno seduto (la disponibilità si vede davvero)
  function soloPresi(preso) { const Z = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < N; i++) { liberi[i] = preso(i) ? 0 : 1; if (liberi[i]) { fB.setMatrixAt(i, Z); fT.setMatrixAt(i, Z); } } fB.instanceMatrix.needsUpdate = fT.instanceMatrix.needsUpdate = true; }
  const toccati = new Set(), coloriB = fB.instanceColor.array.slice(), coloriT = fT.instanceColor.array.slice(), scuri = new Set();
  function liberaPosti(lista, centro = null) {   // i posti scelti restano vuoti (ci sei seduto tu); chi è davanti entro 9 m sta seduto, così la vista è libera
    const Z0 = new THREE.Matrix4().makeScale(0, 0, 0); for (const i of toccati) { if (liberi[i]) { fB.setMatrixAt(i, Z0); fT.setMatrixAt(i, Z0); continue; } matrice(i, inPiedi[i]); fB.setMatrixAt(i, M4); fT.setMatrixAt(i, M4); } toccati.clear();
    const c0 = centro || (lista.length ? [S.x[lista[0]], S.y[lista[0]], S.z[lista[0]]] : null);
    for (const i of scuri) { for (let c = 0; c < 3; c++) { fB.instanceColor.array[i * 3 + c] = coloriB[i * 3 + c]; fT.instanceColor.array[i * 3 + c] = coloriT[i * 3 + c]; } } scuri.clear();
    if (c0) { const [x0, y0, z0] = c0, R2 = (I.sagome ?? 9) ** 2;
      for (let i = 0; i < N; i++) { const dd = (S.x[i] - x0) ** 2 + (S.z[i] - z0) ** 2 + (S.y[i] - y0) ** 2; if (dd < R2) { const k = 0.07 + 0.1 * Math.sqrt(dd / R2); for (let c = 0; c < 3; c++) { fB.instanceColor.array[i * 3 + c] = coloriB[i * 3 + c] * k + 0.01; fT.instanceColor.array[i * 3 + c] = coloriT[i * 3 + c] * k + 0.01; } scuri.add(i); } } }
    fB.instanceColor.needsUpdate = fT.instanceColor.needsUpdate = true;
    const Z = new THREE.Matrix4().makeScale(0, 0, 0);
    if (c0) { const [x0, y0, z0] = c0;
      for (let i = 0; i < N; i++) { if (!inPiedi[i] || liberi[i] || S.y[i] > y0 + 0.2) continue; if ((S.x[i] - x0) ** 2 + (S.z[i] - z0) ** 2 < 81) { matrice(i, 0); fB.setMatrixAt(i, M4); fT.setMatrixAt(i, M4); toccati.add(i); } } }
    for (const i of lista) { fB.setMatrixAt(i, Z); fT.setMatrixAt(i, Z); toccati.add(i); }
    if (c0) for (let i = 0; i < N; i++) { if (S.y[i] < c0[1] - 0.15) continue; if ((S.x[i] - c0[0]) ** 2 + (S.z[i] - c0[2]) ** 2 < (I.vuotoVicino ?? 1.7) ** 2) { fB.setMatrixAt(i, Z); fT.setMatrixAt(i, Z); toccati.add(i); } }
    if (c0 && I.vuotoDavanti) for (let i = 0; i < N; i++) { const vd = centro ? (I.vuotoBox || I.vuotoDavanti) : I.vuotoDavanti; if (S.y[i] >= c0[1] - 0.15 + (centro ? 2 : 0) || S.y[i] < c0[1] - vd[1]) continue; const dx = S.x[i] - c0[0], dz = S.z[i] - c0[2]; if (dx * dx + dz * dz < vd[0] ** 2) { fB.setMatrixAt(i, Z); fT.setMatrixAt(i, Z); toccati.add(i); } }
    for (let q = 0; q < flagSeat.length; q++) { const i = flagSeat[q], vic = c0 && (S.x[i] - c0[0]) ** 2 + (S.z[i] - c0[2]) ** 2 + (S.y[i] - c0[1]) ** 2 < 900; fl.setMatrixAt(q, vic ? Z : flagM[q]); } fl.instanceMatrix.needsUpdate = true;
    fB.instanceMatrix.needsUpdate = fT.instanceMatrix.needsUpdate = true;
  }

  // ---------- fasci di luce dei fari verso il campo (solo la sera, leggeri) ----------
  if (I.fasci !== false) { const beamT = canvasTex(8, 128, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,255,255,0.0)'); g.addColorStop(0.75, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0.9)'); c.fillStyle = g; c.fillRect(0, 0, w, h); }, { srgb: false });
    const bm = new THREE.MeshBasicMaterial({ color: '#fff3df', alphaMap: beamT, transparent: true, opacity: I.fasciForza ?? 0.028, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }); bm.userData.sera = true;
    const geos = [], lp = (info.tettoInfo && info.tettoInfo.lampPts || []).filter(q => q[1] < (p.tetto.hFari || 1e9) - 1), src = lp.filter((_, i) => i % Math.max(1, Math.floor(lp.length / (I.nFasci || 16))) === 0);
    for (const [x, y, z] of src) { const tx = x * 0.25 + (rr() - 0.5) * 30, tz = z * 0.25 + (rr() - 0.5) * 20, L = Math.hypot(tx - x, 0 - y, tz - z), g = new THREE.CylinderGeometry(9, 0.5, L, 18, 1, true);
      g.translate(0, L / 2, 0); const dir = new THREE.Vector3(x - tx, y, z - tz).normalize(), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); g.applyQuaternion(q); g.translate(tx, 0, tz); geos.push(g.toNonIndexed()); }
    if (geos.length) { const m = new THREE.Mesh(unisci(geos), bm); m.name = 'fasci'; m.renderOrder = 5; G.add(m); } }

  // ---------- giocatori (verde contro bianco), arbitro, pallone ----------
  const team = (x, z, kit) => ({ x, z, kit, ph: R() * 6.28, f: 0.35 + R() * 0.25, amp: 2 + R() * 4 });
  const F = [[-48, 0, 'gkA'], [-34, -20, 'A'], [-36, -7, 'A'], [-36, 7, 'A'], [-34, 20, 'A'], [-16, -24, 'A'], [-19, -8, 'A'], [-18, 9, 'A'], [-14, 25, 'A'], [-3, -6, 'A'], [-5, 8, 'A'],
    [47, 0, 'gkB'], [30, -18, 'B'], [32, -5, 'B'], [31, 8, 'B'], [28, 20, 'B'], [12, -22, 'B'], [14, -7, 'B'], [10, 6, 'B'], [13, 22, 'B'], [3, -10, 'B'], [6, 12, 'B'], [-2, 18, 'ref']];
  const kits = { A: ['#1a8a44', '#f2f2f2'], gkA: ['#e8c21a', '#222'], B: ['#f4f4f4', '#1c2f5c'], gkB: ['#ff5a2a', '#222'], ref: ['#111', '#111'] };
  const players = F.map(([x, z, k]) => team(x, z, k)), pg = new THREE.Group(); pg.name = 'giocatori';
  const skin = new THREE.MeshStandardMaterial({ color: '#7a5038', roughness: 0.7 });
  for (const pl of players) {
    const g = new THREE.Group(), [cs, cp] = kits[pl.kit], ms = new THREE.MeshStandardMaterial({ color: cs, roughness: 0.6 }), mp = new THREE.MeshStandardMaterial({ color: cp, roughness: 0.6 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.6, 0.24), ms); torso.position.y = 1.25;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), skin); head.position.y = 1.7;
    const legs = [-1, 1].map(s => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.9, 0.16), s > 0 ? mp : mp); l.geometry.translate(0, -0.45, 0); l.position.set(s * 0.11, 0.95, 0); g.add(l); return l; });
    const arms = [-1, 1].map(s => { const a = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.6, 0.12), ms); a.geometry.translate(0, -0.3, 0); a.position.set(s * 0.28, 1.52, 0); g.add(a); return a; });
    g.add(torso, head); g.traverse(o => { o.castShadow = true; }); g.position.set(pl.x, 0, pl.z); pl.g = g; pl.legs = legs; pl.arms = arms; pg.add(g);
  }
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshStandardMaterial({ color: '#fff', roughness: 0.4 })); ball.position.set(0, 0.2, 2); ball.castShadow = true; pg.add(ball);
  G.add(pg);
  function anima(t) {   // corsa lenta intorno al proprio posto, tutti un po' verso il pallone
    const bx = Math.sin(t * 0.21) * 18, bz = Math.sin(t * 0.33 + 1) * 10; ball.position.set(bx, 0.2, bz);
    for (const pl of players) { const tx = pl.x + Math.sin(t * pl.f + pl.ph) * pl.amp + (bx - pl.x) * (pl.kit.startsWith('gk') ? 0.02 : 0.12), tz = pl.z + Math.cos(t * pl.f * 0.8 + pl.ph) * pl.amp * 0.7 + (bz - pl.z) * 0.1;
      const dx = tx - pl.g.position.x, dz = tz - pl.g.position.z; pl.g.position.set(tx, 0, tz); const sp = Math.hypot(dx, dz);
      if (sp > 1e-4) pl.g.rotation.y = Math.atan2(dx, dz); const sw = Math.sin(t * 7 + pl.ph) * clamp(sp * 25, 0.15, 0.7);
      pl.legs[0].rotation.x = sw; pl.legs[1].rotation.x = -sw; pl.arms[0].rotation.x = -sw * 0.8; pl.arms[1].rotation.x = sw * 0.8; }
  }
  anima(0);
  pronta.then(() => G.traverse(o => o.material && o.material.userData.ridisegna && o.material.userData.ridisegna()));
  function nascondiVicino(c, r) {   // niente gente sotto e davanti al box VIP: da vicino i manichini del 3D Kling li copierebbe
    const Z0 = new THREE.Matrix4().makeScale(0, 0, 0), R2 = r * r; for (let i = 0; i < N; i++) { if ((S.x[i] - c[0]) ** 2 + (S.z[i] - c[2]) ** 2 < R2 && S.y[i] < c[1] + 1) { fB.setMatrixAt(i, Z0); fT.setMatrixAt(i, Z0); toccati.add(i); } }
    fB.instanceMatrix.needsUpdate = fT.instanceMatrix.needsUpdate = true; }
  return { gruppo: G, pronta, follaVis, liberaPosti, soloPresi, anima, folla: fB, nascondiVicino };
}

// materiale LED: texture disegnata (ridisegnata quando arriva il logo), sempre acceso
function ledMat(w, h, draw, hMeters, rep, forza = 1.25) {
  const tex = canvasTex(w, h, draw, { repeat: [1 / rep * (w / h) / (w / h), 1] });
  tex.repeat.set(hMeters * 0 + 1 / (w / h), 1); tex.wrapT = THREE.ClampToEdgeWrapping;
  const m = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: forza, side: THREE.DoubleSide });
  m.userData.ridisegna = () => { const c = tex.image.getContext('2d'); draw(c, w, h); tex.needsUpdate = true; };
  return m;
}
// grafica dei LED: fondo verde scuro, onde verde lime, logo Saudi 2034 e scritta ogni tanto
function fasciaLed(c, w, h, logo, tipo) {
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0b4a22'); g.addColorStop(0.5, '#0a6a2c'); g.addColorStop(1, '#063a1a'); c.fillStyle = g; c.fillRect(0, 0, w, h);
  const R = rng(tipo.length * 7 + 3);
  if (tipo !== 'bordo') for (let k = 0; k < (tipo === 'band' ? 14 : 8); k++) {   // onde
    const y0 = R() * h, amp = h * (0.2 + R() * 0.4), ph = R() * 6.28, f = (2 + R() * 4) * Math.PI * 2 / w, lw = h * (0.04 + R() * 0.12);
    c.strokeStyle = R() < 0.5 ? `rgba(120,255,110,${0.35 + R() * 0.4})` : `rgba(40,200,90,${0.4 + R() * 0.4})`; c.lineWidth = lw; c.beginPath();
    for (let x = 0; x <= w; x += 8) { const y = y0 + Math.sin(x * f + ph) * amp; x ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
  }
  if (tipo === 'nastro') { c.fillStyle = '#7dff8c'; c.fillRect(0, 0, w, h * 0.12); c.fillRect(0, h * 0.88, w, h * 0.12); }
  const passo = tipo === 'band' ? h * 4 : tipo === 'nastro' ? h * 6 : h * 6;
  c.textBaseline = 'middle';
  for (let x = passo * 0.5, i = 0; x < w; x += passo, i++) {
    if (logo && (tipo !== 'nastro' || i % 2 === 0)) { const s = h * (tipo === 'band' ? 0.82 : 0.78) / logo.height, lw = logo.width * s; c.fillStyle = 'rgba(255,255,255,0.92)'; if (tipo === 'bordo') { c.fillRect(x - lw / 2 - h * 0.15, h * 0.08, lw + h * 0.3, h * 0.84); } c.drawImage(logo, x - lw / 2, (h - logo.height * s) / 2, lw, logo.height * s); }
    else { c.font = `700 ${Math.round(h * 0.42)}px SFTB, Helvetica, Arial`; c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.fillText('SAUDI 2034', x, h / 2); }
    if (tipo === 'band') { c.font = `700 ${Math.round(h * 0.3)}px SFTB, Helvetica, Arial`; c.fillStyle = 'rgba(255,255,255,0.9)'; c.textAlign = 'center'; c.fillText(i % 2 ? 'RIYADH 2034' : 'SAUDI 2034', x + passo / 2, h / 2); }
  }
}

// contenuto della fascia LED a 360°: quattro pannelli netti per tela (logo grande, scritta, nastro coi colori del logo, pallone), onde verdi sottili
function schermo(c, w, h, logo) {
  const R = rng(17), pw = w / 4, cols = ['#ffcb05', '#ef4b2b', '#a457b8', '#f7941d', '#55aa5c'];
  for (let k = 0; k < 4; k++) { const x0 = k * pw, g = c.createLinearGradient(x0, 0, x0, h); g.addColorStop(0, '#0b5a28'); g.addColorStop(1, '#063b1b'); c.fillStyle = g; c.fillRect(x0, 0, pw, h);
    c.save(); c.beginPath(); c.rect(x0, 0, pw, h); c.clip();
    for (let r = 0; r < 7; r++) { c.strokeStyle = `rgba(120,255,140,${0.18 + R() * 0.2})`; c.lineWidth = h * 0.025; c.beginPath(); const y0 = h * (0.15 + r * 0.12), f = (2 + r) * Math.PI * 2 / pw; for (let x = 0; x <= pw; x += 8) { const y = y0 + Math.sin(x * f + r) * h * 0.06; x ? c.lineTo(x0 + x, y) : c.moveTo(x0 + x, y); } c.stroke(); }
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff';
    if (k === 0 && logo) { const s2 = h * 0.84 / logo.height; c.drawImage(logo, x0 + pw / 2 - logo.width * s2 / 2, h * 0.08, logo.width * s2, logo.height * s2); }
    if (k === 1) { c.font = `700 ${Math.round(h * 0.42)}px SFTB, Helvetica, Arial`; c.fillText('SAUDI 2034', x0 + pw / 2, h * 0.52); }
    if (k === 2) { for (let q = 0; q < 5; q++) { c.fillStyle = cols[q]; c.beginPath(); const xx = x0 + pw * (0.12 + q * 0.17); c.moveTo(xx, h * 0.1); c.lineTo(xx + pw * 0.12, h * 0.1); c.lineTo(xx + pw * 0.05, h * 0.9); c.lineTo(xx - pw * 0.07, h * 0.9); c.fill(); } }
    if (k === 3) { c.font = `700 ${Math.round(h * 0.34)}px SFTB, Helvetica, Arial`; c.fillText('THE FINAL · RIYADH', x0 + pw / 2, h * 0.52); }
    c.restore(); c.fillStyle = '#021a0c'; c.fillRect(x0, 0, 4, h); }
}
