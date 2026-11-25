// Motore choose-your · interni delle torri da «Dubai super ricco» (Nico 20/11 sera): arredi enormi in stile RH, tutti dritti
// sullo stesso asse, misure vere da catalogo (MISURE qui sotto, fonti in riferimenti/the-split/interni/FONTI.txt), soffitto 3,1 m.
// Tre palette da far scegliere in board (?pal=1|2|3): 1 Smeraldo e marmo nero · 2 Avorio e Calacatta Viola · 3 Blu notte e Verde Alpi.
// La casa si monta in un sistema locale DRITTO: u lungo la vetrata, v verso dentro (0 = vetro), y dal pavimento. Metri.
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../../vendor/addons/geometries/RoundedBoxGeometry.js';
import { canvasTex, rng } from './forme.js';

// misure in metri (stile RH: componibili profondi e bassi, tavoli in pietra massicci, sedie imbottite grandi)
export const MISURE = {   /* da rh.com, schede lette il 20/11 (FONTI.txt gruppo L e nota the-split-lusso-nomi-20nov.md) */
  componibile: { prof: 1.13, seduta: 0.48, schienale: 0.81, bracciolo: 0.61, braccioloLargo: 0.36, modulo: 1.07 },   /* Cloud U-Chaise Luxe 451 x 229 x 81, seduta 48, braccioli 61; profondità modulo come Maddox 113 */
  poltrona: { larg: 0.93, prof: 0.84, seduta: 0.46, schienale: 0.72 },   /* Aria Swivel Luxe 93 x 84 x 72 */
  tavolino: { larg: 1.93, prof: 0.81, alto: 0.36 },   /* Rocco 76" 193 x 81 x 36 */
  tavolo: { lungo: 3.4, larg: 1.25, alto: 0.75, piano: 0.09, perLato: 3 },   /* su misura 340 x 125 x 75 (Nico 20/11: più grande, al massimo 3 sedie per lato); base Aero Stone 120" 305 x 117 */
  sedia: { larg: 0.61, prof: 0.69, seduta: 0.52, schienale: 1.04 },   /* Belgian Track Arm 61 x 69 x 104, seduta 52 */
  isola: { lungo: 4.2, larg: 1.3, alto: 0.92 },
  sgabello: { seduta: 0.76 },
  lampadario: { diam: 1.42, alto: 0.91 },   /* Audubon 56" diametro 142, alto 91 */
};

export const PALETTE = {
  1: { nome: 'Smeraldo e marmo nero', divano: '#1f4b3c', poltrona: '#e7e0d4', legno: '#3b2a1e', marmo: ['#17171a', '#e9e6e0'], metallo: '#c9a064', pavimento: '#b89c7a', parete: '#5a3f2c', tappeto: '#ddd5c8', cuscini: '#c9a064', sedie: '#e7e0d4', arte: ['#1f4b3c', '#c9a064', '#e7e0d4'], lastra: ['#f1ece4', '#8f8a84'] },
  2: { nome: 'Avorio e Calacatta Viola', divano: '#ece6da', poltrona: '#5c1f28', legno: '#231c18', marmo: ['#f3eee8', '#7b3a46'], metallo: '#a87c50', pavimento: '#5b4a3c', parete: '#2c2522', tappeto: '#d6cbbd', cuscini: '#5c1f28', sedie: '#5c1f28', arte: ['#5c1f28', '#ece6da', '#a87c50'], lastra: ['#f3eee8', '#7b3a46'] },
  3: { nome: 'Blu notte e Verde Alpi', divano: '#1c2541', poltrona: '#cdbfa8', legno: '#c9b38f', marmo: ['#1e3a2d', '#dbe3d8'], metallo: '#cfa86a', pavimento: '#cdb593', parete: '#e2d8ca', tappeto: '#bdb7ac', cuscini: '#cfa86a', sedie: '#1c2541', arte: ['#1c2541', '#cfa86a', '#8b9a7d'], lastra: ['#1e3a2d', '#dbe3d8'] },
};

export function materiali(n = 1) {
  const P = PALETTE[n] || PALETTE[1], std = (c, r, m = 0, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, ...extra });
  return {
    P, velluto: std(P.divano, 0.82, 0, { map: tessutoTex() }), poltrona: std(P.poltrona, 0.88, 0, { map: tessutoTex() }), legno: std(P.legno, 0.42, 0, { map: legnoTex() }), metallo: std(P.metallo, 0.24, 0.95),
    marmo: std('#ffffff', 0.16, 0.02, { map: marmoTex(P.marmo[0], P.marmo[1]) }), lastra: std('#ffffff', 0.14, 0.02, { map: marmoTex(P.lastra[0], P.lastra[1], 2) }),
    pavimento: std('#ffffff', 0.3, 0.02, { map: lastrePavTex(P.pavimento), side: THREE.DoubleSide }),
    parete: std('#ffffff', 0.6, 0, { map: cannettatoTex(P.parete), side: THREE.DoubleSide }), tappeto: std(P.tappeto, 0.97, 0, { map: tessutoTex() }), cuscini: std(P.cuscini, 0.7), sedie: std(P.sedie, 0.8, 0, { map: tessutoTex() }),
    intonaco: std('#efe9df', 0.9, 0, { side: THREE.DoubleSide, emissive: new THREE.Color('#fff1de'), emissiveIntensity: 0.32 }), luce: std('#fff3dc', 0.3, 0, { emissive: new THREE.Color('#ffcf8f'), emissiveIntensity: 0.9 }),
    cristallo: std('#fff8ec', 0.08, 0.1, { emissive: new THREE.Color('#ffd9a0'), emissiveIntensity: 0.6, transparent: true, opacity: 0.92 }),
    vaso: std('#d9cfbf', 0.7), foglia: std('#6f8256', 0.9), tronco: std('#5d4c3d', 0.9), arte: std('#ffffff', 0.8, 0, { map: arteTex(P.arte) }), nero: std('#141414', 0.5, 0.2),
  };
}

const rb = (w, h, d, r = 0.06) => new RoundedBoxGeometry(w, h, d, 4, Math.max(0.005, Math.min(r, w / 2 - 0.002, h / 2 - 0.002, d / 2 - 0.002)));
function pezzo(g, geo, mat, x, y, z, ry = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; g.add(m); return m; }

// ---------- mobili ----------
// componibile tipo Cloud: moduli profondi e morbidi, schienale basso, braccioli larghi e bassi. L = larghezza totale, guarda verso +z
export function componibile(M, L) {
  const D = MISURE.componibile, g = new THREE.Group(), n = Math.max(2, Math.round((L - 2 * D.braccioloLargo) / D.modulo)), w = (L - 2 * D.braccioloLargo) / n;
  pezzo(g, rb(L, 0.22, D.prof, 0.06), M.velluto, 0, 0.11, 0);
  for (let k = 0; k < n; k++) { const x = -L / 2 + D.braccioloLargo + w * (k + 0.5);
    pezzo(g, rb(w - 0.02, D.seduta - 0.2, D.prof - 0.28, 0.12), M.velluto, x, 0.22 + (D.seduta - 0.22) / 2, 0.12);
    pezzo(g, rb(w - 0.04, D.schienale - D.seduta + 0.08, 0.3, 0.14), M.velluto, x, D.seduta + (D.schienale - D.seduta) / 2 - 0.02, -D.prof / 2 + 0.17); }
  for (const s of [-1, 1]) pezzo(g, rb(D.braccioloLargo, D.bracciolo, D.prof, 0.14), M.velluto, s * (L / 2 - D.braccioloLargo / 2), D.bracciolo / 2, 0);
  for (const [x, r] of [[-L / 2 + 0.75, 0.2], [-L / 2 + 1.25, -0.1], [L / 2 - 0.8, -0.2]]) pezzo(g, rb(0.55, 0.5, 0.16, 0.08), M.cuscini, x, D.seduta + 0.24, -D.prof / 2 + 0.38, r);
  return g;
}
// angolare a L: lato lungo + lato corto
export function angolare(M, Llungo, Lcorto) {
  const D = MISURE.componibile, g = new THREE.Group(); const a = componibile(M, Llungo); g.add(a);
  const b = componibile(M, Lcorto); b.rotation.y = Math.PI / 2; b.position.set(-Llungo / 2 + D.prof / 2, 0, D.prof / 2 + Lcorto / 2 - 0.02); g.add(b); return g;
}
export function poltrona(M) { const D = MISURE.poltrona, g = new THREE.Group(); pezzo(g, rb(D.larg, D.seduta, D.prof, 0.16), M.poltrona, 0, D.seduta / 2, 0); pezzo(g, rb(D.larg, D.schienale - D.seduta + 0.05, 0.26, 0.13), M.poltrona, 0, (D.schienale + D.seduta) / 2, -D.prof / 2 + 0.13);
  for (const s of [-1, 1]) pezzo(g, rb(0.22, D.schienale - 0.12, D.prof, 0.11), M.poltrona, s * (D.larg / 2 - 0.11), (D.schienale - 0.12) / 2, 0); return g; }
export function tavolino(M) { const D = MISURE.tavolino, g = new THREE.Group(); pezzo(g, rb(D.larg, D.alto, D.prof, 0.03), M.marmo, 0, D.alto / 2, 0); return g; }   // blocco unico di pietra
export function tavolo(M) {
  const D = MISURE.tavolo, g = new THREE.Group(); pezzo(g, rb(D.lungo, D.piano, D.larg, 0.02), M.marmo, 0, D.alto - D.piano / 2, 0);
  for (const s of [-1, 1]) pezzo(g, rb(0.42, D.alto - D.piano, D.larg * 0.62, 0.03), M.marmo, s * D.lungo * 0.3, (D.alto - D.piano) / 2, 0);
  /* sedie rivolte al tavolo: la sedia guarda verso -z (schienale a +z), quindi a +z resta dritta e a -z si gira di 180° */
  const n = D.perLato || 3; for (let k = 0; k < n; k++) for (const s of [-1, 1]) { const c = sedia(M); c.position.set(-D.lungo / 2 + D.lungo / n * (k + 0.5), 0, s * (D.larg / 2 + 0.28)); c.rotation.y = s > 0 ? 0 : Math.PI; g.add(c); }
  for (const s of [-1, 1]) { const c = sedia(M); c.position.set(s * (D.lungo / 2 + 0.38), 0, 0); c.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2; g.add(c); }
  return g;
}
export function sedia(M) { const S = MISURE.sedia, g = new THREE.Group(); pezzo(g, rb(S.larg, 0.12, S.prof, 0.05), M.sedie, 0, S.seduta - 0.06, 0); pezzo(g, rb(S.larg, S.schienale - S.seduta, 0.1, 0.05), M.sedie, 0, (S.schienale + S.seduta) / 2, S.prof / 2 - 0.05);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) pezzo(g, new THREE.CylinderGeometry(0.02, 0.018, S.seduta - 0.12, 8), M.legno, x * (S.larg / 2 - 0.05), (S.seduta - 0.12) / 2, z * (S.prof / 2 - 0.06)); return g; }
export function cucina(M, L = 6.0) {   // parete di mobili a tutta altezza con la lastra di marmo, isola con le teste a cascata e 4 sgabelli
  const I = MISURE.isola, g = new THREE.Group();
  pezzo(g, rb(L, 0.9, 0.68, 0.01), M.legno, 0, 0.45, -0.34); pezzo(g, rb(L + 0.02, 0.04, 0.7, 0.01), M.marmo, 0, 0.92, -0.34); pezzo(g, rb(L, 1.3, 0.03, 0.005), M.lastra, 0, 1.6, -0.67);
  for (const s of [-1, 1]) pezzo(g, rb(1.2, 3.08, 0.7, 0.01), M.legno, s * (L / 2 + 0.6), 1.54, -0.34);
  pezzo(g, rb(I.lungo - 0.2, I.alto - 0.06, I.larg - 0.1, 0.02), M.legno, 0, (I.alto - 0.06) / 2, 2.1); pezzo(g, rb(I.lungo, 0.06, I.larg, 0.015), M.marmo, 0, I.alto - 0.03, 2.1);
  for (const s of [-1, 1]) pezzo(g, rb(0.06, I.alto, I.larg, 0.01), M.marmo, s * (I.lungo / 2 - 0.03), I.alto / 2, 2.1);
  for (let k = 0; k < 4; k++) { const x = -1.5 + k; const st = new THREE.Group(); pezzo(st, rb(0.46, 0.1, 0.46, 0.04), M.sedie, 0, MISURE.sgabello.seduta, 0); pezzo(st, rb(0.46, 0.3, 0.06, 0.03), M.sedie, 0, MISURE.sgabello.seduta + 0.2, 0.2); pezzo(st, new THREE.CylinderGeometry(0.025, 0.025, MISURE.sgabello.seduta, 8), M.metallo, 0, MISURE.sgabello.seduta / 2, 0); st.position.set(x, 0, 2.1 + I.larg / 2 + 0.45); st.rotation.y = 0; g.add(st); }   /* Nico 21/11: girati verso l'isola (schienale dall'altra parte), prima erano al contrario */
  /* sopra l'isola: ciotola d'ottone coi limoni, vaso di fiori bianchi, vassoio coi bicchieri (Nico 21/11: roba di lusso, non vuota) */
  const sopra = I.alto; { const f = fruttiera(M); f.position.set(-0.9, sopra, 2.05); g.add(f); const v = vasoFiori(M, 0.9); v.position.set(1.0, sopra, 2.15); g.add(v); const t = vassoio(M); t.position.set(0.1, sopra, 2.0); g.add(t); }
  return g;
}
// ---------- oggetti di lusso (Nico 21/11: «metti roba di lusso, non vuota»): fiori, limoni, libri d'arte, candele, vasi da terra ----------
const MX = {}; const mx = (k, c, r, m = 0, e = {}) => MX[k] || (MX[k] = new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, ...e }));
export function fruttiera(M) { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.SphereGeometry(0.22, 32, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.metallo); b.scale.y = 0.45; b.position.y = 0.1; b.castShadow = true; g.add(b);
  const R = rng(21); for (let i = 0; i < 7; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), mx('limone', '#e8c44a', 0.55)); const a = i / 7 * Math.PI * 2; l.position.set(Math.cos(a) * 0.1 * (i ? 1 : 0), 0.1 + (i ? 0 : 0.05) + R() * 0.02, Math.sin(a) * 0.1 * (i ? 1 : 0)); l.scale.set(1, 0.85, 1); l.castShadow = true; g.add(l); } return g; }
export function vasoFiori(M, k = 1) { const g = new THREE.Group(), R = rng(31);
  pezzo(g, new THREE.CylinderGeometry(0.09, 0.07, 0.34, 32), mx('ceramica', '#f2eee6', 0.35), 0, 0.17, 0);
  for (let i = 0; i < 16; i++) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.32 + R() * 0.2, 4), M.foglia); const a = R() * 6.28, r = R() * 0.08; st.position.set(Math.cos(a) * r, 0.42, Math.sin(a) * r); st.rotation.set((R() - 0.5) * 0.5, 0, (R() - 0.5) * 0.5); g.add(st);
    const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.045 + R() * 0.03, 1), mx(R() < 0.7 ? 'fiore' : 'fiore2', R() < 0.7 ? '#fbf7f0' : '#f1d9d2', 0.85)); f.position.set(Math.cos(a) * (r + 0.06), 0.55 + R() * 0.16, Math.sin(a) * (r + 0.06)); f.castShadow = true; g.add(f); }
  g.scale.setScalar(k); return g; }
export function vassoio(M) { const g = new THREE.Group(); pezzo(g, rb(0.5, 0.025, 0.32, 0.01), M.metallo, 0, 0.0125, 0);
  for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.12, 20, 1, true), mx('vetro', '#ffffff', 0.05, 0, { transparent: true, opacity: 0.35 })); c.position.set(-0.15 + i * 0.1, 0.085, 0); g.add(c); } return g; }
export function libri(M, colori = ['#e9e2d6', '#1d1d1f', '#b8925a']) { const g = new THREE.Group(); let y = 0; colori.forEach((c, i) => { const h = 0.04 + i * 0.006; pezzo(g, rb(0.36 - i * 0.03, h, 0.27 - i * 0.02, 0.004), mx('libro' + c, c, 0.7), (i % 2 ? 0.02 : -0.01), y + h / 2, 0, (i - 1) * 0.08); y += h; });
  const s = new THREE.Mesh(new THREE.TorusKnotGeometry(0.06, 0.018, 80, 10), M.metallo); s.position.set(0, y + 0.1, 0); s.castShadow = true; g.add(s); return g; }
export function candele(M) { const g = new THREE.Group(); [[-0.12, 0.34], [0, 0.42], [0.12, 0.3]].forEach(([x, h]) => { pezzo(g, new THREE.CylinderGeometry(0.03, 0.04, 0.03, 16), M.metallo, x, 0.015, 0); pezzo(g, new THREE.CylinderGeometry(0.018, 0.018, h, 12), mx('cera', '#f6f1e7', 0.6), x, 0.03 + h / 2, 0);
  const fl = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), mx('fiamma', '#ffd28a', 0.3, 0, { emissive: new THREE.Color('#ffb24a'), emissiveIntensity: 2.2 })); fl.position.set(x, 0.045 + h, 0); fl.scale.y = 1.8; g.add(fl); }); return g; }
export function centrotavola(M) { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.16, 0.12, 40), mx('ceramicaScura', '#2b2522', 0.4)); b.position.y = 0.06; b.castShadow = true; g.add(b);
  const R = rng(44); for (let i = 0; i < 14; i++) { const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.06 + R() * 0.04, 1), mx(R() < 0.5 ? 'fiore' : 'fiore2', '#fbf7f0', 0.85)); const a = R() * 6.28, r = R() * 0.22; f.position.set(Math.cos(a) * r, 0.16 + R() * 0.1, Math.sin(a) * r * 0.6); f.castShadow = true; g.add(f); }
  for (let i = 0; i < 9; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), M.foglia); const a = R() * 6.28; l.position.set(Math.cos(a) * 0.3, 0.14, Math.sin(a) * 0.18); l.scale.set(1.6, 0.4, 0.8); g.add(l); }
  for (const s of [-1, 1]) { const c = candele(M); c.position.x = s * 0.85; g.add(c); } return g; }
export function vasoTerra(M, k = 1) { const g = new THREE.Group(), R = rng(57); const v = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.95, 40), mx('ceramicaTerra', '#cdbca6', 0.55)); v.position.y = 0.475; v.castShadow = true; g.add(v);
  for (let i = 0; i < 12; i++) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.01, 1.1 + R() * 0.6, 5), M.tronco); const a = R() * 6.28; r.position.set(Math.cos(a) * 0.05, 1.45, Math.sin(a) * 0.05); r.rotation.set((R() - 0.5) * 0.7, 0, (R() - 0.5) * 0.7); g.add(r);
    for (let j = 0; j < 5; j++) { const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.04, 0), M.foglia); f.position.set(r.position.x + Math.sin(r.rotation.z) * -0.4 * (j / 5) + (R() - 0.5) * 0.2, 1.55 + j * 0.13, r.position.z + Math.sin(r.rotation.x) * 0.4 * (j / 5) + (R() - 0.5) * 0.2); g.add(f); } }
  g.scale.setScalar(k); return g; }
export function lampadario(M) { const D = MISURE.lampadario, g = new THREE.Group(); const r = new THREE.Mesh(new THREE.TorusGeometry(D.diam / 2, 0.035, 10, 72), M.metallo); r.rotation.x = Math.PI / 2; g.add(r);
  const R = rng(3); for (let i = 0; i < 46; i++) { const a = i / 46 * Math.PI * 2, rr = D.diam / 2 * (0.75 + R() * 0.3), l = 0.15 + R() * D.alto; const c = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, l, 6), M.cristallo); c.position.set(Math.cos(a) * rr, -l / 2, Math.sin(a) * rr); g.add(c); }
  return g; }
export function lampadaTerra(M) { const g = new THREE.Group(); pezzo(g, new THREE.CylinderGeometry(0.2, 0.2, 0.03, 24), M.metallo, 0, 0.015, 0); pezzo(g, new THREE.CylinderGeometry(0.015, 0.015, 1.65, 8), M.metallo, 0, 0.83, 0); const s = pezzo(g, new THREE.CylinderGeometry(0.26, 0.32, 0.36, 32, 1, true), M.luce, 0, 1.7, 0); s.castShadow = false; return g; }
export function ulivo(M, k = 1) { const g = new THREE.Group(), R = rng(7); pezzo(g, new THREE.CylinderGeometry(0.5, 0.42, 0.7, 32), M.vaso, 0, 0.35, 0); pezzo(g, new THREE.CylinderGeometry(0.05, 0.08, 1.4, 8), M.tronco, 0, 1.3, 0);
  for (let i = 0; i < 10; i++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28 + R() * 0.16, 2), M.foglia); s.position.set((R() - 0.5) * 0.9, 1.9 + R() * 0.5, (R() - 0.5) * 0.9); s.scale.set(1, 0.7, 1); s.castShadow = true; g.add(s); } g.scale.setScalar(k); return g; }
export function quadro(M, w = 2.2, h = 1.5) { const g = new THREE.Group(); pezzo(g, rb(w + 0.06, h + 0.06, 0.05, 0.005), M.nero, 0, 0, 0); pezzo(g, new THREE.PlaneGeometry(w, h), M.arte, 0, 0, 0.027); return g; }
function tappeto(M, w, d) { const t = new THREE.Mesh(new THREE.BoxGeometry(w, 0.02, d), M.tappeto); t.receiveShadow = true; const g = new THREE.Group(); t.position.y = 0.01; g.add(t); return g; }

// ---------- la casa: tutto su un asse dritto (niente mobili storti) ----------
// F = { at(u, v) -> [x, z], ry: rotazione che guarda la vetrata }, y = pavimento, prof = profondità fino alla parete dentro, alto = soffitto
export function casa(grp, M, F, y, prof = 9.5, alto = 3.1, opz = {}) {
  /* opz.specchio: stessa casa girata a specchio (l'attico, Nico 20/11: altri colori e un'altra disposizione); i muri restano veri, si specchiano solo i mobili e la lastra dietro al divano */
  const su = opz.specchio ? -1 : 1;
  const put = (o, u, v, verso = 0, dy = 0, spec = true) => { const uu = spec ? su * u : u, vv = spec && su < 0 ? -verso : verso; const [x, z] = F.at(uu, v); o.position.set(x, y + dy, z); o.rotation.y = F.ry + vv; if (spec && su < 0) o.scale.x *= -1; grp.add(o); return o; };
  const VETRO = 0, DENTRO = Math.PI;
  // open space su tutto il piano (Nico 20/11): niente pareti interne, solo la parete di fondo (il nucleo) da vetrata a vetrata
  let u0 = -6, u1 = 6; if (F.vetro) { for (let u = 0; u > -60; u -= 0.5) { const v = F.vetro(u); if (v == null || v > prof - 0.6) break; u0 = u; } for (let u = 0; u < 60; u += 0.5) { const v = F.vetro(u); if (v == null || v > prof - 0.6) break; u1 = u; } }
  const muro = (a, b, mat) => { if (b - a < 0.05) return null; const w = b - a, m = new THREE.Mesh(new THREE.PlaneGeometry(w, alto), mat); const g = new THREE.Group(); m.position.y = alto / 2; m.receiveShadow = true; g.add(m); put(g, (a + b) / 2, prof, VETRO, 0, false); return g; };
  { const L1 = su > 0 ? [-9.5, -1.8] : [1.8, 9.5], A0 = u0 - 0.5, B0 = u1 + 0.5, lo = Math.max(A0, L1[0]), hi = Math.min(B0, L1[1]); muro(A0, lo, M.parete); muro(lo, hi, M.lastra); muro(hi, B0, M.parete); }
  // angolo lettura in fondo a sinistra: due poltrone, tavolino, lampada
  if ((su > 0 ? -u0 : u1) > 12) { put(poltrona(M), -13.4, prof - 2.2, VETRO + 0.5); put(poltrona(M), -11.6, prof - 1.6, VETRO - 0.3); put(lampadaTerra(M), -14.6, prof - 0.8); }
  // soggiorno: angolare enorme che guarda la vetrata, poltrone di spalle al vetro, tavolino in pietra, tappeto grande
  put(tappeto(M, 6.4, 5.2), -5.6, 4.7);
  put(angolare(M, 4.51, 2.29), -5.6, 6.7, VETRO);
  put(tavolino(M), -5.6, 4.95, VETRO); put(tavolino(M), -5.6, 4.05, VETRO);
  put(poltrona(M), -7.0, 2.5, DENTRO); put(poltrona(M), -4.2, 2.5, DENTRO);
  put(lampadaTerra(M), -8.6, 7.6); put(quadro(M, 2.6, 1.6), -5.6, prof - 0.05, VETRO, 1.6); put(ulivo(M, 1.15), -9.4, prof - 1.0);
  // pranzo: tavolo in pietra da 3,4 m, 3 sedie grandi per lato + 2 a capotavola, tutte rivolte al tavolo, lampadario sopra
  put(tavolo(M), 1.6, 4.4, VETRO + Math.PI / 2); put(lampadario(M), 1.6, 4.4, 0, alto - 0.12);
  /* Nico 21/11: la casa piena di cose belle, non vuota */
  put(centrotavola(M), 1.6, 4.4, VETRO + Math.PI / 2, MISURE.tavolo.alto);
  put(libri(M), -5.95, 4.95, VETRO + 0.15, MISURE.tavolino.alto); put(vasoFiori(M, 0.8), -5.1, 4.05, VETRO, MISURE.tavolino.alto); put(fruttiera(M), -6.1, 4.05, VETRO, MISURE.tavolino.alto);
  put(vasoTerra(M, 1.1), 4.3, prof - 0.7); put(vasoTerra(M, 0.9), -2.6, prof - 0.6); put(ulivo(M, 0.9), 10.6, 1.4);
  // cucina contro la parete: mobili a tutta altezza, lastra, isola con le teste a cascata
  put(cucina(M, 5.6), 7.6, prof - 0.72, VETRO);
  return grp;
}

// ---------- texture ----------
function marmoTex(a, b, k = 1) { return canvasTex(1024, 512, (c, w, h) => { c.fillStyle = a; c.fillRect(0, 0, w, h); const R = rng(5 + k);
  for (let i = 0; i < 22 * k; i++) { c.strokeStyle = b; c.globalAlpha = 0.18 + R() * 0.5; c.lineWidth = 0.6 + R() * 2.6; c.beginPath(); let x = R() * w, y = 0; c.moveTo(x, y); while (y < h) { x += (R() - 0.5) * 80; y += 18 + R() * 30; c.lineTo(x, y); } c.stroke(); } c.globalAlpha = 1; }); }
function lastrePavTex(col) { return canvasTex(1024, 1024, (c, w, h) => { const R = rng(12), b = new THREE.Color(col); for (let y = 0; y < h; y += 256) for (let x = 0; x < w; x += 512) { const k = 0.92 + R() * 0.14; c.fillStyle = `rgb(${b.r * 255 * k | 0},${b.g * 255 * k | 0},${b.b * 255 * k | 0})`; c.fillRect(x, y, 512, 256); c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(x, y, 2, 256); c.fillRect(x, y, 512, 2); } }, { repeat: [1, 1] }); }
function cannettatoTex(col) { return canvasTex(256, 64, (c, w, h) => { const b = new THREE.Color(col); for (let x = 0; x < w; x += 16) { const g = c.createLinearGradient(x, 0, x + 16, 0); const f = (k) => `rgb(${b.r * 255 * k | 0},${b.g * 255 * k | 0},${b.b * 255 * k | 0})`; g.addColorStop(0, f(0.72)); g.addColorStop(0.5, f(1.15)); g.addColorStop(1, f(0.72)); c.fillStyle = g; c.fillRect(x, 0, 16, h); } }, { repeat: [10, 1] }); }
function legnoTex() { return canvasTex(512, 128, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); const R = rng(3); for (let i = 0; i < 60; i++) { c.strokeStyle = `rgba(0,0,0,${0.05 + R() * 0.08})`; c.lineWidth = 1 + R() * 2; c.beginPath(); const y = R() * h; c.moveTo(0, y); for (let x = 0; x < w; x += 32) c.lineTo(x, y + Math.sin(x / 50 + i) * 3); c.stroke(); } }); }
function tessutoTex() { return canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); const R = rng(8); for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(${R() < 0.5 ? '0,0,0' : '255,255,255'},${0.03 + R() * 0.05})`; c.fillRect(R() * w, R() * h, 2, 2); } }, { repeat: [3, 3] }); }
function arteTex(cols) { return canvasTex(512, 352, (c, w, h) => { c.fillStyle = '#efe9df'; c.fillRect(0, 0, w, h); c.fillStyle = cols[0]; c.beginPath(); c.arc(w * 0.38, h * 0.55, h * 0.36, 0, 7); c.fill(); c.fillStyle = cols[1]; c.fillRect(w * 0.55, h * 0.18, w * 0.22, h * 0.64); c.fillStyle = cols[2]; c.beginPath(); c.arc(w * 0.7, h * 0.3, h * 0.12, 0, 7); c.fill(); }); }
