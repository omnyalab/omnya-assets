// Pezzi di lusso estremo per l'appartamento della torre golf (Nico 23/11 sera: «qualcosa di più lusso, roba estrema, quadri tipo Monet da soldi»,
// board Pinterest ghizzonicola1/interiors-luxury: salotto rotondo ribassato col fuoco, lampadari a scultura, onice retroilluminato, marmo lucido che riflette,
// colonna di vetro soffiato, pianoforte di cristallo, tavolo di vetro con gambe cromate, totem, bronzo, velluto e bouclé, tende velate).
// Qui solo la geometria guida per Seedream: forme, posizioni, colori e luci giuste. Le foto vere le fa Seedream con la board come riferimento.
import * as THREE from 'three';
import { rng, canvasTex } from '../engine/kit/forme.js';

const std = (c, r, m = 0, e = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, ...e });

// ---------- materiali ----------
export function materialiLusso() {
  const marmoTex = (base, vena, seme, n = 26) => canvasTex(1024, 1024, (c, w, h) => { c.fillStyle = base; c.fillRect(0, 0, w, h); const R = rng(seme);
    for (let i = 0; i < n; i++) { c.strokeStyle = vena; c.globalAlpha = 0.15 + R() * 0.45; c.lineWidth = 0.6 + R() * 2.4; c.beginPath(); let x = R() * w, y = 0; c.moveTo(x, y); while (y < h) { x += (R() - 0.5) * 60; y += 20 + R() * 40; c.lineTo(x, y); } c.stroke(); } c.globalAlpha = 1; }, { aniso: 16 });
  const onice = canvasTex(1024, 1024, (c, w, h) => { const R = rng(41), g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#f6c77c'); g.addColorStop(0.5, '#e7a04c'); g.addColorStop(1, '#f9d79a'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { c.strokeStyle = R() < 0.6 ? 'rgba(150,70,20,0.35)' : 'rgba(255,240,210,0.5)'; c.lineWidth = 2 + R() * 14; c.beginPath(); let x = R() * w, y = -20; c.moveTo(x, y); while (y < h + 20) { x += Math.sin(y * 0.02 + i) * 18 + (R() - 0.5) * 20; y += 14; c.lineTo(x, y); } c.stroke(); } }, { aniso: 16 });
  const boucle = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#ece4d6'; c.fillRect(0, 0, w, h); const R = rng(8); for (let i = 0; i < 5000; i++) { c.fillStyle = R() < 0.5 ? 'rgba(200,188,168,0.5)' : 'rgba(255,252,244,0.6)'; c.beginPath(); c.arc(R() * w, R() * h, 1 + R() * 1.6, 0, 7); c.fill(); } });
  boucle.repeat.set(3, 3);
  return {
    pavimento: std('#ffffff', 0.08, 0, { map: marmoTex('#efe9e0', '#b9ab98', 3), envMapIntensity: 1.4 }),   // marmo crema lucido che riflette
    nero: std('#ffffff', 0.12, 0, { map: marmoTex('#16151a', '#c9a36a', 7, 34), envMapIntensity: 1.3 }),    // Nero Marquina con vene d'oro (bagno)
    verde: std('#ffffff', 0.1, 0, { map: marmoTex('#1f4a3a', '#d9e6d8', 11, 40), envMapIntensity: 1.3 }),   // Verde Alpi (isola, tavolino)
    onice: new THREE.MeshStandardMaterial({ color: '#ffffff', map: onice, emissiveMap: onice, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.85, roughness: 0.15 }),
    bronzo: std('#8a6238', 0.28, 1.0, { envMapIntensity: 1.3 }), oro: std('#c9a05a', 0.22, 1.0, { envMapIntensity: 1.5 }), cromo: std('#e8eaee', 0.05, 1.0, { envMapIntensity: 1.6 }),
    boucle: std('#ffffff', 0.95, 0, { map: boucle }), velluto: std('#5a1520', 0.75, 0), cuoio: std('#3b2216', 0.5, 0),
    cristallo: new THREE.MeshPhysicalMaterial({ color: '#f2f6f8', roughness: 0.02, metalness: 0, transmission: 0.0, transparent: true, opacity: 0.28, clearcoat: 1, envMapIntensity: 2, side: THREE.DoubleSide, depthWrite: false }),
    vetroTeal: new THREE.MeshPhysicalMaterial({ color: '#4fa6a0', roughness: 0.05, transparent: true, opacity: 0.55, clearcoat: 1, envMapIntensity: 2, emissive: new THREE.Color('#1d5f5a'), emissiveIntensity: 0.25 }),
    tenda: new THREE.MeshStandardMaterial({ color: '#f4efe6', roughness: 0.9, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }),
    fuoco: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.55, 0.12), toneMapped: false, transparent: true, opacity: 0.85 }),
    gola: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.9, 1.3), toneMapped: false }),
    infisso: std('#141414', 0.35, 0.6),
  };
}

// ---------- quadro stile Monet (Ninfee): pennellate corte su acqua blu-lilla, riflessi verticali di salici, ninfee rosa e bianche; cornice d'oro dorata e intagliata ----------
export function monet(L, w, h, seme = 1, stile = 'ninfee') {
  const R = rng(seme), W = 1400, H = Math.round(1400 * h / w);
  const tela = canvasTex(W, H, c => {
    const pen = (x, y, l, a, col, al = 0.55, sp = 5) => { c.save(); c.translate(x, y); c.rotate(a); c.globalAlpha = al; c.fillStyle = col; c.beginPath(); c.ellipse(0, 0, l, sp, 0, 0, 7); c.fill(); c.restore(); };
    const fondo = stops => { const g = c.createLinearGradient(0, 0, 0, H); stops.forEach(([t, col]) => g.addColorStop(t, col)); c.fillStyle = g; c.fillRect(0, 0, W, H); };
    const tocchi = (n, P, y0, y1, lmin, lmax, sp, ang = 0.6, al = [0.35, 0.4]) => { for (let i = 0; i < n; i++) pen(R() * W, y0 * H + R() * (y1 - y0) * H, lmin + R() * (lmax - lmin), (R() - 0.5) * ang, P[Math.floor(R() * P.length)], al[0] + R() * al[1], sp[0] + R() * sp[1]); };
    if (stile === 'covoni') {   /* I covoni al tramonto: cielo arancio-rosa, campo dorato, due covoni grandi con l'ombra blu */
      fondo([[0, '#e9a873'], [0.4, '#f3cf9a'], [0.55, '#d8a54a'], [1, '#9b7a2e']]); tocchi(3500, ['#f2b98a', '#f7d9b0', '#e79a7a', '#c9a6c8'], 0, 0.5, 12, 30, [4, 6], 0.4, [0.3, 0.4]);
      tocchi(5000, ['#d9ad4f', '#c99a3a', '#e8c36a', '#a8823a', '#b9973f'], 0.52, 1, 6, 16, [2, 3]);
      for (const [x, s] of [[0.36, 1], [0.66, 0.75]]) { const cx = W * x, cy = H * 0.66, r = H * 0.2 * s; c.globalAlpha = 1; c.fillStyle = '#b8782e'; c.beginPath(); c.moveTo(cx - r, cy + r * 0.6); c.quadraticCurveTo(cx - r * 0.9, cy - r * 0.3, cx, cy - r * 0.9); c.quadraticCurveTo(cx + r * 0.9, cy - r * 0.3, cx + r, cy + r * 0.6); c.closePath(); c.fill();
        for (let i = 0; i < 120; i++) pen(cx + (R() - 0.5) * r * 1.8, cy + (R() - 0.3) * r, 4 + R() * 8, R() * 3, R() < 0.5 ? '#e0a54a' : '#7a4f2a', 0.7, 2 + R() * 2); pen(cx + r * 0.9, cy + r * 0.62, r * 0.9, 0, '#5d6ea8', 0.6, r * 0.12); }
    } else if (stile === 'alba') {   /* Impression, soleil levant: porto nella foschia blu-grigia, sole arancio, barche scure, riflessi arancio */
      fondo([[0, '#7d8fa0'], [0.5, '#8d9aa3'], [1, '#4f6577']]); tocchi(7000, ['#8a9cad', '#a3adb5', '#6d8396', '#b8b2a8', '#5a7186'], 0, 1, 8, 22, [2, 3]);
      for (let i = 0; i < 40; i++) pen(W * 0.1 + R() * W * 0.8, H * (0.2 + R() * 0.25), 30 + R() * 60, Math.PI / 2, '#5b6b78', 0.3, 3);   // gru e alberi delle navi
      c.globalAlpha = 1; c.fillStyle = '#ff7a2a'; c.beginPath(); c.arc(W * 0.42, H * 0.38, H * 0.045, 0, 7); c.fill();
      for (let i = 0; i < 26; i++) pen(W * 0.42 + (R() - 0.5) * 30, H * (0.5 + i * 0.018), 18 + R() * 22, 0, '#ff8a3a', 0.85, 3);   // riflesso
      for (const [x, y, s] of [[0.3, 0.72, 1], [0.48, 0.64, 0.7], [0.6, 0.78, 0.8]]) { pen(W * x, H * y, 46 * s, 0.05, '#243443', 0.9, 7 * s); pen(W * x - 8, H * y - 18 * s, 4, 0, '#243443', 0.9, 16 * s); }
    } else if (stile === 'papaveri') {   /* Papaveri: cielo con nuvole, prato verde, macchie rosse, due figure */
      fondo([[0, '#8fb2d8'], [0.45, '#dfe6ee'], [0.5, '#7fa060'], [1, '#55783e']]); tocchi(2500, ['#ffffff', '#e8eef5', '#b9cde3'], 0, 0.45, 14, 36, [5, 8], 0.4, [0.3, 0.4]);
      tocchi(5000, ['#6f9450', '#8aab62', '#4e7236', '#a7b96f'], 0.48, 1, 6, 16, [2, 3]);
      for (let i = 0; i < 1500; i++) { const y = 0.52 + Math.pow(R(), 0.7) * 0.48; pen(R() * W * (0.3 + y * 0.7), y * H, 3 + R() * 6 * y, R() * 3, R() < 0.8 ? '#d8261c' : '#f05a2a', 0.9, 2 + R() * 4 * y); }
      for (const [x, y] of [[0.62, 0.62], [0.68, 0.66]]) { pen(W * x, H * y, 5, 0, '#2f3e5e', 1, 18); pen(W * x, H * y - 22, 6, 0, '#e8dcc6', 1, 6); }
    } else if (stile === 'ponte') {   /* Il ponte giapponese: verdi fitti, ponte ad arco verde-azzurro, ninfee sotto */
      fondo([[0, '#3e5d38'], [0.5, '#5d7d4a'], [1, '#2f4a3a']]); tocchi(8000, ['#4e7a3e', '#7ea35a', '#9cb86a', '#35583a', '#6b8f8a', '#b7c98a'], 0, 1, 6, 18, [2, 4]);
      c.globalAlpha = 0.95; c.strokeStyle = '#7fb3a6'; c.lineWidth = 22; c.beginPath(); c.moveTo(-20, H * 0.42); c.quadraticCurveTo(W / 2, H * 0.18, W + 20, H * 0.42); c.stroke();
      c.lineWidth = 9; c.beginPath(); c.moveTo(-20, H * 0.36); c.quadraticCurveTo(W / 2, H * 0.1, W + 20, H * 0.36); c.stroke();
      for (let x = 40; x < W; x += 70) { c.lineWidth = 6; c.beginPath(); c.moveTo(x, H * 0.42 - Math.sin(x / W * Math.PI) * H * 0.12); c.lineTo(x, H * 0.36 - Math.sin(x / W * Math.PI) * H * 0.13); c.stroke(); }
      for (let k = 0; k < 18; k++) { const cx = R() * W, cy = H * (0.6 + R() * 0.38); for (let i = 0; i < 40; i++) pen(cx + (R() - 0.5) * 120, cy + (R() - 0.5) * 30, 6 + R() * 10, 0, R() < 0.5 ? '#5f8f4c' : '#8fb35c', 0.8, 3); if (R() < 0.7) for (let i = 0; i < 6; i++) pen(cx + (R() - 0.5) * 50, cy, 4, R() * 3, R() < 0.5 ? '#f3c8d2' : '#ffffff', 0.9, 3); }
    } else {   /* Ninfee */
      fondo([[0, '#4a6f7e'], [0.45, '#6f86a8'], [1, '#3d5a63']]);
      tocchi(9000, ['#5d7fa6', '#8e9cc9', '#a9b8d6', '#4f7d74', '#6e9a7a', '#2f5257', '#9fb5a1', '#c4c9e0', '#7aa0b8', '#3e6a6f'], 0, 1, 6, 22, [2.5, 3]);
      for (let i = 0; i < 2200; i++) { const x = R() * W; pen(x, R() * H * 0.7, 3 + R() * 5, Math.PI / 2 + (R() - 0.5) * 0.2, R() < 0.5 ? '#2f5a4a' : '#56826a', 0.35, 14 + R() * 26); }
      for (let k = 0; k < 26; k++) { const cx = R() * W, cy = H * (0.35 + R() * 0.62), r = 30 + R() * 60;
        for (let i = 0; i < 70; i++) pen(cx + (R() - 0.5) * r * 2.2, cy + (R() - 0.5) * r * 0.6, 6 + R() * 12, (R() - 0.5) * 0.4, R() < 0.5 ? '#4e7d4a' : '#79a35c', 0.7, 3 + R() * 3);
        if (R() < 0.75) for (let i = 0; i < 9; i++) pen(cx + (R() - 0.5) * r, cy + (R() - 0.5) * r * 0.3, 3 + R() * 6, R() * 3, R() < 0.6 ? '#f2c6cf' : '#fbf3ee', 0.9, 2 + R() * 3); }
      for (let i = 0; i < 1400; i++) pen(R() * W, R() * H, 4 + R() * 8, (R() - 0.5) * 0.5, R() < 0.5 ? '#e9d9e6' : '#f5e9c9', 0.18, 2);
    }
  }, { aniso: 16 });
  const g = new THREE.Group(), fr = 0.16, prof = 0.12;
  const tel = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tela, roughness: 0.85 })); tel.position.z = 0.02; g.add(tel);
  const lato = (lw, lh, x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(lw, lh, prof), L.oro); m.position.set(x, y, 0.02); m.castShadow = true; g.add(m);
    const k = new THREE.Mesh(new THREE.BoxGeometry(lw * (lw > lh ? 1 : 0.4), lh * (lh > lw ? 1 : 0.4), prof * 0.4), L.bronzo); k.position.set(x, y, 0.02 + prof * 0.55); g.add(k); };   // modanatura doppia
  lato(w + 2 * fr, fr, 0, h / 2 + fr / 2); lato(w + 2 * fr, fr, 0, -h / 2 - fr / 2); lato(fr, h, -w / 2 - fr / 2, 0); lato(fr, h, w / 2 + fr / 2, 0);
  const spot = new THREE.SpotLight(0xffe2b8, 40, 9, 0.55, 0.6, 1.4); spot.position.set(0, h / 2 + 1.6, 1.6); spot.target.position.set(0, 0, 0); g.add(spot, spot.target);   // luce da museo sul quadro
  return g;
}

// ---------- salotto rotondo ribassato: fossa in marmo, divano ad anello in bouclé aperto verso chi arriva, tavolo-braciere in pietra col fuoco ----------
export function fossaSalotto(L, r = 3.2, prof = 0.45, apertura = 1.25) {
  const g = new THREE.Group();
  const muro = new THREE.Mesh(new THREE.CylinderGeometry(r, r, prof, 96, 1, true), L.pavimento); muro.material = L.pavimento.clone(); muro.material.side = THREE.BackSide; muro.position.y = -prof / 2; g.add(muro);
  const fondo = new THREE.Mesh(new THREE.CircleGeometry(r, 96), L.pavimento); fondo.rotation.x = -Math.PI / 2; fondo.position.y = -prof + 0.005; fondo.receiveShadow = true; g.add(fondo);
  const bordo = new THREE.Mesh(new THREE.TorusGeometry(r + 0.02, 0.025, 8, 160), L.gola); bordo.rotation.x = Math.PI / 2; bordo.position.y = -0.02; g.add(bordo);   // filo di luce sul bordo
  // divano: settore d'anello estruso (seduta + schienale), con l'apertura verso +z
  const settore = (ri, ro, h) => { const a0 = Math.PI / 2 + apertura / 2, a1 = Math.PI / 2 - apertura / 2 + 2 * Math.PI, sh = new THREE.Shape();
    sh.absarc(0, 0, ro, a0, a1, false); sh.absarc(0, 0, ri, a1, a0, true); const ge = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 4, curveSegments: 96 }); ge.rotateX(-Math.PI / 2); ge.scale(1, 1, -1); return ge; };
  const seduta = new THREE.Mesh(settore(r - 1.05, r - 0.12, 0.34), L.boucle); seduta.position.y = -prof + 0.02; seduta.castShadow = seduta.receiveShadow = true; g.add(seduta);
  const schiena = new THREE.Mesh(settore(r - 0.45, r - 0.1, 0.72), L.boucle); schiena.position.y = -prof + 0.36; schiena.castShadow = true; g.add(schiena);
  for (let i = 0; i < 9; i++) { const a = Math.PI / 2 + apertura / 2 + 0.3 + i * (2 * Math.PI - apertura - 0.6) / 8, cu = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.42, 0.16), i % 2 ? L.velluto : L.boucle);   // cuscini
    cu.position.set(Math.cos(a) * (r - 0.62), -prof + 0.6, Math.sin(a) * (r - 0.62)); cu.rotation.y = -a + Math.PI / 2; cu.rotation.x = -0.2; g.add(cu); }
  const tav = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.0, 0.36, 64), L.verde); tav.position.y = -prof + 0.18; tav.castShadow = true; g.add(tav);
  const vasca = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.06, 10, 48), L.bronzo); vasca.rotation.x = Math.PI / 2; vasca.position.y = -prof + 0.37; g.add(vasca);
  const R = rng(5); for (let i = 0; i < 16; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.05 + R() * 0.06, 0.25 + R() * 0.3, 6), L.fuoco); const a = R() * 7, rr = R() * 0.35; f.position.set(Math.cos(a) * rr, -prof + 0.5 + R() * 0.08, Math.sin(a) * rr); g.add(f); }
  const lf = new THREE.PointLight(0xff9a4a, 25, 7, 1.5); lf.position.y = -prof + 0.9; g.add(lf);
  return g;
}

// ---------- lampadario a nastri di bronzo (scultura che scende dal soffitto a doppia altezza) dentro un ovale di luce nel soffitto ----------
export function lampadarioNastri(L, alto = 3.2, n = 5) {
  const g = new THREE.Group(), R = rng(19);
  const ovale = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.05, 8, 128), L.gola); ovale.rotation.x = Math.PI / 2; ovale.scale.set(1, 1.35, 1); ovale.position.y = -0.06; g.add(ovale);
  for (let k = 0; k < n; k++) { const ge = new THREE.PlaneGeometry(0.55, alto, 1, 60), pa = ge.attributes.position, tw = 1.6 + R() * 1.6, ph = R() * 6;
    for (let i = 0; i < pa.count; i++) { const y = pa.getY(i), v = (y + alto / 2) / alto, x = pa.getX(i), a = v * tw + ph, sx = Math.sin(v * 3 + ph) * 0.45;
      pa.setXYZ(i, x * Math.cos(a) + sx, y, x * Math.sin(a) + Math.cos(v * 2.4 + ph) * 0.35); }
    ge.computeVertexNormals(); const m = new THREE.Mesh(ge, L.bronzo.clone()); m.material.side = THREE.DoubleSide; const a = k / n * Math.PI * 2;
    m.position.set(Math.cos(a) * 0.55, -alto / 2 - 0.1 - R() * 0.4, Math.sin(a) * 0.55); m.castShadow = true; g.add(m); }
  const l = new THREE.PointLight(0xffd7a0, 30, 12, 1.4); l.position.y = -alto * 0.6; g.add(l);
  return g;
}

// ---------- colonna di vetro soffiato verde acqua (dal pavimento al soffitto), sassi di vetro impilati su un'asta ----------
export function colonnaVetro(L, alto) {
  const g = new THREE.Group(), R = rng(23); let y = 0.1;
  while (y < alto - 0.4) { const s = 0.28 + R() * 0.22, m = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 2), L.vetroTeal); m.scale.set(1.2, 0.8 + R() * 0.4, 1.0); m.rotation.set(R(), R() * 6, R()); m.position.set((R() - 0.5) * 0.12, y + s * 0.8, (R() - 0.5) * 0.12); g.add(m); y += s * 1.5; }
  const asta = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, alto, 8), L.cromo); asta.position.y = alto / 2; g.add(asta);
  return g;
}

// ---------- pianoforte a coda di cristallo (Blüthner/Schimmel trasparente): cassa trasparente, coperchio aperto, gambe di cristallo, tastiera ----------
export function pianoforte(L) {
  const g = new THREE.Group(), sh = new THREE.Shape();
  sh.moveTo(-0.76, 0); sh.lineTo(0.76, 0); sh.lineTo(0.76, 0.9); sh.bezierCurveTo(0.76, 1.6, 0.2, 1.7, 0.1, 2.2); sh.bezierCurveTo(0.0, 2.6, -0.5, 2.6, -0.76, 2.4); sh.closePath();
  const cassa = new THREE.ExtrudeGeometry(sh, { depth: 0.34, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, curveSegments: 32 }); cassa.rotateX(-Math.PI / 2); cassa.translate(0, 0.72, 0);
  g.add(new THREE.Mesh(cassa, L.cristallo));
  const cop = new THREE.Mesh(new THREE.ShapeGeometry(sh), L.cristallo); cop.rotation.x = -Math.PI / 2; const piv = new THREE.Group(); piv.position.set(-0.76, 1.08, 0); piv.rotation.z = 0.55; cop.position.x = 0.76; piv.add(cop); g.add(piv);
  const corde = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.9), L.oro); corde.rotation.x = -Math.PI / 2; corde.position.set(0, 0.86, -1.05); g.add(corde);
  const tast = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.05, 0.16), std('#f7f5f0', 0.3)); tast.position.set(0, 0.76, 0.1); g.add(tast);
  for (const [x, z] of [[-0.6, 0.05], [0.6, 0.05], [-0.3, -2.2]]) { const gm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.72, 16), L.cristallo); gm.position.set(x, 0.36, z); g.add(gm); }
  const pan = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.48, 0.38), L.cristallo); pan.position.set(0, 0.24, 0.75); g.add(pan);   // panchetta
  return g;
}

// ---------- tavolo da pranzo di vetro con tre cilindri cromati, totem di pietra, sedie in velluto ----------
export function tavoloVetro(L, lungo = 3.4) {
  const g = new THREE.Group(), piano = new THREE.Mesh(new THREE.BoxGeometry(lungo, 0.04, 1.25), L.cristallo); piano.position.y = 0.76; g.add(piano);
  for (const x of [-lungo * 0.32, 0, lungo * 0.32]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.74, 48), L.cromo); c.position.set(x, 0.37, 0); c.castShadow = true; g.add(c); }
  for (const s of [-1, 1]) for (let i = -1; i <= 1; i++) { const se = new THREE.Group(), b = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.55), L.velluto); b.position.y = 0.46; se.add(b);
    const sc = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.62, 0.1), L.velluto); sc.position.set(0, 0.8, 0.24); se.add(sc); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.42, 8), L.oro); p.position.y = 0.2; se.add(p);
    se.position.set(i * 1.05, 0, s * 0.95); se.rotation.y = s > 0 ? 0 : Math.PI; g.add(se); }
  const vaso = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), std('#d9cdb8', 0.6)); vaso.scale.y = 0.6; vaso.position.y = 0.88; g.add(vaso);
  return g;
}
export function totem(L, h = 2.6) {
  const g = new THREE.Group(), R = rng(31), mat = std('#cbbca6', 0.7); let y = 0;
  while (y < h) { const s = 0.18 + R() * 0.2, m = new THREE.Mesh(new THREE.SphereGeometry(s, 32, 16), mat); m.scale.set(1, 0.7 + R() * 1.1, 1); m.position.y = y + s * m.scale.y; m.castShadow = true; g.add(m); y += s * m.scale.y * 2 * 0.92; }
  return g;
}
// anello luminoso sospeso (pin: il cerchio sopra il tavolo)
export function anelloLuce(L, r = 1.3) { const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.035, 10, 128), L.gola); m.rotation.x = Math.PI / 2 - 0.25; return m; }

// ---------- vasca in bronzo a barca (pin: il bacile d'oro) ----------
export function vascaBronzo(L) {
  const pts = []; for (let i = 0; i <= 20; i++) { const t = i / 20; pts.push(new THREE.Vector2(0.02 + Math.sin(t * Math.PI / 2) * 0.5, -Math.cos(t * Math.PI / 2) * 0.55 + 0.55)); }
  const ge = new THREE.LatheGeometry(pts, 64); ge.scale(2.0, 1, 0.95); const m = new THREE.Mesh(ge, L.bronzo.clone()); m.material.side = THREE.DoubleSide; m.castShadow = true;
  const g = new THREE.Group(); m.position.y = 0.05; g.add(m);
  const acqua = new THREE.Mesh(new THREE.CircleGeometry(0.47, 48), std('#9cc6cf', 0.03, 0.4, { envMapIntensity: 1.6 })); acqua.rotation.x = -Math.PI / 2; acqua.scale.set(2.0, 0.95, 1); acqua.position.y = 0.5; g.add(acqua);
  return g;
}

// ---------- tenda velata con le pieghe ----------
export function tenda(L, w, h) { const ge = new THREE.PlaneGeometry(w, h, Math.round(w * 12), 1), pa = ge.attributes.position; for (let i = 0; i < pa.count; i++) pa.setZ(i, Math.sin(pa.getX(i) * 9) * 0.06); ge.computeVertexNormals(); return new THREE.Mesh(ge, L.tenda); }

// soffitto in foglia d'oro (quadrotti battuti, lucido)
export function fogliaOro() { const t = canvasTex(1024, 1024, (c, w, h) => { const R = rng(61); for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 64) { const v = 0.85 + R() * 0.3; c.fillStyle = `rgb(${Math.round(214 * v)},${Math.round(172 * v)},${Math.round(92 * v)})`; c.fillRect(x, y, 64, 64); c.strokeStyle = 'rgba(120,80,30,0.35)'; c.strokeRect(x + 0.5, y + 0.5, 63, 63); } }); t.repeat.set(3, 3);
  return new THREE.MeshStandardMaterial({ color: '#ffffff', map: t, metalness: 1, roughness: 0.25, envMapIntensity: 1.4, emissive: new THREE.Color('#5a3a10'), emissiveIntensity: 0.25 }); }
// lampadario a cascata di cristalli (pranzo)
export function lampadarioCristallo(L, r = 0.9, h = 1.6) { const g = new THREE.Group(), R = rng(71), n = 420, d = new THREE.Object3D(), im = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.035, 0), new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0, metalness: 0, clearcoat: 1, emissive: new THREE.Color('#fff1d6'), emissiveIntensity: 0.6, envMapIntensity: 2.5 }), n);
  for (let i = 0; i < n; i++) { const a = R() * 7, rr = Math.sqrt(R()) * r, y = -R() * h * (1 - rr / r * 0.6); d.position.set(Math.cos(a) * rr, y, Math.sin(a) * rr); d.scale.set(1, 1.6, 1); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }
  g.add(im); const an = new THREE.Mesh(new THREE.TorusGeometry(r, 0.03, 8, 64), L.oro); an.rotation.x = Math.PI / 2; g.add(an); const l = new THREE.PointLight(0xfff0d6, 20, 9, 1.5); l.position.y = -h * 0.5; g.add(l); return g; }
// specchio tondo in cornice d'oro a raggi
export function specchioOro(L, r = 0.7) { const g = new THREE.Group(), s = new THREE.Mesh(new THREE.CircleGeometry(r, 64), new THREE.MeshStandardMaterial({ color: '#dfe6ea', metalness: 1, roughness: 0.02, envMapIntensity: 2 })); s.position.z = 0.03; g.add(s);
  const an = new THREE.Mesh(new THREE.TorusGeometry(r + 0.05, 0.05, 12, 96), L.oro); g.add(an); for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2, rag = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22 + (i % 2) * 0.12, 0.03), L.oro); rag.position.set(Math.cos(a) * (r + 0.2), Math.sin(a) * (r + 0.2), 0); rag.rotation.z = a - Math.PI / 2; g.add(rag); } return g; }
