// Inizio a strisce del Mondiale (stadio 2034, 22/11 Nico).
// Mentre la camera vola da fuori a sopra lo stadio le 5 strisce del logo passano come una transizione (entrano veloci, al centro
// quasi si fermano, ripartono) con sopra il badge del logo e «WORLD CUP FINAL / 2034 / CHOOSE YOUR SEAT» in Kufam (stile 1 della
// board: oro del deserto). Arrivati sopra lo stadio compare la card centrale «Choose your seat / for the 2034 Final» col bottone.
// Il soggetto lo accende con S.intro = { ripresa, dur, colori, … }. Tutto è funzione del tempo (st.introT0 per le strisce,
// st.tIn per la card), così il giro e il film di VideoHub vengono uguali.
// Fluidità (Nico: «buggate, si bloccano, non smooth»): strisce e scritta sono immagini fatte una volta sola; le strisce in corsa hanno
// il mosso vero (più copie dentro lo stesso fotogramma, mediate), così anche a 24 fotogrammi non scattano. La scritta non corre:
// sta al centro e scivola piano a velocità costante, entra ed esce in dissolvenza.
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const eOut = t => 1 - Math.pow(1 - clamp(t), 3), liscio = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const eBack = t => { t = clamp(t); const k = 1.45; return 1 + (k + 1) * Math.pow(t - 1, 3) + k * Math.pow(t - 1, 2); };
const FONT = '-apple-system, "SF Pro Display", system-ui, "Helvetica Neue", Arial, sans-serif';
const KB = '"KufamBI", ' + FONT, KX = '"KufamXB", ' + FONT;   // Kufam nera corsiva e extra bold (assets/fonts, caricate da ui.js)
const NAVY = '#10163a';
const tela = (w, h) => { const q = document.createElement('canvas'); q.width = Math.ceil(w); q.height = Math.ceil(h); return q; };
const mix = (hex, con, k) => { const a = parseInt(hex.slice(1), 16), b = parseInt(con.slice(1), 16), m = (s) => Math.round(((a >> s) & 255) * k + ((b >> s) & 255) * (1 - k));
  return `rgb(${m(16)},${m(8)},${m(0)})`; };

function tessuto(c) {   // il disegno a tessuto delle strisce del logo
  const q = tela(48, 48), x = q.getContext('2d');
  x.lineWidth = 9; x.strokeStyle = 'rgba(255,255,255,0.15)'; for (let k = -48; k <= 96; k += 24) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k + 48, 48); x.stroke(); }
  x.strokeStyle = 'rgba(0,0,0,0.10)'; for (let k = -48; k <= 96; k += 24) { x.beginPath(); x.moveTo(k + 48, 0); x.lineTo(k, 48); x.stroke(); }
  return c.createPattern(q, 'repeat');
}

// ---------- le immagini pronte: una per striscia e una per la scritta ----------
let cache = null;
function pronte(ui, S) {
  const I = S.intro, W = ui.W, H = ui.H, bw = I.larga || 200, tilt = Math.tan(20 * Math.PI / 180) * H / 2, m = 60;
  const fontOk = document.fonts && document.fonts.check('40px "KufamBI"') && document.fonts.check('20px "KufamXB"');
  const chiave = [W, H, bw, I.colori.join(), fontOk, !!(ui.logo && ui.logo.naturalWidth)].join('|');
  if (cache && cache.chiave === chiave) return cache;
  const strisce = I.colori.map(col => {   // la striscia: sfumata (più chiara in alto, più scura in basso), tessuto, filo d'oro a destra, ombra
    const q = tela(bw + tilt * 2 + m * 2, H), x = q.getContext('2d'), ox = m;
    const forma = () => { x.beginPath(); x.moveTo(ox + tilt * 2, 0); x.lineTo(ox + tilt * 2 + bw, 0); x.lineTo(ox + bw, H); x.lineTo(ox, H); x.closePath(); };
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, mix(col, '#ffffff', 0.82)); g.addColorStop(0.45, col); g.addColorStop(1, mix(col, '#000000', 0.7));
    x.save(); x.shadowColor = 'rgba(0,0,0,0.35)'; x.shadowBlur = 46; forma(); x.fillStyle = g; x.fill(); x.restore();
    x.save(); forma(); x.clip(); x.fillStyle = tessuto(x); x.fillRect(0, 0, q.width, H); x.restore();
    x.save(); x.beginPath(); x.moveTo(ox + tilt * 2 + bw, 0); x.lineTo(ox + bw, H); x.lineWidth = 5; x.strokeStyle = '#e9c46a'; x.stroke(); x.restore();
    return q;
  });
  // la scritta, come lo stile 1 della board: badge col logo, WORLD CUP FINAL in oro, 2034 bianco con l'ombra a scalini nei colori, CHOOSE YOUR SEAT su fascia blu
  const TW = 1500, TH = 640, q = tela(TW, TH), x = q.getContext('2d'), cx = TW / 2; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
  const lg = ui.logo; let y = 30;
  if (lg && lg.naturalWidth) { const lh = 112, lw = lh * lg.naturalWidth / lg.naturalHeight, bwd = lw + 34, bh = lh + 22;
    x.save(); x.shadowColor = 'rgba(0,0,0,0.4)'; x.shadowBlur = 38; x.shadowOffsetY = 15; x.beginPath(); x.roundRect(cx - bwd / 2, y, bwd, bh, 27); x.fillStyle = '#ffffff'; x.fill(); x.restore();
    x.drawImage(lg, cx - lw / 2, y + 11, lw, lh); y += bh + 34; }
  const y1 = y + 58;   // WORLD CUP FINAL
  x.font = `121px ${KB}`; x.letterSpacing = '2px';
  x.save(); x.shadowColor = 'rgba(0,0,0,0.7)'; x.shadowBlur = 19; x.shadowOffsetY = 12; x.fillStyle = NAVY; x.fillText('WORLD CUP FINAL', cx, y1 + 3); x.restore();
  x.fillStyle = NAVY; x.fillText('WORLD CUP FINAL', cx, y1 + 3);
  const go = x.createLinearGradient(0, y1 - 60, 0, y1 + 60); go.addColorStop(0, '#fff6d0'); go.addColorStop(0.38, '#f3d27a'); go.addColorStop(0.62, '#b07a1c'); go.addColorStop(1, '#f7e08a');
  x.lineWidth = 4; x.strokeStyle = '#2a1805'; x.strokeText('WORLD CUP FINAL', cx, y1); x.fillStyle = go; x.fillText('WORLD CUP FINAL', cx, y1);
  const y2 = y1 + 150;   // 2034
  x.font = `173px ${KB}`; x.letterSpacing = '0px';
  x.save(); x.shadowColor = 'rgba(0,0,0,0.6)'; x.shadowBlur = 31; x.shadowOffsetY = 23; x.fillStyle = '#1fa55a'; x.fillText('2034', cx + 17, y2 + 17); x.restore();
  for (const [d, col] of [[17, '#1fa55a'], [11.5, '#a457b8'], [5.8, '#ef4b2b']]) { x.lineWidth = 19; x.strokeStyle = col; x.strokeText('2034', cx + d, y2 + d); x.fillStyle = col; x.fillText('2034', cx + d, y2 + d); }
  x.lineWidth = 19; x.strokeStyle = NAVY; x.strokeText('2034', cx, y2); x.fillStyle = '#ffffff'; x.fillText('2034', cx, y2);
  const y3 = y2 + 136;   // CHOOSE YOUR SEAT su fascia blu notte con i fili d'oro
  x.font = `26px ${KX}`; x.letterSpacing = '13px'; const w3 = x.measureText('CHOOSE YOUR SEAT').width + 64, h3 = 50;
  x.fillStyle = 'rgba(16,22,58,0.88)'; x.fillRect(cx - w3 / 2, y3 - h3 / 2, w3, h3); x.fillStyle = '#e9c46a'; x.fillRect(cx - w3 / 2, y3 - h3 / 2, w3, 2.5); x.fillRect(cx - w3 / 2, y3 + h3 / 2 - 2.5, w3, 2.5);
  x.fillStyle = '#f3d27a'; x.fillText('CHOOSE YOUR SEAT', cx + 6.5, y3 + 1);
  const r = { chiave, strisce, scritta: q, bw, tilt, m, acc: tela(W, H) };
  if (fontOk) cache = r; return r;
}

// le strisce e la scritta durante il volo d'arrivo (st.arrivato !== livello).
// 22/11 Nico: «non devono fermarsi, arrivano e vanno, quasi si fermano ma ripartono, come una transizione»: ogni striscia fa un solo
// passaggio da sinistra a destra, veloce ai lati e lentissima al centro (mai ferma).
const passaggio = v => 0.86 * v * v * v + (1 - 0.86) * v;   // v da -1 a 1 → posizione da -1 a 1, al centro va al 14% della velocità media
let tPrima = null;
export function introStrisce(c, ui, S, st, now) {
  const I = S.intro, W = ui.W, H = ui.H, t = now - (st.introT0 ?? st.tIn), n = I.colori.length, P = pronte(ui, S);
  const { bw, tilt, m } = P, x0 = W / 2 - n * bw / 2, via = W / 2 + n * bw + tilt * 2 + 40;
  const passo = I.passo ?? 0.06, D = I.passa ?? 2.72, t0 = 0.02;
  // otturatore a mezzo fotogramma: a 24 fps (film) 1/48 s, dal vivo quanto passa tra un disegno e l'altro
  const dtF = tPrima == null || now <= tPrima ? 1 / 24 : clamp(now - tPrima, 1 / 120, 1 / 20); tPrima = now; const otturatore = dtF * 0.5;
  const pos = (k, tt) => { const v = ((tt - t0 - k * passo) / D) * 2 - 1; return v <= -1 ? -2 * via : v >= 1 ? 2 * via : passaggio(v) * via; };
  const A = P.acc, ax = A.getContext('2d');
  for (let k = 0; k < n; k++) {
    const xa = pos(k, t), xb = pos(k, t - otturatore); if (Math.abs(xa) > 1.5 * via && Math.abs(xb) > 1.5 * via) continue;
    const base = x0 + k * bw - tilt - m, sp = P.strisce[k], campioni = clamp(Math.ceil(Math.abs(xa - xb) / 6), 1, 24);
    if (campioni === 1) { c.drawImage(sp, base + xa, 0); continue; }
    // il mosso: la media di più copie lungo il tratto percorso nel mezzo fotogramma (somma con 'lighter' a peso uguale)
    const lo = Math.max(0, Math.floor(base + Math.min(xa, xb))), hi = Math.min(W, Math.ceil(base + Math.max(xa, xb) + sp.width)); if (hi <= lo) continue;
    ax.clearRect(lo, 0, hi - lo, H); ax.globalCompositeOperation = 'lighter'; ax.globalAlpha = 1 / campioni;
    for (let j = 0; j < campioni; j++) ax.drawImage(sp, base + xb + (xa - xb) * j / (campioni - 1), 0);
    ax.globalAlpha = 1; ax.globalCompositeOperation = 'source-over';
    c.drawImage(A, lo, 0, hi - lo, H, lo, 0, hi - lo, H);
  }
  // la scritta: al centro, scivola piano a velocità costante (niente scatti), entra ed esce in dissolvenza mentre le strisce rallentano
  const mezzo = t0 + (n - 1) / 2 * passo + D / 2, durata = I.scrittaDur ?? 1.5, ta = mezzo - durata / 2, u = (t - ta) / durata;
  const al = liscio(u / 0.22) * liscio((1 - u) / 0.22); if (al <= 0.001) return;
  const sx = (u - 0.5) * (I.scivola ?? 70), sc = 0.985 + 0.03 * clamp(u), sw = P.scritta.width, sh = P.scritta.height;
  c.save(); c.globalAlpha = al; c.translate(W / 2 + sx, H * 0.52); c.scale(sc, sc); c.drawImage(P.scritta, -sw / 2, -sh / 2); c.restore();
}

// la card al centro, a camera ferma sopra lo stadio: «Choose your seat / for the 2034 Final» e il bottone
export function introCard(c, ui, S, st, now, hov) {
  const I = S.intro, W = ui.W, H = ui.H, TM = ui.tema(), dt = now - st.tIn, a = eOut(dt / 0.5), s = 0.9 + 0.1 * eBack(dt / 0.55);
  const w = I.cardW || 780, h = 330, cx = W / 2, cy = H * (I.cardY ?? 0.6), x = cx - w / 2, y = cy - h / 2;
  c.save(); c.globalAlpha = a; c.translate(cx, cy); c.scale(s, s); c.translate(-cx, -cy);
  if (TM) ui.vetro(c, x, y, w, h, 30, TM); else { c.beginPath(); c.roundRect(x, y, w, h, 30); c.fillStyle = 'rgba(14,18,38,0.72)'; c.fill(); }
  c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  c.font = `700 15px ${FONT}`; c.letterSpacing = '5px'; c.fillStyle = '#e7c779'; c.fillText('SAUDI 2034 · THE FINAL', cx + 2.5, y + 58); c.letterSpacing = '0px';
  c.font = `900 60px ${FONT}`; c.fillStyle = '#ffffff'; c.shadowColor = 'rgba(0,0,0,0.35)'; c.shadowBlur = 16; c.fillText('Choose your seat', cx, y + 128);
  const g = c.createLinearGradient(0, y + 140, 0, y + 196); g.addColorStop(0, '#fbeab7'); g.addColorStop(0.5, '#e7c779'); g.addColorStop(1, '#b98a35');
  c.fillStyle = g; c.fillText('for the 2034 Final', cx, y + 192); c.shadowColor = 'transparent';
  const sw = 58, sg = 9, sx = cx - (I.colori.length * sw + (I.colori.length - 1) * sg) / 2;   // le 5 strisce piccole, come la sigla
  I.colori.forEach((col, i) => { const k = eOut((dt - 0.25 - i * 0.06) / 0.35); if (k <= 0) return; c.beginPath(); c.roundRect(sx + i * (sw + sg), y + 216, sw * k, 7, 3.5); c.fillStyle = col; c.fill(); });
  c.restore();
  if (a > 0.6) ui.pill(c, cx, y + h - 50, I.bottone || 'Find my seat', 'avanti', true, hov);
}
