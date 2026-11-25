// Motore choose-your · adattatore dei livelli per gli stadi: Mondo → Tribuna → Blocco → Posti (2) → Dentro.
// Il soggetto dà solo nomi, prezzi, disponibilità, riprese del mondo e della pianta: il resto lo calcola da qui.
import * as THREE from 'three';
import { stadio } from './stadio.js';
import { paesaggio } from './paesaggio.js';
import { interni } from './stadio-interni.js';
import { boxVip } from './stadio-vip.js';
import { rng, clamp, lerp, sePoint } from './forme.js';

export function costruisciStadio(S) {
  const info = stadio(S.modello), land = paesaggio(S.paesaggio(info));
  const IN = interni(info, S.modello, rng(5)), G = new THREE.Group(); G.add(land.gruppo, info.gruppo, IN.gruppo);
  // box VIP con le poltrone in pelle, sotto la balconata del blocco dei giri (tribuna ovest)
  const BV = info.blocks.find(B => B.id === (S.vip && S.vip.blocco)) || info.blocks[0], VIP = S.vip ? boxVip(info, S.modello, { angolo: (BV.t0 + BV.t1) / 2, ...S.vip }) : null;
  if (VIP) G.add(VIP.gruppo);
  const vetri = []; info.gruppo.traverse(o => { if (o.name === 'skybox-vetri') vetri.push(o); });
  if (VIP && vetri.length) { const m = vetri[0].material, b = VIP.buco;
    m.onBeforeCompile = sh => { sh.uniforms.buco = { value: new THREE.Vector4(...b) };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp; uniform vec4 buco;').replace('void main() {', 'void main() { if (distance(vWp.xz, buco.xz) < buco.w && abs(vWp.y - buco.y) < 4.0) discard;'); }; m.needsUpdate = true; }
  const QS = new URLSearchParams(location.search), follaSempre = QS.get('folla') === '1' || S.follaSempre === true;
  const { seats, blocks, zones, posti } = info, N = seats.N, col = info.coloriBase.slice(), base = info.coloriBase;
  const OR = new THREE.Color(S.colori.scelta), ORL = new THREE.Color(S.colori.sceltaChiara), GREY = new THREE.Color(S.colori.preso), DIM = new THREE.Color(S.colori.spento);
  const CAT = (S.categorie || []).map(c => new THREE.Color(c.colore)), catDi = B => (S.anelli[B.anello].cat ?? 0), colCat = B => CAT[catDi(B)] || OR, BIANCO = new THREE.Color('#ffffff'), ORO = new THREE.Color(S.oroVip || '#e3c27a');
  // evidenze per la versione vera: deboli (liberi della categoria) e forti (sotto il mouse, scelti), colore pieno per ogni posto
  info.evidD = new Float32Array(N * 3); info.evidF = new Float32Array(N * 3); info.evidVip = [];

  // disponibilità ripetibile: ogni blocco ha il suo riempimento, ogni posto un suo numero fisso
  const R = rng(S.seme || 21), fill = blocks.map(B => { const z = zones[B.zona]; return z.esaurito ? 1 : clamp((z.pieno ?? 0.55) + (R() - 0.5) * 0.3, 0.05, 0.97); });
  const h01 = i => { let x = (i + 1) * 2654435761 >>> 0; x ^= x >>> 16; x = Math.imul(x, 2246822507) >>> 0; x ^= x >>> 13; return (x >>> 0) / 4294967296; };
  const preso = i => h01(i) < fill[seats.blk[i]] && !(S.sempreLiberi || []).some(([b, r, n]) => blocks[seats.blk[i]].id === b && seats.row[i] === r && Math.abs(seats.num[i] - n) <= 1);
  const liberi = B => { let n = 0; for (let i = B.s0; i < B.s1; i++) if (!preso(i)) n++; return n; };
  blocks.forEach(B => { B.liberi = liberi(B); B.esaurito = B.liberi === 0; });
  if (S.follaSuiPresi !== false) IN.soloPresi(preso);
  zones.forEach(z => { z.liberi = z.blocks.reduce((a, B) => a + B.liberi, 0); });

  // centri (per biglietti e riprese)
  const cen = (i0, i1, filtro = () => true) => { const v = new THREE.Vector3(); let n = 0; for (let i = i0; i < i1; i++) if (filtro(i)) { v.x += seats.x[i]; v.y += seats.y[i]; v.z += seats.z[i]; n++; } return v.multiplyScalar(1 / Math.max(1, n)); };
  blocks.forEach(B => { const mid = B.righe[Math.floor(B.righe.length / 2)]; B.c = cen(mid.s0, mid.s0 + mid.n); B.top = cen(B.righe[B.righe.length - 1].s0, B.righe[B.righe.length - 1].s0 + B.righe[B.righe.length - 1].n); });
  zones.forEach(z => { const bs = z.blocks.filter(B => B.anello === 1 || z.blocks.every(b => b.anello !== 1)); z.c = bs.reduce((v, B) => v.add(B.c), new THREE.Vector3()).multiplyScalar(1 / Math.max(1, bs.length)); });
  zones.forEach(z => { const bs = z.blocks.filter(B => B.anello === 0), src = bs.length ? bs : z.blocks; z.c0 = src.reduce((v, B) => { const r = B.righe[Math.floor(B.righe.length * 0.3)]; return v.add(cen(r.s0, r.s0 + r.n)); }, new THREE.Vector3()).multiplyScalar(1 / Math.max(1, src.length)); });   // il centro dell'anello basso: si vede anche dalla pianta

  // nodi
  const nZona = z => ({ id: 'z' + z.i, liv: 1, z, esaurito: z.esaurito || z.liberi === 0 });
  const nBlocco = B => ({ id: 'b' + B.id, liv: 2, B, esaurito: B.esaurito });
  const nPosto = i => ({ id: 's' + i, liv: 3, i, preso: preso(i), B: blocks[seats.blk[i]] });
  const price = B => Math.round(zones[B.zona].prezzo * S.anelli[B.anello].per / 50) * 50;
  const fmt = n => n.toLocaleString('en-US') + ' ' + S.valuta;

  // tetto: sparisce sopra la pianta, torna quando si scende nel catino
  const roofMats = []; info.tetto.traverse(o => { if (o.material && !roofMats.includes(o.material)) roofMats.push(o.material); });
  let roof0 = 1, roofT = 1, roofNow = 1;
  function setRoof(a) { roofNow = a; info.tetto.visible = a > 0.01; for (const m of roofMats) { const tr = a < 0.999; if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } m.opacity = a; m.depthWrite = !tr; } }

  const M = {
    gruppo: G, ombra: S.modello.ombra || 230, info, interni: IN, vip: VIP, pronta: IN.pronta, fariPos: S.modello.fari || [0, 60, 0],
    ogniFrame(t) { IN.anima(t); },
    ripresa(liv, nodo, st) {
      roof0 = roofNow; roofT = liv === 1 && !S.riprese.zoneDentro ? 0 : 1;
      if (liv === 0) return S.riprese.mondo;
      if (liv === 1 && S.intro) return { ...S.riprese.pianta, dur: S.riprese.pianta.dur || 4 };   // con l'inizio a strisce sei già sopra lo stadio: giù dritto nell'oculo
      if (liv === 1 && S.riprese.sopra) return { ...S.riprese.sopra, dur: S.riprese.sopra.dur, poi: { ...S.riprese.pianta, dur: S.riprese.pianta.dur || 4 } };   // prima su sopra lo stadio, poi giù dentro l'oculo
      if (liv === 1) return S.riprese.pianta;
      if (liv === 2) { const c = nodo.z.c, d = new THREE.Vector3(c.x, 0, c.z).normalize(), a = S.modello.pianta.a * 0.82, b = S.modello.pianta.b * 0.82;
        return { pos: [-d.x * a, S.riprese.altZona || 30, -d.z * b], tgt: [c.x, c.y - 4, c.z], fov: 44 }; }
      if (liv === 3) { const B = nodo.B, n = new THREE.Vector3(-B.c.x, 0, -B.c.z).normalize(), dist = S.riprese.distBlocco || 24;
        return { pos: [B.c.x + n.x * dist, B.c.y + 9, B.c.z + n.z * dist], tgt: [B.c.x, B.c.y - 1, B.c.z], fov: 42 }; }
      const tipo = S.livelli[liv].tipo;
      if (tipo === 'upgrade') return null;   // la camera resta sui due posti, arriva la domanda
      if (tipo === 'vip') return { ...VIP.fuori, dur: S.livelli[liv].volo || 2.6 };   // davanti alla vetrata del box, si vedono le poltrone
      if (tipo === 'dentro' && st.vip && st.vip.length) {   // entri nel box, ti siedi e ti giri verso il campo
        const sd = VIP.seduto(st.vip[0]), e = new THREE.Vector3(...sd.pos), back = new THREE.Vector3(...VIP.fuori.pos), dir = back.clone().sub(e).setY(0).normalize();
        const davanti = e.clone().add(dir.clone().multiplyScalar(1.6)).setY(e.y + 0.35);
        return { pos: davanti.toArray(), tgt: e.clone().sub(dir.clone().multiplyScalar(3)).setY(e.y - 0.6).toArray(), fov: 50, dur: 1.8, poi: { ...sd, dur: 2.2, gira: S.giraVip || 1 } }; }
      if (tipo === 'dentro') { const i = st.scelti[0].i, j = st.scelti[1] ? st.scelti[1].i : i, x = (seats.x[i] + seats.x[j]) / 2, z = (seats.z[i] + seats.z[j]) / 2, y = seats.y[i], l = Math.hypot(x, z);
        const vista = { pos: [x + x / l * 0.35, y + 1.25, z + z / l * 0.35], tgt: [x * 0.12, y * (S.vistaAlta ?? 0.42), z * 0.12], fov: S.fovPosto || 66 };   // seduto: gli occhi sul tuo posto, la vista vera
        if (!S.entraNelPosto) return vista;
        // entri nel posto guardandolo (davanti, un po' sopra), poi ti siedi e la camera si gira verso il campo
        const ux = x / l, uz = z / l, sopra = { pos: [x - ux * 3.2, y + (S.entraNelPosto.alto ?? 2.6), z - uz * 3.2], tgt: [x, y + 0.6, z], fov: 58, dur: (S.entraNelPosto.a ?? 2) };
        return { ...sopra, poi: { ...vista, dur: S.entraNelPosto.b ?? 2, gira: 1 } }; }
      if (tipo === 'booked') return { ...S.riprese.booked, dur: S.livelli[liv].volo || 4 };   // si torna su, sopra lo stadio
    },
    via(liv, cam, shot) {   // un solo punto di passaggio quando si scende dalla pianta nel catino (giù dritti dall'oculo, poi avanti)
      if (liv === 1 && S.intro && cam.pos.y > 300) return S.riprese.pianta.via || null;   // inizio a strisce: da sopra lo stadio giù dal centro dell'oculo
      const tp = S.livelli[liv].tipo;
      if (tp === 'zone' && S.riprese.viaZone && !S.riprese.sopra && cam.pos.y > 100) return S.riprese.viaZone;   // da fuori dritti nell'oculo
      if (tp === 'booked') return cam.pos.y < 70 ? [cam.pos.x * 0.5, cam.pos.y + 6, cam.pos.z * 0.5] : [cam.pos.x * 0.15, S.riprese.viaBooked || 120, cam.pos.z * 0.15];   // dal box prima avanti sopra il catino (senza passare nella pietra), poi su dall'oculo
      if (tp === 'blocchi' && cam.pos.y < 100 && S.livelli[S.livelli.length - 1] && Math.hypot(cam.pos.x, cam.pos.z) > 40) return [cam.pos.x * 0.55, Math.max(cam.pos.y, shot.pos[1]) + 6, cam.pos.z * 0.55];   // dal posto torni al centro e guardi la tribuna
      if (liv === 2 && cam.pos.y > 150) return [shot.pos[0] * 0.6, 95, shot.pos[2] * 0.6];
      if (liv === 2) return null;
      if (liv === 1 && cam.pos.y < 120) return [cam.pos.x * 0.6, 120, cam.pos.z * 0.6];
      return null;
    },
    dopoCamera(cam, u) { setRoof(lerp(roof0, roofT, roofT < roof0 ? clamp(u * 1.6) : clamp((u - 0.35) / 0.65))); },
    trova(liv, ray, st) {
      const tp = S.livelli[liv].tipo;
      if (tp === 'vip') { const h = ray.intersectObject(VIP.gruppo, true).find(x => x.object.userData.vip != null); if (!h) return null; const k = h.object.userData.vip; return { id: 'v' + k, k, liv }; }
      if (liv === 0 || liv >= 4) return null;
      const hit = ray.intersectObject(info.proxy, false)[0]; if (!hit) return null;
      const bi = info.proxy.userData.faceBlk[hit.faceIndex], B = blocks[bi];
      if (liv === 1) return nZona(zones[B.zona]);
      if (liv === 2) return B.zona === st.sel[1].z.i ? nBlocco(B) : null;
      if (liv === 3) { if (B !== st.sel[2].B) return null; let best = -1, bd = 1e9; const p = hit.point;
        for (let i = B.s0; i < B.s1; i++) { const d = (seats.x[i] - p.x) ** 2 + (seats.y[i] + 0.5 - p.y) ** 2 + (seats.z[i] - p.z) ** 2; if (d < bd) { bd = d; best = i; } }
        return bd < 1.2 ? nPosto(best) : null; }
    },
    accendi(st) {
      col.set(base); const L = st.liv, put = (i, c) => { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; };
      const D = info.evidD, F = info.evidF; D.fill(0); F.fill(0); info.evidVip = [];
      const ev = (A, i, c, k = 1) => { A[i * 3] = c.r * k; A[i * 3 + 1] = c.g * k; A[i * 3 + 2] = c.b * k; };
      const range = (B, c) => { for (let i = B.s0; i < B.s1; i++) put(i, c); };
      const cat = (B, A, k = 1) => { const c = CAT.length ? colCat(B) : OR; for (let i = B.s0; i < B.s1; i++) { put(i, c); ev(A, i, c, k); } };
      if (L === 1) { for (const z of zones) if (z.esaurito) z.blocks.forEach(B => range(B, GREY)); if (st.hover) st.hover.z.blocks.forEach(B => cat(B, D)); }   // la tribuna sotto il mouse coi colori delle sue categorie
      if (L === 2) { const z = st.sel[1].z; for (const zz of zones) if (zz !== z) zz.blocks.forEach(B => range(B, DIM));
        z.blocks.forEach(B => { if (B.esaurito) range(B, GREY); else if (!st.hover || st.hover.B !== B) cat(B, D); }); if (st.hover) cat(st.hover.B, F); }   // tutti i blocchi liberi nel colore della categoria, quello sotto il mouse pieno
      if (L >= 3 && st.sel[2]) { const B = st.sel[2].B, c = CAT.length ? colCat(B) : OR; for (let i = B.s0; i < B.s1; i++) { if (preso(i)) put(i, GREY); else if (L === 3) { put(i, c); ev(D, i, c); } }
        if (L === 3 && st.hover && !st.hover.preso) { put(st.hover.i, BIANCO); ev(F, st.hover.i, BIANCO); if (S.livelli[3].coppia) { const v = M.vicino(st.hover); if (v) { put(v.i, BIANCO); ev(F, v.i, BIANCO); } } }
        for (const s of st.scelti) { put(s.i, c); if (L === 3) ev(F, s.i, c); } }
      posti.instanceColor.array.set(col); posti.instanceColor.needsUpdate = true;
      IN.follaVis(follaSempre || ['dentro', 'booked', 'vip'].includes(S.livelli[L].tipo)); if (['dentro', 'vip', 'booked'].includes(S.livelli[L].tipo)) { if (S.livelli[L].tipo === 'vip' || (st.vip && st.vip.length)) { const e = st.vip && st.vip.length ? VIP.poltrone[st.vip[0]].occhio : VIP.centro; IN.liberaPosti([], [e.x, e.y - 1.2, e.z]); if (IN.nascondiVicino) IN.nascondiVicino([e.x, e.y, e.z], S.vip.vuoto ?? 16); } else IN.liberaPosti(st.scelti.map(n => n.i)); }
      if (!M._corr) M._corr = IN.gruppo.getObjectByName('corrimano') || { visible: true }; M._corr.visible = !(S.livelli[L].tipo === 'vip' || (st.vip && st.vip.length && ['dentro', 'booked'].includes(S.livelli[L].tipo)));   // nel VIP niente corrimano della scala davanti alla vista
      if (VIP) { const tipoV = S.livelli[L].tipo === 'vip', hk = st.hover && st.hover.k != null ? st.hover.k : -1; VIP.colora(tipoV ? st.vip : [], hk);
        if (tipoV) { for (const k of st.vip) info.evidVip.push([VIP.poltrone[k].g, ORO, 1]); if (hk >= 0 && !st.vip.includes(hk)) info.evidVip.push([VIP.poltrone[hk].g, ORO, 1]); } }
    },
    categoria(B) { const k = catDi(B), c = (S.categorie || [])[k]; return c ? { ...c, k, prezzo: price(B) } : null; },
    etichetta(liv, n) {
      if (n.k != null) return { titolo: VIP.poltrone[n.k].nome, prezzo: fmt(S.vip.prezzo) };
      const zs = S.zone[n.z ? n.z.i : n.B.zona];
      if (liv === 1) { const z = n.z, minP = Math.min(...z.blocks.map(price)), cats = [...new Set(z.blocks.map(catDi))].sort().map(k => (S.categorie || [])[k] && S.categorie[k].colore).filter(Boolean); return { sopra: zs.sopra || 'Stand', titolo: z.nome, prezzo: z.esaurito ? '' : 'from ' + fmt(minP), stato: stato(z.esaurito ? 0 : z.liberi), cats }; }
      if (liv === 2) return { sopra: zones[n.B.zona].nome, titolo: n.B.nome, prezzo: n.B.esaurito ? '' : fmt(price(n.B)), stato: stato(n.B.liberi), cat: M.categoria(n.B) };
      if (liv >= 3) return { titolo: `Row ${seats.row[n.i]} · Seat ${seats.num[n.i]}`, prezzo: fmt(price(n.B)) };
    },
    ancora(liv, n) { if (n.k != null) return VIP.poltrone[n.k].occhio.clone().add(new THREE.Vector3(0, 0.1, 0)); if (liv === 1) return n.z.c0.clone().add(new THREE.Vector3(0, 4, 0)); if (liv === 2) return n.B.c.clone().add(new THREE.Vector3(0, 3, 0)); return new THREE.Vector3(seats.x[n.i], seats.y[n.i] + 1.1, seats.z[n.i]); },
    finale(st) {
      const s = st.scelti, B = s[0].B, nums = s.map(n => seats.num[n.i]).sort((a, b) => a - b), mappa = { anello: B.anello, t0: B.t0, t1: B.t1, pianta: S.modello.pianta, anelli: info.tiers.map(t => [t.d0, t.dEnd]) };
      if (st.vip && st.vip.length) { const v = st.vip.slice().sort((a, b) => a - b).map(k => VIP.poltrone[k].nome.split(' · ')), riga = v[0][0];
        return { sopra: S.biglietto.sopra, titolo: 'VIP Box ' + S.vip.numero, vip: true, righe: [['Stand', 'West Stand · VIP'], ['Box · Row', `${S.vip.numero} · ${riga.replace('Row ', '')}`], [v.length > 1 ? 'Seats' : 'Seat', v.map(x => x[1].replace('Seat ', '')).join(' & ')], ['Total', fmt(S.vip.prezzo * v.length)]], posti: v.length, nota: S.biglietto.nota, mappa, data: S.biglietto.data }; }
      return { sopra: S.biglietto.sopra, titolo: s.length > 1 ? `${s.length} seats together` : 'Your seat', righe: [['Stand', zones[B.zona].nome], ['Block · Row', `${B.id} · ${seats.row[s[0].i]}`], [s.length > 1 ? 'Seats' : 'Seat', nums.join(' & ')], ['Total', fmt(price(B) * s.length)]], posti: s.length, nota: S.biglietto.nota, mappa, data: S.biglietto.data };
    },
    offerta(st) { const B = st.scelti[0].B, n = st.scelti.length; return { titolo: 'Do you want an upgrade?', sotto: `VIP Box ${S.vip.numero} · VIP seats`, da: fmt(price(B) * n), a: fmt(S.vip.prezzo * n), n }; },
    punto(p, st, proietta, ui) {   // dove va il cursore finto per un passo del giro
      if (p.bottone) { const b = ui.btns.find(b => b.id === p.bottone); return b ? b.c : null; }
      if (p.zona != null) { const z = zones.find(z => z.nome === p.zona); return z ? proietta(z.c0.clone().add(new THREE.Vector3(0, 1, 0))) : null; }
      if (p.blocco != null) { const B = blocks.find(B => B.id === p.blocco); return B ? proietta(B.c.clone().add(new THREE.Vector3(0, 0.6, 0))) : null; }
      if (p.poltrona != null) { const q = VIP.poltrone[p.poltrona]; return q ? proietta(q.occhio.clone().add(new THREE.Vector3(0, -0.45, 0))) : null; }   // 'F4' = nome nella foto: solo la versione vera
      if (p.posto) { const B = st.sel[2].B; for (let i = B.s0; i < B.s1; i++) if (seats.row[i] === p.posto[0] && seats.num[i] === p.posto[1]) return proietta(new THREE.Vector3(seats.x[i], seats.y[i] + 0.5, seats.z[i])); }
      if (p.xy) return p.xy;
      return null;
    },
    vicino(n) {   // il posto libero accanto (prima a destra, poi a sinistra) nella stessa fila
      const i = n.i; for (const j of [i + 1, i - 1]) if (j >= n.B.s0 && j < n.B.s1 && seats.row[j] === seats.row[i] && Math.abs(seats.num[j] - seats.num[i]) === 1 && !preso(j)) return nPosto(j); return null; },
    trovaPosto(bid, r, n) { const B = blocks.find(B => B.id === bid); for (let i = B.s0; i < B.s1; i++) if (seats.row[i] === r && seats.num[i] === n) return nPosto(i); },
    nodoZona: nome => nZona(zones.find(z => z.nome === nome)), nodoBlocco: id => nBlocco(blocks.find(B => B.id === id)),
  };
  function stato(n) { return n === 0 ? ['Sold out', 'no'] : n < 40 ? [`${n} left`, 'few'] : [`${n.toLocaleString('en-US')} left`, 'ok']; }
  M.accendi({ liv: 0, sel: [], scelti: [] });
  return M;
}
