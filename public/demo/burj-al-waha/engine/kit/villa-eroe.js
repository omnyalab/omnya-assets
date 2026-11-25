// Motore choose-your · KIT VILLA GRANDE della foto 2 (23/11/2026, «choose your villa» sul lago, cartella 17).
// Copia della villa al centro della foto 2 di Nico (pin 809451733072858453), misure dal camera matching (strumenti/traccia_villa_lago.py):
// volume basso vetrato lungo 43,1 m e profondo 16 m (STIMA), lastra di copertura bianca sottile che sporge tutto intorno, pannelli di legno in facciata,
// volume alto dietro al centro (13 × 10 m, a 7,8 m), piscina dietro a sinistra, garage bianco davanti col doppio portone e la Lambo davanti.
// Stile Dubai golf club (Emirates Hills): bianco, travertino, legno di teak, vetro a tutta altezza.
// Dentro (Nico 23/11: «basta sempre le stesse cose, piante e ficus in vaso, non alberi dentro»): un solo grande ambiente sul retro vetrato,
// pavimento in travertino a lastre grandi, soffitto a doghe di rovere chiaro, divani bassi componibili, tavolino in pietra verde, ficus lyrata, strelitzie e monstere in vasi di pietra.
// Coordinate locali: X lungo la facciata dalla punta sinistra (0) a destra (43,1), Z dalla facciata verso il retro, y in alto. Nel gruppo x = -X (come la villa B2), così il gruppo si gira e basta.
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../../vendor/addons/geometries/RoundedBoxGeometry.js';
import { canvasTex, rng } from './forme.js';
import { Water } from '../../vendor/addons/objects/Water.js';

function travertinoTex(seed = 5, base = '#e8dcc6') {
  const R = rng(seed);
  return canvasTex(1024, 1024, (c, w, h) => {
    c.fillStyle = base; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 256) for (let x = 0; x < w; x += 512) { c.fillStyle = `rgba(${R() < 0.5 ? '255,250,240' : '150,125,95'},${0.05 + R() * 0.07})`; c.fillRect(x, y, 512, 256); }
    for (let i = 0; i < 3800; i++) { c.fillStyle = `rgba(130,105,75,${0.05 + R() * 0.12})`; c.fillRect(R() * w, R() * h, 4 + R() * 30, 1 + R() * 2); }
    c.strokeStyle = 'rgba(120,100,75,0.3)'; c.lineWidth = 1.5; for (let y = 0; y <= h; y += 256) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } for (let x = 0; x <= w; x += 512) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
  }, { repeat: [1 / 2.4, 1 / 2.4], aniso: 16 });
}
function doghe(base = '#cfae84', seed = 9) {   // rovere chiaro a doghe strette (soffitto e pannelli)
  const R = rng(seed);
  return canvasTex(512, 512, (c, w, h) => { c.fillStyle = base; c.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 16) { c.fillStyle = `rgba(${R() < 0.5 ? '255,235,205' : '90,60,35'},${0.06 + R() * 0.1})`; c.fillRect(x, 0, 14, h); c.fillStyle = 'rgba(40,25,15,0.45)'; c.fillRect(x + 14, 0, 2, h); } }, { repeat: [1 / 2, 1 / 2], aniso: 16 });
}
function tessuto(base, seed = 9) { const R = rng(seed); return canvasTex(256, 256, (c, w, h) => { c.fillStyle = base; c.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { c.fillStyle = `rgba(${R() < 0.5 ? '255,255,255' : '0,0,0'},0.05)`; c.fillRect(R() * w, R() * h, 2, 2); } }, { repeat: [3, 3] }); }
function pietraVerde() { const R = rng(14); return canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#20392f'; c.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { c.strokeStyle = `rgba(220,235,225,${0.08 + R() * 0.2})`; c.lineWidth = 0.6 + R() * 2; c.beginPath(); const x = R() * w; c.moveTo(x, 0); c.bezierCurveTo(x + (R() - 0.5) * 200, h * 0.3, x + (R() - 0.5) * 200, h * 0.7, x + (R() - 0.5) * 300, h); c.stroke(); } }, { aniso: 8 }); }
function fogliaTex(seed, col = [60, 98, 44]) {   // foglia larga (ficus lyrata, monstera): ovale con nervatura
  const R = rng(seed);
  return canvasTex(256, 256, (c, w, h) => { c.clearRect(0, 0, w, h); for (let i = 0; i < 1; i++) { const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, `rgb(${col[0] + 25},${col[1] + 30},${col[2] + 15})`); g.addColorStop(1, `rgb(${col[0] - 15},${col[1] - 20},${col[2] - 10})`); c.fillStyle = g;
    c.beginPath(); c.ellipse(w / 2, h / 2, w * 0.36, h * 0.47, 0, 0, 7); c.fill(); c.strokeStyle = 'rgba(200,220,170,0.5)'; c.lineWidth = 3; c.beginPath(); c.moveTo(w / 2, h * 0.05); c.lineTo(w / 2, h * 0.95); c.stroke();
    for (let k = 1; k < 7; k++) { c.lineWidth = 1.4; c.beginPath(); c.moveTo(w / 2, h * k / 7.5); c.lineTo(w / 2 - w * 0.3, h * k / 7.5 - h * 0.08); c.moveTo(w / 2, h * k / 7.5); c.lineTo(w / 2 + w * 0.3, h * k / 7.5 - h * 0.08); c.stroke(); } } }, { aniso: 4 });
}

// pianta in vaso: vaso di pietra + fusto + chioma di foglie larghe (ficus lyrata alto 2,4-3 m, strelitzia, monstera). Niente alberi veri dentro casa.
export function piantaInVaso(tipo, M, R) {
  const g = new THREE.Group(), vaso = tipo === 'monstera' ? [0.36, 0.3, 0.5] : tipo === 'strelitzia' ? [0.32, 0.26, 0.62] : [0.42, 0.34, 0.66];
  const v = new THREE.Mesh(new THREE.CylinderGeometry(vaso[0], vaso[1], vaso[2], 40), M.vaso); v.position.y = vaso[2] / 2; v.castShadow = v.receiveShadow = true; g.add(v);
  const terra = new THREE.Mesh(new THREE.CylinderGeometry(vaso[0] - 0.03, vaso[0] - 0.03, 0.02, 32), M.terriccio); terra.position.y = vaso[2] - 0.04; g.add(terra);
  const foglia = new THREE.PlaneGeometry(1, 1); const mF = tipo === 'strelitzia' ? M.fogliaS : tipo === 'monstera' ? M.fogliaM : M.fogliaF;
  const add = (x, y, z, s, rx, ry) => { const f = new THREE.Mesh(foglia, mF); f.position.set(x, y, z); f.scale.set(s * 0.75, s, 1); f.rotation.set(rx, ry, 0); f.castShadow = true; g.add(f); };
  if (tipo === 'ficus') {   // fusto dritto e chioma alta di foglie grandi a violino
    const H = 2.3 + R() * 0.6, f = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, H - 0.4, 8), M.fusto); f.position.y = vaso[2] + (H - 0.4) / 2; g.add(f);
    for (let i = 0; i < 46; i++) { const y = vaso[2] + 0.9 + R() * (H - 0.9), a = R() * 6.28, r = 0.12 + R() * 0.42 * (1 - Math.abs(y - (vaso[2] + H * 0.72)) / H); add(Math.cos(a) * r, y, Math.sin(a) * r, 0.34 + R() * 0.12, -0.6 + R() * 1.2, a); }
  } else if (tipo === 'strelitzia') {   // foglie lunghe a ventaglio su gambi dritti (1,6-2 m)
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28 + R() * 0.3, h = 1.1 + R() * 0.8, gam = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, h, 5), M.fusto); gam.position.set(Math.cos(a) * 0.05, vaso[2] + h / 2, Math.sin(a) * 0.05); gam.rotation.set(Math.sin(a) * 0.15, 0, -Math.cos(a) * 0.15); g.add(gam);
      const f = new THREE.Mesh(foglia, mF); f.scale.set(0.22, 0.75, 1); f.position.set(Math.cos(a) * 0.22, vaso[2] + h + 0.3, Math.sin(a) * 0.22); f.rotation.set(Math.sin(a) * 0.3, a, -Math.cos(a) * 0.3); f.castShadow = true; g.add(f); }
  } else {   // monstera: cespuglio largo e basso
    for (let i = 0; i < 18; i++) { const a = R() * 6.28, r = 0.15 + R() * 0.45, y = vaso[2] + 0.3 + R() * 0.8; add(Math.cos(a) * r, y, Math.sin(a) * r, 0.42 + R() * 0.2, -1.0 + R() * 0.6, a); }
  }
  return g;
}

export function villaEroe(opz = {}) {
  const R = rng(opz.seme || 41), G = new THREE.Group(); G.name = 'villa-eroe';
  const L = opz.lungo || 43.1, D = opz.prof || 16, Y0 = 0.35, YC = 4.0, YS = 4.6;   // pavimento a 0,35 m, soffitto a 4,0 m (STIMA dalla foto: un piano alto), lastra fino a 4,6 m
  const M = {
    bianco: new THREE.MeshStandardMaterial({ color: '#f4f2ee', roughness: 0.82 }),
    lastra: new THREE.MeshStandardMaterial({ color: '#f7f6f3', roughness: 0.78 }),
    travertino: new THREE.MeshStandardMaterial({ map: travertinoTex(5), roughness: 0.6 }),
    pavimento: new THREE.MeshStandardMaterial({ map: travertinoTex(7, '#ece2cf'), roughness: 0.32, envMapIntensity: 0.6 }),
    teak: new THREE.MeshStandardMaterial({ map: doghe('#b07a4a', 3), roughness: 0.55 }),
    soffitto: new THREE.MeshStandardMaterial({ map: doghe('#dcc3a0', 11), roughness: 0.7 }),
    vetro: new THREE.MeshStandardMaterial({ color: '#cfe0e6', roughness: 0.02, metalness: 0.1, transparent: true, opacity: 0.08, envMapIntensity: 0.7, depthWrite: false, side: THREE.DoubleSide }),
    vetroScuro: new THREE.MeshStandardMaterial({ color: '#3a4a52', roughness: 0.05, metalness: 0.7, envMapIntensity: 1.3 }),
    telaio: new THREE.MeshStandardMaterial({ color: '#2a2825', roughness: 0.4, metalness: 0.6 }),
    divano: new THREE.MeshStandardMaterial({ map: tessuto('#ece6da', 5), roughness: 0.95 }),
    divano2: new THREE.MeshStandardMaterial({ map: tessuto('#c9b8a0', 6), roughness: 0.95 }),
    pietraVerde: new THREE.MeshStandardMaterial({ map: pietraVerde(), roughness: 0.18, envMapIntensity: 1.0 }),
    noce: new THREE.MeshStandardMaterial({ map: doghe('#5a3c28', 17), roughness: 0.5 }),
    ottone: new THREE.MeshStandardMaterial({ color: '#b99258', roughness: 0.3, metalness: 1 }),
    tappeto: new THREE.MeshStandardMaterial({ map: tessuto('#d9cfbf', 8), roughness: 1 }),
    vaso: new THREE.MeshStandardMaterial({ map: travertinoTex(21, '#d8ccb8'), roughness: 0.75 }),
    terriccio: new THREE.MeshStandardMaterial({ color: '#3a2c20', roughness: 1 }),
    fusto: new THREE.MeshStandardMaterial({ color: '#6b5a44', roughness: 0.9 }),
    fogliaF: new THREE.MeshStandardMaterial({ map: fogliaTex(3, [52, 92, 40]), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6 }),
    fogliaS: new THREE.MeshStandardMaterial({ map: fogliaTex(5, [70, 110, 70]), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6 }),
    fogliaM: new THREE.MeshStandardMaterial({ map: fogliaTex(7, [40, 85, 45]), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6 }),
    acqua: new THREE.MeshStandardMaterial({ color: '#2fb5cc', roughness: 0.04, metalness: 0.2, emissive: '#0b6578', emissiveIntensity: 0.35 }),
    mosaico: new THREE.MeshStandardMaterial({ color: '#7fd3de', roughness: 0.3 }),
    prato: new THREE.MeshStandardMaterial({ color: '#6c9a42', roughness: 1 }),
    auto: new THREE.MeshStandardMaterial({ color: '#1d1f22', roughness: 0.25, metalness: 0.7 }),
    luce: new THREE.MeshStandardMaterial({ color: '#2a2622', emissive: '#ffd6a0', emissiveIntensity: 1.6 }),
  };
  for (const k in M) M[k].name = 'eroe_' + k;
  const add = (geo, mat, X, y, Z, { ry = 0, ombra = true, nome } = {}) => { const m = new THREE.Mesh(geo, mat); m.position.set(-X, y, Z); m.rotation.y = -ry; m.castShadow = ombra; m.receiveShadow = true; if (nome) m.name = nome; G.add(m); return m; };
  const box = (X0, X1, y0, y1, Z0, Z1, mat, o = {}) => { const w = X1 - X0, h = y1 - y0, d = Z1 - Z0, g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]); }
    return add(g, mat, (X0 + X1) / 2, (y0 + y1) / 2, (Z0 + Z1) / 2, o); };
  const tondo = (w, h, d, r, mat, X, y, Z, o = {}) => add(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2)), mat, X, y + h / 2, Z, o);
  const E0 = opz.ingresso ?? 11.5, E1 = E0 + 4.2;   // ingresso: vetrata aperta larga 4,2 m davanti al punto della foto (pixel 455,715)

  // ---------------- basamento, pavimento, lastra di copertura sottile che sporge (2,2 m davanti e dietro, 1,6 ai lati) ----------------
  box(-0.6, L + 0.6, 0, Y0, -0.8, D + 0.6, M.travertino, { ombra: false });
  box(0.3, L - 0.3, Y0, Y0 + 0.01, 0.3, D - 0.3, M.pavimento, { ombra: false, nome: 'pavimento' });
  box(-1.6, L + 1.6, YC, YS, -2.4, D + 2.6, M.lastra);
  box(0.3, L - 0.3, YC - 0.06, YC, 0.3, D - 0.3, M.soffitto, { ombra: false });
  // ---------------- facciata davanti: vetro a tutta altezza con montanti, pannelli di teak (come la foto: a destra), ingresso aperto ----------------
  const vetrata = (X0, X1, Z, passo = 2.4) => { for (let x = X0; x < X1 - 0.05; x += passo) { const x1 = Math.min(x + passo, X1); box(x + 0.03, x1 - 0.03, Y0, YC, Z - 0.015, Z + 0.015, M.vetro, { ombra: false }); box(x1 - 0.04, x1 + 0.04, Y0, YC, Z - 0.05, Z + 0.05, M.telaio, { ombra: false }); } };
  vetrata(0.3, E0, 0); vetrata(E1, 29.5, 0);
  box(29.5, 35.5, Y0, YC, -0.12, 0.12, M.teak); vetrata(35.5, L - 0.3, 0);
  box(E0 - 0.08, E0, Y0, YC, -0.06, 0.06, M.telaio); box(E1, E1 + 0.08, Y0, YC, -0.06, 0.06, M.telaio);
  // fianchi: muri bianchi pieni con una feritoia; retro: tutto vetro scorrevole (si apre sul giardino), un pannello di teak a destra
  box(0, 0.3, Y0, YC, 0, D, M.bianco); box(L - 0.3, L, Y0, YC, 0, D, M.bianco);
  const AX0 = (opz.ingresso ?? 11.5) + 2.1;   // sul retro il pannello sull'asse è aperto (scorre dietro quello accanto): si esce in giardino senza attraversare il vetro
  vetrata(0.3, 5.0, D, 3.0); vetrata(8.0, AX0 - 1.8, D, 1.7); box(8.05, 9.65, Y0, YC, D - 0.17, D - 0.14, M.vetro, { ombra: false });   /* seconda apertura 5-8 m vicino al pranzo (giro 23/11: si esce dal tavolo), il pannello è scorso dietro quello accanto */ vetrata(AX0 + 1.8, 33, D, 3.0); box(AX0 + 1.85, AX0 + 5.4, Y0, YC, D - 0.17, D - 0.14, M.vetro, { ombra: false });
  box(33, 38, Y0, YC, D - 0.12, D + 0.12, M.teak); vetrata(38, L - 0.3, D, 2.4);
  // ---------------- volume alto dietro al centro (dalla foto: 13 × 10 m, tetto a 7,8 m), con la scala dentro ----------------
  const A0 = opz.alto ? opz.alto[0] : 12.2, A1 = opz.alto ? opz.alto[1] : 25.3, AZ0 = 5.5, AZ1 = D + 0.8;
  box(A0, A1, YS, 7.5, AZ0, AZ1, M.bianco); box(A0 - 0.8, A1 + 0.8, 7.5, 7.85, AZ0 - 0.8, AZ1 + 1.2, M.lastra);
  box(A0 + 1, A1 - 1, YS + 0.4, 7.2, AZ1 - 0.03, AZ1 + 0.03, M.vetroScuro, { ombra: false }); box(A0 + 2, A0 + 6, YS + 0.5, 7.2, AZ0 - 0.04, AZ0 + 0.02, M.vetroScuro, { ombra: false });
  // ---------------- garage bianco davanti col doppio portone, Lambo davanti al portone di destra ----------------
  const C0 = opz.box ? opz.box[0] : 16.3, C1 = opz.box ? opz.box[1] : 26.8, CZ = opz.box ? opz.box[2] : -14.4;
  // il box è il GARAGE (Nico 23/11): fronte verso la corte con un portone sezionale unico a doghe orizzontali bronzo scuro (2,7 m di altezza), pilastro bianco in mezzo,
  // lastra sottile che sporge sopra; la Lambo è parcheggiata davanti al portone di destra. Si vede anche dalla foto d'apertura (il fronte guarda la camera).
  box(C0, C1, 0, 3.6, CZ, -0.2, M.bianco); box(C0 - 0.4, C1 + 0.4, 3.6, 3.95, CZ - 1.2, -0.2, M.lastra);
  { const mPort = new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#3a332d'; c.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 16) { c.fillStyle = '#4c443c'; c.fillRect(0, y, w, 12); c.fillStyle = 'rgba(255,235,210,0.10)'; c.fillRect(0, y, w, 2); c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(0, y + 12, w, 4); } }, { repeat: [1, 1], aniso: 8 }), roughness: 0.45, metalness: 0.55 });
    const mezzo = (C0 + C1) / 2, lp = Math.min(6.4, C1 - C0 - 2.4);   // un portone unico largo (Nico 23/11: «il portone deve essere unico»)
    for (const [a2, b2] of [[mezzo - lp / 2, mezzo + lp / 2]]) { const pd = box(a2, b2, 0.02, 2.72, CZ - 0.06, CZ + 0.02, mPort, { ombra: false });
      const uv = pd.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / (b2 - a2), uv.getY(i) / 2.7);   // una doga ogni 17 cm
      box(a2 - 0.08, b2 + 0.08, 2.72, 2.82, CZ - 0.07, CZ + 0.01, M.telaio, { ombra: false }); }
    G.userData.garage = { X: mezzo + 1.2, Z: CZ }; }   // la Lambo davanti al portone, un filo a destra
  box(E0 - 1.2, E1 + 1.2, 0, Y0, -2.6, -0.8, M.travertino);   // pianerottolo pieno davanti alla porta (la corte d'asfalto la disegna il complesso)
  // Lambo parcheggiata davanti al box, a destra di chi arriva (Nico 23/11): supercar bassa a cuneo 4,9 × 2,1 × 1,15 m (misure da Revuélto, STIMA), muso verso il box
  { const LX = G.userData.garage.X, LZ = CZ - 3.3, car = new THREE.Group(), mc = new THREE.MeshStandardMaterial({ color: opz.coloreAuto || '#111214', roughness: 0.18, metalness: 0.75, envMapIntensity: 1.4 }), mn = new THREE.MeshStandardMaterial({ color: '#0d0d0e', roughness: 0.5 });
    const sh = new THREE.Shape([[-2.45, 0.32], [-2.3, 0.62], [-1.0, 0.86], [-0.2, 1.15], [0.9, 1.12], [1.9, 0.82], [2.45, 0.7], [2.45, 0.32]].map(([x, y]) => new THREE.Vector2(x, y)));
    const corpo = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 1.95, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 3 }), mc); corpo.geometry.translate(0, 0, -0.975); corpo.castShadow = corpo.receiveShadow = true; car.add(corpo);
    const vetri = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.28, 1.6), M.vetroScuro); vetri.position.set(0.2, 1.0, 0); vetri.rotation.z = -0.12; car.add(vetri);
    for (const [x, z] of [[-1.55, -0.95], [1.5, -0.95], [-1.55, 0.95], [1.5, 0.95]]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.3, 28), mn); r.rotation.x = Math.PI / 2; r.position.set(x, 0.36, z); r.castShadow = true; car.add(r); }
    car.position.set(-LX, 0.05, LZ); car.rotation.y = -Math.PI / 2; G.add(car); }

  // ---------------- terrazza e piscina dietro a sinistra (dalla foto), prato ----------------
  box(-1.6, L + 1.6, 0, Y0, D, D + 5.2, M.travertino, { ombra: false });
  // piscina ORIZZONTALE lungo il retro della casa (Nico 23/11: «piscina orizzontale e poi giardino verso il lago», niente piscina comunale):
  // 22 × 6 m parallela alla facciata, subito dopo la terrazza, bordo in travertino; dopo la piscina il giardino a prato che scende verso il lago.
  // Pochi lettini: due coppie ai capi della vasca, sulla terrazza, fuori dall'asse della vista.
  const AXP = (opz.ingresso ?? 11.5) + 2.1, PX0 = AXP - 11, PX1 = AXP + 11, PZ0 = D + 5.2, PZ1 = PZ0 + 6;
  for (const [a, b, c2, d2] of [[PX0 - 1.2, PX1 + 1.2, PZ1, PZ1 + 1.2], [PX0 - 1.2, PX0, PZ0, PZ1], [PX1, PX1 + 1.2, PZ0, PZ1]]) box(a, b, 0, Y0, c2, d2, M.travertino, { ombra: false });   // bordo in travertino
  box(PX0, PX1, -1.4, -1.3, PZ0, PZ1, M.mosaico, { ombra: false }); for (const [a, b, c2, d2] of [[PX0 - 0.1, PX0, PZ0, PZ1], [PX1, PX1 + 0.1, PZ0, PZ1], [PX0, PX1, PZ0 - 0.1, PZ0], [PX0, PX1, PZ1, PZ1 + 0.1]]) box(a, b, -1.4, Y0 - 0.02, c2, d2, M.mosaico, { ombra: false });
  const acqua = box(PX0, PX1, Y0 - 0.12, Y0 - 0.1, PZ0, PZ1, M.acqua, { ombra: false, nome: 'piscina-eroe' });
  const mTelo = new THREE.MeshStandardMaterial({ map: tessuto('#f2efe8', 19), roughness: 0.95 });
  for (const X of [PX0 + 1.0, PX0 + 2.0, PX1 - 2.0, PX1 - 1.0]) { const Z = D + 2.6;   // 4 lettini sulla terrazza, ai capi della vasca, rivolti al giardino
    const g = new THREE.Group(); const q1 = new THREE.Mesh(new RoundedBoxGeometry(0.74, 0.28, 1.95, 3, 0.06), mTelo); q1.position.set(0, 0.14, 0); q1.castShadow = q1.receiveShadow = true; g.add(q1);
    const q2 = new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.12, 0.72, 3, 0.05), mTelo); q2.position.set(0, 0.42, -0.62); q2.rotation.x = -0.55; q2.castShadow = true; g.add(q2);
    g.position.set(-X, Y0, Z); G.add(g); }

  // ---------------- dentro: un grande ambiente sul retro (salotto al centro, pranzo e cucina a sinistra, lettura a destra) ----------------
  // tutti gli arredi allineati alla casa; l'asse della camera (X ≈ E0 + 2,1) resta libero fino alla vetrata del retro
  const AX = E0 + 2.1;
  box(AX - 4.2, AX + 4.2, Y0, Y0 + 0.012, 8.6, 14.2, M.tappeto, { ombra: false });
  // due divani bassi componibili uno di fronte all'altro ai lati dell'asse (4,2 m, seduta 42 cm), il centro aperto sulla piscina
  const divano = (X, Z, Lg, ry, mat) => { const g = new THREE.Group(); const p = (w, h, d, x, y, z, m = mat) => { const q = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, 0.07), m); q.position.set(x, y, z); q.castShadow = q.receiveShadow = true; g.add(q); };
    p(Lg, 0.3, 1.15, 0, 0.15, 0); p(Lg - 0.08, 0.16, 0.9, 0, 0.38, 0.08); p(Lg, 0.38, 0.26, 0, 0.6, -0.44); for (let k = 0; k < Math.round(Lg / 1.05); k++) p(0.85, 0.42, 0.18, -Lg / 2 + 0.55 + k * 1.05, 0.66, -0.26, M.divano2);
    g.position.set(-X, Y0, Z); g.rotation.y = -ry; G.add(g); return g; };
  divano(AX - 2.9, 11.4, 4.2, Math.PI / 2, M.divano); divano(AX + 2.9, 11.4, 4.2, -Math.PI / 2, M.divano);
  tondo(1.5, 0.34, 2.4, 0.04, M.pietraVerde, AX, Y0, 11.4); tondo(0.34, 0.24, 0.34, 0.15, M.ottone, AX - 0.25, Y0 + 0.34, 10.9); tondo(0.5, 0.06, 0.34, 0.02, M.noce, AX + 0.3, Y0 + 0.34, 11.9);
  // pranzo e cucina a sinistra: tavolo in noce 3,2 × 1,2 m con 6 sedie rivolte al tavolo, isola in travertino
  const TX = AX - 7.6, TZ = 11.2; tondo(1.2, 0.07, 3.2, 0.02, M.noce, TX, Y0 + 0.69, TZ); box(TX - 0.4, TX + 0.4, Y0, Y0 + 0.69, TZ - 1.1, TZ - 0.9, M.noce); box(TX - 0.4, TX + 0.4, Y0, Y0 + 0.69, TZ + 0.9, TZ + 1.1, M.noce);
  const sedia = (X, Z, ry) => { const g = new THREE.Group(); const p = (w, h, d, x, y, z, m = M.divano2) => { const q = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.04), m); q.position.set(x, y, z); q.castShadow = q.receiveShadow = true; g.add(q); };
    p(0.56, 0.1, 0.54, 0, 0.47, 0); p(0.56, 0.48, 0.1, 0, 0.76, -0.26); for (const sx of [-0.23, 0.23]) for (const sz of [-0.21, 0.21]) p(0.04, 0.44, 0.04, sx, 0.22, sz, M.noce); g.position.set(-X, Y0, Z); g.rotation.y = ry; G.add(g); };
  for (let k = -1; k <= 1; k++) { sedia(TX - 0.92, TZ + k * 0.9, -Math.PI / 2); sedia(TX + 0.92, TZ + k * 0.9, Math.PI / 2); }   /* controllato: ogni sedia guarda il tavolo, schienale verso fuori */
  // cucina vera (Nico 23/11: «la cucina deve essere una cucina»): parete di colonne in noce sul fianco sinistro con forni e frigo, piano di lavoro con piano cottura e cappa,
  // isola in travertino con le teste a cascata (3,6 × 1,1 × 0,92 m) e 4 sgabelli rivolti all'isola, tre lampade sopra
  box(0.3, 0.95, Y0, YC - 0.3, 1.2, 9.6, M.noce);                                                   // colonne a tutta altezza
  for (const z of [2.4, 3.1]) box(0.94, 0.97, Y0 + 0.95, Y0 + 1.6, z - 0.3, z + 0.3, M.vetroScuro, { ombra: false });   // due forni
  box(0.94, 0.97, Y0 + 0.2, Y0 + 2.6, 8.2, 9.4, M.noce); box(0.95, 0.98, Y0 + 1.2, Y0 + 1.24, 8.3, 9.3, M.ottone, { ombra: false });   // frigo a filo con la maniglia
  box(0.95, 1.6, Y0, Y0 + 0.9, 4.0, 7.8, M.noce); box(0.95, 1.6, Y0 + 0.9, Y0 + 0.94, 4.0, 7.8, M.travertino);   // base col piano in pietra
  box(0.95, 0.99, Y0 + 0.94, Y0 + 1.6, 4.0, 7.8, M.travertino, { ombra: false });                    // alzatina in pietra
  box(1.05, 1.5, Y0 + 0.94, Y0 + 0.95, 5.2, 6.1, M.vetroScuro, { ombra: false });                    // piano cottura a induzione
  box(0.96, 1.55, YC - 1.0, YC - 0.3, 5.0, 6.3, M.noce);                                            // cappa rivestita in noce
  box(2.7, 3.8, Y0, Y0 + 0.88, 3.9, 7.5, M.travertino); box(2.65, 3.85, Y0 + 0.88, Y0 + 0.94, 3.85, 7.55, M.travertino);   // isola PARALLELA al piano di lavoro (Nico 23/11), 1,1 m di passaggio
  for (let k = 0; k < 4; k++) { const X = 4.45, Z = 4.3 + k * 0.95;   // sgabelli dal lato della stanza, rivolti all'isola
    const g = new THREE.Group(); const p = (w, h, d, x, y, z, m) => { const q = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.03), m); q.position.set(x, y, z); q.castShadow = q.receiveShadow = true; g.add(q); };
    p(0.44, 0.08, 0.42, 0, 0.66, 0, M.divano2); p(0.44, 0.3, 0.06, 0, 0.84, -0.2, M.divano2); for (const sx of [-0.18, 0.18]) for (const sz of [-0.16, 0.16]) p(0.03, 0.64, 0.03, sx, 0.32, sz, M.ottone);
    p(0.4, 0.02, 0.02, 0, 0.26, 0.16, M.ottone); g.position.set(-X, Y0, Z); g.rotation.y = Math.PI / 2; G.add(g); }   /* seduta verso l'isola (-X), schienale verso il salotto */
  for (let k = 0; k < 3; k++) add(new THREE.SphereGeometry(0.17, 24, 16), M.luce, 3.25, YC - 1.1, 4.6 + k * 1.15, { ombra: false });   // lampade sopra l'isola
  for (let k = 0; k < 3; k++) add(new THREE.CylinderGeometry(0.006, 0.006, 1.05, 6), M.ottone, 3.25, YC - 0.52, 4.6 + k * 1.15, { ombra: false });
  // lettura a destra: due poltrone e un tavolino, libreria in noce sul fianco
  // lato destro dell'open space (Nico 23/11: «questa parte della casa è spoglia»): secondo salotto rivolto al giardino, credenza in noce, piante grandi, luci
  { const SX = AX + 18.5;   // centro del salotto (≈ X 30)
    box(SX - 6, SX + 6, Y0, Y0 + 0.012, 6.5, 14.8, M.tappeto, { ombra: false });
    divano(SX, 9.6, 5.2, 0, M.divano);                                             // divano lungo, seduta verso il giardino
    divano(SX - 3.4, 12.0, 3.4, Math.PI / 2, M.divano);                            // ritorno a L
    add(new THREE.CylinderGeometry(0.75, 0.75, 0.36, 48), M.travertino, SX + 0.2, Y0 + 0.18, 12.0);   // tavolino tondo in travertino
    add(new THREE.CylinderGeometry(0.16, 0.12, 0.3, 32), M.vaso, SX + 0.4, Y0 + 0.51, 11.8); tondo(0.4, 0.07, 0.3, 0.01, M.noce, SX - 0.2, Y0 + 0.36, 12.2);
    for (const dx of [-0.9, 0.9]) { const X = SX + 2.6 + dx;                       // due poltrone di fronte al divano, schienale verso il giardino
      tondo(0.95, 0.42, 0.9, 0.15, M.divano2, X, Y0, 13.6); tondo(0.95, 0.42, 0.2, 0.08, M.divano2, X, Y0 + 0.42, 14.0); }
    box(SX - 3, SX + 4, Y0, Y0 + 0.82, 0.4, 0.9, M.noce);                          // credenza in noce contro il pannello in teak
    add(new THREE.CylinderGeometry(0.14, 0.11, 0.55, 32), M.vaso, SX - 1.8, Y0 + 1.1, 0.65); add(new THREE.SphereGeometry(0.2, 24, 16), M.luce, SX + 2.6, Y0 + 1.15, 0.65, { ombra: false });
    for (let k = 0; k < 3; k++) add(new THREE.SphereGeometry(0.2, 24, 16), M.luce, SX - 1.2 + k * 1.2, YC - 1.1, 11.2, { ombra: false });   // tre lampade a sfera sul salotto
    for (const [t, X, Z] of [['ficus', SX - 5.4, 14.7], ['ficus', SX + 5.6, 14.6], ['monstera', SX + 5.2, 7.5], ['strelitzia', SX - 5.6, 2.0]]) { const pv = piantaInVaso(t, M, R); pv.position.set(-X, Y0, Z); G.add(pv); }
    // fuori, sulla terrazza sotto la lastra: salotto da esterno e due ulivi in vasi di pietra
    divano(SX, D + 2.2, 4.0, 0, M.divano); for (const dx of [-2.6, 2.6]) { tondo(0.9, 0.4, 0.9, 0.15, M.divano2, SX + dx, Y0, D + 3.6); }
    add(new THREE.CylinderGeometry(0.6, 0.6, 0.32, 40), M.travertino, SX, Y0 + 0.16, D + 3.7);
    for (const X of [SX - 6.2, SX + 6.2]) { const pv = piantaInVaso('ficus', M, R); pv.scale.set(1.4, 1.25, 1.4); pv.position.set(-X, Y0, D + 4.3); G.add(pv); } }
  box(L - 0.9, L - 0.3, Y0, YC - 0.3, 2.5, 12.5, M.noce);
  for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) box(L - 0.88, L - 0.6, Y0 + 0.45 + r * 0.78, Y0 + 0.72 + r * 0.78, 3.0 + k * 1.55, 3.0 + k * 1.55 + 0.9, k % 2 ? M.divano2 : M.lastra, { ombra: false });   // libri e oggetti nella libreria
  // quadri grandi sui muri ciechi, consolle all'ingresso, vasi e libri sul tavolino, lampade da terra (la casa abitata, non vuota)
  const tela = (seed, a, b) => { const R2 = rng(seed); return new THREE.MeshStandardMaterial({ map: canvasTex(512, 384, (c, w, h) => { const g2 = c.createLinearGradient(0, 0, w, h); g2.addColorStop(0, a); g2.addColorStop(1, b); c.fillStyle = g2; c.fillRect(0, 0, w, h); for (let i = 0; i < 5; i++) { c.fillStyle = `rgba(${R2() < 0.5 ? '255,250,240' : '40,30,25'},0.18)`; c.beginPath(); c.ellipse(R2() * w, R2() * h, 40 + R2() * 120, 20 + R2() * 70, R2() * 3, 0, 7); c.fill(); } }), roughness: 0.85 }); };
  box(0.3, 0.34, Y0 + 1.0, Y0 + 2.6, 10.5, 13.3, tela(5, '#d9c6a8', '#7a5a43'), { ombra: false });   // sopra la cucina verso il pranzo
  // (tolto 23/11: il quadro a destra dell'ingresso stava contro la vetrata e nelle foto sembrava un pannello sospeso)
  box(AX - 5.2, AX - 2.6, Y0, Y0 + 0.85, 0.35, 0.8, M.noce); add(new THREE.CylinderGeometry(0.16, 0.12, 0.5, 32), M.vaso, AX - 3.4, Y0 + 1.1, 0.58); tondo(0.5, 0.05, 0.32, 0.01, M.lastra, AX - 4.4, Y0 + 0.85, 0.58);
  add(new THREE.CylinderGeometry(0.12, 0.09, 0.28, 32), M.vaso, AX + 0.35, Y0 + 0.48, 11.0);
  for (const [X, Z] of [[AX - 4.6, 9.2], [AX + 4.6, 9.2]]) { add(new THREE.CylinderGeometry(0.15, 0.15, 0.03, 24), M.ottone, X, Y0 + 0.015, Z); add(new THREE.CylinderGeometry(0.012, 0.012, 1.5, 8), M.ottone, X, Y0 + 0.78, Z, { ombra: false }); add(new THREE.SphereGeometry(0.2, 24, 16), M.luce, X, Y0 + 1.62, Z, { ombra: false }); }
  // piante in vaso (Nico: piante e ficus in vaso, niente alberi): ficus lyrata ai lati della vetrata, strelitzie e monstere negli angoli
  const piante = [['ficus', AX - 7.6, 14.9],   /* ficus di sinistra 1 m più verso il pranzo: il giro passa fra lui e il divano (23/11) */ ['ficus', AX + 5.6, 14.6], ['strelitzia', AX - 9.8, 14.8], ['monstera', AX + 9.6, 14.6], ['ficus', 1.2, 14.8], ['strelitzia', L - 1.3, 14.8], ['monstera', AX - 6.8, 1.2], ['ficus', AX + 5.2, 1.0]];
  for (const [t, X, Z] of piante) { const p = piantaInVaso(t, M, R); p.position.set(-X, Y0, Z); G.add(p); }
  // luci: gole di LED nel soffitto a doghe, lampade basse sul tavolo
  box(0.5, L - 0.5, YC - 0.09, YC - 0.06, D - 0.7, D - 0.62, M.luce, { ombra: false });
  for (const dz of [-0.8, 0, 0.8]) add(new THREE.SphereGeometry(0.16, 20, 14), M.luce, TX, YC - 1.25, TZ + dz, { ombra: false });

  const S = {
    gruppo: G, M, misure: { L, D, Y0, YC, YS, E0, E1, AX, PX0, PX1, PZ0, PZ1 }, acqua,
    w(X, y, Z) { G.updateMatrixWorld(); const v = new THREE.Vector3(-X, y, Z).applyMatrix4(G.matrixWorld); return [v.x, v.y, v.z]; },
    aggiorna(t, camW) { const inv = new THREE.Matrix4().copy(G.matrixWorld).invert(), p = new THREE.Vector3(...camW).applyMatrix4(inv), X = -p.x, Z = p.z; return { dentro: X > 0 && X < L && Z > 0 && Z < D && p.y < YC } },
    lanterna() { },
  };
  return S;
}
