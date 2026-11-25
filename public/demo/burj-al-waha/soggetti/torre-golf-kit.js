// KIT · la torre della foto di Nico del 23/11 (due volumi di vetro arrotondati, fascia di bronzo in mezzo, logge a doppia altezza col verde),
// messa sul golf di Dubai Hills con lo skyline vero del Burj Khalifa dietro. File della sessione «torre golf»: non tocca engine/.
// Misure prese dalla foto (riferimenti/torre-golf/torre-riferimento.jpg, 736x920): interpiano tipico 32 px = 4,0 m (STIMA: residenze di lusso a Dubai 3,8-4,2 m),
// quindi 8 px/m. Volume sinistro 92 px = 11,5 m, fascia di bronzo 25 px = 3,1 m, volume destro 149 px = 18,6 m, altezza 707 px = 88 m (con la corona).
// Profondità 22 m: STIMA (la foto mostra solo la facciata). Righe dei solai misurate sulla foto: sinistra 19,1 / 23,1 / 27,25 / 31,25 / 35,25 / 39,1 / 43,5 |
// loggia 44,1-51,6 | 55,6 / 59,75 / 64 / 67,9 / 71,9 / 77,1 / tetto 86 / corona 88,4. Destra uguale fino a 71,6, poi 76,6 / 82,1 / 86,25.
// Logge (vuoti a doppia altezza col verde): sinistra 43,1-51,1 (l'entrata, con la pianta grande a destra), sinistra 11,1-19,1 (le palme), destra 27,1-35,1.
// Colori dai pixel della foto: vetro #bec4c8 (in alto prende il caldo #e8cba8, in basso #8a8883), solai #34302d, corona #a38168, bronzo basso #7f6958, cielo #6486b6 → #82a2c6.
// Camera (Nico 23/11): «la view leggermente più alta»: la foto madre è all'altezza degli occhi della loggia (44,8 m), sguardo orizzontale e in asse con la loggia,
// così l'entrata è uno zoom dritto e la torre resta al centro con le verticali dritte. Dietro, il golf e lo skyline del Burj al tramonto chiaro.
import * as THREE from 'three';
import { rng, canvasTex, unisci } from '../engine/kit/forme.js';
import { welcomeSchermo, fermata } from '../engine/fermate-torre.js';
import { skylineDubai } from '../engine/kit/dubai-skyline.js';
import { casaGolf, giroCasa, giroRetro } from './torre-golf-casa.js';

const Q = new URLSearchParams(location.search);

// ---------- pianta: rettangolo con gli angoli tondi, punti a passo costante con la normale verso fuori (parte dal centro della faccia davanti, z = +hz) ----------
export function pianta(hx, hz, r, passo = 0.4) {
  const segs = [], pts = [], L = (a, b) => ({ arco: false, a, b, len: Math.hypot(b[0] - a[0], b[1] - a[1]) }), A = (cx, cz, a0, a1) => ({ arco: true, cx, cz, a0, a1, len: r * Math.abs(a1 - a0) });
  segs.push(L([0, hz], [hx - r, hz]), A(hx - r, hz - r, Math.PI / 2, 0), L([hx, hz - r], [hx, -(hz - r)]), A(hx - r, -(hz - r), 0, -Math.PI / 2), L([hx - r, -hz], [-(hx - r), -hz]),
    A(-(hx - r), -(hz - r), -Math.PI / 2, -Math.PI), L([-hx, -(hz - r)], [-hx, hz - r]), A(-(hx - r), hz - r, Math.PI, Math.PI / 2), L([-(hx - r), hz], [0, hz]));
  const tot = segs.reduce((s, q) => s + q.len, 0);
  const at = s => { s = ((s % tot) + tot) % tot; for (const q of segs) { if (s <= q.len + 1e-9) { const u = q.len ? s / q.len : 0;
    if (q.arco) { const a = q.a0 + (q.a1 - q.a0) * u; return { p: [q.cx + Math.cos(a) * r, q.cz + Math.sin(a) * r], n: [Math.cos(a), Math.sin(a)] }; }
    const dx = q.b[0] - q.a[0], dz = q.b[1] - q.a[1], l = Math.hypot(dx, dz) || 1; return { p: [q.a[0] + dx * u, q.a[1] + dz * u], n: [-dz / l, dx / l] }; } s -= q.len; } return at(0); };
  const nP = Math.max(16, Math.round(tot / passo)); for (let i = 0; i <= nP; i++) { const s = i * tot / nP; pts.push({ s, ...at(i === nP ? 0 : s) }); }
  return { tot, at, pts, hx, hz };
}
// pareti verticali lungo la pianta (solo i tratti dove tieni(q) è vero), uv: u in metri / uS, v da 0 a 1 sull'altezza
function prisma(P, off, y0, y1, uS = 1, tieni = null, cx = 0) {
  const pos = [], uv = [], idx = []; let prec = -1;
  P.pts.forEach((q, i) => { const x = cx + q.p[0] + q.n[0] * off, z = q.p[1] + q.n[1] * off; pos.push(x, y0, z, x, y1, z); uv.push(q.s / uS, 0, q.s / uS, 1);
    const ok = !tieni || tieni(q); if (i > 0 && ok && prec) idx.push((i - 1) * 2, i * 2, (i - 1) * 2 + 1, (i - 1) * 2 + 1, i * 2, i * 2 + 1); prec = ok; });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function forma(P, off, cx = 0) { const sh = new THREE.Shape(); P.pts.forEach((q, i) => { const x = cx + q.p[0] + q.n[0] * off, z = q.p[1] + q.n[1] * off; i ? sh.lineTo(x, -z) : sh.moveTo(x, -z); }); return sh; }
function lastra(P, off, y, spess, cx = 0, bevel = 0) { const g = new THREE.ExtrudeGeometry(forma(P, off, cx), { depth: spess, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 6 }); g.rotateX(-Math.PI / 2); g.translate(0, y, 0); return g; }

// ---------- vetro di un piano (Nico 23/11 sera: «il vetro come la foto, super realistico»): vetro chiaro che lascia vedere dentro, la riga del soffitto acceso
// sotto ogni solaio, tende chiare velate, lampade calde a chiazze, mobili scuri in basso, montanti sottili scuri ogni 1,5 m; i riflessi del cielo li fa l'envMap ----------
function textureVetro(seme, C) {
  const R = rng(seme), W = 2048, H = 256, nM = 16, celle = []; for (let i = 0; i < nM; i++) celle.push({ k: R(), tenda: R(), lamp: R(), x: R(), mob: R() });
  const dis = (c, luce) => {
    if (luce) { c.fillStyle = '#000'; c.fillRect(0, 0, W, H); }
    else { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#6d6a66'); g.addColorStop(0.35, '#5d6268'); g.addColorStop(0.8, '#3f454c'); g.addColorStop(1, '#2c3036'); c.fillStyle = g; c.fillRect(0, 0, W, H); }
    for (let i = 0; i < nM; i++) { const q = celle[i], x = i * W / nM, w = W / nM;
      // dentro acceso caldo (2 celle su 3), più forte in alto vicino al soffitto
      if (q.k > 0.3) { const gi = c.createLinearGradient(0, 20, 0, H); const a = luce ? 0.55 : 0.5; gi.addColorStop(0, `rgba(255,214,160,${a * q.k})`); gi.addColorStop(0.45, `rgba(240,190,140,${a * 0.55 * q.k})`); gi.addColorStop(1, 'rgba(200,150,110,0)'); c.fillStyle = gi; c.fillRect(x, 20, w, H - 20); }
      // tende velate chiare (pieghe verticali morbide)
      if (q.tenda > 0.45) { const tw = w * (0.4 + q.tenda * 0.6), tx = x + (q.x > 0.5 ? w - tw : 0); for (let f = 0; f < tw; f += 6) { c.fillStyle = luce ? `rgba(255,226,190,${0.10 + 0.08 * Math.sin(f * 0.7)})` : `rgba(236,228,214,${0.30 + 0.12 * Math.sin(f * 0.7)})`; c.fillRect(tx + f, 22, 4, H - 34); } }
      // lampada: macchia calda morbida a metà altezza
      if (q.lamp > 0.55) { const lx = x + w * (0.2 + q.x * 0.6), ly = H * 0.42, r = 34 + q.lamp * 30, gl = c.createRadialGradient(lx, ly, 0, lx, ly, r); gl.addColorStop(0, `rgba(255,230,180,${luce ? 0.95 : 0.8})`); gl.addColorStop(0.3, `rgba(255,200,140,${luce ? 0.45 : 0.35})`); gl.addColorStop(1, 'rgba(255,190,130,0)'); c.fillStyle = gl; c.fillRect(lx - r, ly - r, 2 * r, 2 * r); }
      // mobili e persone di spalle: sagome scure in basso
      if (!luce && q.mob > 0.35) { c.fillStyle = 'rgba(28,26,26,0.55)'; c.fillRect(x + w * 0.15 + q.x * w * 0.3, H * 0.66, w * (0.25 + q.mob * 0.3), H * 0.2); c.fillRect(x + w * 0.1 + q.x * w * 0.5, H * 0.58, w * 0.05, H * 0.28); }
      if (luce) { c.fillStyle = '#000'; c.fillRect(x, 0, 5, H); } else { c.fillStyle = 'rgba(22,22,24,0.9)'; c.fillRect(x, 0, 4, H); c.fillStyle = 'rgba(220,214,204,0.35)'; c.fillRect(x + 4, 0, 1, H); } }   // montanti
    // soffitto: fascia scura del solaio e la riga di luce del soffitto acceso (la linea chiara netta della foto)
    c.fillStyle = luce ? '#000' : '#2a2622'; c.fillRect(0, 0, W, 8);
    c.fillStyle = luce ? 'rgba(255,238,210,1)' : '#fff3df'; c.fillRect(0, 8, W, 7);
    const gs = c.createLinearGradient(0, 15, 0, 40); gs.addColorStop(0, luce ? 'rgba(255,220,170,0.5)' : 'rgba(255,236,206,0.6)'); gs.addColorStop(1, 'rgba(255,220,170,0)'); c.fillStyle = gs; c.fillRect(0, 15, W, 25);
    // pavimento: riga scura sotto
    c.fillStyle = luce ? '#000' : 'rgba(20,18,16,0.8)'; c.fillRect(0, H - 6, W, 6);
  };
  return { map: canvasTex(W, H, c => dis(c, false), { aniso: 16 }), luce: canvasTex(W, H, c => dis(c, true), { aniso: 16 }), uS: 24 };
}
// lamelle di bronzo della fascia centrale, accese da dietro
function textureBronzo(C) { return canvasTex(256, 64, (c, w, h) => { c.fillStyle = C.bronzoScuro; c.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 16) { const g = c.createLinearGradient(x, 0, x + 16, 0); g.addColorStop(0, C.bronzoScuro); g.addColorStop(0.45, C.bronzo); g.addColorStop(0.6, C.bronzoChiaro); g.addColorStop(1, C.bronzoScuro); c.fillStyle = g; c.fillRect(x + 2, 0, 12, h); } }, { aniso: 16 }); }

// infissi neri (Nico 23/11 sera: «non si vedono le vetrate, almeno sull'angolo un infisso nero»): montanti sottili ogni 1,5 m, montanti larghi dove inizia
// e finisce ogni angolo tondo e a metà curva, profili neri sotto e sopra il vetro. Solo sui piani dell'appartamento, dove il vetro è vero.
function infissi(G, V, y0, y1, tieni, mat) {
  const P = V.Pv, hx = P.hx, hz = P.hz, r = Math.max(0.01, hx - (P.pts.find(q => Math.abs(q.n[0]) > 0.99)?.p[0] ?? hx)), d = new THREE.Object3D(), pos = [];
  let ultimo = -9; for (const q of P.pts) { const ang = Math.abs(q.n[0]) > 0.02 && Math.abs(q.n[1]) > 0.02; if (q.s - ultimo >= 1.5 || (ang && q.s - ultimo > 0.9)) { pos.push([q, 0.07]); ultimo = q.s; } }
  // agli angoli: dove la normale è a 45° (metà curva) e ai capi della curva, montante largo
  for (const q of P.pts) { const k = Math.abs(Math.abs(q.n[0]) - Math.abs(q.n[1])); if (k < 0.06) pos.push([q, 0.16]); }
  const sel = pos.filter(([q]) => !tieni || tieni(q)), im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, sel.length);
  sel.forEach(([q, w], i) => { d.position.set(V.cx + q.p[0] + q.n[0] * 0.04, (y0 + y1) / 2, q.p[1] + q.n[1] * 0.04); d.rotation.set(0, Math.atan2(q.n[0], q.n[1]), 0); d.scale.set(w, y1 - y0, 0.1); d.updateMatrix(); im.setMatrixAt(i, d.matrix); });
  G.add(im);
  for (const y of [y0 + 0.06, y1 - 0.06]) G.add(new THREE.Mesh(prisma(P, 0.05, y - 0.06, y + 0.06, 1, tieni, V.cx), mat));
}

// ---------- la torre ----------
function torre(S, C) {
  const T = S.torre, G = new THREE.Group(); G.name = 'torre';
  const hz = T.prof / 2, volumi = ['sx', 'dx'].map(k => ({ k, ...T[k], cx: (T[k].x0 + T[k].x1) / 2, hx: (T[k].x1 - T[k].x0) / 2 }));
  for (const V of volumi) { V.P = pianta(V.hx, hz, T.raggio); V.Pv = pianta(V.hx - 0.25, hz - 0.25, T.raggio - 0.2); }
  const std = (c, r, m = 0, e = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, ...e });
  const tx = [textureVetro(3, C), textureVetro(11, C), textureVetro(23, C)]; for (const t of tx) for (const m of [t.map, t.luce]) m.wrapS = THREE.RepeatWrapping;
  const vetri = tx.map(t => { const m = new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: t.map, roughness: 0.04, metalness: 0.0, emissiveMap: t.luce, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.75, envMapIntensity: 1.6, clearcoat: 1, clearcoatRoughness: 0.03, specularIntensity: 1, ior: 1.52 }); m.userData = { notte: 1.1, minimo: 0.6 }; return m; });
  /* il vetro dei piani dell'appartamento (11 e 12 a sinistra, 11 a destra) è vero: trasparente, così da dentro si vede fuori e da fuori si vede la casa accesa */
  const vetroVero = new THREE.MeshPhysicalMaterial({ color: '#d6e0e6', roughness: 0.02, metalness: 0.0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, envMapIntensity: 1.5, clearcoat: 1, clearcoatRoughness: 0.02, depthWrite: false });   /* vetro che si vede: riflessi leggeri, fuori nitido */
  const nero = std('#121212', 0.35, 0.6);
  const solaio = std(C.solaio, 0.6, 0.3), solaioBordo = std(C.solaio, 0.55, 0.35), corona = std(C.corona, 0.38, 0.85), soffittoCaldo = std('#f3dcc0', 0.6, 0, { emissive: new THREE.Color('#ffd6a2'), emissiveIntensity: 0.55 });
  soffittoCaldo.userData = { notte: 0.9, minimo: 0.5 };
  const bronzo = std('#ffffff', 0.35, 0.8, { map: textureBronzo(C), emissive: new THREE.Color('#ffcf96'), emissiveIntensity: 0.12 });
  const pietra = std('#d8cfc0', 0.6), verde = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, flatShading: true }), vaso = std('#3a3029', 0.6, 0.3);
  const pick = [], fasce = [], aloni = [];
  const loggiaA = (V, y) => T.logge.find(l => l.lato === V.k && y >= l.y0 - 0.01 && y < l.y1 - 0.01);
  /* Nico 23/11 notte: il corridoio passa dal salone alla cucina attraverso la fascia: niente vetro dove passa (facce interne dei due volumi) */
  const PSG = S.casa.passaggio, varco = (V, y0) => PSG && Math.abs(y0 - PSG.y0) < 0.05 ? (q => !((V.k === 'sx' ? q.n[0] > 0.5 : q.n[0] < -0.5) && q.p[1] > PSG.z0 - 0.05 && q.p[1] < PSG.z1 + 0.05)) : null;
  const e2 = (f1, f2) => f1 && f2 ? (q => f1(q) && f2(q)) : (f1 || f2);

  for (const V of volumi) {
    const lv = V.livelli;   // quote dei solai, dal basso (atrio) al tetto
    for (let i = 0; i < lv.length - 1; i++) {
      const y0 = lv[i], y1 = lv[i + 1], lo = loggiaA(V, y0), vero = (S.casa.vetri[V.k] || []).some(q => Math.abs(q - y0) < 0.05);
      if (lo) {   // loggia: il vetro arretra di lo.prof sulla faccia davanti, ai lati resta il vetro
        const zf = hz - lo.prof, mat = vero ? vetroVero : vetri[i % 3];
        if (i === 0 || !loggiaA(V, lv[i - 1])) { const fl = e2(q => q.p[1] < zf - 0.05, vero ? varco(V, y0) : null); const sides = prisma(V.Pv, 0, y0, lo.y1 - 0.45, tx[0].uS, fl, V.cx); G.add(new THREE.Mesh(sides, mat)); if (vero) infissi(G, V, y0, lo.y1 - 0.45, fl, nero);
          // fondo della loggia: parete di vetro dritta (con la porta scorrevole aperta dove si entra)
          const w = 2 * V.hx - 0.5, h = lo.y1 - 0.45 - y0, fondo = new THREE.Group(); fondo.position.set(V.cx, y0, zf);
          const porta = lo.porta; const pann = (a, b, ya, yb) => { if (b - a < 0.02 || yb - ya < 0.02) return; const m = new THREE.Mesh(new THREE.PlaneGeometry(b - a, yb - ya), vero ? vetroVero : vetri[1]); m.position.set((a + b) / 2, (ya + yb) / 2, 0); fondo.add(m); };
          const porte = (lo.porte || (porta ? [porta] : [])).slice().sort((p, q) => p.x - q.x); let xa = -w / 2;   /* torre-golf-b: più aperture nella stessa loggia (si entra da una, si esce dall'altra) */
          for (const po of porte) { const a = po.x - V.cx - po.w / 2, b = po.x - V.cx + po.w / 2; pann(xa, a, 0, h); pann(a, b, po.h, h); xa = b; } pann(xa, w / 2, 0, h);
          for (let x = -w / 2; x <= w / 2 + 0.01; x += 1.5) { if ((lo.porte || []).some(po => Math.abs(x - (po.x - V.cx)) < po.w / 2 + 0.05)) continue; const mo = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(Math.abs(x) - w / 2) < 0.05 ? 0.16 : 0.07, h, 0.1), vero ? nero : solaio); mo.position.set(x, h / 2, 0); if (!porta || Math.abs(x - (porta.x - V.cx)) > porta.w / 2 + 0.05 || true) fondo.add(mo); }
          G.add(fondo);
          // pavimento in pietra, soffitto acceso caldo, colonne di bronzo, parapetto di vetro col corrimano
          const pav = new THREE.Mesh(new THREE.PlaneGeometry(2 * V.hx - 0.4, lo.prof), pietra); pav.rotation.x = -Math.PI / 2; pav.position.set(V.cx, y0 + 0.02, zf + lo.prof / 2); G.add(pav);
          const sof = new THREE.Mesh(new THREE.PlaneGeometry(2 * V.hx - 0.4, lo.prof + 0.3), soffittoCaldo); sof.rotation.x = Math.PI / 2; sof.position.set(V.cx, lo.y1 - 0.46, zf + lo.prof / 2); G.add(sof);
          for (const xc of lo.colonne || []) { const co = new THREE.Mesh(new THREE.BoxGeometry(0.55, lo.y1 - y0 - 0.45, 0.55), corona); co.position.set(xc, (y0 + lo.y1 - 0.45) / 2, hz - 0.35); G.add(co); }
          const par = new THREE.Mesh(new THREE.BoxGeometry(2 * V.hx - 0.6, 1.1, 0.03), vetroVero); par.position.set(V.cx, y0 + 0.55, hz - 0.15); G.add(par);
          const cor = new THREE.Mesh(new THREE.BoxGeometry(2 * V.hx - 0.6, 0.05, 0.08), corona); cor.position.set(V.cx, y0 + 1.1, hz - 0.15); G.add(cor);
          const lu = new THREE.PointLight(0xffd29c, 120, 14, 1.6); lu.position.set(V.cx, lo.y1 - 1.2, zf + lo.prof * 0.5); G.add(lu);
          // il verde della loggia (la foto: alberi e cespugli che si vedono da fuori)
          for (const p of lo.piante || []) G.add(pianta3D(p, y0, verde, vaso, C));
        }
      } else {
        const U = S.casa.uscita, buco = e2(vero && V.k === U.lato ? q => !(q.n[1] < -0.5 && Math.abs(q.p[0] + V.cx - U.x) < U.w / 2) : null, vero ? varco(V, y0) : null);   /* la finestra del bagno è aperta: da lì si esce verso lo skyline */
        const m = new THREE.Mesh(prisma(V.Pv, 0, y0, y1, tx[0].uS, buco, V.cx), vero ? vetroVero : vetri[(i * 7 + (V.k === 'sx' ? 1 : 0)) % 3]); m.castShadow = !vero; m.receiveShadow = true; G.add(m); if (vero) infissi(G, V, y0, y1 - 0.42, buco, nero);
      }
      // solaio: lastra di bronzo scuro che sporge di 0,3 m con gli angoli tondi (le righe scure della foto); niente solaio in mezzo alla doppia altezza della loggia
      if (i > 0 && !(lo && y0 > lo.y0 + 0.01) && !(S.casa.duplex && V.k === S.casa.duplex.lato && Math.abs(y0 - S.casa.duplex.y) < 0.05)) G.add(new THREE.Mesh(lastra(V.P, 0.05, y0 - 0.42, 0.42, V.cx), solaioBordo));
    }
    // atrio vetrato e acceso (0 → primo solaio)
    const at = new THREE.Mesh(prisma(V.Pv, 0.02, 0, lv[0], 24, null, V.cx), S._atrio); G.add(at);   /* atrio a doppia altezza vetrato e acceso (la foto) */
    // tetto
    const top = lv[lv.length - 1]; G.add(new THREE.Mesh(lastra(V.P, 0.1, top - 0.1, 0.7, V.cx), solaio));
    // fasce della scelta (luce ambra sfumata sul piano, come SAMAR): una per volume, alta 1 e scalata sul piano
    const fascia = new THREE.Mesh(prisma(V.P, 0.15, 0, 1, 1, null, V.cx), S._fasciaMat.clone()); fascia.visible = false; fascia.renderOrder = 5; G.add(fascia); fasce.push(fascia);
    const alone = new THREE.Mesh(prisma(V.P, 0.55, -0.6, 1.6, 1, null, V.cx), S._aloneMat.clone()); alone.visible = false; alone.renderOrder = 6; G.add(alone); aloni.push(alone);
  }
  // corona del volume sinistro: la tesa di bronzo che sporge e curva verso fuori (in alto a sinistra nella foto), sotto accesa
  { const V = volumi[0], K = T.corona; G.add(new THREE.Mesh(lastra(V.P, K.sbalzo, K.y, K.h, V.cx, 0.35), corona));
    const gs = new THREE.ShapeGeometry(forma(V.P, K.sbalzo - 0.2, V.cx)); gs.rotateX(-Math.PI / 2); const ms = soffittoCaldo.clone(); ms.side = THREE.DoubleSide; const sotto = new THREE.Mesh(gs, ms); sotto.position.y = K.y - 0.37; G.add(sotto); }
  { const V = volumi[1]; G.add(new THREE.Mesh(lastra(V.P, 0.25, V.livelli[V.livelli.length - 1] - 0.2, 0.35, V.cx, 0.1), corona)); }
  // fascia di bronzo in mezzo: nucleo arretrato, lamelle verticali davanti e dietro, accese da dietro, righe scure ai solai
  { const N = T.nucleo, w = N.x1 - N.x0, cx = (N.x0 + N.x1) / 2, zf = hz - N.rientro;
    const pass = S.casa.passaggio;   /* al piano dell'appartamento il nucleo ha un varco (da sinistra a destra si passa dietro la fascia) */
    const pezzo = (ya, yb, za, zb) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, yb - ya, zb - za), std('#2a231e', 0.7, 0.3)); b.position.set(cx, (ya + yb) / 2, (za + zb) / 2); G.add(b); };
    if (pass) { pezzo(0, pass.y0, -zf + 0.4, zf - 0.4); pezzo(pass.y1, N.top, -zf + 0.4, zf - 0.4); pezzo(pass.y0, pass.y1, -zf + 0.4, pass.z0); pezzo(pass.y0, pass.y1, pass.z1, zf - 0.4); } else pezzo(0, N.top, -zf + 0.4, zf - 0.4);
    const luce = std('#f6dcb6', 0.5, 0, { emissive: new THREE.Color('#ffd49c'), emissiveIntensity: 0.85 }); luce.userData = { notte: 1.3, minimo: 0.7 };
    for (const s of [1, -1]) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(w, N.top), luce); pl.position.set(cx, N.top / 2, s * (zf - 0.38)); if (s < 0) pl.rotation.y = Math.PI; G.add(pl); }
    const nL = Math.round(w / 0.52), fin = new THREE.BoxGeometry(0.12, 1, 0.45), im = new THREE.InstancedMesh(fin, bronzo, nL * 2), d = new THREE.Object3D(); let k = 0;
    for (const s of [1, -1]) for (let i = 0; i < nL; i++) { d.position.set(N.x0 + (i + 0.5) * w / nL, N.top / 2, s * (zf - 0.1)); d.scale.set(1, N.top, 1); d.updateMatrix(); im.setMatrixAt(k++, d.matrix); }
    G.add(im);
    for (const y of volumi[1].livelli) if (y > 1 && y < N.top) for (const s of [1, -1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.32, 0.7), solaio); b.position.set(cx, y - 0.2, s * (zf + 0.05)); G.add(b); }
    G.add(new THREE.Mesh(new THREE.BoxGeometry(w, 0.6, 2 * zf), solaio).translateY(N.top + 0.3).translateX(cx)); }
  // podio come la foto (Nico 23/11 sera «il blocco sotto mi piace»): ali basse con gli angoli tondi verso fuori, sotto le vetrine accese calde,
  // sopra la fascia di lamelle di bronzo che sporge, cornicione scuro sottile, tetto verde
  { const lam = textureBronzo(C); lam.wrapS = THREE.RepeatWrapping;
    const vet = canvasTex(1024, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#f6dcb4'); g.addColorStop(0.5, '#c9a27a'); g.addColorStop(1, '#6e5644'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      const r = rng(31); for (let i = 0; i < 30; i++) { c.fillStyle = `rgba(40,30,26,${0.25 + r() * 0.3})`; c.fillRect(r() * w, h * (0.55 + r() * 0.2), 20 + r() * 50, h * 0.3); }
      for (let x = 0; x < w; x += 43) { c.fillStyle = '#2a2420'; c.fillRect(x, 0, 4, h); } c.fillStyle = '#2a2420'; c.fillRect(0, 0, w, 10); });
    const vetL = canvasTex(1024, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ffe2b8'); g.addColorStop(1, '#5a4030'); c.fillStyle = g; c.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 43) { c.fillStyle = '#000'; c.fillRect(x, 0, 4, h); } c.fillStyle = '#000'; c.fillRect(0, 0, w, 10); });
    vet.wrapS = vetL.wrapS = THREE.RepeatWrapping;
    const mVet = new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: vet, emissiveMap: vetL, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.7, roughness: 0.05, clearcoat: 1, envMapIntensity: 1.2 }); mVet.userData = { notte: 1.2, minimo: 0.7 };
    const mLam = std('#ffffff', 0.38, 0.75, { map: lam, emissive: new THREE.Color('#ffc890'), emissiveIntensity: 0.06 });
    for (const p of T.podio) { const g = new THREE.Group(); g.position.z = p.z; const P = pianta(p.w / 2, p.d / 2, 4.5), hV = p.h * 0.42;
      g.add(new THREE.Mesh(prisma(P, -0.6, 0, hV, 24, null, p.x), mVet));   // vetrine arretrate
      const so = new THREE.Mesh(lastra(P, 0.2, hV, 0.5, p.x), soffittoCaldo); g.add(so);   // soffitto acceso sopra le vetrine
      const la = new THREE.Mesh(prisma(P, 0.35, hV + 0.5, p.h, 4, null, p.x), mLam); la.castShadow = true; g.add(la);   // lamelle di bronzo
      g.add(new THREE.Mesh(lastra(P, 0.5, p.h, 0.45, p.x), solaio));   // cornicione
      const tv = new THREE.Mesh(lastra(P, -0.4, p.h + 0.45, 0.25, p.x), new THREE.MeshStandardMaterial({ color: '#5c7a3a', roughness: 0.95 })); g.add(tv);   // tetto verde
      G.add(g); } }
  const pk = new THREE.Mesh(new THREE.BoxGeometry(T.sx.x0 * -1 + T.dx.x1, 90, T.prof + 1), new THREE.MeshBasicMaterial({ visible: false })); pk.position.set((T.sx.x0 + T.dx.x1) / 2, 45, 0); G.add(pk); pick.push(pk);
  const fasciaG = new THREE.Group(); G.add(fasciaG); for (const f of fasce) fasciaG.add(f);   /* versione vera: la luce del piano sulla foto si prende da qui (reale-torre.js) */
  return { G, pick, fasce, aloni, volumi, fasciaG };
}

// una pianta in vaso o un albero piccolo dentro la loggia: tronco, chioma a palle (ficus, ulivo) o palma
function pianta3D(p, y0, mat, vaso, C) {
  const g = new THREE.Group(), R = rng(p.seme || 5); g.position.set(p.x, y0, p.z);
  if (p.vaso) { const v = new THREE.Mesh(new THREE.CylinderGeometry(p.vaso, p.vaso * 0.85, 0.9, 32), vaso); v.position.y = 0.45; g.add(v); }
  if (p.tipo === 'palma') { const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, p.h, 8), new THREE.MeshStandardMaterial({ color: '#7a6a55', roughness: 0.9 })); tr.position.y = p.h / 2; g.add(tr);
    const fr = new THREE.MeshStandardMaterial({ color: '#4e6a2e', roughness: 0.85, side: THREE.DoubleSide }); for (let i = 0; i < 9; i++) { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 2.6), fr); f.position.set(0, p.h, 0); f.rotation.set(-1.0, i * 0.7, 0); f.translateY(1.2); g.add(f); } return g; }
  const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * p.h / 3, 0.12 * p.h / 3, p.h * 0.6, 8), new THREE.MeshStandardMaterial({ color: '#5b4a3a', roughness: 0.9 })); tr.position.y = 0.9 + p.h * 0.3; g.add(tr);
  const n = Math.round(14 + p.h * 6); for (let i = 0; i < n; i++) { const a = R() * 7, rr = Math.sqrt(R()) * p.r, yy = 0.9 + p.h * (0.45 + R() * 0.5), s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35 + R() * p.r * 0.22, 1), mat.clone());
    s.material.color.set(C.foglie[Math.floor(R() * C.foglie.length)]); s.position.set(Math.cos(a) * rr, yy, Math.sin(a) * rr * 0.8); s.scale.y = 0.8; s.castShadow = true; g.add(s); }
  return g;
}

// ---------- il golf di Dubai Hills: fairway a strisce, rough, bunker, laghi, palme e alberi, la piazza con la fontana, le palazzine di Dubai Hills dietro ----------
function intorno(S, C) {
  const G = new THREE.Group(), R = rng(17), d = new THREE.Object3D(), LATO = 6000, half = LATO / 2, TX = 4096, k = TX / LATO;
  const X = x => (x + half) * k, Z = z => (z + half) * k, I = S.intorno;
  const terra = canvasTex(TX, TX, c => {
    c.fillStyle = C.sabbia; c.fillRect(0, 0, TX, TX);
    // rough verde scuro dappertutto nel golf
    c.fillStyle = C.rough; c.beginPath(); c.ellipse(X(0), Z(-600), 2600 * k, 2200 * k, 0, 0, 7); c.fill();
    for (let i = 0; i < 4000; i++) { const x = (R() - 0.5) * 5000, z = -600 + (R() - 0.5) * 4200; c.fillStyle = R() < 0.5 ? 'rgba(30,48,20,0.25)' : 'rgba(90,110,50,0.2)'; c.beginPath(); c.arc(X(x), Z(z), (4 + R() * 14) * k, 0, 7); c.fill(); }
    // fairway: nastri morbidi chiari con le strisce del taglio
    { const fc = document.createElement('canvas'); fc.width = fc.height = TX; const f2 = fc.getContext('2d'); f2.lineCap = 'round'; f2.lineJoin = 'round'; f2.strokeStyle = C.fairway;
      for (const f of I.fairway) { f2.lineWidth = f.l * k; f2.beginPath(); f.p.forEach(([x, z], i) => i ? f2.lineTo(X(x), Z(z)) : f2.moveTo(X(x), Z(z))); f2.stroke(); }
      f2.globalCompositeOperation = 'source-atop'; f2.globalAlpha = 0.07; for (let z = -half; z < half; z += 12) { f2.fillStyle = (Math.round(z / 12) % 2) ? '#ffffff' : '#203010'; f2.fillRect(0, Z(z), TX, 6 * k); }
      c.drawImage(fc, 0, 0); }
    // green e bunker
    for (const [x, z, r] of I.green) { c.fillStyle = C.green; c.beginPath(); c.ellipse(X(x), Z(z), r * k, r * 0.75 * k, 0.4, 0, 7); c.fill(); }
    for (const [x, z, rx, rz, a] of I.bunker) { c.fillStyle = C.bunker; c.beginPath(); c.ellipse(X(x), Z(z), rx * k, rz * k, a, 0, 7); c.fill(); }
    // percorsi dei golf cart e strade
    c.lineCap = 'round'; c.strokeStyle = C.sentiero; for (const s of I.sentieri) { c.lineWidth = 3 * k; c.beginPath(); s.forEach(([x, z], i) => i ? c.lineTo(X(x), Z(z)) : c.moveTo(X(x), Z(z))); c.stroke(); }
    c.strokeStyle = C.strada; for (const s of I.strade) { c.lineWidth = s.l * k; c.beginPath(); s.p.forEach(([x, z], i) => i ? c.lineTo(X(x), Z(z)) : c.moveTo(X(x), Z(z))); c.stroke(); }
    // piazza davanti alla torre, il viale d'ingresso e il prato intorno alla fontana
    c.fillStyle = C.piazza; c.fillRect(X(-70), Z(-16), 140 * k, 62 * k); c.fillStyle = C.prato; for (const [x, z, w, dd] of I.aiuole) c.fillRect(X(x), Z(z), w * k, dd * k);
    c.fillStyle = C.strada; c.beginPath(); c.ellipse(X(14), Z(32), 16 * k, 10 * k, 0, 0, 7); c.fill(); c.fillStyle = C.piazza; c.beginPath(); c.ellipse(X(14), Z(32), 9 * k, 5.5 * k, 0, 0, 7); c.fill();
  }, { aniso: 16 });
  const gm = new THREE.Mesh(new THREE.PlaneGeometry(LATO, LATO), new THREE.MeshStandardMaterial({ map: terra, roughness: 0.95 })); gm.rotation.x = -Math.PI / 2; gm.receiveShadow = true; G.add(gm);
  const far = new THREE.Mesh(new THREE.RingGeometry(half * 0.98, 15000, 64), new THREE.MeshStandardMaterial({ color: C.sabbia, roughness: 1 })); far.rotation.x = -Math.PI / 2; far.position.y = -0.3; G.add(far);
  // laghi: acqua che riflette il cielo del tramonto
  const acqua = new THREE.MeshStandardMaterial({ color: '#3d5a72', roughness: 0.04, metalness: 0.9, envMapIntensity: 1.4 });
  for (const [x, z, rx, rz, a] of I.laghi) { const l = new THREE.Mesh(new THREE.CircleGeometry(1, 64), acqua); l.rotation.x = -Math.PI / 2; l.rotation.z = a; l.scale.set(rx, rz, 1); l.position.set(x, 0.05, z); G.add(l);
    const bordo = new THREE.Mesh(new THREE.RingGeometry(1, 1.04, 64), new THREE.MeshStandardMaterial({ color: '#cbbd9f', roughness: 0.8 })); bordo.rotation.copy(l.rotation); bordo.scale.copy(l.scale); bordo.position.set(x, 0.06, z); G.add(bordo); }
  // fontana tonda davanti all'ingresso (la foto: a destra del viale)
  { const f = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 6.8, 0.7, 48), new THREE.MeshStandardMaterial({ color: '#d9cfbe', roughness: 0.6 })); f.position.set(14, 0.35, 32); G.add(f);
    const w = new THREE.Mesh(new THREE.CircleGeometry(6.0, 48), new THREE.MeshStandardMaterial({ color: '#6fb0c8', roughness: 0.05, metalness: 0.6, emissive: new THREE.Color('#3f8fb0'), emissiveIntensity: 0.25 })); w.rotation.x = -Math.PI / 2; w.position.set(14, 0.72, 32); G.add(w); }
  // alberi: chiome tonde e palme da dattero, a gruppi lungo i fairway, intorno ai laghi e alla base della torre
  const chiome = [], tronchi = [], palme = [];
  const albero = (x, z, h) => { const r = h * (0.32 + R() * 0.14); tronchi.push([x, z, h * 0.55, 1]); chiome.push([x, h - r * 0.7, z, r, R()]); if (R() < 0.6) chiome.push([x + (R() - 0.5) * r, h - r * 1.2, z + (R() - 0.5) * r, r * 0.8, R()]); };
  for (const b of I.boschi) for (let i = 0; i < b.n; i++) { const a = R() * 7, rr = Math.sqrt(R()), x = b.x + Math.cos(a) * rr * b.rx, z = b.z + Math.sin(a) * rr * b.rz; if (I.libero(x, z)) continue; if (b.palme && R() < b.palme) palme.push([x, z, b.h[0] + R() * (b.h[1] - b.h[0]), R()]); else albero(x, z, b.h[0] + R() * (b.h[1] - b.h[0])); }
  const ch = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95 }), chiome.length), col = new THREE.Color();
  chiome.forEach((q, i) => { d.position.set(q[0], q[1], q[2]); d.rotation.set(q[4] * 3, q[4] * 7, 0); d.scale.set(q[3], q[3] * 0.85, q[3]); d.updateMatrix(); ch.setMatrixAt(i, d.matrix); col.set(C.alberi[Math.floor(q[4] * 97) % C.alberi.length]); ch.setColorAt(i, col); });
  ch.castShadow = ch.receiveShadow = true; G.add(ch);
  // palme: tronco sottile e una corona di foglie a ventaglio (una geometria sola, istanze)
  const fronda = []; for (let i = 0; i < 11; i++) { const f = new THREE.PlaneGeometry(0.9, 4.2, 1, 4); const pa = f.attributes.position; for (let j = 0; j < pa.count; j++) { const v = (pa.getY(j) + 2.1) / 4.2; pa.setZ(j, -v * v * 1.8); pa.setX(j, pa.getX(j) * (1 - v * 0.7)); } f.translate(0, 2.1, 0); f.rotateX(-0.75 - (i % 3) * 0.25); f.rotateY(i * 2 * Math.PI / 11); fronda.push(f.toNonIndexed()); }
  const fg = unisci(fronda), fm = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85, side: THREE.DoubleSide });
  const pf = new THREE.InstancedMesh(fg, fm, palme.length), pt = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.17, 0.26, 1, 7).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: '#8b7a62', roughness: 0.95 }), palme.length);
  palme.forEach((p, i) => { d.position.set(p[0], p[2], p[1]); d.rotation.set(0, p[3] * 7, 0); const s = 0.8 + p[3] * 0.4; d.scale.set(s, s, s); d.updateMatrix(); pf.setMatrixAt(i, d.matrix); col.set(C.palme[Math.floor(p[3] * 31) % C.palme.length]); pf.setColorAt(i, col);
    d.position.set(p[0], 0, p[1]); d.rotation.set(0, 0, 0); d.scale.set(1, p[2], 1); d.updateMatrix(); pt.setMatrixAt(i, d.matrix); });
  pf.castShadow = pt.castShadow = true; G.add(pf, pt);
  const tr = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18, 0.26, 1, 6), new THREE.MeshStandardMaterial({ color: '#4a3b2e', roughness: 0.9 }), tronchi.length);
  tronchi.forEach((t, i) => { d.position.set(t[0], t[2] / 2, t[1]); d.rotation.set(0, 0, 0); d.scale.set(1.5, t[2], 1.5); d.updateMatrix(); tr.setMatrixAt(i, d.matrix); }); G.add(tr);
  // Dubai Hills: palazzine e torri medie di vetro e pietra chiara oltre il golf (G+8 … G+30, STIMA), finestre calde accese
  const cTex = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#d9d1c4'; c.fillRect(0, 0, w, h); const r = rng(4); for (let y = 0; y < h; y += 16) for (let x = 0; x < w; x += 12) { c.fillStyle = r() < 0.25 ? '#f1d2a4' : '#8d97a3'; c.fillRect(x + 2, y + 4, 8, 9); } });
  const cLuce = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); const r = rng(4); for (let y = 0; y < h; y += 16) for (let x = 0; x < w; x += 12) { c.fillStyle = r() < 0.25 ? '#ffc98a' : '#000'; c.fillRect(x + 2, y + 4, 8, 9); } });
  cTex.wrapS = cTex.wrapT = cLuce.wrapS = cLuce.wrapT = THREE.RepeatWrapping;
  const cm = new THREE.MeshStandardMaterial({ map: cTex, emissiveMap: cLuce, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.35, roughness: 0.55, metalness: 0.15 }); cm.userData = { notte: 0.6, minimo: 0.25 };
  const pal = []; for (const q of I.quartieri) for (let i = 0; i < q.n; i++) { const a = R() * 7, rr = Math.sqrt(R()), x = q.x + Math.cos(a) * rr * q.rx, z = q.z + Math.sin(a) * rr * q.rz; if (I.libero(x, z)) continue; pal.push([x, z, q.h[0] + Math.pow(R(), 1.8) * (q.h[1] - q.h[0]), 24 + R() * 30, 20 + R() * 26, (R() - 0.5) * 0.3]); }
  const bi = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), cm, pal.length); pal.forEach((b, i) => { d.position.set(b[0], 0, b[1]); d.rotation.set(0, b[5], 0); d.scale.set(b[3], b[2], b[4]); d.updateMatrix(); bi.setMatrixAt(i, d.matrix); }); bi.castShadow = true; G.add(bi);
  // lampioni caldi sul viale
  for (const [x, z] of I.luci) { const l = new THREE.PointLight(0xffcf96, 60, 30, 1.6); l.position.set(x, 4, z); G.add(l); }
  return G;
}

// ---------- primo piano (Nico 23/11 sera): «strada sotto figa con macchinoni da soldi ma più natura». Viale a due carreggiate con lo spartitraffico
// di palme e lampioni caldi, marciapiedi in pietra chiara, auto di lusso (berlina tipo Rolls, fuoristrada squadrato, coupé sportive), poi il parco fino alla piazza ----------
function autoLusso(tipo, colore) {
  const g = new THREE.Group(), prof = {
    coupe: { b: [[-2.3, 0.32], [-2.36, 0.8], [-1.8, 0.95], [0.9, 0.95], [2.15, 0.72], [2.32, 0.42], [2.2, 0.3]], v: [[-1.8, 0.95], [-0.8, 1.2], [0.15, 1.22], [0.9, 0.95]], w: 2.0, r: 0.36, ax: 1.45 },
    berlina: { b: [[-2.75, 0.36], [-2.8, 1.0], [-2.1, 1.08], [1.25, 1.08], [2.72, 0.98], [2.78, 0.42], [2.65, 0.34]], v: [[-2.05, 1.08], [-1.15, 1.52], [0.55, 1.54], [1.3, 1.08]], w: 2.0, r: 0.42, ax: 1.75 },
    suv: { b: [[-2.4, 0.46], [-2.42, 1.28], [2.3, 1.28], [2.42, 1.02], [2.42, 0.46]], v: [[-2.32, 1.28], [-2.25, 1.98], [0.95, 1.98], [1.25, 1.28]], w: 2.0, r: 0.45, ax: 1.5 } }[tipo];
  const sagoma = pts => { const sh = new THREE.Shape(); pts.forEach(([x, y], i) => i ? sh.lineTo(x, y) : sh.moveTo(x, y)); sh.closePath(); return sh; };
  const est = (pts, w, mat) => { const ge = new THREE.ExtrudeGeometry(sagoma(pts), { depth: w, bevelEnabled: true, bevelSize: 0.07, bevelThickness: 0.07, bevelSegments: 3, curveSegments: 4 }); ge.translate(0, 0, -w / 2); const m = new THREE.Mesh(ge, mat); m.castShadow = true; return m; };
  const verniciata = new THREE.MeshPhysicalMaterial({ color: colore, metalness: 0.55, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.4 });
  g.add(est(prof.b, prof.w - 0.14, verniciata), est(prof.v, prof.w - 0.36, new THREE.MeshPhysicalMaterial({ color: '#0d1014', metalness: 0.3, roughness: 0.05, clearcoat: 1, envMapIntensity: 1.6 })));
  const ruota = new THREE.CylinderGeometry(prof.r, prof.r, 0.3, 20).rotateX(Math.PI / 2), gm = new THREE.MeshStandardMaterial({ color: '#131313', roughness: 0.7 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const r = new THREE.Mesh(ruota, gm); r.position.set(sx * prof.ax, prof.r, sz * (prof.w / 2 - 0.12)); g.add(r); }
  const fx = prof.b.reduce((m, q) => Math.max(m, q[0]), 0), rx = prof.b.reduce((m, q) => Math.min(m, q[0]), 0), yl = tipo === 'suv' ? 1.0 : 0.66;
  const ant = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.0, 1.7), toneMapped: false }), post = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 0.08, 0.06), toneMapped: false });
  for (const sz of [-1, 1]) { const a = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.42), ant); a.position.set(fx + 0.02, yl, sz * (prof.w / 2 - 0.35)); g.add(a);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.5), post); b.position.set(rx - 0.02, yl + 0.08, sz * (prof.w / 2 - 0.3)); g.add(b); }
  return g;
}
function primoPiano(S, C) {
  const V = S.viale, G = new THREE.Group(), R = rng(77), d = new THREE.Object3D(), L = V.x1 - V.x0, xm = (V.x0 + V.x1) / 2;
  const piano = (z0, z1, mat, y = 0.04) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(L, z1 - z0), mat); m.rotation.x = -Math.PI / 2; m.position.set(xm, y, (z0 + z1) / 2); m.receiveShadow = true; G.add(m); return m; };
  // asfalto scuro fine con le strisce tratteggiate bianche
  const asf = canvasTex(1024, 256, (c, w, h) => { c.fillStyle = '#3a3a3c'; c.fillRect(0, 0, w, h); const r = rng(5); for (let i = 0; i < 9000; i++) { const v = 40 + r() * 40; c.fillStyle = `rgba(${v},${v},${v + 3},0.35)`; c.fillRect(r() * w, r() * h, 2, 2); }
    c.fillStyle = 'rgba(235,235,230,0.85)'; for (let x = 0; x < w; x += 128) c.fillRect(x, h / 2 - 2, 64, 4); c.fillRect(0, 6, w, 3); c.fillRect(0, h - 9, w, 3); }, { aniso: 16 });
  asf.repeat.set(L / 24, 1);
  const mAsf = new THREE.MeshStandardMaterial({ map: asf, roughness: 0.55, metalness: 0.05, envMapIntensity: 0.6 });
  const pietra = canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#ddd3c2'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(150,138,120,0.45)'; c.lineWidth = 2; for (let x = 0; x <= w; x += 64) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } for (let y = 0; y <= h; y += 128) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } });
  pietra.repeat.set(L / 4, 1);
  const mPie = new THREE.MeshStandardMaterial({ map: pietra, roughness: 0.6 });
  const erba = canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#5f8a37'; c.fillRect(0, 0, w, h); const r = rng(9); for (let i = 0; i < 14000; i++) { c.fillStyle = r() < 0.5 ? 'rgba(40,70,25,0.35)' : 'rgba(130,170,70,0.3)'; c.fillRect(r() * w, r() * h, 2, 3); } });
  erba.repeat.set(L / 10, 4);
  const mErba = new THREE.MeshStandardMaterial({ map: erba, roughness: 0.95 });
  const z = V.z; // bordo verso la torre
  piano(46, z, mErba, 0.03);   // il parco fra la piazza e il viale
  piano(z, z + 3, mPie); const A = piano(z + 3, z + 11, mAsf); piano(z + 11, z + 15, mErba, 0.12); const B = piano(z + 15, z + 23, mAsf); piano(z + 23, z + 26, mPie); piano(z + 26, z + 60, mErba, 0.03);
  // cordoli dello spartitraffico
  for (const zz of [z + 11, z + 15]) { const k = new THREE.Mesh(new THREE.BoxGeometry(L, 0.18, 0.25), new THREE.MeshStandardMaterial({ color: '#e7e1d6', roughness: 0.6 })); k.position.set(xm, 0.09, zz); G.add(k); }
  // palme dello spartitraffico e lampioni caldi (testa accesa + qualche luce vera vicino alla torre)
  const fronda = []; for (let i = 0; i < 12; i++) { const f = new THREE.PlaneGeometry(0.9, 4.4, 1, 4); const pa = f.attributes.position; for (let j = 0; j < pa.count; j++) { const v = (pa.getY(j) + 2.2) / 4.4; pa.setZ(j, -v * v * 2); pa.setX(j, pa.getX(j) * (1 - v * 0.7)); } f.translate(0, 2.2, 0); f.rotateX(-0.7 - (i % 3) * 0.28); f.rotateY(i * 2 * Math.PI / 12); fronda.push(f.toNonIndexed()); }
  const palme = []; for (let x = V.x0 + 6; x < V.x1; x += 14) { const r = R(); if (V.varco && x > V.varco[0] && x < V.varco[1]) continue; palme.push([x + (r - 0.5) * 2, z + 13, 9 + r * 2.5, R()]); }   /* niente palme davanti all'ingresso: si vede la piazza con la fontana */
  for (const g of V.alberi || []) palme.push(...g.filter(q => q[3] === 'p').map(q => [q[0], q[1], q[2], R()]));
  const pf = new THREE.InstancedMesh(unisci(fronda), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8, side: THREE.DoubleSide }), palme.length), pt = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.3, 1, 8).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: '#8f7d64', roughness: 0.95 }), palme.length), col = new THREE.Color();
  palme.forEach((p, i) => { d.position.set(p[0], p[2], p[1]); d.rotation.set(0, p[3] * 7, 0); d.scale.setScalar(1.0 + p[3] * 0.3); d.updateMatrix(); pf.setMatrixAt(i, d.matrix); col.set(C.palme[i % C.palme.length]); pf.setColorAt(i, col); d.position.set(p[0], 0, p[1]); d.scale.set(1, p[2], 1); d.rotation.set(0, 0, 0); d.updateMatrix(); pt.setMatrixAt(i, d.matrix); });
  pf.castShadow = pt.castShadow = true; G.add(pf, pt);
  const testa = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.8, 1.1), toneMapped: false }), palo = new THREE.MeshStandardMaterial({ color: '#2b2622', roughness: 0.5, metalness: 0.6 });
  for (let x = V.x0 + 13; x < V.x1; x += 28) for (const zz of [z + 1.2, z + 13, z + 24.8]) { const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 8, 8), palo); pl.position.set(x + (zz === z + 13 ? 7 : 0), 4, zz); G.add(pl); const t = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.18, 0.35), testa); t.position.set(x + (zz === z + 13 ? 7 : 0), 8.05, zz); G.add(t); }
  for (const x of V.luciVere || []) { const l = new THREE.PointLight(0xffc98a, 140, 30, 1.6); l.position.set(x, 7.5, z + 13); G.add(l); }
  // auto di lusso: carreggiata A verso destra, B verso sinistra, due ferme davanti all'ingresso
  for (const a of V.auto) { const m = autoLusso(a.tipo, a.colore); m.position.set(a.x, 0.05, a.corsia === 'A' ? z + 3 + a.l : a.corsia === 'B' ? z + 15 + a.l : a.z); m.rotation.y = a.verso < 0 ? Math.PI : 0; if (a.ry != null) m.rotation.y = a.ry; G.add(m); }
  // il parco: alberi tondi a gruppi, siepi basse, erbe ornamentali; alberi accesi dal basso vicino alla piazza (la foto)
  const chiome = [], tronchi = [];
  for (const q of V.parco) for (let i = 0; i < q.n; i++) { const a = R() * 7, rr = Math.sqrt(R()), x = q.x + Math.cos(a) * rr * q.rx, zz = q.z + Math.sin(a) * rr * q.rz, h = q.h[0] + R() * (q.h[1] - q.h[0]), r = h * (0.3 + R() * 0.12);
    tronchi.push([x, zz, h * 0.55]); chiome.push([x, h - r * 0.75, zz, r, R()]); chiome.push([x + (R() - 0.5) * r, h - r * 1.15, zz + (R() - 0.5) * r, r * 0.78, R()]); }
  const ch = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 3), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }), chiome.length);
  chiome.forEach((q, i) => { d.position.set(q[0], q[1], q[2]); d.rotation.set(q[4] * 3, q[4] * 7, 0); d.scale.set(q[3], q[3] * 0.85, q[3]); d.updateMatrix(); ch.setMatrixAt(i, d.matrix); col.set(C.alberi[Math.floor(q[4] * 97) % C.alberi.length]); ch.setColorAt(i, col); });
  ch.castShadow = ch.receiveShadow = true; G.add(ch);
  const tr = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.24, 1, 6), new THREE.MeshStandardMaterial({ color: '#4a3b2e', roughness: 0.9 }), tronchi.length);
  tronchi.forEach((t, i) => { d.position.set(t[0], t[2] / 2, t[1]); d.rotation.set(0, 0, 0); d.scale.set(1.4, t[2], 1.4); d.updateMatrix(); tr.setMatrixAt(i, d.matrix); }); G.add(tr);
  const cesp = []; for (let i = 0; i < V.cespugli; i++) { const x = V.x0 + R() * L, zz = (Math.abs(x) < 72 ? 46.5 : 30) + R() * (Math.abs(x) < 72 ? 2.5 : 18); if (Math.abs(x) < 72 && R() < 0.6) continue; if (Math.abs(x - 14) < 6 && zz < 60) continue; cesp.push([x, zz, 0.5 + R() * 0.9, R()]); }
  for (let x = V.x0; x < V.x1; x += 1.6) for (const zz of [z - 0.8, z + 26.8]) cesp.push([x, zz, 0.7, R()]);   // siepi lungo i marciapiedi
  const ce = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95 }), cesp.length);
  cesp.forEach((q, i) => { d.position.set(q[0], q[2] * 0.55, q[1]); d.rotation.set(0, q[3] * 6, 0); d.scale.set(q[2] * 1.3, q[2] * 0.7, q[2] * 1.1); d.updateMatrix(); ce.setMatrixAt(i, d.matrix); col.set(['#56702f', '#6d8540', '#8a8f4a', '#4a6328', '#a99a5a'][Math.floor(q[3] * 5)]); ce.setColorAt(i, col); });
  ce.castShadow = true; G.add(ce);
  for (const [x, zz] of V.alberiAccesi || []) { const l = new THREE.PointLight(0xffd29a, 90, 14, 1.5); l.position.set(x, 1.2, zz); G.add(l); }
  return G;
}

export function costruisciTorreGolf(S) {
  const C = S.modello.colori, G = new THREE.Group();
  const fasciaTex = canvasTex(64, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,195,94,0)'); g.addColorStop(0.2, 'rgba(255,195,94,0.95)'); g.addColorStop(0.8, 'rgba(255,195,94,0.95)'); g.addColorStop(1, 'rgba(255,195,94,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
  const aloneTex = canvasTex(64, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,160,60,0)'); g.addColorStop(0.5, 'rgba(255,170,70,0.55)'); g.addColorStop(1, 'rgba(255,160,60,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
  S._fasciaMat = new THREE.MeshBasicMaterial({ map: fasciaTex, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,   /* depthTest off: nella versione vera qualcosa davanti la copriva (24/11) */ side: THREE.DoubleSide, toneMapped: false, color: new THREE.Color(1.6, 1.2, 0.7) });
  S._aloneMat = new THREE.MeshBasicMaterial({ map: aloneTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false, opacity: 0.55 });
  { const dis = luce => c => { const w = 1024, h = 512; const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, luce ? '#ffe7c4' : '#fbe6c8'); g.addColorStop(0.6, luce ? '#a87a52' : '#cfae88'); g.addColorStop(1, luce ? '#3a2a20' : '#6a5444'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      if (!luce) { const r = rng(12); for (let i = 0; i < 14; i++) { c.fillStyle = 'rgba(40,32,28,0.5)'; c.fillRect(r() * w, h * 0.72, 30 + r() * 60, h * 0.2); c.fillRect(r() * w, h * 0.55, 6, h * 0.4); } }
      for (let x = 0; x < w; x += 64) { c.fillStyle = luce ? '#000' : '#2a2420'; c.fillRect(x, 0, 4, h); } c.fillStyle = luce ? '#000' : '#2a2420'; c.fillRect(0, h * 0.36, w, 5); c.fillRect(0, 0, w, 10); };
    const a = canvasTex(1024, 512, dis(false)), b = canvasTex(1024, 512, dis(true));
    S._atrio = new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: a, emissiveMap: b, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.8, roughness: 0.04, clearcoat: 1, envMapIntensity: 1.3 }); S._atrio.userData = { notte: 1.2, minimo: 0.8 }; }
  const TT = torre(S, C); G.add(TT.G); if (Q.get('senzaTorre')) TT.G.visible = false;   /* ?senzaTorre=1: per misurare la sagoma (giudice) */
  G.add(intorno(S, C)); if (S.viale) G.add(primoPiano(S, C));
  const casa = (S.casaFn || casaGolf)(S); G.add(casa);   /* torre-golf-b (24/11): un'altra casa sul piano col balcone a destra */   // l'appartamento: sempre al suo posto (piano 11 duplex a sinistra + piano 11 a destra)
  /* skyline vero (riferimenti/the-split/citta.json: altezze Wikipedia/CTBUH, posizioni OSM) girato così che il Burj stia a S.dubai.burj; via tutto quello che sta davanti alla torre */
  const pronta = fetch(new URL('../riferimenti/the-split/citta.json', import.meta.url)).then(r => r.json()).then(J => {
    const dd = J.citta.find(c => c.id === 'dubai'); if (!dd) return; const sk = skylineDubai(S.dubai.O, dd.torri, { bassi: 1600 }), b = sk.userData.burj; if (!b) return;
    const w = new THREE.Group(); w.add(sk); w.rotation.y = Math.atan2(S.dubai.burj[0], S.dubai.burj[1]) - Math.atan2(b.x, b.z); G.add(w);
    w.updateMatrixWorld(true); const M4 = new THREE.Matrix4(), v = new THREE.Vector3(), zero = new THREE.Matrix4().makeScale(0, 0, 0);
    sk.traverse(o => { if (!o.isInstancedMesh) return; for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, M4); v.setFromMatrixPosition(M4).applyMatrix4(o.matrixWorld); if (v.z > (S.dubai.zMax ?? -2600)) o.setMatrixAt(i, zero); } o.instanceMatrix.needsUpdate = true; });
    sk.traverse(o => { if (o.material && o.material.name === 'torri') o.material.emissiveIntensity = 0.5; if (o.material && o.material.name === 'burj') { o.material.emissive = new THREE.Color('#ffd9a8'); o.material.emissiveIntensity = 0.1; } });
  }).catch(e => console.warn('skyline', e));

  // ---------- piani: numerati sul volume destro (1-2 atrio, poi dal 3), il 20 e il 21 della corona ----------
  const V = TT.volumi, LV = V[1].livelli, PIANI = []; for (let i = 0; i < LV.length - 1; i++) PIANI.push({ n: i + 3, y0: LV[i], y1: LV[i + 1] });
  const esaurito = n => (S.esauriti || []).includes(n);
  const nodoPiano = (p, lato) => ({ id: 'p' + p.n, n: p.n, y0: p.y0, y1: p.y1, lato, duplex: S.casa.pianiDuplex.includes(p.n) && lato === 'sx', esaurito: esaurito(p.n) });
  /* torre-golf-b (24/11): ogni piano, destra (B) e sinistra (A), preso dal suo rettangolo di vetro misurato sulla foto 1; anche la luce usa quel rettangolo */
  const RT = S.rettangoli, nodoRett = r => { const pa = PIANI.find(q => q.n === r.n), pb = PIANI.find(q => q.n === (r.n2 || r.n)) || pa;
    return { id: 'p' + r.n + r.lato, n: r.n, n2: r.n2, lato: r.lato, y0: pa ? pa.y0 : 0, y1: pb ? pb.y1 : 4, rett: r, duplex: !!r.n2, esaurito: esaurito(r.n), etichetta: (r.n2 ? `${r.n}–${r.n2}` : String(r.n)) + (r.lato === 'sx' ? 'A' : 'B') }; };
  if (RT) S._nodoRett = nodoRett;
  const R = S.riprese, idDi = liv => S.livelli[liv] && S.livelli[liv].id;
  const M = {
    gruppo: G, ombra: 360, info: { TT, PIANI, fascia: TT.fasciaG },
    ripresa(liv, n, st) {
      const id = idDi(liv);
      if (id === 'retro') { const prima = st && st.livPrima != null ? idDi(st.livPrima) : null; return prima === 'dentro' ? { percorso: giroRetro(S) } : { percorso: [{ ...R.retro, t: 0.05 }] }; }   /* dallo skyline: giro in volo sul retro */
      if (id === 'mondo' || id === 'piani') { const prima = st && st.livPrima != null ? idDi(st.livPrima) : null; return prima === 'dentro' || prima === 'retro' || (S.stanze && S.stanze.some(q => q.id === prima)) ? { percorso: [{ ...R.mondo, t: 0.05 }] } : R.mondo; }   /* si sceglie tutto dalla foto madre (Nico 20/11); finito il giro si torna lì di colpo, senza volare attraverso la torre (nella versione vera è una dissolvenza) */
      if (S.stanze && S.stanze.some(q => q.id === id)) return { ...(R.q1 || R.mondo), dur: 0.15 };   /* fermate (versione vera): comanda la clip, la camera 3D non si vede */
      if (id === 'dentro') { /* entrata dritta (zoom puro: la camera è già in asse con la loggia), poi il giro in casa e l'uscita dal bagno verso lo skyline */
        const dalRetro = st && st.livPrima != null && idDi(st.livPrima) === 'retro', K = (S.giroFn || giroCasa)(S).map(q => ({ ...q, t: q.t + (dalRetro ? 0.05 : 0) }));
        if (dalRetro) K.unshift({ ...R.mondo, t: 0.05 });   /* scelto dal retro: stacco sulla foto madre e si rientra dritti dalla loggia */
        return { percorso: K, arrivo: K[K.length - 1].t }; }
      return R.mondo;
    },
    trova(liv, ray) {
      if (S.livelli[liv].tipo !== 'piani') return null;
      if (RT && window.__motore && idDi(liv) === 'piani') { const cam = window.__motore.camera; cam.updateMatrixWorld(); const RR = ray.ray || ray, v = RR.origin.clone().add(RR.direction.clone().multiplyScalar(60)).project(cam);   /* ray è il Raycaster del motore */
        const px = (v.x + 1) / 2 * RT.foto[0], py = (1 - v.y) / 2 * RT.foto[1], r = RT.lista.find(q => px >= q.x0 && px <= q.x1 && py >= q.y0 && py <= q.y1);
        return r && r.n >= (S.pianoMin || 3) ? nodoRett(r) : null; }
      for (const o of TT.pick) o.updateWorldMatrix(true, false);   /* versione vera: la scena 3D non si disegna, le matrici vanno aggiornate a mano */
      const h = ray.intersectObjects(TT.pick, false); if (!h.length) return null;
      const y = h[0].point.y, p = PIANI.find(q => y >= q.y0 && y < q.y1); if (!p || p.n < (S.pianoMin || 3)) return null; return nodoPiano(p, h[0].point.x < S.torre.nucleo.x1 ? 'sx' : 'dx');
    },
    accendi(st) {
      for (const f of [...TT.fasce, ...TT.aloni]) f.visible = false;
      if (S.livelli[st.liv].tipo !== 'piani') return; const h = st.hover || st.ultimoHover || (idDi(st.liv) === 'retro' ? nodoPiano(PIANI.find(q => q.n === S.casa.pianiDuplex[0]), 'sx') : null); if (!h) return;
      const col = h.esaurito ? new THREE.Color(0.55, 0.58, 0.62) : new THREE.Color(1.6, 1.15, 0.62);
      TT.fasce.forEach((f, i) => { const dup = h.duplex && i === 0, y0 = dup ? S.casa.duplex.y0 : h.y0, y1 = dup ? S.casa.duplex.y1 : h.y1; f.position.y = y0; f.scale.y = y1 - y0; f.material.color.copy(col); f.visible = !S.lucePerLato || i === (h.lato === 'sx' ? 0 : 1);   /* torre-golf-b: si accende solo il volume del piano scelto */
        const a = TT.aloni[i]; a.position.y = y0; a.scale.y = (y1 - y0) / 1; a.visible = !h.esaurito && (!S.lucePerLato || i === (h.lato === 'sx' ? 0 : 1)); });
      TT.fasciaG.updateMatrixWorld(true);   /* versione vera: la scena non si disegna, senza questo la luce resta a terra */
    },
    etichetta: () => null,
    ancora(liv, n) { return idDi(liv) === 'retro' ? new THREE.Vector3(S.torre.sx.x0, (n.y0 + n.y1) / 2, -S.torre.prof / 2) : new THREE.Vector3(S.torre.dx.x1, (n.y0 + n.y1) / 2, S.torre.prof / 2); },
    punto(p, st, proietta, ui) {
      if (p.bottone) { const b = ui.btns.find(b => b.id === p.bottone); return b ? b.c : null; }
      if (p.piano != null) { const q = PIANI.find(q => q.n === p.piano), x = p.lato === 'sx' ? (S.torre.sx.x0 + S.torre.sx.x1) / 2 : (S.torre.dx.x0 + S.torre.dx.x1) / 2; return proietta(new THREE.Vector3(x, (q.y0 + q.y1) / 2, S.torre.prof / 2)); }
      return p.xy || null;
    },
    finale: () => null,
    ogniFrame(t, st) { /* finito il giro (sei fuori davanti allo skyline): ci si gira sul retro della torre e si sceglie di nuovo il piano; se nessuno sceglie, si torna alla foto madre (loop) */
      const id = idDi(st.liv), iRetro = S.livelli.findIndex(l => l.id === 'retro');
      if (id === 'dentro' && st.arrivato === st.liv) { if (st.fineGiro == null) st.fineGiro = t; else if (t - st.fineGiro > (S.tempi.fine ?? 2.5) && window.__motore) { st.fineGiro = null; window.__motore.entra(iRetro >= 0 ? iRetro : (S.inizio || 1), null); } }
      else if (id === 'retro' && st.arrivato === st.liv && !st.hover) { if (st.fineGiro == null) st.fineGiro = t; else if (t - st.fineGiro > (S.tempi.sceltaRetro ?? 5) && window.__motore) { st.fineGiro = null; window.__motore.entra(S.inizio || 1, null); } }
      else st.fineGiro = null; },
    // card di vetro come SAMAR: a destra, «Choose your floor», livello grande, nome, m², bottone blu «Enter»
    pannello(c, st, now, ui, fermo) {
      const id = idDi(st.liv);
      if (S.stanze) { const iS = S.stanze.findIndex(q => q.id === id);
        if (iS >= 0) {   /* Nico 24/11: welcome a tutto schermo col nero che copre la vetrata, poi fermate dove scegli tu dove andare */
          const B = S.benvenuto, wf = Q.get('wf') || (B && B.wf) || 'V1';
          if (B && id === (B.livello || S.stanze[0].id) && welcomeSchermo(c, ui, B, now - (st.tEntra ?? st.tIn), wf)) return;
          if (st.arrivato !== st.liv) return;
          const q = S.stanze[iS], dopo = S.stanze[iS + 1], ritardo = iS === 0 ? 0.8 : 0.25, a0 = Math.max(0, Math.min(1, (now - st.tIn - ritardo) / 0.9)), a = a0 * a0 * (3 - 2 * a0);   /* entra morbida, dopo il welcome */
          if (a <= 0) return;
          const idB = dopo ? 'liv:' + S.livelli.findIndex(l => l.id === dopo.id) : 'liv:' + S.livelli.findIndex(l => l.id === (q.esci || 'piani'));
          fermata(c, ui, { stanza: q.nome, n: iS + 1, tot: S.stanze.length, prossima: dopo ? dopo.nome : '', esci: !dopo, dir: q.dir, xy: q.xy, id: idB, hov: st.hBtn === idB, sotto: S.testi.stanzeSotto, stanze: [...S.stanze.map(z => z.breve || z.nome), 'Outside'] }, a, now, Q.get('fermate') || S.fermateStile || 'P1');
          return; } }
      if (id === 'dentro' && S.benvenuto) {   /* Nico 24/11: un bel «Welcome to The Sky Diwan», senza punto, appena sei nel salotto */
        const B = S.benvenuto, t = now - st.tIn, cl = v => Math.max(0, Math.min(1, v)), ee = v => v * v * (3 - 2 * v), fi = B.fadeIn || 0.7, a3 = ee(cl((t - B.da) / fi)) * ee(cl((B.a - t) / (B.fadeOut || 0.7)));
        B._sale = 1 - ee(cl((t - B.da) / (fi * 1.4)));   /* mentre compare sale di poco: entrata morbida */
        if (a3 > 0) disegnaWelcome(c, ui, B, a3, Q.get('welcome') || B.stile || 'W1');
        return; }
      if ((id !== 'piani' && id !== 'retro') || !fermo) return;
      if (ui.temaTorre) {   /* Nico 24/11: card di lusso (temi di ui-torre.js) coi nomi della torre e del piano speciale; niente prezzi inventati */
        const hv0 = st.hover || st.ultimoHover, PS = S.casa.pianoSpeciale, nn = hv0 || (PS && RT ? nodoRett(RT.lista.find(q => q.n === PS.n && q.lato === PS.lato)) : PS ? nodoPiano(PIANI.find(q => q.n === PS.n), PS.lato) : nodoPiano(PIANI.find(q => q.n === S.casa.pianiDuplex[0]), 'sx'));
        const spec = PS && nn.n === PS.n && nn.lato === PS.lato && !nn.n2, a2 = Math.min(1, (now - st.tIn) / 0.5), etq = nn.etichetta || String(nn.n), area = S.aree ? (S.aree[nn.lato] || 0) * (nn.n2 ? 2 : 1) : (+S.areaPiano || 640);
        const d = { senzaScegli: !!S.testi.senzaScegli, torre: S.testi.torre || S.nome, torreAr: S.testi.torreAr || '', luogo: S.testi.luogo || 'Dubai Hills Estate', livello: etq, alto: Math.round(nn.y0), nome: spec ? PS.nome : (S.nomiPiani && S.nomiPiani[etq]) ? S.nomiPiani[etq][0] : nn.n2 ? `Duplex ${etq}` : `Residence ${etq}`,
          area, vista: S.testi.vista, vistaBreve: 'Golf · Burj', prezzo: null, valuta: S.valuta, stato: spec ? ['One of one', 'oro'] : (() => { const tp = S.nomiPiani && S.nomiPiani[etq] ? S.nomiPiani[etq][1] + ' · ' : ''; return nn.esaurito ? [tp + 'Sold', 'no'] : [tp + 'Available', 'ok']; })(),   /* Nico 24/11: ogni piano col suo nome, sotto il tipo (Residence, Duplex, Penthouse) */
          btn: spec ? 'Enter ' + PS.nome : `Enter ${etq}`, esaurito: !!nn.esaurito, hov: st.hBtn === 'scegliUltimo', speciale: spec };
        ui.temaTorre.pannello(c, d, ui, a2);
        if (st.hover) { const p = ui.proietta(M.ancora(1, st.hover)); if (p[2]) { c.save(); c.globalAlpha = a2; ui.temaTorre.tag(c, p, d, ui); c.restore(); } }
        return;
      }
      const W = ui.W, H = ui.H, w = 380, h = 392, x = W - W * 0.06 - w, y = H / 2 - h / 2, a = Math.min(1, (now - st.tIn) / 0.5), rr = (x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
      const hv = st.hover || st.ultimoHover, n = hv || nodoPiano(PIANI.find(q => q.n === S.casa.pianiDuplex[0]), 'sx');
      c.save(); c.globalAlpha = a;
      c.save(); rr(x, y, w, h, 30); c.clip(); if (ui.sfondo) { c.filter = 'blur(28px) saturate(1.6)'; c.drawImage(ui.sfondo, 0, 0, W, H); c.filter = 'none'; }
      c.fillStyle = 'rgba(16,22,40,0.28)'; c.fillRect(x, y, w, h); const g = c.createLinearGradient(0, y, 0, y + h * 0.42); g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(x, y, w, h); c.restore();
      rr(x + 0.5, y + 0.5, w - 1, h - 1, 30); c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 1; c.stroke();
      const X = x + 28; c.textAlign = 'left'; c.fillStyle = '#fff';
      c.font = '600 34px SFD'; c.fillText('Choose', X, y + 62); c.fillText('your floor', X, y + 98);
      c.font = '14px SFTS'; c.fillStyle = 'rgba(255,255,255,0.78)'; c.fillText('Move along the tower to light up a floor.', X, y + 128); c.fillText('Select it to fly in through the glass.', X, y + 148);
      c.font = '500 13px SFTS'; c.fillStyle = 'rgba(255,255,255,0.72)'; c.fillText('LEVEL', X, y + 222);
      c.font = '600 68px SFD'; c.fillStyle = '#fff'; c.fillText(n.duplex ? `${S.casa.pianiDuplex[0]}–${S.casa.pianiDuplex[1]}` : String(n.n), X + 52, y + 226);
      c.font = '600 17px SFTS'; c.fillText(n.esaurito ? `Residence ${n.n} · sold` : n.duplex ? `${S.testi.duplex} · ${Math.round(n.y0)} m` : `Residence ${n.n} · ${Math.round(n.y0)} m`, X, y + 258);
      c.font = '14px SFTS'; c.fillStyle = 'rgba(255,255,255,0.72)'; c.fillText(n.duplex ? S.testi.duplexSotto : `${S.areaPiano} m² · ${S.testi.vista}`, X, y + 280);
      const bw = w - 56, bh = 48, by = y + h - bh - 26, hov = st.hBtn === 'scegliUltimo', spento = n.esaurito;
      rr(X, by, bw, bh, 24); c.fillStyle = spento ? 'rgba(255,255,255,0.22)' : (hov ? '#2a95ff' : '#0a84ff'); c.fill();
      c.font = '600 16px SFTS'; c.fillStyle = '#fff'; c.textAlign = 'center'; c.fillText(n.duplex ? 'Enter the duplex' : `Enter level ${n.n}`, X + bw / 2, by + 30); c.textAlign = 'left';
      if (!spento) ui.btns.push({ id: 'scegliUltimo', r: [X, by, X + bw, by + bh], c: [X + bw / 2, by + bh / 2] });
      // lineetta e numero accanto alla torre, sul piano acceso (come SAMAR)
      if (st.hover) { const p = ui.proietta(M.ancora(1, st.hover)); if (p[2]) { c.strokeStyle = 'rgba(255,255,255,0.95)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(p[0] + 14, p[1]); c.lineTo(p[0] + 64, p[1]); c.stroke(); c.font = '300 22px SFD'; c.fillStyle = '#fff'; c.fillText(st.hover.duplex ? `${S.casa.pianiDuplex[0]}–${S.casa.pianiDuplex[1]}` : String(st.hover.n), p[0] + 76, p[1] + 8); } }
      c.restore();
    },
  };
  M.pronta = pronta;
  return M;
}

/* Nico 24/11: «il welcome deve essere luxury e bello»: quattro stili, ?welcome=W1…W4 (o S.benvenuto.stile) */
const ORO = ['#f7e9bd', '#c9a055', '#f4da93', '#9a7232'];
function disegnaWelcome(c, ui, B, a, stile) {
  const W = ui.W, H = ui.H, oro = (x, y, w, h) => { const g = c.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, ORO[0]); g.addColorStop(0.38, ORO[1]); g.addColorStop(0.64, ORO[2]); g.addColorStop(1, ORO[3]); return g; };
  const T = (t, x, y, font, col, ls = 0, al = 'center') => { c.font = font; c.fillStyle = col; c.textAlign = al; c.letterSpacing = ls + 'px'; c.fillText(t, al === 'center' ? x + ls / 2 : x, y); c.letterSpacing = '0px'; };
  const rombo = (x, y, r, col) => { c.save(); c.translate(x, y); c.rotate(Math.PI / 4); c.fillStyle = col; c.fillRect(-r / 2, -r / 2, r, r); c.restore(); };
  c.save(); c.globalAlpha = a; c.textBaseline = 'alphabetic';
  if (stile === 'W2') {   // invito d'oro: arabo in oro, nome dritto spaziato, filo d'oro col rombo; entra salendo di poco
    const y = H * 0.2 + (B._sale || 0) * 16, g = c.createRadialGradient(W / 2, y + 40, 40, W / 2, y + 40, 620); g.addColorStop(0, 'rgba(10,8,6,0.42)'); g.addColorStop(1, 'rgba(10,8,6,0)'); c.fillStyle = g; c.fillRect(0, 0, W, y + 330);
    c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 22;
    T(B.ar, W / 2, y - 58, '50px "Diwan Thuluth"', oro(W / 2 - 120, y - 110, 240, 60));
    T('WELCOME  TO', W / 2, y - 2, '17px SFTS', '#f1d99a', 10);
    T(B.titolo.toUpperCase(), W / 2, y + 78, '66px Didot', '#fff8ec', 10);
    c.shadowBlur = 0; const o = oro(W / 2 - 240, y + 100, 480, 4); c.fillStyle = o; c.fillRect(W / 2 - 230, y + 108, 205, 1); c.fillRect(W / 2 + 25, y + 108, 205, 1); rombo(W / 2, y + 108.5, 8, o);
    T(B.sotto.toUpperCase(), W / 2, y + 140, '12px SFTS', 'rgba(246,234,210,0.85)', 5);
  } else if (stile === 'W3') {   // concierge: blocco editoriale in basso a sinistra, come la barra della scelta
    const g = c.createLinearGradient(0, H, W * 0.55, H * 0.45); g.addColorStop(0, 'rgba(8,6,4,0.72)'); g.addColorStop(0.55, 'rgba(8,6,4,0.28)'); g.addColorStop(1, 'rgba(8,6,4,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    const x = 110, y = H - 150; c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 18;
    T(B.ar, x, y - 196, '70px "Diwan Thuluth"', oro(x, y - 260, 240, 80), 0, 'left');
    T('Welcome to', x + 2, y - 116, 'italic 36px Didot', 'rgba(248,236,212,0.95)', 0.5, 'left');
    T(B.titolo, x, y - 34, '84px Didot', '#fff8ec', 0, 'left');
    c.shadowBlur = 0; c.fillStyle = oro(x, y, 300, 2); c.fillRect(x + 2, y - 6, 120, 1.2);
    T(B.sotto.toUpperCase(), x + 2, y + 26, '12.5px SFTS', 'rgba(246,234,210,0.82)', 4.5, 'left');
  } else if (stile === 'W4') {   // targa di vetro: vetro sfocato con filo d'oro, come un invito
    const w = 620, h = 290, x = W / 2 - w / 2, y = H * 0.16, P = () => { c.beginPath(); c.roundRect(x, y, w, h, 6); };
    c.save(); c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 50; c.shadowOffsetY = 16; P(); c.fillStyle = 'rgba(0,0,0,0.01)'; c.fill(); c.restore();
    c.save(); P(); c.clip(); if (ui.sfondo) { c.filter = 'blur(26px) brightness(0.55) saturate(1.2)'; c.drawImage(ui.sfondo, 0, 0, W, H); c.filter = 'none'; } c.fillStyle = 'rgba(12,10,8,0.38)'; c.fillRect(x, y, w, h); c.restore();
    const o = oro(x, y, w, h); c.strokeStyle = o; c.lineWidth = 1.2; c.beginPath(); c.roundRect(x + 0.6, y + 0.6, w - 1.2, h - 1.2, 6); c.stroke(); c.globalAlpha = a * 0.5; c.beginPath(); c.roundRect(x + 9, y + 9, w - 18, h - 18, 3); c.stroke(); c.globalAlpha = a;
    rombo(W / 2, y + 9, 9, o);
    T(B.ar, W / 2, y + 92, '60px "Diwan Thuluth"', o);
    T('Welcome to', W / 2, y + 150, 'italic 30px Didot', 'rgba(248,236,212,0.95)', 0.4);
    T(B.titolo, W / 2, y + 222, '62px Didot', '#fff8ec', 1);
    T(B.sotto.toUpperCase(), W / 2, y + 262, '11px SFTS', 'rgba(241,217,154,0.85)', 4.5);
  } else {   // W1: corsivo al centro, arabo sotto
    const y = H * 0.2, g = c.createLinearGradient(0, 0, 0, y + 190); g.addColorStop(0, 'rgba(0,0,0,0.34)'); g.addColorStop(0.7, 'rgba(0,0,0,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, W, y + 190);
    c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 26;
    T(B.sopra, W / 2, y, 'italic 38px Didot', 'rgba(248,236,212,0.95)', 1);
    T(B.titolo, W / 2, y + 98, 'italic 84px Didot', '#fff8ec');
    if (B.ar) T(B.ar, W / 2, y + 168, '52px "Diwan Thuluth"', '#ecd09a');
  }
  c.restore();
}
