// Motore choose-your · VERSIONE VERA (?reale=1): al posto del 3D si vedono le clip Kling durante i voli e la foto ferma
// (ultimo fotogramma vero della clip) nelle pause. La scelta arancio si accende sulla foto con una maschera presa dal 3D
// alla stessa ripresa (le foto vere hanno la stessa inquadratura del 3D). Biglietto finale in 3D con lamina che brilla,
// timbro BOOKED e logo dell'evento in alto a destra (solo qui in post, mai dentro le foto o le clip generate).
// Il soggetto dà S.reale = { cartella, clip: { 'da>a': ['C1', …] }, logo }: una clip per ogni volo del giro, in ordine.
import * as THREE from 'three';
import { biglietto } from './biglietti.js';

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
const easeBack = t => { t = clamp(t); const c = 1.4; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const tela = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

export async function creaReale(S, M, { renderer, scene, camera, T, W, H, ui, REC }) {
  const R = S.reale, base = new URL(R.cartella, location.href).href;
  const cv = tela(W, H); cv.id = 'reale'; cv.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;object-fit:cover;display:block';
  document.body.insertBefore(cv, document.getElementById('ui')); const x = cv.getContext('2d');
  const sp = tela(W, H); sp.id = 'sopra'; sp.style.cssText = cv.style.cssText; document.body.insertBefore(sp, document.getElementById('ui')); const y = sp.getContext('2d');
  const ESPORTA = new URLSearchParams(location.search).get('esporta') === '1';   // per il film di VideoHub: il logo lo mette il film, qui solo foto, arancio e UI
  let ultimo = null, nStrati = 0; const nuoviStrati = [];
  ui.realeBooked = true;   // il biglietto BOOKED lo fa questo modulo, in 3D

  // ---------- clip ----------
  const nomi = [...new Set(Object.values(R.clip).flat())], V = {};
  async function blob(n) { for (let k = 0; ; k++) { try { const r = await fetch(base + n + '.mp4'); if (!r.ok) throw new Error(r.status); return URL.createObjectURL(await r.blob()); } catch (e) { if (k >= 3) throw e; await new Promise(t => setTimeout(t, 300 * (k + 1))); } } }
  await Promise.all(nomi.map(async n => { const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = await blob(n);
    await new Promise(ok => { v.onloadeddata = ok; v.load(); }); v.dataset.nome = n; V[n] = v; }));
  const prima = Object.values(R.clip)[0][0];
  let cur = V[prima], t0 = -1, quante = {};   // t0 < 0: clip ferma sul primo fotogramma
  const seek = (v, t) => Math.abs(v.currentTime - t) < 1e-3 ? Promise.resolve() : new Promise(ok => { const f = () => { v.removeEventListener('seeked', f); ok(); }; v.addEventListener('seeked', f); setTimeout(f, 3000); v.currentTime = t; });

  // ---------- maschera della scelta, dal 3D alla stessa ripresa ----------
  const MW = REC ? W : W / 2, MH = REC ? H : H / 2,   // dal vivo la maschera a metà risoluzione: il mouse resta fluido
    rt = new THREE.WebGLRenderTarget(MW, MH), buf = new Uint8Array(MW * MH * 4);
  const nero = new THREE.MeshBasicMaterial({ color: 0x000000 }), bianco = new THREE.MeshBasicMaterial({ color: 0xffffff }); bianco.depthFunc = THREE.LessEqualDepth;
  const OR = new THREE.Color(S.colori.scelta), ORL = new THREE.Color(S.colori.sceltaChiara);
  const m1 = tela(MW, MH), m1x = m1.getContext('2d'), m2 = tela(W, H), m2x = m2.getContext('2d', { willReadFrequently: true }), mFull = tela(W, H), mFx = mFull.getContext('2d');
  const lut = new Uint8Array(256); for (let i = 0; i < 256; i++) lut[i] = Math.round(255 * Math.pow(i / 255, 1 / 2.2));   // lineare → sRGB
  const nascondi = () => { const via = []; scene.traverse(o => { const m = o.material; if (o.visible && (o.name === 'paesaggio' || (m && !Array.isArray(m) && (m.visible === false || m.colorWrite === false || m.transparent)))) { via.push(o); o.visible = false; } }); return via; };
  // una maschera colorata: i posti (o le poltrone) col loro colore pieno, tutto il resto nero ma davanti (copre quello che sta dietro)
  function passa(colori, poltrone) {
    const P = M.info.posti, a = P.instanceColor.array; let quanti = 0; for (let i = 0; i < colori.length; i++) if (colori[i] > 0) { quanti++; break; }
    if (!quanti && !poltrone.length) return null;
    const fogPrima = scene.fog, auto = renderer.autoClear, ombre = renderer.shadowMap.autoUpdate, folla = M.interni.folla ? M.interni.folla.visible : false, tm = renderer.toneMapping;
    scene.fog = null; renderer.shadowMap.autoUpdate = false; M.interni.follaVis(false); renderer.toneMapping = THREE.NoToneMapping;
    renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear();
    const via = nascondi(); scene.overrideMaterial = nero; renderer.render(scene, camera); scene.overrideMaterial = null; renderer.autoClear = false; for (const o of via) o.visible = true;
    if (quanti) { const old = a.slice(), mat = P.material; a.set(colori); P.instanceColor.needsUpdate = true; P.material = bianco; renderer.render(P, camera); P.material = mat; a.set(old); P.instanceColor.needsUpdate = true; }
    for (const [g, c] of poltrone) { const mats = [], mb = bianco.clone(); mb.color.copy(c); g.traverse(o => { if (o.isMesh) { mats.push([o, o.material]); o.material = mb; } }); renderer.render(g, camera); for (const [o, m] of mats) o.material = m; mb.dispose(); }
    renderer.readRenderTargetPixels(rt, 0, 0, MW, MH, buf); renderer.setRenderTarget(null); renderer.autoClear = auto; renderer.shadowMap.autoUpdate = ombre; renderer.toneMapping = tm;
    scene.fog = fogPrima; M.interni.follaVis(folla);
    const id = m1x.createImageData(MW, MH), d = id.data;
    for (let yy = 0; yy < MH; yy++) { const ry = (MH - 1 - yy) * MW * 4, wy = yy * MW * 4; for (let xx = 0; xx < MW * 4; xx += 4) { const r = buf[ry + xx], g = buf[ry + xx + 1], b = buf[ry + xx + 2], on = (r > 6 || g > 6 || b > 6);
      d[wy + xx] = lut[r]; d[wy + xx + 1] = lut[g]; d[wy + xx + 2] = lut[b]; d[wy + xx + 3] = on ? 255 : 0; } }
    m1x.putImageData(id, 0, 0);
    // da tanti puntini a una zona piena col bordo morbido, il colore resta quello della categoria
    m2x.clearRect(0, 0, W, H); m2x.filter = 'blur(4px)'; m2x.drawImage(m1, 0, 0, W, H); m2x.filter = 'none';
    const g2 = m2x.getImageData(0, 0, W, H), gd = g2.data; for (let i = 0; i < gd.length; i += 4) gd[i + 3] = Math.min(255, gd[i + 3] * 3.4);
    const out = tela(W, H), ox = out.getContext('2d'); m2x.putImageData(g2, 0, 0); ox.filter = 'blur(1.2px)'; ox.drawImage(m2, 0, 0); ox.filter = 'none'; return out;
  }
  function maschera(st) {
    const tipo = S.livelli[st.liv].tipo, I = M.info;
    const deb = tipo === 'vip' ? null : passa(I.evidD, []), forte = passa(tipo === 'vip' ? new Float32Array(0) : I.evidF, I.evidVip || []);
    return deb || forte ? { deb, forte } : null;
  }
  // strato: la foto vera tinta coi colori della scelta solo dove c'è, i deboli leggeri, i forti pieni e più chiari
  const ferma = tela(W, H), fx = ferma.getContext('2d');
  function tinta(mask, chiaro) {
    const o = tela(W, H), c = o.getContext('2d'); c.drawImage(ferma, 0, 0);
    c.globalCompositeOperation = 'color'; c.drawImage(mask, 0, 0);
    c.globalCompositeOperation = 'soft-light'; c.drawImage(mask, 0, 0);
    if (chiaro) { c.globalCompositeOperation = 'screen'; c.globalAlpha = chiaro; c.drawImage(mask, 0, 0); c.globalAlpha = 1; }
    c.globalCompositeOperation = 'destination-in'; c.drawImage(mask, 0, 0); return o;
  }
  function strato(mk) {
    const o = tela(W, H), c = o.getContext('2d');
    if (mk.deb) { c.globalAlpha = 0.62; c.drawImage(tinta(mk.deb, 0.15), 0, 0); }
    if (mk.forte) { c.globalAlpha = 0.9; c.drawImage(tinta(mk.forte, 0.12), 0, 0);
      c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.22; c.shadowColor = 'rgba(255,255,255,0.9)'; c.shadowBlur = 14; c.filter = 'blur(2px)'; c.drawImage(mk.forte, 0, 0); c.restore(); }
    return o;
  }
  let chiave = '', strati = [], tPrima = T.now;

  // ---------- biglietto finale in 3D ----------
  let tk = null;
  function bigliettoTre() {
    if (tk) return tk;
    const r = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true }); r.setPixelRatio(1); r.setSize(W, H, false); r.outputColorSpace = THREE.SRGBColorSpace;
    const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(28, W / H, 0.1, 100); cam.position.set(0, 0, 10);
    const TW = 760, TH = 356, PAD = 70, K = 2, tc = tela((TW + PAD * 2) * K, (TH + PAD * 2) * K), tx = tc.getContext('2d');
    const tex = new THREE.CanvasTexture(tc); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const altezza = 2 * 10 * Math.tan(THREE.MathUtils.degToRad(14)), px = altezza / H;   // unità per pixel a z = 0
    const geo = new THREE.PlaneGeometry(tc.width / K * px, tc.height / K * px);
    const mat = new THREE.ShaderMaterial({ transparent: true, uniforms: { map: { value: tex }, fase: { value: 0 }, forza: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: `uniform sampler2D map; uniform float fase, forza; varying vec2 vUv;
        vec3 iri(float h){ return 0.5 + 0.5 * cos(6.2831 * (h + vec3(0., 0.33, 0.67))); }
        void main(){ vec4 c = texture2D(map, vUv); float b = vUv.x * 0.85 + vUv.y * 0.45 - fase;
          float banda = exp(-pow(b * 7.0, 2.0)) * forza; vec3 lam = mix(vec3(1.0, 0.86, 0.55), iri(vUv.x * 1.6 + vUv.y + fase), 0.45);
          c.rgb += lam * banda * 0.55 * c.a; gl_FragColor = c;
#include <colorspace_fragment>
        }` });
    const mesh = new THREE.Mesh(geo, mat); sc.add(mesh);
    tk = { r, sc, cam, mesh, mat, tex, tc, tx, TW, TH, PAD, K, px };
    return tk;
  }
  function disegnaBiglietto(st, s, timbro = true) {   // s = secondi da quando la camera è ferma sopra lo stadio
    const k = bigliettoTre(), e = M.finale ? M.finale(st) : null; if (!e) return;
    const { tx, tc, TW, TH, PAD, K } = k; tx.setTransform(1, 0, 0, 1, 0, 0); tx.clearRect(0, 0, tc.width, tc.height); tx.setTransform(K, 0, 0, K, 0, 0);
    biglietto(tx, PAD, PAD, TW, TH, ui.stileBiglietto, e, ui.logo, T.now, 1);
    const s2 = easeBack((s - 0.95) / 0.32);   // timbro BOOKED che sbatte sul biglietto
    if (timbro && s > 0.95) { tx.save(); tx.translate(PAD + TW * 0.5, PAD + TH * 0.42); tx.rotate(-0.12); const z = 1.9 - 0.9 * s2; tx.scale(z, z); tx.globalAlpha = clamp((s - 0.95) / 0.12);
      tx.lineWidth = 6; tx.strokeStyle = '#2bd46a'; tx.fillStyle = 'rgba(16,40,24,0.6)'; rrect(tx, -170, -50, 340, 100, 18); tx.fill(); tx.stroke();
      tx.textAlign = 'center'; tx.font = '800 64px SFTB'; tx.fillStyle = '#2bd46a'; tx.fillText('BOOKED', 0, 23); tx.restore(); }
    k.tex.needsUpdate = true;
    // entra di taglio da lontano, si raddrizza e poi ondeggia piano: quasi 3D
    const u = easeBack(s / 0.95), w = Math.max(0, s - 0.95), m = k.mesh, colpo = s > 0.95 && s < 1.4 ? Math.sin((s - 0.95) / 0.45 * Math.PI) * 0.035 : 0;
    m.rotation.y = -1.25 * (1 - u) - 0.16 + Math.sin(w * 1.15) * 0.11; m.rotation.x = 0.55 * (1 - u) + 0.07 + Math.sin(w * 0.8 + 1) * 0.045 + colpo; m.rotation.z = 0.08 * (1 - u) - 0.015;
    m.position.set(1.6 * (1 - u), -0.9 * (1 - u) + (timbro ? 0.12 : 0.42), -7 * (1 - u) - (timbro ? 0 : 1.2)); k.mat.uniforms.fase.value = -0.4 + ((s * 0.42) % 1.9); k.mat.uniforms.forza.value = clamp(s / 0.6);
    k.r.render(k.sc, k.cam);
    y.save(); y.globalAlpha = clamp(s / 0.4) * (timbro ? 0.35 : 0.22); y.fillStyle = '#000'; y.fillRect(0, 0, W, H); y.restore();
    y.save(); y.globalAlpha = clamp(s / 0.25); y.drawImage(k.r.domElement, 0, 0, W, H); y.restore();
  }

  // ---------- logo dell'evento in alto a destra ----------
  let logo = null; if (R.logo) { const im = new Image(); im.src = new URL(R.logo, location.href).href; await im.decode().catch(() => 0); logo = im; }
  function disegnaLogo() { if (!logo || !logo.naturalWidth) return; const h = R.logoAlto || 140, w = h * logo.naturalWidth / logo.naturalHeight;
    y.save(); y.shadowColor = 'rgba(0,0,0,0.35)'; y.shadowBlur = 18; y.drawImage(logo, W - w - 52, 46, w, h); y.restore(); }

  return {
    ultimo: () => ultimo, nuoviStrati: () => nuoviStrati.splice(0).map(q => ({ id: q.id, png: q.cv.toDataURL('image/png') })), sopra: sp,
    guida(tipo, nodo) { const P = R.percorso; if (!P) return nodo;
      if (tipo === 'zone' && P.zona) return M.nodoZona(P.zona) || nodo;
      if (tipo === 'blocchi' && P.blocchi) { const i = quante['blocchi>posti'] || 0; return M.nodoBlocco(P.blocchi[Math.min(i, P.blocchi.length - 1)]) || nodo; }
      return nodo; },
    stato: () => ({ strati: strati.map(s => +s.a.toFixed(2)), chiave }),
    debug: () => { const c = (cv, ch) => { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let i = ch; i < d.length; i += 4) if (d[i] > 128) n++; return n; }; return { m1: c(m1, 0), m2: c(m2, 3), full: c(mFull, 3) }; },
    entra(da, a, volo) {   // ogni volo del giro ha la sua clip (da>a, nell'ordine in cui capita)
      if (a === 'mondo') { quante = {}; cur = V[prima]; t0 = -1; if (!REC) { cur.pause(); cur.currentTime = 0; } chiave = ''; strati = []; return; }
      if (!volo) return; const k = da + '>' + a, lista = R.clip[k]; if (!lista) return;
      const i = quante[k] || 0; quante[k] = i + 1; cur = V[lista[Math.min(i, lista.length - 1)]]; t0 = T.now; chiave = ''; strati = [];
      if (!REC) { cur.currentTime = 0; cur.play().catch(() => 0); }
    },
    async disegna(st, volando) {
      if (REC && cur) await seek(cur, t0 < 0 ? 0.002 : Math.min(cur.duration - 0.03, T.now - t0 + 0.002));
      x.drawImage(cur, 0, 0, W, H);
      const dt = Math.max(0, T.now - tPrima); tPrima = T.now; const L = S.livelli[st.liv], tipo = L.tipo;
      // la scelta: maschera nuova quando cambia cosa è acceso (solo a camera ferma)
      if (!volando && ['zone', 'blocchi', 'posti', 'vip'].includes(tipo)) {
        const ch = [st.liv, st.hover && st.hover.id, st.scelti.map(n => n.id).join(','), st.vip.join(',')].join('|');
        if (ch !== chiave) { chiave = ch; fx.drawImage(cur, 0, 0, W, H); const mk = maschera(st); strati.forEach(s => s.dove = 0); if (mk) { const st0 = { cv: strato(mk), a: 0, dove: 1, id: nStrati++ }; strati.push(st0); nuoviStrati.push(st0); } }
      } else if (strati.length) strati.forEach(s => s.dove = 0);
      const k = 1 - Math.exp(-dt / 0.07); strati = strati.filter(s => { s.a += (s.dove - s.a) * (REC ? k : 0.25); return s.dove > 0 || s.a > 0.01; });
      for (const s of strati) { x.save(); x.globalAlpha = s.a; x.drawImage(s.cv, 0, 0); x.restore(); }
      y.clearRect(0, 0, W, H); if (tipo === 'booked' && st.arrivato === st.liv) disegnaBiglietto(st, T.now - st.tIn); else if (tipo === 'dentro' && st.arrivato === st.liv) disegnaBiglietto(st, T.now - st.tIn, false);   // il biglietto grande al centro appena scegli (normale o VIP)
      if (!ESPORTA) disegnaLogo();
      ultimo = { c: cur.dataset.nome, k: Math.max(0, Math.round((t0 < 0 ? 0 : Math.min(cur.duration - 0.03, T.now - t0)) * 24)), s: strati.filter(q => q.a > 0.004).map(q => [q.id, +q.a.toFixed(3)]) };
    },
  };
}
function rrect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
