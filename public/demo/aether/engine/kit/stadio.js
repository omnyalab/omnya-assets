// Motore choose-your · costruttore di stadi a catino (superellisse + anelli + skybox + tetto a cupola con oculo).
// Tutto in metri, origine al centro del campo, x = lato lungo del campo, y in alto.
import * as THREE from 'three';
import { tettoPetali } from './stadio-tetto.js';
import { sePoint, seNormal, seSample, atS, sweepProfile, canvasTex, rng, noise2, fbm, merge, lerp, clamp } from './forme.js';

// p = parametri del soggetto (vedi soggetti/stadio-2034.js)
export function stadio(p) {
  const R = rng(p.seme || 7), G = new THREE.Group(); G.name = 'stadio';
  const plan = d => ({ a: p.pianta.a + d, b: p.pianta.b + d, n: lerp(p.pianta.n0, p.pianta.n1, clamp(d / 80)) });
  const mat = {
    cemento: new THREE.MeshStandardMaterial({ color: p.colori.cemento, roughness: 0.92 }),
    fascia: new THREE.MeshStandardMaterial({ color: p.colori.fascia, roughness: 0.6, metalness: 0.1 }),
    vetro: new THREE.MeshStandardMaterial({ color: 0x1c2026, roughness: 0.08, metalness: 0.6, emissive: new THREE.Color(p.colori.luceCalda), emissiveIntensity: 0, emissiveMap: p.skybox ? skyboxTex() : null }),
    sedile: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 }),
    vip: new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.45 }),
  };
  mat.vetro.userData.notte = 1.4;   // luce dentro gli skybox nei look di sera
  if (p.skybox) { mat.vetro.emissiveIntensity = p.skybox.giorno ?? 0.9; mat.vetro.userData.notte = p.skybox.sera ?? 1.6; mat.vetro.userData.minimo = p.skybox.giorno ?? 0.9; }

  // ---------------- anelli: profilo a gradoni ----------------
  const tiers = []; let prof = [], d = 0, y = 0;
  const T = p.anelli;
  prof.push([-1.2, 0], [-1.2, T[0].y0 + 1.1], [-0.9, T[0].y0 + 1.1], [-0.9, T[0].y0]);
  for (let k = 0; k < T.length; k++) {
    const t = T[k], rows = [];
    if (k > 0) {   // fascia a sbalzo dell'anello sopra lo skybox
      const prev = tiers[k - 1], dB = prev.dEnd, yB = prev.yEnd;
      const so = p.soffitto ?? 2.6; prof.push([dB + 0.6, yB], [dB + t.box, yB], [dB + t.box, t.y0 - so], [t.d0 - 0.5, t.y0 - so], [t.d0 - 0.5, t.y0 + 1.05], [t.d0 - 0.2, t.y0 + 1.05], [t.d0 - 0.2, t.y0]);
      tiers[k - 1].vano = { d: dB + 1.6, y0: yB, y1: t.y0 - so };
    }
    d = t.d0; y = t.y0;
    // gradoni col metodo dei progettisti di stadi: ogni fila vede il punto di fuoco (linea laterale) sopra l'occhio di chi ha davanti di almeno C
    const EYE = 1.2, F = p.fuoco ?? -11, alz = []; { let yy = t.y0;
      for (let r = 0; r < t.file; r++) { if (r === 0) { alz.push(0); continue; } const xp = t.d0 + (r - 1) * t.prof + t.prof * 0.55, xe = xp + t.prof, need = (yy + EYE + (t.C ?? 0.09)) * (xe - F) / (xp - F) - EYE;
        const r0 = t.C != null ? Math.min(Math.max(need - yy, 0.2), t.prof * Math.tan((t.rakeMax ?? 35) * Math.PI / 180)) : t.alz; alz.push(r0); yy += r0; } }
    t.cvalori = []; { let yy = t.y0; for (let r = 1; r < t.file; r++) { const xp = t.d0 + (r - 1) * t.prof + t.prof * 0.55, xe = xp + t.prof, yp = yy + EYE; yy += alz[r]; t.cvalori.push(+(((yy + EYE) * (xp - F) / (xe - F) - yp) * 1000).toFixed(0)); } }
    for (let r = 0; r < t.file; r++) { if (r) { prof.push([d, y + alz[r]]); y += alz[r]; } rows.push({ d: d + t.prof * 0.55, y }); prof.push([d, y], [d + t.prof, y]); d += t.prof; }
    tiers.push({ ...t, rows, dEnd: d, yEnd: y, cvalori: t.cvalori });
  }
  const last = tiers[tiers.length - 1];
  prof.push([last.dEnd + 0.4, last.yEnd], [last.dEnd + 0.4, last.yEnd + 1.2], [last.dEnd + 7, last.yEnd + 1.2], [last.dEnd + 7, 0]);
  const bowl = new THREE.Mesh(sweepProfile(prof, plan, 960, 6), mat.cemento); bowl.receiveShadow = bowl.castShadow = true; G.add(bowl);
  // fasce chiare sul bordo degli anelli 2 e 3 (si vedono da lontano)
  for (let k = 1; k < tiers.length; k++) {
    const t = tiers[k], f = new THREE.Mesh(sweepProfile([[t.d0 - 0.52, t.y0 - (p.soffitto ?? 2.6)], [t.d0 - 0.52, t.y0 + 1.07]], plan, 960), mat.fascia); f.receiveShadow = true; G.add(f);
  }
  // vetri degli skybox (con la luce dentro di sera)
  for (const t of tiers) if (t.vano) { const hv = t.vano.y1 - t.vano.y0 - 0.1, g = new THREE.Mesh(sweepProfile([[t.vano.d, t.vano.y0 + 0.05], [t.vano.d, t.vano.y1 - 0.05]], plan, 1440, hv), mat.vetro); g.name = 'skybox-vetri'; G.add(g); }

  // ---------------- corridoi e blocchi ----------------
  // i corridoi stanno a t fissi per anello (presi a passo regolare sulla prima fila) così salgono dritti
  const seats = { x: [], y: [], z: [], yaw: [], blk: [], row: [], num: [] }, blocks = [], zones = p.zone.map((z, i) => ({ ...z, i, blocks: [] }));
  const zoneOf = t => { let a = ((t * 180 / Math.PI) % 360 + 360) % 360; for (const z of zones) { const [a0, a1] = z.arco; if (a0 < a1 ? a >= a0 && a < a1 : a >= a0 || a < a1) return z.i; } return 0; };
  tiers.forEach((t, k) => {
    const P0 = seSample(plan(t.rows[0].d).a, plan(t.rows[0].d).b, plan(t.rows[0].d).n, 2880), nA = Math.round(P0.len / t.passoCorridoi);
    // primo corridoio centrato sul lato ovest (t = 270°, z-) così i blocchi partono dal centro della tribuna reale
    const s0 = P0.len * 0.75, aisleT = [];
    for (let i = 0; i < nA; i++) aisleT.push(atS(P0, s0 + i * P0.len / nA).t);
    for (let i = 0; i < nA; i++) {
      let t0 = aisleT[i], t1 = aisleT[(i + 1) % nA]; if (t1 < t0) t1 += Math.PI * 2;
      const zone = zoneOf((t0 + t1) / 2), id = (k + 1) * 100 + i + 1;
      const B = { id, nome: `Block ${id}`, anello: k, zona: zone, t0, t1, s0: seats.x.length, file: t.file, righe: [] };
      t.rows.forEach((r, ri) => {
        const pl = plan(r.d), P = seSample(pl.a, pl.b, pl.n, 2880), sA = sAtT(P, t0), sB0 = sAtT(P, t1 % (Math.PI * 2)), sB = sB0 < sA ? sB0 + P.len : sB0;
        const gap = 0.65, L = sB - sA - 2 * gap, n = Math.max(0, Math.floor(L / p.larghezzaPosto)), off = sA + gap + (L - n * p.larghezzaPosto) / 2 + p.larghezzaPosto / 2;
        B.righe.push({ s0: seats.x.length, n });
        for (let j = 0; j < n; j++) {
          const q = atS(P, off + j * p.larghezzaPosto);
          seats.x.push(q.x); seats.y.push(r.y); seats.z.push(q.z); seats.yaw.push(Math.atan2(-q.nx, -q.nz)); seats.blk.push(blocks.length); seats.row.push(ri + 1); seats.num.push(j + 1);
        }
      });
      B.s1 = seats.x.length; if (B.s1 > B.s0) { blocks.push(B); zones[zone].blocks.push(B); }
    }
  });
  function sAtT(P, t) { let lo = 0, hi = P.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (P[m].t < t) lo = m; else hi = m; } const A = P[lo], Bp = P[hi]; return lerp(A.s, Bp.s, (t - A.t) / ((Bp.t - A.t) || 1)); }

  // seggiolini: un solo InstancedMesh, colore per istanza (così si accendono zone, blocchi e posti)
  const N = seats.x.length, sg = seatGeo(), inst = new THREE.InstancedMesh(sg, mat.sedile, N); inst.name = 'posti';
  const M4 = new THREE.Matrix4(), Q4 = new THREE.Quaternion(), E = new THREE.Euler(), S1 = new THREE.Vector3(1, 1, 1), V3 = new THREE.Vector3();
  const base = new Float32Array(N * 3), cA = new THREE.Color(), cB = new THREE.Color();
  for (let i = 0; i < N; i++) {
    E.set(0, seats.yaw[i], 0); Q4.setFromEuler(E); V3.set(seats.x[i], seats.y[i], seats.z[i]); M4.compose(V3, Q4, S1); inst.setMatrixAt(i, M4);
    const pal = p.colori.posti, c = pal[Math.floor(R() * pal.length * 0.999)]; cA.set(c); cA.offsetHSL(0, 0, (R() - 0.5) * 0.04);
    base[i * 3] = cA.r; base[i * 3 + 1] = cA.g; base[i * 3 + 2] = cA.b;
  }
  inst.instanceColor = new THREE.InstancedBufferAttribute(base.slice(), 3); inst.receiveShadow = true; inst.castShadow = false; G.add(inst);

  // proxy per scegliere col mouse: una striscia per blocco, invisibile, con l'indice del blocco per ogni faccia
  const pxPos = [], pxIdx = [], faceBlk = [];
  blocks.forEach((B, bi) => {
    const t = tiers[B.anello], dA = t.rows[0].d - 0.6, dB = t.rows[t.rows.length - 1].d + 0.6, yA = t.rows[0].y, yB = t.rows[t.rows.length - 1].y + 0.6, M = 16;
    const o = pxPos.length / 3;
    for (let i = 0; i <= M; i++) { const tt = lerp(B.t0, B.t1, i / M);
      for (const [dd, yy] of [[dA, yA], [dB, yB]]) { const pl = plan(dd), [x, z] = sePoint(pl.a, pl.b, pl.n, tt); pxPos.push(x, yy + 0.4, z); } }
    for (let i = 0; i < M; i++) { const a = o + i * 2; pxIdx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); faceBlk.push(bi, bi); }
  });
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pxPos, 3)); pg.setIndex(pxIdx);
  const proxy = new THREE.Mesh(pg, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, visible: false })); proxy.userData.faceBlk = faceBlk; G.add(proxy);

  // ---------------- campo ----------------
  const fieldTex = canvasTex(2048, 1400, (c, w, h) => {
    const k = w / 125; c.fillStyle = '#3f7d34'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 18; i++) { c.fillStyle = i % 2 ? '#468a3a' : '#3c7631'; c.fillRect((10 + i * 105 / 18) * k, 0, 105 / 18 * k + 1, h); }
    const n = noise2(5); const im = c.getImageData(0, 0, w, h);
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) { const v = (fbm(n, xx / 60, yy / 60, 3) - 0.5) * 18, o = (yy * w + xx) * 4; im.data[o] += v; im.data[o + 1] += v; im.data[o + 2] += v * 0.6; }
    c.putImageData(im, 0, 0);
    c.strokeStyle = 'rgba(255,255,255,0.92)'; c.lineWidth = 0.12 * k; const X = x => (x + 62.5) * k, Y = y => (y + 42.5) * k;
    c.strokeRect(X(-52.5), Y(-34), 105 * k, 68 * k); c.beginPath(); c.moveTo(X(0), Y(-34)); c.lineTo(X(0), Y(34)); c.stroke();
    c.beginPath(); c.arc(X(0), Y(0), 9.15 * k, 0, 7); c.stroke();
    for (const s of [-1, 1]) { c.strokeRect(X(s > 0 ? 52.5 - 16.5 : -52.5), Y(-20.16), 16.5 * k, 40.32 * k); c.strokeRect(X(s > 0 ? 52.5 - 5.5 : -52.5), Y(-9.16), 5.5 * k, 18.32 * k);
      c.beginPath(); c.arc(X(s * 41.5), Y(0), 9.15 * k, s > 0 ? Math.PI * 0.705 : -Math.PI * 0.295, s > 0 ? Math.PI * 1.295 : Math.PI * 0.295); c.stroke(); }
  }, { repeat: [1, 1] });
  const field = new THREE.Mesh(new THREE.PlaneGeometry(125, 85), new THREE.MeshStandardMaterial({ map: fieldTex, roughness: 0.9 }));
  field.rotation.x = -Math.PI / 2; field.position.y = 0.02; field.receiveShadow = true; G.add(field);
  const run = new THREE.Mesh(new THREE.ShapeGeometry(seShape(p.pianta.a + 1, p.pianta.b + 1, p.pianta.n0)), new THREE.MeshStandardMaterial({ color: 0x35612c, roughness: 0.95 }));
  run.rotation.x = -Math.PI / 2; run.receiveShadow = true; G.add(run);
  for (const s of [-1, 1]) G.add(goal(s * 52.5, s));

  const tt = p.tetto; let roof, roofLuci = [], TP = null;
  if (tt.tipo === 'petali') { TP = tettoPetali(plan, tt, R, p.colori); roof = TP.gruppo; roofLuci = TP.luci; G.add(roof); }
  else {
  // ---------------- tetto: sotto (pannelli chiari a faccette), sopra (petali verdi), fessure dorate ----------------
  const under = roofSurface(plan, tt, R, 'sotto'), over = roofSurface(plan, tt, R, 'sopra');
  const matSotto = new THREE.MeshStandardMaterial({ color: p.colori.tettoSotto, roughness: 0.75, flatShading: true, side: THREE.DoubleSide });
  const green = greenRoofTex();
  const matSopra = new THREE.MeshStandardMaterial({ map: green, roughness: 0.95, flatShading: true });
  const matOro = new THREE.MeshStandardMaterial({ color: p.colori.oro, roughness: 0.35, metalness: 0.85, emissive: new THREE.Color(p.colori.oroLuce), emissiveIntensity: 0 });
  matOro.userData.notte = 2.6;
  roof = new THREE.Group(); roof.name = 'tetto';
  const mU = new THREE.Mesh(under, matSotto); mU.castShadow = mU.receiveShadow = true; roof.add(mU);
  if (tt.lastre) {   // tetto a lastre spezzate (pietra vicino all'oculo, verde a terrazze verso terra), come il progetto Populous
    const L = roofPlates(plan, tt, R), mats = { pietra: new THREE.MeshStandardMaterial({ color: p.colori.pietra, roughness: 0.92, flatShading: true }), verde: matSopra, fianco: new THREE.MeshStandardMaterial({ color: p.colori.pietraScura, roughness: 0.95, flatShading: true }) };
    for (const k of Object.keys(L.geo)) if (L.geo[k]) { const m = new THREE.Mesh(L.geo[k], mats[k]); m.castShadow = m.receiveShadow = true; roof.add(m); }
    for (const lan of L.lanterne) { const m = new THREE.Mesh(lan, matOro); m.castShadow = true; roof.add(m); }
  } else for (const g of over.petali) { const m = new THREE.Mesh(g, matSopra); m.castShadow = m.receiveShadow = true; roof.add(m); }
  const shell = new THREE.Mesh(over.guscio, matOro); shell.receiveShadow = true; roof.add(shell);
  const ring = new THREE.Mesh(sweepProfile([[tt.dOculo, tt.hOculo - 1.6], [tt.dOculo - 0.3, tt.hOculo + (tt.labbro || 0.4)], [tt.dOculo + 1.2, tt.hOculo + (tt.labbro || 0.4)], [tt.dOculo + tt.anello, tt.hOculo + 1.3]], plan, 480), new THREE.MeshStandardMaterial({ color: p.colori.anello, roughness: 0.5, metalness: 0.2 }));
  ring.castShadow = true; roof.add(ring);
  // fari sotto il bordo dell'oculo
  const lamps = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 0.5, 0.9), new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xfff4e0, emissiveIntensity: 0 }), 96);
  lamps.material.userData.notte = 6;
  { const pl = plan(tt.dOculo + 3); for (let i = 0; i < 96; i++) { const [x, z] = sePoint(pl.a, pl.b, pl.n, i / 96 * Math.PI * 2); M4.makeRotationY(Math.atan2(x, z)); M4.setPosition(x, tt.hOculo - 1.2, z); lamps.setMatrixAt(i, M4); } }
  roof.add(lamps); G.add(roof);
  roofLuci = [matOro, lamps.material]; }

  // fondo esterno sotto il guscio (piazza coperta, scuro)
  const plinth = new THREE.Mesh(sweepProfile([[last.dEnd + 7, (p.quota || 0) + 0.05], [p.fondoFino ?? tt.dTerra - 2, (p.quota || 0) + 0.05]], plan, 480), new THREE.MeshStandardMaterial({ color: p.colori.fondo || 0x8b8072, roughness: 0.95 })); plinth.receiveShadow = true; G.add(plinth);

  // ---------------- dati per il motore ----------------
  const info = {
    gruppo: G, tetto: roof, posti: inst, coloriBase: base, proxy, blocks, zones, tiers, plan,
    seats: { N, x: Float32Array.from(seats.x), y: Float32Array.from(seats.y), z: Float32Array.from(seats.z), yaw: Float32Array.from(seats.yaw), blk: Uint16Array.from(seats.blk), row: Uint8Array.from(seats.row), num: Uint16Array.from(seats.num) },
    luci: [mat.vetro, ...roofLuci], tettoInfo: TP,
  };
  return info;
}

// sagoma piatta della superellisse (per prati e piazze)
export function seShape(a, b, n, N = 256) { const s = new THREE.Shape(); for (let i = 0; i <= N; i++) { const [x, z] = sePoint(a, b, n, i / N * Math.PI * 2); i ? s.lineTo(x, -z) : s.moveTo(x, -z); } return s; }

function seatGeo() {   // sedile con schienale, già orientato: guarda verso -z locale... ruotato con yaw verso il campo
  const pan = new THREE.BoxGeometry(0.44, 0.07, 0.38); pan.translate(0, 0.42, 0.02);
  const back = new THREE.BoxGeometry(0.44, 0.42, 0.06); back.rotateX(-0.18); back.translate(0, 0.66, 0.2);
  const leg = new THREE.BoxGeometry(0.06, 0.4, 0.06); leg.translate(0, 0.2, 0.08);
  const g = merge([pan.toNonIndexed(), back.toNonIndexed(), leg.toNonIndexed()]);
  g.rotateY(Math.PI); return g;   // lo schienale dietro, la seduta verso il campo
}

function goal(x, s) {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
  for (const z of [-3.66, 3.66]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.44), m); post.position.set(x, 1.22, z); g.add(post); }
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 7.32), m); bar.rotation.x = Math.PI / 2; bar.position.set(x, 2.44, 0); g.add(bar);
  const net = new THREE.Mesh(new THREE.BoxGeometry(2, 2.44, 7.32), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, roughness: 1 }));
  net.position.set(x + s * 1, 1.22, 0); g.add(net); g.traverse(o => o.castShadow = true); return g;
}

// superficie del tetto. 'sotto' = intradosso a faccette; 'sopra' = petali verdi + guscio dorato che si vede nelle fessure
function roofSurface(plan, t, R, which) {
  const hTop = d => {   // profilo esterno: piatto e lieve verso il colmo, poi scende fino a terra
    if (d <= t.dColmo) return lerp(t.hOculo + 1.3, t.hColmo, Math.pow((d - t.dOculo) / (t.dColmo - t.dOculo), 0.7));
    const u = clamp((d - t.dColmo) / (t.dTerra - t.dColmo)); return t.profilo === 'cono' ? t.hColmo * Math.pow(1 - u, t.discesa || 1.25) : t.hColmo * Math.pow(Math.cos(u * Math.PI / 2), 0.85);
  };
  if (which === 'sotto') {
    const M = t.facceGiro, K = 6, pos = [], idx = [], dE = t.dSotto, jit = rng(41);
    for (let i = 0; i <= M; i++) for (let k = 0; k <= K; k++) {
      const d = lerp(t.dOculo, dE, k / K), pl = plan(d), [x, z] = sePoint(pl.a, pl.b, pl.n, (i % M) / M * Math.PI * 2);
      const y = lerp(t.hOculo - 1.6, t.hSotto, Math.pow(k / K, 0.8)) + (k > 0 && k < K ? (jit() - 0.5) * 1.6 : 0);
      pos.push(x, y, z);
    }
    for (let i = 0; i < M; i++) for (let k = 0; k < K; k++) { const a = i * (K + 1) + k, b = (i + 1) * (K + 1) + k; idx.push(a, a + 1, b, b, a + 1, b + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); const ng = g.toNonIndexed(); ng.computeVertexNormals(); return ng;
  }
  // petali: P spicchi con fessure che si allargano verso terra
  const P = t.petali, out = { petali: [] }, K = 16, Mp = 4;
  for (let p = 0; p < P; p++) {
    const pos = [], uv = [], idx = [], c = (p + 0.5) / P * Math.PI * 2, half = Math.PI / P;
    for (let k = 0; k <= K; k++) {
      const u = k / K, d = lerp(t.dOculo + t.anello * 0.6, t.dTerra, u), g0 = lerp(0.002, t.fessura, Math.pow(u, 1.4)), gi = lerp(0, t.fessuraIngresso, Math.pow(u, 2.2));
      const gapL = g0 + (t.ingressi.includes(p) ? gi : 0), gapR = g0 + (t.ingressi.includes((p + 1) % P) ? gi : 0);   // ingressi = indici delle fessure (fessura p sta all'angolo p·360/P)
      for (let i = 0; i <= Mp; i++) {
        const v = i / Mp, ang = c - half + gapL + v * (2 * half - gapL - gapR), pl = plan(d), [x, z] = sePoint(pl.a, pl.b, pl.n, ang);
        // piega al centro del petalo (terra spaccata): il centro sale, i bordi scendono
        const fold = (1 - Math.abs(v - 0.5) * 2) * t.piega * Math.sin(Math.PI * Math.min(1, u * 1.15)) + (k % 4 === 0 ? 0 : 0);
        pos.push(x, Math.max(0.05, hTop(d) + fold), z); uv.push(v * 2, d / 9);
      }
    }
    for (let k = 0; k < K; k++) for (let i = 0; i < Mp; i++) { const a = k * (Mp + 1) + i, b = (k + 1) * (Mp + 1) + i; idx.push(a, a + 1, b, b, a + 1, b + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    out.petali.push(g.toNonIndexed()); out.petali[out.petali.length - 1].computeVertexNormals();
  }
  // guscio dorato appena sotto i petali (si vede solo nelle fessure)
  const prof = []; for (let k = 0; k <= 40; k++) { const d = lerp(t.dOculo + t.anello, t.dTerra - 0.5, k / 40); prof.push([d - 0.8, Math.max(0, hTop(d) - (t.lastre ? 4.5 : 1.4))]); }
  out.guscio = sweepProfile(prof, plan, 480, 6);
  return out;
}

// tetto a lastre: anelli di lastre spezzate con fessure, ogni lastra un po' inclinata e con lo spessore (i fianchi si vedono nelle fessure)
function roofPlates(plan, t, R) {
  const hTop = d => { if (d <= t.dColmo) return lerp(t.hOculo + 1.3, t.hColmo, Math.pow(clamp((d - t.dOculo) / (t.dColmo - t.dOculo)), 0.7));
    const u = clamp((d - t.dColmo) / (t.dTerra - t.dColmo)); return t.profilo === 'cono' ? t.hColmo * Math.pow(1 - u, t.discesa || 1.25) : t.hColmo * Math.pow(Math.cos(u * Math.PI / 2), 0.85); };
  const acc = { pietra: [], verde: [], fianco: [] }, lanterne = [], at = (d, th) => { const pl = plan(d); return sePoint(pl.a, pl.b, pl.n, th); };
  const inIngresso = (th, d) => t.ingressiAng.some(a => { let x = Math.abs(((th - a) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI); return x * (plan(d).a) < t.canyon / 2 + 1; });
  let prevCuts = null;
  for (const [bi, B] of t.lastre.entries()) {
    const phase = B.fase ?? R() * 2 * Math.PI / B.n; let cuts = []; for (let i = 0; i < B.n; i++) cuts.push(phase + (i + (R() - 0.5) * (B.storto ?? 0.75)) / B.n * Math.PI * 2);
    if (B.allinea && prevCuts && prevCuts.length === B.n) cuts = prevCuts; prevCuts = cuts;
    for (let i = 0; i < B.n; i++) {
      const th0 = cuts[i], th1 = i + 1 < B.n ? cuts[i + 1] : cuts[0] + Math.PI * 2, kind0 = B.tipo === 'misto' ? (R() < B.verde ? 'verde' : 'pietra') : B.tipo, confine = B.pietraFino != null ? B.pietraFino + Math.floor(R() * 2) : null;
      // ogni lastra divisa in 1-2 pezzi radiali, con bordo interno un po' storto
      const parts = B.pezzi || 1, tagli = B.tagliU || 1, jit = []; for (let q = 0; q <= parts; q++) jit.push(q && q < parts ? (R() - 0.5) * (B.d1 - B.d0) / parts * 0.5 : 0);
      for (let q = 0; q < parts; q++) for (let w = 0; w < tagli; w++) {
        const d0 = lerp(B.d0, B.d1, q / parts) + jit[q], d1 = lerp(B.d0, B.d1, (q + 1) / parts) + jit[q + 1];
        const wa = w / tagli, wb = (w + 1) / tagli, thA = lerp(th0, th1, wa), thB = lerp(th0, th1, wb);

        const gap = B.fessura, gj = B.giunto ?? gap, tiltU = (R() - 0.5) * B.inclina, tiltV = (R() - 0.5) * B.inclina, lift = (R() - 0.3) * B.alza;
        const gL = w === 0 ? gap : gj, gR = w === tagli - 1 ? gap : gj, gIn = q === 0 && B.primo ? gap : gj, gOut = q === parts - 1 && B.ultimo ? gap : gj;
        const NU = 6, NV = 4, pos = [], idx = [];
        const rim = [];
        for (let a = 0; a <= NV; a++) for (let b = 0; b <= NU; b++) {
          const v = a / NV, u = b / NU, uu = lerp(wa, wb, u), prua = q === parts - 1 ? (B.prua || 0) * (1 - Math.abs(2 * uu - 1)) * v : 0;
          const d = lerp(d0 + gIn, d1 - gOut + prua, v), rr = plan(d).a, ga = lerp(gap, B.fessuraFuori ?? gap, clamp((d - B.d0) / (B.d1 - B.d0))), entr = th => (t.ingressiAng || []).some(a => Math.abs(((th - a) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI) < 0.03) ? t.canyon * clamp((d - 20) / 40) : 0;
          const gl = w === 0 ? ga + entr(th0) : gL, gr = w === tagli - 1 ? ga + entr(th1) : gR;
          const th = lerp(thA + gl / rr, thB - gr / rr, u), [x, z] = at(d, th);
          const y = hTop(d) + lift + tiltU * (u - 0.5) * 6 + tiltV * (v - 0.5) * 6 + (B.piega || 0) * (1 - Math.abs(2 * uu - 1)) * Math.min(1, (hTop(d) - 0.5) / 8); pos.push(x, Math.max(0.2, y), z);
          if (a === 0 || a === NV || b === 0 || b === NU) rim.push([a, b]);
        }
        for (let a = 0; a < NV; a++) for (let b = 0; b < NU; b++) { const p0 = a * (NU + 1) + b, p1 = p0 + NU + 1; idx.push(p0, p0 + 1, p1, p1, p0 + 1, p1 + 1); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
        const uv = []; for (let k = 0; k < pos.length / 3; k++) { const x = pos[k * 3], z = pos[k * 3 + 2]; uv.push(Math.atan2(z, x) * 30, (Math.hypot(x, z)) / 9); } g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        const kind = confine != null ? (q < confine ? 'pietra' : 'verde') : kind0; acc[kind].push(g.toNonIndexed());
        // fianchi: giù di 'spessore' lungo il bordo
        const loop = []; for (let b = 0; b <= NU; b++) loop.push(b); for (let a = 1; a <= NV; a++) loop.push(a * (NU + 1) + NU); for (let b = NU - 1; b >= 0; b--) loop.push(NV * (NU + 1) + b); for (let a = NV - 1; a >= 1; a--) loop.push(a * (NU + 1)); loop.push(0);
        const sp = [], si = []; loop.forEach((k, n) => { sp.push(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2], pos[k * 3], pos[k * 3 + 1] - B.spessore, pos[k * 3 + 2]); if (n) { const o = (n - 1) * 2; si.push(o, o + 1, o + 2, o + 2, o + 1, o + 3, o, o + 2, o + 1, o + 2, o + 3, o + 1); } });
        const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); sg.setIndex(si); acc.fianco.push(sg.toNonIndexed());
      }
    }
  }
  // ingressi a canyon: una torre-lanterna dorata dentro ogni taglio
  for (const a of t.ingressiAng) { const d = t.dTerra - 18, [x, z] = at(d, a), g = new THREE.BoxGeometry(t.canyon * 0.55, hTop(d) * 0.95, 7); g.translate(0, hTop(d) * 0.475, 0); g.rotateY(Math.atan2(x, z)); g.translate(x, 0, z); lanterne.push(g); }
  const geo = {}; for (const k of Object.keys(acc)) { if (!acc[k].length) continue; const m = mergeNI(acc[k]); m.computeVertexNormals(); geo[k] = m; }
  return { geo, lanterne };
}
function mergeNI(list) { let n = 0; for (const g of list) n += g.attributes.position.count; const pos = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
  for (const g of list) { pos.set(g.attributes.position.array, o * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; }
  const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); m.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return m; }

function greenRoofTex() {   // terrazze verdi: macchie di arbusti, righe delle terrazze, qualche sentiero chiaro
  return canvasTex(1024, 1024, (c, w, h) => {
    const n = noise2(9), im = c.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = fbm(n, x / 26, y / 26, 4), m = fbm(n, x / 120 + 9, y / 120, 3), terr = (y % 128) < 6 ? 1 : 0, o = (y * w + x) * 4;
      let r = 62 + v * 50, g = 98 + v * 62, b = 42 + v * 24; if (m > 0.62) { r += 28; g += 14; b += 4; }   // macchie più secche
      if (terr) { r = 150; g = 138; b = 112; }
      im.data[o] = r; im.data[o + 1] = g; im.data[o + 2] = b; im.data[o + 3] = 255;
    }
    c.putImageData(im, 0, 0);
  }, { repeat: [1, 1] });
}

// vetrate degli skybox: un box ogni ~4,5 m, luce calda dentro (più forte in alto), montanti scuri, sagome sfocate di gente
function skyboxTex() {
  const t = canvasTex(512, 512, (c, w, h) => { const R = rng(55);
    for (let b = 0; b < 4; b++) { const x0 = b * w / 4, g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ffe3b8'); g.addColorStop(0.12, '#fff1d8'); g.addColorStop(0.5, '#d9a66a'); g.addColorStop(1, '#5a3a22');
      c.fillStyle = g; c.fillRect(x0, 0, w / 4, h); c.fillStyle = 'rgba(40,24,14,0.55)'; for (let q = 0; q < 4; q++) { const px = x0 + 16 + R() * (w / 4 - 40), ph = h * (0.34 + R() * 0.14); c.beginPath(); c.ellipse(px, h - ph * 0.55, 9, ph * 0.5, 0, 0, 7); c.fill(); c.beginPath(); c.arc(px, h - ph * 1.08, 7, 0, 7); c.fill(); }
      c.fillStyle = '#120d0a'; c.fillRect(x0, 0, 7, h); c.fillRect(x0 + w / 8 - 2, 0, 3, h); }
    c.fillStyle = '#120d0a'; c.fillRect(0, 0, w, 10); c.fillRect(0, h - 26, w, 26); }, { repeat: [1, 1] });
  t.repeat.set(0.25 * 4.7 / 4.5, 1); return t;
}
