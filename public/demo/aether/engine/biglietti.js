// Motore choose-your · biglietti premium (evento 2034): tre stili da proporre a Nico in board.
// T1 Notte e oro (blu del logo, lamina olografica, oro), T2 Perla e nastro (bianco perla coi colori del nastro del logo),
// T3 Verde reale (verde con arabesco d'oro). Sempre mappa del posto e «Concept by Omnya Lab» piccolo.
import { sePoint } from './kit/forme.js';
import { bigliettoTorre } from './biglietto-torre.js';   // torri: il biglietto è la chiave di casa (forma 'torre')

const NASTRO = ['#ffcb05', '#ef4b2b', '#a457b8', '#f7941d', '#55aa5c', '#2b3a7a'];
const OR = '#ff7a12';

export function biglietto(c, x, y, w, h, stile, e, logo, t = 0, a = 1) {
  if (e && e.forma === 'torre') return bigliettoTorre(c, x, y, w, h, e.stile, e, t, a);
  const stub = Math.round(w * 0.27), mx = x + w - stub;
  c.save(); c.globalAlpha = a;
  c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 44; c.shadowOffsetY = 16; rr(c, x, y, w, h, 22); c.fillStyle = '#000'; c.fill(); c.shadowColor = 'transparent';
  c.save(); rr(c, x, y, w, h, 22); c.clip();
  const S = STILI[e.vip ? 4 : stile] || STILI[1]; S.fondo(c, x, y, w, h, mx, t);
  // lamina olografica sulla linea di strappo
  holo(c, mx - 9, y, 18, h, t, S.holoA ?? 0.9);
  c.restore();
  // fori dello strappo
  c.save(); c.globalCompositeOperation = 'destination-out'; for (const yy of [y, y + h]) { c.beginPath(); c.arc(mx, yy, 13, 0, 7); c.fill(); } c.restore();
  // bordo oro
  c.save(); rr(c, x + 7, y + 7, w - 14, h - 14, 16); c.lineWidth = 1.6; c.strokeStyle = oro(c, x, y, w, h); c.stroke(); c.restore();
  // testo principale
  const pad = 34, tx = x + pad + (S.margine || 0);
  if (logo && S.logo !== false) { const lh = h * 0.27, lw = logo.width * lh / logo.height, lx = S.logoDx ? mx - pad - lw : tx; if (S.badge) { rr(c, lx - 8, y + 18, lw + 16, lh + 12, 12); c.fillStyle = S.badge; c.fill(); } c.drawImage(logo, lx, y + 24, lw, lh); }
  const tY = y + (S.logoDx ? 46 : 24 + h * 0.27 + 30);
  caps(c, S.logoDx ? tx : tx + (logo ? h * 0.27 * 1.08 + 16 : 0), S.logoDx ? tY - 4 : y + 44, e.sopra || '', 12.5, S.sopra, 0.2);
  if (!S.logoDx && logo) { c.font = '30px SFD'; c.fillStyle = S.titolo; c.fillText(e.titolo, tx + h * 0.27 * 1.08 + 16, y + 84); }
  else { c.font = '34px SFD'; c.fillStyle = S.titolo; c.fillText(e.titolo, tx, tY + 38); }
  const rowsY = y + h - 128, colW = (mx - tx - 30) / 2;
  e.righe.forEach((r, i) => { const cx = tx + (i % 2) * colW, cy = rowsY + Math.floor(i / 2) * 50; caps(c, cx, cy, r[0], 10.5, S.etichetta, 0.16); c.font = '17px SFTB'; c.fillStyle = S.valore; fit(c, r[1], cx, cy + 23, colW - 14); });
  c.fillStyle = S.riga; c.fillRect(tx, rowsY - 26, mx - tx - 30, 1.2);
  c.font = '11.5px SFTS'; c.fillStyle = S.etichetta; c.fillText(e.data || 'King Salman Stadium · Riyadh', tx, y + h - 22);
  // matrice: mappa del posto + codice
  mappa(c, mx + 14, y + 26, stub - 40, h * 0.5, e.mappa, S, e.vip);
  caps(c, mx + 22, y + h * 0.5 + 54, e.vip ? 'VIP · Hospitality' : `${e.posti || 1} seat${(e.posti || 1) > 1 ? 's' : ''}`, 10.5, S.etichetta, 0.16);
  barre(c, mx + 22, y + h - 70, stub - 52, 34, S.barre);
  c.font = '10px SFTS'; c.fillStyle = S.nota; c.textAlign = 'right'; c.fillText(e.nota || 'Concept by Omnya Lab', x + w - 22, y + h - 18); c.textAlign = 'left';
  c.restore();
}

const STILI = {
  1: { // Notte e oro
    fondo(c, x, y, w, h, mx, t) { const g = c.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, '#1d2b63'); g.addColorStop(0.6, '#121c46'); g.addColorStop(1, '#0b1230'); c.fillStyle = g; c.fillRect(x, y, w, h);
      c.globalAlpha = 0.16; c.strokeStyle = oro(c, x, y, w, h); c.lineWidth = 1; for (let i = -h; i < w; i += 22) { c.beginPath(); c.moveTo(x + i, y + h); c.lineTo(x + i + h * 0.6, y); c.stroke(); } c.globalAlpha = 1;
      holo(c, mx, y, x + w - mx, h, t, 0.18); },
    badge: 'rgba(255,255,255,0.94)', sopra: '#e9cf8a', titolo: '#ffffff', etichetta: 'rgba(233,207,138,0.75)', valore: '#ffffff', riga: 'rgba(233,207,138,0.35)', nota: 'rgba(255,255,255,0.55)', barre: '#f3e2b0', linee: '#e9cf8a', pieno: 'rgba(233,207,138,0.12)',
  },
  2: { // Perla e nastro
    fondo(c, x, y, w, h, mx, t) { const g = c.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, '#fffdf8'); g.addColorStop(1, '#f1ece2'); c.fillStyle = g; c.fillRect(x, y, w, h); holo(c, x, y, w, h, t, 0.07);
      const bw = 62; c.save(); c.beginPath(); c.rect(x, y, bw, h); c.clip(); for (let i = 0; i < 18; i++) { c.fillStyle = NASTRO[i % NASTRO.length]; c.beginPath(); const yy = y - 60 + i * 26; c.moveTo(x, yy); c.lineTo(x + bw, yy - 40); c.lineTo(x + bw, yy - 14); c.lineTo(x, yy + 26); c.fill(); } c.restore();
      sigillo(c, mx - 74, y + h - 74, 30, t); },
    margine: 56, logoDx: true, sopra: '#b8892f', titolo: '#1d2a5c', etichetta: '#8a8f99', valore: '#1d2a5c', riga: '#e3ddd0', nota: '#9a9da5', barre: '#1d2a5c', linee: '#1d2a5c', pieno: 'rgba(29,42,92,0.06)', holoA: 0.85,
  },
  3: { // Verde reale
    fondo(c, x, y, w, h, mx, t) { const g = c.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, '#0e6a35'); g.addColorStop(1, '#063d1e'); c.fillStyle = g; c.fillRect(x, y, w, h);
      c.globalAlpha = 0.14; c.strokeStyle = oro(c, x, y, w, h); c.lineWidth = 1.1; for (let gy = y + 20; gy < y + h; gy += 40) for (let gx = x + 20; gx < x + w; gx += 40) stella(c, gx + ((gy - y) / 40 % 2) * 20, gy, 11); c.globalAlpha = 1;
      c.save(); c.translate(mx - 70, y + 68); c.scale(1, 0.72); c.beginPath(); c.arc(0, 0, 40, 0, 7); c.restore(); c.save(); c.clip(); holo(c, mx - 115, y + 30, 90, 80, t, 1); c.restore(); },
    badge: 'rgba(255,255,255,0.94)', sopra: '#f0d58f', titolo: '#f6e3a8', etichetta: 'rgba(240,213,143,0.75)', valore: '#ffffff', riga: 'rgba(240,213,143,0.35)', nota: 'rgba(255,255,255,0.55)', barre: '#f3e2b0', linee: '#f0d58f', pieno: 'rgba(240,213,143,0.10)',
  },
  4: { // VIP: nero ossidiana e oro (il biglietto cambia quando passi al box)
    fondo(c, x, y, w, h, mx, t) { const g = c.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, '#1a1712'); g.addColorStop(0.55, '#0b0a08'); g.addColorStop(1, '#16120b'); c.fillStyle = g; c.fillRect(x, y, w, h);
      c.globalAlpha = 0.12; c.strokeStyle = oro(c, x, y, w, h); c.lineWidth = 1.1; for (let gy = y + 22; gy < y + h; gy += 44) for (let gx = x + 22; gx < x + w; gx += 44) stella(c, gx + ((gy - y) / 44 % 2) * 22, gy, 12); c.globalAlpha = 1;
      const b = c.createLinearGradient(x, 0, x + w, 0); b.addColorStop(0, 'rgba(201,160,82,0)'); b.addColorStop(0.5, 'rgba(243,214,143,0.22)'); b.addColorStop(1, 'rgba(201,160,82,0)'); c.fillStyle = b; c.fillRect(x, y + h * 0.42, w, 3);
      holo(c, mx, y, x + w - mx, h, t, 0.12); },
    badge: 'rgba(255,255,255,0.94)', sopra: '#f3d68f', titolo: '#f6e3a8', etichetta: 'rgba(243,214,143,0.72)', valore: '#ffffff', riga: 'rgba(243,214,143,0.35)', nota: 'rgba(255,255,255,0.5)', barre: '#f3d68f', linee: '#f3d68f', pieno: 'rgba(243,214,143,0.12)',
  }
};

// lamina olografica: arcobaleno pastello che scorre col tempo
function holo(c, x, y, w, h, t, k) {
  const off = (t * 0.25) % 1, g = c.createLinearGradient(x - w * off, y, x + w * (1.6 - off) + h * 0.5, y + h), cols = ['#ffb3d9', '#b3f0ff', '#fff2a8', '#c8b3ff', '#b3ffd1', '#ffc8a8', '#ffb3d9'];
  cols.forEach((col, i) => g.addColorStop(i / (cols.length - 1), col)); c.save(); c.globalAlpha = k; c.fillStyle = g; c.fillRect(x, y, w, h);
  c.globalAlpha = k * 0.35; c.strokeStyle = '#ffffff'; c.lineWidth = 1; for (let i = 0; i < w + h; i += 6) { c.beginPath(); c.moveTo(x + i, y); c.lineTo(x + i - h * 0.4, y + h); c.stroke(); } c.restore();
}
function oro(c, x, y, w, h) { const g = c.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, '#f8e7a8'); g.addColorStop(0.3, '#c9973a'); g.addColorStop(0.55, '#fff1c2'); g.addColorStop(0.8, '#b8862e'); g.addColorStop(1, '#f2dc98'); return g; }
function sigillo(c, cx, cy, r, t) { c.save(); c.beginPath(); for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2, rr2 = i % 2 ? r : r * 0.9; c.lineTo(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2); } c.closePath(); c.fillStyle = oro(c, cx - r, cy - r, 2 * r, 2 * r); c.fill();
  c.font = '700 15px SFTB'; c.fillStyle = '#6e4f12'; c.textAlign = 'center'; c.fillText('2034', cx, cy + 5); c.textAlign = 'left'; c.restore(); }
function stella(c, x, y, r) { c.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, rr2 = i % 2 ? r * 0.55 : r; c.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); } c.closePath(); c.stroke(); }
function barre(c, x, y, w, h, col) { c.fillStyle = col; let xx = x, s = 7; while (xx < x + w) { s = (s * 9301 + 49297) % 233280; const bw = 1 + (s % 4); c.fillRect(xx, y, bw, h); xx += bw + 1 + (s % 3); } }
function mappa(c, x, y, w, h, m, S, vip) {   // pianta dello stadio con gli anelli, il tuo settore in arancio
  if (!m) return; const P = m.pianta, aMax = P.a + m.anelli[m.anelli.length - 1][1], bMax = P.b + m.anelli[m.anelli.length - 1][1], k = Math.min(w / (2 * aMax), h / (2 * bMax)), cx = x + w / 2, cy = y + h / 2;
  const nOf = d => P.n0 + (P.n1 - P.n0) * Math.min(1, Math.max(0, d / 80)), pt = (d, th) => { const [px, pz] = sePoint(P.a + d, P.b + d, nOf(d), th); return [cx + px * k, cy + pz * k]; };
  const anello = (d0, d1, t0 = 0, t1 = Math.PI * 2) => { c.beginPath(); for (let i = 0; i <= 48; i++) { const [px, py] = pt(d0, t0 + (t1 - t0) * i / 48); i ? c.lineTo(px, py) : c.moveTo(px, py); } for (let i = 48; i >= 0; i--) { const [px, py] = pt(d1, t0 + (t1 - t0) * i / 48); c.lineTo(px, py); } c.closePath(); };
  c.save(); c.lineWidth = 1.1; c.strokeStyle = S.linee;
  for (const [d0, d1] of m.anelli) { anello(d0, d1); c.fillStyle = S.pieno; c.fill(); c.stroke(); }
  c.fillStyle = 'rgba(80,170,90,0.55)'; c.fillRect(cx - 52.5 * k, cy - 34 * k, 105 * k, 68 * k); c.strokeRect(cx - 52.5 * k, cy - 34 * k, 105 * k, 68 * k);
  let t1 = m.t1; if (t1 < m.t0) t1 += Math.PI * 2; const tm = (m.t0 + t1) / 2, sp = Math.max(t1 - m.t0, 0.16), ta = tm - sp / 2, tb = tm + sp / 2;
  anello(m.anelli[0][0], m.anelli[m.anelli.length - 1][1], ta - 0.03, tb + 0.03); c.fillStyle = 'rgba(255,122,18,0.28)'; c.fill();   // spicchio della tribuna
  const [d0, d1] = m.anelli[m.anello]; anello(d0 - 1, d1 + 1, ta, tb); c.fillStyle = OR; c.fill(); c.lineWidth = 1.4; c.strokeStyle = '#ffffff'; c.stroke();
  { const [px, py] = pt((d0 + d1) / 2, tm); c.beginPath(); c.arc(px, py, 3.2, 0, 7); c.fillStyle = '#ffffff'; c.fill(); }
  if (vip) { const [px, py] = pt(d1 + 2, (m.t0 + t1) / 2); c.fillStyle = '#ffd36a'; stellaPiena(c, px, py, 6); }
  c.restore();
}
function stellaPiena(c, x, y, r) { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i / 10 * Math.PI * 2, rr2 = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); } c.closePath(); c.fill(); }
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function caps(c, x, y, t, px, col, tr = 0.12) { c.font = `${px}px SFTS`; c.letterSpacing = `${(tr * px).toFixed(2)}px`; c.fillStyle = col; c.fillText(String(t).toUpperCase(), x, y); c.letterSpacing = '0px'; }
function fit(c, t, x, y, w) { let s = String(t); while (c.measureText(s).width > w && s.length > 4) s = s.slice(0, -2) + '…'; c.fillText(s, x, y); }
