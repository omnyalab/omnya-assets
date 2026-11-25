// Motore choose-your · adattatore dei livelli per le torri (v2, 20/11 sera).
// Livelli per id: mondo → piano (scegli il piano o la stanza sospesa) → dentro (la stanza o il tuo piano)
// → attico («Upgrade to the penthouse»: si sale in cima) → booked (di nuovo fuori, biglietto col timbro).
// Il secondo «choose your floor» è l'attico: stessa meccanica dell'Upgrade VIP dello stadio.
import * as THREE from 'three';
import { torre } from './torre.js';
import { paesaggio } from './paesaggio.js';
import { intorno } from './torre-intorno.js';

export function costruisciTorre(S) {
  const T = torre(S.modello), land = S.intorno ? intorno(S.intorno(T)) : paesaggio(S.paesaggio(T)), G = new THREE.Group(); G.add(land.gruppo, T.gruppo);
  const hP = S.modello.altezzaPiano, st = S.modello.stanza, meshes = []; T.gruppo.traverse(o => { if (o.isMesh && !o.isInstancedMesh && o.parent === T.gruppo) meshes.push(o); });
  const yStanza = st ? (Array.isArray(st.y1) ? st.y0 : st.y0) : -1, pianoStanza = st ? Math.floor(st.y0 / hP) : -1, fmt = n => n.toLocaleString('en-US') + ' ' + S.valuta;
  const yTopStanza = st ? (Array.isArray(st.y1) ? st.y1[1] + (st.sale ?? 1) : st.y1) : -1;
  const isStanza = (n, y) => st && (y != null ? y > st.y0 - 0.3 && y < yTopStanza + 0.6 : n >= Math.floor(st.y0 / hP) && n < Math.ceil(yTopStanza / hP));
  const pianoAttico = T.attico ? Math.floor(T.attico.y0 / hP) : 1e9;
  const nodo = (n, y) => isStanza(n, y) ? { id: 'stanza', n: pianoStanza, stanza: true } : n >= pianoAttico ? { id: 'attico', n: pianoAttico, attico: true } : { id: 'p' + n, n, esaurito: (S.esauriti || []).includes(n) };
  const prezzo = n => Math.round((S.prezzo.base + S.prezzo.perPiano * n) / 1000) * 1000;
  let camOra = [0, 1.7, 1050]; const cam0 = () => camOra.slice();   /* dove sta la camera adesso (aggiornato a ogni fotogramma da ogniFrame): i percorsi partono da qui */
  const liberi = n => { const h = Math.sin(n * 12.9898) * 43758.5453; return Math.floor((h - Math.floor(h)) * 4); };
  const lato = T.volumi[T.volumi.length - 1];
  const breve = v => (v >= 1e6 ? (Math.round(v / 1e5) / 10).toLocaleString('en-US') + 'M' : v.toLocaleString('en-US')) + ' ' + S.valuta;   // sul biglietto: 18.5M AED
  const idDi = liv => S.livelli[liv] && S.livelli[liv].id;
  const areaPiano = n => { const y = (n.stanza ? st.y0 : n.n * hP) + 1; let A = 0; for (const v of T.volumi) { if (y > v.cimaY(v.M / 2)) continue; let a2 = 0; const pts = []; for (let j = 0; j <= v.M; j++) pts.push(v.Praw(y, j)); pts.push(pts[0]); for (let i = 0; i < pts.length - 1; i++) a2 += pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1]; A += Math.abs(a2) / 2; } return Math.round(A * 0.82 / 10) * 10; };   /* 82% della lastra: tolti nucleo e muri (STIMA) */
  const rrP = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
  const M = {
    gruppo: G, ombra: S.modello.ombra || 220, info: T,
    // giro dentro (Nico 20/11): entri dritto, guardi la casa, «View the skyline» ti giri, «Upgrade» giri intorno alla torre fino in cima, «Choose another floor» torni alla foto madre.
    // Tutto con percorsi continui (engine: percorso), così il video non si taglia: la camera non si ferma mai fra un tratto e l'altro.
    ripresa(liv, n, s2) {
      const id = idDi(liv), prima = s2 && s2.livPrima != null ? idDi(s2.livPrima) : null, R = S.riprese, Ts = T.stanza, A = T.attico, V3 = a => [a[0], a[1], a[2]];
      const fuoriDa = (p, k, d, dy = 0) => [p[0] + k[0] * d, p[1] + dy, p[2] + k[1] * d];
      const versoXZ = (a, b) => { const x = b[0] - a[0], z = b[2] - a[2], l = Math.hypot(x, z) || 1; return [x / l, z / l]; };
      const guarda = (p, yaw, d = 60, dy = 0) => [p[0] + Math.sin(yaw) * d, p[1] + dy, p[2] + Math.cos(yaw) * d];
      const yawDi = k => Math.atan2(k[0], k[1]);
      if (id === 'mondo' || liv === 0) return R.mondo;
      if (id === 'piano' || liv === 1) {
        const M0 = R.mondo;
        if (prima === 'attico' && A) {   /* esci all'indietro dal vetro guardando la casa, ti allontani e scendi fino alla foto madre dal basso */
          const AE = A.entra.pos, nA = versoXZ(AE, A.fuori.toArray());
          return { percorso: [
            { pos: fuoriDa(AE, nA, 10, 0.2), tgt: fuoriDa(AE, nA, -8, -0.2), fov: 62, t: 0.9 },
            { pos: fuoriDa(AE, nA, 72, -14), tgt: V3(AE), fov: 44, t: 1.9 },
            { pos: [M0.pos[0] - 8, 96, 440], tgt: [0, 112, 0], fov: 28, shift: 0.15, t: 2.9 },
            { pos: M0.pos, tgt: M0.tgt, fov: M0.fov, shift: M0.shift, t: 4.0 }] };   /* 4 s = una clip sola, dal Glass Crown alla foto madre (Nico 20/11: la foto in mezzo non serve) */
        }
        if ((prima === 'vista' || prima === 'dentro') && Ts) {   /* dalla Sky Majlis: avanti fuori dal vetro, ti giri verso la torre allontanandoti, giù alla foto madre */
          const E = Ts.entra.pos, k = Ts.normale, y0 = yawDi(k);
          return { percorso: [
            { pos: fuoriDa(E, k, 34, 3), tgt: guarda(fuoriDa(E, k, 34, 3), y0 + Math.PI / 2), fov: 56, t: 1.5 },
            { pos: fuoriDa(E, k, 160, -18), tgt: V3(E), fov: 40, t: 3.0 },
            { pos: [M0.pos[0] + 6, 70, 520], tgt: [0, 100, 0], fov: 26, shift: 0.15, t: 4.4 },
            { pos: M0.pos, tgt: M0.tgt, fov: M0.fov, shift: M0.shift, t: 6.0 }] };
        }
        return R.torre;
      }
      if (id === 'vista') {   /* «View the skyline»: da dove sei ti giri piano verso la vetrata, scivolando verso il vetro */
        const sel = s2 && s2.sel[1], P0 = cam0(), k = sel && sel.stanza && Ts ? Ts.normale : versoXZ([0, 0, 0], P0), y0 = yawDi(k), sky = sel && sel.stanza && Ts ? Ts.skyline : fuoriDa(P0, k, 400, -12);
        return { arrivo: 2.7, percorso: [
          { pos: fuoriDa(P0, k, 0.3), tgt: guarda(fuoriDa(P0, k, 0.3), y0 - Math.PI / 2, 10), fov: 68, t: 1.3 },
          { pos: fuoriDa(P0, k, 0.9), tgt: sky, fov: 64, t: 2.7 },
          { pos: fuoriDa(P0, k, 1.4), tgt: sky, fov: 62, t: 5.6 }] };   /* resta dentro il vetro */
      }
      if (id === 'attico' && A) {   /* «Upgrade»: esci sopra la terrazza, ti giri verso la torre, sali dritto fino in cima, entri nell'attico */
        const P0 = cam0(), sel = s2 && s2.sel[1], isSt = !!(sel && sel.stanza && Ts), E = isSt ? Ts.entra.pos : P0, k = isSt ? Ts.normale : versoXZ([0, 0, 0], P0), y0 = yawDi(k);
        const AE = A.entra.pos, nA = versoXZ(AE, A.fuori.toArray()), AF = fuoriDa(AE, nA, 78, 1.5);
        /* 20/11 notte (Nico): niente giro intorno (sembrava girare il palazzo). Esci, ti giri verso la torre davanti alla facciata, poi SALI DRITTO in 3 s fino al Glass Crown: la torre resta ferma e il suolo scende */
        const out = fuoriDa(E, k, 38, 4), B = [AF[0], out[1] + 3.5, AF[2]], tB = [AE[0], out[1] + 3.5, AE[2]];
        const keys = [{ pos: out, tgt: guarda(out, y0 + Math.PI * 0.72), fov: 54, t: 1.4 },
          { pos: B, tgt: tB, fov: 44, t: 3.0 },
          { pos: AF, tgt: V3(AE), fov: 42, t: 6.0 },
          { pos: fuoriDa(AE, nA, 16, 0.3), tgt: fuoriDa(AE, nA, -8, -0.3), fov: 60, t: 7.0 },
          { pos: V3(AE), tgt: V3(A.entra.tgt), fov: 70, t: 7.8 },
          { pos: fuoriDa(AE, nA, -1.4), tgt: fuoriDa(A.entra.tgt, nA, -1.4), fov: 70, t: 10.0 }];
        return { arrivo: 7.8, percorso: keys };
      }
      if (id === 'booked') {   // esci in avanti, ti giri verso la torre, ti allontani: torre a sinistra, biglietto a destra
        const daAttico = s2 && s2.attico && A, P0 = daAttico ? A.entra.pos : Ts.entra.pos, k = daAttico ? (() => { const d = [A.skyline[0] - P0[0], A.skyline[2] - P0[2]], l = Math.hypot(...d); return [d[0] / l, d[1] / l]; })() : Ts.normale;
        const O = fuoriDa(P0, k, 40, 0), O2 = fuoriDa(P0, k, 70, 8);
        return { pos: O, tgt: fuoriDa(P0, k, 400, -30), fov: 60, dur: 1.6,
          poi: { pos: O2, tgt: [P0[0], P0[1], P0[2]], fov: 50, gira: 1, dur: 2.2,
            poi: { ...R.booked, dur: 3.2 } } };
      }
      if (n && n.stanza && Ts) {   /* dalla foto madre (Nico 20/11): sali guardando sempre la stanza fino davanti al vetro, entri dritto, guardi la casa scivolando piano */
        const E = Ts.entra.pos, k = Ts.normale, M0 = R.mondo;
        return { arrivo: 4.7, percorso: [
          { pos: [E[0] * 0.3, 55, 600], tgt: [E[0] * 0.5, 92, 0], fov: 26, shift: 0.16, t: 1.6 },
          { pos: fuoriDa(E, k, 70, 2), tgt: V3(E), fov: 44, shift: 0, t: 3.0 },
          { pos: fuoriDa(E, k, 16, 0.4), tgt: fuoriDa(E, k, -8, -0.3), fov: 60, t: 3.9 },
          { pos: V3(E), tgt: V3(Ts.entra.tgt), fov: 70, t: 4.7 },
          { pos: fuoriDa(E, k, -1.4), tgt: fuoriDa(Ts.entra.tgt, k, -1.4), fov: 70, t: 6.9 }] };
      }
      if (n) { const y = n.n * hP + 1.7, s = lato.sezione(y), dentro = [s.cx + s.a * 0.55, y, s.b * 0.2], verso = [s.cx + s.a * 0.2, y - 0.3, -s.b * 0.4];
        return { arrivo: 4.6, percorso: [
          { pos: [dentro[0] * 0.5, y * 0.45, 600], tgt: [0, y * 0.8, 0], fov: 26, shift: 0.16, t: 1.7 },
          { pos: [dentro[0], y, s.b + 80], tgt: [dentro[0], y, 0], fov: 44, shift: 0, t: 3.3 },
          { pos: dentro, tgt: verso, fov: 62, t: 4.6 },
          { pos: [dentro[0], y, dentro[2] - 1.2], tgt: [verso[0], verso[1], verso[2] - 1.2], fov: 62, t: 6.6 }] }; }
      return R.torre;
    },
    via(liv, cam, shot) {   // nella stanza si entra dritti dall'apertura dello sbalzo
      const id = idDi(liv), R = S.riprese;
      if (id === 'dentro' && T.stanza && shot.stanza) return R.viaStanza || T.stanza.fuori.toArray();
      return null;
    },
    trova(liv, ray) {
      if (idDi(liv) !== 'piano') return null; const hit = ray.intersectObjects(meshes, false)[0]; if (!hit) return null;
      const y = hit.point.y, n = Math.floor(y / hP);
      if (st && hit.point.x > 0 && isStanza(n, y)) return nodo(n, y);
      if (n < S.pianoMin || n > T.pianiTot - 1) return null; if (T.attico && n >= pianoAttico) return null; return nodo(n);
    },
    accendi(s2) {
      const h = idDi(s2.liv) === 'piano' ? (s2.hover || s2.ultimoHover) : null;   /* sul pannello resta acceso il piano che stai guardando (20/11) */
      if (h && h.stanza) { T.accendiPiano(pianoStanza, S.colori.stanza, 0.6, 'stanza'); return; }
      T.accendiPiano(h ? h.n : null, h && h.esaurito ? S.colori.preso : S.colori.scelta);
    },
    etichetta(liv, n) {
      if (S.pannello) return null;
      if (n.stanza) return { sopra: S.testi.stanzaSopra, titolo: S.testi.stanza, prezzo: fmt(S.prezzo.stanza), stato: ['Only one', 'few'] };
      if (n.esaurito) return { sopra: 'Floor', titolo: `Floor ${n.n}`, prezzo: '', stato: ['Sold out', 'no'] };
      const l = liberi(n.n); return { sopra: 'Floor', titolo: `Floor ${n.n}`, prezzo: 'from ' + fmt(prezzo(n.n)), stato: l === 0 ? ['Sold out', 'no'] : [`${l + 1} left`, l < 2 ? 'few' : 'ok'] };
    },
    ancora(liv, n) {
      if (n.stanza && T.stanza) { const [x, z] = T.stanza.P(T.stanza.M * 0.86, 1.02); return new THREE.Vector3(x, yStanza + 3, z); }
      const y = n.n * hP + hP / 2, s = lato.sezione(y); return new THREE.Vector3(s.cx + s.a * 0.9, y, s.b * 0.5);
    },
    // il biglietto della torre (engine/biglietto-torre.js): stile da ?u= o dal soggetto; niente biglietto se il soggetto ha biglietto: false
    finale(s2) {
      if (S.biglietto === false) return null;
      const id = idDi(s2.liv), suAttico = id === 'attico' || (id === 'booked' && s2.attico), Htot = T.altezza, stile = new URLSearchParams(location.search).get('u') || (S.biglietto && S.biglietto.stile) || 'champagne';
      const base = { forma: 'torre', stile, sopra: S.testi.biglietto, data: S.testi.data || '', nota: S.testi.nota };
      if (suAttico) return { ...base, titolo: S.testi.attico, chiave: 'Penthouse', righe: [['Floor', String(pianoAttico)], ['Height', `${Math.round(T.attico.y0)} m`], ['Price', breve(S.prezzo.attico)]], torre: { piano: 0.97, stanza: yStanza / Htot, attico: true } };
      const n = s2.sel[1] || s2.selPiano; if (!n) return null;
      const yy = n.stanza ? yStanza : n.n * hP;
      return { ...base, titolo: n.stanza ? S.testi.stanza : `Floor ${n.n}`, chiave: n.stanza ? S.testi.stanzaSopra : 'Residence', righe: [['Floor', String(n.stanza ? pianoStanza : n.n)], ['Height', `${Math.round(yy)} m`], ['Price', breve(n.stanza ? S.prezzo.stanza : prezzo(n.n))]], torre: { piano: yy / Htot, stanza: yStanza / Htot } };
    },
    punto(p, s2, proietta, ui) {
      if (p.bottone) { const b = ui.btns.find(b => b.id === p.bottone); return b ? b.c : null; }
      if (p.piano != null) return proietta(M.ancora(1, nodo(p.piano)).add(new THREE.Vector3(-4, 0, 0)));
      if (p.stanza) { const [x, z] = T.stanza.P(T.stanza.M * 0.8, 1.0); return proietta(new THREE.Vector3(x, yStanza + 2.2, z)); }
      return p.xy || null;
    },
    // dentro (stanza o attico) il vetro non fa ombra: entra il sole del tramonto; le lampade calde si accendono
    ogniFrame(t, s2, cam) {
      camOra = [cam.pos.x, cam.pos.y, cam.pos.z];
      const id = idDi(s2.liv), cp = cam.pos, dentro = T.volumi.some(v => { const q = v.sezione(cp.y), dx = cp.x - T.fessura.dr(cp.y) - q.cx; return v.lato * dx >= 0 && cp.y < v.V.altezza && Math.pow(Math.abs(dx) / q.a, q.n) + Math.pow(Math.abs(cp.z) / q.b, q.n) < 1.05; });
      for (const g of T.gusci) g.castShadow = !dentro;   // dentro il vetro non fa ombra: entra il sole del tramonto
      for (const v of T.volumi) { const q = v.sezione(cp.y), dx = cp.x - T.fessura.dr(cp.y) - q.cx, d = v.lato * dx >= 0 && Math.pow(Math.abs(dx) / q.a, q.n) + Math.pow(Math.abs(cp.z) / q.b, q.n) < 1.05 && cp.y < v.V.altezza; v.alette.visible = !d && Math.hypot(cp.x, cp.y - 130, cp.z) < (S.aletteFino ?? 650); }   // da dentro niente alette esterne (gabbia)
      if (id === 'attico') s2.attico = true; else if (id !== 'booked') s2.attico = false;
      if (id === 'dentro' && s2.sel[1]) s2.selPiano = s2.sel[1];
      const k = S.lanterne ?? 1;
      if (T.stanza && T.stanza.lampada) T.stanza.lampada.intensity = T.stanza.lampada.userData.lanterna * k;
      if (T.attico) for (const l of T.attico.lampade) l.intensity = l.userData.lanterna * k;
    },
    nodoPiano: n => nodo(n), nodoStanza: () => nodo(pianoStanza),
    // pannello di vetro come SAMAR (la nostra prima «choose your floor»): a destra, livello grande, nome, m², bottone blu «Enter»
    pannello(c, s2, now, ui, fermo) {
      if (!S.pannello || idDi(s2.liv) !== 'piano' || !fermo) return;
      const W = ui.W, H = ui.H, n = s2.hover || s2.ultimoHover || nodo(pianoStanza), w = 360, h = 372, x = W - W * 0.05 - w, y = H / 2 - h / 2, a = Math.min(1, (now - s2.tIn) / 0.5);
      if (ui.temaTorre) {   /* temi D1-D5 (ui-torre.js): stessi dati, disegno del tema */
        const l = liberi(n.n), d = { torre: S.testi.torre || S.nome, torreAr: S.testi.torreAr || '', luogo: S.testi.data || '', livello: n.stanza ? pianoStanza : n.n, alto: Math.round(n.stanza ? st.y0 : n.n * hP),
          nome: n.stanza ? S.testi.stanza : `Residence ${n.n}`, area: areaPiano(n), vista: S.testi.vista || 'skyline view', vistaBreve: S.testi.vistaBreve || 'Downtown', prezzo: n.stanza ? S.prezzo.stanza : prezzo(n.n), valuta: S.valuta,
          stato: n.stanza ? [S.testi.stanzaSopra || 'One of one', 'oro'] : n.esaurito ? ['Sold', 'no'] : [`${l + 1} left`, l < 2 ? 'few' : 'ok'], btn: n.stanza ? 'Enter ' + S.testi.stanza.replace(/^The /, 'the ') : `Enter level ${n.n}`,
          esaurito: !!n.esaurito, hov: s2.hBtn === 'scegliUltimo', speciale: !!n.stanza };
        ui.temaTorre.pannello(c, d, ui, a);
        const hv = s2.hover || s2.ultimoHover; if (hv) { const p = ui.proietta(M.ancora(1, hv)); if (p[2]) { c.save(); c.globalAlpha = a; ui.temaTorre.tag(c, p, d, ui); c.restore(); } }
        return;
      }
      c.save(); c.globalAlpha = a;
      c.save(); rrP(c, x, y, w, h, 30); c.clip(); if (ui.sfondo) { c.filter = 'blur(28px) saturate(1.8)'; c.drawImage(ui.sfondo, 0, 0, W, H); c.filter = 'none'; }
      c.fillStyle = 'rgba(20,24,30,0.22)'; c.fillRect(x, y, w, h); const g = c.createLinearGradient(0, y, 0, y + h * 0.42); g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(x, y, w, h); c.restore();
      rrP(c, x + 0.5, y + 0.5, w - 1, h - 1, 30); c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 1; c.stroke();
      const X = x + 28; c.textAlign = 'left'; c.fillStyle = '#fff';
      c.font = '600 34px SFD'; c.fillText('Choose', X, y + 62); c.fillText('your floor', X, y + 98);
      c.font = '14px SFTS'; c.fillStyle = 'rgba(255,255,255,0.78)'; c.fillText('Move along the tower to light up a floor.', X, y + 128); c.fillText('Select it to fly in through the glass.', X, y + 148);
      c.font = '500 13px SFTS'; c.fillStyle = 'rgba(255,255,255,0.72)'; c.fillText('LEVEL', X, y + 222);
      c.font = '600 68px SFD'; c.fillStyle = '#fff'; c.fillText(String(n.stanza ? pianoStanza : n.n), X + 52, y + 226);
      const unit = n.stanza ? S.testi.stanza + ' · ' + S.testi.stanzaSopra : n.esaurito ? 'Residence ' + n.n + ' · sold' : 'Residence ' + n.n;
      c.font = '600 17px SFTS'; c.fillText(unit, X, y + 258);
      c.font = '14px SFTS'; c.fillStyle = 'rgba(255,255,255,0.72)'; c.fillText(`${areaPiano(n)} m² · ${S.testi.vista || 'skyline view'}`, X, y + 280);
      const bw = w - 56, bh = 48, by = y + h - bh - 26, hov = s2.hBtn === 'scegliUltimo';
      rrP(c, X, by, bw, bh, 24); c.fillStyle = n.esaurito ? 'rgba(255,255,255,0.22)' : (hov ? '#2a95ff' : '#0a84ff'); c.fill();
      c.font = '600 16px SFTS'; c.fillStyle = '#fff'; c.textAlign = 'center'; c.fillText(n.stanza ? 'Enter ' + S.testi.stanza.replace(/^The /, 'the ') : `Enter level ${n.n}`, X + bw / 2, by + 30); c.textAlign = 'left';
      if (!n.esaurito) ui.btns.push({ id: 'scegliUltimo', r: [X, by, X + bw, by + bh], c: [X + bw / 2, by + bh / 2] });
      // lineetta e numero accanto alla torre, sul piano acceso
      if (s2.hover) { const p = ui.proietta(M.ancora(1, s2.hover)); if (p[2]) { c.strokeStyle = 'rgba(255,255,255,0.95)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(p[0] + 26, p[1]); c.lineTo(p[0] + 76, p[1]); c.stroke(); c.font = '300 22px SFD'; c.fillStyle = '#fff'; c.fillText(String(s2.hover.stanza ? pianoStanza : s2.hover.n), p[0] + 88, p[1] + 8); } }
      c.restore();
    },

  };
  return M;
}
