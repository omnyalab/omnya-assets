// Motore choose-your · tetto a petali del King Salman Stadium (Populous), rifatto sui render ufficiali (20/11/2026).
// 16 petali sfaccettati divisi da fessure che si allargano verso terra; in alto lastre di pietra beige a file
// (giunti scuri, ogni lastra un po' storta), sotto la spalla il verde ripido a grandi facce piegate con la prua a terra.
// Le pareti delle fessure sono terra battuta che di sera si accende d'oro. L'oculo ha il bordo a blocchi con i fari sotto,
// e dentro il soffitto a pannelli beige copre tutti i posti, coi tagli di cielo fra un petalo e l'altro.
import * as THREE from 'three';
import { sePoint, canvasTex, noise2, fbm, lerp, clamp, unisci, rng } from './forme.js';

export function tettoPetali(plan0, t, R, colori) {
  const G = new THREE.Group(); G.name = 'tetto';
  const TAU = Math.PI * 2, N = t.n, Q = t.quota || 0;
  // pianta del tetto: quasi rettangolare all'oculo (zenitale ufficiale ext01), quasi tonda al piede
  const pa = plan0(0).a, pb = plan0(0).b;
  const plan = d => ({ a: pa + d, b: pb + d, n: lerp(t.nRim ?? 5.5, t.nPiede ?? 2.3, Math.pow(clamp((d - t.dRim0) / (t.dPiede - t.dRim0)), 0.6)) });
  const P = (d, th) => { const pl = plan(d); return sePoint(pl.a, pl.b, pl.n, th); };
  const speed = (d, th) => { const e = 1e-3, a = P(d, th - e), b = P(d, th + e); return Math.hypot(b[0] - a[0], b[1] - a[1]) / (2 * e); };

  // fessure: la 0 è l'ingresso principale (larga, con la scala e la torre di luce)
  const cuts = []; for (let k = 0; k < N; k++) cuts.push(t.ingresso.ang + (k + (k ? (R() - 0.5) * t.storto : 0)) / N * TAU);
  const gap = (d, k) => (t.fessMid != null ? (d < t.dSpalla ? lerp(t.fessIn, t.fessMid, clamp((d - t.dRim1) / (t.dSpalla - t.dRim1))) : lerp(t.fessMid, t.fessOut, Math.pow(clamp((d - t.dSpalla) / (t.dPiede - t.dSpalla)), t.fessPot || 1))) : lerp(t.fessIn, t.fessOut, Math.pow(clamp((d - t.dRim1) / (t.dPiede - t.dRim1)), t.fessPot || 1.5))) + (k === 0 ? t.ingresso.largo * clamp((d - (t.ingresso.da ?? t.dRim0)) / 16) : 0);

  // ogni petalo ha la sua spalla, la sua piega e la sua prua (così nessuno è uguale)
  const pet = cuts.map((c, k) => ({
    k, c0: c, c1: k + 1 < N ? cuts[k + 1] : cuts[0] + TAU,
    dS: t.dSpalla + (R() - 0.5) * 6, hS: t.hSpalla + (R() - 0.5) * 2.2,
    dF: t.dPiede + (R() - 0.5) * 14, uM: 0.42 + (R() - 0.5) * 0.16,
    piega: t.piega * (0.65 + R() * 0.7), ridge: 0.5 + (R() - 0.5) * 0.3, prua: t.prua * (0.6 + R() * 0.8), punta: t.punta * (0.5 + R()), tono: R(),
    hM: (R() - 0.5) * 2 * t.salto,
  }));
  const thL = (p, d) => p.c0 + gap(d, p.k) / 2 / speed(d, p.c0), thR = (p, d) => p.c1 - gap(d, (p.k + 1) % N) / 2 / speed(d, p.c1);
  const at = (p, d, v) => P(d, lerp(thL(p, d), thR(p, d), v));
  const hTop = (p, d) => lerp(t.hRim, p.hS, Math.pow(clamp((d - t.dRim1) / (p.dS - t.dRim1)), t.bomba ?? 1));   // parte alta bombata
  const hSotto = (p, d) => t.hSottoRim != null ? Math.min(lerp(t.hSottoRim, t.hSottoFondo, clamp((d - t.dRim1) / ((t.dSottoFondo ?? 60) - t.dRim1))), hTop(p, d) - 0.6) : t.hSotto != null ? Math.min(t.hSotto, hTop(p, d) - 0.6) : hTop(p, d) - t.spessore;
  const ridge = (p, v, k = 1) => k * (1 - Math.abs(v - p.ridge) / Math.max(p.ridge, 1 - p.ridge));
  const H = (p, u) => lerp(t.hPiede, p.hS - 0.4, 1 - Math.pow(u, t.curva));

  const acc = { pietra: [], giunti: [], verde: [], pendio: [], fianco: [], fiancoAlto: [], soffitto: [], giuntiSotto: [], blocchi: [], scala: [], camminamento: [], fronte: [] };
  const C = new THREE.Color();

  for (const p of pet) {
    // ---------- lastre di pietra in alto (file concentriche, sfalsate come mattoni) ----------
    const nR = t.righe, bounds = [t.dRim1];
    for (let r = 1; r < nR; r++) bounds.push(lerp(t.dRim1, p.dS, r / nR) + (R() - 0.5) * (p.dS - t.dRim1) / nR * 0.45);
    bounds.push(p.dS);
    const mC = t.lastrePerFila || 2, colB = Array.from({ length: mC }, () => bounds.map((b, i) => i && i < nR ? b + (R() - 0.5) * (p.dS - t.dRim1) / nR * 0.9 : b));
    for (let r = 0; r < nR; r++) {
      const m = mC, vc = [0]; for (let q = 1; q < m; q++) vc.push(q / m + (R() - 0.5) * 0.6 / m); vc.push(1);
      for (let q = 0; q < m; q++) {
        const dA = colB[q][r] + (t.giunto ?? 0.25), dB = colB[q][r + 1] - (t.giunto ?? 0.25), wA = vc[q], wB = vc[q + 1];
        const lift = (R() - 0.35) * t.alzaLastre, tu = (R() - 0.5) * t.inclina, tv = (R() - 0.5) * t.inclina, th = t.spessoreLastre;
        const NU = 3, NV = 3, pos = [];
        for (let a = 0; a <= NV; a++) for (let b = 0; b <= NU; b++) {
          const u = b / NU, w = a / NV, d = lerp(dA, dB, u), width = speed(d, (p.c0 + p.c1) / 2) * (thR(p, d) - thL(p, d)), jv = (t.giunto ?? 0.25) / Math.max(4, width);
          const v = lerp(wA + (q ? jv : 0), wB - (q < m - 1 ? jv : 0), w), [x, z] = at(p, d, v);
          pos.push(x, hTop(p, d) + lift + tu * (u - 0.5) * 5 + tv * (w - 0.5) * 5 + ridge(p, v, t.piegaAlta), z);
        }
        const vMid = (wA + wB) / 2, verde = (r === nR - 1 && Math.abs(vMid - p.ridge) < (t.lingua ?? 0.3)) || (r === nR - 2 && Math.abs(vMid - p.ridge) < (t.lingua ?? 0.3) * 0.45);
        if (verde) { C.set(colori.verde).offsetHSL(0, 0, (R() - 0.5) * 0.06); acc.verde.push(lastra(pos, NU, NV, th, C, true, 14)); }
        else { C.set(colori.pietra).multiplyScalar(0.9 + R() * 0.16); acc.pietra.push(lastra(pos, NU, NV, th, C, true)); }
      }
    }
    { const pos = [], NU = 6, NV = 4; for (let a = 0; a <= NV; a++) for (let b = 0; b <= NU; b++) { const d = lerp(t.dRim1, p.dS, b / NU), v = a / NV, [x, z] = at(p, d, v); pos.push(x, hTop(p, d) - 1.3 + ridge(p, v, t.piegaAlta), z); }
      acc.giunti.push(griglia(pos, NU, NV, true)); }

    // ---------- pendio: poche grandi facce piegate (3-5 piani netti), pietra che scende a zig-zag lungo i bordi, verde al centro ----------
    const dM = lerp(p.dS, p.dF, p.uM), rows = [
      [[p.dS, hTop(p, p.dS) - 0.2], [p.dS + 1.5, hTop(p, p.dS) + 0.9], [p.dS, hTop(p, p.dS) - 0.2]],
      [[dM + (R() - 0.5) * 5, H(p, p.uM) - p.piega * 0.25 + p.hM], [dM + 4, H(p, p.uM) + p.piega], [dM + (R() - 0.5) * 5, H(p, p.uM) - p.piega * 0.25 - p.hM]],
      [[p.dF - t.ritiroPiede, t.hPiede], [p.dF + p.prua, t.hPiede + p.punta], [p.dF - t.ritiroPiede * (0.6 + R() * 0.8), t.hPiede]],
    ], vs = [0, p.ridge, 1], g = rows.map(row => row.map(([d, y], j) => { const [x, z] = at(p, d, vs[j]); return [x, y, z, d]; }));
    const cA = ((p.c0 + p.c1) / 2) % (Math.PI / 2), tuttoPietra = (t.petaliPietra || []).includes(p.k) || (t.verdeAngoli && Math.abs(cA - Math.PI / 4) > t.verdeAngoli);
    for (let i = 0; i < 2; i++) {
      const [eL, rr, eR] = g[i], [eL2, rr2, eR2] = g[i + 1];
      const up = [[eL, eL2, rr], [rr, eR2, eR]], lo = [[rr, eL2, rr2], [rr, rr2, eR2]];
      if (i === 0 || tuttoPietra) { acc.pendio.push(facce(i === 0 ? up : [...up, ...lo], colori.pietra, p.tono, R, 0.05, 46)); if (i === 0) (tuttoPietra ? acc.pendio : acc.verde).push(facce(lo, tuttoPietra ? colori.pietra : colori.verde, p.tono, R, 0.05, tuttoPietra ? 46 : 14)); }
      else acc.verde.push(facce([...up, ...lo], colori.verde, p.tono, R));
    }
    p.g = g;

    // ---------- pareti delle fessure: in alto pietra appena accesa, sul pendio arenaria che di sera si accende d'oro ----------
    for (const side of [0, 1]) {
      const v = side ? 1 : 0, alto = [];
      const nB = 10; for (let q = 0; q <= nB; q++) { const d = lerp(t.dRim1, p.dS, q / nB), [x, z] = at(p, d, v); alto.push([x, hTop(p, d) + t.spessoreLastre + ridge(p, v, t.piegaAlta), z, x, hSotto(p, d), z, d]); }
      acc.fiancoAlto.push(parete(alto, side, true));
      const basso = g.map(r => r[side ? 2 : 0]).map(([x, y, z, d]) => [x, y, z, x, Q - 1, z, d]);
      acc.fianco.push(parete(basso, side));
    }
    // fronte del piede: sotto la punta il muro rientra (punta a sbalzo)
    { const f = g[2].map(([x, y, z, d], j) => { const [xb, zb] = at(p, d - (j === 1 ? p.prua + 4 : 0), vs[j]); return [x, y, z, xb, Q - 1, zb, d]; }); acc.fronte.push(parete(f, 0)); }
    // terrazze verdi a gradoni alla base (alcuni petali)
    for (let s = 0; s < (R() < 0.7 ? (R() < 0.45 ? 2 : 1) : 0); s++) {
      const d0 = p.dF - 10 + s * 14, d1 = p.dF + p.prua + 8 + s * 14, v0 = 0.12 + s * 0.14 + (R() - 0.5) * 0.08, v1 = 0.88 - s * 0.14 + (R() - 0.5) * 0.08, h = Q + (s ? 2 : 4.5) + R() * 1.5;
      const c = [at(p, d0, v0), at(p, d0, v1), at(p, d1, lerp(v0, v1, 0.75)), at(p, d1, lerp(v0, v1, 0.2))];
      acc.verde.push(facce([[[c[0][0], h, c[0][1]], [c[1][0], h, c[1][1]], [c[2][0], h, c[2][1]]], [[c[0][0], h, c[0][1]], [c[2][0], h, c[2][1]], [c[3][0], h, c[3][1]]]], colori.verde, p.tono, R));
      for (let e = 0; e < 4; e++) { const A = c[e], B = c[(e + 1) % 4]; acc.fronte.push(parete([[A[0], h, A[1], A[0], Q - 1, A[1], e * 10], [B[0], h, B[1], B[0], Q - 1, B[1], e * 10 + 10]], 1)); }
    }

    // ---------- soffitto: pannelli piatti di pietra chiara con giunti scuri incassati, tagli di cielo fra i petali ----------
    { const rowsS = [t.dRim0 + 2]; const nS = t.righeSotto || 5; for (let r = 1; r < nS; r++) rowsS.push(lerp(t.dRim0 + 2, p.dS - 1, r / nS) + (R() - 0.5) * 3); rowsS.push(p.dS - 1);
      for (let r = 0; r < nS; r++) { const m = 2 + (R() < 0.5 ? 1 : 0), vc = [0]; for (let q = 1; q < m; q++) vc.push(q / m + (R() - 0.5) * 0.4 / m); vc.push(1);
        for (let q = 0; q < m; q++) { const pos = [], tu = (R() - 0.5) * 0.45, tv = (R() - 0.5) * 0.45, lift = (R() - 0.5) * 0.25;
          for (let a = 0; a <= 1; a++) for (let b = 0; b <= 1; b++) { const d = lerp(rowsS[r] + 0.12, rowsS[r + 1] - 0.12, b), w = a, width = speed(d, (p.c0 + p.c1) / 2) * (thR(p, d) - thL(p, d)), jv = 0.12 / Math.max(4, width);
            const v = lerp(vc[q] + (q ? jv : 0), vc[q + 1] - (q < m - 1 ? jv : 0), w), [x, z] = at(p, d, v); pos.push(x, hSotto(p, d) + lift + tu * (b - 0.5) * 2 + tv * (a - 0.5) * 2, z); }
          C.set(colori.tettoSotto).multiplyScalar((0.9 + R() * 0.14) * lerp(1, t.scuroFondo ?? 0.6, r / Math.max(1, nS - 1))); acc.soffitto.push(lastra(pos, 1, 1, -0.6, C, false)); } }
      const pos = [], NU = 6, NV = 3; for (let a = 0; a <= NV; a++) for (let b = 0; b <= NU; b++) { const d = lerp(t.dRim0 + 2, p.dS - 1, b / NU), [x, z] = at(p, d, a / NV); pos.push(x, hSotto(p, d) + 0.7, z); }
      acc.giuntiSotto.push(griglia(pos, NU, NV, false)); }

    // ---------- blocchi del bordo dell'oculo: grossi, di altezze diverse, qualcuno impilato ----------
    const nb = t.blocchiPetalo || 3, dIn = t.dRim0, dOut = t.dRim0 + (t.profBlocchi ?? (t.dRim1 + 0.5 - t.dRim0));
    const thA0 = thL(p, dIn), thB0 = thR(p, dIn);
    for (let q = 0; q < nb; q++) {
      const span = (thB0 - thA0) / nb, gg = 0.45 / speed(dIn, thA0), a0 = thA0 + q * span + (q ? gg : 0), a1 = thA0 + (q + 1) * span - (q < nb - 1 ? gg : 0);
      const di = dIn + R() * 1.2, dO = dOut + (R() - 0.5) * 2, top = t.hRim + (t.sopraBlocchi ?? 0.4) + R() * (t.alzaBlocchi ?? 1.2), bot = hSotto(p, dIn) - (t.sottoBlocchi ?? 0.6) - R() * 0.9;
      acc.blocchi.push(blocco(P(di, a0), P(di, a1), P(dO, a1), P(dO, a0), bot, top));
      if (t.impila && R() < 0.4) { const m0 = lerp(a0, a1, 0.15 + R() * 0.2), m1 = lerp(a0, a1, 0.6 + R() * 0.3), d2 = di + 1 + R() * 2; acc.blocchi.push(blocco(P(d2, m0), P(d2, m1), P(dO - 1, m1), P(dO - 1, m0), top - 0.1, top + 1.5 + R() * 2.5)); }
      p.lamps = (p.lamps || []).concat([[di, a0, a1, bot]]);
    }
  }

  // ---------- fondo delle fessure nella parte alta: camminamento acceso d'oro con aiuole (percorso sul tetto) ----------
  if (t.camminamento) for (let k = 0; k < N; k++) {
    const pL = pet[(k + N - 1) % N], pR = pet[k], pos = [], uv = [], NS = 16;
    for (let i = 0; i <= NS; i++) { const d = lerp(t.dRim1 + (t.camminamento.da ?? 4), Math.min(pL.dS, pR.dS) + 2, i / NS), [xa, za] = at(pL, d, 1), [xb, zb] = at(pR, d, 0), y = Math.max(Math.max(hSotto(pL, d), hSotto(pR, d)) + 0.6, Math.min(hTop(pL, d), hTop(pR, d)) - (t.camminamento.giu ?? 2.2));
      pos.push(xa, y, za, xb, y, zb); uv.push(0, i / NS * 6, 1, i / NS * 6); }
    const idx = []; for (let i = 0; i < NS; i++) { const o = i * 2; idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); acc.camminamento.push(g.toNonIndexed());
  }

  if (t.camminamento && t.camminamento.aTerra) for (let k = 0; k < N; k++) {   // fondo della fessura sul pendio: dal colmo giù fino alla piazza
    const pL = pet[(k + N - 1) % N], pR = pet[k], pos = [], uv = [], NS = 18, d0 = Math.min(pL.dS, pR.dS) + 2, d1 = Math.max(pL.dF, pR.dF) + 10;
    for (let i = 0; i <= NS; i++) { const u = i / NS, d = lerp(d0, d1, u), [xa, za] = at(pL, d, 1), [xb, zb] = at(pR, d, 0), y = lerp(Math.min(hTop(pL, d0), hTop(pR, d0)) - (t.camminamento.giu ?? 4), Q + 0.4, Math.pow(u, 0.8));
      pos.push(xa, y, za, xb, y, zb); uv.push(0, u * 8, 1, u * 8); }
    const idx = []; for (let i = 0; i < NS; i++) { const o = i * 2; idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); acc.camminamento.push(g.toNonIndexed());
  }

  // ---------- ingresso principale: scala lunga nella fessura + torre di luce ----------
  const cE = cuts[0];
  { const d0 = t.dPiede + 26, d1 = t.dRim1 + 8, w = t.ingresso.largo * 0.55, NS = 40, pos = [], idx = [];
    for (let i = 0; i <= NS; i++) { const u = i / NS, d = lerp(d0, d1, u), y = lerp(Q + 0.2, t.hRim - 2.5, Math.pow(u, 1.25)), [x, z] = P(d, cE), [tx, tz] = tang(d, cE); pos.push(x - tx * w / 2, y, z - tz * w / 2, x + tx * w / 2, y, z + tz * w / 2); if (i) { const o = (i - 1) * 2; idx.push(o, o + 2, o + 1, o + 1, o + 2, o + 3); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); acc.scala.push(g.toNonIndexed()); }
  const lanterne = [];
  { const d = (pet[N - 1].dS + t.dPiede) / 2 + 2, [x, z] = P(d, cE), h = 30, g = new THREE.BoxGeometry(t.ingresso.largo * 0.5, h, 16); g.translate(0, Q + h / 2, 0); g.rotateY(Math.atan2(x, z)); g.translate(x, 0, z); lanterne.push(g); }
  function tang(d, th) { const a = P(d, th - 1e-3), b = P(d, th + 1e-3), l = Math.hypot(b[0] - a[0], b[1] - a[1]); return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; }

  // ---------- materiali ----------
  const stone = t.mosaico ? pavingTex() : stoneTex(), green = greenTex(), wall = wallTex(), ceil = stoneTex();
  const warm = new THREE.Color(colori.oroLuce);
  const mats = {
    pietra: new THREE.MeshStandardMaterial({ map: stone, vertexColors: true, roughness: 0.88, flatShading: true, side: THREE.DoubleSide, emissive: new THREE.Color(colori.lucePietra || '#ffd2a0'), emissiveMap: stone, emissiveIntensity: 0 }),
    pendio: new THREE.MeshStandardMaterial({ map: stone, vertexColors: true, roughness: 0.9, flatShading: true, emissive: new THREE.Color(colori.lucePietra || '#ffd2a0'), emissiveMap: stone, emissiveIntensity: 0 }),
    giunti: new THREE.MeshStandardMaterial({ color: colori.pietraScura, roughness: 1 }),
    verde: new THREE.MeshStandardMaterial({ map: green, vertexColors: true, roughness: 0.97, flatShading: true, emissive: new THREE.Color(colori.luceVerde || '#c8b060'), emissiveMap: green, emissiveIntensity: 0 }),
    fianco: new THREE.MeshStandardMaterial({ map: wall, color: colori.terra, roughness: 0.92, emissive: warm, emissiveMap: t.vetrate ? vetrateTex() : wall.userData.luce, emissiveIntensity: 0, side: THREE.DoubleSide }),
    fiancoAlto: new THREE.MeshStandardMaterial({ map: wall, color: colori.fiancoAlto || colori.terra, roughness: 0.92, emissive: warm, emissiveMap: wall.userData.luceAlta, emissiveIntensity: 0, side: THREE.DoubleSide }),
    fronte: new THREE.MeshStandardMaterial({ map: wall, color: colori.terraScura || '#7a5a40', roughness: 0.95, emissive: warm, emissiveIntensity: 0, side: THREE.DoubleSide }),
    soffitto: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true, side: THREE.DoubleSide, emissive: new THREE.Color('#ffdcb0'), emissiveIntensity: 0 }),
    giuntiSotto: new THREE.MeshStandardMaterial({ color: '#2a2219', roughness: 1, side: THREE.DoubleSide }),
    blocchi: new THREE.MeshStandardMaterial({ color: colori.pietraBlocchi || colori.pietra, roughness: 0.9, flatShading: true, emissive: new THREE.Color('#ffd2a0'), emissiveIntensity: 0 }),
    scala: new THREE.MeshStandardMaterial({ color: '#cdb89a', roughness: 0.8, emissive: warm, emissiveIntensity: 0 }),
    camminamento: (() => { const tx = canvasTex(128, 512, (c, w, h) => { c.fillStyle = '#d9b07a'; c.fillRect(0, 0, w, h); const R2 = rng(4); for (let q = 0; q < (t.aiuole ?? 26); q++) { c.fillStyle = R2() < 0.6 ? '#4f6a2c' : '#6f8a3a'; c.beginPath(); c.ellipse(w * (0.15 + R2() * 0.7), R2() * h, 8 + R2() * 10, 12 + R2() * 20, 0, 0, 7); c.fill(); } }, { repeat: [1, 1] });
      return new THREE.MeshStandardMaterial({ map: tx, color: '#a58a66', roughness: 0.9, emissive: new THREE.Color('#ff9a48'), emissiveMap: tx, emissiveIntensity: 0, side: THREE.FrontSide }); })(),
  };
  mats.camminamento.userData.notte = t.luceCammino ?? 0.9;
  mats.fianco.userData.notte = t.luceFessure ?? 1.6; mats.fiancoAlto.userData.notte = (t.luceFessure ?? 1.6) * (t.luceAlta ?? 0.32); mats.fronte.userData.notte = t.luceFronte ?? 0.12; mats.pietra.userData.notte = t.lucePietra ?? 0.32; mats.pendio.userData.notte = (t.lucePietra ?? 0.32) * 0.8;
  mats.verde.userData.notte = t.luceVerde ?? 0.3; mats.soffitto.userData.notte = t.luceSoffitto ?? 0.22; mats.blocchi.userData.notte = t.luceBlocchi ?? 0.12; mats.scala.userData.notte = 0.5;
  for (const k of Object.keys(acc)) if (acc[k].length) { const m = new THREE.Mesh(mergeAll(acc[k]), mats[k]); m.name = 'tetto-' + k; m.castShadow = !['soffitto', 'giuntiSotto'].includes(k); m.receiveShadow = true; G.add(m); }
  const lanMat = new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 0.3, metalness: 0.4, emissive: new THREE.Color('#ffc988'), emissiveMap: floorsTex(), emissiveIntensity: 0 }); lanMat.userData.notte = 2.2;
  for (const g of lanterne) G.add(new THREE.Mesh(g, lanMat));

  // fari sotto i blocchi dell'oculo e in fila sopra la fascia LED (puntini bianchi come nei render interni)
  const lampPts = [];
  for (const p of pet) for (const [di, a0, a1, bot] of p.lamps) for (let q = 0; q < 5; q++) { const th = lerp(a0, a1, (q + 0.5) / 5), [x, z] = P(di + 1.2, th); lampPts.push([x, bot - 0.35, z]); }
  if (t.dFari) { const P0 = (d, th) => { const pl = plan0(d); return sePoint(pl.a, pl.b, pl.n, th); }; for (let q = 0; q < 220; q++) { const th = q / 220 * TAU, [x, z] = P0(t.dFari, th); lampPts.push([x, t.hFari, z]); } }
  const lamps = new THREE.InstancedMesh(new THREE.BoxGeometry(1.8, 0.5, 0.9), new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xfff6e8, emissiveIntensity: t.luceFari ?? 1.8 }), lampPts.length);
  const M4 = new THREE.Matrix4(); lampPts.forEach(([x, y, z], i) => { M4.makeRotationY(Math.atan2(x, z)); M4.setPosition(x, y, z); lamps.setMatrixAt(i, M4); }); lamps.name = 'fari'; G.add(lamps);

  return { gruppo: G, luci: [mats.fianco, mats.scala, lanMat], petali: pet, hTop, cuts, at, fari: lamps, lampPts };
}

// ---------- pezzi di geometria ----------
function griglia(pos, NU, NV, flip) {
  const idx = []; for (let a = 0; a < NV; a++) for (let b = 0; b < NU; b++) { const p0 = a * (NU + 1) + b, p1 = p0 + NU + 1; if (flip) idx.push(p0, p1, p0 + 1, p0 + 1, p1, p1 + 1); else idx.push(p0, p0 + 1, p1, p1, p0 + 1, p1 + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); const n = g.toNonIndexed(); n.computeVertexNormals(); return n;
}
function lastra(pos, NU, NV, th, col, su = true, uvS = 46) {   // lastra con spessore: faccia + bordo (th < 0: bordo verso l'alto, per il soffitto)
  const top = griglia(pos, NU, NV, su), loop = [];
  for (let b = 0; b <= NU; b++) loop.push(b); for (let a = 1; a <= NV; a++) loop.push(a * (NU + 1) + NU); for (let b = NU - 1; b >= 0; b--) loop.push(NV * (NU + 1) + b); for (let a = NV - 1; a >= 1; a--) loop.push(a * (NU + 1)); loop.push(0);
  const sp = []; loop.forEach((k, n) => { if (!n) return; const k0 = loop[n - 1]; const A = pos.slice(k0 * 3, k0 * 3 + 3), B = pos.slice(k * 3, k * 3 + 3);
    sp.push(...A, A[0], A[1] - th, A[2], ...B, ...B, A[0], A[1] - th, A[2], B[0], B[1] - th, B[2]); });
  const side = new THREE.BufferGeometry(); side.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); side.computeVertexNormals();
  const g = mergeAll([top, side]); const n = g.attributes.position.count, c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const s = i < top.attributes.position.count ? 1 : 0.82; c[i * 3] = col.r * s; c[i * 3 + 1] = col.g * s; c[i * 3 + 2] = col.b * s; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  const P = g.attributes.position, uv = new Float32Array(P.count * 2); for (let i = 0; i < P.count; i++) { uv[i * 2] = P.getX(i) / uvS; uv[i * 2 + 1] = P.getZ(i) / uvS; } g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}
function facce(tris, base, tono, R, varL = 0.06, uvScala = 14) {   // facce verdi: ogni faccia il suo verde, uv proiettate dalla direzione della faccia
  const pos = [], uv = [], col = [], C = new THREE.Color(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  for (const T of tris) {
    a.set(T[0][0], T[0][1], T[0][2]); b.set(T[1][0], T[1][1], T[1][2]); c.set(T[2][0], T[2][1], T[2][2]); n.subVectors(c, b).cross(new THREE.Vector3().subVectors(a, b)).normalize();
    if (n.y < 0) { n.negate(); const tmp = T[1]; T[1] = T[2]; T[2] = tmp; a.set(T[0][0], T[0][1], T[0][2]); b.set(T[1][0], T[1][1], T[1][2]); c.set(T[2][0], T[2][1], T[2][2]); }
    C.set(base).offsetHSL((R() - 0.5) * 0.035 + (tono - 0.5) * 0.03, (R() - 0.5) * 0.1, (R() - 0.5) * varL);
    const h = Math.hypot(n.x, n.z) || 1;
    for (const V of [a, b, c]) { pos.push(V.x, V.y, V.z); col.push(C.r, C.g, C.b);
      const sc = uvScala; if (Math.abs(n.y) > 0.75) uv.push(V.x / sc, V.z / sc); else uv.push((V.x * n.z - V.z * n.x) / h / sc, V.y / sc); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
}
function parete(pts, side, rel = false) {   // striscia: [xTop, yTop, zTop, xBot, yBot, zBot, u]
  const pos = [], uv = [], idx = [];
  pts.forEach(([x, yT, z, xb, yB, zb, d], i) => { pos.push(x, yT, z, xb, yB, zb); uv.push(d / 9, 1, d / 9, rel ? 0 : clamp(yB / Math.max(1, yT))); if (i) { const o = (i - 1) * 2; if (side) idx.push(o, o + 1, o + 2, o + 2, o + 1, o + 3); else idx.push(o, o + 2, o + 1, o + 1, o + 2, o + 3); } });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); const n = g.toNonIndexed(); n.computeVertexNormals(); return n;
}
function blocco(p0, p1, p2, p3, y0, y1) {   // parallelepipedo storto da 4 punti in pianta
  const v = [[p0, y0], [p1, y0], [p2, y0], [p3, y0], [p0, y1], [p1, y1], [p2, y1], [p3, y1]].map(([q, y]) => [q[0], y, q[1]]);
  const f = [[4, 5, 6, 7], [3, 2, 1, 0], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]], pos = [];
  for (const [a, b, c, d] of f) pos.push(...v[a], ...v[c], ...v[b], ...v[a], ...v[d], ...v[c]);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  const uv = []; for (let i = 0; i < pos.length / 3; i++) uv.push((pos[i * 3] + pos[i * 3 + 2]) / 12, pos[i * 3 + 1] / 12); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const c = new Float32Array(pos.length).fill(1); g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g;
}
export const mergeAll = unisci;

// ---------- texture ----------
function pavingTex() {   // pietra a mosaico irregolare (crazy paving): poligoni con giunti scuri, ognuno col suo tono
  return canvasTex(1024, 1024, (c, w, h) => { const n = noise2(31), R = rng(91), pts = []; for (let gy = 0; gy < 7; gy++) for (let gx = 0; gx < 7; gx++) pts.push([(gx + 0.5 + (R() - 0.5) * 0.7) * w / 7, (gy + 0.5 + (R() - 0.5) * 0.7) * h / 7, 0.9 + R() * 0.18]);
    const im = c.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let d1 = 1e9, d2 = 1e9, k1 = 0; for (let i = 0; i < pts.length; i++) for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) { const dx = x - pts[i][0] - ox, dy = y - pts[i][1] - oy, dd = dx * dx + dy * dy; if (dd < d1) { d2 = d1; d1 = dd; k1 = i; } else if (dd < d2) d2 = dd; }
      const edge = Math.sqrt(d2) - Math.sqrt(d1), v = fbm(n, x / 14, y / 14, 3), g = (210 + (v - 0.5) * 34) * pts[k1][2] * (edge < 2.6 ? 0.45 : edge < 4 ? 0.82 : 1), o = (y * w + x) * 4;
      im.data[o] = g; im.data[o + 1] = g * 0.96; im.data[o + 2] = g * 0.9; im.data[o + 3] = 255; }
    c.putImageData(im, 0, 0); });
}
function stoneTex() {   // pietra chiara a grana fine con macchie leggere
  return canvasTex(512, 512, (c, w, h) => { const n = noise2(31), im = c.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = fbm(n, x / 18, y / 18, 4), s = fbm(n, x / 90 + 7, y / 90, 2), g = 222 + (v - 0.5) * 34 + (s - 0.5) * 20, o = (y * w + x) * 4; im.data[o] = g; im.data[o + 1] = g * 0.985; im.data[o + 2] = g * 0.96; im.data[o + 3] = 255; }
    c.putImageData(im, 0, 0); });
}
function greenTex() {   // verde dei petali: arbusti fitti, macchie più chiare e più scure, righe di piantumazione appena visibili
  return canvasTex(1024, 1024, (c, w, h) => { const n = noise2(9), im = c.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = fbm(n, x / 9, y / 9, 4), m = fbm(n, x / 110 + 9, y / 110, 3), leaf = fbm(n, x / 3.2 + 40, y / 3.2, 2), o = (y * w + x) * 4;
      let r = 70 + v * 52 + leaf * 26, g = 104 + v * 64 + leaf * 30, b = 40 + v * 22 + leaf * 8;
      if (m > 0.6) { r += 26; g += 16; } if (m < 0.36) { r -= 14; g -= 12; b -= 6; }
      if ((y % 96) < 3) { r -= 18; g -= 18; b -= 10; }
      im.data[o] = r; im.data[o + 1] = g; im.data[o + 2] = b; im.data[o + 3] = 255; }
    c.putImageData(im, 0, 0); });
}
function wallTex() {   // terra battuta a strati; la mappa di luce è più forte in alto (luce che sale dalle fessure)
  const t = canvasTex(256, 512, (c, w, h) => { const n = noise2(17), im = c.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const band = Math.sin(y / h * 90 + fbm(n, x / 40, y / 8, 2) * 4) * 0.5 + 0.5, v = fbm(n, x / 14, y / 6, 3), g = 190 + band * 26 + (v - 0.5) * 30, o = (y * w + x) * 4;
      im.data[o] = g; im.data[o + 1] = g * 0.86; im.data[o + 2] = g * 0.72; im.data[o + 3] = 255; }
    c.putImageData(im, 0, 0); });
  t.userData.luce = canvasTex(64, 256, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.06, '#ffffff'); gr.addColorStop(0.25, '#b0b0b0'); gr.addColorStop(0.75, '#505050'); gr.addColorStop(1, '#909090'); c.fillStyle = gr; c.fillRect(0, 0, w, h); }, { srgb: false });
  t.userData.luce.wrapT = THREE.ClampToEdgeWrapping; t.userData.luce.flipY = true;
  t.userData.luceAlta = canvasTex(8, 256, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.45, '#9a9a9a'); gr.addColorStop(0.85, '#000000'); gr.addColorStop(1, '#000000'); c.fillStyle = gr; c.fillRect(0, 0, w, h); }, { srgb: false }); t.userData.luceAlta.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}
function ceilingTex() {   // pannelli del soffitto: file con giunti scuri e tagli sfalsati
  return canvasTex(512, 1024, (c, w, h) => { const n = noise2(23), im = c.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = fbm(n, x / 30, y / 30, 3), g = 226 + (v - 0.5) * 22, o = (y * w + x) * 4; im.data[o] = g; im.data[o + 1] = g * 0.975; im.data[o + 2] = g * 0.93; im.data[o + 3] = 255; }
    c.putImageData(im, 0, 0); c.strokeStyle = 'rgba(70,58,44,0.7)'; c.lineWidth = 4;
    const rows = [0, 0.16, 0.33, 0.52, 0.72, 1]; for (let r = 1; r < rows.length - 1; r++) { c.beginPath(); c.moveTo(0, rows[r] * h); c.lineTo(w, rows[r] * h + (r % 2 ? 14 : -10)); c.stroke(); }
    for (let r = 0; r < rows.length - 1; r++) { const cuts = r % 2 ? [0.5] : [0.34, 0.68]; for (const q of cuts) { c.beginPath(); c.moveTo(q * w + (r - 2) * 8, rows[r] * h); c.lineTo(q * w - (r - 2) * 6, rows[r + 1] * h); c.stroke(); } }
    c.strokeStyle = 'rgba(70,58,44,0.35)'; c.lineWidth = 2; for (let r = 0; r < rows.length - 1; r++) { c.beginPath(); c.moveTo(0, (rows[r] + rows[r + 1]) / 2 * h); c.lineTo(w, (rows[r] + rows[r + 1]) / 2 * h + 6); c.stroke(); }
  }, { repeat: [1, 1] });
}
function vetrateTex() {   // pareti basse delle fessure: fasce di piani accesi (vetrate del concourse) sopra una base calda
  const t = canvasTex(256, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, '#b8b8b8'); g.addColorStop(1, '#606060'); c.fillStyle = g; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(0,0,0,0.55)'; for (let y = 60; y < h; y += 46) c.fillRect(0, y, w, 12); for (let x = 0; x < w; x += 32) c.fillRect(x, 60, 3, h); }, { srgb: false });
  t.wrapT = THREE.ClampToEdgeWrapping; return t;
}
function floorsTex() {   // piani di vetro accesi nella torre dell'ingresso
  return canvasTex(128, 512, (c, w, h) => { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); for (let y = 6; y < h; y += 26) { c.fillStyle = '#fff'; c.fillRect(6, y, w - 12, 15); c.fillStyle = '#000'; for (let x = 10; x < w; x += 22) c.fillRect(x, y, 3, 15); } }, { srgb: false });
}
