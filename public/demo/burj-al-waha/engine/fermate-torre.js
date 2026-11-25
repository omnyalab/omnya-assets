// Nico 24/11 (Burj Al Waha): welcome al centro con un velo scuro LEGGERO (dietro si vede la casa), che entra ed esce morbido, mai di scatto;
// dentro «sono io che scelgo dove andare»: una pill per la stanza dopo, con la freccia dalla parte dove va la clip (cucina a sinistra = freccia a sinistra).
// Prove da scegliere: welcome ?wf=V1|V2|V3, pill ?fermate=P1|P2|P3|P4. Tutto su canvas, sopra le clip vere.
const ORO = ['#f7e9bd', '#c9a055', '#f4da93', '#9a7232'];
const cl = v => Math.max(0, Math.min(1, v)), ss = v => { v = cl(v); return v * v * v * (v * (v * 6 - 15) + 10); };   // smootherstep: parte e arriva piano
function oro(c, x, y, w, h) { const g = c.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, ORO[0]); g.addColorStop(0.38, ORO[1]); g.addColorStop(0.64, ORO[2]); g.addColorStop(1, ORO[3]); return g; }
function T(c, t, x, y, font, col, ls = 0, al = 'center') { c.font = font; c.fillStyle = col; c.textAlign = al; c.letterSpacing = ls + 'px'; c.fillText(t, al === 'center' ? x + ls / 2 : al === 'right' ? x + ls : x, y); c.letterSpacing = '0px'; c.textAlign = 'left'; }
function largo(c, t, font, ls = 0) { c.font = font; c.letterSpacing = ls + 'px'; const w = c.measureText(t).width; c.letterSpacing = '0px'; return w; }
function rombo(c, x, y, s, fill) { c.save(); c.translate(x, y); c.rotate(Math.PI / 4); c.fillStyle = fill; c.fillRect(-s / 2, -s / 2, s, s); c.restore(); }
function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
const ANG = { sx: Math.PI, dx: 0, su: -Math.PI / 2 };
function freccia(c, x, y, dir, s, col, lw = 1.6, coda = s) {   // freccia disegnata (punta + gambo), nel verso della stanza dopo
  c.save(); c.translate(x, y); c.rotate(ANG[dir] ?? 0); c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(-coda / 2, 0); c.lineTo(coda / 2, 0); c.moveTo(coda / 2 - s * 0.42, -s * 0.42); c.lineTo(coda / 2, 0); c.lineTo(coda / 2 - s * 0.42, s * 0.42); c.stroke(); c.restore(); }
function vetro(c, ui, path, filtro, tinta) { c.save(); path(); c.clip(); if (ui.sfondo) { c.filter = filtro; c.drawImage(ui.sfondo, 0, 0, ui.W, ui.H); c.filter = 'none'; } c.fillStyle = tinta; c.fillRect(0, 0, ui.W, ui.H); c.restore(); }
function ombra(c, path, col = 'rgba(0,0,0,0.35)', b = 30, oy = 10) { c.save(); c.shadowColor = col; c.shadowBlur = b; c.shadowOffsetY = oy; path(); c.fillStyle = 'rgba(0,0,0,0.01)'; c.fill(); c.restore(); }

/* ---------- welcome: velo leggero e scritta al centro ----------
   t = secondi dall'inizio dell'entrata (K1 parte subito; la vetrata si apre fra ~2,6 e ~3,5 s).
   V1 velo leggero uniforme · V2 velo solo al centro, dietro la scritta (i bordi restano chiari) · V3 vignetta da cinema (bordi più scuri, centro chiaro) */
export function welcomeSchermo(c, ui, B, t, stile = 'V1') {
  /* Nico 24/11 notte: velo che parte un po' dopo e va via un po' prima; prima esce «Welcome to» (più grande), poi il nome e sotto solo il piano */
  const W = ui.W, H = ui.H, Z = B.schermo || { velo: [2.2, 3.5, 4.5, 5.8], benv: [2.45, 3.3], resto: [2.95, 3.85], via: [4.25, 5.45] };
  const v = ss((t - Z.velo[0]) / (Z.velo[1] - Z.velo[0])) * (1 - ss((t - Z.velo[2]) / (Z.velo[3] - Z.velo[2])));
  const fuori = 1 - ss((t - Z.via[0]) / (Z.via[1] - Z.via[0]));
  const s1 = ss((t - Z.benv[0]) / (Z.benv[1] - Z.benv[0])) * fuori, s2 = ss((t - Z.resto[0]) / (Z.resto[1] - Z.resto[0])) * fuori;
  if (v <= 0.001 && s1 <= 0.001) return false;
  const yC = H / 2;
  c.save();
  if (stile === 'V2') { const g = c.createRadialGradient(W / 2, yC, 60, W / 2, yC, W * 0.6); g.addColorStop(0, `rgba(8,6,4,${0.55 * v})`); g.addColorStop(0.55, `rgba(8,6,4,${0.3 * v})`); g.addColorStop(1, `rgba(8,6,4,${0.12 * v})`); c.fillStyle = g; c.fillRect(0, 0, W, H); }
  else if (stile === 'V3') { const g = c.createRadialGradient(W / 2, yC, W * 0.18, W / 2, yC, W * 0.72); g.addColorStop(0, `rgba(8,6,4,${0.24 * v})`); g.addColorStop(1, `rgba(8,6,4,${0.68 * v})`); c.fillStyle = g; c.fillRect(0, 0, W, H); }
  else { c.fillStyle = `rgba(8,6,4,${0.42 * v})`; c.fillRect(0, 0, W, H); }
  c.textBaseline = 'alphabetic'; c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 28;
  if (s1 > 0.001) { c.globalAlpha = s1; const y = yC - 46 + (1 - s1) * 10; T(c, 'WELCOME  TO', W / 2, y, '30px SFTS', '#f3dfa6', 16); }
  if (s2 > 0.001) {
    c.globalAlpha = s2; const y = yC + 60 + (1 - s2) * 12;
    T(c, B.titolo.toUpperCase(), W / 2, y, '96px Didot', '#fff9ef', 14);
    c.shadowBlur = 8; const o = oro(c, W / 2 - 300, y + 30, 600, 4); c.fillStyle = o; c.fillRect(W / 2 - 290, y + 38, 262, 1); c.fillRect(W / 2 + 28, y + 38, 262, 1); rombo(c, W / 2, y + 38.5, 10, o);
    c.shadowBlur = 18; T(c, (B.piano || B.sotto).toUpperCase(), W / 2, y + 90, '17px SFTS', 'rgba(248,238,216,0.95)', 8);
  }
  c.restore(); return true;
}

/* ---------- fermate: la pill della stanza dopo ----------
   d = { stanza, n, tot, prossima, esci, dir: 'sx'|'dx'|'su', id, hov }
   La pill sta dalla parte dove va la camera: a sinistra a metà altezza se si gira a sinistra, in basso al centro se si va dritti.
   P1 vetro chiaro · P2 notte e oro · P3 solo scritta con la freccia lunga · P4 bottone tondo con la scritta accanto */
export function fermata(c, ui, d, a, now, stile = 'P1') {
  const W = ui.W, H = ui.H, dir = d.dir || 'dx'; c.save(); c.globalAlpha = a; c.textBaseline = 'alphabetic';
  const btn = (x0, y0, x1, y1) => ui.btns.push({ id: d.id, r: [x0, y0, x1, y1], c: [(x0 + x1) / 2, (y0 + y1) / 2] });
  const nome = d.esci ? 'Step outside' : d.prossima, sopra = d.esci ? 'BACK TO THE TOWER' : 'CONTINUE TO', hov = d.hov;
  // la stanza in cui sei: piccola, in basso a sinistra (uguale in tutte le prove)
  { const g = c.createLinearGradient(0, H, 0, H - 220); g.addColorStop(0, 'rgba(6,5,4,0.38)'); g.addColorStop(1, 'rgba(6,5,4,0)'); c.fillStyle = g; c.fillRect(0, H - 220, W, 220);
    c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 16; T(c, `${String(d.n).padStart(2, '0')} — ${String(d.tot).padStart(2, '0')}`, 72, H - 104, '11.5px SFTS', 'rgba(243,223,166,0.9)', 4, 'left');
    T(c, d.stanza, 70, H - 62, 'italic 38px Didot', '#fff9ef', 0.3, 'left'); c.shadowBlur = 0; }
  // dove si mette: lato della freccia
  const posto = (w, h) => dir === 'sx' ? [64, H * 0.5 - h / 2] : dir === 'dx' ? [W - 64 - w, H * 0.5 - h / 2] : [W / 2 - w / 2, H - 92 - h];
  if (stile === 'P1') {   // vetro chiaro: pill di vetro smerigliato, freccia in un cerchio bianco dalla parte giusta
    const f = '600 21px SFTS', tw = largo(c, nome, f), h = 64, w = tw + 112, [x, y] = posto(w, h), P = () => rr(c, x, y, w, h, h / 2);
    ombra(c, P, 'rgba(0,0,0,0.3)', 34, 10); vetro(c, ui, P, 'blur(24px) saturate(1.4) brightness(1.15)', hov ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.2)');
    c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 1; rr(c, x + 0.5, y + 0.5, w - 1, h - 1, h / 2); c.stroke();
    const cx = dir === 'sx' ? x + 32 : x + w - 32; c.fillStyle = '#fff'; c.beginPath(); c.arc(cx, y + h / 2, 22, 0, Math.PI * 2); c.fill(); freccia(c, cx, y + h / 2, dir, 12, '#141210', 2, 16);
    c.shadowColor = 'rgba(0,0,0,0.35)'; c.shadowBlur = 10; T(c, nome, dir === 'sx' ? x + 68 : x + 36, y + h / 2 + 7.5, f, '#fff', 0.2, 'left'); c.shadowBlur = 0;
    btn(x, y, x + w, y + h);
  } else if (stile === 'P2') {   // notte e oro (scelta di Nico 24/11): vetro nero, filo d'oro, moneta d'oro con la freccia, «CONTINUE TO» e il nome in corsivo
    const fN = 'italic 36px Didot', fS = '11px SFTS', tw = Math.max(largo(c, nome, fN, 0.2), largo(c, sopra, fS, 4.2)), h = 96, R = 30, w = 22 + 2 * R + 26 + tw + 44, x = 64, y = H / 2 - h / 2;
    const P = () => rr(c, x, y, w, h, h / 2), cx = x + 22 + R, cy = y + h / 2, tx = cx + R + 26, sp = hov ? 1 : 0;
    ombra(c, P, 'rgba(0,0,0,0.5)', 48, 16);
    vetro(c, ui, P, 'blur(30px) brightness(0.45) saturate(1.15)', 'rgba(9,7,5,0.5)');
    c.save(); P(); c.clip(); const lu = c.createLinearGradient(0, y, 0, y + h); lu.addColorStop(0, 'rgba(255,240,210,0.10)'); lu.addColorStop(0.5, 'rgba(255,240,210,0)'); c.fillStyle = lu; c.fillRect(x, y, w, h); c.restore();   // riflesso in alto
    c.strokeStyle = oro(c, x, y, w, h); c.globalAlpha = a * (hov ? 1 : 0.85); c.lineWidth = 1.2; rr(c, x + 0.6, y + 0.6, w - 1.2, h - 1.2, h / 2 - 0.6); c.stroke(); c.globalAlpha = a;
    c.save(); c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 12; c.fillStyle = oro(c, cx - R, cy - R, 2 * R, 2 * R); c.beginPath(); c.arc(cx, cy, R + sp * 2, 0, Math.PI * 2); c.fill(); c.restore();
    c.strokeStyle = 'rgba(80,58,20,0.45)'; c.lineWidth = 1; c.beginPath(); c.arc(cx, cy, R - 4 + sp * 2, 0, Math.PI * 2); c.stroke();   // bordo inciso della moneta
    freccia(c, cx + (dir === 'su' ? 0 : -sp * 3), cy - (dir === 'su' ? sp * 3 : 0), dir, 12, '#1d150a', 2.2, 18);
    T(c, sopra, tx, cy - 9, fS, 'rgba(243,223,166,0.92)', 4.2, 'left'); T(c, nome, tx - 1, cy + 27, fN, '#fff9ef', 0.2, 'left');
    btn(x, y, x + w, y + h);
  } else if (stile === 'P3') {   // solo scritta: niente pill, una freccia lunga d'oro e il nome grande in corsivo
    const f = 'italic 46px Didot', tw = Math.max(largo(c, nome, f), largo(c, sopra, '11px SFTS', 4)), wA = 120, h = 96, w = dir === 'su' ? tw : tw + wA + 26, [x, y] = posto(w, h);
    const g = c.createRadialGradient(x + w / 2, y + h / 2, 10, x + w / 2, y + h / 2, w * 0.75); g.addColorStop(0, 'rgba(6,5,4,0.32)'); g.addColorStop(1, 'rgba(6,5,4,0)'); c.fillStyle = g; c.fillRect(x - w * 0.4, y - h, w * 1.8, h * 3);
    c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 20;
    const tx = dir === 'sx' ? x + wA + 26 : x, col = hov ? '#fff9ef' : 'rgba(255,249,239,0.95)';
    if (dir === 'su') { const cx = x + w / 2; freccia(c, cx, y - 26, 'su', 14, oro(c, cx - 10, y - 70, 20, 80), 1.6, 64); T(c, sopra, cx, y + 26, '11px SFTS', 'rgba(243,223,166,0.95)', 4); T(c, nome, cx, y + 76, f, col, 0.2); }
    else { const ax = dir === 'sx' ? x + wA / 2 : x + tw + 26 + wA / 2; freccia(c, ax, y + 60, dir, 14, oro(c, ax - wA / 2, y + 50, wA, 20), 1.6, wA + (hov ? 14 : 0)); T(c, sopra, tx + 2, y + 26, '11px SFTS', 'rgba(243,223,166,0.95)', 4, 'left'); T(c, nome, tx, y + 76, f, col, 0.2, 'left'); }
    btn(x - 10, y - (dir === 'su' ? 70 : 0), x + w + 10, y + h);
  } else {   // P4 bottone tondo: un cerchio di vetro con la freccia, la scritta accanto (o sotto se si va dritti)
    const R = hov ? 40 : 37, f = 'italic 30px Didot', tw = Math.max(largo(c, nome, f), largo(c, sopra, '10.5px SFTS', 3.4)), w = dir === 'su' ? Math.max(tw, 2 * R) : 2 * R + 22 + tw, h = dir === 'su' ? 2 * R + 74 : 2 * R, [x, y] = posto(w, h);
    const cx = dir === 'sx' ? x + R : dir === 'dx' ? x + w - R : x + w / 2, cy = y + R, P = () => { c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); };
    const ph = (now * 0.7) % 1; c.strokeStyle = `rgba(255,255,255,${(1 - ph) * 0.55})`; c.lineWidth = 1.2; c.beginPath(); c.arc(cx, cy, R + 4 + ph * 18, 0, Math.PI * 2); c.stroke();
    ombra(c, P, 'rgba(0,0,0,0.35)', 30, 8); vetro(c, ui, P, 'blur(22px) saturate(1.4) brightness(1.1)', hov ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.22)'); c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1; P(); c.stroke();
    freccia(c, cx, cy, dir, 13, '#fff', 2, 22);
    c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 16;
    if (dir === 'su') { T(c, sopra, cx, y + 2 * R + 30, '10.5px SFTS', 'rgba(243,223,166,0.95)', 3.4); T(c, nome, cx, y + 2 * R + 64, f, '#fff9ef', 0.2); }
    else { const tx = dir === 'sx' ? x + 2 * R + 22 : x; T(c, sopra, tx, cy - 6, '10.5px SFTS', 'rgba(243,223,166,0.95)', 3.4, 'left'); T(c, nome, tx - 1, cy + 28, f, '#fff9ef', 0.2, 'left'); }
    btn(x, y, x + w, y + h);
  }
  c.restore();
}
