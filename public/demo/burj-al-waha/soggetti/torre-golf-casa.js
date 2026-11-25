// L'appartamento della torre golf (Nico 23/11): «si entra nella finestra in alto a sinistra aperta (la loggia), un bel salone con quella pianta enorme
// che si vede già da fuori a destra, a destra la cucina, poi si entra in bagno e si riesce da dietro verso lo skyline».
// Pianta (coordinate della torre = mondo, la faccia davanti è a z = +11): piano 11, pavimento a 43,1 m.
//   salone a doppia altezza nel volume sinistro (x -16,3 → -5,1, soffitto 7,5 m), la loggia davanti (z 7,5 → 11) e il ficus grande a destra;
//   varco dietro la fascia di bronzo (x -5,1 → -2, z 1,5 → 4,5); volume destro (soffitto 3,4 m): cucina in fondo a est, pranzo davanti, bagno dietro (z < -3,5)
//   con la vasca davanti alla finestra che guarda lo skyline; la finestra del bagno è aperta e da lì si esce.
// Giro (regole smooth del 23/11): tratti dritti, girate solo da fermi e ognuna nella sua clip da 3 s, sguardo sempre orizzontale.
import * as THREE from 'three';
import * as AR from '../engine/kit/torre-arredi.js';
import { rng, canvasTex } from '../engine/kit/forme.js';
import * as LX from './torre-golf-lusso.js';

const Q = new URLSearchParams(location.search);

export function casaGolf(S) {
  const C = S.casa, F = C.duplex.y0, g = new THREE.Group(), R = rng(29), MA = AR.materiali(+Q.get('pal') || S.palette || 1);
  const std = (c, r, m = 0, e = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, ...e });
  const box = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, F + y + h / 2, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
  const put = (o, x, z, ry = 0, y = 0) => { o.position.set(x, F + y, z); o.rotation.y = ry; g.add(o); return o; };
  const piano = (x0, x1, z0, z1, y, m, giu = false) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), m); p.rotation.x = giu ? Math.PI / 2 : -Math.PI / 2; p.position.set((x0 + x1) / 2, F + y, (z0 + z1) / 2); p.receiveShadow = true; g.add(p); return p; };
  const luce = (x, y, z, k = 1, d = 12) => { const l = new THREE.PointLight(0xffd9a8, 9 * k, d, 1.6); l.position.set(x, F + y, z); g.add(l); };
  const VERSO_VETRO = 0, VERSO_DENTRO = Math.PI;   /* AR: i mobili guardano +z con rotazione 0 */
  const soffitto = MA.intonaco, L = LX.materialiLusso(), marmo = L.nero, lastra = MA.lastra;   /* Nico 23/11 sera: lusso estremo (board interiors-luxury) */
  const PIT = { x: -10.85, z: -3.2, r: 3.2 };
  const SAL = { x0: -16.25, x1: -5.1, z0: -10.6, z1: 7.5, h: 7.5 }, DX = { x0: -2.0, x1: 16.25, z0: -10.6, z1: 10.6, h: 3.4 }, BAG = { z1: -3.5 };

  // ---------- pavimenti e soffitti ----------
  { const sh = new THREE.Shape(); sh.moveTo(SAL.x0, -SAL.z0); sh.lineTo(SAL.x1, -SAL.z0); sh.lineTo(SAL.x1, -SAL.z1); sh.lineTo(SAL.x0, -SAL.z1); sh.closePath();
    const h = new THREE.Path(); h.absarc(PIT.x, -PIT.z, PIT.r, 0, Math.PI * 2, true); sh.holes.push(h);
    const ge = new THREE.ShapeGeometry(sh, 64); ge.rotateX(-Math.PI / 2); const uv = ge.attributes.uv, pa = ge.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, pa.getX(i) / 6, pa.getZ(i) / 6);
    const pv = new THREE.Mesh(ge, L.pavimento); pv.position.y = F + 0.01; pv.receiveShadow = true; g.add(pv); }   /* marmo crema lucido col buco del salotto ribassato */
  piano(SAL.x0, SAL.x1, SAL.z0, SAL.z1, SAL.h, LX.fogliaOro(), true);   /* soffitto a doppia altezza in foglia d'oro */
  const PA = C.passaggio; piano(-5.1, -2.0, PA.z0, PA.z1, 0.01, MA.pavimento); piano(-5.1, -2.0, PA.z0, PA.z1, 3.4, soffitto, true);
  piano(DX.x0, DX.x1, BAG.z1, DX.z1, 0.01, L.pavimento); piano(DX.x0, DX.x1, DX.z0, DX.z1, DX.h, soffitto, true);
  piano(DX.x0, DX.x1, DX.z0, BAG.z1, 0.012, marmo);   // bagno in marmo
  // gole di luce lungo i soffitti
  const gola = MA.luce; box(SAL.x1 - SAL.x0 - 1, 0.05, 0.25, gola, (SAL.x0 + SAL.x1) / 2, SAL.h - 0.08, SAL.z0 + 0.5); box(DX.x1 - DX.x0 - 1, 0.05, 0.25, gola, (DX.x0 + DX.x1) / 2, DX.h - 0.08, BAG.z1 + 0.4);

  // ---------- SALONE a doppia altezza: parete di pietra col camino sul lato della fascia, componibile enorme che guarda la loggia, poltrone, lampadario monumentale ----------
  { const xw = SAL.x1 - 0.05;   // parete verso la fascia di bronzo (rivestita di lastra), dal fondo fino al varco
    const PA = C.passaggio, pw = new THREE.Mesh(new THREE.PlaneGeometry(PA.z0 - SAL.z0, SAL.h), L.onice); pw.rotation.y = -Math.PI / 2; pw.position.set(xw, F + SAL.h / 2, (SAL.z0 + PA.z0) / 2); g.add(pw);
    const pw2 = new THREE.Mesh(new THREE.PlaneGeometry(SAL.z1 - PA.z1, SAL.h), lastra); pw2.rotation.y = -Math.PI / 2; pw2.position.set(xw, F + SAL.h / 2, (PA.z1 + SAL.z1) / 2); g.add(pw2);
    const sopra = new THREE.Mesh(new THREE.PlaneGeometry(PA.z1 - PA.z0, SAL.h - 3.4), lastra); sopra.rotation.y = -Math.PI / 2; sopra.position.set(xw, F + 3.4 + (SAL.h - 3.4) / 2, (PA.z0 + PA.z1) / 2); g.add(sopra);
    box(0.5, 1.2, 5.2, L.bronzo, xw - 0.25, 0, -3.4); box(0.12, 0.4, 4.4, L.fuoco, xw - 0.5, 0.45, -3.4);   /* camino lineare in un blocco di bronzo davanti all'onice */
    put(LX.monet(L, 4.2, 2.6, 7, 'ninfee'), xw - 0.08, -3.4, -Math.PI / 2, 1.6 + 1.3); }   /* le Ninfee: 4,6 x 2,9 m in cornice d'oro sopra il camino */
  { const f = LX.fossaSalotto(L, PIT.r); f.position.set(PIT.x, F + 0.01, PIT.z); g.add(f); }   /* salotto rotondo ribassato col fuoco, aperto verso la loggia */
  { const la = LX.lampadarioNastri(L, 3.4); la.position.set(PIT.x, F + SAL.h, PIT.z); g.add(la); }
  { const c = LX.colonnaVetro(L, SAL.h); c.position.set(-14.7, F, 4.4); g.add(c); }
  put(LX.pianoforte(L), -13.4, -8.0, 0.5);
  { const t = LX.totem(L, 2.4); t.position.set(-7.0, F, -9.4); g.add(t); }
  for (const [x, w] of [[-15.2, 1.8], [-6.2, 1.8]]) { const te = LX.tenda(L, w, SAL.h - 0.1); te.position.set(x, F + SAL.h / 2, SAL.z0 + 0.35); g.add(te); }   /* tende velate ai lati del vetro di dietro */
  { const bin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, SAL.z1 - SAL.z0 - 0.4), L.gola); bin.position.set(SAL.x1 - 0.3, F + SAL.h - 0.08, (SAL.z0 + SAL.z1) / 2); g.add(bin); }
  // la pianta enorme: ficus lyrata in un vaso di pietra, alto 5,6 m, a destra della loggia (si vede da fuori)
  g.add(ficus(-7.0, F, 6.1, 5.6, 1.7, MA));   /* a 3,1 m dal passaggio (smooth: niente oggetti vicini su un lato solo) */
  luce(-10.85, 6.5, -3.2, 2.0, 18); luce(-10.85, 3.0, 3.5, 1.0, 12); luce(-7.5, 4.5, 4.5, 0.8, 10); luce(-13.4, 3.0, -8.0, 1.0, 10);

  // ---------- CORRIDOIO di lusso (Nico 23/11 notte: «un corridoio, non vetrate»): dal varco nella fascia fino alla cucina, largo 3 m, alto 3 m.
  //   pareti in noce laccato con nicchie di onice accese e vasi, quadri diversi in cornice d'oro, soffitto a cassettoni d'oro, applique d'oro, passatoia di marmo nero con filetti d'oro
  { const PA = C.passaggio, z0 = PA.z0, z1 = PA.z1, xa = -5.1, xn = 0.8, xsud = 3.4, h = 3.0, zm = (z0 + z1) / 2;
    const laccato = std('#3a2418', 0.18, 0.1, { envMapIntensity: 1.3 });
    const muro = (xA, xB, z, verso) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(xB - xA, h), laccato); m.position.set((xA + xB) / 2, F + h / 2, z); m.rotation.y = verso; g.add(m); };
    muro(-2.0, xn, z0, 0); muro(-2.0, xsud, z1, Math.PI);   // nord (fino a 1,8: poi si curva a sinistra) e sud
    box(xsud + 2.0, DX.h - h, 0.15, MA.parete, (xsud - 2.0) / 2, h, z1); box(xn + 2.0, DX.h - h, 0.15, MA.parete, (xn - 2.0) / 2, h, z0);
    const cielo = new THREE.Mesh(new THREE.PlaneGeometry(xsud - xa, z1 - z0), LX.fogliaOro()); cielo.rotation.x = Math.PI / 2; cielo.position.set((xa + xsud) / 2, F + h, zm); g.add(cielo);
    for (let x = xa + 0.6; x < xsud; x += 1.2) box(0.08, 0.12, z1 - z0, L.oro, x, h - 0.12, zm);   // cassettoni
    const pass = new THREE.Mesh(new THREE.PlaneGeometry(xsud - xa, 1.4), L.nero); pass.rotation.x = -Math.PI / 2; pass.position.set((xa + xsud) / 2, F + 0.015, zm); g.add(pass);
    for (const dz of [-0.72, 0.72]) box(xsud - xa, 0.005, 0.05, L.oro, (xa + xsud) / 2, 0.012, zm + dz);
    for (const [x, z, s] of [[-1.45, z0, 1], [-1.3, z1, -1], [1.0, z1, -1]]) {   // nicchie di onice con un vaso
      const n = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.6), L.onice); n.position.set(x, F + 1.55, z + s * 0.01); n.rotation.y = s > 0 ? 0 : Math.PI; g.add(n);
      const v = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 16), L.bronzo); v.scale.y = 1.4; v.position.set(x, F + 1.05, z + s * 0.2); g.add(v);
      box(0.9, 0.05, 0.3, L.oro, x, 0.75, z + s * 0.15); }
    put(LX.monet(L, 1.3, 0.95, 21, 'covoni'), -0.1, z0 + 0.03, 0, 1.6);   put(LX.monet(L, 1.3, 0.95, 23, 'ponte'), -0.1, z1 - 0.03, Math.PI, 1.6);
    for (const [x, z, s] of [[-1.75, z0, 1], [-0.55, z0, 1], [-1.75, z1, -1], [0.0, z1, -1], [1.6, z1, -1]]) { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.45, 16), L.gola); a.position.set(x, F + 2.0, z + s * 0.08); g.add(a); }   // applique
    luce(-0.2, 2.6, zm, 1.0, 8); luce(2.2, 2.6, zm, 0.8, 7); }
  luce(-3.55, 2.8, 2.0, 0.6, 7);
  // ---------- CUCINA (in fondo a est, guarda verso chi arriva): parete di mobili con la lastra, isola parallela, sgabelli rivolti all'isola ----------
  put(AR.cucina(MA, 5.6), 14.6, 3.0, -Math.PI / 2);   /* 2 m più in là: nella girata verso il bagno l'isola non passa vicina da un lato solo (smooth) */
  { const o = new THREE.Mesh(new THREE.PlaneGeometry(7.6, DX.h), L.onice); o.rotation.y = -Math.PI / 2; o.position.set(15.36, F + DX.h / 2, 3.0); g.add(o); }   /* parete di onice retroilluminata dietro la cucina */
  { const pts = []; for (let i = 0; i <= 50; i++) { const u = i / 50; pts.push(new THREE.Vector3(10.4, F + DX.h - 0.85 + Math.sin(u * 9) * 0.08, 3.0 - 2 + u * 4)); } g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.035, 8, false), gola)); }
  luce(10.4, 3.0, 3.0, 1.3, 10); luce(7.0, 3.0, 3.0, 0.8, 9);
  // PRANZO davanti al vetro sud del volume destro
  { put(LX.tavoloVetro(L), 4.6, 8.1, 0); const lc = LX.lampadarioCristallo(L, 1.0, 1.3); lc.position.set(4.6, F + DX.h - 0.05, 8.1); g.add(lc); luce(4.6, 3.0, 8.1, 1.0, 10);
    const t = LX.totem(L, 2.2); t.position.set(0.4, F, 9.3); g.add(t); }
  put(AR.vasoTerra(MA, 1.1), -1.2, 9.6); put(AR.ulivo(MA, 1.15), 15.2, 9.3);
  // parete del bagno (z = -3,5) con la porta larga aperta in asse col giro, ante in noce aperte
  { const xs = C.uscita.x, pw = 3.4, mur = (x0, x1) => { const w = x1 - x0, m = new THREE.Mesh(new THREE.BoxGeometry(w, DX.h, 0.18), MA.parete); m.position.set((x0 + x1) / 2, F + DX.h / 2, BAG.z1); g.add(m); };
    mur(DX.x0, xs - pw / 2); mur(xs + pw / 2, DX.x1); box(pw, DX.h - 3.02, 0.18, MA.parete, xs, 3.02, BAG.z1);
    for (const s of [-1, 1]) box(0.12, 2.9, 0.3, L.oro, xs + s * (pw / 2 + 0.06), 0, BAG.z1); box(pw + 0.36, 0.12, 0.3, L.oro, xs, 2.9, BAG.z1);   /* varco aperto del bagno con la cornice d'oro */
    put(LX.monet(L, 2.2, 1.45, 3, 'alba'), xs - 3.9, BAG.z1 + 0.1, 0, 1.65); put(LX.monet(L, 2.2, 1.45, 5, 'papaveri'), xs + 3.9, BAG.z1 + 0.1, 0, 1.65); }

  // ---------- BAGNO: tutto in marmo, vasca libera davanti alla finestra (a destra del passaggio), doppio lavabo a sinistra, doccia di vetro, ficus ----------
  { const xs = C.uscita.x, zf = DX.z0;
    const pareti = [[0.4, BAG.z1, 0.4, zf], [11.2, BAG.z1, 11.2, zf]]; for (const [x0, z0, x1, z1] of pareti) { const m = new THREE.Mesh(new THREE.PlaneGeometry(Math.abs(z1 - z0), DX.h), x0 < xs ? L.onice : L.nero); m.rotation.y = x0 < xs ? Math.PI / 2 : -Math.PI / 2; m.position.set(x0, F + DX.h / 2, (z0 + z1) / 2); g.add(m); }
    const pb = new THREE.Mesh(new THREE.PlaneGeometry(10.8, DX.h), L.nero); pb.position.set(5.8, F + DX.h / 2, BAG.z1 - 0.1); pb.rotation.y = Math.PI; g.add(pb);
    // vasca ovale in pietra bianca (1,9 x 0,9 m), il lato lungo parallelo alla finestra
    { const vb = LX.vascaBronzo(L); vb.position.set(xs + 3.0, F, zf + 1.6); g.add(vb); }   /* vasca a barca in bronzo */
    box(0.08, 1.2, 0.08, MA.metallo, xs + 4.35, 0, zf + 1.6);   // rubinetto da terra
    // doppio lavabo sospeso in marmo contro la parete di sinistra, specchi tondi accesi
    box(0.6, 0.35, 3.0, marmo, 0.75, 0.6, -6.6); for (const z of [-7.5, -5.7]) { const sp = new THREE.Mesh(new THREE.CircleGeometry(0.5, 48), std('#e5ecef', 0.02, 1)); sp.rotation.y = Math.PI / 2; sp.position.set(0.43, F + 1.75, z); g.add(sp);
      const an = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.02, 8, 64), gola); an.rotation.y = Math.PI / 2; an.position.set(0.44, F + 1.75, z); g.add(an); }
    // doccia: vetro coi profili d'ottone sul lato destro, in fondo
    const vs = std('#e8f1f5', 0.05, 0.1, { transparent: true, opacity: 0.2 }); box(0.03, 2.4, 2.6, vs, 9.4, 0, -5.0); box(0.05, 0.05, 2.6, MA.metallo, 9.4, 2.4, -5.0);
    g.add(ficus(1.6, F, zf + 1.0, 2.6, 0.9, MA)); put(LX.monet(L, 1.8, 1.2, 9, 'ponte'), 11.1, -6.6, -Math.PI / 2, 1.7); put(AR.vasoFiori(MA, 0.8), 0.75, -6.0, 0, 0.95); put(AR.candele(MA), 0.75, -7.1, 0, 0.95);
    luce(xs + 3.0, 2.9, zf + 1.8, 1.0, 9); luce(xs, 2.9, -6.0, 0.9, 9); }
  return g;
}

// ficus lyrata: vaso di pietra, tronchi che si aprono, foglie grandi a palle schiacciate
function ficus(x, y, z, h, r, MA) {
  const g = new THREE.Group(), R = rng(13); g.position.set(x, y, z);
  const v = new THREE.Mesh(new THREE.CylinderGeometry(0.62 * r / 1.9 + 0.2, 0.5 * r / 1.9 + 0.18, 0.9, 40), new THREE.MeshStandardMaterial({ color: '#d8d0c2', roughness: 0.75 })); v.position.y = 0.45; v.castShadow = true; g.add(v);
  const legno = new THREE.MeshStandardMaterial({ color: '#6b5847', roughness: 0.9 }), fo = ['#3f5a2c', '#4b6a33', '#36502a', '#5a7a3c'];
  for (let k = 0; k < 3; k++) { const a = k * 2.1 + 0.3, top = new THREE.Vector3(Math.cos(a) * r * 0.35, h * (0.75 + k * 0.06), Math.sin(a) * r * 0.3);
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.85, 0), new THREE.Vector3(top.x * 0.3, h * 0.4, top.z * 0.3), top]); g.add(new THREE.Mesh(new THREE.TubeGeometry(c, 24, 0.06 * h / 4 + 0.03, 8, false), legno)); }
  const n = Math.round(40 + h * 14), mats = fo.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, flatShading: true }));
  for (let i = 0; i < n; i++) { const a = R() * 7, rr = Math.pow(R(), 0.6) * r, yy = h * (0.42 + R() * 0.58), s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22 + R() * 0.16, 0), mats[i % 4]);
    s.position.set(Math.cos(a) * rr, yy - Math.pow(rr / r, 2) * 0.6, Math.sin(a) * rr); s.scale.set(1.4, 0.35, 1.0); s.rotation.set(R() * 0.8, R() * 6, R() * 0.8); s.castShadow = true; g.add(s); }
  return g;
}

/* chiavi del giro (mondo): dalla foto madre dritti nella loggia, girata a destra, cucina, girata a sinistra, bagno e fuori dalla finestra verso lo skyline.
   Ogni girata da ferma nella sua clip da 3 s; i tratti dritti da 3-4 s. */
export function giroCasa(S) {
  /* Nico 23/11 notte: girate morbide in curva, «non così macchinose»: si cammina e si curva insieme (archi di 3 e 2 m, sguardo lungo la curva), niente fermate a girare. */
  const E = S.casa.duplex.y0 + 1.7, x0 = S.casa.entrata.x, xs = S.casa.uscita.x, D = 60, N = Math.PI, EST = Math.PI / 2, M45 = 3 * Math.PI / 4, zc = 2.0;
  const k = (x, z, yaw, t, fov) => ({ pos: [x, E, z], tgt: [x + Math.sin(yaw) * D, E, z + Math.cos(yaw) * D], fov, shift: 0, t, yaw });
  const T = S.tempi, FI = 48;
  let t = 0; const K = [];
  K.push(k(x0, 24, N, t += T.volo, 44));                 // C1 4 s: dalla foto madre dritti davanti alla loggia
  K.push(k(x0, 6.0, N, t += T.entra, FI));               // C2 3 s: dentro il salone
  K.push(k(-9.68, 3.17, M45, t += T.gira / 2, FI)); K.push(k(-6.85, zc, EST, t += T.gira / 2, FI));   // C3 3 s: curva larga a destra (raggio 4 m) verso il corridoio
  K.push(k(1.8, zc, EST, t += T.cammina, FI));           // C4 4 s: dritti nel corridoio di lusso fino alla cucina
  K.push(k(3.92, 1.12, M45, t += T.gira / 2, FI)); K.push(k(xs, -1.0, N, t += T.gira / 2, FI));     // C5 3 s: curva larga a sinistra (raggio 3 m) verso il varco del bagno
  K.push(k(xs, -6.2, N, t += T.bagno, FI));             // C6 3 s: dentro il bagno, la vasca
  K.push(k(xs, -6.2, N, t += 0.25, FI));                 /* un respiro davanti alla vasca: si esce da fermi */
  K.push(k(xs, -13.0, N, t += 1.5, 44));                 // C7 4 s: fuori dalla finestra piano, poi sopra il golf verso lo skyline
  K.push(k(xs, -110, N, t += T.fuori - 1.5, 34));
  return K;
}

/* C8 (Nico 23/11 notte): dallo skyline ci si gira in volo (180° morbidi, si continua ad allontanarsi) e si guarda il retro della torre: «scegli di nuovo il piano» */
export function giroRetro(S) {
  const R = S.riprese.retro, E = S.casa.duplex.y0 + 1.7, D = 60, T = S.tempi.retro;
  const k = (p, yaw, t, fov) => ({ pos: p, tgt: [p[0] + Math.sin(yaw) * D, p[1], p[2] + Math.cos(yaw) * D], fov, shift: 0, t, yaw });
  return [k([-14, 48, -185], 1.5 * Math.PI, T / 2, 32), { pos: R.pos, tgt: R.tgt, fov: R.fov, shift: 0, t: T, yaw: 2 * Math.PI }];
}
