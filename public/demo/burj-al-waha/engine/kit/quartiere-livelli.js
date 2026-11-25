// Motore choose-your · adattatore dei livelli per i quartieri (21/11/2026, «choose your villa» a Dubai Hills).
// Livelli per id: satellite (Z1: i quartieri si accendono) → quartiere (X1: ville verdi libere / grigie vendute, T1: il pin) →
// strada0/1/2 (W1: frecce sull'asfalto, cartellini col prezzo che cambia) → villa (V2: la lanterna e la card) → dentro → piscina → risali (R1).
// Un volo solo: ogni passaggio è un percorso continuo (engine: percorso + arrivo), la camera non si ferma mai.
import * as THREE from 'three';
import { quartiere, campiona, centro, dentro as dentroPol } from './quartiere.js';
import { skylineDubai } from './dubai-skyline.js';
import * as QU from './quartiere-ui.js';
import { villaB2 } from './villa-b2.js';

export function costruisciQuartiere(S) {
  const D = S.dati, Q = quartiere(D, S.quartiere), G = new THREE.Group(); G.add(Q.gruppo);
  const SK = skylineDubai(D.origine, S.citta || [], {}); G.add(SK);
  const idDi = liv => S.livelli[liv] && S.livelli[liv].id, livDi = id => S.livelli.findIndex(l => l.id === id), R0 = S.riprese, piano = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const hash = n => { const h = Math.sin(n * 12.9898) * 43758.5453; return h - Math.floor(h); };

  // ---------------- quartieri da scegliere (Z1) e il loro contorno arancio ----------------
  const zone = D.comunita.filter(q => S.zone[q.nome]).map(q => { const ville = Q.ville.filter(v => v.com === q.nome); return { id: q.nome, nome: q.nome, g: q.g, c: centro(q.g), ville: ville.length, lista: ville, ...S.zone[q.nome] }; });
  const mBordo = new THREE.MeshBasicMaterial({ color: S.colori.scelta, transparent: true, opacity: 0, toneMapped: false, depthWrite: false });
  const mVelo = new THREE.MeshBasicMaterial({ color: S.colori.scelta, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  for (const z of zone) {
    const pos = [], w = 4.5; for (let i = 0; i < z.g.length; i++) { const p = z.g[i], q = z.g[(i + 1) % z.g.length], L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1, nx = -(q[1] - p[1]) / L * w / 2, nz = (q[0] - p[0]) / L * w / 2;
      pos.push(p[0] - nx, 1.5, p[1] - nz, q[0] - nx, 1.5, q[1] - nz, q[0] + nx, 1.5, q[1] + nz, p[0] - nx, 1.5, p[1] - nz, q[0] + nx, 1.5, q[1] + nz, p[0] + nx, 1.5, p[1] + nz); }
    const gb = new THREE.BufferGeometry(); gb.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); z.bordo = new THREE.Mesh(gb, mBordo.clone()); z.bordo.material.side = THREE.DoubleSide; z.bordo.renderOrder = 5;
    z.velo = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(z.g.map(p => new THREE.Vector2(p[0], -p[1])))), mVelo.clone()); z.velo.rotation.x = -Math.PI / 2; z.velo.position.y = 1.2; z.velo.material.side = THREE.DoubleSide; z.velo.renderOrder = 4;
    z.bordo.visible = z.velo.visible = false; G.add(z.bordo, z.velo);
  }
  const zonaDi = nome => zone.find(z => z.nome === nome);
  const scelta = zonaDi(S.villa.comunita);

  // ---------------- la strada del giro, la villa 27, numeri, prezzi e disponibilità (ESEMPIO) ----------------
  const via = D.strade.find(s => s.id === S.strada.id), P = campiona(via.g, 0.5), V27 = Q.perId.get(S.villa.id);
  const sDi = (x, z) => { let b = 0, bd = 1e9; for (const p of P) { const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; b = p.s; } } return b; };
  const aS = s => { s = Math.max(0, Math.min(P.len, s)); let lo = 0, hi = P.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (P[m].s < s) lo = m; else hi = m; } const A = P[lo], B = P[hi], u = (s - A.s) / ((B.s - A.s) || 1); const dx = B.x - A.x, dz = B.z - A.z, l = Math.hypot(dx, dz) || 1; return { x: A.x + dx * u, z: A.z + dz * u, dx: dx / l, dz: dz / l }; };
  const s27 = sDi(V27.cancello.x, V27.cancello.z), larg = via.l;
  const fila = Q.ville.filter(v => v.strada && v.strada.id === via.id && v.cancello).map(v => { const s = sDi(v.cancello.x, v.cancello.z), p = aS(s), dest = ((v.c[0] - p.x) * -p.dz + (v.c[1] - p.z) * p.dx) > 0; return { v, s, dest }; }).sort((a, b) => a.s - b.s);
  const i27 = fila.findIndex(f => f.v === V27);
  { const lato = d => fila.filter(f => f.dest === d); const g = lato(true), d = lato(false), j27 = g.indexOf(fila[i27]);   /* dispari sul lato golf (la 27), pari sul lato interno */
    g.forEach((f, i) => { f.n = S.villa.numero + 2 * (i - j27); }); d.forEach((f, i) => { f.n = S.villa.numero - 1 + 2 * (i - Math.round(j27 * d.length / Math.max(1, g.length))); }); fila.forEach(f => { f.golf = f.dest; }); }
  const liberePrezzi = S.villa.libere || [];
  for (const v of (scelta ? scelta.lista : [])) {
    const f = fila.find(q => q.v === v); v.golf = f ? f.golf : false; v.num = f ? f.n : 1 + Math.floor(hash(v.vid) * 180);
    v.camere = v.a > 470 ? 6 : v.a > 330 ? 5 : 4; v.libera = v === V27 || (f ? liberePrezzi.includes(f.n) : hash(v.vid * 3.1) < 0.28);
    v.prezzo = Math.round((S.prezzi.base + v.a * S.prezzi.perM2 + (v.golf ? S.prezzi.golf : 0) + (f ? Math.max(0, f.s - (s27 - 120)) * S.prezzi.versoGolf : 0)) / 1e4) * 1e4;   // ESEMPIO: sale verso il golf e verso la 27
  }
  V27.prezzo = S.villa.prezzo || V27.prezzo;
  const sulGolfLibere = scelta ? scelta.lista.filter(v => v.golf && v.libera).length : 0;
  // ---------------- la villa 27 vera: kit B2 dalla pianta Emaar, girato sul lotto (fronte sulla strada, retro e piscina sul golf) ----------------
  const pal = new URLSearchParams(location.search).get('pal') || S.villa.palette || 'P1';
  const sol = S.looks[S.lookIniziale].sole, el = sol.alt * Math.PI / 180, az = sol.az * Math.PI / 180;
  const VB = villaB2({ pal, seme: 27, sole: new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)) }), cg = V27.cancello, nn = V27.n, tt = [cg.t[0], cg.t[1]];
  { let a0 = 1e9, a1 = -1e9, f0 = 1e9; for (const p of V27.g) { const pr = (p[0] - cg.x) * tt[0] + (p[1] - cg.z) * tt[1], dp = (p[0] - cg.x) * nn[0] + (p[1] - cg.z) * nn[1]; a0 = Math.min(a0, pr); a1 = Math.max(a1, pr); f0 = Math.min(f0, dp); }
    const fronte = Math.max(f0, 9.0) + (S.villa.arretra || 0), centro = (a0 + a1) / 2;
    VB.gruppo.position.set(cg.x + tt[0] * centro + nn[0] * fronte, 0, cg.z + tt[1] * centro + nn[1] * fronte); VB.gruppo.rotation.y = Math.atan2(nn[0], nn[1]); VB.gruppo.updateMatrixWorld(true);
    const m = VB.misure, a = VB.w((m.PX0 + m.PX1) / 2, 0, (m.PZ0 + m.PZ1) / 2); Q.buco(a[0], a[2], (m.PX1 - m.PX0) / 2 + 0.1, (m.PZ1 - m.PZ0) / 2 + 0.1, -VB.gruppo.rotation.y); }
  G.add(VB.gruppo); const VW = (X, y, Z) => VB.w(X, y, Z), CENTRO27 = VW(0, 3.5, 10);
  // presa invisibile sul fronte della 27: in strada si sceglie anche cliccando la villa (non solo il cartellino)
  const presa27 = new THREE.Mesh(new THREE.BoxGeometry(30, 12, 12), new THREE.MeshBasicMaterial({ visible: false })); presa27.position.set(...VW(0, 6, -2)); presa27.rotation.y = VB.gruppo.rotation.y; presa27.updateMatrixWorld(); G.add(presa27);

  // ---------------- frecce sull'asfalto (W1) ----------------
  const freccia = new THREE.Group(); freccia.name = 'frecce';
  const chev = new THREE.Shape(); chev.moveTo(-1.1, -0.2); chev.lineTo(0, 0.75); chev.lineTo(1.1, -0.2); chev.lineTo(1.1, -0.75); chev.lineTo(0, 0.2); chev.lineTo(-1.1, -0.75); chev.closePath();
  const mFr = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, toneMapped: false, depthWrite: false });
  for (let k = 0; k < 2; k++) { const m = new THREE.Mesh(new THREE.ShapeGeometry(chev), mFr); m.rotation.x = -Math.PI / 2; m.position.set(0, 0.04, -k * 1.9); freccia.add(m); }
  const presa = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.2, 6), new THREE.MeshBasicMaterial({ visible: false })); presa.position.set(0, 0.6, -1); freccia.add(presa); freccia.visible = false; G.add(freccia);
  const metti = (obj, s) => { const p = aS(s); obj.position.set(p.x, 0, p.z); obj.rotation.y = Math.atan2(-p.dx, -p.dz); };

  // ---------------- camera: punti sulla strada ----------------
  const OCCHI = S.strada.occhi || 1.75, sIn = s27 - S.strada.dalla27, s1 = s27 - S.strada.tappa1, s2 = s27 - S.strada.tappa2;
  const occhio = (s, lat = 0, y = OCCHI) => { const p = aS(s); return [p.x - p.dz * lat, y, p.z + p.dx * lat]; };   // lat > 0 = a destra
  const avanti = (s, d = 30, y = OCCHI - 0.6, lat = 0) => { const p = aS(s + d); return [p.x - p.dz * lat, y, p.z + p.dx * lat]; };
  const lungo = (sa, sb, T, t0 = 0, lat = 0) => { const k = []; const n = Math.max(2, Math.round(Math.abs(sb - sa) / 7)); for (let i = 1; i <= n; i++) { const s = sa + (sb - sa) * i / n; k.push({ pos: occhio(s, lat), tgt: avanti(s, 26, OCCHI - 0.5, lat * 0.5), fov: 52, t: t0 + T * i / n }); } return k; };
  let camOra = [0, 0, 0], tLiv = 0, livOra = 0, lanterna = 0, nebbia0 = null, dentroK = 0;

  const M = {
    gruppo: G, ombra: 300, info: Q, villa: VB,
    ripresa(liv, nodo, st) {
      const id = idDi(liv), prima = st && st.livPrima != null ? idDi(st.livPrima) : null;
      if (id === 'satellite' && (!st || st.livPrima == null || prima === 'satellite')) return R0.satellite;
      if (id === 'satellite') {   /* R1: risale dritta al satellite (la discesa girata al contrario) */
        const c0 = camOra; return { arrivo: 5.2, percorso: [
          { pos: [c0[0], c0[1] + 55, c0[2]], tgt: [CENTRO27[0], 0, CENTRO27[2]], fov: 46, t: 1.4 },
          { pos: R0.quartiere.pos, tgt: R0.quartiere.tgt, fov: 40, t: 2.8 },
          { pos: R0.calata.pos, tgt: R0.calata.tgt, fov: 40, t: 4.0 },
          { ...R0.satellite, t: 5.2 }, { pos: [R0.satellite.pos[0], R0.satellite.pos[1] + 30, R0.satellite.pos[2]], tgt: R0.satellite.tgt, fov: 40, t: 8 }] };
      }
      if (id === 'quartiere') return { arrivo: 3.4, percorso: [{ ...R0.calata, t: 1.7 }, { ...R0.quartiere, t: 3.4 }, { pos: R0.quartiere.pos.map((v, i) => v + [1.5, -6, -3][i]), tgt: R0.quartiere.tgt, fov: 40, t: 7 }] };
      if (id === 'strada0') { const p = aS(sIn), A = occhio(sIn - 6, 0, OCCHI);   /* tuffo: dal 45° giù fino agli occhi, guardando lungo il viale */
        return { arrivo: 2.9, percorso: [
          { pos: [A[0] + p.dz * 0 - p.dx * 60, 95, A[2] - p.dz * 60], tgt: avanti(sIn, 20, 0), fov: 44, t: 1.3 },
          { pos: [A[0] - p.dx * 8, 9, A[2] - p.dz * 8], tgt: avanti(sIn, 26, 1.2), fov: 50, t: 2.3 },
          { pos: occhio(sIn), tgt: avanti(sIn, 26), fov: 52, t: 2.9 },
          { pos: occhio(sIn + 2.2), tgt: avanti(sIn + 2.2, 26), fov: 52, t: 6.5 }] };
      }
      if (id === 'strada1') return { arrivo: 2.6, percorso: [...lungo(sIn + 0.6, s1, 2.6), { pos: occhio(s1 + 1.6), tgt: avanti(s1 + 1.6, 26), fov: 52, t: 5.6 }] };
      if (id === 'strada2') return { arrivo: 2.6, percorso: [...lungo(s1 + 0.6, s2, 2.6), { pos: occhio(s2 + 1.4), tgt: avanti(s2 + 1.4, 26), fov: 52, t: 5.6 }] };
      if (id === 'villa') {   /* ti giri a destra mentre scivoli sull'altro marciapiede: la 27 di fronte, intera */
        const p = aS(s27), lat = -(larg / 2 + 2.2), F = occhio(s27 + 1.0, lat, OCCHI), T = [V27.c[0], 3.6, V27.c[1]];
        return { arrivo: 2.3, percorso: [
          { pos: occhio(s27 - 3, lat * 0.5), tgt: [ (T[0] + avanti(s27, 14)[0]) / 2, 2.4, (T[2] + avanti(s27, 14)[2]) / 2 ], fov: 54, t: 1.15 },
          { pos: F, tgt: T, fov: 47, t: 2.3 },
          { pos: (() => { const d = [T[0] - F[0], T[2] - F[2]], l = Math.hypot(...d); return [F[0] + d[0] / l * 1.2, F[1], F[2] + d[1] / l * 1.2]; })(), tgt: T, fov: 46, t: 6.5 }] };
      }
      if (id === 'dentro') {   /* I1 + P2: porta a bilico, ingresso a doppia altezza, salone, pranzo, cucina, la vetrata scorre, bordo piscina col Burj, sott'acqua, riemerge */
        const E = 2.05, K = (X, y, Z, tX, ty, tZ, fov, t) => ({ pos: VW(X, y, Z), tgt: VW(tX, ty, tZ), fov, t }), PZm = (VB.misure.PZ0 + VB.misure.PZ1) / 2;
        return { arrivo: 21.4, percorso: [
          K(-1.1, 1.95, -9.5, -1.1, 2.3, 0, 52, 1.7),          // attraversi e sali il vialetto, la porta davanti
          K(-1.1, E, -2.4, -1.1, 2.6, 4, 58, 3.2),             // la porta a bilico si apre
          K(-1.0, E, 2.2, -0.7, 4.6, 9, 64, 4.6),              // ingresso a doppia altezza: scala, lampadario, luce dall'alto
          K(-0.3, E, 8.2, 6.6, 1.5, 19.5, 62, 6.8),            // salone: divani grandi, vetrata a tutta altezza sul golf
          K(2.0, E, 9.4, 7.0, 1.4, 20.5, 60, 9.4),             // la camera rallenta
          K(1.6, E, 11.0, -1.1, 1.0, 14.2, 60, 11.3),          // pranzo: tavolo in pietra
          K(0.8, E, 12.2, -7.4, 1.2, 11.4, 60, 13.2),          // cucina con l'isola
          K(-1.2, E, 17.4, -1.2, 1.95, 40, 58, 15.2),          // verso la vetrata, che scorre
          K(-1.2, E - 0.1, 21.0, -1.2, 2.2, 120, 56, 16.6),    // fuori, terrazza
          K(-2.2, 1.65, 22.0, -1.6, -30, 600, 46, 17.7),       // bordo piscina a 1,6 m: la vasca davanti, golf e Burj all'orizzonte
          K(-1.2, -0.45, 27.3, -1.2, 5.0, 14, 70, 19.2),       // tuffo: sotto il pelo dell'acqua, guardi su la villa
          K(-1.2, -0.38, 27.6, -1.2, 6.0, 12, 72, 20.3),
          K(-1.2, 0.8, 27.9, -1.2, 5.2, 12, 64, 21.4),         // riemergi: la villa accesa davanti, intera, la piscina sotto
          K(-1.2, 0.88, 28.15, -1.2, 5.2, 12, 63, 25)] };
      }
      return R0.satellite;
    },
    trova(liv, ray, st) {
      const id = idDi(liv), hit = ray.ray.intersectPlane(piano, new THREE.Vector3());
      if (id === 'satellite') { if (!hit) return null; const z = zone.find(z => dentroPol([hit.x, hit.z], z.g)); return z ? { id: z.id, zona: z, esaurito: !z.click } : null; }
      if (id === 'quartiere') { if (!hit) return null; return { id: 'pin', p: [hit.x, hit.z] }; }
      if (id === 'strada0' || id === 'strada1') { if (!freccia.visible) return null; freccia.updateMatrixWorld(true); return ray.intersectObject(presa, false)[0] ? { id: 'freccia' } : null; }
      if (id === 'strada2') return ray.intersectObject(presa27, false)[0] ? { id: 'villa27' } : null;
      return null;
    },
    accendi(st) {
      const id = idDi(st.liv), h = st.hover; for (const z of zone) z.acceso = id === 'satellite' && h && h.zona === z;
    },
    // per il film dal vivo di VideoHub: si riparte da zero (stessi fotogrammi a ogni passaggio)
    reset() { lanterna = 0; dentroK = 0; livOra = -1; tLiv = 0; mFr.opacity = 0; freccia.visible = false; for (const z of zone) { z.k = 0; z.acceso = false; } Q.stato.pulisci();
      const m = window.__motore; if (m) { m.st.visto27 = false; m.st.pinPreso = false; m.T.now = 0; m.ui.click = null; m.ui.shake = null; m.ui.hT = 0; m.ui.sT = 0; m.ui.arr = 0; }
      const sc = G.parent; if (sc) { const emi = sc.children.find(o => o.isHemisphereLight); if (emi && emi.userData.i0 != null) emi.intensity = emi.userData.i0; if (sc.userData.e0 != null) sc.environmentIntensity = sc.userData.e0; if (nebbia0) sc.fog.color.copy(nebbia0.c); } },
    etichetta: () => null,
    ancora: () => V3(0, 0, 0),
    punto(p, st, proietta, ui) {
      if (p.bottone) { const b = ui.btns.find(b => b.id === p.bottone); return b ? b.c : null; }
      if (p.zona) { const z = zonaDi(p.zona); const q = proietta(V3(z.c[0] + (p.dx || 0), 0, z.c[1] + (p.dz || 0))); return [q[0], q[1]]; }
      if (p.dock) return [ui.W - 262, ui.H - 120];
      if (p.pin) { const q = proietta(V3(...occhio(sIn, 0, 0))); return [q[0], q[1]]; }
      if (p.freccia) { const q = proietta(freccia.position.clone().add(V3(0, 0.3, 0))); return [q[0], q[1]]; }
      if (p.villa) { const b = ui.btns.find(b => b.id === 'liv:' + livDi('villa')); if (b) return b.c; const q = proietta(V3(...VW(0, 4, 0))); return [q[0], q[1]]; }   /* il cartellino, o il fronte della villa */
      return p.xy || null;
    },
    ogniFrame(t, st, cam) {
      camOra = [cam.pos.x, cam.pos.y, cam.pos.z]; const id = idDi(st.liv); if (st.liv !== livOra) { livOra = st.liv; tLiv = t; }
      // contorni dei quartieri: il velo arancio sale e scende piano
      for (const z of zone) { const on = z.acceso || (id === 'quartiere' && z === scelta && t - tLiv < 1.2); const a = on ? 1 : 0; z.k = (z.k || 0) + (a - (z.k || 0)) * 0.18;
        z.bordo.visible = z.velo.visible = z.k > 0.01; z.bordo.material.opacity = z.k * 0.95; z.velo.material.opacity = z.k * 0.2; }
      // stato delle ville (X1): verdi libere, grigie vendute, la 27 che pulsa dopo il «No»; lanterna (V2)
      const kVis = id === 'quartiere' ? Math.min(1, (t - tLiv) / 0.8) : id === 'strada0' ? Math.max(0, 1 - (t - tLiv) / 1.1) : id === 'satellite' && st.visto27 ? 1 : 0;   /* il verde e il grigio solo dall'alto: in strada restano i cartellini */
      if (scelta) for (const v of scelta.lista) { const puls = id === 'satellite' && v.libera ? 0.55 + 0.45 * Math.sin(t * 4) : 1;
        if (v === V27 && st.visto27 && id === 'satellite') Q.stato.tinta(v.vid, S.colori.scelta, 0.85 * kVis); else Q.stato.tinta(v.vid, v.libera ? QU.VERDE : QU.GRIGIO, (v.libera ? 0.62 : 0.5) * kVis * puls); }
      const accesa = ['villa', 'dentro'].includes(id) ? 1 : 0; lanterna += (accesa - lanterna) * (accesa ? 0.05 : 0.2);
      Q.stato.luce(V27.vid, '#ffc98a', lanterna); VB.lanterna(Math.max(lanterna, S.villa.luceSempre || 0.18));
      const sv = VB.aggiorna(t, camOra), sc0 = G.parent;
      if (sc0) { const emi = sc0.children.find(o => o.isHemisphereLight); if (emi) { if (emi.userData.i0 == null) emi.userData.i0 = emi.intensity; if (sc0.userData.e0 == null) sc0.userData.e0 = sc0.environmentIntensity;
        const kIn = sv.dentro ? 1 : 0; dentroK += (kIn - dentroK) * 0.08; emi.intensity = emi.userData.i0 * (1 - 0.85 * dentroK); sc0.environmentIntensity = sc0.userData.e0 * (1 - 0.72 * dentroK); } }
      if (sc0 && sc0.fog) { if (!nebbia0 || nebbia0.f !== sc0.fog) nebbia0 = { f: sc0.fog, c: sc0.fog.color.clone() }; if (sv.sott) { sc0.fog.color.set('#1b8b9c'); sc0.fog.density = 0.09; } else sc0.fog.color.copy(nebbia0.c); }
      if (id === 'villa') st.visto27 = true;
      // frecce davanti alla camera (solo a camera arrivata)
      const fr = (id === 'strada0' || id === 'strada1') && st.arrivato === st.liv; freccia.visible = fr || mFr.opacity > 0.02; mFr.opacity += ((fr ? 0.92 : 0) - mFr.opacity) * 0.2;
      if (fr) { metti(freccia, (id === 'strada0' ? sIn : s1) + 9); mFr.color.set(st.hover && st.hover.id === 'freccia' ? S.colori.scelta : '#ffffff'); }
      // sole che segue la camera: ombre nitide in strada, larghe dal satellite
      const sc = G.parent; if (sc) { const sun = sc.children.find(o => o.isDirectionalLight); if (sun) {
        const fwd = new THREE.Vector3().subVectors(cam.tgt, cam.pos).normalize(), h = Math.max(1.5, cam.pos.y), d = fwd.y < -0.05 ? Math.min(h / -fwd.y, 4000) : Math.min(60, h * 20), C = cam.pos.clone().addScaledVector(fwd, d * (h < 20 ? 0.45 : 1)); C.y = 0;
        const ext = Math.min(1900, Math.max(70, h * 1.25 + (h < 20 ? 60 : 120))), dir = sun.userData.dir || (sun.userData.dir = sun.position.clone().normalize());
        sun.target.position.copy(C); sun.position.copy(C).addScaledVector(dir, 2400); const scm = sun.shadow.camera;
        if (Math.abs(scm.right - ext) > 1) { scm.left = scm.bottom = -ext; scm.right = scm.top = ext; scm.far = 6000; scm.updateProjectionMatrix(); sun.shadow.normalBias = ext / 4096 * 1.6; sun.shadow.bias = -0.0002; }
        sun.target.updateMatrixWorld(); }
        if (sc.fog && S.nebbia && !sv.sott) sc.fog.density = S.nebbia(cam.pos.y); }
    },
    pannello(c, st, now, ui, fermo) {
      const id = idDi(st.liv), a = QU.ease((now - st.tIn) / 0.5);
      if (id === 'satellite' && fermo && st.hover && st.hover.zona) { const z = st.hover.zona; QU.cardZona(c, ui, { nome: z.nome, liberi: z.liberi, tag: z.tag, ville: z.ville, camere: z.camere, da: z.da }, QU.ease((now - ui.hT) / 0.3)); }
      if (id === 'quartiere' && fermo) {
        QU.cardQuartiere(c, ui, { sopra: 'Dubai Hills · on the golf', titolo: scelta.nome, urgenza: `${sulGolfLibere} left on the golf`, da: `from ${QU.soldi(Math.min(...scelta.lista.filter(v => v.libera).map(v => v.prezzo)))}` }, a);
        const dock = [ui.W - 262, ui.H - 120], h = st.hover && st.hover.p ? ui.proietta(V3(st.hover.p[0], 0, st.hover.p[1])) : null, preso = st.pinPreso || (h && Math.hypot(h[0] - dock[0] + 102, h[1] - dock[1]) < 90);
        if (preso) st.pinPreso = true; QU.dockPin(c, ui, dock[0], dock[1], a, !!st.pinPreso);
        if (st.pinPreso && h) QU.pin(c, h[0], h[1], 1.1, 1);
      }
      if (id === 'strada0' && now - st.tIn < 2.4) { const q = ui.proietta(V3(...occhio(sIn, 0, 0))); if (q[2]) QU.pin(c, q[0], q[1], 1.1, Math.max(0, 1 - (now - st.tIn) / 0.5)); }
      // cartellini sopra i cancelli della strada, il prezzo cambia verso il golf (X2)
      if (['strada0', 'strada1', 'strada2', 'villa'].includes(id)) {
        const cp = st.camPos || camOra; const vis = [];
        for (const f of fila) { const g = f.v.cancello, d = Math.hypot(g.x - camOra[0], g.z - camOra[2]); if (d > 70 || d < 4) continue; const q = ui.proietta(V3(g.x, 2.2, g.z)); if (!q[2] || q[0] < 40 || q[0] > ui.W - 40) continue; vis.push({ f, q, d }); }
        vis.sort((p, q) => q.d - p.d);
        for (const { f, q, d } of vis) { const is27 = f.v === V27, sel = is27 && id === 'strada2' && fermo, al = Math.min(1, (70 - d) / 20) * (id === 'villa' && !is27 ? 0.0 : 1);
          if (id === 'villa' && is27) continue; if (al <= 0.02) continue;
          const r = QU.cartellino(c, q, { n: f.n, libera: f.v.libera, prezzo: f.v.prezzo, camere: f.v.camere, golf: f.golf }, al, sel, ui);
          if (sel) ui.btns.push({ id: 'liv:' + livDi('villa'), r, c: [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2] }); }
      }
      if (id === 'dentro' && fermo) QU.domanda(c, ui, a, st.hBtn === 'si', st.hBtn === 'liv:0');
      if (id === 'satellite' && st.visto27) { const q = ui.proietta(V3(CENTRO27[0], 8, CENTRO27[2])); if (q[2]) { QU.pin(c, q[0], q[1], 0.9, 0); QU.testo(c, String(S.villa.numero), q[0], q[1] - 27, '12px SFTB', '#fff', 0, 'center'); } }
      if (id === 'villa' && fermo) QU.cardVilla(c, ui, { comunita: scelta.nome, n: S.villa.numero, nome: S.villa.nome, urgenza: `${sulGolfLibere} left on the golf`, camere: S.villa.camere, area: S.villa.area, vista: S.villa.vista, prezzo: V27.prezzo, btn: 'liv:' + livDi('dentro') }, a, st.hBtn === 'liv:' + livDi('dentro'));
    },
  };
  return M;
}
