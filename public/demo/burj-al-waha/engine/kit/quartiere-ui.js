// Motore choose-your · UI del «choose your villa» (21/11): card di vetro chiaro come la U5 della torre (scelta di Nico),
// pin arancio Omnya da trascinare (T1, niente omino di Google), cartellini sopra i cancelli col prezzo che cambia (W1 + X2),
// disponibilità verde / grigio (X1). Prezzi e disponibilità sono ESEMPIO finché non c'è un listino con la fonte.
const OR = '#ff7a12', VERDE = '#34c77b', GRIGIO = '#a3a8ae';
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const ease = t => { t = clamp(t); return 1 - Math.pow(1 - t, 3); };
export function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
export function testo(c, t, x, y, font, col, ls = 0, al = 'left') { c.font = font; c.fillStyle = col; c.textAlign = al; c.letterSpacing = ls + 'px'; c.fillText(t, x, y); c.letterSpacing = '0px'; c.textAlign = 'left'; }
export function largo(c, t, font, ls = 0) { c.font = font; c.letterSpacing = ls + 'px'; const w = c.measureText(t).width; c.letterSpacing = '0px'; return w; }
// globalThis.SOLDI_TESTO (facoltativo): scritta al posto dei prezzi quando sono d'esempio (villa 27, 24/11); senza, tutto come prima
export const soldi = v => globalThis.SOLDI_TESTO ? globalThis.SOLDI_TESTO : v >= 1e6 ? `AED ${(Math.round(v / 1e5) / 10).toLocaleString('en-US')}M` : `AED ${v.toLocaleString('en-US')}`;

// vetro liquido: sfondo vero sfocato, velo chiaro, riflesso in alto, filo bianco
export function vetro(c, ui, x, y, w, h, r, { tinta = 'rgba(255,255,255,0.13)', scuro = 0.16, ombra = true } = {}) {
  if (ombra) { c.save(); c.shadowColor = 'rgba(0,0,0,0.35)'; c.shadowBlur = 40; c.shadowOffsetY = 14; rr(c, x, y, w, h, r); c.fillStyle = 'rgba(0,0,0,0.02)'; c.fill(); c.restore(); }
  c.save(); rr(c, x, y, w, h, r); c.clip();
  if (ui.sfondo) { c.filter = 'blur(26px) saturate(1.5)'; c.drawImage(ui.sfondo, 0, 0, ui.W, ui.H); c.filter = 'none'; }
  c.fillStyle = `rgba(12,14,18,${scuro})`; c.fillRect(x, y, w, h); c.fillStyle = tinta; c.fillRect(x, y, w, h);
  const g = c.createLinearGradient(0, y, 0, y + h * 0.5); g.addColorStop(0, 'rgba(255,255,255,0.20)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(x, y, w, h);
  c.restore(); rr(c, x + 0.5, y + 0.5, w - 1, h - 1, r); c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 1; c.stroke();
}
function bottone(c, ui, x, y, w, h, t, id, hov) {
  c.save(); c.shadowColor = 'rgba(0,0,0,0.3)'; c.shadowBlur = 16; c.shadowOffsetY = 6; rr(c, x, y, w, h, h / 2); c.fillStyle = hov ? '#ffffff' : 'rgba(255,255,255,0.95)'; c.fill(); c.restore();
  testo(c, t, x + w / 2, y + h / 2 + 5.5, '15.5px SFTS', '#0c0d10', 0, 'center'); ui.btns.push({ id, r: [x, y, x + w, y + h], c: [x + w / 2, y + h / 2] });
}
const pillola = (c, x, y, t, col = 'rgba(255,255,255,0.16)') => { const w = largo(c, t, '12.5px SFTS') + 22; rr(c, x, y, w, 26, 13); c.fillStyle = col; c.fill(); testo(c, t, x + 11, y + 17.5, '12.5px SFTS', '#fff'); return w; };

// card del quartiere (satellite, Z1): nome, ville, prezzo di partenza
export function cardZona(c, ui, z, a) {
  const w = 380, h = 330, x = ui.W - 96 - w, y = ui.H / 2 - h / 2 + 20; c.save(); c.globalAlpha = a; vetro(c, ui, x, y, w, h, 34);
  const X = x + 32; testo(c, 'DUBAI HILLS ESTATE', X, y + 48, '11.5px SFTB', 'rgba(255,255,255,0.72)', 3.4);
  testo(c, z.nome, X, y + 98, '40px SFDL', '#fff', -0.3);
  c.fillStyle = z.liberi ? VERDE : GRIGIO; c.beginPath(); c.arc(X + 5, y + 128, 4.5, 0, 7); c.fill(); testo(c, z.liberi ? `${z.liberi} villas available` : 'Sold out', X + 18, y + 133, '14px SFTS', z.liberi ? '#bff1d6' : '#e3e5e8');
  let px = X; for (const t of z.tag || []) px += pillola(c, px, y + 152, t) + 8;
  c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(X, y + 200, w - 64, 1);
  const col = [['VILLAS', String(z.ville)], ['BEDROOMS', z.camere || '4–6'], ['FROM', z.da ? soldi(z.da) : '—']], cw = (w - 64) / 3;
  col.forEach(([k, v], i) => { testo(c, k, X + i * cw, y + 228, '10px SFTS', 'rgba(255,255,255,0.55)', 2.2); testo(c, v, X + i * cw, y + 252, '17px SFDM', '#fff'); });
  testo(c, 'Click to fly in', X, y + h - 30, '14px SFTS', 'rgba(255,255,255,0.75)'); c.restore();
}
// card del quartiere scelto (X1): quante ne restano sul golf + legenda
export function cardQuartiere(c, ui, q, a) {
  const w = 360, h = 214, x = ui.W - 96 - w, y = 210; c.save(); c.globalAlpha = a; vetro(c, ui, x, y, w, h, 30);
  const X = x + 30; testo(c, q.sopra.toUpperCase(), X, y + 44, '11.5px SFTB', 'rgba(255,255,255,0.72)', 3.2); testo(c, q.titolo, X, y + 88, '34px SFDL', '#fff', -0.2);
  c.fillStyle = OR; c.beginPath(); c.arc(X + 5, y + 116, 4.5, 0, 7); c.fill(); testo(c, q.urgenza, X + 18, y + 121, '14.5px SFTS', '#ffd2ad');
  const leg = [[VERDE, 'Available'], [GRIGIO, 'Sold']]; let lx = X; for (const [col, t] of leg) { c.fillStyle = col; rr(c, lx, y + 146, 14, 14, 4); c.fill(); testo(c, t, lx + 22, y + 158, '13.5px SFTS', '#fff'); lx += largo(c, t, '13.5px SFTS') + 50; }
  testo(c, q.da, X, y + 192, '15px SFTS', 'rgba(255,255,255,0.8)'); c.restore();
}
// il pin arancio Omnya (goccia con il punto bianco) e il suo posto in basso a destra
export function pin(c, x, y, s = 1, alzato = 0) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = `rgba(0,0,0,${0.28 - alzato * 0.12})`; c.beginPath(); c.ellipse(0, 2, 11 + alzato * 6, 4 + alzato * 2, 0, 0, 7); c.fill();
  c.translate(0, -alzato * 26); c.shadowColor = 'rgba(0,0,0,0.35)'; c.shadowBlur = 10; c.shadowOffsetY = 4;
  c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(-6, -14, -18, -22, -18, -36); c.arc(0, -36, 18, Math.PI, 0); c.bezierCurveTo(18, -22, 6, -14, 0, 0); c.closePath(); c.fillStyle = OR; c.fill();
  c.shadowColor = 'transparent'; c.fillStyle = '#fff'; c.beginPath(); c.arc(0, -36, 7, 0, 7); c.fill(); c.restore();
}
export function dockPin(c, ui, x, y, a, vuoto) {
  c.save(); c.globalAlpha = a; vetro(c, ui, x - 150, y - 46, 300, 92, 46); if (!vuoto) pin(c, x - 102, y + 22, 1.05); else { c.strokeStyle = 'rgba(255,255,255,0.6)'; c.setLineDash([4, 4]); c.beginPath(); c.arc(x - 102, y - 10, 18, 0, 7); c.stroke(); c.setLineDash([]); }
  testo(c, 'Drop the pin', x - 64, y - 6, '17px SFDM', '#fff'); testo(c, 'on your street', x - 64, y + 16, '14px SFTS', 'rgba(255,255,255,0.75)'); c.restore();
}
// cartellino sopra il cancello: numero, camere, prezzo; il punto verde o grigio dice se è libera
export function cartellino(c, p, d, a, sel, ui) {
  const f1 = '600 15px SFTS', t1 = `No. ${d.n}`, t2 = d.libera ? soldi(d.prezzo) : 'Sold', t3 = `${d.camere} bed${d.golf ? ' · Golf' : ''}`;
  const w = Math.max(largo(c, t1, '15px SFDM') + largo(c, t2, '15px SFTS') + 54, largo(c, t3, '12px SFTS') + 40), h = 52, x = p[0] - w / 2, y = p[1] - h - 14;
  c.save(); c.globalAlpha = a; c.shadowColor = 'rgba(0,0,0,0.3)'; c.shadowBlur = 14; c.shadowOffsetY = 5; rr(c, x, y, w, h, 14); c.fillStyle = sel ? 'rgba(255,255,255,0.97)' : 'rgba(18,20,24,0.62)'; c.fill(); c.restore();
  c.save(); c.globalAlpha = a; c.beginPath(); c.moveTo(p[0] - 7, y + h); c.lineTo(p[0], y + h + 8); c.lineTo(p[0] + 7, y + h); c.closePath(); c.fillStyle = sel ? 'rgba(255,255,255,0.97)' : 'rgba(18,20,24,0.62)'; c.fill();
  const ink = sel ? '#0c0d10' : '#fff', mute = sel ? 'rgba(12,13,16,0.6)' : 'rgba(255,255,255,0.7)';
  c.fillStyle = d.libera ? VERDE : GRIGIO; c.beginPath(); c.arc(x + 16, y + 20, 4.5, 0, 7); c.fill();
  testo(c, t1, x + 28, y + 25, '15px SFDM', ink); testo(c, t2, x + w - 14, y + 25, '15px SFTS', d.libera ? (sel ? '#0c0d10' : '#fff') : mute, 0, 'right'); testo(c, t3, x + 28, y + 43, '12px SFTS', mute);
  c.restore(); return [x, y, x + w, y + h];
}
// card della villa (V2): tipo, camere, metri, vista, prezzo, Enter
export function cardVilla(c, ui, d, a, hov) {
  const w = 384, h = 520, x = ui.W - 96 - w, y = ui.H / 2 - h / 2 + 10, X = x + 34; c.save(); c.globalAlpha = a; vetro(c, ui, x, y, w, h, 38);
  testo(c, d.comunita.toUpperCase(), X, y + 50, '11.5px SFTB', '#fff', 3.6); testo(c, 'Dubai Hills', X + largo(c, d.comunita.toUpperCase(), '11.5px SFTB', 3.6) + 10, y + 50, '12px SFTS', 'rgba(255,255,255,0.62)');
  testo(c, 'Choose your villa', X, y + 88, '26px SFDL', '#fff', 0.2);
  testo(c, String(d.n), X - 6, y + 250, '170px SFDT', '#fff', -6);
  testo(c, d.nome, X, y + 296, '24px SFDM', '#fff', 0.2);
  c.fillStyle = OR; c.beginPath(); c.arc(X + 4, y + 322, 4, 0, 7); c.fill(); testo(c, d.urgenza, X + 16, y + 327, '13.5px SFTS', '#ffd99a', 0.2);
  const col = [['BEDROOMS', String(d.camere)], ['BUILT-UP', d.area], ['VIEW', d.vista]], cw = (w - 68) / 3; c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(X, y + 350, w - 68, 1);
  col.forEach(([k, v], i) => { testo(c, k, X + i * cw, y + 378, '10px SFTS', 'rgba(255,255,255,0.55)', 2.2); testo(c, v, X + i * cw, y + 401, '16px SFDM', '#fff'); });
  testo(c, soldi(d.prezzo), X, y + 440, '22px SFDL', '#fff', 0.2);
  bottone(c, ui, X, y + h - 76, w - 68, 50, 'Enter the villa   →', d.btn || 'scegliUltimo', hov); c.restore();
}
// domanda finale (P2): «Is this your home?»
export function domanda(c, ui, a, hovSi, hovNo) {
  const w = 460, h = 190, x = ui.W / 2 - w / 2, y = ui.H - h - 90; c.save(); c.globalAlpha = a; vetro(c, ui, x, y, w, h, 36);
  testo(c, 'Is this your home?', ui.W / 2, y + 74, '38px SFDL', '#fff', -0.2, 'center');
  const bw = 180, by = y + h - 80; bottone(c, ui, x + w / 2 - bw - 8, by, bw, 52, 'Yes', 'si', hovSi);
  c.save(); rr(c, x + w / 2 + 8, by, bw, 52, 26); c.fillStyle = hovNo ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.12)'; c.fill(); c.strokeStyle = 'rgba(255,255,255,0.6)'; c.stroke(); c.restore();
  testo(c, 'No', x + w / 2 + 8 + bw / 2, by + 31.5, '15.5px SFTS', '#fff', 0, 'center'); ui.btns.push({ id: 'liv:0', r: [x + w / 2 + 8, by, x + w / 2 + 8 + bw, by + 52], c: [x + w / 2 + 8 + bw / 2, by + 26] });
  c.restore();
}
export { OR, VERDE, GRIGIO, ease };
