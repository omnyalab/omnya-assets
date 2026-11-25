// Motore choose-your · KIT QUARTIERE (21/11/2026, «choose your villa» a Dubai Hills).
// Un quartiere vero da OpenStreetMap (strumenti/osm_dubai_hills.py → quartiere.json, metri: x est, z sud):
//  - terreno dipinto dai dati in tre livelli di dettaglio (satellite 1,4 m/px, quartiere 0,37 m/px, strada 0,1 m/px) letti da un solo shader;
//  - ville estruse dalle sagome vere (vetri, fasce, cornicioni) con uno stato per villa (verde libera, grigia venduta, lanterna accesa);
//  - laghi che riflettono il cielo, golf con le strisce del taglio, piscine, giardini, siepi, cancelli, palme e lampioni a misura vera.
// Tutto quello che non è nei dati (giardini, piscine, siepi, cancelli, palme) è generato con regole e va scritto come STIMA.
import * as THREE from 'three';
import { canvasTex, rng, lerp, clamp, unisci } from './forme.js';
import { palme, alberi, scatola, texSiepe, texPietra, texCancello } from './quartiere-verde.js';

// ---------------- geometria 2D ----------------
export const areaPol = g => { let a = 0; for (let i = 0; i < g.length; i++) { const p = g[i], q = g[(i + 1) % g.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };
export const centro = g => [g.reduce((s, p) => s + p[0], 0) / g.length, g.reduce((s, p) => s + p[1], 0) / g.length];
export function dentro(pt, g) { const [x, y] = pt; let ins = false; for (let i = 0, j = g.length - 1; i < g.length; j = i++) { const [xi, yi] = g[i], [xj, yj] = g[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi + 1e-12) + xi) ins = !ins; } return ins; }
function allarga(g, d) {   // poligono spostato verso fuori di d metri (spigoli a punta, g in senso antiorario: area > 0)
  const n = g.length, out = [];
  for (let i = 0; i < n; i++) {
    const a = g[(i - 1 + n) % n], b = g[i], c = g[(i + 1) % n];
    const n1 = norm([b[1] - a[1], -(b[0] - a[0])]), n2 = norm([c[1] - b[1], -(c[0] - b[0])]), m = norm([n1[0] + n2[0], n1[1] + n2[1]]), k = 1 / Math.max(0.35, m[0] * n1[0] + m[1] * n1[1]);
    out.push([b[0] + m[0] * d * k, b[1] + m[1] * d * k]);
  }
  return out;
}
const norm = v => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
// polilinea → campioni a passo fisso con direzione e lunghezza cumulata
export function campiona(g, passo = 2) {
  const out = []; let s = 0;
  for (let i = 0; i < g.length - 1; i++) { const [x0, z0] = g[i], [x1, z1] = g[i + 1], L = Math.hypot(x1 - x0, z1 - z0); if (L < 1e-6) continue; const n = Math.max(1, Math.ceil(L / passo));
    for (let k = 0; k < n; k++) { const u = k / n; out.push({ x: lerp(x0, x1, u), z: lerp(z0, z1, u), dx: (x1 - x0) / L, dz: (z1 - z0) / L, s: s + u * L }); } s += L; }
  const l = g[g.length - 1], p = out[out.length - 1] || { dx: 1, dz: 0 }; out.push({ x: l[0], z: l[1], dx: p.dx, dz: p.dz, s }); out.len = s; return out;
}

// ---------------- materiali con lo stato per villa (tinta e lanterna) ----------------
function conStato(mat, tex, kGlow, kTinta = 0.22, tinge = true) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.tStato = { value: tex };
    sh.vertexShader = 'attribute float aVid;\nvarying float vVid;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vVid = aVid;');
    sh.fragmentShader = 'uniform sampler2D tStato;\nvarying float vVid;\n' + sh.fragmentShader
      .replace('#include <color_fragment>', '#include <color_fragment>\n  vec4 sT = texelFetch(tStato, ivec2(int(vVid + 0.5), 0), 0);\n' + (tinge ? '  diffuseColor.rgb = mix(diffuseColor.rgb, sT.rgb, sT.a);' : '  sT.a = 0.0;'))
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n  vec4 sG = texelFetch(tStato, ivec2(int(vVid + 0.5), 1), 0);\n  #ifdef USE_EMISSIVEMAP
  vec3 eM = emissiveColor.rgb;
#else
  vec3 eM = vec3(1.0);
#endif
  totalEmissiveRadiance += sG.rgb * sG.a * ${kGlow.toFixed(2)} * eM + sT.rgb * sT.a * ${kTinta.toFixed(2)};`);
  };
  mat.customProgramCacheKey = () => 'stato' + kGlow + '_' + kTinta + tinge; return mat;
}

// ---------------- texture delle ville ----------------
function texIntonaco(seed = 4) {   // intonaco liscio chiaro con giunti appena visibili (texture in metri: 1 px = 1 cm, ripete ogni 5,12 m)
  const R = rng(seed);
  return canvasTex(512, 512, (c, w, h) => {
    c.fillStyle = '#f1ece3'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(${R() < 0.5 ? '255,255,255' : '150,135,115'},${0.03 + R() * 0.04})`; c.fillRect(R() * w, R() * h, 2 + R() * 8, 2 + R() * 8); }
    c.fillStyle = 'rgba(120,105,90,0.10)'; for (let y = 0; y < h; y += 128) c.fillRect(0, y, w, 1.5);
  }, { repeat: [1 / 5.12, 1 / 5.12], aniso: 8 });
}
function texVetro() {   // vetrate a tutta altezza: telaio bronzo scuro ogni 1,6 m, traverso a 2,4 m, vetro scuro (in metri: ripete ogni 1,6 × 3,2 m)
  return canvasTex(256, 512, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#26313b'); g.addColorStop(1, '#1a2229'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = '#2b241f'; c.fillRect(0, 0, 7, h); c.fillRect(w - 7, 0, 7, h); c.fillRect(0, h * 0.25 - 4, w, 8); c.fillRect(0, 0, w, 6); c.fillRect(0, h - 6, w, 6);
  }, { repeat: [1 / 1.6, 1 / 3.2], aniso: 8 });
}
function texLuceDentro() {   // dentro le vetrate: soffitto caldo, lampade, una tenda chiara (solo per la lanterna)
  const R = rng(14);
  return canvasTex(256, 512, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ffd9a0'); g.addColorStop(0.5, '#ffc477'); g.addColorStop(1, '#c98a4a'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 3; i++) { const x = R() * w; c.fillStyle = 'rgba(255,248,230,0.8)'; c.beginPath(); c.ellipse(x, 30, 22, 10, 0, 0, 7); c.fill(); }
    c.fillStyle = '#2b241f'; c.fillRect(0, 0, 7, h); c.fillRect(w - 7, 0, 7, h); c.fillRect(0, h * 0.25 - 4, w, 8);
  }, { repeat: [1 / 1.6, 1 / 3.2] });
}

// ---------------- una villa dalla sagoma OSM: muri, vetri, fasce, cornicione, tetto ----------------
// stile delle ville moderne di Dubai Hills (Golf Place, Fairway Vistas): due piani, tetto piano a sbalzo, fascia del solaio, grandi vetrate.
// Altezze STIMA: piano terra 3,9 m, primo piano 3,5 m, parapetto 0,5 m (totale 7,9 m); fino alle brochure (note in riferimenti/dubai-hills/brochure).
function villa(g0, vid, R, P, opz) {
  let g = g0.slice(); if (areaPol(g) < 0) g.reverse();
  const H1 = opz.h1 ?? 3.9, H = opz.h ?? 7.4, HP = H + 0.5, muri = [], vetri = [], fasce = [], tetti = [];
  const quad = (list, a, b, c, d, n, uvs) => {   // a b c d in senso antiorario visti da fuori (n = normale voluta)
    const pos = [...a, ...b, ...c, ...a, ...c, ...d], nn = [], uv = [...uvs[0], ...uvs[1], ...uvs[2], ...uvs[0], ...uvs[2], ...uvs[3]];
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    if (cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] < 0) { pos.splice(0, 18, ...a, ...c, ...b, ...a, ...d, ...c); uv.splice(0, 12, ...uvs[0], ...uvs[2], ...uvs[1], ...uvs[0], ...uvs[3], ...uvs[2]); }
    for (let i = 0; i < 6; i++) nn.push(...n); list.push({ pos, nn, uv });
  };
  // muri esterni (fino al parapetto) e finestre su ogni lato
  let u = 0;
  for (let i = 0; i < g.length; i++) {
    const p = g[i], q = g[(i + 1) % g.length], L = Math.hypot(q[0] - p[0], q[1] - p[1]); if (L < 0.05) continue;
    const t = [(q[0] - p[0]) / L, (q[1] - p[1]) / L], n = [t[1], 0, -t[0]];   // area > 0 → fuori = (dz, -dx)
    quad(muri, [p[0], 0, p[1]], [q[0], 0, q[1]], [q[0], HP, q[1]], [p[0], HP, p[1]], n, [[u, 0], [u + L, 0], [u + L, HP], [u, HP]]);
    if (L > 3.2) {   // vetrate: piano terra quasi tutto vetro, sopra a campate
      const piani = [[0.12, H1 - 0.35, opz.vetroPT ?? 0.78], [H1 + 0.45, H - 0.45, opz.vetroP1 ?? 0.55]];
      for (const [y0, y1, quota] of piani) {
        const nb = Math.max(1, Math.round(L / 4.2)), bw = L / nb;
        for (let b = 0; b < nb; b++) { if (R() > (y0 < 1 ? 0.85 : 0.72)) continue; const w = bw * lerp(quota * 0.8, quota, R()), c0 = (b + 0.5) * bw - w / 2, c1 = c0 + w, o = 0.06;
          const A = [p[0] + t[0] * c0 + n[0] * o, y0, p[1] + t[1] * c0 + n[2] * o], B = [p[0] + t[0] * c1 + n[0] * o, y0, p[1] + t[1] * c1 + n[2] * o];
          quad(vetri, A, B, [B[0], y1, B[2]], [A[0], y1, A[2]], n, [[u + c0, y0], [u + c1, y0], [u + c1, y1], [u + c0, y1]]); }
      }
    }
    u += L;
  }
  // fascia del solaio (sporge 0,3 m) e cornicione del tetto (sporge 0,55 m): anelli chiusi sopra e sotto
  const anello = (d, y0, y1) => { const o = allarga(g, d); let uu = 0;
    for (let i = 0; i < o.length; i++) { const p = o[i], q = o[(i + 1) % o.length], L = Math.hypot(q[0] - p[0], q[1] - p[1]); if (L < 0.05) continue; const t = [(q[0] - p[0]) / L, (q[1] - p[1]) / L], n = [t[1], 0, -t[0]];
      quad(fasce, [p[0], y0, p[1]], [q[0], y0, q[1]], [q[0], y1, q[1]], [p[0], y1, p[1]], n, [[uu, y0], [uu + L, y0], [uu + L, y1], [uu, y1]]); uu += L; }
    const tri = THREE.ShapeUtils.triangulateShape(o.map(p => new THREE.Vector2(p[0], p[1])), [g.map(p => new THREE.Vector2(p[0], p[1]))]), all = [...o, ...g];
    for (const [ny, y] of [[1, y1], [-1, y0]]) for (const f of tri) { const [a, b, c] = f.map(k => [all[k][0], y, all[k][1]]); quad(fasce, a, b, c, c, [0, ny, 0], [[a[0], a[2]], [b[0], b[2]], [c[0], c[2]], [c[0], c[2]]]); }
  };
  anello(0.3, H1 - 0.05, H1 + 0.3); anello(0.55, H, H + 0.42);
  // tetto piano 40 cm sotto il parapetto (si vede l'ombra del muretto), poi il volume della scala e le macchine (STIMA)
  const tri = THREE.ShapeUtils.triangulateShape(g.map(p => new THREE.Vector2(p[0], p[1])), []);
  for (const f of tri) { const [a, b, c] = f.map(k => [g[k][0], H + 0.04, g[k][1]]); quad(tetti, a, b, c, c, [0, 1, 0], [[a[0], a[2]], [b[0], b[2]], [c[0], c[2]], [c[0], c[2]]]); }
  for (let i = 0; i < g.length; i++) { const p = g[i], q = g[(i + 1) % g.length], L = Math.hypot(q[0] - p[0], q[1] - p[1]); if (L < 0.05) continue; const t = [(q[0] - p[0]) / L, (q[1] - p[1]) / L], n = [-t[1], 0, t[0]];
    quad(fasce, [p[0], H + 0.04, p[1]], [q[0], H + 0.04, q[1]], [q[0], H + 0.42, q[1]], [p[0], H + 0.42, p[1]], n, [[0, 0], [L, 0], [L, 0.4], [0, 0.4]]); }
  { const [cx, cz] = centro(g); let best = 0, ang = 0; for (let i = 0; i < g.length; i++) { const a = g[i], b = g[(i + 1) % g.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L > best) { best = L; ang = Math.atan2(b[1] - a[1], b[0] - a[0]); } }
    const box = (w, h, d, ox, oz) => { const x = cx + Math.cos(ang) * ox - Math.sin(ang) * oz, z = cz + Math.sin(ang) * ox + Math.cos(ang) * oz; if (!dentro([x, z], g)) return; const pos = scatola(w, h, d, x, H + 0.04, z, -ang); const P2 = pos.attributes.position, N2 = pos.attributes.normal, U2 = pos.attributes.uv;
      for (let k = 0; k < P2.count; k += 3) quad(fasce, [P2.getX(k), P2.getY(k), P2.getZ(k)], [P2.getX(k + 1), P2.getY(k + 1), P2.getZ(k + 1)], [P2.getX(k + 2), P2.getY(k + 2), P2.getZ(k + 2)], [P2.getX(k + 2), P2.getY(k + 2), P2.getZ(k + 2)], [N2.getX(k), N2.getY(k), N2.getZ(k)], [[U2.getX(k), U2.getY(k)], [U2.getX(k + 1), U2.getY(k + 1)], [U2.getX(k + 2), U2.getY(k + 2)], [U2.getX(k + 2), U2.getY(k + 2)]]); };
    box(4.2, 2.9, 3.6, (R() - 0.5) * 4, (R() - 0.5) * 3); box(1.1, 0.9, 0.8, 5 + R() * 2, 3); box(1.1, 0.9, 0.8, 5 + R() * 2, 4.4); }
  const toGeo = list => { if (!list.length) return null; const pos = [], nn = [], uv = []; for (const q of list) { pos.push(...q.pos); nn.push(...q.nn); uv.push(...q.uv); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nn, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('aVid', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3).fill(vid), 1)); return geo; };
  return { muri: toGeo(muri), vetri: toGeo(vetri), fasce: toGeo(fasce), tetti: toGeo(tetti) };
}
function edificioSemplice(g0, vid, h) {   // capannoni e palazzine fuori dai quartieri: muri e tetto piano
  let g = g0.slice(); if (areaPol(g) < 0) g.reverse(); const pos = [], nn = [], uv = []; let u = 0;
  for (let i = 0; i < g.length; i++) { const p = g[i], q = g[(i + 1) % g.length], L = Math.hypot(q[0] - p[0], q[1] - p[1]); if (L < 0.05) continue; const n = [(q[1] - p[1]) / L, 0, -(q[0] - p[0]) / L];
    pos.push(p[0], 0, p[1], q[0], h, q[1], q[0], 0, q[1], p[0], 0, p[1], p[0], h, p[1], q[0], h, q[1]); uv.push(u, 0, u + L, h, u + L, 0, u, 0, u, h, u + L, h); for (let k = 0; k < 6; k++) nn.push(...n); u += L; }
  const tri = THREE.ShapeUtils.triangulateShape(g.map(p => new THREE.Vector2(p[0], p[1])), []);
  for (const f of tri) { const [a, b, c] = f.map(k => g[k]); const cr = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); const T = cr < 0 ? [a, b, c] : [a, c, b]; for (const p of T) { pos.push(p[0], h, p[1]); nn.push(0, 1, 0); uv.push(p[0], p[1]); } }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nn, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('aVid', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3).fill(vid), 1)); return geo;
}

// ---------------- il terreno dipinto dai dati ----------------
const COL = { sabbia: '#d6bf96', base: '#d6bf96', prato: '#62893a', pratoGiardino: '#5f8a37', rough: '#7c9c42', fairway: '#5b9e36', green: '#6cbd48', tee: '#64ad40', bunker: '#efe3c4', acqua: '#2b6a80',
  asfalto: '#6f6c69', marciapiede: '#cdc3b1', cordolo: '#e9e3d7', terrazza: '#e6ddcc', vialetto: '#d4c9b5', piscina: '#38b4d4', bordoPiscina: '#efe9dc', aiuola: '#5d7f35' };
function dipingi(D, Z, px, X0) {
  const cv = document.createElement('canvas'); cv.width = cv.height = px; const c = cv.getContext('2d'), k = px / Z.size, x0 = Z.cx - Z.size / 2, z0 = Z.cz - Z.size / 2, R = rng(Z.seme || 7);
  const X = x => (x - x0) * k, Y = z => (z - z0) * k, m = v => Math.max(1, v * k);
  const via = (g, chiudi) => { c.beginPath(); g.forEach(([x, z], i) => i ? c.lineTo(X(x), Y(z)) : c.moveTo(X(x), Y(z))); if (chiudi) c.closePath(); };
  const visibile = g => g.some(([x, z]) => x > x0 - 200 && x < x0 + Z.size + 200 && z > z0 - 200 && z < z0 + Z.size + 200);
  // grana: macchie fini sempre alla stessa scala in metri, così i tre livelli combaciano
  const grana = document.createElement('canvas'); grana.width = grana.height = 256; { const gc = grana.getContext('2d'), Rg = rng(5); for (let i = 0; i < 2600; i++) { gc.fillStyle = Rg() < 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(60,40,20,0.10)'; gc.fillRect(Rg() * 256, Rg() * 256, 1 + Rg() * 3, 1 + Rg() * 3); } }
  const pat = c.createPattern(grana, 'repeat'), granaSu = (sc = 0.25) => { pat.setTransform(new DOMMatrix().translateSelf(-x0 * k % 256, -z0 * k % 256).scaleSelf(sc * k, sc * k)); c.fillStyle = pat; c.fill(); };
  c.fillStyle = COL.sabbia; c.fillRect(0, 0, px, px);
  // quartieri: base curata
  for (const q of D.comunita) if (visibile(q.g)) { via(q.g, true); c.fillStyle = COL.base; c.fill(); }
  // parchi e prati
  for (const v of D.verde) if (visibile(v.g)) { via(v.g, true); c.fillStyle = v.tipo === 'pitch' ? '#6d9b45' : COL.prato; c.fill(); }
  // golf: corridoio di rough attorno alle buche (45 m per lato, STIMA dove OSM non ha il fairway), poi fairway a strisce, green, tee, bunker
  c.lineCap = c.lineJoin = 'round';
  for (const b of D.buche) if (visibile(b.g)) { via(b.g); c.strokeStyle = COL.rough; c.lineWidth = m(150); c.stroke(); }   /* corridoio di gioco ±75 m (STIMA: fairway + rough di un campo da campionato) */
  for (const f of D.golf) if (f.tipo === 'rough' && visibile(f.g)) { via(f.g, true); c.fillStyle = COL.rough; c.fill(); }
  for (const f of D.golf) if (f.tipo === 'fairway' && visibile(f.g)) {
    via(f.g, true); c.fillStyle = COL.fairway; c.fill(); c.save(); via(f.g, true); c.clip();   // strisce del taglio larghe 7 m lungo l'asse del fairway
    const [cx, cz] = centro(f.g); let best = 0, ang = 0; for (let i = 0; i < f.g.length; i++) { const a = f.g[i], b = f.g[(i + 1) % f.g.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L > best) { best = L; ang = Math.atan2(b[1] - a[1], b[0] - a[0]); } }
    c.translate(X(cx), Y(cz)); c.rotate(ang); for (let s = -400; s < 400; s += 14) { c.fillStyle = (s / 14) % 2 ? 'rgba(255,255,255,0.07)' : 'rgba(0,40,0,0.06)'; c.fillRect(-2000, m(s), 4000, m(7)); } c.restore();
  }
  for (const t of ['tee', 'green']) for (const f of D.golf) if (f.tipo === t && visibile(f.g)) { via(f.g, true); c.fillStyle = COL[t]; c.fill(); }
  for (const f of D.golf) if (f.tipo === 'bunker' && visibile(f.g)) { via(f.g, true); c.fillStyle = COL.bunker; c.fill(); c.strokeStyle = 'rgba(120,110,80,0.35)'; c.lineWidth = m(0.4); c.stroke(); }
  for (const s of D.sabbia) if (visibile(s.g)) { via(s.g, true); c.fillStyle = s.tipo === 'sand' ? COL.bunker : '#a99a6a'; c.fill(); }
  for (const p of D.pedonali) if (visibile(p.g) && p.tipo !== 'cartpath' && D.comunita.some(q => dentro(centro(p.g), q.g))) { via(p.g); c.strokeStyle = COL.prato; c.lineWidth = m(26); c.stroke(); }
  // giardini delle ville: prato attorno alla casa, terrazza, vialetto verso la strada, piscina sul retro
  for (const v of X0.ville) if (visibile(v.g)) {
    via(v.g, true); c.strokeStyle = COL.pratoGiardino; c.lineWidth = m(26); c.stroke(); c.fillStyle = COL.pratoGiardino; c.fill();
    if (k > 1.5) { const Rv = rng(v.vid); for (let q = 0; q < 6; q++) { const r = 2 + Rv() * 3, a2 = Rv() * 6.28, d2 = 9 + Rv() * 6; c.fillStyle = 'rgba(40,70,25,0.35)'; c.beginPath(); c.arc(X(v.c[0] + Math.cos(a2) * d2 * 1.6), Y(v.c[1] + Math.sin(a2) * d2 * 1.6), m(r), 0, 7); c.fill(); } }
    if (v.id !== X0.libero) { via(v.g, true); c.strokeStyle = COL.terrazza; c.lineWidth = m(4.4); c.stroke(); }
    if (v.strada) { const [cx, cz] = v.c, s = v.strada; c.strokeStyle = COL.vialetto; c.lineWidth = m(5.5); c.lineCap = 'butt'; c.beginPath(); c.moveTo(X(cx), Y(cz)); c.lineTo(X(s.x), Y(s.z)); c.stroke(); c.lineCap = 'round'; }
    if (v.piscina && v.id !== X0.libero) { const p = v.piscina; c.save(); c.translate(X(p.x), Y(p.z)); c.rotate(p.ang); c.fillStyle = COL.bordoPiscina; c.fillRect(-m(p.l / 2 + 1.2), -m(p.w / 2 + 1.2), m(p.l + 2.4), m(p.w + 2.4)); c.fillStyle = COL.piscina; c.fillRect(-m(p.l / 2), -m(p.w / 2), m(p.l), m(p.w)); c.restore(); }
  }
  // strade: marciapiede (o banchina verde sulle strade grandi), asfalto, strisce
  const ordine = ['service', 'living_street', 'residential', 'unclassified', 'tertiary_link', 'tertiary', 'secondary_link', 'secondary', 'primary', 'trunk', 'motorway_link', 'motorway'];
  const strade = D.strade.filter(s => visibile(s.g)).sort((a, b) => ordine.indexOf(a.tipo) - ordine.indexOf(b.tipo));
  for (const s of strade) { via(s.g); if (s.l >= 13) { c.strokeStyle = COL.prato; c.lineWidth = m(s.l + 14); } else { c.strokeStyle = COL.prato; c.lineWidth = m(s.l + 4.4); } c.stroke(); }
  for (const v of X0.ville) if (v.cancello && visibile(v.g)) { const g = v.cancello; c.save(); c.translate(X(g.x - g.n[0] * 1.2), Y(g.z - g.n[1] * 1.2)); c.rotate(Math.atan2(g.t[1], g.t[0])); c.fillStyle = '#c9b9a8'; c.fillRect(-m(3), -m(2.4), m(6), m(4.8)); c.restore(); }   /* apron del cancello in blocchetti (STIMA 5-6 m) */
  for (const s of strade) { via(s.g); c.strokeStyle = COL.cordolo; c.lineWidth = m(s.l + 0.6); c.stroke(); }
  for (const s of strade) { via(s.g); c.strokeStyle = COL.asfalto; c.lineWidth = m(s.l); c.stroke(); }
  if (k > 0.5) for (const s of strade) if (s.l >= 13) { via(s.g); c.setLineDash([m(3), m(6)]); c.strokeStyle = 'rgba(240,240,235,0.8)'; c.lineWidth = m(0.15); c.stroke(); c.setLineDash([]); }
  c.lineCap = 'round';
  for (const p of D.pedonali) if (visibile(p.g) && p.tipo !== 'cartpath') { via(p.g); c.strokeStyle = '#d6ccb9'; c.lineWidth = m(2.2); c.stroke(); }
  for (const p of D.pedonali) if (visibile(p.g) && p.tipo === 'cartpath') { via(p.g); c.strokeStyle = '#cfc8b8'; c.lineWidth = m(2.6); c.stroke(); }
  // acqua (sotto lo specchio 3D) con la riva
  for (const a of D.acqua) if (visibile(a.g)) { via(a.g, true); c.strokeStyle = '#8f8a6a'; c.lineWidth = m(2.5); c.stroke(); c.fillStyle = COL.acqua; c.fill(); }
  // alberi lontani dipinti (dove non ci sono quelli 3D)
  for (const [x, z, r] of X0.alberiDipinti) { if (x < x0 || x > x0 + Z.size || z < z0 || z > z0 + Z.size) continue; c.fillStyle = 'rgba(40,62,26,0.85)'; c.beginPath(); c.arc(X(x), Y(z), m(r), 0, 7); c.fill(); c.fillStyle = 'rgba(110,140,60,0.5)'; c.beginPath(); c.arc(X(x - r * 0.25), Y(z - r * 0.25), m(r * 0.55), 0, 7); c.fill(); }
  const t = new THREE.CanvasTexture(cv); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t;
}
function terreno(D, X0, zone) {   // un solo piano grande: lo shader prende il livello più fine che copre il punto (con dissolvenza ai bordi)
  const texs = zone.map((Z, i) => dipingi(D, Z, Z.px || 4096, X0));
  const grano = canvasTex(512, 512, (c, w, h) => { const Rg = rng(8); c.fillStyle = '#808080'; c.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { const v = 128 + (Rg() - 0.5) * 70; c.fillStyle = `rgba(${v},${v},${v},0.35)`; c.beginPath(); c.arc(Rg() * w, Rg() * h, 6 + Rg() * 30, 0, 7); c.fill(); } for (let i = 0; i < 40000; i++) { const v = 128 + (Rg() - 0.5) * 90; c.fillStyle = `rgb(${v},${v},${v})`; c.fillRect(Rg() * w, Rg() * h, 1 + Rg() * 2, 1 + Rg() * 2); } }, { srgb: false });
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.93, metalness: 0, map: texs[0] }); mat.userData.uBuco = { value: new THREE.Vector4(0, 0, 0, 0) }; mat.userData.uBucoA = { value: 0 }; mat.userData.texs = texs; mat.userData.zone = zone;   /* per l'esportazione verso Blender */
  mat.onBeforeCompile = sh => {
    sh.uniforms.tZ1 = { value: texs[1] }; sh.uniforms.tZ2 = { value: texs[2] }; sh.uniforms.tGrano = { value: grano };
    zone.forEach((Z, i) => { sh.uniforms['rZ' + i] = { value: new THREE.Vector4(Z.cx - Z.size / 2, Z.cz - Z.size / 2, Z.size, 0) }; });
    sh.uniforms.cSabbia = { value: new THREE.Color(COL.sabbia) }; sh.uniforms.uBuco = mat.userData.uBuco; sh.uniforms.uBucoA = mat.userData.uBucoA;
    sh.vertexShader = 'varying vec3 vWp;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n  vWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = 'uniform sampler2D tZ1, tZ2, tGrano; uniform vec4 rZ0, rZ1, rZ2, uBuco; uniform float uBucoA; uniform vec3 cSabbia; varying vec3 vWp;\n' +
      'float bordo(vec2 uv, float f){ vec2 e = min(uv, 1.0 - uv); return smoothstep(0.0, f, min(e.x, e.y)); }\n' + sh.fragmentShader.replace('#include <map_fragment>', `
  { vec2 q = vWp.xz - uBuco.xy; vec2 r = vec2(cos(uBucoA) * q.x + sin(uBucoA) * q.y, -sin(uBucoA) * q.x + cos(uBucoA) * q.y); if (abs(r.x) < uBuco.z && abs(r.y) < uBuco.w) discard; }
  vec2 u0 = (vWp.xz - rZ0.xy) / rZ0.z, u1 = (vWp.xz - rZ1.xy) / rZ1.z, u2 = (vWp.xz - rZ2.xy) / rZ2.z;
  vec3 col = cSabbia; float in0 = bordo(u0, 0.01);
  if (in0 > 0.0) col = mix(cSabbia, texture2D(map, u0).rgb, in0);
  float b1 = bordo(u1, 0.04); if (b1 > 0.0) col = mix(col, texture2D(tZ1, u1).rgb, b1);
  float b2 = bordo(u2, 0.06); if (b2 > 0.0) col = mix(col, texture2D(tZ2, u2).rgb, b2);
  float d = length(vWp - cameraPosition), gk = 1.0 - smoothstep(20.0, 160.0, d), gm = 1.0 - smoothstep(300.0, 2600.0, d);
  float gr = texture2D(tGrano, vWp.xz * 0.9).r * 0.6 + texture2D(tGrano, vWp.xz * 0.23).r * 0.4;
  float macchie = texture2D(tGrano, vWp.xz * 0.0021).r * 0.5 + texture2D(tGrano, vWp.xz * 0.011).r * 0.5;
  float verde = smoothstep(0.02, 0.12, col.g - max(col.r, col.b));
  col *= mix(1.0, 0.86 + macchie * 0.28, 0.85) * mix(1.0, 0.82 + gr * 0.36, gk);
  col = mix(col, col * vec3(1.06, 0.98, 0.9) * (0.9 + macchie * 0.2), verde * 0.6);
  diffuseColor.rgb *= col;`);
  };
  const g = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000), mat); g.rotation.x = -Math.PI / 2; g.receiveShadow = true; g.name = 'terreno'; return g;
}

// ---------------- il quartiere intero ----------------
export function quartiere(D, opz) {
  const G = new THREE.Group(); G.name = 'quartiere'; const R = rng(opz.seme || 3), P = opz;
  // strade come campioni (per vicinanza, palme, cordoli)
  for (const s of D.strade) { if (s.tipo === 'residential' || s.tipo === 'living_street') s.l = 6.5; if (s.tipo === 'service') s.l = 5; }   /* note strada 21/11: carreggiata STIMA 6,5 m */
  const SR = D.strade.filter(s => ['residential', 'service', 'unclassified', 'living_street', 'tertiary', 'tertiary_link'].includes(s.tipo));
  const griglia = new Map(), cella = 40, key = (x, z) => Math.floor(x / cella) + ',' + Math.floor(z / cella);
  for (const s of SR) for (const p of campiona(s.g, 3)) { const k = key(p.x, p.z); if (!griglia.has(k)) griglia.set(k, []); griglia.get(k).push({ ...p, s }); }
  const vicina = (x, z, rmax = 60) => { let best = null, bd = rmax; const i0 = Math.floor(x / cella), j0 = Math.floor(z / cella), rr = Math.ceil(rmax / cella);
    for (let i = i0 - rr; i <= i0 + rr; i++) for (let j = j0 - rr; j <= j0 + rr; j++) for (const p of griglia.get(i + ',' + j) || []) { const d = Math.hypot(p.x - x, p.z - z) - p.s.l / 2; if (d < bd) { bd = d; best = p; } } return best ? { ...best, d: bd } : null; };
  // ville: edifici dentro i quartieri con una sagoma da villa (150-950 m²); gli altri sono edifici semplici
  const ville = [], altri = [];
  D.edifici.forEach((b, i) => { b.vid = i + 1; const c = centro(b.g); b.c = c;
    if (b.com && b.a > 120 && b.a < 1000) { const v = { ...b }; const s = vicina(c[0], c[1], 70);
      if (s) { const nx = c[0] - s.x, nz = c[1] - s.z, l = Math.hypot(nx, nz) || 1; v.n = [nx / l, nz / l]; v.strada = { x: s.x + v.n[0] * (s.s.l / 2 + 2.3), z: s.z + v.n[1] * (s.s.l / 2 + 2.3), dx: s.dx, dz: s.dz, w: s.s.l, id: s.s.id };
        // piscina sul retro: dietro la casa (lontano dalla strada), lungo il lato più lungo (STIMA: 11 × 4,2 m, come le ville di Golf Place)
        let best = 0, ang = 0; for (let k2 = 0; k2 < b.g.length; k2++) { const a = b.g[k2], q = b.g[(k2 + 1) % b.g.length], L = Math.hypot(q[0] - a[0], q[1] - a[1]); if (L > best) { best = L; ang = Math.atan2(q[1] - a[1], q[0] - a[0]); } }
        let retro = 0; for (const p of b.g) retro = Math.max(retro, (p[0] - c[0]) * v.n[0] + (p[1] - c[1]) * v.n[1]);   // il retro è dalla parte opposta alla strada
        const tA = [Math.cos(ang), Math.sin(ang)], allineato = Math.abs(tA[0] * v.n[0] + tA[1] * v.n[1]) < 0.7 ? ang : ang + Math.PI / 2;
        v.retro = retro; v.piscina = { x: c[0] + v.n[0] * (retro + 5.2), z: c[1] + v.n[1] * (retro + 5.2), ang: allineato, l: 11, w: 4.2 }; }
      ville.push(v); } else altri.push(b); });
  const perId = new Map(ville.map(v => [v.id, v])), perIdL = perId;
  const caso = n => { const h = Math.sin(n * 127.1 + 311.7) * 43758.5453; return h - Math.floor(h); };   /* numero fisso per villa (il rng con semi piccoli dava sempre lo stesso) */
  const accese = ville.filter(v => v.id !== opz.libero && caso(v.vid) < 0.35);   /* golden hour: in una villa su tre (circa) le luci sono già accese (STIMA) */
  // stato per villa: riga 0 tinta (rgb + quanto), riga 1 luce dentro (rgb + quanto)
  const NV = D.edifici.length + 2, dati = new Float32Array(NV * 2 * 4), tex = new THREE.DataTexture(dati, NV, 2, THREE.RGBAFormat, THREE.FloatType); tex.needsUpdate = true;
  const stato = { tex, dati, N: NV, tinta(vid, col, a) { const c = new THREE.Color(col).convertSRGBToLinear(); dati.set([c.r, c.g, c.b, a], vid * 4); tex.needsUpdate = true; },
    luce(vid, col, a) { const c = new THREE.Color(col); dati.set([c.r, c.g, c.b, a], (NV + vid) * 4); tex.needsUpdate = true; }, pulisci() { dati.fill(0); tex.needsUpdate = true; } };
  // geometrie delle ville (unite in pochi pezzi)
  const muri = [], vetri = [], fasce = [], tetti = [], semplici = [];
  for (const v of ville) { if (v.id === opz.libero) continue;   /* la villa scelta la fa il kit villa (villa-b2.js) */
    const h = 7.4 + (R() - 0.5) * 0.6, r = villa(v.g, v.vid, R, P, { h, vetroPT: lerp(0.6, 0.85, R()), vetroP1: lerp(0.4, 0.7, R()) }); if (r.muri) muri.push(r.muri); if (r.vetri) vetri.push(r.vetri); if (r.fasce) fasce.push(r.fasce); if (r.tetti) tetti.push(r.tetti); v.h = h; }
  for (const b of altri) { const lv = +b.piani || 0, h = lv ? lv * 3.3 : b.tipo === 'apartments' ? 22 : b.a > 1500 ? 10 : b.a < 60 ? 3 : 7; semplici.push(edificioSemplice(b.g, b.vid, h)); }
  const unisciA = list => { const g = unisci(list.map(x => { const y = x.clone(); return y; })); const n = list.reduce((s, x) => s + x.attributes.position.count, 0), a = new Float32Array(n); let o = 0; for (const x of list) { a.set(x.attributes.aVid.array, o); o += x.attributes.aVid.count; } g.setAttribute('aVid', new THREE.BufferAttribute(a, 1)); return g; };
  const mMuri = conStato(new THREE.MeshStandardMaterial({ map: texIntonaco(), color: '#f6f1e8', roughness: 0.82 }), tex, 0.0, 0.0, false);   /* la tinta X1 va solo sui tetti: i muri restano veri */
  const mFasce = conStato(new THREE.MeshStandardMaterial({ map: texIntonaco(6), color: '#e9e2d6', roughness: 0.75 }), tex, 0.0);
  const mVetri = conStato(new THREE.MeshStandardMaterial({ map: texVetro(), color: '#c9d3da', roughness: 0.05, metalness: 0.7, envMapIntensity: 1.6, emissive: '#ffffff', emissiveIntensity: 1, emissiveMap: texLuceDentro() }), tex, 3.2, 0.08);
  mVetri.emissive.set('#000000');   // la luce dentro arriva solo dallo stato (lanterna)
  const mSemp = conStato(new THREE.MeshStandardMaterial({ map: texIntonaco(9), color: '#d9d0c0', roughness: 0.9 }), tex, 0.0);
  const mTetti = conStato(new THREE.MeshStandardMaterial({ map: texIntonaco(12), color: '#c9c4ba', roughness: 0.95 }), tex, 0.0); mTetti.name = 'tetto_villa'; mMuri.name = 'intonaco_villa'; mFasce.name = 'fasce_villa'; mVetri.name = 'vetro_villa'; mSemp.name = 'edifici';
  for (const v of accese) stato.luce(v.vid, '#ffcf96', 0.18 + caso(v.vid * 7.3) * 0.3);
  for (const [list, mat, nome] of [[muri, mMuri, 'ville-muri'], [fasce, mFasce, 'ville-fasce'], [tetti, mTetti, 'ville-tetti'], [vetri, mVetri, 'ville-vetri'], [semplici, mSemp, 'edifici']]) {
    if (!list.length) continue; const m = new THREE.Mesh(unisciA(list), mat); m.castShadow = true; m.receiveShadow = true; m.name = nome; G.add(m); }
  // giardini: siepi sul fronte, cancelli e pilastri, siepi sui lati (solo nella zona del quartiere: da lontano bastano i colori del terreno)
  const ZQ = opz.zone[1], inZQ = (x, z, m = 0) => Math.abs(x - ZQ.cx) < ZQ.size / 2 - m && Math.abs(z - ZQ.cz) < ZQ.size / 2 - m;
  const siepi = [], pietre = [], cancelli = [], palmeL = [], alberiL = [], lampioni = [];
  const libero = opz.libero || null;   /* zona senza lampioni e alberi davanti alla villa scelta */
  for (const v of ville) { if (!v.strada || !inZQ(v.c[0], v.c[1])) continue; if (Math.hypot(v.strada.x - v.c[0], v.strada.z - v.c[1]) > 34) continue;   /* la casa deve dare sulla strada */
    const s = v.strada, t = [s.dx, s.dz], n = v.n; let a0 = 1e9, a1 = -1e9, fondo = 0; for (const p of v.g) { const pr = (p[0] - s.x) * t[0] + (p[1] - s.z) * t[1]; a0 = Math.min(a0, pr); a1 = Math.max(a1, pr); fondo = Math.max(fondo, (p[0] - s.x) * n[0] + (p[1] - s.z) * n[1]); }
    a0 -= 3.2; a1 += 3.2; const yaw = -Math.atan2(t[1], t[0]), mid = (a0 + a1) / 2, gate = (() => { const pr = (v.c[0] - s.x) * t[0] + (v.c[1] - s.z) * t[1]; return clamp(pr, a0 + 4, a1 - 4); })();
    v.cancello = { x: s.x + t[0] * gate + n[0] * 0.4, z: s.z + t[1] * gate + n[1] * 0.4, t, n, yaw };
    const muretto = (b0, b1) => { if (b1 - b0 < 0.4) return; const L = b1 - b0, m2 = (b0 + b1) / 2, x = s.x + t[0] * m2 + n[0] * 0.4, z = s.z + t[1] * m2 + n[1] * 0.4;
      pietre.push(scatola(L, 1.25, 0.4, x + n[0] * 0.6, 0, z + n[1] * 0.6, yaw)); siepi.push(scatola(L, 0.75, 0.7, x - n[0] * 0.15, 0, z - n[1] * 0.15, yaw)); };   /* brochure Golf Place p.5-8: muretto basso in pietra beige (STIMA 1,2-1,5 m) e siepe bassa davanti */
    muretto(a0, gate - 2.9); muretto(gate + 2.9, a1);
    for (const e of [gate - 2.9, gate + 2.9]) pietre.push(scatola(0.6, 1.7, 0.6, s.x + t[0] * e + n[0] * 1.0, 0, s.z + t[1] * e + n[1] * 1.0, yaw));
    cancelli.push(scatola(1.3, 1.25, 0.05, s.x + t[0] * (gate + 4.6) + n[0] * 0.8, 0.05, s.z + t[1] * (gate + 4.6) + n[1] * 0.8, yaw));   /* cancelletto pedonale metallico; l'ingresso auto resta aperto */
    if (fondo < 48) for (const e of [a0, a1]) { const L = Math.min(fondo + 4, 42), x = s.x + t[0] * e + n[0] * (0.4 + L / 2), z = s.z + t[1] * e + n[1] * (0.4 + L / 2); siepi.push(scatola(0.8, 1.9, L, x, 0, z, yaw)); }
    // una o due palme nel giardino davanti e alberi dietro (STIMA)
    if (v.id !== libero) { const e = lerp(a0 + 3, gate - 5, R()); alberiL.push([s.x + t[0] * e - n[0] * 0.2, s.z + t[1] * e - n[1] * 0.2, 0.9 + R() * 0.25]); }   /* un albero ombroso per lotto (STIMA note strada) */
    if (v.id === libero) { for (const sg of [-1, 1]) palmeL.push([s.x + t[0] * (gate + sg * 6.5) + n[0] * 3.2, s.z + t[1] * (gate + sg * 6.5) + n[1] * 3.2, 6.2, 1.0]); }   /* la 27: due palme gemelle ai lati dell'ingresso */
    else { const e = lerp(gate + 6, a1 - 2, R()); palmeL.push([s.x + t[0] * e + n[0] * 3.5, s.z + t[1] * e + n[1] * 3.5, 5 + R() * 2.5, 0.9 + R() * 0.15]);
      if (R() < 0.5) { const e2 = R() < 0.5 ? lerp(a0 + 2, gate - 4.5, R()) : lerp(gate + 4.5, a1 - 2, R()); palmeL.push([s.x + t[0] * e2 + n[0] * 5.5, s.z + t[1] * e2 + n[1] * 5.5, 4.5 + R() * 2.5, 0.85 + R() * 0.2]); } }
    for (let q = 0; q < 2; q++) { const tt = (q ? 1 : -1) * (7 + R() * 6); alberiL.push([s.x + n[0] * (fondo + 6 + R() * 6) + t[0] * (gate + tt), s.z + n[1] * (fondo + 6 + R() * 6) + t[1] * (gate + tt), 0.75 + R() * 0.35]); }
    if (R() < 0.5) { const tt = (R() < 0.5 ? -1 : 1) * (6 + R() * 5); palmeL.push([s.x + n[0] * (fondo + 4) + t[0] * (gate + tt), s.z + n[1] * (fondo + 4) + t[1] * (gate + tt), 5 + R() * 3, 0.9]); }
    if (R() < 0.6) { const tt = (R() < 0.5 ? -1 : 1) * (6 + R() * 5); alberiL.push([s.x + n[0] * (fondo + 9) + t[0] * (gate + tt), s.z + n[1] * (fondo + 9) + t[1] * (gate + tt), 0.7 + R() * 0.3]); }
  }
  const cor = opz.corridoio, inCor = (x, z) => { if (!cor) return false; const dx = x - cor.x, dz = z - cor.z, d = Math.hypot(dx, dz); if (d > cor.L || d < 1) return false; return (dx * cor.dx + dz * cor.dz) / d > Math.cos(cor.ang); };   /* vista libera dalla piscina della villa scelta verso il Burj (Golf Place Vistas: «uninterrupted views», brochure) */
  // palme lungo i viali (banchina, ogni 11 m sui due lati) e lampioni ogni 28 m
  for (const s of SR) { const cs = campiona(s.g, 11); if (!cs.some(p => inZQ(p.x, p.z))) continue;
    const cs2 = campiona(s.g, 14);
    cs2.forEach((p, i) => { if (!inZQ(p.x, p.z, 20) || s.tipo === 'service') return; const off = s.l / 2 + 1.4; for (const sg of [-1, 1]) { const x = p.x + -p.dz * off * sg, z = p.z + p.dx * off * sg;
      const v = vicina(x, z, 6); if (v && v.d < 0.5) continue; if (inCor(x, z)) continue;
      let dmin = 1e9; for (const w of ville) if (w.cancello) dmin = Math.min(dmin, Math.hypot(w.cancello.x - x, w.cancello.z - z));
      if (dmin < 7 || dmin > 45) continue; palmeL.push([x, z, 5.5 + R() * 2.2, 0.95 + R() * 0.15]); } });   /* palme sui viali solo dove ci sono ville (non sulle strade dei lotti vuoti) */
    cs.forEach((p, i) => { if (!inZQ(p.x, p.z, 20) || s.tipo === 'service' || i % 3) return; const sg = 1; const x = p.x + -p.dz * (s.l / 2 + 0.7) * sg, z = p.z + p.dx * (s.l / 2 + 0.7) * sg; const v = vicina(x, z, 6); if (v && v.d < 0.3) return;
      if (inCor(x, z)) return;
      if (libero && perIdL.get(libero) && perIdL.get(libero).cancello && Math.hypot(perIdL.get(libero).cancello.x - x, perIdL.get(libero).cancello.z - z) < 24) return;
      lampioni.push([x, z, Math.atan2(p.dx * sg, p.dz * sg)]); }); }   /* un lampione ogni ~33 m su un lato (note strada: 25-35 m) */
  // alberi del golf: lungo il bordo del corridoio delle buche (STIMA)
  const alberiLontani = [];
  for (const b of D.buche) { const cs = campiona(b.g, 18); cs.forEach(p => { for (const sg of [-1, 1]) { if (R() < 0.72) continue; const off = 34 + R() * 14, x = p.x - p.dz * off * sg, z = p.z + p.dx * off * sg; if (inCor(x, z)) continue; (inZQ(x, z) ? (R() < 0.5 ? palmeL.push([x, z, 6 + R() * 3, 1]) : alberiL.push([x, z, 0.9 + R() * 0.4])) : alberiLontani.push([x, z, 3.5])); } }); }
  // alberi lontani dipinti lungo i viali fuori dalla zona del quartiere
  for (const s of SR) { const cs = campiona(s.g, 12); for (const p of cs) { if (inZQ(p.x, p.z)) continue; for (const sg of [-1, 1]) if (R() < 0.7) alberiLontani.push([p.x - p.dz * (s.l / 2 + 1.5) * sg, p.z + p.dx * (s.l / 2 + 1.5) * sg, 2.6]); } }
  const X0 = { ville, alberiDipinti: alberiLontani, libero: opz.libero };
  const TER = terreno(D, X0, opz.zone); G.add(TER);
  // siepi, muretti, pilastri, cancelli
  const add = (list, mat, nome, ombra = true) => { if (!list.length) return; mat.name = mat.name || nome; const m = new THREE.Mesh(unisci(list), mat); m.castShadow = ombra; m.receiveShadow = true; m.name = nome; G.add(m); return m; };
  add(siepi, new THREE.MeshStandardMaterial({ map: texSiepe(), roughness: 0.92 }), 'siepi');
  add(pietre, new THREE.MeshStandardMaterial({ map: texPietra(), roughness: 0.7 }), 'muretti');
  add(cancelli, new THREE.MeshStandardMaterial({ map: texCancello(), roughness: 0.45, metalness: 0.35 }), 'cancelli');
  G.add(palme(palmeL, { seme: 5 })); G.add(alberi(alberiL));
  // lampioni: palo sottile antracite 6 m con la testa lunga (luce calda quando cala il sole)
  if (lampioni.length) { const pali = [], teste = []; for (const [x, z, a] of lampioni) { pali.push(scatola(0.13, 7, 0.13, x, 0, z, a)); pali.push(scatola(1.7, 0.08, 0.08, x + Math.cos(a) * 0.85, 6.85, z - Math.sin(a) * 0.85, a)); teste.push(scatola(0.55, 0.1, 0.2, x + Math.cos(a) * 1.65, 6.78, z - Math.sin(a) * 1.65, a)); }   /* palo sottile 7 m col braccio (note strada: 6-8 m) */
    add(pali, new THREE.MeshStandardMaterial({ color: '#2a2b2d', roughness: 0.5, metalness: 0.6 }), 'lampioni');
    const mL = new THREE.MeshStandardMaterial({ color: '#2a2b2d', emissive: '#ffd39a', emissiveIntensity: 0 }); mL.userData.notte = 2.5; mL.userData.minimo = 0.6; add(teste, mL, 'lampade', false); }
  // laghi: specchio scuro che riflette il cielo, appena sotto il bordo
  const mAcqua = new THREE.MeshStandardMaterial({ color: '#2a6b80', roughness: 0.07, metalness: 0.35, envMapIntensity: 1.3 }); mAcqua.name = 'lago';
  for (const a of D.acqua) { const sh = new THREE.Shape(a.g.map(p => new THREE.Vector2(p[0], -p[1]))); const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), mAcqua); m.rotation.x = -Math.PI / 2; m.position.y = 0.06; m.receiveShadow = true; m.name = 'lago'; G.add(m); }
  // cordoli 3D lungo le strade del dettaglio (15 cm, si vedono ad altezza occhi)
  const campS = new Map(); const vicinaA = (o, x, z) => { if (!campS.has(o)) campS.set(o, campiona(o.g, 1.5)); let b = 1e9; for (const p of campS.get(o)) { const d = Math.abs(p.x - x) + Math.abs(p.z - z); if (d < b * 1.5) b = Math.min(b, Math.hypot(p.x - x, p.z - z)); } return b; };
  const Z2 = opz.zone[2], cord = [];
  for (const s of SR) { const cs = campiona(s.g, 2); for (let i = 0; i < cs.length - 1; i++) { const p = cs[i], q = cs[i + 1]; if (Math.abs(p.x - Z2.cx) > Z2.size / 2 || Math.abs(p.z - Z2.cz) > Z2.size / 2) continue;
    const L = Math.hypot(q.x - p.x, q.z - p.z); if (L < 0.2) continue; const yaw = -Math.atan2(q.z - p.z, q.x - p.x); for (const sg of [-1, 1]) { const off = s.l / 2 + 0.12, cx = (p.x + q.x) / 2 - p.dz * off * sg, cz = (p.z + q.z) / 2 + p.dx * off * sg;
      let fuori = true; for (const o of SR) { if (o === s) continue; const w = vicinaA(o, cx, cz); if (w < o.l / 2 + 0.4) { fuori = false; break; } } if (fuori) cord.push(scatola(L + 0.05, 0.15, 0.25, cx, 0, cz, yaw)); } } }
  add(cord, new THREE.MeshStandardMaterial({ color: '#e4ddd0', roughness: 0.7 }), 'cordoli', false);
  const buco = (cx, cz, hx, hz, ang) => { TER.material.userData.uBuco.value.set(cx, cz, hx, hz); TER.material.userData.uBucoA.value = ang; };   /* scavo nel terreno (la piscina vera della villa scelta) */
  return { gruppo: G, ville, perId, stato, vicina, strade: D.strade, comunita: D.comunita, mVetri, buco };
}
