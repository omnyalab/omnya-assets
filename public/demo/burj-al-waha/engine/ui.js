// Motore choose-your · interfaccia disegnata sopra il 3D (stessa lingua dei biglietti di stadio e aereo:
// carta chiara, SF Pro, arancio Omnya per la scelta, verde/arancio/rosso per la disponibilità).
const PAPER = '#fbfaf7', INK = '#121317', MUTE = '#8a8f99', LINE = '#e3e4e8', OR = '#ff7a12', OK = '#1f9d57', FEW = '#e07a00', NO = '#d23b3b';
import { biglietto } from './biglietti.js';
import { temaTorre } from './ui-torre.js';
import { introStrisce, introCard } from './intro.js';   /* stadio 2034: strisce del Mondiale all'inizio e card centrale (S.intro) */   /* torri: temi D1-D5 della UI (Nico 20/11 «più Dubai style»), ?ui=D1… o S.uiTorre */
const TEMI = {
  1: { nome: 'Notte e oro', vetro: 'rgba(8,11,32,0.64)', testo: '#ffffff', mute: 'rgba(236,224,196,0.72)', sopra: '#ead08f', oro: ['#fbe9b4', '#c9a052', '#f3d68f', '#9c7430'], btn: 'oro', btnTxt: '#0d1230', sec: 'rgba(8,11,32,0.55)', secTxt: '#f3e2b0', biglietto: 1, ornamento: 'oro' },
  2: { nome: 'Verde reale', vetro: 'rgba(3,46,27,0.68)', testo: '#ffffff', mute: 'rgba(232,222,190,0.75)', sopra: '#e8cf8a', oro: ['#f7e3a8', '#bf9443', '#efd38a', '#8f6a2a'], btn: '#0a5a33', btnTxt: '#f6e3a8', sec: 'rgba(3,46,27,0.55)', secTxt: '#f6e3a8', biglietto: 3, ornamento: 'oro', arabesco: true },
  3: { nome: 'Perla e nastro', vetro: 'rgba(250,248,243,0.80)', testo: '#121733', mute: 'rgba(18,23,51,0.55)', sopra: '#ffffff', oro: null, btn: '#17205a', btnTxt: '#ffffff', sec: 'rgba(250,248,243,0.86)', secTxt: '#121733', biglietto: 2, ornamento: 'nastro' } };
const NASTRO_UI = ['#ffcb05', '#ef4b2b', '#a457b8', '#f7941d', '#55aa5c'];
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), ease = t => { t = clamp(t); return 1 - Math.pow(1 - t, 3); };

export class UI {
  constructor(S, M, { W, H, camera, cam, T }) {
    this.S = S; this.M = M; this.W = W; this.H = H; this.T = T; this.nascosta = new URLSearchParams(location.search).get('clean') === '1';
    const c = document.createElement('canvas'); c.width = W * 2; c.height = H * 2; c.id = 'ui'; document.body.appendChild(c); this.cv = c; this.x = c.getContext('2d'); this.x.scale(2, 2);
    this.btns = []; this.hT = 0; this.shake = null; this.click = null; this.arr = 0;
    const base = new URL('../assets/fonts/', import.meta.url);
    this.lux = +(new URLSearchParams(location.search).get('t') || (S.biglietto && S.biglietto.stile) || 1); this.stileBiglietto = S.biglietto && S.biglietto.temaUI ? TEMI[this.lux].biglietto : this.lux;
    this.logo = null; if (S.biglietto && S.biglietto.logo) { const im = new Image(); im.onload = () => { this.logo = im; }; im.src = new URL(S.biglietto.logo, location.href).href; }
    const qu = new URLSearchParams(location.search).get('ui') ?? S.uiTorre; this.temaTorre = qu ? temaTorre(qu, S) : null;
    const fonti = [['SFD', 'SF-Pro-Display-Semibold.otf'], ['SFTB', 'SF-Pro-Text-Bold.otf'], ['SFTS', 'SF-Pro-Text-Semibold.otf'], ...(S.intro ? [['KufamBI', 'Kufam-BlackItalic.woff'], ['KufamXB', 'Kufam-ExtraBold.woff']] : []), ...(this.temaTorre ? [['SFDT', 'SF-Pro-Display-Thin.otf'], ['SFDL', 'SF-Pro-Display-Light.otf'], ['SFDM', 'SF-Pro-Display-Medium.otf']] : [])];
    this.pronta = Promise.all([...fonti.map(([f, u]) => new FontFace(f, `url("${base}${u}")`).load().then(x => document.fonts.add(x)).catch(() => 0)),
      ...(this.temaTorre ? ['40px Didot', 'italic 40px Didot', '40px "Bodoni 72"', 'italic 40px "Bodoni 72"', '40px "Diwan Thuluth"', '40px Copperplate'].map(f => document.fonts.load(f, 'Aaفلج').catch(() => 0)) : [])]);
  }
  arrivo(liv) { this.arr = this.T.now; }
  hover(st) { this.hT = this.T.now; }
  scelta(st) { this.sT = this.T.now; }
  scuoti(n) { this.shake = { t: this.T.now, id: n && n.id }; }
  clicFinto() { this.click = { t: this.T.now, at: null }; }
  bottone(x, y) { for (const b of this.btns) if (x >= b.r[0] && x <= b.r[2] && y >= b.r[1] && y <= b.r[3]) return b.id; return null; }

  disegna(st, cursore, now) {
    const c = this.x, W = this.W, H = this.H; c.clearRect(0, 0, W, H); this.btns = [];   /* nascosta (?clean=1): si calcola tutto (i bottoni restano cliccabili per i giri) e alla fine si cancella */
    const L = this.S.livelli[st.liv], M = this.M, fadeIn = ease((now - st.tIn) / 0.5), fermo = st.arrivato === st.liv;   // titoli, schede e bottoni solo a camera ferma
    // titolo del livello (in alto al centro): sopratitolo piccolo + nome grande
    const intro = this.S.intro && L.tipo === 'mondo';   // inizio a strisce: durante il volo le strisce, a camera ferma la card col bottone
    if (intro) { if (fermo) introCard(c, this, this.S, st, now, st.hBtn === 'avanti'); else introStrisce(c, this, this.S, st, now); }
    const tit = !intro && L.titolo ? L.titolo(st) : null;
    if (tit && fermo && this.temaTorre) this.temaTorre.titolo(c, this, tit, fadeIn);
    else if (tit && fermo) { c.save(); c.globalAlpha = fadeIn; c.textAlign = 'center'; c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 22;
      const TM = this.tema(); caps(c, W / 2, 86, tit[0], 14, TM ? TM.sopra : 'rgba(255,255,255,0.88)', 0.32); txt(c, W / 2, 146, tit[1], 'SFD', 54, '#fff'); c.shadowColor = 'transparent';
      if (TM) this.ornamento(c, W / 2, 170, 230, TM); c.restore(); }
    if (L.tipo === 'blocchi' && fermo && st.sel[1] && M.categoria) this.legenda(c, st, fadeIn);
    // biglietto piccolo sul pezzo sotto il mouse
    if (st.hover && L.tipo !== 'posti' && L.tipo !== 'vip') { const e = M.etichetta(st.liv, st.hover, st), p = this.proietta(M.ancora(st.liv, st.hover, st)); if (e && p[2]) this.biglietto(c, p[0], p[1], e, now - this.hT); }
    if ((L.tipo === 'posti' || L.tipo === 'vip') && fermo) this.posti(c, st, now);
    if (M.pannello) M.pannello(c, st, now, this, fermo);   /* torri: pannello di vetro come SAMAR, se il kit lo dà */
    if (L.tipo === 'upgrade') this.offerta(c, st, now);
    // bottone in basso
    const b = !intro && L.bottone ? L.bottone(st) : null;
    if (b && fermo) this.pill(c, W / 2, H - 92, b.testo, b.id, b.attivo !== false, st.hBtn === b.id);
    const bb = L.bottoni ? L.bottoni(st).filter(Boolean) : null;
    if (bb && bb.length && fermo && now - st.tIn > 0.15) { c.font = '600 19px SFTS'; const ws = bb.map(q => this.temaTorre ? this.temaTorre.largo(c, q.testo) : c.measureText(q.testo).width + 84), gap = 18, tot = ws.reduce((a, q) => a + q, 0) + gap * (bb.length - 1); let x = W / 2 - tot / 2;
      bb.forEach((q, i) => { this.pill(c, x + ws[i] / 2, H - 92, q.testo, q.id, true, st.hBtn === q.id, q.secondario); x += ws[i] + gap; }); }
    if (L.tipo === 'dentro' && fermo && !this.realeBooked) this.finale(c, st, now);
    if (L.tipo === 'booked' && !this.realeBooked) this.booked(c, st, now);
    // cursore finto (giro automatico)
    if (cursore && !(intro && !fermo)) this.cursore(c, cursore[0], cursore[1], now);
    if (this.nascosta) c.clearRect(0, 0, W, H);
  }

  biglietto(c, ax, ay, e, t) {   // ax, ay = punta; la carta sta sopra (o sotto se non c'è posto)
    const TM = this.tema(); if (!TM) return this.bigliettoChiaro(c, ax, ay, e, t);
    const a = ease(t / 0.28), w = 330, h = 142, x = clamp(ax - w / 2, 24, this.W - w - 24), sotto = ay - h - 26 < 190, y = (sotto ? Math.max(ay + 26, 196) : clamp(ay - h - 26, 24, this.H - h - 24)) + (1 - a) * 10;
    c.save(); c.globalAlpha = a; this.vetro(c, x, y, w, h, 20, TM);
    const yb = sotto ? y : y + h, px = clamp(ax, x + 30, x + w - 30); c.beginPath(); c.moveTo(px - 10, yb); c.lineTo(ax, sotto ? Math.max(ay + 6, yb - 14) : Math.min(ay - 6, yb + 14)); c.lineTo(px + 10, yb); c.closePath(); c.fillStyle = TM.vetro; c.fill();
    const cat = e.cat, colC = cat ? cat.colore : null;
    if (colC) { c.fillStyle = colC; rr(c, x + 18, y + 20, 5, h - 40, 2.5); c.fill(); }
    const x0 = x + (colC ? 36 : 24);
    caps(c, x0, y + 38, e.sopra + (cat ? ' · ' + cat.nome : ''), 11.5, TM.sopra, 0.2); txt(c, x0, y + 78, e.titolo, 'SFD', 31, TM.testo);
    if (e.prezzo) txt(c, x0, y + 112, e.prezzo, 'SFTS', 16, TM.testo);
    if (e.cats) e.cats.forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc(x0 + 150 + i * 16, y + 107, 5.5, 0, 7); c.fill(); });
    if (e.stato) { const col = { ok: '#3fd47f', few: '#ffb347', no: '#ff6b6b' }[e.stato[1]]; c.textAlign = 'right'; c.font = '600 13.5px SFTS'; c.fillStyle = col; c.fillText(e.stato[0], x + w - 22, y + 38); c.textAlign = 'left'; }
    c.restore();
  }
  vetro(c, x, y, w, h, r, TM) {   // carta di vetro: lo sfondo sfocato sotto, la tinta del tema, il filo d'oro (o il nastro)
    c.save(); c.shadowColor = 'rgba(0,0,0,0.38)'; c.shadowBlur = 34; c.shadowOffsetY = 12; rr(c, x, y, w, h, r); c.fillStyle = TM.vetro; c.fill(); c.restore();
    if (this.sfondo) { c.save(); rr(c, x, y, w, h, r); c.clip(); c.filter = 'blur(16px) saturate(1.3)'; c.drawImage(this.sfondo, 0, 0, this.W, this.H); c.filter = 'none'; c.fillStyle = TM.vetro; c.fillRect(x, y, w, h); c.restore(); }
    if (TM.arabesco) this.arabesco(c, x, y, w, h, r);
    if (TM.oro) { c.save(); rr(c, x + 0.75, y + 0.75, w - 1.5, h - 1.5, r); c.lineWidth = 1.5; c.strokeStyle = this.gradOro(c, x, y, w, h, TM); c.stroke(); c.restore(); }
    else { c.save(); rr(c, x, y, w, h, r); c.clip(); NASTRO_UI.forEach((col, i) => { c.fillStyle = col; c.fillRect(x + i * w / 5, y + h - 4, w / 5 + 1, 4); }); c.restore(); }
  }
  gradOro(c, x, y, w, h, TM) { const g = c.createLinearGradient(x, y, x + w, y + h), o = TM.oro; g.addColorStop(0, o[0]); g.addColorStop(0.35, o[1]); g.addColorStop(0.62, o[2]); g.addColorStop(1, o[3]); return g; }
  arabesco(c, x, y, w, h, r) {   // stelle a otto punte d'oro, finissime (motivo saudita)
    c.save(); rr(c, x, y, w, h, r); c.clip(); c.strokeStyle = 'rgba(232,207,138,0.13)'; c.lineWidth = 1; const s = 34;
    for (let yy = y - s; yy < y + h + s; yy += s) for (let xx = x - s; xx < x + w + s; xx += s) { c.beginPath(); for (let k = 0; k < 2; k++) { c.save(); c.translate(xx, yy); c.rotate(k * Math.PI / 4); c.rect(-9, -9, 18, 18); c.restore(); } c.stroke(); }
    c.restore();
  }
  ornamento(c, cx, y, w, TM) {
    if (TM.ornamento === 'nastro') { NASTRO_UI.forEach((col, i) => { c.fillStyle = col; c.fillRect(cx - w / 2 + i * w / 5, y - 1.5, w / 5, 3); }); return; }
    const g = this.gradOro(c, cx - w / 2, y, w, 2, TM); c.fillStyle = g; c.fillRect(cx - w / 2, y - 0.6, w / 2 - 12, 1.2); c.fillRect(cx + 12, y - 0.6, w / 2 - 12, 1.2);
    c.save(); c.translate(cx, y); c.rotate(Math.PI / 4); c.fillStyle = g; c.fillRect(-4.5, -4.5, 9, 9); c.restore();
  }
  legenda(c, st, a) {   // le categorie della tribuna scelta coi loro colori e prezzi, in basso
    const TM = this.tema(); if (!TM) return; const M = this.M, seen = new Map(); for (const B of st.sel[1].z.blocks) { const k = M.categoria(B); if (k && !B.esaurito && (!seen.has(k.k) || k.prezzo < seen.get(k.k).prezzo)) seen.set(k.k, k); }
    const cats = [...seen.values()].sort((p, q) => p.k - q.k); if (!cats.length) return;
    c.save(); c.globalAlpha = a; c.font = '600 15px SFTS'; const ws = cats.map(k => c.measureText(`${k.nome}    ${k.prezzo.toLocaleString('en-US')} ${this.S.valuta}`).width + 86), gap = 12, tot = ws.reduce((p, q) => p + q, 0) + gap * (cats.length - 1); let x = this.W / 2 - tot / 2; const y = this.H - 92 - 25;
    cats.forEach((k, i) => { this.vetro(c, x, y, ws[i], 50, 25, TM); c.fillStyle = k.colore; c.beginPath(); c.arc(x + 26, y + 25, 8, 0, 7); c.fill(); c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1.5; c.stroke();
      txt(c, x + 44, y + 31, k.nome, 'SFTS', 15, TM.testo); c.textAlign = 'right'; txt(c, x + ws[i] - 20, y + 31, k.prezzo.toLocaleString('en-US') + ' ' + this.S.valuta, 'SFTB', 15, TM.testo); c.textAlign = 'left'; x += ws[i] + gap; });
    c.restore();
  }
  bigliettoChiaro(c, ax, ay, e, t) {
    const a = ease(t / 0.28), w = 300, h = 132, x = clamp(ax - w / 2, 24, this.W - w - 24), sotto = ay - h - 26 < 190, y = (sotto ? Math.max(ay + 26, 196) : clamp(ay - h - 26, 24, this.H - h - 24)) + (1 - a) * 10;
    c.save(); c.globalAlpha = a; c.shadowColor = 'rgba(0,0,0,0.28)'; c.shadowBlur = 30; c.shadowOffsetY = 10; rr(c, x, y, w, h, 18); c.fillStyle = PAPER; c.fill(); c.shadowColor = 'transparent';
    caps(c, x + 22, y + 34, e.sopra, 11.5, MUTE, 0.16); txt(c, x + 22, y + 72, e.titolo, 'SFD', 29, INK); if (e.prezzo) txt(c, x + 22, y + 108, e.prezzo, 'SFTS', 16, INK); c.restore();
  }

  posti(c, st, now) {   // fila e posto sotto il mouse + le schede dei posti scelti in basso
    const M = this.M, L = this.S.livelli[st.liv], n = L.quanti || 1, scelti = L.tipo === 'vip' ? st.vip.map(k => ({ k, id: 'v' + k })) : st.scelti, TM = this.tema();
    const B = st.sel[2] && st.sel[2].B, cat = B && M.categoria ? M.categoria(B) : null, colScelta = L.tipo === 'vip' ? (this.S.oroVip || '#e3c27a') : (cat ? cat.colore : OR);
    if (st.hover) { const e = M.etichetta(st.liv, st.hover, st), p = this.proietta(M.ancora(st.liv, st.hover, st)); if (e && p[2]) {
      const sh = this.shake && this.shake.id === st.hover.id ? Math.sin((now - this.shake.t) * 60) * 7 * Math.max(0, 1 - (now - this.shake.t) / 0.4) : 0;
      const w = 250, h = 70, x = clamp(p[0] - w / 2, 20, this.W - w - 20) + sh, y = p[1] - h - 30;
      if (TM) this.vetro(c, x, y, w, h, 16, TM); else { c.save(); c.shadowColor = 'rgba(0,0,0,0.3)'; c.shadowBlur = 24; c.shadowOffsetY = 8; rr(c, x, y, w, h, 14); c.fillStyle = PAPER; c.fill(); c.restore(); }
      const tc = TM ? TM.testo : INK; txt(c, x + 18, y + 30, e.titolo, 'SFTB', 17.5, tc); const col = st.hover.preso ? '#ff6b6b' : '#3fd47f'; c.fillStyle = col; c.beginPath(); c.arc(x + 23, y + 50, 4.5, 0, 7); c.fill(); txt(c, x + 34, y + 55, st.hover.preso ? (L.tipo === 'vip' ? 'Booked' : 'Taken') : (L.tipo === 'vip' ? 'VIP seat' : 'Available'), 'SFTS', 13.5, col);
      if (e.prezzo && !(st.hover.preso && L.tipo === 'vip')) { c.textAlign = 'right'; txt(c, x + w - 18, y + 55, e.prezzo, 'SFTS', 13.5, tc); c.textAlign = 'left'; } } }
    const lab = L.nomi || ['You', '+1'], cw = 280, gap = 16, tot = n * cw + (n - 1) * gap, x0 = this.W / 2 - tot / 2, y0 = this.H - 214;
    for (let i = 0; i < n; i++) { const s = scelti[i], x = x0 + i * (cw + gap);
      if (TM) { c.save(); c.globalAlpha = s ? 1 : 0.82; this.vetro(c, x, y0, cw, 72, 18, TM); c.restore(); }
      else { c.save(); c.globalAlpha = s ? 1 : 0.75; rr(c, x, y0, cw, 72, 16); c.fillStyle = s ? PAPER : 'rgba(255,255,255,0.18)'; c.fill(); c.restore(); }
      const tc = TM ? TM.testo : (s ? INK : '#fff'), mc = TM ? TM.mute : MUTE;
      c.fillStyle = s ? colScelta : 'rgba(255,255,255,0.18)'; c.beginPath(); c.arc(x + 34, y0 + 36, 16, 0, 7); c.fill(); if (!s) { c.strokeStyle = TM && TM.oro ? TM.oro[0] : 'rgba(255,255,255,0.8)'; c.lineWidth = 1.4; c.setLineDash([4, 4]); c.stroke(); c.setLineDash([]); }
      c.textAlign = 'center'; txt(c, x + 34, y0 + 42, String(i + 1), 'SFTB', 15, s ? '#fff' : tc); c.textAlign = 'left';
      txt(c, x + 62, y0 + 30, lab[i], 'SFTS', 13, mc); txt(c, x + 62, y0 + 53, s ? M.etichetta(st.liv, s, st).titolo : (L.tipo === 'vip' ? 'Pick a VIP seat' : 'Pick a seat'), 'SFTB', 17, tc); }
  }

  finale(c, st, now) {   // biglietto premium (stile T1/T2/T3) sulla vista vera
    const e = this.M.finale ? this.M.finale(st) : null; if (!e) return; const a = ease((now - st.tIn) / 0.7), w = 640, h = 300, x = this.W - w - 64, y = this.H - h - 140 + (1 - a) * 22;
    biglietto(this.x, x, y, w, h, this.stileBiglietto, e, this.logo, now, a);
  }

  offerta(c, st, now) {   // «Do you want an upgrade?» con i due bottoni, come nel primo stadio
    const o = this.M.offerta ? this.M.offerta(st) : null; if (!o) return; const a = ease((now - st.tIn) / 0.45), w = 520, h = 250, x = this.W / 2 - w / 2, y = this.H / 2 - h / 2 + 60 + (1 - a) * 18;
    c.save(); c.globalAlpha = a; c.shadowColor = 'rgba(0,0,0,0.4)'; c.shadowBlur = 44; c.shadowOffsetY = 14; rr(c, x, y, w, h, 26); c.fillStyle = PAPER; c.fill(); c.restore();
    c.save(); c.globalAlpha = a; c.textAlign = 'center'; caps(c, x + w / 2, y + 46, o.sotto, 12, MUTE, 0.16); txt(c, x + w / 2, y + 96, o.titolo, 'SFD', 34, INK); c.restore();
    const bw = 214, bh = 70, by = y + h - bh - 30, bx1 = x + 30, bx2 = x + w - 30 - bw;
    for (const [bx, id, l1, l2, on] of [[bx1, 'tieni', 'Keep my seats', o.da, false], [bx2, 'upgrade', 'Upgrade', o.a, true]]) {
      const TM = this.tema(); c.save(); c.globalAlpha = a; rr(c, bx, by, bw, bh, 18); c.fillStyle = on ? (TM ? (st.hBtn === id ? TM.btnHov : TM.btn) : (st.hBtn === id ? '#ff8a2e' : OR)) : (st.hBtn === id ? '#ececef' : '#f3f3f5'); c.fill(); if (on && TM && TM.bordo) { rr(c, bx + 3, by + 3, bw - 6, bh - 6, 15); c.lineWidth = 1.4; c.strokeStyle = TM.bordo; c.stroke(); }
      c.textAlign = 'center'; txt(c, bx + bw / 2, by + 31, l1, 'SFTB', 18, on ? (TM ? TM.btnTxt : '#fff') : INK); txt(c, bx + bw / 2, by + 54, l2, 'SFTS', 14, on ? (TM ? TM.btnTxt : 'rgba(255,255,255,0.9)') : MUTE); c.restore();
      if (a > 0.9) this.btns.push({ id, r: [bx, by, bx + bw, by + bh], c: [bx + bw / 2, by + bh / 2] });
    }
  }

  tema() { return this.S.biglietto && this.S.biglietto.temaUI ? TEMI[this.lux] : null; }
  etichetta(st, volo) {   // solo per i video di regia (?etic=1): quale clip è, o «Stacco» quando si sceglie
    const c = this.x, t = volo ? st.clipT : 'Stacco · scegli (foto ferma con la scelta sopra)'; if (!t) return;
    c.save(); c.font = '600 22px SFTS'; const w = c.measureText(t).width + 36; rr(c, 34, this.H - 74, w, 46, 12); c.fillStyle = volo ? 'rgba(255,122,18,0.92)' : 'rgba(0,0,0,0.6)'; c.fill();
    c.fillStyle = '#fff'; c.fillText(t, 52, this.H - 43); c.restore();
  }

  booked(c, st, now) {   // si torna su sopra lo stadio: biglietto grande al centro col timbro BOOKED
    if (st.arrivato !== st.liv) return;   // il biglietto BOOKED arriva quando la camera è ferma sopra lo stadio
    const e = this.M.finale ? this.M.finale(st) : null; if (!e) return; const a = ease((now - st.tIn) / 0.8), w = 760, h = 356, x = this.W / 2 - w / 2, y = this.H / 2 - h / 2 + 40 + (1 - a) * 30;
    biglietto(this.x, x, y, w, h, this.stileBiglietto, e, this.logo, now, a);
    const s2 = ease((now - st.tIn - 0.5) / 0.35); if (s2 <= 0) return;
    c.save(); c.translate(x + w * 0.5, y + h * 0.42); c.rotate(-0.12); c.scale(1.6 - 0.6 * s2, 1.6 - 0.6 * s2); c.globalAlpha = s2;
    c.lineWidth = 6; c.strokeStyle = '#2bd46a'; c.fillStyle = 'rgba(16,40,24,0.55)'; rr(c, -170, -50, 340, 100, 18); c.fill(); c.stroke();
    c.textAlign = 'center'; c.font = '800 64px SFTB'; c.fillStyle = '#2bd46a'; c.fillText('BOOKED', 0, 23); c.restore();
  }

  pill(c, cx, cy, testo, id, attivo, hov, secondario) {
    if (this.temaTorre && attivo) return this.temaTorre.pill(c, this, cx, cy, testo, id, hov, secondario);
    const TM = this.tema();
    if (TM && attivo) {   // bottoni dell'evento: oro pieno (o verde, o blu notte col nastro), il secondario in vetro col filo d'oro
      c.font = '600 19px SFTS'; const w = c.measureText(testo).width + 84, h = 60, x = cx - w / 2, y = cy - h / 2;
      if (secondario) { this.vetro(c, x, y, w, h, h / 2, TM); if (hov) { c.save(); rr(c, x, y, w, h, h / 2); c.fillStyle = 'rgba(255,255,255,0.08)'; c.fill(); c.restore(); } c.textAlign = 'center'; txt(c, cx, cy + 7, testo, 'SFTS', 19, TM.secTxt); c.textAlign = 'left'; }
      else { c.save(); c.shadowColor = 'rgba(0,0,0,0.42)'; c.shadowBlur = 28; c.shadowOffsetY = 10; rr(c, x, y, w, h, h / 2); c.fillStyle = TM.btn === 'oro' ? this.gradOro(c, x, y, w, h, TM) : TM.btn; c.fill(); c.restore();
        if (TM.btn === 'oro') { c.save(); rr(c, x, y, w, h * 0.5, h / 2); c.clip(); c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(x, y, w, h * 0.5); c.restore(); }
        else if (TM.oro) { c.save(); rr(c, x + 1, y + 1, w - 2, h - 2, h / 2 - 1); c.lineWidth = 1.5; c.strokeStyle = this.gradOro(c, x, y, w, h, TM); c.stroke(); c.restore(); }
        else { c.save(); rr(c, x, y, w, h, h / 2); c.clip(); NASTRO_UI.forEach((col, i) => { c.fillStyle = col; c.fillRect(x + i * w / 5, y + h - 4, w / 5 + 1, 4); }); c.restore(); }
        if (hov) { c.save(); rr(c, x, y, w, h, h / 2); c.fillStyle = 'rgba(255,255,255,0.12)'; c.fill(); c.restore(); }
        c.textAlign = 'center'; txt(c, cx, cy + 7, testo, 'SFTB', 19, TM.btnTxt); c.textAlign = 'left'; }
      this.btns.push({ id, r: [x, y, x + w, y + h], c: [cx, cy] }); return;
    }
    if (secondario && attivo) { c.font = '600 19px SFTS'; const w = c.measureText(testo).width + 76, h = 58, x = cx - w / 2, y = cy - h / 2;
      c.save(); c.shadowColor = 'rgba(0,0,0,0.3)'; c.shadowBlur = 22; c.shadowOffsetY = 8; rr(c, x, y, w, h, h / 2); c.fillStyle = hov ? '#ffffff' : 'rgba(251,250,247,0.94)'; c.fill(); c.restore();
      c.textAlign = 'center'; txt(c, cx, cy + 7, testo, 'SFTS', 19, INK); c.textAlign = 'left'; this.btns.push({ id, r: [x, y, x + w, y + h], c: [cx, cy] }); return; }
    c.font = '600 19px SFTS'; const w = c.measureText(testo).width + 64, h = 56, x = cx - w / 2, y = cy - h / 2;
    c.save(); c.shadowColor = 'rgba(0,0,0,0.3)'; c.shadowBlur = 24; c.shadowOffsetY = 8; rr(c, x, y, w, h, h / 2); c.fillStyle = attivo ? (hov ? '#ff8a2e' : OR) : 'rgba(255,255,255,0.25)'; c.fill(); c.restore();
    c.textAlign = 'center'; txt(c, cx, cy + 7, testo, 'SFTS', 19, '#fff'); c.textAlign = 'left'; if (attivo) this.btns.push({ id, r: [x, y, x + w, y + h], c: [cx, cy] });
  }

  cursore(c, x, y, now) {
    if (this.click && now - this.click.t < 0.5) { const u = (now - this.click.t) / 0.5; c.save(); c.globalAlpha = 1 - u; c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.arc(x, y, 10 + u * 30, 0, 7); c.stroke(); c.restore(); }
    c.save(); c.translate(x, y); c.scale(1.35, 1.35); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 22); c.lineTo(5.5, 16.5); c.lineTo(9.5, 25.5); c.lineTo(13, 24); c.lineTo(9, 15.2); c.lineTo(16.5, 15.2); c.closePath();
    c.shadowColor = 'rgba(0,0,0,0.35)'; c.shadowBlur = 6; c.shadowOffsetY = 2; c.fillStyle = '#111'; c.fill(); c.shadowColor = 'transparent'; c.strokeStyle = '#fff'; c.lineWidth = 1.6; c.stroke(); c.restore();
  }
}

function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function txt(c, x, y, t, f, px, col) { c.font = `${px}px ${f}`; c.fillStyle = col; c.fillText(t, x, y); }
function caps(c, x, y, t, px, col, tr = 0.12) { c.font = `${px}px SFTS`; c.letterSpacing = `${(tr * px).toFixed(2)}px`; c.fillStyle = col; c.fillText(String(t).toUpperCase(), x, y); c.letterSpacing = '0px'; }
function wrap(c, t, x, y, w, lh) { const ws = t.split(' '); let line = '', yy = y; for (const s of ws) { const tst = line ? line + ' ' + s : s; if (c.measureText(tst).width > w && line) { c.fillText(line, x, yy); line = s; yy += lh; } else line = tst; } c.fillText(line, x, yy); }
