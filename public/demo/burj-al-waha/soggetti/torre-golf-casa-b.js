// La casa B della torre golf (Nico 24/11): «forse è meglio farlo entrare qua», il piano 11 del volume destro, quello col balcone e la pianta sull'angolo nella foto madre.
// Giro: dalla madre dritti nel balcone e dentro (foto Q1), in fondo si gira a sinistra e si vede la cucina con l'isola, di nuovo a sinistra si entra in camera
// dalla porta aperta (stanza chiusa, solo finestroni), si esce dalla finestra della camera e ci si gira a guardare tutta la torre (si torna alla foto madre).
// Pianta (coordinate della torre = mondo, faccia davanti a z = +11, balcone z 8,6 → 11): pavimento a 43,1 m, soffitto a 3,3 m.
//   salone a est (x 6,8 → 16,35) col salotto ribassato, la parete di onice in fondo a destra, il pranzo davanti alle vetrate nord;
//   cucina contro il nucleo (x -1,75) con l'isola; camera da letto a sud-ovest (x -1,75 → 6,8, z -3 → 8,6), porta aperta sulla parete nord.
// La disposizione copia la foto Q1 (Seedream, 24/11): salotto ribassato a sinistra del centro, onice in fondo a destra, pranzo in fondo davanti ai vetri, ulivo a sinistra.
import * as THREE from 'three';
import * as AR from '../engine/kit/torre-arredi.js';
import { rng } from '../engine/kit/forme.js';
import * as LX from './torre-golf-lusso.js';

const Q = new URLSearchParams(location.search);
export const CB = { F: 43.1, H: 3.3, x0: -1.75, x1: 16.35, z0: -10.75, z1: 8.6, pit: { x: 10.8, z: 2.2, r: 2.1 }, camX: 6.8, camZ: -3.0,
  porta: { x: 3.2, w: 2.2, h: 2.8 }, entra: { x: 7.7 }, corsia: 13.9, esce: { x: 3.2 } };

export function casaGolfB(S) {
  const F = CB.F, H = CB.H, g = new THREE.Group(), R = rng(41), MA = AR.materiali(+Q.get('pal') || S.palette || 1), L = LX.materialiLusso();
  const std = (c, r, m = 0, e = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, ...e });
  const box = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, F + y + h / 2, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
  const put = (o, x, z, ry = 0, y = 0) => { o.position.set(x, F + y, z); o.rotation.y = ry; g.add(o); return o; };
  const piano = (x0, x1, z0, z1, y, m, giu = false) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), m); p.rotation.x = giu ? Math.PI / 2 : -Math.PI / 2; p.position.set((x0 + x1) / 2, F + y, (z0 + z1) / 2); p.receiveShadow = true; g.add(p); return p; };
  const luce = (x, y, z, k = 1, d = 12) => { const l = new THREE.PointLight(0xffd9a8, 9 * k, d, 1.6); l.position.set(x, F + y, z); g.add(l); };
  const noce = std('#4a2f1f', 0.32, 0.05, { envMapIntensity: 1.2 }), noceChiaro = std('#6b4630', 0.38, 0.05), tessuto = std('#e9e1d4', 0.95), lino = std('#f3eee6', 0.9), velluto = std('#6d4a36', 0.8);
  const { x0, x1, z0, z1, pit: PIT, camX, camZ } = CB;

  // ---------- pavimento (marmo crema col buco del salotto ribassato; parquet di noce in camera) e soffitto ----------
  { const sh = new THREE.Shape(); sh.moveTo(camX, -z0); sh.lineTo(x1, -z0); sh.lineTo(x1, -z1); sh.lineTo(camX, -z1); sh.lineTo(camX, -camZ); sh.lineTo(x0, -camZ); sh.lineTo(x0, -z0); sh.closePath();
    const h = new THREE.Path(); h.absarc(PIT.x, -PIT.z, PIT.r, 0, Math.PI * 2, true); sh.holes.push(h);
    const ge = new THREE.ShapeGeometry(sh, 64); ge.rotateX(-Math.PI / 2); const uv = ge.attributes.uv, pa = ge.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, pa.getX(i) / 6, pa.getZ(i) / 6);
    const pv = new THREE.Mesh(ge, L.pavimento); pv.position.y = F + 0.01; pv.receiveShadow = true; g.add(pv); }
  piano(x0, camX, camZ, z1, 0.012, std('#8a6446', 0.45));   // parquet della camera
  piano(x0, x1, z0, z1, H, MA.intonaco, true);
  // controsoffitto del salone con la gola di luce (la foto: anello acceso sopra il salotto)
  { const r = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.04, 8, 96), MA.luce); r.rotation.x = Math.PI / 2; r.scale.set(1, 1.35, 1); r.position.set(PIT.x + 0.6, F + H - 0.06, PIT.z - 1.4); g.add(r); }

  // ---------- SALONE: salotto rotondo ribassato col fuoco, divano lungo dietro, consolle coi libri verso il vetro, lampadario di bronzo a grappolo ----------
  { const f = LX.fossaSalotto(L, PIT.r); f.position.set(PIT.x, F + 0.01, PIT.z); g.add(f); }
  put(AR.componibile(MA, 4.0), PIT.x, PIT.z - 3.2, 0);   // divano lungo dietro al salotto, guarda il vetro sud
  box(0.5, 0.55, 2.6, L.bronzo, 15.4, 0, PIT.z - 0.6);   // consolle di bronzo coi libri lungo il salotto, verso il vetro est
  for (let i = 0; i < 3; i++) box(0.3, 0.08, 0.4, std(['#e9e2d6', '#1d1d1f', '#b8925a'][i], 0.7), 15.4, 0.55, PIT.z - 1.4 + i * 0.8);
  { const gr = new THREE.Group(); gr.position.set(PIT.x + 0.4, F + H, PIT.z - 0.8);   // lampadario a grappolo: «nuvole» di rete di bronzo accese
    for (let i = 0; i < 11; i++) { const a = i * 2.4, rr = 0.4 + R() * 1.3, y = -0.9 - R() * 1.0, n = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32 + R() * 0.12, 1), std('#9a6a42', 0.4, 0.8, { emissive: new THREE.Color('#ffb46a'), emissiveIntensity: 0.6, wireframe: true }));
      n.position.set(Math.cos(a) * rr, y, Math.sin(a) * rr); gr.add(n); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, -y, 4), L.oro); c.position.set(n.position.x, y / 2, n.position.z); gr.add(c);
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), std('#ffd9a8', 0.4, 0, { emissive: new THREE.Color('#ffc27a'), emissiveIntensity: 2 })); b.position.copy(n.position); gr.add(b); }
    g.add(gr); }
  put(AR.ulivo(MA, 1.15), 8.0, 3.9);   /* a sinistra nella foto 2, fuori dal passaggio */   // ulivo grande a sinistra in primo piano (la foto)
  put(AR.vasoTerra(MA, 0.9), 15.5, -1.6);
  // parete di onice retroilluminata in fondo a destra, colonna di noce, consolle bassa con vasi e lampada
  { const on2 = new THREE.Mesh(new THREE.PlaneGeometry(3.6, H), L.onice); on2.rotation.y = -Math.PI / 2; on2.position.set(15.45, F + H / 2, -1.7); g.add(on2); box(0.12, H, 3.6, noce, 15.55, 0, -1.7); }   /* onice rivolto al salotto, come nella foto 2 */
  { const xo0 = 15.3, zo = -3.5; const o = new THREE.Mesh(new THREE.PlaneGeometry(x1 - xo0, H), L.onice); o.position.set((xo0 + x1) / 2, F + H / 2, zo); g.add(o);
    box(0.4, H, 0.6, noce, xo0 - 0.2, 0, zo - 0.1); box(0.18, H, 8.2, noce, xo0 - 0.3, 0, zo - 4.1);   /* dietro l'onice: dispensa chiusa */
    box(x1 - xo0 - 0.3, 0.75, 0.45, L.bronzo, (xo0 + x1) / 2, 0, zo + 0.35); put(AR.vasoFiori(MA, 0.7), xo0 + 0.6, zo + 0.35, 0, 0.75); put(AR.candele(MA), xo0 + 1.4, zo + 0.35, 0, 0.75); }
  // PRANZO davanti alle vetrate nord, totem e anello di luce, ulivo, tende velate
  { put(LX.tavoloVetro(L, 3.4), 11.6, -9.3, 0); const an = LX.anelloLuce(L, 1.3); an.position.set(11.6, F + H - 0.9, -9.3); g.add(an); luce(11.6, 2.6, -9.3, 1.0, 9);   /* più in là: nella curva verso la cucina il pranzo non passa vicino */
    const t = LX.totem(L, 2.3); t.position.set(7.6, F, -9.6); g.add(t); put(AR.ulivo(MA, 1.0), 13.6, -9.7);
    for (const [x, w] of [[7.6, 1.6], [13.9, 1.4]]) { const te = LX.tenda(L, w, H - 0.1); te.position.set(x, F + H / 2, z0 + 0.3); g.add(te); } }
  luce(PIT.x, 2.8, PIT.z, 1.6, 14); luce(13.0, 2.8, 5.5, 0.8, 10); luce(15.5, 2.4, -2.6, 1.2, 8);

  // ---------- CUCINA (Nico 24/11: «più piccola sta stanza, è troppo vuota»): parete di noce a x 1, cucina corta contro la parete, isola con 3 lampade,
  //   tavolo tondo di marmo coi fiori, quadro e consolle sulla parete della camera, tende alle vetrate nord, soffitto a cassettoni d'oro
  { const xw = 1.0; box(0.2, H, z0 + 10.75 + 7.75, noce, xw - 0.1, 0, (z0 + camZ) / 2);   /* parete di noce: dietro c'è la dispensa */
    put(AR.cucina(MA, 4.2), xw + 0.76, -8.4, Math.PI / 2);
    const o = new THREE.Mesh(new THREE.PlaneGeometry(4.6, H), L.onice); o.rotation.y = Math.PI / 2; o.position.set(xw + 0.02, F + H / 2, -8.4); g.add(o);
    for (const dz of [-1.2, 0, 1.2]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.1, 4), L.oro); c.position.set(xw + 2.4, F + H - 0.55, -8.4 + dz); g.add(c);
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), std('#ffe4bd', 0.3, 0.1, { emissive: new THREE.Color('#ffc27a'), emissiveIntensity: 1.8 })); p.position.set(xw + 2.4, F + H - 1.2, -8.4 + dz); g.add(p); }
    for (let x = xw + 0.6; x < 9.5; x += 1.1) box(0.06, 0.1, 7.4, L.oro, x, H - 0.1, -7.0);   // cassettoni d'oro
    /* Nico 24/11: «la parete a sinistra della cucina troppo vuota, qualcosa di design»: cantina dei vini di vetro retroilluminata a tutta altezza, scaffali di bronzo */
    { const za = camZ - 0.15, zb = -6.15, zc = (za + zb) / 2, w = za - zb, fondo = new THREE.Mesh(new THREE.PlaneGeometry(w, H - 0.1), std('#ffd8a0', 0.5, 0, { emissive: new THREE.Color('#ffb868'), emissiveIntensity: 1.1 }));
      fondo.rotation.y = Math.PI / 2; fondo.position.set(xw + 0.02, F + H / 2, zc); g.add(fondo);
      for (let y = 0.25; y < H - 0.2; y += 0.38) box(0.32, 0.025, w, L.bronzo, xw + 0.18, y, zc);
      const bott = [std('#1f3a2a', 0.15, 0.2), std('#4a1820', 0.15, 0.2), std('#2a2018', 0.15, 0.2)];
      for (let y = 0.25; y < H - 0.5; y += 0.38) for (let z = zb + 0.12; z < za - 0.1; z += 0.13) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 8), bott[Math.floor((y * 7 + z * 13) * 10) % 3]); b.rotation.z = Math.PI / 2; b.position.set(xw + 0.18, F + y + 0.07, z); g.add(b); }
      for (const z of [za, zb]) box(0.36, H, 0.06, L.oro, xw + 0.18, 0, z);
      const ve = new THREE.Mesh(new THREE.PlaneGeometry(w, H), std('#e8f1f5', 0.04, 0.1, { transparent: true, opacity: 0.12 })); ve.rotation.y = Math.PI / 2; ve.position.set(xw + 0.37, F + H / 2, zc); g.add(ve); luce(xw + 0.9, 1.6, zc, 0.7, 5); }
    for (const dx of [-1.35, 1.35]) { const ap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 16), std('#ffe2b8', 0.3, 0.2, { emissive: new THREE.Color('#ffc27a'), emissiveIntensity: 1.6 })); ap.position.set(5.4 + dx, F + 2.05, camZ - 0.12); g.add(ap); box(0.14, 0.62, 0.04, L.oro, 5.4 + dx, 1.74, camZ - 0.1); }   /* applique d'oro ai lati del quadro */
    put(AR.ulivo(MA, 0.95), 7.4, -9.9); const tq = LX.totem(L, 1.8); tq.position.set(6.2, F, -10.2); g.add(tq);   /* niente tavolo tondo: si sovrapponeva agli sgabelli */
    put(LX.monet(L, 1.9, 1.25, 31, 'papaveri'), 5.4, camZ - 0.09, Math.PI, 1.5); box(2.2, 0.8, 0.45, L.bronzo, 5.4, 0, camZ - 0.35); put(AR.vasoTerra(MA, 0.6), 4.7, camZ - 0.35, 0, 0.8);
    for (const [x, w] of [[3.4, 1.6], [8.6, 1.4]]) { const te = LX.tenda(L, w, H - 0.1); te.position.set(x, F + H / 2, z0 + 0.3); g.add(te); }
    luce(3.4, 2.8, -8.4, 1.2, 9); luce(6.6, 2.6, -9.6, 0.6, 7); }

  // ---------- CAMERA DA LETTO: chiusa da pareti di noce, porta aperta a nord, solo i finestroni sul balcone ----------
  { const P = CB.porta, muro = (xa, xb, za, zb) => { const w = Math.hypot(xb - xa, zb - za), m = new THREE.Mesh(new THREE.BoxGeometry(xa === xb ? 0.16 : w, H, xa === xb ? w : 0.16), noce); m.position.set((xa + xb) / 2, F + H / 2, (za + zb) / 2); m.castShadow = m.receiveShadow = true; g.add(m); };
    muro(camX, camX, camZ, z1);   // parete est della camera (a sinistra nella foto Q1: pannelli di noce)
    muro(x0, P.x - P.w / 2, camZ, camZ); muro(P.x + P.w / 2, camX, camZ, camZ); box(P.w, H - P.h, 0.16, noce, P.x, P.h, camZ);
    for (const s of [-1, 1]) box(0.08, P.h, 0.2, L.oro, P.x + s * (P.w / 2 + 0.04), 0, camZ); box(P.w + 0.16, 0.08, 0.2, L.oro, P.x, P.h, camZ);
    { const an = new THREE.Mesh(new THREE.BoxGeometry(P.w - 0.05, P.h - 0.05, 0.06), noceChiaro); an.geometry.translate((P.w - 0.05) / 2, 0, 0); an.position.set(P.x + P.w / 2, F + P.h / 2, camZ + 0.08); an.rotation.y = -1.75; g.add(an); }   /* anta aperta verso dentro, contro il muro */
    // letto king con la testata alta imbottita sulla parete di noce a est (a sinistra entrando), comodini di bronzo con le lampade, tappeto, quadro sopra la testata
    const zb = 3.5, xh = camX - 0.08; box(0.25, 2.6, 3.4, velluto, xh - 0.13, 0, zb); box(2.2, 0.42, 2.0, noceChiaro, xh - 1.35, 0, zb); box(2.1, 0.22, 1.95, lino, xh - 1.35, 0.42, zb);
    box(0.5, 0.2, 1.8, tessuto, xh - 0.55, 0.64, zb); box(0.9, 0.06, 2.0, std('#b89c7c', 0.9), xh - 2.0, 0.66, zb);
    for (const dz of [-1.6, 1.6]) { box(0.5, 0.5, 0.5, L.bronzo, xh - 0.5, 0, zb + dz); const la = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), std('#fff2dc', 0.4, 0, { emissive: new THREE.Color('#ffcf91'), emissiveIntensity: 1.6 })); la.position.set(xh - 0.5, F + 1.6, zb + dz); g.add(la); }
    piano(xh - 3.6, xh - 0.3, zb - 2.2, zb + 2.2, 0.02, std('#d9cdbd', 0.95));
    put(LX.monet(L, 2.2, 1.3, 12, 'ninfee'), xh - 0.3, zb, -Math.PI / 2, 2.75 - 0.65);
    { const sp = LX.specchioOro(L, 0.75); sp.position.set(camX - 0.12, F + 1.7, -1.0); sp.rotation.y = -Math.PI / 2; g.add(sp); box(0.5, 0.85, 1.9, L.bronzo, camX - 0.33, 0, -1.0); put(AR.vasoFiori(MA, 0.8), camX - 0.33, -0.4, 0, 0.85); }   /* parete est vuota entrando: specchio tondo d'oro sopra una cassettiera di bronzo */
    { const on = new THREE.Mesh(new THREE.PlaneGeometry(z1 - camZ - 0.6, H), L.onice); on.rotation.y = Math.PI / 2; on.position.set(x0 + 0.02, F + H / 2, (camZ + z1) / 2 - 0.3); g.add(on); }   /* onice acceso sulla parete ovest della camera (come la foto 4): dalla cucina, dalla porta, si vede lui e non il letto */
    put(AR.poltrona(MA), x0 + 1.1, 6.9, 2.4); put(AR.lampadaTerra(MA), x0 + 0.5, 7.7);
    for (const [x, w] of [[x0 + 0.9, 1.4], [camX - 0.8, 1.2]]) { const te = LX.tenda(L, w, H - 0.1); te.position.set(x, F + H / 2, z1 - 0.3); g.add(te); }
    luce(1.8, 2.8, 3.0, 0.9, 9); luce(4.4, 2.6, 6.5, 0.6, 7); }
  return g;
}

/* chiavi del giro B: C1 madre → Q1 (dritti nel balcone, dentro), C2 Q1 → cucina (dritti in fondo, curva a sinistra), C3 cucina → camera (curva a sinistra, dentro dalla porta),
   C4 camera → fuori dalla finestra, giro in volo di 180° all'indietro fino alla foto madre (si vede tutta la torre). Curve morbide in cammino (Nico 23/11 notte). */
export function giroCasaB(S) {
  const E = CB.F + 1.7, D = 60, N = Math.PI, W = 1.5 * Math.PI, SUD = 2 * Math.PI, FI = 52, T = S.tempi, m = S.riprese.mondo;
  const k = (x, z, yaw, t, fov, y = E, shift = 0) => ({ pos: [x, y, z], tgt: [x + Math.sin(yaw) * D, y, z + Math.cos(yaw) * D], fov, shift, t, yaw });
  const xe = CB.entra.x, xu = CB.esce.x, s2 = Math.SQRT1_2 * 2;
  let t = 0; const K = [];
  /* Nico 24/11: «deve essere figa, arriva di sbieco sulla foto 2 perfettamente»: dalla madre una curva larga che arriva da sinistra in diagonale
     sul piano (sguardo verso nord-est), passa la vetrata dentro l'apertura e si raddrizza piano sulla foto 2 */
  /* Nico 24/11 (2): «più lenta, movimenti fluidi, deve arrivare più a destra, la camera da letto a sinistra non la devo vedere»: 6 s, sguardo fermo verso la torre,
     la camera scivola larga a destra e arriva sulla parte destra della vetrata (il salotto), poi dentro; si gira solo alla fine, piano, sulla foto 2 */
  /* Nico 24/11 (3): la foto 2 è fatta dalla parte SINISTRA del salone, appena dentro il vetro davanti, guardando in diagonale verso destra
     (la vetrata col balcone a destra è la facciata davanti, l'angolo curvo in fondo a destra). Si entra lì: 5 s, si gira solo a destra. */
  K.push(k(-2, 125, 0.975 * N, t += 1.6, 36, 42)); K.push(k(5.0, 26, 0.89 * N, t += 1.6, 44, E - 0.1)); K.push(k(xe, 7.4, 0.777 * N, t += 1.8, FI));   /* la girata a destra distribuita su tutta la clip */   /* sempre verso destra, mai indietro */   /* rallenta davanti al balcone: si passa il vetro piano (strappo a 4,8 s) */                                                   // C1: dalla madre dritti nel balcone, dentro (Q1)
  const xc = CB.corsia; K.push(k(xc, -0.5, N, t += T.cammina * 0.6, FI)); K.push(k(xc, -3.8, N, t += T.cammina * 0.4, FI));                                               // C2: dritti in fondo al salone...
  K.push(k(xc - 2 + s2, -3.8 - s2, 1.25 * Math.PI, t += T.gira / 2, FI)); K.push(k(xc - 2, -5.8, W, t += T.gira / 2, FI));   // ...curva a sinistra (raggio 2 m)
  K.push(k(8.4, -5.8, W, t += 1.0, FI));                                                   //    la cucina con l'isola davanti (foto K)
  K.push(k(xu + 2, -5.8, W, t += T.cammina2, FI));                                             // C3: verso la cucina...
  K.push(k(xu + 2 - s2, -3.8 - s2, 1.75 * Math.PI, t += T.gira / 2, FI)); K.push(k(xu, -3.8, SUD, t += T.gira / 2, FI));   // ...curva a sinistra verso la porta della camera
  K.push(k(xu, -0.5, SUD, t += T.camera, FI));                                               //    dentro la camera, i finestroni davanti (foto B)
  /* C4 (24/11): fuori dal balcone e subito una curva larga che gira lo sguardo verso la torre (niente secondi di solo prato), poi indietro fino alla foto madre */
  K.push(k(xu, 14, SUD, t += 1.2, 48, E + 0.4));
  K.push(k(10, 35, SUD + 0.5 * Math.PI, t += 1.3, 42, E + 2.0));
  K.push(k(2, 95, SUD + 0.88 * Math.PI, t += 1.5, 36, 42));
  K.push({ pos: m.pos, tgt: m.tgt, fov: m.fov, shift: m.shift, t: t += 2.0, yaw: SUD + Math.PI });   //    ...e si guarda tutta la torre: la foto madre
  return K;
}
