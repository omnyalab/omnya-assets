// Motore choose-your · costruttore di torri (v2, 20/11 sera: The Split uguale alla foto di Nico).
// Uno o due volumi di vetro con montanti veri (alette in rilievo), profilo misurato dalla foto (larghezza a ogni quota),
// cima ad arco, «vela» di vetro concava sopra la fessura, fessura in bronzo con nucleo arretrato e solette a scaletta,
// bronzo che si apre a tromba alla base (ingresso), stanza sospesa sotto lo sbalzo (soffitto curvo in bronzo, vetro arretrato,
// terrazza col parapetto) oppure dentro la fessura (versione nostra «the-seam»), attico a doppia altezza in cima.
// Tutto in metri, base al suolo, x = attraverso la fessura (sinistra < 0), z = profondità (+z verso chi guarda).
import * as THREE from 'three';
import { canvasTex, lerp, clamp, rng } from './forme.js';
import * as AR from './torre-arredi.js';

const ss = x => { x = clamp(x); return x * x * (3 - 2 * x); };

export function torre(p) {
  const G = new THREE.Group(); G.name = 'torre'; const hP = p.altezzaPiano, gap = p.fessura.larghezza, C = p.colori, R = rng(p.seme || 5);
  // ---------- materiali ----------
  const vetro = new THREE.MeshPhysicalMaterial({ color: C.vetro, metalness: 0.92, roughness: p.ruvido ?? 0.1, envMapIntensity: p.riflessi ?? 1.5, map: vetroTex(p) });
  const vetroVela = vetro.clone(); vetroVela.color = new THREE.Color(C.vela || C.vetro); vetroVela.side = THREE.DoubleSide;   // la vela non deve sparire nel cielo
  const montante = new THREE.MeshStandardMaterial({ color: C.montanti, metalness: 0.8, roughness: 0.3, side: THREE.DoubleSide, envMapIntensity: 1.2 });
  const bronzo = new THREE.MeshStandardMaterial({ color: C.bronzo, metalness: 0.55, roughness: 0.4, map: nucleoTex(), side: THREE.DoubleSide, emissive: new THREE.Color(C.luceCalda), emissiveIntensity: 0 });
  bronzo.userData.notte = 0.25;
  const nucleo = new THREE.MeshStandardMaterial({ vertexColors: true, color: '#ffffff', metalness: 0.5, roughness: 0.45, map: nucleoTex(), side: THREE.DoubleSide, emissive: new THREE.Color(C.luceCalda), emissiveIntensity: 0 }); nucleo.userData.notte = 0.2;
  const bronzoChiaro = new THREE.MeshStandardMaterial({ color: C.bronzoChiaro || '#c79a6c', metalness: 0.9, roughness: 0.26, side: THREE.DoubleSide, emissive: new THREE.Color(C.luceCalda), emissiveIntensity: 0 });
  bronzoChiaro.userData.notte = 0.12;
  const filo = new THREE.MeshStandardMaterial({ color: C.filo || '#e6c39a', metalness: 0.9, roughness: 0.2, emissive: new THREE.Color(C.filo || '#e6c39a'), emissiveIntensity: p.filoLuce ?? 0.12 });   // i fili lucidi sui bordi della fessura
  const stanzaVetro = new THREE.MeshPhysicalMaterial({ color: 0x4a525c, metalness: 0.75, roughness: 0.06, transparent: true, opacity: 0.58, emissive: new THREE.Color(C.luceCalda), emissiveIntensity: 0, side: THREE.DoubleSide, depthWrite: false });
  stanzaVetro.userData.notte = 0.6; stanzaVetro.userData.minimo = 0.0;   // la lanterna: calda anche di giorno
  const parapetto = new THREE.MeshPhysicalMaterial({ color: 0xdfe8ee, metalness: 0.1, roughness: 0.04, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false });
  const solaio = new THREE.MeshStandardMaterial({ color: C.solaio, roughness: 0.6, metalness: 0.15 });
  const atrioT = atrioTex(); const atrio = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, color: 0xffffff, roughness: 0.08, metalness: 0.3, emissive: new THREE.Color('#ffdcae'), emissiveMap: atrioT, emissiveIntensity: 0, map: atrioT });
  atrio.userData.notte = 1.4; atrio.userData.minimo = 0.3;
  const atrioVol = vetro.clone(); atrioVol.color = new THREE.Color(C.vetroBase || '#5f6670');

  const curva = (P, y) => { if (y <= P[0][0]) return P[0][1]; const L = P.length - 1; if (y >= P[L][0]) return P[L][1]; let i = 0; while (y > P[i + 1][0]) i++;
    const t = (y - P[i][0]) / (P[i + 1][0] - P[i][0]), p0 = P[Math.max(0, i - 1)][1], p1 = P[i][1], p2 = P[i + 1][1], p3 = P[Math.min(L, i + 2)][1];
    const v = 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t); return Math.min(Math.max(v, Math.min(p1, p2) - 0.4), Math.max(p1, p2) + 0.4); };
  // ---------- fessura: larghezza a ogni quota (si apre a tromba alla base) ----------
  const sv = p.fessura.svasa || null;
  const mezza = (lato, y) => p.fessura.mezza ? curva(p.fessura.mezza[lato < 0 ? 'sx' : 'dx'], y) : (Array.isArray(p.fessura.profilo) ? curva(p.fessura.profilo, y) : gap) / 2;   // mezza fessura per lato: a sinistra liscia, a destra col gradino sotto lo sbalzo
  const larg = y => mezza(-1, y) + mezza(1, y);
  const dr = y => Array.isArray(p.deriva) ? curva(p.deriva, y) : 0;                          // la fessura piega appena: spostamento in x a ogni quota
  const g2 = (lato, y) => { const s = sv && (lato < 0 ? sv.sx : sv.dx); let g = mezza(lato, y); if (s && y < s.h) g += s.d * Math.pow(1 - y / s.h, s.pot || 2); return g; };

  // ---------- profilo: semiasse a (dal bordo della fessura verso fuori) a ogni quota ----------
  const sezione = (V, y) => {
    if (V.profilo) { const a = curva(V.profilo, y); return { a, b: a * (V.prof ?? 0.95), n: V.n, cx: V.lato * mezza(V.lato, y) }; }
    const u = clamp(y / V.altezza), k = (1 + V.pancia * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.05)), 1.3)) * (1 - V.rastrema * Math.pow(u, 2.2)) * (1 - V.piede * Math.pow(1 - u, 6));
    return { a: V.a * k, b: V.b * k, n: V.n, cx: V.cx + (V.inclina || 0) * u * V.altezza };
  };
  // cima: ad arco (picco, scende piano verso la fessura e tonda verso fuori) oppure obliqua (v1)
  const cimaDi = (V, x) => {
    const c = V.arco; if (!c) return null; const a = sezione(V, V.altezza - 4).a, f = clamp((Math.abs(x) - mezza(V.lato, V.altezza - 4)) / a);
    if (f < c.picco) return V.altezza - c.giuFessura * Math.pow((c.picco - f) / c.picco, c.pot || 2);
    const t = clamp((f - c.picco) / (1 - c.picco)); return V.altezza - c.giuFuori * (1 - Math.sqrt(Math.max(0, 1 - t * t)));
  };

  const st = p.stanza && p.stanza.tipo === 'sbalzo' ? p.stanza : null, sf = p.stanza && p.stanza.tipo === 'fessura' ? p.stanza : null;
  const M = 96;   // colonne per mezzo giro
  const volumi = p.volumi.map((V, vi) => {
    const lato = V.lato;
    // punto della facciata: colonna j (0 = dietro sulla fessura per lato > 0, davanti per lato < 0), quota y, scala
    const ang = j => lato > 0 ? lerp(-Math.PI / 2, Math.PI / 2, j / M) : lerp(Math.PI / 2, Math.PI * 1.5, j / M);
    const P = (y, j, scale = 1, carve = true) => {
      const s = sezione(V, y), tt = ang(j), c = Math.cos(tt), sn = Math.sin(tt);
      let x = s.cx + s.a * scale * Math.sign(c) * Math.pow(Math.abs(c), 2 / s.n), z = s.b * scale * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / s.n);
      const gg = sf && y > sf.y0 - 0.01 && y < sf.y1 + 0.01 && carve ? gap / 2 + sf.allarga : g2(lato, y);
      if (lato > 0) x = Math.max(x, gg); else x = Math.min(x, -gg);
      return [x + dr(y), z];
    };
    const Praw = (y, j, scale = 1) => { const q = P(y, j, scale); return [q[0] - dr(y), q[1]]; };
    const normale = (y, j) => { const s = sezione(V, y), [x, z] = Praw(y, j), dx = x - s.cx, n = s.n; let nx = Math.sign(dx) * Math.pow(Math.abs(dx) / s.a, n - 1) / s.a, nz = Math.sign(z) * Math.pow(Math.abs(z) / s.b, n - 1) / s.b; const l = Math.hypot(nx, nz) || 1; return [nx / l, nz / l]; };
    const xCima = j => Praw(V.altezza - 4, j)[0];
    const cimaY = j => { const a = cimaDi(V, xCima(j)); if (a != null) return a; const w = j / M, f = lato > 0 ? 1 - Math.abs(w - 0.5) * 2 : Math.abs(w - 0.5) * 2; return V.altezza - (V.cima || 0) * (V.cimaVerso === 'fuori' ? f : 1 - f); };
    const fDi = j => { const yy = st ? st.y0 : V.altezza / 2; return clamp((Math.abs(Praw(yy, j)[0]) - mezza(lato, yy)) / sezione(V, yy).a); };

    // le parti della facciata: con la stanza sotto lo sbalzo il volume si divide in sotto (fino alla terrazza) e sopra (dal labbro dello sbalzo)
    const conStanza = st && st.volume === vi;
    const yLabbro = j => { if (!conStanza) return 0; const f = fDi(j), pg = st.piega || 0; return st.y1[0] + (st.y1[1] - st.y1[0]) * ss((f - (st.piatto ?? 0.25)) / (1 - (st.piatto ?? 0.25))) - pg * ss((f - 0.8) / 0.2); };
    const labbro = j => conStanza ? (st.labbro || 0) * ss((fDi(j) - 0.3) / 0.4) : 0;
    const yRoom = j => { if (!conStanza || !st.yStanza) return 0; const f = fDi(j), p0 = st.piatto ?? 0.25; return st.yStanza[0] + (st.yStanza[1] - st.yStanza[0]) * ss((f - p0) / (1 - p0)); };   // il vetro della stanza sale verso la punta (0,75 → 2 piani)
    const hA = p.fessura.atrio || 0, atr = hA ? [{ y0: () => 0, y1: () => hA, sc: () => 1, mat: atrioVol, uvY: hA }] : [];   // piano terra vetrato a doppia altezza (atrio)
    const parti = conStanza
      ? [...atr, { y0: () => hA, y1: () => st.y0, sc: () => 1 }, { y0: yLabbro, y1: cimaY, sc: (y, j) => 1 + labbro(j) * Math.pow(1 - clamp((y - yLabbro(j)) / (st.spessoreLabbro ?? 3.2)), 2), basso: true }]
      : [...atr, { y0: () => hA, y1: cimaY, sc: () => 1 }];
    const parteDi = []; const fins = [], finsQ = [];
    for (const pt of parti) {
      let span = 0; for (let j = 0; j <= M; j++) span = Math.max(span, pt.y1(j) - pt.y0(j)); const steps = [0];
      if (pt.basso) for (const d of [0.15, 0.35, 0.6, 0.9, 1.3, 1.9, 2.6, 3.4]) steps.push(d / span);
      for (let t = (pt.basso ? 3.4 : 0) / span + hP / 2 / span; t < 1 - 1e-4; t += hP / 2 / span) steps.push(t); steps.push(1);
      const pos = [], uv = [], idx = [], cols = M + 1;
      for (const t of steps) for (let j = 0; j <= M; j++) { const y = lerp(pt.y0(j), pt.y1(j), t), [x, z] = P(y, j, pt.sc(y, j)); pos.push(x, y, z); uv.push(j / M * (pt.uvY ? (V.giro || 12) * 2 : (V.giro || 12)), y / (pt.uvY || hP)); }
      for (let i = 0; i < steps.length - 1; i++) for (let j = 0; j < M; j++) { const a = i * cols + j, b = (i + 1) * cols + j; idx.push(a, b, a + 1, b, b + 1, a + 1); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      const m = new THREE.Mesh(g, pt.mat || vetro); m.castShadow = m.receiveShadow = true; m.userData.guscio = !pt.mat; G.add(m); parteDi.push({ pt, steps });
    }
    // montanti veri: alette verticali in rilievo che seguono la facciata (si vedono anche da dentro)
    const nM = V.montanti || 52, fp = [], fi = [];
    for (let k = 1; k < nM; k++) {
      const j = k / nM * M + (R() - 0.5) * 0.0;
      for (const { pt, steps } of parteDi) {
        const base = fp.length / 3, rows = steps.length;
        for (const t of steps) { const y = Math.min(lerp(pt.y0(j), pt.y1(j), t), pt.y1 === cimaY ? cimaY(j) - 0.6 : 1e9), sc = pt.sc(y, j), [x, z] = P(y, j, sc), [nx, nz] = normale(y, j), tx = -nz, tz = nx, w = (V.largMontante || 0.2) / 2, d = V.profMontante || 0.42;
          fp.push(x - tx * w, y, z - tz * w, x - tx * w + nx * d, y, z - tz * w + nz * d, x + tx * w + nx * d, y, z + tz * w + nz * d, x + tx * w, y, z + tz * w); }
        for (let i = 0; i < rows - 1; i++) for (let q = 0; q < 3; q++) { const a = base + i * 4 + q, b = base + (i + 1) * 4 + q; fi.push(a, b, a + 1, b, b + 1, a + 1); }
      }
    }
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3)); fg.setIndex(fi); fg.computeVertexNormals();
    const fm = new THREE.Mesh(fg, montante); fm.castShadow = false; fm.receiveShadow = false; fm.userData.alette = true; G.add(fm);   // da dentro si nascondono (ogniFrame): dentro ci sono i montanti sottili veri

    // tetto: strisce fra la colonna j e la sua gemella dietro (stessa x), all'altezza della cima
    { const pos = [], idx = []; for (let j = 0; j <= M / 2; j++) { const j2 = M - j, ya = cimaY(j) - 0.05, yb = cimaY(j2) - 0.05, [xa, za] = P(ya, j), [xb, zb] = P(yb, j2); pos.push(xa, ya, za, xb, yb, zb); }
      for (let j = 0; j < M / 2; j++) { const a = j * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      const m = new THREE.Mesh(g, solaio.clone()); m.material.side = THREE.DoubleSide; m.material.color.set(C.tetto || '#9aa2ab'); G.add(m); }

    // parete in bronzo sulla fessura (si apre a tromba alla base) + filo lucido sul bordo davanti e dietro
    const zf = y => { const s = sezione(V, y), x = lato * g2(lato, y), u = Math.abs((x - s.cx) / s.a); return s.b * Math.pow(Math.max(0, 1 - Math.pow(Math.min(1, u), s.n)), 1 / s.n); };
    const yTopFessura = cimaY(lato > 0 ? 0 : 0);
    const ys = []; for (let y = 0; y < yTopFessura - 0.01; y += (y < 30 ? 0.7 : hP / 2)) ys.push(y); ys.push(yTopFessura);
    { const wp = [], wi = [], uvw = [];
      ys.forEach(y => { const x = lato * (g2(lato, y) - 0.03) + dr(y), z = zf(y); wp.push(x, y, -z, x, y, z); uvw.push(-z / 6, y / hP, z / 6, y / hP); });
      const yMaxBronzo = p.fessura.bronzoFino ?? 1e9, svL = sv && (lato < 0 ? sv.sx : sv.dx), vetroSotto = svL && svL.vetro ? svL.h : 0; for (let i = 0; i < ys.length - 1; i++) { const a = i * 2; if (sf && ys[i + 1] > sf.y0 + 0.01 && ys[i] < sf.y1 - 0.01) continue; if (ys[i] >= yMaxBronzo - 0.01 || ys[i + 1] <= vetroSotto + 0.01) continue; if (lato > 0) wi.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); else wi.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3)); wg.setAttribute('uv', new THREE.Float32BufferAttribute(uvw, 2)); wg.setIndex(wi); wg.computeVertexNormals();
      const wm = new THREE.Mesh(wg, bronzo); wm.castShadow = wm.receiveShadow = true; G.add(wm);
      wm.userData.lato = lato;
      for (const [ya, yb, mat] of [[vetroSotto ? 0 : -1, vetroSotto, atrio], [yMaxBronzo, 1e9, vetroVela]]) { if (ya < 0 || yb <= ya) continue; const ii = []; for (let i = 0; i < ys.length - 1; i++) { if (ys[i] < ya - 0.01 || ys[i + 1] > yb + 0.01) continue; const a = i * 2; if (lato > 0) ii.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); else ii.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
        if (!ii.length) continue; const g2g = new THREE.BufferGeometry(); g2g.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3)); g2g.setAttribute('uv', new THREE.Float32BufferAttribute(uvw.map((v, k) => k % 2 ? v * (mat === atrio ? hP / (p.fessura.atrio || hP) : 1) : v * (mat === atrio ? 0.5 : 0.75)), 2)); g2g.setIndex(ii); g2g.computeVertexNormals(); const mm = new THREE.Mesh(g2g, mat); mm.material.side = THREE.DoubleSide; G.add(mm); }
      // filo: nastro d'oro sullo spigolo davanti e dietro, appoggiato sulla facciata (segue la curva, staccato di pochi cm)
      const lama = sv && (lato < 0 ? sv.sx : sv.dx); for (const jc of [0, M]) { const dj = (jc === 0 ? 1 : -1) * (lato < 0 ? (p.filoSx ?? p.filo ?? 1.0) : (p.filoDx ?? p.filo ?? 1.0)), tp = [], ti = [];   // larghezza in colonne (1 colonna ~ 1 m)
        ys.forEach(y => { const extra = lama && lama.lama && y < lama.h ? lama.lama * Math.pow(1 - y / lama.h, 1.2) : 0; for (const jj of [jc, jc + dj * (1 + extra / Math.max(0.1, Math.abs(dj)))]) { const [x, z] = P(y, jj), [nx, nz] = normale(y, jj); tp.push(x + nx * 0.12, y, z + nz * 0.12); } });
        for (let i = 0; i < ys.length - 1; i++) { const a = i * 2; ti.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
        const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(tp, 3)); tg.setIndex(ti); tg.computeVertexNormals(); const tm = new THREE.Mesh(tg, filo); tm.material.side = THREE.DoubleSide; G.add(tm); }
    }

    // stanza sotto lo sbalzo: soffitto curvo in bronzo dal labbro al vetro arretrato, vetro della stanza, terrazza col parapetto
    let stanza = null;
    if (conStanza) {
      // fuori uguale alla foto (il soffitto dello sbalzo sale verso la punta), dentro una casa vera: soffitto netto a 3,1 m (Nico 20/11)
      const rin = st.rientro, hIn = st.altezzaDentro ?? 3.1, yS = st.y0, yC = yS + hIn, NS = 12, sp = [], si = [], cols = M + 1;
      for (let s = 0; s <= NS; s++) { const u = s / NS; for (let j = 0; j <= M; j++) { const yb = Math.max(yLabbro(j), yC + 0.05), yr = Math.min(yb, Math.max(yRoom(j), yC)), y = yr + (yb - yr) * (1 - u) * (1 - u), sc = lerp(1 + labbro(j), rin, ss(u)), [x, z] = P(y, j, sc); sp.push(x, y, z); /* intradosso concavo: dal vetro della stanza sale fino al bordo */ } }
      for (let s = 0; s < NS; s++) for (let j = 0; j < M; j++) { const a = s * cols + j, b = (s + 1) * cols + j; si.push(a, a + 1, b, b, a + 1, b + 1); }
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); sg.setIndex(si); sg.computeVertexNormals();
      const uvS = []; for (let s = 0; s <= NS; s++) for (let j = 0; j <= M; j++) uvS.push(j / M * 12, s / NS); sg.setAttribute('uv', new THREE.Float32BufferAttribute(uvS, 2));
      const sm = new THREE.Mesh(sg, bronzoChiaro.clone()); sm.material.map = soffittoTex(); sm.material.color.set(C.soffitto || '#e2c39c'); sm.material.metalness = 0.8; sm.material.roughness = 0.28; sm.material.emissiveIntensity = 0.1; sm.material.userData.minimo = 0.1; sm.castShadow = true; sm.receiveShadow = true; G.add(sm);
      const ring = (yy, s1, s2, mat, ord = 0) => { const pp = [], ii = [], uu = []; for (let j = 0; j <= M; j++) { const y = typeof yy === 'function' ? yy(j) : yy, [xa, za] = P(y, j, s1), [xb, zb] = P(y, j, s2); pp.push(xa, y, za, xb, y, zb); uu.push(xa / 4, za / 4, xb / 4, zb / 4); } for (let j = 0; j < M; j++) { const a = j * 2; ii.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uu, 2)); g.setIndex(ii); g.computeVertexNormals(); const m = new THREE.Mesh(g, mat); m.material.side = THREE.DoubleSide; m.renderOrder = ord; m.receiveShadow = true; G.add(m); return m; };
      const wall = (y0, y1, sc, mat, ord = 0) => { const pp = [], ii = [], uu = []; for (let j = 0; j <= M; j++) { const [x, z] = P(y0, j, sc); pp.push(x, y0, z, x, y1, z); uu.push(j / M * 60, 0, j / M * 60, 1); } for (let j = 0; j < M; j++) { const a = j * 2; ii.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uu, 2)); g.setIndex(ii); g.computeVertexNormals(); const m = new THREE.Mesh(g, mat); m.renderOrder = ord; m.receiveShadow = true; G.add(m); return m; };
      // vetro della stanza (arretrato, alto quanto la stanza) e montanti sottili
      const ySof = j => Math.min(Math.max(yLabbro(j), yC + 0.05), Math.max(yRoom(j), yC)), fMuro = st.muro ?? 0.14;   // vetro fino al soffitto; vicino alla fessura un tratto di muro chiaro
      const wallY = (yTop, sc, mat, ord, filtro, yBase = yS) => { const pp = [], ii = [], uu = []; for (let j = 0; j <= M; j++) { const [x, z] = P(yS, j, sc); pp.push(x, yBase, z, x, Math.max(yBase, yTop(j)), z); uu.push(j / M * 60, 0, j / M * 60, 1); } for (let j = 0; j < M; j++) { if (filtro && !filtro(j)) continue; const a = j * 2; ii.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uu, 2)); g.setIndex(ii); g.computeVertexNormals(); const m = new THREE.Mesh(g, mat); m.renderOrder = ord; m.receiveShadow = true; G.add(m); return m; };
      const vg = wallY(ySof, rin, stanzaVetro, 2, j => fDi(j + 0.5) >= fMuro); vg.material.side = THREE.DoubleSide;
      wallY(ySof, rin, new THREE.MeshStandardMaterial({ color: '#e6ddd0', roughness: 0.8, side: THREE.DoubleSide }), 0, j => fDi(j + 0.5) < fMuro);
      const mDentro = new THREE.MeshStandardMaterial({ color: 0x3a3029, metalness: 0.6, roughness: 0.4 }); for (let k = 1; k < 44; k++) { const j = k / 44 * M, [x0, z0] = P(yS, j, rin), hh = ySof(j) - yS; if (fDi(j) < fMuro) continue; const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, hh, 0.05), mDentro); b.position.set(x0, yS + hh / 2, z0); G.add(b); }
      // terrazza: soletta dal vetro al bordo, bordo, parapetto di vetro col corrimano
      ring(yS, rin * 0.5, 1.0, new THREE.MeshStandardMaterial({ color: '#cbb89c', roughness: 0.55, map: MAterrazza() }));
      wall(yS - 0.45, yS, 1.0, bronzoChiaro);
      wall(yS, yS + 1.1, 0.985, parapetto, 3);
      wall(yS + 1.08, yS + 1.13, 0.987, new THREE.MeshStandardMaterial({ color: '#c9ccd0', metalness: 0.95, roughness: 0.25, side: THREE.DoubleSide }));
      { const pp = [], ii = []; for (let j = 0; j <= M; j++) { const yb = Math.max(yLabbro(j), yC + 0.05), [x, z] = P(yb, j, 1 + labbro(j) + 0.004); pp.push(x, yb - 0.02, z, x, yb + 0.35, z); } for (let j = 0; j < M; j++) { const a = j * 2; ii.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3)); g.setIndex(ii); g.computeVertexNormals(); const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: '#d9dde2', metalness: 0.95, roughness: 0.2, side: THREE.DoubleSide })); G.add(m); }   // fascia argento sul bordo dello sbalzo
      // dentro: la casa (palette ?pal=1|2|3), pavimento a spina, soffitto chiaro con luce di gola, parete dentro cannettata
      const pal = +(new URLSearchParams(location.search).get('pal') || p.palette || 1), MA = AR.materiali(pal), inn = new THREE.Group(); inn.name = 'stanza';
      const sMid = sezione(V, yS), prof = st.profDentro ?? 9.5, sIn = rin - prof / sMid.a;
      ring(yS + 0.015, 0, rin, MA.pavimento); ring(yC - 0.01, 0, rin - 1.2 / sezione(V, yS).a, MA.intonaco); ring(yC - 0.01, rin - 1.2 / sezione(V, yS).a, rin - 1.15 / sezione(V, yS).a, MA.luce);
      /* sopra il soffitto di casa, dietro la gola di luce, una parete calda chiude lo spazio fino al soffitto dello sbalzo: da fuori non si vede il cielo attraverso la stanza */
      wallY(ySof, rin - 1.2 / sezione(V, yS).a, new THREE.MeshStandardMaterial({ color: '#3d3833', roughness: 0.6, side: THREE.DoubleSide }), 0, null, yC - 0.02);
      { const pw = new THREE.Mesh(new THREE.PlaneGeometry(sMid.b * 1.95, hIn), MA.parete); pw.rotation.y = V.lato * Math.PI / 2; pw.position.set(sMid.cx + V.lato * 0.35 + dr(yS), yS + hIn / 2, 0); G.add(pw); }
      /* la casa su un asse dritto (Nico 20/11: niente mobili storti), pareti di fondo e di fianco che chiudono la stanza */
      const jF = M * (st.casaJ ?? 0.84), F = telaioDritto(j => P(yS, j, rin), jF, M, [sMid.cx + dr(yS), 0]);
      AR.casa(inn, MA, F, yS, prof, hIn);
      const lamp = new THREE.PointLight(0xffcf96, 0, 16, 2); { const [x, z] = F.at(-3, 4.5); lamp.position.set(x, yS + 1.9, z); } lamp.userData.lanterna = 9; inn.add(lamp);
      G.add(inn);
      const [fx, fz] = P(yS, jF, 1.0), [nx, nz] = F.n, [ex, ez] = F.at(-0.6, 1.6), [ix, iz] = F.at(0.4, prof), [ox, oz] = F.at(0, 0);
      stanza = { gruppo: inn, lampada: lamp, y0: yS, y1: yC, M, P: (j, sc) => P(yS, j, sc),
        entra: { pos: [ex, yS + 1.6, ez], tgt: [ix, yS + 1.05, iz] }, skyline: [ox + nx * 400, yS - 12, oz + nz * 400],
        centro: new THREE.Vector3(ex, yS + 1.55, ez), fuori: new THREE.Vector3(fx + nx * 30, yS + 1.8, fz + nz * 30), normale: [nx, nz] };
    }
    return { V, sezione: y => sezione(V, y), P, Praw, M, lato, cimaY, zf, stanza, normale, alette: fm };
  });

  // ---------- nucleo della fessura: bronzo arretrato, atrio di vetro caldo alla base, solette a scaletta ----------
  const sx = volumi.find(v => v.lato < 0), dx = volumi.find(v => v.lato > 0);
  const Hc = Math.min(...volumi.map(v => v.cimaY(0))), fondo = p.fessura.fondo ?? 3.5, hAtrio = p.fessura.atrio ?? 0;
  const bmin = y => Math.min(...volumi.map(v => v.zf(y))) - fondo;
  if (p.fessura.fondo != null) {
    for (const side of [1, -1]) for (const [ya, yb, mat] of [[0, hAtrio, atrio], [hAtrio, Hc, nucleo]]) { if (yb <= ya) continue;
      const ys = []; for (let y = ya; y < yb - 0.01; y += (y < 30 ? 0.7 : hP)) ys.push(y); ys.push(yb);
      const pos = [], idx = [], uv = [], col = []; ys.forEach(y => { const zc = side * bmin(y); pos.push(-g2(-1, y) + dr(y), y, zc, g2(1, y) + dr(y), y, zc); const cc = new THREE.Color(C.nucleoBasso || '#8a5a3a').lerp(new THREE.Color(C.nucleo || '#2e2526'), clamp((y - 15) / 110)); col.push(cc.r, cc.g, cc.b, cc.r, cc.g, cc.b); const u1 = mat === atrio ? (g2(-1, y) + g2(1, y)) / 16 : 1; uv.push(0, y / (mat === atrio ? hAtrio : hP), u1, y / (mat === atrio ? hAtrio : hP)); });
      for (let i = 0; i < ys.length - 1; i++) { const a = i * 2; if (side > 0) idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); else idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); if (mat === nucleo) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
      const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; G.add(m); }
    // solette che sporgono dal nucleo a ogni piano (la «scaletta» della foto)
    const sol = []; for (let y = Math.max(hAtrio, hP * 2) + hP; y < Hc - 1; y += p.fessura.passo || hP * (p.fessura.ogni || 1)) sol.push(y);
    // solette a blocchi sfalsati (metà fessura, un piano sì e uno no dall'altra parte), poco sporgenti, scure
    const solMat = new THREE.MeshStandardMaterial({ color: C.soletta || '#3a2d27', metalness: 0.6, roughness: 0.4 });
    const bordoMat = new THREE.MeshStandardMaterial({ color: C.bordoSoletta || '#e0c08a', metalness: 0.85, roughness: 0.25, emissive: new THREE.Color('#d9a868'), emissiveIntensity: 0.18 });
    const sg = new THREE.BoxGeometry(1, 1, 1), smesh = new THREE.InstancedMesh(sg, solMat, sol.length * 2), bmesh = new THREE.InstancedMesh(sg, bordoMat, sol.length * 2); const m4 = new THREE.Matrix4(); let k = 0;
    for (const [i, y] of sol.entries()) for (const side of [1, -1]) { const zc = bmin(y), gr = (i % 2) * (p.fessura.gradino ?? 0.7), d = (p.fessura.sporgenza ?? 0.6) + gr, w = larg(y) - 0.15, cx = dr(y) + (mezza(1, y) - mezza(-1, y)) / 2, t = p.fessura.spessoreSoletta ?? 0.22;
      m4.compose(new THREE.Vector3(cx, y, side * (zc + d / 2)), new THREE.Quaternion(), new THREE.Vector3(w, t, d)); smesh.setMatrixAt(k, m4);
      m4.compose(new THREE.Vector3(cx, y, side * (zc + d + 0.03)), new THREE.Quaternion(), new THREE.Vector3(w, t + 0.04, 0.06)); bmesh.setMatrixAt(k++, m4); }
    bmesh.castShadow = false; G.add(bmesh);
    smesh.castShadow = smesh.receiveShadow = true; G.add(smesh);
  }

  // ---------- la vela: vetro concavo sopra la fessura, dalla cima del volume sinistro giù fino a quella del destro ----------
  if (p.vela) { const v = p.vela, x0 = -mezza(-1, sx.cimaY(0)), x1 = v.fine, yA = v.parte ?? sx.cimaY(0), yB = v.quota ?? dx.cimaY(M / 2) + 3, yBot = v.da ?? Math.min(yB, Hc) - 14, N = 40, sh = new THREE.Shape();
    sh.moveTo(x0, yBot); sh.lineTo(x1, yBot); const vy = x => { const t = clamp((x - x0) / (x1 - x0)); return v.pot ? yB + (yA - yB) * Math.pow(1 - t, v.pot) : yA - (yA - yB) * Math.sqrt(Math.max(0, 1 - (1 - t) * (1 - t))); }; /* quarto d'ellisse: verticale in partenza, orizzontale all'arrivo */ for (let i = 0; i <= N; i++) { const x = lerp(x1, x0, i / N); sh.lineTo(x, vy(x)); } sh.lineTo(x0, yBot);
    const eg = new THREE.ExtrudeGeometry(sh, { depth: v.spessore * 2, bevelEnabled: false, curveSegments: 1 }); eg.translate(0, 0, -v.spessore);
    const uv = eg.attributes.uv; for (let i = 0; i < uv.count; i++) { const P0 = eg.attributes.position; uv.setXY(i, P0.getX(i) / 8, P0.getY(i) / hP); }
    { const P0 = eg.attributes.position; for (let i = 0; i < P0.count; i++) P0.setX(i, P0.getX(i) + dr(P0.getY(i))); eg.computeVertexNormals(); }
    const vm = new THREE.Mesh(eg, vetroVela); vm.castShadow = true; vm.userData.guscio = true; G.add(vm);
    for (let x = x0 + 1.6; x < x1 - 0.5; x += 1.6) { const yTop = vy(x); const b = new THREE.Mesh(new THREE.BoxGeometry(0.14, yTop - yBot, 0.3), montante); b.position.set(x + dr((yTop + yBot) / 2), (yTop + yBot) / 2, v.spessore + 0.2); G.add(b); }
  }

  // ---------- stanza dentro la fessura (versione nostra «the-seam», come v1) ----------
  let stanza = volumi.find(v => v.stanza)?.stanza || null;
  if (sf) {
    const s = sf, w = gap + s.allarga * 2, bb = Math.max(...volumi.map(v => v.sezione((s.y0 + s.y1) / 2).b)), d = 2 * bb + 1, h = s.y1 - s.y0, grp = new THREE.Group();
    const floor = new THREE.Mesh(new THREE.BoxGeometry(w + 6, 0.5, d + s.terrazza), solaio); floor.position.set(0, s.y0 - 0.25, s.terrazza / 2); grp.add(floor);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), stanzaVetro); glass.position.set(0, s.y0 + h / 2, 0); grp.add(glass);
    const arc = new THREE.CylinderGeometry(w * 0.75, w * 0.75, d + s.terrazza * 0.6, 32, 1, true, -0.62, 1.24); arc.rotateX(Math.PI / 2); arc.rotateZ(Math.PI);
    const ceil = new THREE.Mesh(arc, bronzoChiaro); ceil.position.set(0, s.y1 - w * 0.75 * Math.cos(0.62) + 0.4, s.terrazza * 0.3); grp.add(ceil);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(w + 6, 1.1, 0.05), parapetto); rail.position.set(0, s.y0 + 0.55, d / 2 + s.terrazza); grp.add(rail);
    const lamp = new THREE.PointLight(0xffd29a, 0, 30, 1.5); lamp.position.set(0, s.y1 - 1.2, 0); lamp.userData.lanterna = 60; grp.add(lamp);
    G.add(grp); stanza = { gruppo: grp, lampada: lamp, y0: s.y0, y1: s.y1, centro: new THREE.Vector3(0, s.y0 + 1.6, 0), fuori: new THREE.Vector3(0, s.y0 + 1.6, d / 2 + s.terrazza + 26), normale: [0, 1] };
  }

  // ---------- attico in cima a un volume: doppia altezza, arredi caldi, si vede fuori da tutti i lati ----------
  let attico = null;
  if (p.attico) {
    const A = p.attico, v = volumi[A.volume], yF = A.y0, grp = new THREE.Group(); grp.name = 'attico';
    const sez = v.sezione(yF + 3), cxA = sez.cx + v.lato * sez.a * 0.48;
    const fs = new THREE.Shape(); for (let j = 0; j <= v.M; j++) { const [x, z] = v.Praw(yF, j, 0.995); j ? fs.lineTo(x, -z) : fs.moveTo(x, -z); }
    const pg = new THREE.ShapeGeometry(fs, 1); pg.rotateX(-Math.PI / 2); pg.translate(0, yF + 0.02, 0); { const u = pg.attributes.uv; for (let i = 0; i < u.count; i++) u.setXY(i, u.getX(i) / 4, u.getY(i) / 4); }
    const pav = new THREE.Mesh(pg, new THREE.MeshStandardMaterial({ color: C.pavimentoAttico || '#cdb79a', roughness: 0.38, metalness: 0.05, side: THREE.DoubleSide })); pav.receiveShadow = true; grp.add(pav);

    // dentro: casa vera a soffitto 3,1 m (Nico 20/11), palette ?pal=, parete cannettata sul lato della fessura e verso il nucleo
    const QS = new URLSearchParams(location.search), pal = +(QS.get('palAttico') || A.palette || QS.get('pal') || p.palette || 1), MA = AR.materiali(pal), hIn = A.h ?? 3.1; pav.material = MA.pavimento;   /* l'attico può avere la sua palette (A.palette) */
    const cg = pg.clone(); cg.translate(0, hIn - 0.03, 0); grp.add(new THREE.Mesh(cg, MA.intonaco));
    { const pw = new THREE.Mesh(new THREE.PlaneGeometry(sez.b * 1.9, hIn), MA.parete); pw.rotation.y = v.lato * Math.PI / 2; pw.position.set(sez.cx + v.lato * 0.35, yF + hIn / 2, 0); grp.add(pw); }
    const prof = A.profDentro ?? 9.5, sIn = 1 - prof / sez.a, jA = v.M * (A.casaJ ?? 0.3);
    const F = telaioDritto(j => v.Praw(yF, j, 0.97), jA, v.M, [sez.cx, 0]);
    AR.casa(grp, MA, F, yF, prof, hIn, { specchio: !!A.specchio });
    { const mD = new THREE.MeshStandardMaterial({ color: 0x3a3029, metalness: 0.6, roughness: 0.4 }); for (let j = 0.5; j < v.M; j += 1.6) { const [x, z] = v.Praw(yF, j, 0.995); const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, hIn, 0.05), mD); b.position.set(x, yF + hIn / 2, z); grp.add(b); } }
    const luce = new THREE.PointLight(0xffc98e, 0, 16, 2); { const [x, z] = F.at(-3, 4.5); luce.position.set(x, yF + 1.9, z); } luce.userData.lanterna = 9; grp.add(luce);
    grp.position.x = dr(yF); G.add(grp); const sh2 = new THREE.Vector3(dr(yF), 0, 0);
    const [ex, ez] = F.at(-0.6, 1.6), [ix, iz] = F.at(0.4, prof), [ox, oz] = v.Praw(yF, jA, 1.0), [nx, nz] = F.n;
    attico = { gruppo: grp, lampade: [luce], y0: yF, volume: A.volume,
      entra: { pos: [ex + dr(yF), yF + 1.6, ez], tgt: [ix + dr(yF), yF + 1.05, iz] }, skyline: p.vista ? [ex + dr(yF) + p.vista[0] * 400, yF - 10, ez + p.vista[1] * 400] : [ox + nx * 400 + dr(yF), yF - 16, oz + nz * 400],
      centro: new THREE.Vector3(ex + dr(yF), yF + 1.55, ez), vista: new THREE.Vector3(ox + nx * 400 + dr(yF), yF - 16, oz + nz * 400), fuori: new THREE.Vector3(ox + nx * 34 + dr(yF), yF + 2, oz + nz * 34) };
  }

  // ---------- fascia del piano sotto il mouse + il nostro tocco: la fessura che si accende ----------
  const fasciaMat = new THREE.MeshBasicMaterial({ color: C.scelta, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide });
  const fascia = new THREE.Group(); G.add(fascia);
  const seamMat = new THREE.MeshBasicMaterial({ color: C.luceFessura || '#ffcf8a', transparent: true, opacity: 0.95 });
  // luce del piano come SAMAR (la nostra prima «choose your floor»): ambra #ffc35e che sfuma ai bordi della torre e in alto/basso, sommata alla luce
  const bagliore = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { col: { value: new THREE.Color(C.bagliore || '#ffc35e') }, forza: { value: 1.0 } },
    vertexShader: 'attribute float fy; varying float vF; varying float vY; void main(){ vec4 wp = modelMatrix * vec4(position, 1.); vec3 n = normalize(mat3(modelMatrix) * normal); vec3 v = normalize(cameraPosition - wp.xyz); vF = abs(dot(n, v)); vY = fy; gl_Position = projectionMatrix * viewMatrix * wp; }',
    fragmentShader: 'uniform vec3 col; uniform float forza; varying float vF; varying float vY; void main(){ float bordo = smoothstep(0.04, 0.5, vF); float y = exp(-pow((vY - 0.5) * 3.0, 2.)); gl_FragColor = vec4(col * forza * bordo * y, 1.); }' });
  function fasciaLuce(v, ya, yb, sc, forza) {   // tre file di vertici (sotto, metà, sopra) con fy 0 / 0,5 / 1
    const pos = [], fy = [], idx = [], cols = v.M + 1, rows = [[ya - 1.0, 0], [(ya + yb) / 2, 0.5], [yb + 1.0, 1]];
    for (const [y, f] of rows) for (let j = 0; j <= v.M; j++) { const [x, z] = v.P(y, j, sc(y)); pos.push(x, y, z); fy.push(f); }
    for (let r = 0; r < 2; r++) for (let j = 0; j < v.M; j++) { const a = r * cols + j, b = (r + 1) * cols + j; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('fy', new THREE.Float32BufferAttribute(fy, 1)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, bagliore.clone()); m.material.uniforms.forza.value = forza; m.renderOrder = 5; return m;
  }
  function accendiPiano(n, colore = C.scelta, op = 0.55, quale = 'piano') {
    fascia.clear(); if (n == null) return;
    if (p.fessura.siAccende) { const y = n * hP + hP / 2, bz = Math.max(0.5, bmin(y)), m = new THREE.Mesh(new THREE.BoxGeometry(larg(y) * 0.98, hP * 0.86, bz * 2 + fondo * 1.6), seamMat); m.position.set(dr(y) + (mezza(1, y) - mezza(-1, y)) / 2, y, 0); fascia.add(m);
      const gl = new THREE.Mesh(new THREE.BoxGeometry(larg(y) * 2.2, hP * 1.6, bz * 2 + fondo * 2.4), new THREE.MeshBasicMaterial({ color: C.luceFessura || '#ffcf8a', transparent: true, opacity: 0.18, depthWrite: false })); gl.position.set(dr(y), y, 0); fascia.add(gl); }
    const ya = quale === 'stanza' && st ? st.y0 : n * hP, yb = quale === 'stanza' && st ? (st.yStanza ? st.yStanza[1] : ya + hP) : (n + 1) * hP;
    for (const v of volumi) { if (yb > v.cimaY(v.M / 2) - 0.5) continue; const vi = volumi.indexOf(v), inSt = st && st.volume === vi && yb > st.y0 - 0.1 && ya < (st.y1[1] || st.y0) + 1;
      if (quale === 'stanza' && !(st && st.volume === vi)) continue;
      fascia.add(fasciaLuce(v, ya, yb, () => (inSt ? st.rientro : 1) * 1.006 + 0.01, quale === 'stanza' ? 2.6 : 1.1)); }   /* la Sky Majlis è più indietro sotto lo sbalzo: luce più forte per vederla dal basso */
  }
  const pianiTot = Math.floor(Math.max(...volumi.map(v => v.cimaY(v.M / 2))) / hP);
  const gusci = []; G.traverse(o => { if (o.isMesh && o.userData.guscio) gusci.push(o); });
  return { gruppo: G, volumi, stanza, attico, accendiPiano, fascia, pianiTot, gusci, luci: [bronzo, stanzaVetro, atrio], altezza: Math.max(...p.volumi.map(V => V.altezza)), fessura: { g2, bmin, fondo, Hc, larg, dr } };
}

function MAterrazza() { return canvasTex(512, 512, (c, w, h) => { const R = rng(41); c.fillStyle = '#e9dcc6'; c.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 128) { c.fillStyle = `rgba(${R() < 0.5 ? '255,250,240' : '160,140,110'},${0.08 + R() * 0.1})`; c.fillRect(x, y, 128, 64); c.strokeStyle = 'rgba(120,100,80,0.3)'; c.strokeRect(x, y, 128, 64); } }, { repeat: [1, 1] }); }
function telaioDritto(punto, jC, M, centro) {   /* sistema locale dritto alla colonna jC: u lungo il vetro, v verso dentro; vetro(u) = dove sta la vetrata curva */
  const [ox, oz] = punto(jC), a = punto(jC - 0.5), b = punto(jC + 0.5); let tx = a[0] - b[0], tz = a[1] - b[1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
  let nx = tz, nz = -tx; if ((ox - centro[0]) * nx + (oz - centro[1]) * nz < 0) { nx = -nx; nz = -nz; }
  const tab = []; for (let j = 0; j <= M; j += 0.25) { const [x, z] = punto(j), u = (x - ox) * tx + (z - oz) * tz, v = -((x - ox) * nx + (z - oz) * nz); if (v > -1 && v < 25) tab.push([u, v]); }
  const vetro = u => { let best = 1e9, vb = 0; for (const [uu, vv] of tab) if (Math.abs(uu - u) < best) { best = Math.abs(uu - u); vb = vv; } return best > 1.2 ? null : vb; };   /* null = lì non c'è vetrata (oltre la fessura) */
  return { at: (u, v) => [ox + tx * u - nx * v, oz + tz * u - nz * v], ry: Math.atan2(nx, nz), n: [nx, nz], vetro };
}
function vetroTex(p) {   /* 8 lastre per ripetizione, ognuna col suo tono; montante a due toni sul bordo; marcapiano sottile e netto */
  return canvasTex(1024, 256, (c, w, h) => {
    const R = rng(9), n = 8, pw = w / n;
    for (let i = 0; i < n; i++) { const v = 188 + R() * 52, g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, `rgb(${v + 4},${v + 8},${v + 12})`); g.addColorStop(1, `rgb(${v - 10},${v - 6},${v - 2})`); c.fillStyle = g; c.fillRect(i * pw, 0, pw + 1, h); }
    c.fillStyle = 'rgba(70,76,84,0.14)'; c.fillRect(0, h - 10, w, 10);
    c.fillStyle = 'rgba(245,240,230,0.18)'; c.fillRect(0, h - 11, w, 1);
    for (let i = 0; i < n; i++) { const x = i * pw; c.fillStyle = 'rgba(236,214,180,0.95)'; c.fillRect(x, 0, 10, h); c.fillStyle = 'rgba(255,248,232,0.9)'; c.fillRect(x + 2, 0, 3, h); c.fillStyle = 'rgba(40,44,50,0.5)'; c.fillRect(x + 10, 0, 4, h); }
  }, { repeat: [1, 1] });
}
function nucleoTex() { return canvasTex(256, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#f2e6d8'); g.addColorStop(1, '#d9c6b0'); c.fillStyle = g; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(30,18,10,0.35)'; c.fillRect(0, h - 30, w, 30); }, { repeat: [1, 1] }); }
function bandTex(p) {   // bronzo a fasce orizzontali (ogni piano)
  return canvasTex(256, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#fbf1e4'); g.addColorStop(1, '#e8d6c0'); c.fillStyle = g; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(60,32,12,0.32)'; c.fillRect(0, h - 26, w, 26); c.fillStyle = 'rgba(40,20,6,0.22)'; for (let x = 0; x < w; x += 64) c.fillRect(x, 0, 3, h); c.fillStyle = 'rgba(255,224,180,0.35)'; c.fillRect(0, 0, w, 5); }, { repeat: [1, 1] });
}
function soffittoTex() {   /* soffitto dello sbalzo: champagne-bronzo, più scuro verso la stanza, un giunto a ventaglio per ripetizione */
  return canvasTex(256, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#f2dcc0'); g.addColorStop(1, '#a88866'); c.fillStyle = g; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(60,38,20,0.55)'; c.fillRect(0, 0, 3, h); c.fillStyle = 'rgba(255,240,215,0.35)'; c.fillRect(3, 0, 2, h); }, { repeat: [1, 1] });
}
function atrioTex() {   /* atrio a doppia altezza: vetro chiaro, montanti fino a terra, interno caldo con le luci, porte */
  return canvasTex(512, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#6f675e'); g.addColorStop(0.5, '#5a4e42'); g.addColorStop(1, '#3f3329'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 48) { const r = c.createRadialGradient(x + 24, h * 0.22, 2, x + 24, h * 0.22, 30); r.addColorStop(0, 'rgba(255,224,170,0.85)'); r.addColorStop(1, 'rgba(255,200,130,0)'); c.fillStyle = r; c.fillRect(x, 0, 48, h * 0.6); }
    const fl = c.createLinearGradient(0, h * 0.55, 0, h); fl.addColorStop(0, 'rgba(255,196,128,0.0)'); fl.addColorStop(1, 'rgba(255,190,120,0.35)'); c.fillStyle = fl; c.fillRect(0, h * 0.55, w, h * 0.45);
    c.fillStyle = 'rgba(70,64,58,0.85)'; for (let x = 0; x < w; x += 24) c.fillRect(x, 0, 2, h); c.fillRect(0, 0, w, 3); c.fillRect(0, h * 0.5, w, 2); }, { repeat: [1, 1] });
}
