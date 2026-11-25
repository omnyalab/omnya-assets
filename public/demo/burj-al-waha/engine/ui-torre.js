// Motore choose-your · TEMI DELLA UI DELLE TORRI (Nico 20/11 sera: «ancora più figo, più Dubai style, lusso»).
// Pannello «choose your floor», cartellino del piano sulla torre, titoli e bottoni, in cinque prove:
//   D1 Notte d'oro (vetro nero, doppio filo d'oro, Didot, nome in arabo Thuluth)       ┐ come chiesto da Nico:
//   D2 Perla e bordeaux (vetro perla, Bodoni, bordeaux degli interni I2)               │ Dubai, lusso
//   D3 Arco del Majlis (pannello ad arco con la mashrabiya, bronzo della torre)       ┘
//   D4 Monolito (vetro liquido, SF Thin enorme, un filo lega il piano al pannello)      ┐ come la farei io
//   D5 Concierge (barra editoriale in basso, nome bilingue in alto a sinistra)          ┘
// Si sceglie con ?ui=D1…D5 (o S.uiTorre). Senza: il pannello SAMAR di prima. I font di sistema (Didot, Bodoni 72, Diwan Thuluth, Copperplate) ci sono su ogni Mac.
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const OROS = ['#f7e9bd', '#c9a055', '#f4da93', '#9a7232'], BRONZO = ['#f1d3a6', '#a8703f', '#e9c294', '#7a4c2a'];
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function grad(c, x, y, w, h, s) { const g = c.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, s[0]); g.addColorStop(0.38, s[1]); g.addColorStop(0.64, s[2]); g.addColorStop(1, s[3]); return g; }
function testo(c, t, x, y, font, col, ls = 0, al = 'left') { c.font = font; c.fillStyle = col; c.textAlign = al; c.letterSpacing = ls + 'px'; c.fillText(t, al === 'center' ? x + ls / 2 : x, y); c.letterSpacing = '0px'; c.textAlign = 'left'; }
function largo(c, t, font, ls = 0) { c.font = font; c.letterSpacing = ls + 'px'; const w = c.measureText(t).width; c.letterSpacing = '0px'; return w; }
function sfondo(c, ui, path, filtro, tinta) {   // vetro: lo sfondo vero sfocato dentro la forma, poi la tinta
  c.save(); path(); c.clip(); if (ui.sfondo) { c.filter = filtro; c.drawImage(ui.sfondo, 0, 0, ui.W, ui.H); c.filter = 'none'; } if (tinta) { c.fillStyle = tinta; c.fillRect(0, 0, ui.W, ui.H); } c.restore();
}
function ombra(c, path, col = 'rgba(0,0,0,0.42)', b = 46, oy = 16) { c.save(); c.shadowColor = col; c.shadowBlur = b; c.shadowOffsetY = oy; path(); c.fillStyle = 'rgba(0,0,0,0.01)'; c.fill(); c.restore(); }
function rombo(c, x, y, s, fill) { c.save(); c.translate(x, y); c.rotate(Math.PI / 4); c.fillStyle = fill; c.fillRect(-s / 2, -s / 2, s, s); c.restore(); }
function stella(c, x, y, r, stroke, lw = 1) { c.save(); c.translate(x, y); c.strokeStyle = stroke; c.lineWidth = lw; for (let k = 0; k < 2; k++) { c.save(); c.rotate(k * Math.PI / 4); c.strokeRect(-r, -r, 2 * r, 2 * r); c.restore(); } c.restore(); }
function stellaPiena(c, x, y, r, fill) { c.save(); c.translate(x, y); c.fillStyle = fill; for (let k = 0; k < 2; k++) { c.save(); c.rotate(k * Math.PI / 4); c.fillRect(-r, -r, 2 * r, 2 * r); c.restore(); } c.restore(); }
function mashrabiya(c, x, y, w, h, s, col) { c.save(); c.strokeStyle = col; c.lineWidth = 0.9; for (let yy = y - s; yy < y + h + s; yy += s) for (let xx = x - s; xx < x + w + s; xx += s) { stella(c, xx, yy, s * 0.27, col, 0.9); c.beginPath(); c.moveTo(xx + s * 0.38, yy); c.lineTo(xx + s * 0.62, yy); c.moveTo(xx, yy + s * 0.38); c.lineTo(xx, yy + s * 0.62); c.stroke(); } c.restore(); }
function arco(c, x, y, w, h, ha, r = 20) {   // pannello ad arco a sesto acuto (come le finestre del majlis), base dritta con gli angoli tondi
  const xm = x + w / 2, yb = y + ha; c.beginPath(); c.moveTo(x, y + h - r); c.lineTo(x, yb);
  c.bezierCurveTo(x, yb - ha * 0.62, xm - w * 0.2, y + ha * 0.1, xm, y); c.bezierCurveTo(xm + w * 0.2, y + ha * 0.1, x + w, yb - ha * 0.62, x + w, yb);
  c.lineTo(x + w, y + h - r); c.arcTo(x + w, y + h, x + w - r, y + h, r); c.lineTo(x + r, y + h); c.arcTo(x, y + h, x, y + h - r, r); c.closePath();
}
function velo(c, ui, a, h = 300, k = 0.34) {   // velo scuro morbido in alto: i titoli si leggono anche sul cielo chiaro
  c.save(); c.globalAlpha = a; const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, `rgba(0,0,0,${k})`); g.addColorStop(0.55, `rgba(0,0,0,${k * 0.35})`); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, ui.W, h); c.restore();
}
const soldi = (v, val) => v == null ? 'Price on request' : v >= 1e6 ? `${val} ${(Math.round(v / 1e4) / 100).toLocaleString('en-US')}M` : `${val} ${v.toLocaleString('en-US')}`;

export function temaTorre(id, S) {
  const T = TEMI[id]; if (!T) return null; return { id, ...T, S };
}

// ---------------------------------------------------------------- D1 · Notte d'oro
const D1 = {
  nome: "Notte d'oro",
  pannello(c, d, ui, a) {
    const W = ui.W, H = ui.H, w = 404, h = 600, x = W - 92 - w, y = H / 2 - h / 2 - 6, P = () => rr(c, x, y, w, h, 6), cx = x + w / 2, oro = grad(c, x, y, w, h, OROS);
    c.save(); c.globalAlpha = a; ombra(c, P, 'rgba(0,0,0,0.55)', 60, 20); sfondo(c, ui, P, 'blur(30px) saturate(1.15) brightness(0.62)', 'rgba(9,8,7,0.52)');
    c.strokeStyle = oro; c.lineWidth = 1.3; rr(c, x + 0.6, y + 0.6, w - 1.2, h - 1.2, 6); c.stroke(); c.globalAlpha = a * 0.55; c.lineWidth = 0.8; rr(c, x + 8, y + 8, w - 16, h - 16, 3); c.stroke(); c.globalAlpha = a;
    rombo(c, cx, y + 8, 9, oro);
    testo(c, d.torreAr, cx, y + 66, '56px "Diwan Thuluth"', oro, 0, 'center');
    testo(c, d.torre.toUpperCase(), cx, y + 118, '22px Didot', oro, 9, 'center');
    testo(c, d.luogo.toUpperCase(), cx, y + 139, '10.5px SFTS', 'rgba(246,236,214,0.62)', 3.4, 'center');
    c.fillStyle = oro; c.fillRect(x + 44, y + 163, w / 2 - 58, 0.9); c.fillRect(cx + 14, y + 163, w / 2 - 58, 0.9); rombo(c, cx, y + 163.5, 6, oro);
    testo(c, 'Choose your floor', cx, y + 200, 'italic 25px Didot', '#f6ecd6', 0.3, 'center');
    testo(c, String(d.livello), cx, y + 330, '132px Didot', oro, -2, 'center');
    testo(c, `LEVEL  ·  ${d.alto} M`, cx, y + 360, '10.5px SFTS', 'rgba(246,236,214,0.66)', 3.4, 'center');
    testo(c, d.nome, cx, y + 404, '30px Didot', '#fbf3e2', 0.2, 'center');
    const st = d.stato[0].toUpperCase(), sw = largo(c, st, '10px SFTS', 2.6) + 30, sx = cx - sw / 2; c.strokeStyle = d.stato[1] === 'no' ? 'rgba(255,140,120,0.8)' : oro; c.lineWidth = 1; rr(c, sx, y + 420, sw, 24, 12); c.stroke();
    testo(c, st, cx, y + 436, '10px SFTS', d.stato[1] === 'no' ? '#ffb4a6' : '#f1d99a', 2.6, 'center');
    testo(c, `${d.area.toLocaleString('en-US')} m²   ·   ${d.vista}`, cx, y + 474, '13px SFTS', 'rgba(246,236,214,0.7)', 0.2, 'center');
    testo(c, (d.speciale || d.prezzo == null ? '' : 'from ') + soldi(d.prezzo, d.valuta), cx, y + 505, '23px Didot', oro, 0.6, 'center');
    const bw = w - 64, bh = 52, bx = x + 32, by = y + h - bh - 30;
    if (!d.esaurito) { c.save(); c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 20; c.shadowOffsetY = 8; rr(c, bx, by, bw, bh, bh / 2); c.fillStyle = grad(c, bx, by, bw, bh, OROS); c.fill(); c.restore();
      c.save(); rr(c, bx, by, bw, bh, bh / 2); c.clip(); c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(bx, by, bw, bh / 2); c.restore(); if (d.hov) { rr(c, bx, by, bw, bh, bh / 2); c.fillStyle = 'rgba(255,255,255,0.14)'; c.fill(); }
      testo(c, d.btn.toUpperCase(), bx + bw / 2, by + 32, '13.5px SFTB', '#1b1408', 2.4, 'center'); ui.btns.push({ id: 'scegliUltimo', r: [bx, by, bx + bw, by + bh], c: [bx + bw / 2, by + bh / 2] }); }
    else { rr(c, bx, by, bw, bh, bh / 2); c.strokeStyle = 'rgba(246,236,214,0.3)'; c.stroke(); testo(c, 'SOLD', bx + bw / 2, by + 32, '13.5px SFTB', 'rgba(246,236,214,0.5)', 3, 'center'); }
    c.restore();
  },
  tag(c, p, d, ui) { const oro = grad(c, p[0], p[1] - 20, 140, 40, OROS); rombo(c, p[0] + 22, p[1], 6, oro); c.fillStyle = oro; c.fillRect(p[0] + 30, p[1] - 0.5, 64, 1);
    testo(c, String(d.livello), p[0] + 104, p[1] + 11, '34px Didot', oro, 0); testo(c, 'LEVEL', p[0] + 106 + largo(c, String(d.livello), '34px Didot') + 6, p[1] + 9, '9.5px SFTS', '#f1d99a', 2.2); },
  titolo(c, ui, tit, a) { velo(c, ui, a); const W = ui.W, oro = grad(c, W / 2 - 200, 60, 400, 120, OROS); c.save(); c.globalAlpha = a; c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 24;
    testo(c, tit[0].toUpperCase(), W / 2, 84, '12.5px SFTS', '#f1d99a', 4.6, 'center'); testo(c, tit[1], W / 2, 152, '62px Didot', '#fbf3e2', 0.4, 'center'); c.shadowColor = 'transparent';
    c.fillStyle = oro; c.fillRect(W / 2 - 150, 178, 136, 1); c.fillRect(W / 2 + 14, 178, 136, 1); rombo(c, W / 2, 178.5, 7, oro); c.restore(); },
  largo: (c, t) => largo(c, t.toUpperCase(), '13.5px SFTB', 2.4) + 96,
  pill(c, ui, cx, cy, t, id, hov, sec) { const w = this.largo(c, t), h = 58, x = cx - w / 2, y = cy - h / 2;
    if (sec) { const P = () => rr(c, x, y, w, h, h / 2); ombra(c, P, 'rgba(0,0,0,0.4)', 26, 8); sfondo(c, ui, P, 'blur(20px) brightness(0.6)', 'rgba(9,8,7,0.5)'); c.strokeStyle = grad(c, x, y, w, h, OROS); c.lineWidth = 1.2; rr(c, x + 0.6, y + 0.6, w - 1.2, h - 1.2, h / 2); c.stroke(); testo(c, t.toUpperCase(), cx, cy + 5, '13.5px SFTB', '#f1d99a', 2.4, 'center'); }
    else { c.save(); c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 26; c.shadowOffsetY = 10; rr(c, x, y, w, h, h / 2); c.fillStyle = grad(c, x, y, w, h, OROS); c.fill(); c.restore(); c.save(); rr(c, x, y, w, h, h / 2); c.clip(); c.fillStyle = 'rgba(255,255,255,0.2)'; c.fillRect(x, y, w, h / 2); c.restore(); testo(c, t.toUpperCase(), cx, cy + 5, '13.5px SFTB', '#1b1408', 2.4, 'center'); }
    if (hov) { rr(c, x, y, w, h, h / 2); c.fillStyle = 'rgba(255,255,255,0.1)'; c.fill(); } ui.btns.push({ id, r: [x, y, x + w, y + h], c: [cx, cy] }); },
};

// ---------------------------------------------------------------- D2 · Perla e bordeaux
const BX = '#5a1522', BXc = '#7a2433', ORB = '#a8834e';
const D2 = {
  nome: 'Perla e bordeaux',
  pannello(c, d, ui, a) {
    const W = ui.W, H = ui.H, w = 396, h = 586, x = W - 92 - w, y = H / 2 - h / 2, P = () => rr(c, x, y, w, h, 30), cx = x + w / 2;
    c.save(); c.globalAlpha = a; ombra(c, P, 'rgba(40,10,14,0.35)', 60, 22); sfondo(c, ui, P, 'blur(30px) saturate(1.1) brightness(1.15)', 'rgba(250,245,238,0.8)');
    c.save(); P(); c.clip(); const g = c.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(0.3, 'rgba(255,240,246,0.0)'); g.addColorStop(0.55, 'rgba(232,240,255,0.18)'); g.addColorStop(1, 'rgba(255,248,236,0.3)'); c.fillStyle = g; c.fillRect(x, y, w, h); c.restore();
    c.strokeStyle = grad(c, x, y, w, h, OROS); c.lineWidth = 1.1; rr(c, x + 0.6, y + 0.6, w - 1.2, h - 1.2, 30); c.stroke();
    testo(c, d.torre.toUpperCase(), cx, y + 62, '23px "Bodoni 72"', BX, 8.5, 'center');
    testo(c, d.torreAr + '  ·  ' + d.luogo.toUpperCase(), cx, y + 90, '11px SFTS', ORB, 2.6, 'center');
    c.fillStyle = 'rgba(90,21,34,0.22)'; c.fillRect(x + 36, y + 114, w - 72, 1);
    testo(c, 'Choose your floor', cx, y + 154, 'italic 25px "Bodoni 72"', BX, 0.2, 'center');
    testo(c, 'LEVEL', cx, y + 196, '10.5px SFTS', ORB, 3.6, 'center');
    testo(c, String(d.livello), cx, y + 320, '138px "Bodoni 72"', BX, -3, 'center');
    testo(c, d.nome, cx, y + 366, 'italic 29px "Bodoni 72"', BX, 0, 'center');
    const st = d.stato[0].toUpperCase(), sw = largo(c, st, '10px SFTB', 2.4) + 30; rr(c, cx - sw / 2, y + 384, sw, 24, 12); c.fillStyle = d.stato[1] === 'no' ? 'rgba(90,21,34,0.25)' : BX; c.fill();
    testo(c, st, cx, y + 400, '10px SFTB', d.stato[1] === 'no' ? BX : '#f6e8cf', 2.4, 'center');
    testo(c, `${d.alto} m   ·   ${d.area.toLocaleString('en-US')} m²   ·   ${d.vista}`, cx, y + 440, '12.5px SFTS', 'rgba(90,21,34,0.72)', 0.1, 'center');
    testo(c, (d.speciale || d.prezzo == null ? '' : 'from ') + soldi(d.prezzo, d.valuta), cx, y + 474, '23px "Bodoni 72"', BX, 0.6, 'center');
    const bw = w - 64, bh = 54, bx = x + 32, by = y + h - bh - 30;
    if (!d.esaurito) { c.save(); c.shadowColor = 'rgba(60,8,16,0.4)'; c.shadowBlur = 18; c.shadowOffsetY = 8; rr(c, bx, by, bw, bh, bh / 2); c.fillStyle = d.hov ? BXc : BX; c.fill(); c.restore();
      c.strokeStyle = grad(c, bx, by, bw, bh, OROS); c.lineWidth = 1; rr(c, bx + 4, by + 4, bw - 8, bh - 8, bh / 2 - 4); c.stroke();
      testo(c, d.btn.toUpperCase(), bx + bw / 2, by + 33, '13.5px SFTB', '#f6e8cf', 2.4, 'center'); ui.btns.push({ id: 'scegliUltimo', r: [bx, by, bx + bw, by + bh], c: [bx + bw / 2, by + bh / 2] }); }
    else { rr(c, bx, by, bw, bh, bh / 2); c.strokeStyle = 'rgba(90,21,34,0.35)'; c.stroke(); testo(c, 'SOLD', bx + bw / 2, by + 33, '13.5px SFTB', 'rgba(90,21,34,0.5)', 3, 'center'); }
    c.restore();
  },
  tag(c, p, d) { c.fillStyle = 'rgba(255,250,242,0.95)'; c.fillRect(p[0] + 22, p[1] - 0.6, 52, 1.2); const t = String(d.livello), tw = largo(c, t, '24px "Bodoni 72"') + 34;
    c.save(); c.shadowColor = 'rgba(40,10,14,0.35)'; c.shadowBlur = 14; c.shadowOffsetY = 4; rr(c, p[0] + 76, p[1] - 19, tw, 38, 19); c.fillStyle = 'rgba(250,245,238,0.94)'; c.fill(); c.restore(); testo(c, t, p[0] + 76 + tw / 2, p[1] + 8.5, '24px "Bodoni 72"', BX, 0, 'center'); },
  titolo(c, ui, tit, a) { velo(c, ui, a, 280, 0.26); const W = ui.W; c.save(); c.globalAlpha = a; c.shadowColor = 'rgba(30,10,10,0.5)'; c.shadowBlur = 24; testo(c, tit[0].toUpperCase(), W / 2, 84, '12.5px SFTS', 'rgba(255,248,236,0.9)', 4.4, 'center');
    testo(c, tit[1], W / 2, 152, 'italic 64px "Bodoni 72"', '#fff8ec', 0, 'center'); c.shadowColor = 'transparent'; c.fillStyle = 'rgba(255,248,236,0.7)'; c.fillRect(W / 2 - 60, 176, 120, 1); c.restore(); },
  largo: (c, t) => largo(c, t.toUpperCase(), '13.5px SFTB', 2.4) + 96,
  pill(c, ui, cx, cy, t, id, hov, sec) { const w = this.largo(c, t), h = 58, x = cx - w / 2, y = cy - h / 2, P = () => rr(c, x, y, w, h, h / 2);
    if (sec) { ombra(c, P, 'rgba(40,10,14,0.3)', 24, 8); sfondo(c, ui, P, 'blur(20px) brightness(1.1)', 'rgba(250,245,238,0.86)'); c.strokeStyle = grad(c, x, y, w, h, OROS); c.lineWidth = 1; rr(c, x + 0.5, y + 0.5, w - 1, h - 1, h / 2); c.stroke(); testo(c, t.toUpperCase(), cx, cy + 5, '13.5px SFTB', BX, 2.4, 'center'); }
    else { c.save(); c.shadowColor = 'rgba(40,8,14,0.45)'; c.shadowBlur = 24; c.shadowOffsetY = 9; P(); c.fillStyle = hov ? BXc : BX; c.fill(); c.restore(); c.strokeStyle = grad(c, x, y, w, h, OROS); c.lineWidth = 1; rr(c, x + 4, y + 4, w - 8, h - 8, h / 2 - 4); c.stroke(); testo(c, t.toUpperCase(), cx, cy + 5, '13.5px SFTB', '#f6e8cf', 2.4, 'center'); }
    ui.btns.push({ id, r: [x, y, x + w, y + h], c: [cx, cy] }); },
};

// ---------------------------------------------------------------- D3 · Arco del Majlis
const D3 = {
  nome: 'Arco del Majlis',
  pannello(c, d, ui, a) {
    const W = ui.W, H = ui.H, w = 392, h = 640, ha = 150, x = W - 96 - w, y = H / 2 - h / 2 - 10, P = () => arco(c, x, y, w, h, ha), cx = x + w / 2, br = grad(c, x, y, w, h, BRONZO);
    c.save(); c.globalAlpha = a; ombra(c, P, 'rgba(20,10,4,0.5)', 60, 20); sfondo(c, ui, P, 'blur(30px) saturate(1.2) brightness(0.7)', 'rgba(48,30,18,0.5)');
    c.save(); P(); c.clip(); c.beginPath(); c.rect(x, y, w, ha + 56); c.clip(); mashrabiya(c, x + 6, y, w, ha + 56, 30, 'rgba(241,211,166,0.16)');
    const fg = c.createLinearGradient(0, y + ha - 10, 0, y + ha + 56); fg.addColorStop(0, 'rgba(48,30,18,0)'); fg.addColorStop(1, 'rgba(48,30,18,0.75)'); c.fillStyle = fg; c.fillRect(x, y + ha - 10, w, 66); c.restore();
    c.strokeStyle = br; c.lineWidth = 1.4; P(); c.stroke(); c.globalAlpha = a * 0.5; c.lineWidth = 0.8; arco(c, x + 9, y + 14, w - 18, h - 23, ha - 8, 14); c.stroke(); c.globalAlpha = a;
    testo(c, d.torreAr, cx, y + 140, '86px "Diwan Thuluth"', br, 0, 'center');
    testo(c, d.torre.toUpperCase() + '  ·  ' + d.luogo.toUpperCase(), cx, y + 192, '15px Copperplate', '#f6e6cc', 3.2, 'center');
    stellaPiena(c, cx, y + 216, 4.2, br); c.fillStyle = br; c.fillRect(x + 50, y + 215.5, w / 2 - 64, 0.9); c.fillRect(cx + 14, y + 215.5, w / 2 - 64, 0.9);
    testo(c, 'CHOOSE YOUR FLOOR', cx, y + 252, '11px SFTS', 'rgba(246,230,204,0.7)', 4, 'center');
    testo(c, String(d.livello), cx, y + 370, '124px SFDT', '#fbf1e2', -2, 'center');
    testo(c, `LEVEL  ·  ${d.alto} M`, cx, y + 398, '10.5px SFTS', 'rgba(246,230,204,0.66)', 3.4, 'center');
    testo(c, d.nome, cx, y + 440, '28px SFDL', '#fbf1e2', 0.2, 'center');
    const st = d.stato[0].toUpperCase(), sw = largo(c, st, '10.5px SFTS', 2.6) + 22; stellaPiena(c, cx - sw / 2 - 4, y + 466, 4, d.stato[1] === 'no' ? '#ff9c86' : br); testo(c, st, cx + 8, y + 470, '10.5px SFTS', d.stato[1] === 'no' ? '#ffb4a6' : '#efcf9f', 2.6, 'center');
    testo(c, `${d.area.toLocaleString('en-US')} m²  ·  ${d.vista}`, cx, y + 506, '13px SFTS', 'rgba(246,230,204,0.72)', 0.2, 'center');
    testo(c, (d.speciale || d.prezzo == null ? '' : 'from ') + soldi(d.prezzo, d.valuta), cx, y + 538, '22px SFDL', '#efcf9f', 0.6, 'center');
    const bw = w - 60, bh = 52, bx = x + 30, by = y + h - bh - 28;
    if (!d.esaurito) { c.save(); c.shadowColor = 'rgba(20,10,4,0.5)'; c.shadowBlur = 18; c.shadowOffsetY = 8; rr(c, bx, by, bw, bh, bh / 2); c.fillStyle = grad(c, bx, by, bw, bh, BRONZO); c.fill(); c.restore();
      c.save(); rr(c, bx, by, bw, bh, bh / 2); c.clip(); c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(bx, by, bw, bh / 2); c.restore(); if (d.hov) { rr(c, bx, by, bw, bh, bh / 2); c.fillStyle = 'rgba(255,255,255,0.12)'; c.fill(); }
      const t = d.btn.toUpperCase(), tw = largo(c, t, '13.5px SFTB', 2.2); stellaPiena(c, bx + bw / 2 - tw / 2 - 16, by + bh / 2, 5.5, '#2a170a'); testo(c, t, bx + bw / 2 + 8, by + 32, '13.5px SFTB', '#2a170a', 2.2, 'center');
      ui.btns.push({ id: 'scegliUltimo', r: [bx, by, bx + bw, by + bh], c: [bx + bw / 2, by + bh / 2] }); }
    else { rr(c, bx, by, bw, bh, bh / 2); c.strokeStyle = 'rgba(246,230,204,0.3)'; c.stroke(); testo(c, 'SOLD', bx + bw / 2, by + 32, '13.5px SFTB', 'rgba(246,230,204,0.5)', 3, 'center'); }
    c.restore();
  },
  tag(c, p, d, ui) { const br = grad(c, p[0], p[1] - 30, 160, 60, BRONZO); c.fillStyle = br; c.fillRect(p[0] + 22, p[1] - 0.5, 50, 1); const t = String(d.livello), w = Math.max(54, largo(c, t, '24px SFDT') + 28), h = 58, x = p[0] + 76, y = p[1] - h / 2 - 4;
    const P = () => arco(c, x, y, w, h, 18, 8); ombra(c, P, 'rgba(20,10,4,0.4)', 14, 4); sfondo(c, ui, P, 'blur(14px) brightness(0.7)', 'rgba(48,30,18,0.55)'); c.strokeStyle = br; c.lineWidth = 1.1; P(); c.stroke(); testo(c, t, x + w / 2, y + h - 12, '24px SFDT', '#fbf1e2', 0, 'center'); },
  titolo(c, ui, tit, a) { velo(c, ui, a); const W = ui.W, br = grad(c, W / 2 - 200, 60, 400, 140, BRONZO); c.save(); c.globalAlpha = a; c.shadowColor = 'rgba(20,10,4,0.55)'; c.shadowBlur = 24;
    testo(c, tit[0].toUpperCase(), W / 2, 86, '15px Copperplate', '#f6e6cc', 4, 'center'); testo(c, tit[1], W / 2, 150, '60px SFDL', '#fbf1e2', 0.2, 'center'); c.shadowColor = 'transparent';
    c.fillStyle = br; c.fillRect(W / 2 - 140, 176, 124, 1); c.fillRect(W / 2 + 16, 176, 124, 1); stellaPiena(c, W / 2, 176.5, 4.5, br); c.restore(); },
  largo: (c, t) => largo(c, t.toUpperCase(), '13.5px SFTB', 2.2) + 110,
  pill(c, ui, cx, cy, t, id, hov, sec) { const w = this.largo(c, t), h = 58, x = cx - w / 2, y = cy - h / 2, P = () => rr(c, x, y, w, h, h / 2), T2 = t.toUpperCase(), tw = largo(c, T2, '13.5px SFTB', 2.2);
    if (sec) { ombra(c, P, 'rgba(20,10,4,0.4)', 24, 8); sfondo(c, ui, P, 'blur(20px) brightness(0.65)', 'rgba(48,30,18,0.55)'); c.strokeStyle = grad(c, x, y, w, h, BRONZO); c.lineWidth = 1.2; rr(c, x + 0.6, y + 0.6, w - 1.2, h - 1.2, h / 2); c.stroke(); stellaPiena(c, cx - tw / 2 - 16, cy, 5.5, '#efcf9f'); testo(c, T2, cx + 8, cy + 5, '13.5px SFTB', '#efcf9f', 2.2, 'center'); }
    else { c.save(); c.shadowColor = 'rgba(20,10,4,0.5)'; c.shadowBlur = 24; c.shadowOffsetY = 9; P(); c.fillStyle = grad(c, x, y, w, h, BRONZO); c.fill(); c.restore(); c.save(); rr(c, x, y, w, h, h / 2); c.clip(); c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(x, y, w, h / 2); c.restore(); stellaPiena(c, cx - tw / 2 - 16, cy, 5.5, '#2a170a'); testo(c, T2, cx + 8, cy + 5, '13.5px SFTB', '#2a170a', 2.2, 'center'); }
    if (hov) { P(); c.fillStyle = 'rgba(255,255,255,0.1)'; c.fill(); } ui.btns.push({ id, r: [x, y, x + w, y + h], c: [cx, cy] }); },
};

// ---------------------------------------------------------------- D4 · Monolito (come la farei io)
const AMB = '#ffc35e';
function vetroLiquido(c, ui, P, x, y, w, h, scuro = 0.16) {
  ombra(c, P, 'rgba(0,0,0,0.28)', 50, 18); sfondo(c, ui, P, 'blur(36px) saturate(1.7) brightness(0.92)', `rgba(18,20,26,${scuro})`);
  c.save(); P(); c.clip(); const g = c.createLinearGradient(0, y, 0, y + h * 0.5); g.addColorStop(0, 'rgba(255,255,255,0.2)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(x, y, w, h); c.restore();
  const s = c.createLinearGradient(x, y, x + w, y + h); s.addColorStop(0, 'rgba(255,255,255,0.85)'); s.addColorStop(0.3, 'rgba(255,255,255,0.12)'); s.addColorStop(0.7, 'rgba(255,255,255,0.08)'); s.addColorStop(1, 'rgba(255,255,255,0.55)'); c.strokeStyle = s; c.lineWidth = 1.4; P(); c.stroke();
}
const D4 = {
  nome: 'Monolito',
  geo(ui) { const w = 372, h = 548; return { w, h, x: ui.W - 96 - w, y: ui.H / 2 - h / 2 }; },
  pannello(c, d, ui, a) {
    const { w, h, x, y } = this.geo(ui), P = () => rr(c, x, y, w, h, 38), X = x + 34;
    c.save(); c.globalAlpha = a; vetroLiquido(c, ui, P, x, y, w, h, 0.3);
    testo(c, d.torre.toUpperCase(), X, y + 50, '12px SFTB', '#fff', 4.2); testo(c, d.luogo, X + largo(c, d.torre.toUpperCase(), '12px SFTB', 4.2) + 10, y + 50, '12px SFTS', 'rgba(255,255,255,0.62)', 0.4);
    testo(c, 'Choose your floor', X, y + 88, '26px SFDL', '#fff', 0.2);
    testo(c, String(d.livello), X - 6, y + 250, '170px SFDT', '#fff', -6);
    testo(c, d.nome, X, y + 296, '25px SFDM', '#fff', 0.2);
    c.fillStyle = d.stato[1] === 'no' ? '#ff7b6b' : AMB; c.beginPath(); c.arc(X + 4, y + 322, 4, 0, 7); c.fill(); testo(c, d.stato[0], X + 16, y + 327, '13.5px SFTS', d.stato[1] === 'no' ? '#ffb0a4' : '#ffd99a', 0.2);
    const col = [['HEIGHT', `${d.alto} m`], ['AREA', `${d.area.toLocaleString('en-US')} m²`], ['VIEW', d.vistaBreve]]; const cw = (w - 68) / 3;
    c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(X, y + 350, w - 68, 1);
    col.forEach(([k, v], i) => { testo(c, k, X + i * cw, y + 378, '10px SFTS', 'rgba(255,255,255,0.55)', 2.2); testo(c, v, X + i * cw, y + 401, '16px SFDM', '#fff', 0); });
    testo(c, (d.speciale || d.prezzo == null ? '' : 'from ') + soldi(d.prezzo, d.valuta), X, y + 438, '22px SFDL', '#fff', 0.2);
    const bw = w - 68, bh = 50, by = y + h - bh - 26;
    if (!d.esaurito) { c.save(); c.shadowColor = 'rgba(0,0,0,0.3)'; c.shadowBlur = 16; c.shadowOffsetY = 6; rr(c, X, by, bw, bh, bh / 2); c.fillStyle = d.hov ? '#ffffff' : 'rgba(255,255,255,0.96)'; c.fill(); c.restore();
      testo(c, d.btn + '   →', X + bw / 2, by + 31, '15.5px SFTS', '#0c0d10', 0, 'center'); ui.btns.push({ id: 'scegliUltimo', r: [X, by, X + bw, by + bh], c: [X + bw / 2, by + bh / 2] }); }
    else { rr(c, X, by, bw, bh, bh / 2); c.strokeStyle = 'rgba(255,255,255,0.35)'; c.stroke(); testo(c, 'Sold', X + bw / 2, by + 31, '15.5px SFTS', 'rgba(255,255,255,0.6)', 0, 'center'); }
    c.restore();
  },
  tag(c, p, d, ui) { const g = this.geo(ui), x1 = g.x - 14, yT = p[1]; c.save(); c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 8; c.strokeStyle = 'rgba(255,255,255,0.95)'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(p[0] + 26, yT); c.lineTo(x1, yT); c.stroke();
    c.fillStyle = AMB; c.shadowColor = AMB; c.shadowBlur = 12; c.beginPath(); c.arc(p[0] + 20, yT, 4.5, 0, 7); c.fill(); c.shadowBlur = 0; c.fillStyle = '#fff'; c.beginPath(); c.arc(x1, yT, 3, 0, 7); c.fill();
    const t = `Level ${d.livello}`, tw = largo(c, t, '15px SFDM') + 30; c.shadowBlur = 14; rr(c, p[0] + 60, yT - 38, tw, 30, 15); c.fillStyle = 'rgba(255,255,255,0.96)'; c.fill(); c.shadowBlur = 0; testo(c, t, p[0] + 60 + tw / 2, yT - 18, '15px SFDM', '#0c0d10', 0, 'center'); c.restore(); },
  titolo(c, ui, tit, a) { velo(c, ui, a, 300, 0.3); const W = ui.W; c.save(); c.globalAlpha = a; c.shadowColor = 'rgba(0,0,0,0.4)'; c.shadowBlur = 26; testo(c, tit[0].toUpperCase(), W / 2, 84, '12.5px SFTS', 'rgba(255,255,255,0.85)', 4.2, 'center'); testo(c, tit[1], W / 2, 158, '76px SFDT', '#fff', -0.5, 'center'); c.restore(); },
  largo: (c, t) => largo(c, t, '17px SFTS', 0) + 76,
  pill(c, ui, cx, cy, t, id, hov, sec) { const w = this.largo(c, t), h = 58, x = cx - w / 2, y = cy - h / 2, P = () => rr(c, x, y, w, h, h / 2);
    if (sec) { vetroLiquido(c, ui, P, x, y, w, h, hov ? 0.08 : 0.18); testo(c, t, cx, cy + 6, '17px SFTS', '#fff', 0, 'center'); }
    else { c.save(); c.shadowColor = 'rgba(0,0,0,0.32)'; c.shadowBlur = 24; c.shadowOffsetY = 8; P(); c.fillStyle = hov ? '#fff' : 'rgba(255,255,255,0.96)'; c.fill(); c.restore(); testo(c, t, cx, cy + 6, '17px SFTS', '#0c0d10', 0, 'center'); }
    ui.btns.push({ id, r: [x, y, x + w, y + h], c: [cx, cy] }); },
};

// ---------------------------------------------------------------- D5 · Concierge (come la farei io)
const AV = '#f4ecdf';
function marchio(c, ui, d, a) {   // nome bilingue in alto a sinistra, come un hotel
  velo(c, ui, a, 340, 0.42); c.save(); c.globalAlpha = a; c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 20; const X = 76;
  testo(c, d.torreAr, X, 104, '50px "Diwan Thuluth"', AV, 0); c.shadowBlur = 0; c.fillStyle = 'rgba(244,236,223,0.7)'; c.fillRect(X + 118, 62, 1, 50);
  c.shadowBlur = 20; testo(c, d.torre.toUpperCase(), X + 138, 84, '24px Didot', AV, 9); testo(c, d.luogo.toUpperCase(), X + 139, 106, '10.5px SFTS', 'rgba(244,236,223,0.75)', 3.6); c.restore();
}
const D5 = {
  nome: 'Concierge',
  pannello(c, d, ui, a) {
    const W = ui.W, H = ui.H, x = 64, w = W - 128, h = 112, y = H - h - 52, P = () => rr(c, x, y, w, h, 18);
    marchio(c, ui, d, a);
    if (!d.senzaScegli) { c.save(); c.globalAlpha = a; c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 22; testo(c, 'Choose your floor', W - 76, 96, 'italic 30px Didot', AV, 0.2, 'right'); c.restore(); }
    c.save(); c.globalAlpha = a; ombra(c, P, 'rgba(0,0,0,0.5)', 50, 16); sfondo(c, ui, P, 'blur(30px) saturate(1.1) brightness(0.55)', 'rgba(8,8,8,0.5)'); c.strokeStyle = 'rgba(244,236,223,0.28)'; c.lineWidth = 1; rr(c, x + 0.5, y + 0.5, w - 1, h - 1, 18); c.stroke();
    c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 22; testo(c, String(d.livello), x + 38, y + 70, '118px Didot', AV, -3); c.shadowBlur = 0;
    const nx = x + 40 + largo(c, String(d.livello), '118px Didot', -3) + 26;
    testo(c, d.nome, nx, y + 52, 'italic 34px Didot', AV, 0.2); testo(c, d.stato[0].toUpperCase(), nx, y + 80, '10.5px SFTS', d.stato[1] === 'no' ? '#ffb4a6' : 'rgba(244,236,223,0.7)', 3);
    const cols = [['HEIGHT', `${d.alto} M`], ['AREA', `${d.area.toLocaleString('en-US')} M²`], ['VIEW', d.vistaBreve.toUpperCase()], ['PRICE', d.prezzo == null ? 'ON REQUEST' : (d.speciale ? '' : 'FROM ') + soldi(d.prezzo, d.valuta)]];
    let cx2 = x + 640; cols.forEach(([k, v]) => { c.fillStyle = 'rgba(244,236,223,0.22)'; c.fillRect(cx2 - 26, y + 26, 1, h - 52); testo(c, k, cx2, y + 48, '10px SFTS', 'rgba(244,236,223,0.55)', 2.8); testo(c, v, cx2, y + 76, '19px Didot', AV, 1.2); cx2 += Math.max(150, largo(c, v, '19px Didot', 1.2) + 54); });
    const bw = 236, bh = 54, bx = x + w - bw - 30, by = y + h / 2 - bh / 2;
    if (!d.esaurito) { rr(c, bx, by, bw, bh, bh / 2); c.fillStyle = d.hov ? '#ffffff' : AV; c.fill(); testo(c, d.speciale ? (d.btn || 'Enter the majlis').toUpperCase() : `ENTER LEVEL ${d.livello}`, bx + bw / 2, by + 33, '13px SFTB', '#111', 2.6, 'center');
      ui.btns.push({ id: 'scegliUltimo', r: [bx, by, bx + bw, by + bh], c: [bx + bw / 2, by + bh / 2] }); }
    else { rr(c, bx, by, bw, bh, bh / 2); c.strokeStyle = 'rgba(244,236,223,0.4)'; c.stroke(); testo(c, 'SOLD', bx + bw / 2, by + 33, '13px SFTB', 'rgba(244,236,223,0.6)', 3, 'center'); }
    c.restore();
  },
  tag(c, p, d) { c.save(); c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 12; c.fillStyle = AV; c.fillRect(p[0] + 22, p[1] - 0.5, 60, 1); testo(c, String(d.livello), p[0] + 92, p[1] + 12, '36px Didot', AV, 0); c.restore(); },
  titolo(c, ui, tit, a) { const W = ui.W; marchio(c, ui, this.dati || { torre: this.S.testi.torre, torreAr: this.S.testi.torreAr, luogo: this.S.testi.data }, a);
    c.save(); c.globalAlpha = a; c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 24; testo(c, tit[0].toUpperCase(), W / 2, 196, '12px SFTS', 'rgba(244,236,223,0.85)', 4.4, 'center'); c.shadowColor = 'rgba(0,0,0,0.65)'; c.shadowBlur = 30; testo(c, tit[1], W / 2, 262, 'italic 66px Didot', AV, 0.2, 'center'); c.restore(); },
  largo: (c, t) => largo(c, t.toUpperCase(), '13px SFTB', 2.6) + 92,
  pill(c, ui, cx, cy, t, id, hov, sec) { const w = this.largo(c, t), h = 56, x = cx - w / 2, y = cy - h / 2, P = () => rr(c, x, y, w, h, h / 2);
    if (sec) { sfondo(c, ui, P, 'blur(20px) brightness(0.55)', 'rgba(8,8,8,0.35)'); c.strokeStyle = 'rgba(244,236,223,0.85)'; c.lineWidth = 1; rr(c, x + 0.5, y + 0.5, w - 1, h - 1, h / 2); c.stroke(); testo(c, t.toUpperCase(), cx, cy + 5, '13px SFTB', AV, 2.6, 'center'); }
    else { c.save(); c.shadowColor = 'rgba(0,0,0,0.4)'; c.shadowBlur = 22; c.shadowOffsetY = 8; P(); c.fillStyle = hov ? '#fff' : AV; c.fill(); c.restore(); testo(c, t.toUpperCase(), cx, cy + 5, '13px SFTB', '#111', 2.6, 'center'); }
    ui.btns.push({ id, r: [x, y, x + w, y + h], c: [cx, cy] }); },
};


// ================================================================ U1-U5 · SEMPRE UNA CARD MODERNA (Nico 20/11 sera: «deve sempre essere una card figa moderna ma con stile, magari con altro»)
// Le D sopra restano solo come storia (barra, arco, Didot: bocciate). Qui: card di vetro a destra, angoli tondi, SF Pro, e ogni prova ha il suo «altro».
const AR = '"SF Arabic", "Geeza Pro"';
function card(c, ui, x, y, w, h, r, { tinta, filtro, bordo, ombraCol = 'rgba(0,0,0,0.42)' }) {
  const P = () => rr(c, x, y, w, h, r); ombra(c, P, ombraCol, 54, 18); sfondo(c, ui, P, filtro, tinta);
  c.save(); P(); c.clip(); const g = c.createLinearGradient(0, y, 0, y + h * 0.45); g.addColorStop(0, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(x, y, w, h); c.restore();
  if (bordo) { c.strokeStyle = bordo; c.lineWidth = 1.2; rr(c, x + 0.6, y + 0.6, w - 1.2, h - 1.2, r); c.stroke(); }
}
function chips(c, x, y, voci, { font = '13px SFTS', h = 30, gap = 8, bordo, fondo, col }) {   // pillole delle caratteristiche
  let xx = x; for (const v of voci) { const w = largo(c, v, font) + 26; rr(c, xx, y, w, h, h / 2); if (fondo) { c.fillStyle = fondo; c.fill(); } if (bordo) { c.strokeStyle = bordo; c.lineWidth = 1; c.stroke(); } testo(c, v, xx + 13, y + h / 2 + 4.5, font, col); xx += w + gap; } return xx;
}
function bottone(c, ui, d, bx, by, bw, bh, { fondo, testoCol, font = '16px SFTS', freccia = true, sheen = false }) {
  if (d.esaurito) { rr(c, bx, by, bw, bh, bh / 2); c.strokeStyle = 'rgba(255,255,255,0.3)'; c.lineWidth = 1; c.stroke(); testo(c, 'Sold', bx + bw / 2, by + bh / 2 + 5.5, font, 'rgba(255,255,255,0.55)', 0, 'center'); return; }
  c.save(); c.shadowColor = 'rgba(0,0,0,0.35)'; c.shadowBlur = 18; c.shadowOffsetY = 7; rr(c, bx, by, bw, bh, bh / 2); c.fillStyle = fondo; c.fill(); c.restore();
  if (sheen) { c.save(); rr(c, bx, by, bw, bh, bh / 2); c.clip(); c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(bx, by, bw, bh / 2); c.restore(); }
  if (d.hov) { rr(c, bx, by, bw, bh, bh / 2); c.fillStyle = 'rgba(255,255,255,0.12)'; c.fill(); }
  testo(c, d.btn + (freccia ? '  →' : ''), bx + bw / 2, by + bh / 2 + 5.5, font, testoCol, 0, 'center');
  ui.btns.push({ id: 'scegliUltimo', r: [bx, by, bx + bw, by + bh], c: [bx + bw / 2, by + bh / 2] });
}
function tagModerno(c, p, d, { linea = 'rgba(255,255,255,0.95)', fondo = 'rgba(255,255,255,0.95)', col = '#0c0d10', punto = AMB } = {}) {
  c.save(); c.shadowColor = 'rgba(0,0,0,0.4)'; c.shadowBlur = 10; c.fillStyle = punto; c.beginPath(); c.arc(p[0] + 20, p[1], 4.5, 0, 7); c.fill();
  c.fillStyle = linea; c.fillRect(p[0] + 28, p[1] - 0.6, 50, 1.2); const t = `Level ${d.livello}`, tw = largo(c, t, '15px SFDM') + 30; rr(c, p[0] + 82, p[1] - 16, tw, 32, 16); c.fillStyle = fondo; c.fill(); c.shadowBlur = 0;
  testo(c, t, p[0] + 82 + tw / 2, p[1] + 5.5, '15px SFDM', col, 0, 'center'); c.restore();
}
function titoloModerno(c, ui, tit, a, { sopra = 'rgba(255,255,255,0.85)', col = '#fff', accento = null } = {}) {
  velo(c, ui, a, 300, 0.3); const W = ui.W; c.save(); c.globalAlpha = a; c.shadowColor = 'rgba(0,0,0,0.42)'; c.shadowBlur = 26;
  testo(c, tit[0].toUpperCase(), W / 2, 86, '12.5px SFTS', sopra, 4.2, 'center'); testo(c, tit[1], W / 2, 156, '68px SFDL', col, 0, 'center'); c.shadowColor = 'transparent';
  if (accento) { c.fillStyle = accento; c.fillRect(W / 2 - 28, 182, 56, 2); } c.restore();
}
function pillModerna(c, ui, cx, cy, t, id, hov, sec, { fondo, testoCol, secTinta = 'rgba(14,14,16,0.35)', secBordo = 'rgba(255,255,255,0.6)', secCol = '#fff', sheen = false }) {
  const w = largo(c, t, '17px SFTS') + 80, h = 58, x = cx - w / 2, y = cy - h / 2, P = () => rr(c, x, y, w, h, h / 2);
  if (sec) { ombra(c, P, 'rgba(0,0,0,0.3)', 24, 8); sfondo(c, ui, P, 'blur(22px) saturate(1.4) brightness(0.8)', secTinta); c.strokeStyle = secBordo; c.lineWidth = 1.1; rr(c, x + 0.5, y + 0.5, w - 1, h - 1, h / 2); c.stroke(); testo(c, t, cx, cy + 6, '17px SFTS', secCol, 0, 'center'); }
  else { c.save(); c.shadowColor = 'rgba(0,0,0,0.38)'; c.shadowBlur = 24; c.shadowOffsetY = 9; P(); c.fillStyle = fondo; c.fill(); c.restore(); if (sheen) { c.save(); P(); c.clip(); c.fillStyle = 'rgba(255,255,255,0.2)'; c.fillRect(x, y, w, h / 2); c.restore(); } testo(c, t, cx, cy + 6, '17px SFTS', testoCol, 0, 'center'); }
  if (hov) { P(); c.fillStyle = 'rgba(255,255,255,0.1)'; c.fill(); } ui.btns.push({ id, r: [x, y, x + w, y + h], c: [cx, cy] });
}
const prezzoTxt = d => (d.speciale || d.prezzo == null ? '' : 'from ') + soldi(d.prezzo, d.valuta);
const caratteristiche = d => [`${d.alto} m high`, `${d.area.toLocaleString('en-US')} m²`, `${d.vistaBreve} view`];

// U1 · Champagne: vetro fumé, filo champagne, numero enorme sottile in oro, pillole delle caratteristiche
const U1 = {
  nome: 'Champagne',
  pannello(c, d, ui, a) {
    const W = ui.W, H = ui.H, w = 404, h = 560, x = W - 92 - w, y = H / 2 - h / 2, X = x + 32, oro = grad(c, x, y, w, h, OROS);
    c.save(); c.globalAlpha = a; card(c, ui, x, y, w, h, 30, { tinta: 'rgba(14,12,10,0.5)', filtro: 'blur(32px) saturate(1.2) brightness(0.7)', bordo: oro });
    testo(c, d.torre.toUpperCase(), X, y + 50, '12px SFTB', '#f1d99a', 4.4); testo(c, d.torreAr, x + w - 32, y + 52, `22px ${AR}`, '#f1d99a', 0, 'right');
    testo(c, d.luogo, X, y + 72, '12.5px SFTS', 'rgba(255,255,255,0.55)', 0.2);
    testo(c, 'Choose your floor', X, y + 118, '28px SFDL', '#fff', 0);
    testo(c, String(d.livello), X - 8, y + 268, '160px SFDT', oro, -5);
    testo(c, 'LEVEL', X + largo(c, String(d.livello), '160px SFDT', -5) + 2, y + 262, '11px SFTS', 'rgba(241,217,154,0.8)', 3);
    testo(c, d.nome, X, y + 312, '26px SFDM', '#fff', 0); c.fillStyle = d.stato[1] === 'no' ? '#ff7b6b' : '#f1d99a'; c.beginPath(); c.arc(X + 4, y + 336, 3.5, 0, 7); c.fill(); testo(c, d.stato[0], X + 15, y + 341, '13.5px SFTS', d.stato[1] === 'no' ? '#ffb0a4' : '#f1d99a');
    chips(c, X, y + 362, caratteristiche(d), { font: '12.5px SFTS', bordo: 'rgba(241,217,154,0.55)', fondo: 'rgba(255,255,255,0.04)', col: '#f6ecd6' });
    testo(c, prezzoTxt(d), X, y + 442, '27px SFDL', '#fff', 0);
    bottone(c, ui, d, X, y + h - 82, w - 64, 54, { fondo: grad(c, X, y + h - 82, w - 64, 54, OROS), testoCol: '#1b1408', font: '16px SFTB', sheen: true });
    c.restore();
  },
  tag(c, p, d) { tagModerno(c, p, d, { fondo: 'rgba(20,16,10,0.85)', col: '#f1d99a', punto: '#f1d99a' }); },
  titolo(c, ui, tit, a) { titoloModerno(c, ui, tit, a, { sopra: '#f1d99a', accento: grad(c, ui.W / 2 - 28, 180, 56, 4, OROS) }); },
  largo: (c, t) => largo(c, t, '17px SFTS') + 80,
  pill(c, ui, cx, cy, t, id, hov, sec) { pillModerna(c, ui, cx, cy, t, id, hov, sec, { fondo: grad(c, cx - 150, cy - 29, 300, 58, OROS), testoCol: '#1b1408', secTinta: 'rgba(14,12,10,0.45)', secBordo: 'rgba(241,217,154,0.7)', secCol: '#f6ecd6', sheen: true }); },
};

// U2 · Anteprima: la card ha dentro la foto vera del piano (la Sky Majlis, o la vista da quel piano), come le app dei grandi immobiliari
const U2 = {
  nome: 'Anteprima',
  pannello(c, d, ui, a) {
    const W = ui.W, H = ui.H, w = 400, h = 610, x = W - 92 - w, y = H / 2 - h / 2, X = x + 26;
    c.save(); c.globalAlpha = a; card(c, ui, x, y, w, h, 32, { tinta: 'rgba(250,248,244,0.86)', filtro: 'blur(30px) saturate(1.2) brightness(1.15)', bordo: 'rgba(255,255,255,0.9)', ombraCol: 'rgba(0,0,0,0.3)' });
    const fx = x + 12, fy = y + 12, fw = w - 24, fh = 236, F = ui.reale && ui.reale.foto, im = F && (d.speciale ? F.dentro : F.vista);
    c.save(); rr(c, fx, fy, fw, fh, 22); c.clip();
    if (im && im.naturalWidth) { const iw = im.naturalWidth, ih = im.naturalHeight, k = d.speciale ? [0.34, 0.3, 0.6] : [0.22, 0.12, 0.52], sw = iw * k[2], sh = sw * fh / fw; c.drawImage(im, iw * k[0], ih * k[1], sw, sh, fx, fy, fw, fh); }
    else if (ui.sfondo) { c.filter = 'blur(6px)'; c.drawImage(ui.sfondo, 0, 0, W, H); c.filter = 'none'; }
    const g = c.createLinearGradient(0, fy + fh * 0.5, 0, fy + fh); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)'); c.fillStyle = g; c.fillRect(fx, fy, fw, fh); c.restore();
    const st = d.stato[0], sw2 = largo(c, st, '12.5px SFTS') + 26; rr(c, fx + 14, fy + 14, sw2, 28, 14); c.fillStyle = d.stato[1] === 'no' ? 'rgba(210,60,50,0.9)' : 'rgba(255,255,255,0.92)'; c.fill(); testo(c, st, fx + 27, fy + 33, '12.5px SFTS', d.stato[1] === 'no' ? '#fff' : '#111');
    testo(c, d.speciale ? 'Inside the Majlis' : `View from level ${d.livello}`, fx + 16, fy + fh - 18, '13px SFTS', 'rgba(255,255,255,0.92)');
    testo(c, d.torre.toUpperCase() + '  ·  ' + d.luogo.toUpperCase(), X, y + 286, '11px SFTB', '#8a7a62', 2.6);
    testo(c, String(d.livello), X - 4, y + 372, '96px SFDT', '#111', -3); const lw = largo(c, String(d.livello), '96px SFDT', -3);
    testo(c, 'LEVEL', X + lw + 8, y + 336, '11px SFTS', '#8a7a62', 2.6); testo(c, d.nome, X + lw + 8, y + 364, '24px SFDM', '#111');
    chips(c, X, y + 398, caratteristiche(d), { font: '12.5px SFTS', fondo: 'rgba(17,17,17,0.06)', col: '#2a2a2a' });
    testo(c, prezzoTxt(d), X, y + 470, '26px SFDL', '#111');
    testo(c, 'Choose your floor', X + w - 52, y + 470, '13px SFTS', '#8a7a62', 0, 'right');
    bottone(c, ui, d, X, y + h - 80, w - 52, 54, { fondo: '#111214', testoCol: '#fff' });
    c.restore();
  },
  tag(c, p, d) { tagModerno(c, p, d); },
  titolo(c, ui, tit, a) { titoloModerno(c, ui, tit, a); },
  largo: (c, t) => largo(c, t, '17px SFTS') + 80,
  pill(c, ui, cx, cy, t, id, hov, sec) { pillModerna(c, ui, cx, cy, t, id, hov, sec, { fondo: hov ? '#fff' : 'rgba(255,255,255,0.96)', testoCol: '#111214' }); },
};

// U3 · Mini torre: accanto ai dati, la sagoma della torre col piano scelto acceso in ambra (come un ascensore privato)
function miniTorre(c, x, y, h, d, S) {
  const Ht = 268, k = h / Ht, ys = m => y + h - m * k, wL = 26, wR = 23, gap = 4, cx = x + 30;
  const vol = (x0, w, top, arco) => { c.beginPath(); c.moveTo(x0, ys(0)); c.bezierCurveTo(x0 - 3, ys(top * 0.4), x0 - 3, ys(top * 0.7), x0 + (arco ? 2 : 1), ys(top) + (arco ? 8 : 0)); c.quadraticCurveTo(x0 + w * 0.5, ys(top) - (arco ? 6 : 0), x0 + w - 1, ys(top) + (arco ? 2 : 0)); c.bezierCurveTo(x0 + w + 3, ys(top * 0.7), x0 + w + 3, ys(top * 0.4), x0 + w, ys(0)); c.closePath(); };
  c.save(); const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(255,255,255,0.34)'); g.addColorStop(1, 'rgba(255,255,255,0.12)');
  vol(cx - wL - gap / 2, wL, Ht, true); c.fillStyle = g; c.fill(); c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 1; c.stroke();
  vol(cx + gap / 2, wR, 238, false); c.fillStyle = g; c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.25)'; for (let m = 20; m < 250; m += 20) c.fillRect(cx - wL - gap / 2 + 3, ys(m), wL + wR + gap - 6, 0.6);
  const yy = ys(d.alto + 2), L = c.createLinearGradient(cx - 60, 0, cx + 60, 0); L.addColorStop(0, 'rgba(255,195,94,0)'); L.addColorStop(0.5, 'rgba(255,195,94,1)'); L.addColorStop(1, 'rgba(255,195,94,0)');
  c.shadowColor = AMB; c.shadowBlur = 16; c.fillStyle = L; c.fillRect(cx - 44, yy - 2.5, 88, 5); c.shadowBlur = 0;
  c.fillStyle = '#fff'; c.fillRect(cx + 30, yy - 0.5, 18, 1); testo(c, `${d.alto} m`, cx + 52, yy + 4, '11px SFTS', '#ffd99a');
  c.restore();
}
const U3 = {
  nome: 'Mini torre',
  pannello(c, d, ui, a) {
    const W = ui.W, H = ui.H, w = 430, h = 590, x = W - 92 - w, y = H / 2 - h / 2, X = x + 150;
    c.save(); c.globalAlpha = a; card(c, ui, x, y, w, h, 32, { tinta: 'rgba(16,18,24,0.42)', filtro: 'blur(34px) saturate(1.5) brightness(0.8)', bordo: 'rgba(255,255,255,0.5)' });
    c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(x + 128, y + 30, 1, h - 60);
    miniTorre(c, x + 26, y + 70, h - 140, d, this.S);
    testo(c, d.torre.toUpperCase(), X, y + 56, '12px SFTB', '#fff', 4.2); testo(c, d.torreAr, x + w - 30, y + 58, `20px ${AR}`, 'rgba(255,255,255,0.8)', 0, 'right');
    testo(c, 'Choose your floor', X, y + 96, '25px SFDL', '#fff');
    testo(c, 'LEVEL', X, y + 140, '10.5px SFTS', 'rgba(255,255,255,0.55)', 2.8); testo(c, String(d.livello), X - 6, y + 250, '120px SFDT', '#fff', -4);
    testo(c, d.nome, X, y + 292, '24px SFDM', '#fff'); c.fillStyle = d.stato[1] === 'no' ? '#ff7b6b' : AMB; c.beginPath(); c.arc(X + 4, y + 316, 4, 0, 7); c.fill(); testo(c, d.stato[0], X + 15, y + 321, '13.5px SFTS', d.stato[1] === 'no' ? '#ffb0a4' : '#ffd99a');
    const rows = [['Height', `${d.alto} m`], ['Area', `${d.area.toLocaleString('en-US')} m²`], ['View', d.vistaBreve]];
    rows.forEach(([k, v], i) => { const yy = y + 356 + i * 30; c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(X, yy - 20, w - 180, 1); testo(c, k, X, yy, '13px SFTS', 'rgba(255,255,255,0.6)'); testo(c, v, x + w - 30, yy, '14px SFDM', '#fff', 0, 'right'); });
    testo(c, prezzoTxt(d), X, y + 466, '24px SFDL', '#fff');
    bottone(c, ui, d, x + 26, y + h - 78, w - 52, 52, { fondo: 'rgba(255,255,255,0.96)', testoCol: '#0c0d10' });
    c.restore();
  },
  tag(c, p, d) { tagModerno(c, p, d); },
  titolo(c, ui, tit, a) { titoloModerno(c, ui, tit, a, { accento: AMB }); },
  largo: (c, t) => largo(c, t, '17px SFTS') + 80,
  pill(c, ui, cx, cy, t, id, hov, sec) { pillModerna(c, ui, cx, cy, t, id, hov, sec, { fondo: hov ? '#fff' : 'rgba(255,255,255,0.96)', testoCol: '#0c0d10' }); },
};

// U4 · Perla e bordeaux moderna: vetro perla, SF Pro, il bordeaux degli interni (I2) su numero, pillole e bottone
const U4 = {
  nome: 'Perla e bordeaux',
  pannello(c, d, ui, a) {
    const W = ui.W, H = ui.H, w = 400, h = 560, x = W - 92 - w, y = H / 2 - h / 2, X = x + 32;
    c.save(); c.globalAlpha = a; card(c, ui, x, y, w, h, 32, { tinta: 'rgba(250,246,240,0.84)', filtro: 'blur(30px) saturate(1.1) brightness(1.15)', bordo: 'rgba(255,255,255,0.95)', ombraCol: 'rgba(60,10,18,0.3)' });
    c.save(); rr(c, x, y, w, h, 32); c.clip(); const g = c.createRadialGradient(x + w, y, 10, x + w, y, w * 0.9); g.addColorStop(0, 'rgba(122,36,51,0.16)'); g.addColorStop(1, 'rgba(122,36,51,0)'); c.fillStyle = g; c.fillRect(x, y, w, h); c.restore();
    testo(c, d.torre.toUpperCase(), X, y + 50, '12px SFTB', BX, 4.4); testo(c, d.torreAr, x + w - 32, y + 52, `22px ${AR}`, BX, 0, 'right'); testo(c, d.luogo, X, y + 72, '12.5px SFTS', 'rgba(90,21,34,0.55)');
    testo(c, 'Choose your floor', X, y + 118, '28px SFDL', '#1d1013');
    testo(c, String(d.livello), X - 8, y + 268, '160px SFDT', BX, -5); testo(c, 'LEVEL', X + largo(c, String(d.livello), '160px SFDT', -5) + 2, y + 262, '11px SFTS', ORB, 3);
    testo(c, d.nome, X, y + 312, '26px SFDM', '#1d1013'); const st = d.stato[0], sw = largo(c, st, '12px SFTB') + 24; rr(c, X, y + 326, sw, 24, 12); c.fillStyle = d.stato[1] === 'no' ? 'rgba(90,21,34,0.18)' : BX; c.fill(); testo(c, st, X + 12, y + 342.5, '12px SFTB', d.stato[1] === 'no' ? BX : '#f6e8cf');
    chips(c, X, y + 366, caratteristiche(d), { font: '12.5px SFTS', bordo: 'rgba(90,21,34,0.35)', col: BX });
    testo(c, prezzoTxt(d), X, y + 444, '27px SFDL', '#1d1013');
    bottone(c, ui, d, X, y + h - 82, w - 64, 54, { fondo: d.hov ? BXc : BX, testoCol: '#f6e8cf' });
    c.restore();
  },
  tag(c, p, d) { tagModerno(c, p, d, { fondo: 'rgba(250,246,240,0.95)', col: BX, punto: '#ffd9a0' }); },
  titolo(c, ui, tit, a) { titoloModerno(c, ui, tit, a, { accento: '#c25a6c' }); },
  largo: (c, t) => largo(c, t, '17px SFTS') + 80,
  pill(c, ui, cx, cy, t, id, hov, sec) { pillModerna(c, ui, cx, cy, t, id, hov, sec, { fondo: hov ? BXc : BX, testoCol: '#f6e8cf', secTinta: 'rgba(250,246,240,0.8)', secBordo: 'rgba(255,255,255,0.9)', secCol: BX }); },
};

// U5 · Vetro liquido col filo: vetro chiaro alla Apple, numero enorme sottile, un filo ambra lega il piano acceso alla card
const U5 = { ...D4, nome: 'Vetro liquido col filo',
  titolo(c, ui, tit, a) { titoloModerno(c, ui, tit, a, { accento: AMB }); },
};

const TEMI = { D1, D2, D3, D4, D5, U1, U2, U3, U4, U5 };
export const NOMI_TEMI = Object.fromEntries(Object.entries(TEMI).map(([k, v]) => [k, v.nome]));
