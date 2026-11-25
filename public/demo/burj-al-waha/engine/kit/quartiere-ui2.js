// Motore choose-your · UI U6 del «choose your villa» (Nico 21/11 sera: «falle ancora più fighe e visibili bene»).
// Stesse card della U5 (vetro liquido, pin arancio Omnya, cartellini col prezzo, card della villa, domanda finale) ma:
//   più grandi (circa 1,4 volte), vetro più scuro così il bianco si legge anche su cielo e sabbia, testi Display Semibold/Medium
//   al posto dei Thin/Light, bottoni pieni arancio Omnya, punti di disponibilità con l'alone, ombre più morbide e profonde.
// Prezzi e disponibilità restano ESEMPIO finché non c'è un listino con la fonte.
import { OR, OR2, INK, ORT, ORC, ORH, BTN, ora } from './tinta.js';
import { rr, testo, largo, soldi } from './quartiere-ui.js';
const VERDE = '#3ddc84', GRIGIO = '#a3a8ae';

const OMBRE = new Map();
function ombraDi(w, h, r) {   // la stessa ombra lunga di prima (nero 0,5, sfocata 60, giù di 22) disegnata una volta in una tela a parte
  const k = `${Math.round(w)}x${Math.round(h)}r${r}`; if (OMBRE.has(k)) return OMBRE.get(k);
  const o = document.createElement('canvas'); o.width = Math.round(w) + 200; o.height = Math.round(h) + 200; const oc = o.getContext('2d');
  oc.shadowColor = 'rgba(0,0,0,0.5)'; oc.shadowBlur = 60; oc.shadowOffsetY = 22; rr(oc, 100, 100, w, h, r); oc.fillStyle = 'rgba(0,0,0,0.05)'; oc.fill();
  OMBRE.set(k, o); return o;
}
// vetro scuro: sfondo vero sfocato e saturo, velo scuro, riflesso in alto, filo bianco, ombra lunga
export function vetro(c, ui, x, y, w, h, r, { scuro = 0.4, ombra = true } = {}) {
  if (ombra) c.drawImage(ombraDi(w, h, r), x - 100, y - 100);   // ombra preparata una volta sola: sugli schermi Retina rifarla a ogni fotogramma costava troppo
  c.save(); rr(c, x, y, w, h, r); c.clip();
  if (ui.sfondoSfocato) c.drawImage(ui.sfondoSfocato, 0, 0, ui.W, ui.H);      // sfondo già sfocato una volta sola (pagina interattiva)
  else if (ui.sfondo) { c.filter = 'blur(34px) saturate(1.6)'; c.drawImage(ui.sfondo, 0, 0, ui.W, ui.H); c.filter = 'none'; }
  c.fillStyle = `rgba(10,12,16,${scuro})`; c.fillRect(x, y, w, h);
  const g = c.createLinearGradient(0, y, 0, y + h * 0.45); g.addColorStop(0, 'rgba(255,255,255,0.18)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(x, y, w, h);
  c.restore(); rr(c, x + 0.75, y + 0.75, w - 1.5, h - 1.5, r); c.strokeStyle = 'rgba(255,255,255,0.42)'; c.lineWidth = 1.5; c.stroke();
}
function punto(c, x, y, col, r = 6.5) {   // punto con l'alone (disponibilità, urgenza)
  c.save(); c.fillStyle = col; c.globalAlpha *= 0.28; c.beginPath(); c.arc(x, y, r * 2.1, 0, 7); c.fill(); c.restore();
  c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
}
function bottone(c, ui, x, y, w, h, t, id, { pieno = true } = {}) {
  c.save(); c.shadowColor = pieno ? ora(0.55) : 'rgba(0,0,0,0.3)'; c.shadowBlur = 28; c.shadowOffsetY = 8; rr(c, x, y, w, h, h / 2);
  c.fillStyle = pieno ? BTN : 'rgba(255,255,255,0.14)'; c.fill(); c.restore();
  if (!pieno) { rr(c, x + 0.75, y + 0.75, w - 1.5, h - 1.5, h / 2); c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1.5; c.stroke(); }
  c.save(); c.shadowColor = 'rgba(0,0,0,0.28)'; c.shadowBlur = 6; c.shadowOffsetY = 1; testo(c, t, x + w / 2, y + h / 2 + 10, '28px SFD', pieno ? INK : '#fff', 0, 'center'); c.restore(); ui.btns.push({ id, r: [x, y, x + w, y + h], c: [x + w / 2, y + h / 2] });
}
const pillola = (c, x, y, t) => { const w = largo(c, t, '16px SFTS') + 30; rr(c, x, y, w, 36, 18); c.fillStyle = 'rgba(255,255,255,0.16)'; c.fill(); c.strokeStyle = 'rgba(255,255,255,0.3)'; c.lineWidth = 1; c.stroke(); testo(c, t, x + 15, y + 24, '16px SFTS', '#fff'); return w; };
const colonne = (c, X, y, w, col, vf = '26px SFDM') => { const cw = w / col.length; col.forEach(([k, v], i) => { testo(c, k, X + i * cw, y, '13px SFTS', 'rgba(255,255,255,0.6)', 2.6); testo(c, v, X + i * cw, y + 34, vf, '#fff'); }); };

// titolo del passo: velo scuro in alto, sopratitolo arancio chiaro, titolo grande Semibold
export function titolo(c, ui, [sopra, tit], a = 1) {
  c.save(); c.globalAlpha = a; const g = c.createLinearGradient(0, 0, 0, 360); g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(0.6, 'rgba(0,0,0,0.18)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, ui.W, 360);
  c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 30; testo(c, sopra.toUpperCase(), ui.W / 2, 96, '18px SFTB', OR2, 5.5, 'center');
  testo(c, tit, ui.W / 2, 196, '88px SFD', '#fff', -1, 'center'); c.restore();
}
// Z1 · card del quartiere dal satellite
export function cardZona(c, ui, z, a = 1) {
  const w = 540, h = 470, x = ui.W - 90 - w, y = ui.H / 2 - h / 2 + 50, X = x + 42; c.save(); c.globalAlpha = a; vetro(c, ui, x, y, w, h, 44);
  testo(c, 'DUBAI HILLS ESTATE', X, y + 62, '15px SFTB', 'rgba(255,255,255,0.75)', 4.4);
  testo(c, z.nome, X, y + 130, '62px SFD', '#fff', -0.8);
  punto(c, X + 7, y + 168, z.liberi ? VERDE : GRIGIO); testo(c, z.liberi ? `${z.liberi} villas available` : 'Sold out', X + 26, y + 175, '21px SFTS', z.liberi ? '#c4f5d9' : '#e3e5e8');
  let px = X; for (const t of z.tag || []) px += pillola(c, px, y + 200, t) + 10;
  c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(X, y + 262, w - 84, 1);
  colonne(c, X, y + 298, w - 84, [['VILLAS', String(z.ville)], ['BEDROOMS', z.camere || '4–6'], ['FROM', z.da ? soldi(z.da) : '—']]);
  bottone(c, ui, X, y + h - 104, w - 84, 66, 'Fly in   →', 'zona'); c.restore();
}
// X1 · card del quartiere scelto: quante ne restano sul golf, legenda, prezzo di partenza
export function cardQuartiere(c, ui, q, a = 1) {
  const w = 500, h = 290, x = ui.W - 90 - w, y = 270, X = x + 40; c.save(); c.globalAlpha = a; vetro(c, ui, x, y, w, h, 40);
  testo(c, q.sopra.toUpperCase(), X, y + 56, '14.5px SFTB', 'rgba(255,255,255,0.75)', 4);
  testo(c, q.titolo, X, y + 116, '52px SFD', '#fff', -0.6);
  punto(c, X + 7, y + 152, OR); testo(c, q.urgenza, X + 26, y + 159, '21px SFTS', OR2);
  let lx = X; for (const [col, t] of [[VERDE, 'Available'], [GRIGIO, 'Sold']]) { punto(c, lx + 7, y + 203, col, 6); testo(c, t, lx + 24, y + 210, '18px SFTS', '#fff'); lx += largo(c, t, '18px SFTS') + 64; }
  testo(c, q.da, X, y + 256, '21px SFTS', 'rgba(255,255,255,0.85)'); c.restore();
}
// T1 · il pin arancio Omnya (più grande, con i cerchi dove cade) e il suo posto in basso
export function pin(c, x, y, s = 1.6, alzato = 0, cerchi = true) {
  if (cerchi) for (const [r, al] of [[46, 0.18], [30, 0.3]]) { c.save(); c.strokeStyle = `rgba(${ORC},${al + 0.2})`; c.lineWidth = 3; c.beginPath(); c.ellipse(x, y, r * s * 0.7, r * s * 0.28, 0, 0, 7); c.stroke(); c.fillStyle = `rgba(${ORC},${al * 0.5})`; c.fill(); c.restore(); }
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = `rgba(0,0,0,${0.32 - alzato * 0.12})`; c.beginPath(); c.ellipse(0, 2, 11 + alzato * 6, 4 + alzato * 2, 0, 0, 7); c.fill();
  c.translate(0, -alzato * 26); c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 14; c.shadowOffsetY = 5;
  c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(-6, -14, -18, -22, -18, -36); c.arc(0, -36, 18, Math.PI, 0); c.bezierCurveTo(18, -22, 6, -14, 0, 0); c.closePath(); c.fillStyle = OR; c.fill();
  c.shadowColor = 'transparent'; c.fillStyle = INK; c.beginPath(); c.arc(0, -36, 7, 0, 7); c.fill(); c.restore();
}
export function dockPin(c, ui, cx, cy, a = 1, vuoto = false) {
  const w = 430, h = 110, x = cx - w / 2, y = cy - h / 2; c.save(); c.globalAlpha = a; vetro(c, ui, x, y, w, h, 55);
  if (!vuoto) pin(c, x + 70, y + 86, 1.25, 0, false); else { c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 2; c.setLineDash([6, 6]); c.beginPath(); c.arc(x + 70, y + h / 2, 26, 0, 7); c.stroke(); c.setLineDash([]); }
  testo(c, 'Drop the pin', x + 122, y + 50, '26px SFDM', '#fff'); testo(c, 'on your street', x + 122, y + 80, '19px SFTS', 'rgba(255,255,255,0.78)'); c.restore();
}
// W1 + X2 · cartellino sopra la villa: numero, camere, prezzo; verde libera, grigio venduta; bianco con l'arancio se scelta
export function cartellino(c, p, d, a = 1, sel = false) {
  const t1 = `No. ${d.n}`, t2 = d.libera ? soldi(d.prezzo) : 'Sold', t3 = d.solo ? '' : `${d.camere} bed${d.golf ? ' · Golf' : ''}`;   // solo: numero e prezzo, il resto sta nelle card (Nico 22/11)
  const w = Math.max(largo(c, t1, '24px SFD') + largo(c, t2, '22px SFTS') + 78, t3 ? largo(c, t3, '16px SFTS') + 64 : 0), h = t3 ? 74 : 54, x = p[0] - w / 2, y = p[1] - h - 18;
  c.save(); c.globalAlpha = a; c.shadowColor = sel ? ora(0.5) : 'rgba(0,0,0,0.45)'; c.shadowBlur = 26; c.shadowOffsetY = 8; rr(c, x, y, w, h, 22);
  c.fillStyle = sel ? '#ffffff' : 'rgba(14,16,20,0.78)'; c.fill(); c.restore();
  c.save(); c.globalAlpha = a; c.beginPath(); c.moveTo(p[0] - 11, y + h); c.lineTo(p[0], y + h + 12); c.lineTo(p[0] + 11, y + h); c.closePath(); c.fillStyle = sel ? '#ffffff' : 'rgba(14,16,20,0.78)'; c.fill();
  if (sel) { rr(c, x + 1, y + 1, w - 2, h - 2, 21); c.strokeStyle = OR; c.lineWidth = 3; c.stroke(); } else { rr(c, x + 0.75, y + 0.75, w - 1.5, h - 1.5, 21.5); c.strokeStyle = 'rgba(255,255,255,0.3)'; c.lineWidth = 1.5; c.stroke(); }
  const ink = sel ? '#0c0d10' : '#fff', mute = sel ? 'rgba(12,13,16,0.6)' : 'rgba(255,255,255,0.72)';
  const yt = t3 ? 36 : 35; punto(c, x + 24, t3 ? y + 28 : y + h / 2, d.libera ? VERDE : GRIGIO, 6);
  testo(c, t1, x + 42, y + yt, '24px SFD', ink); testo(c, t2, x + w - 20, y + yt, '22px SFTS', d.libera ? (sel ? ORT : '#fff') : mute, 0, 'right'); if (t3) testo(c, t3, x + 42, y + 60, '16px SFTS', mute);
  c.restore(); return [x, y, x + w, y + h];
}
// V2 · card della villa: comunità, «Choose your villa», numero enorme, dati, prezzo, bottone arancio
export function cardVilla(c, ui, d, a = 1) {
  const w = 540, h = 720, x = ui.W - 90 - w, y = ui.H / 2 - h / 2, X = x + 44; c.save(); c.globalAlpha = a; vetro(c, ui, x, y, w, h, 48);
  testo(c, d.comunita.toUpperCase(), X, y + 64, '15px SFTB', '#fff', 4.6); testo(c, 'Dubai Hills', X + largo(c, d.comunita.toUpperCase(), '15px SFTB', 4.6) + 14, y + 64, '16px SFTS', 'rgba(255,255,255,0.65)');
  testo(c, 'Choose your villa', X, y + 114, '36px SFDM', '#fff', 0);
  testo(c, String(d.n), X - 8, y + 330, '240px SFDL', '#fff', -9);
  testo(c, d.nome, X, y + 392, '32px SFD', '#fff', -0.2);
  punto(c, X + 7, y + 426, OR); testo(c, d.urgenza, X + 26, y + 433, '20px SFTS', OR2);
  c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(X, y + 462, w - 88, 1);
  colonne(c, X, y + 498, w - 88, [['BEDROOMS', String(d.camere)], ['BUILT-UP', d.area], ['VIEW', d.vista]], '24px SFDM');
  testo(c, soldi(d.prezzo), X, y + 590, '44px SFD', '#fff', -0.4);
  bottone(c, ui, X, y + h - 104, w - 88, 68, 'Enter the villa   →', d.btn || 'entra'); c.restore();
}
// P2 · domanda finale
export function domanda(c, ui, a = 1, { centro = false } = {}) {   // centro: card grande al centro dello schermo (Nico 22/11)
  if (centro) {
    const w = 780, h = 310, x = ui.W / 2 - w / 2, y = ui.H / 2 - h / 2 + (1 - a) * 24; c.save(); c.globalAlpha = a; vetro(c, ui, x, y, w, h, 52, { scuro: 0.5 });
    testo(c, 'Is this your home?', ui.W / 2, y + 122, '68px SFD', '#fff', -1, 'center');
    const bw = 310, by = y + h - 120; bottone(c, ui, x + w / 2 - bw - 12, by, bw, 80, 'Yes', 'si'); bottone(c, ui, x + w / 2 + 12, by, bw, 80, 'No', 'liv:0', { pieno: false }); c.restore(); return;
  }
  const w = 660, h = 270, x = ui.W / 2 - w / 2, y = ui.H - h - 80; c.save(); c.globalAlpha = a; vetro(c, ui, x, y, w, h, 48);
  testo(c, 'Is this your home?', ui.W / 2, y + 104, '60px SFD', '#fff', -0.8, 'center');
  const bw = 270, by = y + h - 106; bottone(c, ui, x + w / 2 - bw - 12, by, bw, 72, 'Yes', 'si'); bottone(c, ui, x + w / 2 + 12, by, bw, 72, 'No', 'liv:0', { pieno: false }); c.restore();
}
// K1 · cartellino del Burj dalla piscina (7,95 km dalla 27, dato vero)
export function burj(c, ui, x, y, a = 1) {
  const yT = y - 150; c.save(); c.globalAlpha = a; c.shadowColor = 'rgba(0,0,0,0.4)'; c.shadowBlur = 10; c.strokeStyle = 'rgba(255,255,255,0.95)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y - 10); c.lineTo(x, yT); c.stroke(); c.restore();
  c.save(); c.globalAlpha = a; punto(c, x, y - 4, OR, 6.5);
  const t1 = 'Burj Khalifa', t2 = '7.95 km from your pool', w = Math.max(largo(c, t1, '30px SFD'), largo(c, t2, '20px SFTS')) + 72, h = 104, X = x - w / 2, Y = yT - h;
  // sul cielo chiaro il vetro diventa grigio: qui carta bianca piena con il filo arancio, come il cartellino scelto
  c.save(); c.shadowColor = 'rgba(0,0,0,0.35)'; c.shadowBlur = 34; c.shadowOffsetY = 12; rr(c, X, Y, w, h, 30); c.fillStyle = '#ffffff'; c.fill(); c.restore();
  rr(c, X + 1.5, Y + 1.5, w - 3, h - 3, 28.5); c.strokeStyle = OR; c.lineWidth = 3; c.stroke();
  c.beginPath(); c.moveTo(x - 12, Y + h); c.lineTo(x, Y + h + 13); c.lineTo(x + 12, Y + h); c.closePath(); c.fillStyle = '#ffffff'; c.fill();
  testo(c, t1, x, Y + 46, '30px SFD', '#0c0d10', -0.2, 'center'); testo(c, t2, x, Y + 78, '20px SFTS', ORT, 0, 'center'); c.restore();
}
// K2 · la villa scelta resta in alto a sinistra mentre si gira dentro casa
export function chip(c, ui, d, a = 1) {
  const t1 = `Villa ${d.n} · ${d.comunita}`, t2 = `${d.camere} bed · ${d.area} · ${soldi(d.prezzo)}`, w = Math.max(largo(c, t1, '24px SFD'), largo(c, t2, '18px SFTS')) + 92, h = 92, X = 64, Y = 56;
  c.save(); c.globalAlpha = a; vetro(c, ui, X, Y, w, h, 46); punto(c, X + 40, Y + h / 2, OR, 8);
  testo(c, t1, X + 66, Y + 40, '24px SFD', '#fff', -0.2); testo(c, t2, X + 66, Y + 68, '18px SFTS', 'rgba(255,255,255,0.82)'); c.restore();
}
export { OR, VERDE, GRIGIO };
