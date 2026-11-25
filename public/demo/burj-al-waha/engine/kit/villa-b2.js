// Motore choose-your · KIT VILLA B2 «Golf Place Vistas» (21/11/2026) — la villa 27 del «choose your villa».
// Fonte: brochure Emaar Golf Place (riferimenti/dubai-hills/brochure, pianta B2 6 camere, Contemporary 8.531 sq ft) e note della ricerca (NOTE.md).
// Misure lette dalla pianta in scala sul lotto (STIMA lotto 31 × 39 m → ~13,9 px/m sulla pianta da 1600 px): casa 20,8 × 20,5 m, garage 6,2 × 6,6 m davanti a sinistra,
// ingresso a doppia altezza al centro con la scala a destra, fascia aperta sul retro (famiglia + cucina a sinistra, pranzo al centro, salone a destra),
// terrazza coi lettini, piscina lunga trasversale (22 × 5 m) e poi il golf. Soffitti 3,0 m netti (regola di Nico), primo piano a sbalzo sul fronte.
// Arredi a misura RH (note interni): divano Cloud a L 3,4 × 3,4 m prof. 1,1 m seduta 0,48 schienale 0,81; tavolo Torano 2,74 × 1,07 × 0,76 m;
// sedie 0,61 × 0,66 × 0,91 m (STIMA) sempre rivolte al tavolo, 3 per lato + capotavola; isola 3,6 × 1,1 × 0,92 m; lettini Antibes 0,74 × 1,96 m.
// Coordinate locali: X verso destra guardando la casa dalla strada, Z dalla facciata (0) verso il golf, y in alto. Nel gruppo x = -X.
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../../vendor/addons/geometries/RoundedBoxGeometry.js';
import { canvasTex, rng, lerp, clamp } from './forme.js';
import { Water } from '../../vendor/addons/objects/Water.js';
import { alberi, palme } from './quartiere-verde.js';

// ---------------- materiali disegnati ----------------
function marmo(base, vene, { seed = 3, n = 7, larg = 2.2, rep = 3, toni = null } = {}) {   // lastra di marmo: poche vene lunghe e morbide, ognuna fatta di fili sottili sfumati
  const R = rng(seed);
  return canvasTex(1024, 2048, (c, w, h) => {
    c.fillStyle = base; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(${R() < 0.5 ? '255,255,255' : '90,80,75'},0.02)`; c.beginPath(); c.arc(R() * w, R() * h, 20 + R() * 90, 0, 7); c.fill(); }
    const tinte = toni || [vene];
    for (let i = 0; i < n; i++) {
      const col = tinte[Math.floor(R() * tinte.length)], x0 = R() * w, x3 = x0 + (R() - 0.5) * w * 0.9, c1 = [x0 + (R() - 0.5) * 500, h * (0.2 + R() * 0.2)], c2 = [x3 + (R() - 0.5) * 500, h * (0.6 + R() * 0.2)];
      for (let f = 0; f < 4 + Math.floor(R() * 5); f++) {   // fili paralleli della stessa vena
        const o = (R() - 0.5) * 26; c.strokeStyle = col; c.globalAlpha = 0.12 + R() * 0.35; c.lineWidth = larg * (0.25 + R() * 1.2); c.shadowColor = col; c.shadowBlur = 3 + R() * 12;
        c.beginPath(); c.moveTo(x0 + o, -20); c.bezierCurveTo(c1[0] + o + (R() - 0.5) * 30, c1[1], c2[0] + o + (R() - 0.5) * 30, c2[1], x3 + o, h + 20); c.stroke();
      }
    }
    c.globalAlpha = 1; c.shadowBlur = 0; c.strokeStyle = 'rgba(0,0,0,0.05)'; c.lineWidth = 1.5; c.strokeRect(1, 1, w - 2, h - 2);   // fuga tra le lastre
  }, { repeat: [1 / rep, 1 / (rep * 2)], aniso: 16 });
}
function travertino(seed = 5) {   // rivestimento in travertino beige a corsi (1,2 × 0,6 m), coi pori orizzontali
  const R = rng(seed);
  return canvasTex(1024, 512, (c, w, h) => {
    c.fillStyle = '#d9c8aa'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 128) for (let x = (y / 128 % 2) * 128; x < w + 256; x += 256) { const v = R(); c.fillStyle = `rgba(${v < 0.5 ? '255,245,225' : '150,120,85'},${0.06 + R() * 0.08})`; c.fillRect(x - 256, y, 256, 128); }
    for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(120,95,65,${0.08 + R() * 0.15})`; c.fillRect(R() * w, R() * h, 4 + R() * 26, 1 + R() * 2); }
    c.strokeStyle = 'rgba(110,90,65,0.35)'; c.lineWidth = 2; for (let y = 0; y <= h; y += 128) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); for (let x = (y / 128 % 2) * 128; x < w + 256; x += 256) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 128); c.stroke(); } }
  }, { repeat: [1 / 4.8, 1 / 2.4], aniso: 16 });
}
function legno(base = '#5a3a26', seed = 7) {   // noce: venature lunghe
  const R = rng(seed);
  return canvasTex(512, 1024, (c, w, h) => { c.fillStyle = base; c.fillRect(0, 0, w, h); for (let i = 0; i < 260; i++) { const x = R() * w; c.strokeStyle = `rgba(${R() < 0.5 ? '255,220,180' : '20,10,5'},${0.05 + R() * 0.1})`; c.lineWidth = 1 + R() * 3; c.beginPath(); c.moveTo(x, 0); for (let y = 0; y < h; y += 64) c.lineTo(x + Math.sin(y * 0.01 + i) * 6, y); c.stroke(); } }, { repeat: [1 / 1.2, 1 / 2.4], aniso: 8 });
}
function tessuto(base, seed = 9) { const R = rng(seed); return canvasTex(256, 256, (c, w, h) => { c.fillStyle = base; c.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { c.fillStyle = `rgba(${R() < 0.5 ? '255,255,255' : '0,0,0'},0.05)`; c.fillRect(R() * w, R() * h, 2, 2); } }, { repeat: [3, 3] }); }
function mosaico() { const R = rng(4); return canvasTex(512, 512, (c, w, h) => { for (let y = 0; y < h; y += 16) for (let x = 0; x < w; x += 16) { const v = R(); c.fillStyle = `rgb(${150 + v * 30},${205 + v * 25},${210 + v * 25})`; c.fillRect(x, y, 15, 15); } }, { repeat: [1 / 1.6, 1 / 1.6], aniso: 8 }); }

// palette degli interni in prova (codici per la board di Nico; niente cognac + travertino + beige di default)
export const PALETTE = {
  P1: { nome: 'Avorio e Calacatta Viola', pav: ['#efe9e2', '#7b3d4c', ['#7b3d4c', '#9b6a72', '#b8aaa6']], muri: '#efe9df', divano: '#ece6db', accento: '#6d2234', tavolo: ['#f1ebe5', '#6e2f3e', ['#6e2f3e', '#8f5562']], sedie: '#d9cfc1', ottone: '#b48a4f', legno: '#4a2f22', isola: ['#efe9e2', '#7b3d4c', ['#7b3d4c', '#a99a95']] },
  P2: { nome: 'Zaffiro e Verde Alpi', pav: ['#d8d6d2', '#9a9894', ['#a19e99', '#bdbab4']], muri: '#f2efe9', divano: '#1d3463', accento: '#c9a45a', tavolo: ['#1f3b2f', '#e8efe9', ['#e8efe9', '#8fb39f']], sedie: '#ebe6dc', ottone: '#c9a45a', legno: '#3b2a20', isola: ['#1f3b2f', '#e8efe9', ['#e8efe9', '#8fb39f']] },
  P3: { nome: 'Smeraldo e Nero Marquina', pav: ['#efebe4', '#b9b2a8', ['#bdb5aa', '#d6cfc5']], muri: '#ede8df', divano: '#0f4a3a', accento: '#d4af6a', tavolo: ['#141414', '#f2f2f2', ['#f2f2f2', '#9a9a9a']], sedie: '#e9e3d8', ottone: '#d4af6a', legno: '#2c1f18', isola: ['#141414', '#f2f2f2', ['#f2f2f2', '#9a9a9a']] },
  P4: { nome: 'Ardesia, nero e noce', pav: ['#5b5c5d', '#7a7b7c', ['#6c6d6e', '#8a8b8c']], muri: '#e9e6e1', divano: '#efece6', accento: '#1a1a1a', tavolo: ['#e9e7e3', '#9a9894', ['#a8a6a2']], sedie: '#3a2a20', ottone: '#9b7a4a', legno: '#4b3224', isola: ['#e9e7e3', '#9a9894', ['#a8a6a2']] },
};

export function villaB2(opz = {}) {
  const pal = PALETTE[opz.pal] || PALETTE.P1, R = rng(opz.seme || 27), G = new THREE.Group(); G.name = 'villa-b2';
  const M = {
    intonaco: new THREE.MeshStandardMaterial({ color: '#efebe4', roughness: 0.86 }),
    travertino: new THREE.MeshStandardMaterial({ map: travertino(), roughness: 0.75 }),
    scuro: new THREE.MeshStandardMaterial({ color: '#25221f', roughness: 0.38, metalness: 0.6 }),
    bronzo: new THREE.MeshStandardMaterial({ color: '#6b4c33', roughness: 0.35, metalness: 0.75 }),
    vetro: new THREE.MeshStandardMaterial({ color: '#d4e3ea', roughness: 0.02, metalness: 0.1, transparent: true, opacity: 0.16, envMapIntensity: 2.2, depthWrite: false, side: THREE.DoubleSide }),
    vetroFF: new THREE.MeshStandardMaterial({ color: '#7d8b93', roughness: 0.03, metalness: 0.65, envMapIntensity: 1.6 }),   // primo piano: vetro a specchio (le camere non si vedono)
    pavimento: new THREE.MeshStandardMaterial({ map: marmo(pal.pav[0], pal.pav[1], { toni: pal.pav[2], rep: 1.6, seed: 11, n: 5, larg: 1.2 }), roughness: 0.14, metalness: 0.02, envMapIntensity: 0.9 }),
    muri: new THREE.MeshStandardMaterial({ color: pal.muri, roughness: 0.9 }),
    soffitto: new THREE.MeshStandardMaterial({ color: '#f6f3ee', roughness: 0.95 }),
    divano: new THREE.MeshStandardMaterial({ map: tessuto(pal.divano), roughness: 0.95 }),
    accento: new THREE.MeshStandardMaterial({ map: tessuto(pal.accento, 12), roughness: 0.8 }),
    tavolo: new THREE.MeshStandardMaterial({ map: marmo(pal.tavolo[0], pal.tavolo[1], { toni: pal.tavolo[2], rep: 2.7, seed: 21, larg: 3 }), roughness: 0.12, envMapIntensity: 1.1 }),
    isola: new THREE.MeshStandardMaterial({ map: marmo(pal.isola[0], pal.isola[1], { toni: pal.isola[2], rep: 3.6, seed: 31, larg: 3 }), roughness: 0.14, envMapIntensity: 1.1 }),
    sedie: new THREE.MeshStandardMaterial({ map: tessuto(pal.sedie, 13), roughness: 0.92 }),
    ottone: new THREE.MeshStandardMaterial({ color: pal.ottone, roughness: 0.28, metalness: 1 }),
    legno: new THREE.MeshStandardMaterial({ map: legno(pal.legno), roughness: 0.55 }),
    tappeto: new THREE.MeshStandardMaterial({ map: tessuto('#d8d0c4', 15), roughness: 1 }),
    luce: new THREE.MeshStandardMaterial({ color: '#2a2622', emissive: '#ffcf8f', emissiveIntensity: 0 }),
    piastra: new THREE.MeshStandardMaterial({ map: travertino(8), color: '#efe6d6', roughness: 0.8 }),
    mosaico: new THREE.MeshStandardMaterial({ map: mosaico(), roughness: 0.3 }),
    acqua: new THREE.MeshStandardMaterial({ color: '#2aa6bf', roughness: 0.03, metalness: 0.45, transparent: true, opacity: 0.86, envMapIntensity: 1.8, side: THREE.DoubleSide, depthWrite: false }),
    lettino: new THREE.MeshStandardMaterial({ map: tessuto('#f1ede6', 17), roughness: 0.95 }),
    prato: new THREE.MeshStandardMaterial({ color: '#5f8a37', roughness: 1 }),
  };
  M.luce.userData.lanterna = 3.2; for (const k in M) M[k].name = 'b2_' + k;
  const add = (geo, mat, x, y, z, { ry = 0, ombra = true, nome } = {}) => { const m = new THREE.Mesh(geo, mat); m.position.set(-x, y, z); m.rotation.y = -ry; m.castShadow = ombra; m.receiveShadow = true; if (nome) m.name = nome; G.add(m); return m; };
  // scatola dai bordi in coordinate di pianta: X0..X1, y0..y1, Z0..Z1 (con UV in metri per le texture)
  const box = (X0, X1, y0, y1, Z0, Z1, mat, o = {}) => { const w = X1 - X0, h = y1 - y0, d = Z1 - Z0, g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]); }
    return add(g, mat, (X0 + X1) / 2, (y0 + y1) / 2, (Z0 + Z1) / 2, o); };
  const tondo = (w, h, d, r, mat, X, y, Z, o = {}) => add(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2)), mat, X, y + h / 2, Z, o);
  const W0 = -10.4, W1 = 10.4, D1 = 20.5, Y0 = 0.3, YC = 3.3, YF = 3.85, YC2 = 6.85, YR = 7.35, T = 0.3;   // facciate, piani, spessori (STIMA dalla pianta e dalle note)
  const VX0 = -3.6, VX1 = 2.6, VZ = 7.0;   // vuoto a doppia altezza dell'ingresso

  // ---------------- basamento, pavimenti, solai, tetto ----------------
  box(W0 - 0.2, W1 + 0.2, 0, Y0, -1.2, D1 + 0.2, M.piastra, { ombra: false });   // zoccolo in pietra (0,3 m)
  box(W0 + T, W1 - T, Y0, Y0 + 0.01, T, D1 - 0.05, M.pavimento, { ombra: false, nome: 'pavimento' });
  box(W0, VX0, YC, YF, -1.4, D1, M.soffitto); box(VX1, W1, YC, YF, -1.4, D1, M.soffitto); box(VX0, VX1, YC, YF, VZ, D1, M.soffitto);   // solaio del primo piano col vuoto dell'ingresso
  box(W0 - 0.15, W1 + 0.15, YC2, YR, -1.4, 19.5, M.intonaco); box(W0 - 0.15, W1 + 0.15, YR, YR + 0.3, -1.6, 19.7, M.intonaco);   // tetto e cornicione sottile
  box(W0 - 0.1, W1 + 0.1, YF - 0.25, YF, D1, 21.9, M.intonaco);   // pensilina sopra la terrazza (balcone del primo piano)

  // ---------------- piano terra: muri esterni ----------------
  // fronte: blocco servizi a sinistra (dietro il garage), blocco ospiti a destra in travertino, al centro la vetrata a doppia altezza con la porta a bilico
  box(W0, VX0, Y0, YC, 0, T, M.intonaco); box(VX1, W1, Y0, YC, 0, T, M.travertino);
  box(VX1 + 2.2, VX1 + 4.4, Y0 + 0.4, YC - 0.3, -0.02, 0.02, M.vetroFF, { ombra: false });   // finestra alta della camera ospiti
  // lati
  box(W0, W0 + T, Y0, YC, 0, D1, M.intonaco); box(W1 - T, W1, Y0, YC, 0, D1, M.intonaco);
  box(W1 - 0.02, W1 + 0.02, Y0 + 0.4, YC - 0.3, 12, 17, M.vetroFF, { ombra: false }); box(W0 - 0.02, W0 + 0.02, Y0 + 0.4, YC - 0.3, 15, 19, M.vetroFF, { ombra: false });
  // retro: vetrata a tutta larghezza a pannelli da 2,5 m (il pannello centrale scorre: si esce in piscina)
  const scorrevoli = [];
  for (let x = W0 + 0.4; x < W1 - 0.4; x += 2.5) {
    const x1 = Math.min(x + 2.5, W1 - 0.4), centrale = x < -0.5 && x1 > -0.5;
    const pan = new THREE.Group(); const gl = new THREE.Mesh(new THREE.BoxGeometry(x1 - x - 0.06, YC - Y0 - 0.06, 0.03), M.vetro); pan.add(gl);
    for (const [px, w] of [[-(x1 - x) / 2, 0.05], [(x1 - x) / 2, 0.05]]) { const f = new THREE.Mesh(new THREE.BoxGeometry(w, YC - Y0, 0.06), M.scuro); f.position.x = px; pan.add(f); }
    pan.position.set(-(x + x1) / 2, (Y0 + YC) / 2, D1 - 0.15 - (centrale ? 0.08 : 0)); G.add(pan); if (centrale) scorrevoli.push({ pan, x0: pan.position.x, w: x1 - x });
  }
  box(W0, W1, Y0, Y0 + 0.05, D1 - 0.25, D1 - 0.05, M.scuro, { ombra: false }); box(W0, W1, YC - 0.05, YC, D1 - 0.25, D1 - 0.05, M.scuro, { ombra: false });   // binari
  // vetrata a doppia altezza dell'ingresso con montanti sottili, e la porta a bilico in bronzo
  for (let x = VX0; x <= VX1 + 0.01; x += (VX1 - VX0) / 4) box(x - 0.03, x + 0.03, Y0, YC2, -0.04, 0.04, M.scuro, { ombra: false });
  box(VX0, VX1, YF - 0.04, YF + 0.04, -0.05, 0.05, M.scuro, { ombra: false });
  const vetroIng = []; for (const [a, b] of [[VX0, -2.0], [-0.2, VX1]]) vetroIng.push(box(a + 0.03, b - 0.03, Y0, YC2, -0.01, 0.01, M.vetro, { ombra: false })); box(-2.0, -0.2, YF - 0.3, YC2, -0.01, 0.01, M.vetro, { ombra: false });
  const porta = new THREE.Group(); const anta = new THREE.Mesh(new THREE.BoxGeometry(1.8, 3.4, 0.09), M.bronzo); anta.position.set(-0.45, 0, 0); anta.castShadow = true; porta.add(anta);
  const maniglia = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.6, 0.06), M.ottone); maniglia.position.set(-1.2, 0, -0.08); porta.add(maniglia);
  porta.position.set(1.55, Y0 + 1.7, 0); G.add(porta);   // perno a X -1,55 (0,45 m dal bordo sinistro dell'anta): porta a bilico
  box(-2.0, -0.2, Y0 + 3.4, YF - 0.3, -0.03, 0.03, M.bronzo, { ombra: false });

  // ---------------- primo piano: due volumi bianchi a sbalzo sul fronte, frangisole scuri, vetro a specchio ----------------
  for (const [a, b] of [[W0, VX0], [VX1, W1]]) {
    box(a, b, YF, YC2, -1.4, -1.1, M.intonaco); box(a + 0.9, b - 0.9, YF + 0.55, YC2 - 0.45, -1.42, -1.38, M.vetroFF, { ombra: false });
    for (let y = YF + 0.7; y < YC2 - 0.5; y += 0.22) box(a + 0.9, b - 0.9, y, y + 0.05, -1.62, -1.5, M.scuro);   // frangisole orizzontali (brochure)
    box(a, a + T, YF, YC2, -1.4, 19.5, M.intonaco); box(b - T, b, YF, YC2, -1.4, 19.5, M.intonaco);
    box(a, b, YF - 0.5, YF, -1.4, 0, M.intonaco);   // intradosso dello sbalzo
  }
  // retro del primo piano: vetrate e parapetti in vetro sulla pensilina
  for (let x = W0 + 0.6; x < W1 - 0.6; x += 2.4) box(x, Math.min(x + 2.3, W1 - 0.6), YF + 0.1, YC2 - 0.2, 19.35, 19.4, M.vetroFF, { ombra: false });
  box(W0, W1, YF, YF + 1.05, 21.8, 21.85, M.vetro, { ombra: false }); box(W0, W1, YF + 1.05, YF + 1.1, 21.75, 21.9, M.scuro, { ombra: false });
  // fianchi del vuoto (dentro, a doppia altezza) e muri interni del piano terra
  box(VX0 - T, VX0, Y0, YC2, T, VZ, M.muri); box(VX1, VX1 + T, Y0, YC2, T, VZ, M.muri);
  box(W0, VX0 - T, Y0, YC, 8.3, 8.3 + 0.2, M.muri); box(VX1 + T, W1, Y0, YC, 9.4, 9.6, M.muri);   // retro dei blocchi servizi e ospiti
  box(VX0, VX1, YF, YF + 0.06, VZ - 0.2, VZ, M.scuro); box(VX0, VX1, YF + 0.06, YF + 1.06, VZ - 0.12, VZ - 0.08, M.vetro, { ombra: false });   // ballatoio col vetro sul vuoto
  box(VX0, VX1, YC2 - 0.02, YC2, T, VZ, M.soffitto, { ombra: false });
  const lucernario = box(VX0 + 0.8, VX1 - 0.8, YC2 - 0.04, YC2 - 0.02, 1.4, VZ - 1.2, new THREE.MeshStandardMaterial({ color: '#fff6e6', emissive: '#fff1da', emissiveIntensity: 1.4 }), { ombra: false });   // lucernario: luce dall'alto
  // scala a sbalzo in pietra lungo il fianco destro del vuoto (20 alzate da 17,75 cm, pedate 29 cm) con parapetto in vetro
  for (let i = 0; i < 20; i++) { const y = Y0 + (i + 1) * (YF - Y0) / 20, z = 0.9 + i * 0.29; box(VX1 - 1.35, VX1, y - 0.07, y, z, z + 0.31, M.piastra); }
  box(VX1 - 1.4, VX1 - 1.36, Y0, YF + 1.0, 0.9, 6.7, M.vetro, { ombra: false });

  // ---------------- garage davanti a sinistra ----------------
  box(W0, -4.2, 0, YF, -6.6, 0, M.intonaco); box(W0 + 0.6, -4.8, 0.1, 2.7, -6.65, -6.6, M.legno); box(W0 - 0.1, -4.1, YF, YF + 0.25, -6.8, 0, M.intonaco);

  // ---------------- arredi a misura vera (RH), tutti sullo stesso asse ----------------
  // salone a destra (X 2..10, Z 11..19,5): divano Cloud a L 3,4 × 3,4 m rivolto alla vetrata, più un tre posti 3,4 m di fronte; tavolino in pietra; tappeto 5 × 4 m
  box(2.4, 9.6, Y0, Y0 + 0.015, 12.2, 18.2, M.tappeto, { ombra: false });
  const divano = (X, Z, L, ry, mat = M.divano) => { const g = new THREE.Group(); const p = (w, h, d, x, y, z, m = mat) => { const q = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, 0.08), m); q.position.set(x, y, z); q.castShadow = q.receiveShadow = true; g.add(q); };
    p(L, 0.3, 1.1, 0, 0.15, 0); p(L - 0.1, 0.18, 0.85, 0, 0.39, 0.1); p(L, 0.5, 0.26, 0, 0.55, -0.42); for (let k = 0; k < Math.round(L / 1.1); k++) p(0.9, 0.45, 0.2, -L / 2 + 0.55 + k * 1.1, 0.68, -0.25); g.position.set(-X, Y0, Z); g.rotation.y = -ry; G.add(g); return g; };
  divano(6.0, 14.0, 3.4, 0); divano(4.25, 15.7, 3.4, Math.PI / 2); divano(6.0, 18.9, 2.4, Math.PI, M.accento);
  tondo(1.6, 0.36, 1.6, 0.04, M.tavolo, 6.0, Y0, 16.0); tondo(0.5, 0.5, 0.5, 0.2, M.ottone, 9.0, Y0, 13.6);
  box(9.9, 10.1, Y0, Y0 + 2.6, 11.5, 18.5, M.legno);   // parete in noce sul fianco del salone
  // pranzo al centro (X -3,6..1,4, Z 9..18): tavolo Torano 2,74 × 1,07 m lungo l'asse della casa, 3 sedie per lato + capotavola, tutte rivolte al tavolo
  const TX = -1.1, TZ = 13.4; tondo(1.07, 0.06, 2.74, 0.02, M.tavolo, TX, Y0 + 0.70, TZ); box(TX - 0.35, TX + 0.35, Y0, Y0 + 0.70, TZ - 0.9, TZ - 0.7, M.tavolo); box(TX - 0.35, TX + 0.35, Y0, Y0 + 0.70, TZ + 0.7, TZ + 0.9, M.tavolo);
  const sedia = (X, Z, ry) => { const g = new THREE.Group(); const p = (w, h, d, x, y, z, m = M.sedie) => { const q = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.04), m); q.position.set(x, y, z); q.castShadow = true; q.receiveShadow = true; g.add(q); };
    p(0.58, 0.1, 0.56, 0, 0.47, 0); p(0.58, 0.5, 0.1, 0, 0.76, -0.27); for (const sx of [-0.24, 0.24]) for (const sz of [-0.22, 0.22]) p(0.04, 0.44, 0.04, sx, 0.22, sz, M.legno);
    g.position.set(-X, Y0, Z); g.rotation.y = ry; G.add(g); };   // ry: la sedia guarda verso +z locale ruotato; lo schienale sta dietro
  for (let k = -1; k <= 1; k++) { sedia(TX - 0.86, TZ + k * 0.82, -Math.PI / 2); sedia(TX + 0.86, TZ + k * 0.82, Math.PI / 2); }   /* controllato: ogni sedia guarda il tavolo */
  sedia(TX, TZ - 1.72, 0); sedia(TX, TZ + 1.72, Math.PI);
  const lampadario = box(TX - 0.08, TX + 0.08, YC - 0.9, YC - 0.85, TZ - 1.1, TZ + 1.1, M.luce, { ombra: false }); box(TX - 0.01, TX + 0.01, YC - 0.85, YC, TZ - 1, TZ - 0.98, M.ottone, { ombra: false }); box(TX - 0.01, TX + 0.01, YC - 0.85, YC, TZ + 0.98, TZ + 1, M.ottone, { ombra: false });
  // cucina a sinistra (X -10..-4, Z 9..14): isola in pietra a cascata 3,6 × 1,1 × 0,92 m, colonne in noce contro il muro, tre sgabelli
  box(-7.9, -6.8, Y0, Y0 + 0.92, 9.6, 13.2, M.isola); box(-10.1, -9.45, Y0, Y0 + 2.9, 8.8, 14.4, M.legno); box(-9.45, -9.40, Y0 + 0.95, Y0 + 2.0, 9.2, 14.0, M.isola, { ombra: false });   /* paraschizzi nella stessa pietra dell'isola */
  for (let k = 0; k < 3; k++) { const z = 10.2 + k * 1.2; tondo(0.45, 0.06, 0.42, 0.03, M.sedie, -6.35, Y0 + 0.62, z); box(-6.37, -6.33, Y0, Y0 + 0.62, z - 0.02, z + 0.02, M.ottone, { ombra: false }); }
  box(-7.4, -7.3, YC - 0.9, YC - 0.85, 10, 12.8, M.luce, { ombra: false });
  // famiglia a sinistra in fondo (X -10..-4, Z 14,5..20): divano e tappeto
  box(-9.6, -4.6, Y0, Y0 + 0.015, 15.2, 19.4, M.tappeto, { ombra: false }); divano(-7.1, 16.0, 3.0, 0); tondo(1.2, 0.32, 0.7, 0.03, M.legno, -7.1, Y0, 17.6);
  // ingresso: tavolo tondo in pietra col vaso (come le foto vere: bonsai nella vasca), lampadario a cascata nel vuoto
  add(new THREE.CylinderGeometry(0.75, 0.75, 0.06, 48), M.tavolo, -0.5, Y0 + 0.76, 3.6); add(new THREE.CylinderGeometry(0.28, 0.34, 0.76, 32), M.tavolo, -0.5, Y0 + 0.38, 3.6);
  add(new THREE.SphereGeometry(0.35, 16, 12), new THREE.MeshStandardMaterial({ color: '#4d6b33', roughness: 0.9 }), -0.5, Y0 + 1.15, 3.6);
  const cascata = []; for (let k = 0; k < 26; k++) { const a = k * 2.4, r = 0.25 + (k % 5) * 0.12; cascata.push(add(new THREE.CylinderGeometry(0.025, 0.025, 0.5 + (k % 4) * 0.3, 8), M.luce, -0.5 + Math.cos(a) * r, YC2 - 1.6 - (k % 4) * 0.3, 3.6 + Math.sin(a) * r, { ombra: false })); }
  // gole di luce nel controsoffitto del salone e del pranzo (LED caldi)
  box(2.2, 9.8, YC - 0.06, YC - 0.03, 11.0, 11.06, M.luce, { ombra: false }); box(2.2, 9.8, YC - 0.06, YC - 0.03, 19.7, 19.76, M.luce, { ombra: false });
  box(-3.4, 1.2, YC - 0.06, YC - 0.03, 9.6, 9.66, M.luce, { ombra: false });

  // ---------------- terrazza, lettini, piscina lunga, giardino verso il golf ----------------
  const PZ0 = 23.4, PZ1 = 28.4, PX0 = -10.0, PX1 = 12.0, PY = 0.18, FONDO = -1.45;   // piscina 22 × 5 m, acqua a 18 cm, fondo a -1,45 m (STIMA, brochure: «long and narrow»)
  box(W0 - 0.5, W1 + 1.8, 0, Y0, D1, PZ0, M.piastra, { ombra: false });   // terrazza in pietra
  for (const [X0, X1, Z0, Z1] of [[PX0 - 0.5, PX1 + 0.5, PZ0 - 0.5, PZ0], [PX0 - 0.5, PX1 + 0.5, PZ1, PZ1 + 0.5], [PX0 - 0.5, PX0, PZ0, PZ1], [PX1, PX1 + 0.5, PZ0, PZ1]]) box(X0, X1, 0.22, Y0, Z0, Z1, M.piastra, { ombra: false });   // bordo
  // vasca: pareti e fondo a mosaico (rivolti verso dentro)
  const vasca = (X0, X1, y0, y1, Z0, Z1) => box(X0, X1, y0, y1, Z0, Z1, M.mosaico, { ombra: false });
  vasca(PX0, PX1, FONDO - 0.1, FONDO, PZ0, PZ1); vasca(PX0 - 0.1, PX0, FONDO, PY + 0.05, PZ0, PZ1); vasca(PX1, PX1 + 0.1, FONDO, PY + 0.05, PZ0, PZ1); vasca(PX0, PX1, FONDO, PY + 0.05, PZ0 - 0.1, PZ0); vasca(PX0, PX1, FONDO, PY + 0.05, PZ1, PZ1 + 0.1);
  const acqua = add(new THREE.PlaneGeometry(PX1 - PX0, PZ1 - PZ0), M.acqua, (PX0 + PX1) / 2, PY, (PZ0 + PZ1) / 2, { ombra: false }); acqua.rotation.x = -Math.PI / 2; acqua.renderOrder = 3; acqua.name = 'acqua-piscina'; acqua.visible = false;
  // da sopra: acqua che riflette davvero (specchio con increspature e il riflesso del sole basso), da sotto il velo trasparente qui sopra
  const normali = canvasTex(256, 256, (c, w, h) => { const im = c.createImageData(w, h), H = (x, y) => Math.sin(x * 6.2832 * 3 / w + Math.sin(y * 6.2832 * 2 / h) * 1.3) * 0.5 + Math.sin(y * 6.2832 * 5 / h + x * 6.2832 * 2 / w) * 0.35 + Math.sin((x + y) * 6.2832 * 7 / w) * 0.15;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const dx = H(x + 1, y) - H(x - 1, y), dy = H(x, y + 1) - H(x, y - 1), l = Math.hypot(dx * 4, dy * 4, 1), o = (y * w + x) * 4; im.data[o] = (-dx * 4 / l * 0.5 + 0.5) * 255; im.data[o + 1] = (-dy * 4 / l * 0.5 + 0.5) * 255; im.data[o + 2] = (1 / l * 0.5 + 0.5) * 255; im.data[o + 3] = 255; }
    c.putImageData(im, 0, 0); }, { srgb: false });
  const acquaW = new Water(new THREE.PlaneGeometry(PX1 - PX0, PZ1 - PZ0), { textureWidth: 1024, textureHeight: 512, waterNormals: normali, sunDirection: (opz.sole || new THREE.Vector3(0.7, 0.2, 0.3)).clone().normalize(), sunColor: '#ffcf96', waterColor: '#1a8ea2', distortionScale: 0.22, fog: true });
  acquaW.material.uniforms.size.value = 1.6; acquaW.rotation.x = -Math.PI / 2; acquaW.position.set(-(PX0 + PX1) / 2, PY, (PZ0 + PZ1) / 2); acquaW.name = 'acqua-specchio'; G.add(acquaW);
  const luciVasca = []; for (let x = PX0 + 2; x < PX1 - 1; x += 4) luciVasca.push(box(x - 0.15, x + 0.15, FONDO + 0.5, FONDO + 0.7, PZ0 + 0.0, PZ0 + 0.03, new THREE.MeshStandardMaterial({ color: '#cfffff', emissive: '#bff6ff', emissiveIntensity: 2 }), { ombra: false }));
  for (let k = 0; k < 4; k++) { const X = -6.5 + k * 2.6; const g = new THREE.Group(); const p = (w, h, d, x, y, z, m, rx = 0) => { const q = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.05), m); q.position.set(x, y, z); q.rotation.x = rx; q.castShadow = q.receiveShadow = true; g.add(q); };
    p(0.74, 0.18, 1.45, 0, 0.3, 0.2, M.lettino); p(0.74, 0.14, 0.62, 0, 0.5, -0.72, M.lettino, -0.7); p(0.7, 0.24, 1.9, 0, 0.12, 0, M.legno); g.position.set(-X, Y0, 21.9); G.add(g); }   // lettini Antibes 0,74 × 1,96 m, testa verso la casa
  // prato dietro la piscina fino al confine, siepe bassa e parapetto in vetro verso il golf (render brochure p.8)
  box(W0 - 4, W1 + 4, 0.0, 0.02, PZ1 + 0.5, 33.5, M.prato, { ombra: false });
  box(W0 - 4, W1 + 4, 0, 1.1, 33.5, 33.55, M.vetro, { ombra: false }); box(W0 - 4, W1 + 4, 0, 0.12, 33.45, 33.6, M.piastra, { ombra: false });

  // ---------------- dettagli che fanno casa vera (critico 21/11: «la stanza è vuota») ----------------
  box(-3.6, 1.4, Y0, Y0 + 0.012, 10.6, 16.2, M.tappeto, { ombra: false });   // tappeto sotto il pranzo (STIMA 5 × 5,6 m)
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; add(new THREE.SphereGeometry(0.07, 12, 8), M.luce, TX + Math.cos(a) * 0.35, YC - 0.95 + Math.sin(a * 2) * 0.03, TZ + Math.sin(a) * 1.0, { ombra: false }); }   // lampadario ad anello sopra il tavolo
  for (const dz of [-0.45, 0.4]) add(new THREE.CylinderGeometry(0.09, 0.07, 0.32 + (dz > 0 ? 0.12 : 0), 24), M.ottone, TX, Y0 + 0.92, TZ + dz);   // vasi sul tavolo
  const tenda = new THREE.MeshStandardMaterial({ color: '#f4efe6', roughness: 1, transparent: true, opacity: 0.82, side: THREE.DoubleSide });
  const tendaGeo = (w, h) => { const g = new THREE.PlaneGeometry(w, h, Math.round(w * 10), 1), pa = g.attributes.position; for (let i = 0; i < pa.count; i++) pa.setZ(i, Math.sin(pa.getX(i) * 9) * 0.05); g.computeVertexNormals(); return g; };
  for (const [X0, X1] of [[W0 + 0.35, W0 + 2.6], [W1 - 2.6, W1 - 0.35]]) add(tendaGeo(X1 - X0, YC - Y0 - 0.05), tenda, (X0 + X1) / 2, (Y0 + YC) / 2, D1 - 0.45, { ombra: false });   // tende di lino ai lati della vetrata
  const quadro = canvasTex(512, 640, (c, w, h) => { const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#e8dccb'); g.addColorStop(0.5, '#c9a98a'); g.addColorStop(1, '#6d3b3f'); c.fillStyle = g; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(30,20,20,0.35)'; c.beginPath(); c.ellipse(w * 0.55, h * 0.6, w * 0.3, h * 0.22, 0.4, 0, 7); c.fill(); c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = 6; c.beginPath(); c.moveTo(w * 0.1, h * 0.8); c.bezierCurveTo(w * 0.4, h * 0.2, w * 0.7, h * 0.9, w * 0.95, h * 0.3); c.stroke(); });
  box(9.86, 9.9, Y0 + 0.8, Y0 + 2.6, 13.2, 16.6, new THREE.MeshStandardMaterial({ map: quadro, roughness: 0.8 }), { ombra: false });   // quadro grande sulla parete in noce
  for (const [X, Z] of [[9.2, 19.6], [2.6, 19.6], [-9.6, 19.6]]) box(X - 0.45, X + 0.45, Y0, Y0 + 0.6, Z - 0.45, Z + 0.45, M.piastra);   // fioriere in pietra dentro
  const ulivi = [[9.2, 19.6, 0.38], [2.6, 19.6, 0.34], [-9.6, 19.6, 0.36]].map(([X, Z, k]) => [-X, Z, k]);
  const UL = alberi(ulivi.map(([x, z, k]) => [x, z, k]), { colore: '#c7d0b4', seme: 41 }); UL.position.y = Y0 + 0.6; G.add(UL);   // ulivi in vaso (chioma piccola)
  // fuori: fioriere con ulivi ai capi della piscina, palme sui fianchi del lotto (render brochure p.8)
  for (const [X, Z] of [[PX0 - 1.6, PZ0 - 1.2], [PX1 + 1.4, PZ0 - 1.2]]) box(X - 0.7, X + 0.7, Y0, Y0 + 0.7, Z - 0.7, Z + 0.7, M.piastra);
  const UF = alberi([[-(PX0 - 1.6), PZ0 - 1.2, 0.42], [-(PX1 + 1.4), PZ0 - 1.2, 0.42]], { colore: '#c7d0b4', seme: 43 }); UF.position.y = Y0 + 0.7; G.add(UF);
  G.add(palme([[-(W0 - 2.6), 23, 6.5, 1], [-(W0 - 2.6), 30, 7.2, 1], [-(W1 + 3.2), 23.5, 6.8, 1], [-(W1 + 3.2), 30.5, 7.4, 1]], { seme: 47 }));

  // ---------------- luci di casa (si accendono con la lanterna) ----------------
  const lampade = [];
  for (const [X, y, Z, k] of [[-0.5, 5.6, 3.4, 26], [6.0, 2.9, 15.5, 22], [-1.1, 2.6, 13.4, 18], [-7.2, 2.8, 11.5, 15], [-7.0, 2.8, 17.5, 13], [3.0, 2.9, 10.5, 9]]) {
    const l = new THREE.PointLight('#ffc98a', 0, 14, 1.6); l.position.set(-X, y, Z); l.userData.lanterna = k; G.add(l); lampade.push(l); }
  const lPisc = new THREE.PointLight('#7fe9ff', 0, 12, 1.5); lPisc.position.set(-1, FONDO + 0.4, (PZ0 + PZ1) / 2); lPisc.userData.lanterna = 10; G.add(lPisc); lampade.push(lPisc);

  const S = {
    gruppo: G, porta, scorrevoli, acqua, lampade, M, misure: { W0, W1, D1, Y0, YC, YF, YC2, PX0, PX1, PZ0, PZ1, PY, FONDO, VX0, VX1, VZ },
    // punto locale (X, y, Z) → mondo
    w(X, y, Z) { G.updateMatrixWorld(); const v = new THREE.Vector3(-X, y, Z).applyMatrix4(G.matrixWorld); return [v.x, v.y, v.z]; },
    lanterna(k) { M.luce.emissiveIntensity = 3.2 * k; lucernario.material.emissiveIntensity = 0.6 + 1.4 * k; for (const l of lampade) l.intensity = l.userData.lanterna * k; for (const m of luciVasca) m.material.emissiveIntensity = 2.5 * k; },
    // porta a bilico e vetrata che scorre: si aprono quando la camera si avvicina (in coordinate locali)
    aggiorna(t, camW) { const inv = new THREE.Matrix4().copy(G.matrixWorld).invert(), p = new THREE.Vector3(...camW).applyMatrix4(inv), X = -p.x, Z = p.z;
      const dP = Math.hypot(X + 1.1, Z), ap = clamp((4.2 - dP) / 2.4); porta.rotation.y = -ap * 1.45;
      const dS = Math.hypot(X + 1.25, Z - D1), as = clamp((5.5 - dS) / 2.5); for (const s of scorrevoli) s.pan.position.x = s.x0 - as * (s.w - 0.1);
      const sott = p.y < PY + 0.02; acqua.visible = sott; acquaW.visible = !sott && Math.hypot(X, Z - 20) < 140; acquaW.material.uniforms.time.value = t * 0.5;
      M.acqua.opacity = 0.35; return { sott: p.y < PY && X > PX0 && X < PX1 && Z > PZ0 && Z < PZ1, dentro: X > W0 && X < W1 && Z > 0 && Z < D1 && p.y < YR }; },
  };
  return S;
}
