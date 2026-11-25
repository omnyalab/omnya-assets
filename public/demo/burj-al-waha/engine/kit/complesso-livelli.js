// Motore choose-your · adattatore dei livelli del «choose your villa» sul lago (23/11/2026, cartella 17), sulla pianta ricalcata dalla foto 2.
// Livelli per id: ville (apertura = la camera della foto 2: drone a 60 m, obliquo) → dentro1 (un solo volo dritto nella villa grande, si guarda il retro: piscina e giardino)
// → fronte (No: si esce dal retro sopra la piscina e il prato, si sale sopra la spiaggia e si guardano le ville della riva nord di fronte) → dentro2 (volo dritto nella villa 2) → fine (Yes).
// REGOLA SMOOTH (Nico 23/11): lo sguardo resta sempre a nord (yaw 0, niente rollio) per tutto il giro: niente destra-sinistra, niente girate.
// I voli sono curve di Bézier in 3D percorse «a zoom costante» (la distanza che resta cala in modo esponenziale, partenza e arrivo morbidi).
import * as THREE from 'three';
import { complesso } from './complesso.js';
import { vetro } from './quartiere-ui2.js';
import { rr, testo } from './quartiere-ui.js';
import { BTN, INK, ora } from './tinta.js';

const sstep = t => { t = Math.max(0, Math.min(1, t)); return t * t * t * (t * (t * 6 - 15) + 10); };
const D2R = Math.PI / 180;

// Bézier quadratica in 3D (punti [x, y, z] del mondo) campionata a lunghezza d'arco
function bezier(A, C, B, N = 3000) {
  const P = [], S = [0]; for (let i = 0; i <= N; i++) { const s = i / N, a = (1 - s) * (1 - s), b = 2 * s * (1 - s), c = s * s; P.push([0, 1, 2].map(k => a * A[k] + b * C[k] + c * B[k])); if (i) S.push(S[i - 1] + Math.hypot(...[0, 1, 2].map(k => P[i][k] - P[i - 1][k]))); }
  const L = S[N], at = l => { l = Math.max(0, Math.min(L, l)); let lo = 0, hi = N; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S[m] < l) lo = m; else hi = m; } const u = (l - S[lo]) / ((S[hi] - S[lo]) || 1); return [0, 1, 2].map(k => P[lo][k] + (P[hi][k] - P[lo][k]) * u); };
  return { L, at };
}
/* volo «a zoom costante» con lo sguardo fisso a nord: verso 'dentro' = la distanza che resta scende in modo esponenziale fino a c; 'fuori' = la distanza fatta cresce da c */
export function volo({ A, C, B, c = 12, verso = 'dentro', p0, p1, f0 = 50, f1 = 50, kp = 1, yaw = 0 }) {
  const bz = bezier(A, C, B), L = bz.L, y0 = yaw * D2R;
  return t => {
    const e = sstep(t), fatto = verso === 'dentro' ? L - ((L + c) * Math.pow(c / (L + c), e) - c) : c * Math.pow((L + c) / c, e) - c;
    const p = bz.at(fatto), pit = (p0 + (p1 - p0) * Math.pow(e, kp)) * D2R;
    return { pos: p, tgt: [p[0] - Math.sin(y0) * Math.cos(pit) * 100, p[1] + Math.sin(pit) * 100, p[2] + Math.cos(y0) * Math.cos(pit) * 100], fov: f0 + (f1 - f0) * e };
  };
}

/* girata da ferma (Nico 23/11: le svolte solo a camera ferma): lo sguardo passa da yaw0 a yaw1 con partenza e arrivo morbidi */
export function gira({ pos, y0, y1, p0, p1, f0 = 52, f1 = 52 }) {
  return t => { const e = sstep(t), y = (y0 + (y1 - y0) * e) * D2R, p = (p0 + (p1 - p0) * e) * D2R;
    return { pos: [...pos], tgt: [pos[0] - Math.sin(y) * Math.cos(p) * 100, pos[1] + Math.sin(p) * 100, pos[2] + Math.cos(y) * Math.cos(p) * 100], fov: f0 + (f1 - f0) * e }; };
}

export function costruisciComplesso(S) {
  const sol = S.looks[S.lookIniziale].sole, el = sol.alt * D2R, az = sol.az * D2R, dirSole = new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
  const P = S.pianta, Hd = P.ville.H, ex = [(Hd.b[0] - Hd.a[0]) / Hd.lungo, (Hd.b[1] - Hd.a[1]) / Hd.lungo], n = Hd.n, ING = S.ingresso ?? 11.5, AX = ING + 2.1;
  const Hw = (X, Z) => [Hd.a[0] + ex[0] * X + n[0] * Z, Hd.a[1] + ex[1] * X + n[1] * Z];   // punto locale della villa grande → pianta (u, v)
  // corridoio del giro (in pianta): niente palme dove la camera vola bassa
  const caps = [[Hw(AX, -40), Hw(AX, 2), 7], [Hw(AX, 14), Hw(AX, 30), 7], [Hw(AX - 4, 30), Hw(AX - 4, 95), 16], [Hw(AX, 36), Hw(AX, 36), 24], [Hw(Hd.lungo / 2, 22), Hw(Hd.lungo / 2, 95), 30]];   // + giardino aperto dietro la villa grande fino al lago (Nico 23/11: «togli questi alberi dietro»)   // + giardino libero intorno alla sosta (parallasse pari ai due lati)   // davanti all'ingresso, e un varco largo dietro casa: da dentro si vedono piscina, prato, lago e skyline
  const F4 = P.ville.F4, ex4 = [(F4.b[0] - F4.a[0]) / F4.lungo, (F4.b[1] - F4.a[1]) / F4.lungo], m4 = [(F4.a[0] + F4.b[0]) / 2, (F4.a[1] + F4.b[1]) / 2];
  const V2w = (X, Z) => [m4[0] + ex4[0] * X + F4.n[0] * Z, m4[1] + ex4[1] * X + F4.n[1] * Z];
  caps.push([V2w(-0.85, -45), V2w(-0.85, 2), 7]);
  const distSeg = (p, a, b) => { const d = [b[0] - a[0], b[1] - a[1]], l2 = d[0] * d[0] + d[1] * d[1], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / l2)); return Math.hypot(p[0] - a[0] - d[0] * t, p[1] - a[1] - d[1] * t); };
  const corridoio = (u, v) => caps.some(([a, b, r]) => distSeg([u, v], a, b) < r);
  const C = complesso({ pianta: P, citta: S.citta, sole: dirSole, pal2: S.ville?.[1]?.palette, distBurj: S.distBurj, burjDestra: S.burjDestra, corridoio, ingresso: ING, spostaBox: S.spostaBox });
  const G = C.gruppo, E = C.eroe, V2 = C.V2, idDi = liv => S.livelli[liv] && S.livelli[liv].id, R = S.riprese;
  const occhi = E.misure.Y0 + 1.6;
  const W3 = ([u, v], y) => [-u, y, v];   // pianta → mondo

  // ---------------- i voli ----------------
  const K0 = R.apertura, K3 = R.frontale, pitchDi = s => Math.atan2(s.tgt[1] - s.pos[1], Math.hypot(s.tgt[0] - s.pos[0], s.tgt[2] - s.pos[2])) / D2R;
  const IN1 = W3(Hw(AX, S.dentro.z), occhi), C1 = W3(Hw(AX, S.dentro.ctrl), occhi + S.dentro.alzo);
  const B2y = V2.misure.Y0 + 1.6, IN2 = W3(V2w(-0.85, S.dentro2.z), B2y), C4 = W3(V2w(-0.85, S.dentro2.ctrl), B2y + S.dentro2.alzo);
  const CU = W3(Hw(AX, S.uscita.ctrl), occhi + 0.2);
  const V = {
    dentro1: volo({ A: K0.pos, C: C1, B: IN1, c: S.dentro.c, p0: pitchDi(K0), p1: S.dentro.pitch, f0: K0.fov, f1: S.dentro.fov, kp: S.dentro.kp }),
    fronte: volo({ A: IN1, C: CU, B: K3.pos, c: S.uscita.c, verso: 'fuori', p0: S.dentro.pitch, p1: pitchDi(K3), f0: S.dentro.fov, f1: K3.fov, kp: S.uscita.kp }),
    dentro2: volo({ A: K3.pos, C: C4, B: IN2, c: S.dentro2.c, p0: pitchDi(K3), p1: S.dentro2.pitch, f0: K3.fov, f1: S.dentro2.fov, kp: S.dentro2.kp }),
  };
  const chiavi = (f, dur, nk = 120, coda = 0) => { const k = []; for (let i = 1; i <= nk; i++) { const t = i / nk, p = f(t); k.push({ ...p, t: t * dur }); } if (coda) { const p = f(1), q = f(0.995), d = [0, 1, 2].map(j => p.pos[j] - q.pos[j]), l = Math.hypot(...d) || 1; k.push({ ...p, pos: p.pos.map((v, j) => v + d[j] / l * coda), t: dur + 3 }); } return k; };
  const DUR = S.durate;
  // ---------------- giro N di Nico (23/11): davanti con la Lambo → dentro → cucina → salone → giardino → girata sulla casa → su a vederne altre ----------------
  const L3 = (X, y, Z) => W3(Hw(X, Z), y), G9 = S.giroN;
  const P1 = L3(AX, G9.davanti.y, G9.davanti.z), P2 = L3(AX, occhi, G9.dentro.z), P3 = L3(AX, G9.giardino.y, G9.giardino.z), P4 = L3(AX, G9.su.y, G9.su.z);
  const SEG = {
    K1: volo({ A: K0.pos, C: L3(AX, G9.davanti.y + G9.k1.alzo, G9.k1.ctrl), B: P1, c: G9.k1.c, p0: pitchDi(K0), p1: G9.davanti.pitch, f0: K0.fov, f1: G9.fov, kp: G9.k1.kp ?? 1.2 }),
    K2: volo({ A: P1, C: P1.map((v, i) => (v + P2[i]) / 2), B: P2, c: G9.k2.c, p0: G9.davanti.pitch, p1: G9.dentro.pitch, f0: G9.fov, f1: G9.fov, kp: G9.k2.kp ?? 4 }),   // dritti lungo lo sguardo, ci si raddrizza solo dentro
    K3: gira({ pos: P2, y0: 0, y1: G9.cucina.yaw, p0: G9.dentro.pitch, p1: G9.cucina.pitch, f0: G9.fov, f1: G9.fovGira }),
    K4: gira({ pos: P2, y0: G9.cucina.yaw, y1: 0, p0: G9.cucina.pitch, p1: G9.dentro.pitch, f0: G9.fovGira, f1: G9.fov }),
    K5: volo({ A: P2, C: L3(AX, occhi + 0.1, G9.k5.ctrl), B: P3, c: G9.k5.c, verso: 'dentro', p0: G9.dentro.pitch, p1: G9.giardino.pitch, f0: G9.fov, f1: G9.fov }),
    K6: gira({ pos: P3, y0: 0, y1: G9.girata.yaw / 2, p0: G9.giardino.pitch, p1: G9.girata.pitch, f0: G9.fovGira, f1: G9.fovGira }),          // girata in due metà più lente (90° ciascuna)
    K6b: gira({ pos: P3, y0: G9.girata.yaw / 2, y1: G9.girata.yaw, p0: G9.girata.pitch, p1: G9.girata.pitch, f0: G9.fovGira, f1: G9.fov }),
    K7: gira({ pos: P3, y0: G9.girata.yaw, y1: G9.girata.yaw, p0: G9.girata.pitch, p1: G9.su.pitch, f0: G9.fov, f1: G9.fov }),   // da fermi lo sguardo scende sul giardino e sulla piscina
    K8: volo({ A: P3, C: [P3[0], (P3[1] + G9.su.y) / 2, P3[2]], B: L3(AX, G9.su.y, G9.giardino.z), c: G9.k7.c, verso: 'fuori', p0: G9.su.pitch, p1: G9.su.pitch, f0: G9.fov, f1: G9.su.fov, yaw: G9.girata.yaw }),   // poi su dritti guardando giù: la casa e le ville intorno dall'alto
  };

  // ---------------- ville da scegliere: prese invisibili sul lotto ----------------
  const prese = new THREE.Group(); prese.name = 'prese'; G.add(prese); const mP = new THREE.MeshBasicMaterial({ visible: false }), scegli = [];
  const presa = (id, c, ang, w, d, h, extra) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mP); m.position.set(-c[0], h / 2, c[1]); m.rotation.y = ang; m.updateMatrixWorld(); m.userData = { id, ...extra }; prese.add(m); scegli.push(m); return m; };
  presa('H', Hw(Hd.lungo / 2, Hd.prof / 2 - 4), Math.atan2(ex[1], ex[0]), Hd.lungo + 4, Hd.prof + 16, 8, { villa: 1 });
  presa('V2', V2w(0, 10), Math.atan2(ex4[1], ex4[0]), 24, 24, 9, { villa: 2 });
  for (const v of C.ville) presa(v.id, v.c, v.L.th, v.lun + 4, v.V.prof + 4, v.h + 1, { villa: 0, lotto: v });

  // ---------------- luce arancio sulla villa (come «choose your floor»: ambra sfumata che svanisce ai bordi) ----------------
  const mLuce = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { col: { value: new THREE.Color(S.colori.scelta) }, k: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform vec3 col; uniform float k; varying vec3 vP;
      void main(){ vec2 q = abs(vP.xz) / vec2(0.5); float bordo = 1. - smoothstep(0.55, 1.0, max(q.x, q.y)); float alto = 1. - smoothstep(0.0, 1.0, vP.y + 0.5);
        gl_FragColor = vec4(col * k * bordo * (0.25 + 0.75 * alto) * 0.55, 1.); }` });
  const luci = new Map();
  const luceDi = m => { if (luci.has(m)) return luci.get(m); const g = m.geometry.parameters, L = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mLuce.clone()); L.scale.set(g.width + 2, g.height + 2, g.depth + 2); L.position.copy(m.position); L.position.y = g.height / 2 + 0.2; L.rotation.copy(m.rotation); L.renderOrder = 8; L.visible = false; G.add(L); luci.set(m, L); return L; };
  let accesa = null, camOra = [0, 0, 0], dentroK = 0;

  const M = {
    gruppo: G, ombra: 420, complesso: C, voli: V, chiavi, prese: scegli,
    ripresa(liv, nodo, st) {
      const id = idDi(liv);
      if (id === 'ville') return R.apertura;
      if (id === 'dentro1') return { arrivo: DUR.dentro1, percorso: chiavi(V.dentro1, DUR.dentro1, 140, 0.3) };
      if (id === 'fronte') return { arrivo: DUR.fronte, percorso: chiavi(V.fronte, DUR.fronte, 140, 1.0) };
      if (id === 'dentro2') return { arrivo: DUR.dentro2, percorso: chiavi(V.dentro2, DUR.dentro2, 140, 0.3) };
      return null;
    },
    // fotogramma preciso di un volo (per le foto, le maschere e i tagli delle clip): ?shot=dentro1@4.0
    ripresaNome(nm) { const k = /^(K\d+b?)@([\d.]+)$/.exec(nm); if (k) return { ...SEG[k[1]](+k[2] / S.giroN.durate[k[1]]) }; const m = /^(dentro1|fronte|dentro2)@([\d.]+)$/.exec(nm); if (!m) return null; return { ...V[m[1]](+m[2] / DUR[m[1]]) }; },
    seg: (n, t) => SEG[n](t), SEG,
    trova(liv, ray, st) {
      const id = idDi(liv); if (id !== 'ville' && id !== 'fronte') return null;
      const h = ray.intersectObjects(scegli, false)[0]; if (!h) return null; const d = h.object.userData;
      if (id === 'ville' && d.villa === 2) return null; if (id === 'fronte' && d.villa === 1) return null;
      return { id: d.id, presa: h.object, villa: d.villa, esaurito: d.villa === 0 && !S.tutteScegliibili };
    },
    accendi(st) { const h = st.hover || st.sel[st.liv - 1]; accesa = h && h.presa ? h.presa : null; },
    etichetta: () => null,
    ancora: () => new THREE.Vector3(),
    punto(p, st, proietta, ui) {
      if (p.bottone) { const b = ui.btns.find(b => b.id === p.bottone); return b ? b.c : null; }
      if (p.villa) { const m = scegli.find(m => m.userData.id === p.villa); const q = proietta(m.position.clone().add(new THREE.Vector3(0, 2, 0))); return [q[0], q[1]]; }
      return p.xy || null;
    },
    ogniFrame(t, st, cam) {
      camOra = [cam.pos.x, cam.pos.y, cam.pos.z]; const id = idDi(st.liv), sc = G.parent;
      for (const [m, L] of luci) { const on = m === accesa && (id === 'ville' || id === 'fronte' || cam.pos.y > 14); const k0 = L.material.uniforms.k.value, k = k0 + ((on ? 1 : 0) - k0) * (on ? 0.16 : 0.1); L.material.uniforms.k.value = k; L.visible = k > 0.01; }
      if (accesa) luceDi(accesa);
      const s1 = E.aggiorna(t, camOra), s2 = V2.aggiorna(t, camOra); V2.lanterna(S.luceCasa ?? 0.35);
      C.acqua.material.uniforms.time.value = t * 0.35;
      if (sc) { const emi = sc.children.find(o => o.isHemisphereLight); if (emi) { if (emi.userData.i0 == null) emi.userData.i0 = emi.intensity; if (sc.userData.e0 == null) sc.userData.e0 = sc.environmentIntensity;
        const kIn = s1.dentro || s2.dentro ? 1 : 0; dentroK += (kIn - dentroK) * 0.08; emi.intensity = emi.userData.i0 * (1 - 0.5 * dentroK); sc.environmentIntensity = sc.userData.e0 * (1 - 0.4 * dentroK); }
        const sun = sc.children.find(o => o.isDirectionalLight); if (sun) {   // ombre nitide da vicino, larghe dall'alto
          const fwd = new THREE.Vector3().subVectors(cam.tgt, cam.pos).normalize(), h = Math.max(1.5, cam.pos.y), d = fwd.y < -0.05 ? Math.min(h / -fwd.y, 700) : Math.min(60, h * 20), Cc = cam.pos.clone().addScaledVector(fwd, d * (h < 20 ? 0.5 : 0.75)); Cc.y = 0;
          const ext = Math.min(520, Math.max(60, h * 2.6 + (h < 20 ? 40 : 110))), dir = sun.userData.dir || (sun.userData.dir = sun.position.clone().normalize());
          sun.target.position.copy(Cc); sun.position.copy(Cc).addScaledVector(dir, 2400); const scm = sun.shadow.camera;
          if (Math.abs(scm.right - ext) > 1) { scm.left = scm.bottom = -ext; scm.right = scm.top = ext; scm.far = 6000; scm.updateProjectionMatrix(); sun.shadow.normalBias = ext / 4096 * 1.6; sun.shadow.bias = -0.0002; }
          sun.target.updateMatrixWorld(); }
        if (sc.fog && S.nebbia) sc.fog.density = S.nebbia(cam.pos.y); }
    },
    reset() { accesa = null; for (const [, L] of luci) { L.material.uniforms.k.value = 0; L.visible = false; } dentroK = 0; },
    pannello(c, st, now, ui, fermo) {
      const id = idDi(st.liv), a = Math.min(1, Math.max(0, (now - st.tIn) / 0.5));
      if ((id === 'dentro1' || id === 'dentro2') && fermo) domanda(c, ui, 1 - Math.pow(1 - a, 3), st.hBtn, 'liv:' + S.livelli.findIndex(l => l.id === 'fine'), 'liv:' + S.livelli.findIndex(l => l.id === 'fronte'));
    },
  };
  return M;
}

// card «Is this your villa?» al centro: vetro scuro U6, Yes pieno arancio, No vetro (Nico 22/11: card grandi e leggibili)
function bottone(c, ui, x, y, w, h, t, id, pieno, hov) {
  c.save(); c.shadowColor = pieno ? ora(0.55) : 'rgba(0,0,0,0.3)'; c.shadowBlur = 28; c.shadowOffsetY = 8; rr(c, x, y, w, h, h / 2);
  c.fillStyle = pieno ? BTN : (hov ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.14)'); c.fill(); c.restore();
  if (!pieno) { rr(c, x + 0.75, y + 0.75, w - 1.5, h - 1.5, h / 2); c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1.5; c.stroke(); }
  c.save(); c.shadowColor = 'rgba(0,0,0,0.28)'; c.shadowBlur = 6; c.shadowOffsetY = 1; testo(c, t, x + w / 2, y + h / 2 + 11, '32px SFD', pieno ? INK : '#fff', 0, 'center'); c.restore(); ui.btns.push({ id, r: [x, y, x + w, y + h], c: [x + w / 2, y + h / 2] });
}
export function domanda(c, ui, a = 1, hBtn = null, idSi = 'si', idNo = 'no') {
  const w = 800, h = 320, x = ui.W / 2 - w / 2, y = ui.H / 2 - h / 2 + (1 - a) * 24; c.save(); c.globalAlpha = a; vetro(c, ui, x, y, w, h, 52, { scuro: 0.5 });
  testo(c, 'Is this your villa?', ui.W / 2, y + 126, '70px SFD', '#fff', -1, 'center');
  const bw = 318, by = y + h - 122; bottone(c, ui, x + w / 2 - bw - 12, by, bw, 82, 'Yes', idSi, true, hBtn === idSi); bottone(c, ui, x + w / 2 + 12, by, bw, 82, 'No', idNo, false, hBtn === idNo); c.restore();
}
