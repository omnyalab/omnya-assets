// Motore choose-your · biglietto delle torri (The Split): non un posto allo stadio ma la chiave di una casa.
// Due stili da far scegliere a Nico in board: 'champagne' (carta chiara, bronzo, filo d'oro) e 'notte' (vetro scuro, oro).
// Sulla matrice c'è la sagoma della torre con il tuo piano acceso e la fessura che si illumina lì (il nostro tocco).
// e = { sopra, titolo, righe: [[etichetta, valore]…], data, nota, torre: { sagoma: [[u, xs, xd]…], piano: 0..1, stanza: 0..1|null, attico: bool }, timbro }

const STILI = {
  champagne: { fondo: ['#fbf7f0', '#efe5d6'], bordo: ['#e8cfa0', '#b98a52', '#f4dfb6', '#a8784a'], sopra: '#a7764a', titolo: '#1c1a17', etichetta: '#9a8a76', valore: '#1c1a17', riga: '#e4d8c6',
    stub: ['#f3e9da', '#e4d3bb'], vetro: '#b9c0c8', bronzo: '#b4834f', luce: '#ff7a12', nota: '#9b9387', barre: '#2a241d' },
  notte: { fondo: ['#1a1d24', '#0d0f14'], bordo: ['#f6e3b0', '#c49a52', '#fff0c8', '#a87c38'], sopra: '#e3c27a', titolo: '#ffffff', etichetta: 'rgba(227,194,122,0.75)', valore: '#ffffff', riga: 'rgba(227,194,122,0.28)',
    stub: ['#22262e', '#14171c'], vetro: '#5d6b7c', bronzo: '#d3a467', luce: '#ffb15a', nota: 'rgba(255,255,255,0.5)', barre: '#f3e2b0' },
};

export function bigliettoTorre(c, x, y, w, h, stile, e, t = 0, a = 1) {
  const S = STILI[stile] || STILI.champagne, stub = Math.round(w * 0.3), mx = x + w - stub;
  c.save(); c.globalAlpha = a;
  c.shadowColor = 'rgba(0,0,0,0.42)'; c.shadowBlur = 46; c.shadowOffsetY = 16; rr(c, x, y, w, h, 20); c.fillStyle = S.fondo[1]; c.fill(); c.shadowColor = 'transparent';
  c.save(); rr(c, x, y, w, h, 20); c.clip();
  let g = c.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, S.fondo[0]); g.addColorStop(1, S.fondo[1]); c.fillStyle = g; c.fillRect(x, y, w, h);
  // filigrana: righe verticali sottili come i montanti della facciata
  c.globalAlpha = a * (stile === 'notte' ? 0.08 : 0.1); c.fillStyle = S.bronzo; for (let xx = x + 14; xx < mx; xx += 9) c.fillRect(xx, y, 1, h); c.globalAlpha = a;
  g = c.createLinearGradient(mx, y, x + w, y + h); g.addColorStop(0, S.stub[0]); g.addColorStop(1, S.stub[1]); c.fillStyle = g; c.fillRect(mx, y, x + w - mx, h);
  // riflesso che passa (lamina)
  const f = ((t * 0.35) % 1.6) - 0.3, lg = c.createLinearGradient(x + w * f - 120, y, x + w * f + 120, y + h); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, `rgba(255,240,210,${stile === 'notte' ? 0.12 : 0.28})`); lg.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = lg; c.fillRect(x, y, w, h);
  c.restore();
  // strappo: fori e tratteggio
  c.save(); c.globalCompositeOperation = 'destination-out'; for (const yy of [y, y + h]) { c.beginPath(); c.arc(mx, yy, 12, 0, 7); c.fill(); } c.restore();
  c.save(); c.strokeStyle = S.riga; c.lineWidth = 1.4; c.setLineDash([5, 6]); c.beginPath(); c.moveTo(mx, y + 18); c.lineTo(mx, y + h - 18); c.stroke(); c.restore();
  // filo d'oro
  c.save(); rr(c, x + 7, y + 7, w - 14, h - 14, 15); c.lineWidth = 1.5; const og = c.createLinearGradient(x, y, x + w, y + h); S.bordo.forEach((col, i) => og.addColorStop(i / (S.bordo.length - 1), col)); c.strokeStyle = og; c.stroke(); c.restore();
  // testi
  const tx = x + 34; caps(c, tx, y + 44, e.sopra || 'The Split', 12.5, S.sopra, 0.26);
  c.font = '600 40px SFD'; c.fillStyle = S.titolo; fit(c, e.titolo || '', tx, y + 100, mx - tx - 24);
  c.fillStyle = S.riga; c.fillRect(tx, y + 122, mx - tx - 30, 1);
  const colW = (mx - tx - 30) / 3; (e.righe || []).forEach((r, i) => { const cx = tx + i * colW, cy = y + 152; caps(c, cx, cy, r[0], 10.5, S.etichetta, 0.18); c.font = '17px SFTB'; c.fillStyle = S.valore; fit(c, r[1], cx, cy + 25, colW - 12); });
  c.font = '12px SFTS'; c.fillStyle = S.etichetta; c.fillText(e.data || '', tx, y + h - 26);
  // matrice: la torre col tuo piano acceso
  sagoma(c, mx + 24, y + 26, stub - 48, h - 92, e.torre || {}, S, t);
  caps(c, mx + 24, y + h - 44, e.chiave || 'Residence', 10.5, S.etichetta, 0.18);
  c.font = '10px SFTS'; c.fillStyle = S.nota; c.textAlign = 'right'; c.fillText(e.nota || 'Concept by Omnya Lab', x + w - 22, y + h - 20); c.textAlign = 'left';
  c.restore();
}

function sagoma(c, x, y, w, h, T, S, t) {   // due volumi stilizzati con la fessura; il piano scelto è una linea arancio e la fessura lì si accende
  const cx = x + w / 2, H = h, top = y, bot = y + h, sc = H / 1.0;
  const lw = w * 0.36, rw = w * 0.3, gap = w * 0.06, hR = 0.888;
  const vol = (side, hh, ww) => { c.beginPath(); const x0 = side < 0 ? cx - gap / 2 : cx + gap / 2, x1 = x0 + side * ww;
    c.moveTo(x0, bot); c.bezierCurveTo(x0, bot - H * 0.5, x0, bot - H * hh * 0.9, x0, bot - H * hh); c.quadraticCurveTo(x1 - side * ww * 0.1, bot - H * hh - 6, x1, bot - H * (hh - 0.06)); c.bezierCurveTo(x1 + side * ww * 0.12, bot - H * 0.55, x1 + side * ww * 0.06, bot - H * 0.15, x1 - side * ww * 0.06, bot); c.closePath(); };
  c.save(); c.globalAlpha *= 0.95; c.fillStyle = S.vetro; vol(-1, 1.0, lw); c.fill(); vol(1, hR, rw); c.fill();
  c.fillStyle = S.bronzo; c.fillRect(cx - gap / 2, bot - H * hR, gap, H * hR); c.restore();
  // la stanza sotto lo sbalzo (sempre un taglio caldo) e il piano scelto
  if (T.stanza != null) { const yy = bot - H * T.stanza; c.fillStyle = 'rgba(255,207,150,0.95)'; c.fillRect(cx + gap / 2, yy - 2, rw * 0.92, 4); }
  if (T.piano != null) { const yy = bot - H * T.piano, k = 0.65 + 0.35 * Math.sin(t * 4);
    c.save(); c.shadowColor = S.luce; c.shadowBlur = 14; c.fillStyle = S.luce; c.fillRect(cx - gap / 2 - (T.attico ? lw * 0.7 : 0), yy - 2.5, gap + (T.attico ? lw * 0.7 : rw * 0.95), 5); c.restore();
    c.save(); c.globalAlpha = k; c.fillStyle = '#ffd9a0'; c.fillRect(cx - gap / 2, yy - 7, gap, 14); c.restore(); }
}
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function caps(c, x, y, t, px, col, tr = 0.12) { c.font = `${px}px SFTS`; c.letterSpacing = `${(tr * px).toFixed(2)}px`; c.fillStyle = col; c.fillText(String(t).toUpperCase(), x, y); c.letterSpacing = '0px'; }
function fit(c, t, x, y, w) { let s = String(t); while (c.measureText(s).width > w && s.length > 4) s = s.slice(0, -2) + '…'; c.fillText(s, x, y); }
