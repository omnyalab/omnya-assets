// Motore choose-your · VERSIONE VERA delle torri (?reale=1). Nico 20/11: «non perdere minimamente qualità».
// Niente ricompressione: le clip Kling originali (1080p, ~21 Mbit/s) girano nei <video> del browser così come sono,
// nelle pause c'è la foto 4K col nostro filtro (3840x2160) in un <img>. Fra due clip dello stesso volo si salta il fotogramma doppio
// (la seconda parte da 1/24 s); alla fine dell'ultima clip la foto 4K entra in dissolvenza sopra l'ultimo fotogramma (quasi uguale).
// La luce del piano sulla foto madre è quella del 3D: la fascia accesa resa da sola sopra la torre in nero, alla stessa ripresa
// (la torre della foto combacia col 3D entro 2 px), sommata alla foto (plus-lighter). Il cartellino e il pannello li fa la UI.
// Un volo senza clip (es. «No, choose another floor» dalla vista) passa con una dissolvenza sulla foto di arrivo e la camera 3D salta alla fine.
// Il soggetto dà S.reale = { modulo: 'torre', cartella, foto: { idLivello: 'file' }, clip: { 'daId>aId': ['C1', …] }, anticipo, guida }.
import * as THREE from 'three';

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const liscio = u => u * u * (3 - 2 * u);
const tela = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

export async function creaRealeTorre(S, M, { renderer, scene, camera, T, W, H, ui, REC }) {
  const R = S.reale, base = new URL(R.cartella, location.href).href, F = 1 / 24;
  const box = document.createElement('div'); box.id = 'reale'; box.style.cssText = 'position:fixed;inset:0;overflow:hidden;background:#000;pointer-events:none;isolation:isolate';
  document.body.insertBefore(box, document.getElementById('ui'));
  const css = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;opacity:0;';
  let zz = 1; const sopra = el => { el.style.zIndex = String(++zz); };

  // ---------- foto 4K ----------
  const FOTO = {};
  await Promise.all(Object.entries(R.foto).map(async ([k, f]) => { const im = new Image(); im.src = base + f; await im.decode().catch(() => 0); im.style.cssText = css; box.appendChild(im); FOTO[k] = im; }));
  // ---------- clip originali (scaricate intere in memoria: niente attese a metà volo) ----------
  const QC = new URLSearchParams(location.search).get('clip');   /* ?clip=clip4k: per il video 4K si usano le clip ingrandite in lanczos (solo registrazione) */
  async function blob(n) { if (QC) n = n.replace(/^clip\//, QC + '/'); for (let k = 0; ; k++) { try { const r = await fetch(base + n + '.mp4'); if (!r.ok) throw new Error(r.status); return URL.createObjectURL(await r.blob()); } catch (e) { if (k >= 3) throw e; await new Promise(t => setTimeout(t, 300 * (k + 1))); } } }
  const V = {};
  await Promise.all([...new Set(Object.values(R.clip).flat())].map(async n => { const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = await blob(n);
    await new Promise(ok => { v.onloadeddata = ok; v.load(); }); v.style.cssText = css; v.dataset.nome = n; box.appendChild(v); V[n] = v; }));
  const seek = (v, t) => Math.abs(v.currentTime - t) < 1e-3 ? Promise.resolve() : new Promise(ok => { const f = () => { v.removeEventListener('seeked', f); ok(); }; v.addEventListener('seeked', f); setTimeout(f, 3000); v.currentTime = t; });

  // ---------- dissolvenze a tempo del motore (uguali dal vivo e nei giri registrati a passi) ----------
  const tw = new Map();
  function fade(el, a1, dur) { if (!dur) { tw.delete(el); el.style.opacity = String(a1); return; } tw.set(el, { a0: +el.style.opacity || 0, a1, t0: T.now, dur }); }
  function passaFade() { for (const [el, f] of tw) { const u = clamp((T.now - f.t0) / f.dur); el.style.opacity = String(f.a0 + (f.a1 - f.a0) * liscio(u)); if (u >= 1) tw.delete(el); } }
  let foto = null;
  function fotoIn(k, dur) { const im = FOTO[k]; if (!im) return; sopra(im); if (foto === k && !dur) { im.style.opacity = '1'; return; } im.style.opacity = '0'; fade(im, 1, dur || 0);
    foto = k; const via = Object.entries(FOTO).filter(([kk]) => kk !== k).map(([, x]) => x); tardi(() => via.forEach(x => { if (foto !== k) return; tw.delete(x); x.style.opacity = '0'; }), dur || 0); }
  const tardivi = []; const tardi = (fn, dopo) => tardivi.push({ t: T.now + dopo + 0.02, fn });
  function passaTardi() { for (let i = tardivi.length - 1; i >= 0; i--) if (T.now >= tardivi[i].t) { const f = tardivi[i].fn; tardivi.splice(i, 1); f(); } }

  // ---------- voli: una fila di clip per volo, in ordine ----------
  let seq = null, poi = null, diss = null, senza = false, tieni = null;   /* tieni: ultimo fotogramma di una clip che resta fermo (fermate senza foto, Nico 24/11) */
  const anticipo = id => (R.anticipo && R.anticipo[id] != null ? R.anticipo[id] : (id === 'piano' ? 0 : 0.8));   // la UI compare questo tanto prima della fine (la camera intanto scivola ancora)
  function nuovaSeq(key, aId, salta1) { const lista = R.clip[key].map(n => V[n]).filter(Boolean); if (!lista.length) return null;
    return { lista, i: 0, aId, att: [], t0: T.now, off: lista.map((v, j) => (j || salta1) ? F : 0), avviata: false }; }
  const durata = s => s.lista.reduce((a, v, j) => a + v.duration - s.off[j], 0);
  function restante(s) { if (!s.avviata) return durata(s); let r = 0; for (let j = s.i; j < s.lista.length; j++) { const v = s.lista[j]; r += j === s.i ? Math.max(0, v.duration - (REC ? s.off[j] + (T.now - s.tc) : v.currentTime)) : v.duration - s.off[j]; } return r; }
  function avvia(s) {
    s.avviata = true; s.i = 0; s.tc = T.now; const v = s.lista[0];
    s.lista.forEach((x, j) => { x.pause(); x.currentTime = s.off[j]; });
    sopra(v); v.style.opacity = '1'; tw.delete(v); if (!REC) v.play().catch(() => 0);
    if (tieni && tieni !== v) { const t0 = tieni; tardi(() => { if (t0 !== tieni) { t0.style.opacity = '0'; t0.pause(); } }, 0.05); } tieni = null;
  }
  function avanti(s) {   // la clip dopo è già ferma sul suo primo fotogramma: diventa visibile subito, niente buchi
    const v0 = s.lista[s.i]; s.i++; s.tc = T.now; const v = s.lista[s.i]; sopra(v); v.style.opacity = '1'; if (!REC) v.play().catch(() => 0);
    tardi(() => { v0.style.opacity = '0'; v0.pause(); }, 0.05);
  }
  function chiudi(s) {   // fine del volo: o parte quello in coda, o entra la foto 4K sopra l'ultimo fotogramma
    const v = s.lista[s.lista.length - 1]; s.att.forEach(a => a.fn()); s.att = [];
    if (poi) { seq = poi; poi = null; avvia(seq); tardi(() => { v.style.opacity = '0'; }, 0.05); return; }
    seq = null; if (!FOTO[s.aId]) { tieni = v; v.pause(); return; }   /* fermata senza foto: resta l'ultimo fotogramma vero */
    fotoIn(s.aId, 0.35); tardi(() => { v.style.opacity = '0'; v.pause(); }, 0.4);
  }

  // ---------- luce del piano sulla foto madre, presa dal 3D ----------
  const MW = REC ? W : W / 2, MH = REC ? H : H / 2, rt = new THREE.WebGLRenderTarget(MW, MH), buf = new Uint8Array(MW * MH * 4);
  const nero = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const lut = new Uint8Array(256); for (let i = 0; i < 256; i++) lut[i] = Math.round(255 * Math.pow(i / 255, 1 / 2.2));
  const luci = [tela(MW, MH), tela(MW, MH)]; luci.forEach(c => { c.style.cssText = css + 'mix-blend-mode:plus-lighter;z-index:900000'; box.appendChild(c); });
  const tmp = tela(MW, MH), tmpx = tmp.getContext('2d');
  /* Nico 24/11: modi nuovi di accendere il piano, fatti coi pixel veri della foto (seguono il vetro): ?luce=ambra|accese|riflettore|contorno|riflesso */
  const MODO = new URLSearchParams(location.search).get('luce') || R.stileLuce || 'ambra';
  const ombre = [tela(MW, MH), tela(MW, MH)]; ombre.forEach(c => { c.style.cssText = css + 'z-index:899999'; box.appendChild(c); });
  const picCache = new Map(); function picFoto() { const im = foto && FOTO[foto]; if (!im) return null; if (picCache.has(foto)) return picCache.get(foto); const c = tela(MW, MH), x = c.getContext('2d'); x.drawImage(im, 0, 0, MW, MH); const d = x.getImageData(0, 0, MW, MH).data; picCache.set(foto, d); return d; }
  let qualeLuce = 0, chiave = ''; const cacheLuce = new Map();
  function modoNuovo(c, oC, hv) {
    const x = c.getContext('2d'), ox = oC.getContext('2d'), P = picFoto(), m = new Float32Array(MW * MH);
    let x0 = MW, x1 = 0, y0 = MH, y1 = 0;
    const RT = S.rettangoli;
    if (RT && hv && hv.rett) {   /* 24/11: il rettangolo di vetro misurato sulla foto, esatto per ogni piano (non sborda) */
      const r = hv.rett, sx = MW / RT.foto[0], sy = MH / RT.foto[1], ax = r.x0 * sx, bx = (r.x1 + 1) * sx, ay = r.y0 * sy, by = (r.y1 + 1) * sy;
      for (let yy = Math.floor(ay); yy < Math.ceil(by); yy++) { const fy = Math.min(1, yy + 1 - ay, by - yy); for (let xx = Math.floor(ax); xx < Math.ceil(bx); xx++) { const fx = Math.min(1, xx + 1 - ax, bx - xx); m[yy * MW + xx] = Math.max(0, fx) * Math.max(0, fy); } }
      x0 = Math.floor(ax); x1 = Math.ceil(bx); y0 = Math.floor(ay); y1 = Math.ceil(by);
    } else {
    for (let yy = 0; yy < MH; yy++) { const ry = (MH - 1 - yy) * MW * 4; for (let xx = 0; xx < MW; xx++) { const q = ry + xx * 4, L = Math.max(buf[q], buf[q + 1], buf[q + 2]) / 255, v = Math.max(0, Math.min(1, (L - 0.03) / 0.09)); m[yy * MW + xx] = v * v * (3 - 2 * v); if (v > 0.5) { x0 = Math.min(x0, xx); x1 = Math.max(x1, xx); y0 = Math.min(y0, yy); y1 = Math.max(y1, yy); } } }
    { const e = Math.max(1, Math.round(MW / 300)), r2 = new Float32Array(MW);   /* il 3D è un filo più largo della foto: si stringe la maschera ai lati, così la luce sta dentro il vetro */
      for (let yy = 0; yy < MH; yy++) { const o0 = yy * MW; for (let xx = 0; xx < MW; xx++) { let mn = 1; for (let k = -e; k <= e; k++) { const xk = xx + k; mn = Math.min(mn, xk < 0 || xk >= MW ? 0 : m[o0 + xk]); } r2[xx] = mn; } m.set(r2, o0); }
      x0 += e; x1 -= e; }
    }
    const id = tmpx.createImageData(MW, MH), d = id.data, od = ox.createImageData(MW, MH), o = od.data, cx = (x0 + x1) / 2, wS = (x1 - x0) * 0.09, k = R.luceNuova ?? 1;
    for (let i = 0, n = MW * MH; i < n; i++) { const q = i * 4, mm = m[i], xx = i % MW, yy = (i / MW) | 0, pr = P ? P[q] : 200, pg = P ? P[q + 1] : 170, pb = P ? P[q + 2] : 130;
      let r = 0, g = 0, b = 0, ombra = 0;
      const MS = MODO.split(/[+ ,]/), acc = MS.includes('accese'), cont = MS.includes('contorno'), rifl = MS.includes('riflettore'), rif = MS.includes('riflesso');
      if (acc) { r = (255 - pr) * 0.55 * mm + 12 * mm; g = (255 - pg) * 0.48 * mm + 6 * mm; b = (255 - pb) * 0.34 * mm; }   /* luci accese «a schermo»: schiarisce il buio dentro, non brucia il vetro già chiaro */
      else { const boost = rifl ? 0.75 : rif ? 0.5 : cont ? 0.3 : 0; r = pr * boost * mm + (rifl ? 14 : 0) * mm; g = pg * boost * mm + (rifl ? 10 : 0) * mm; b = pb * boost * mm * 0.85; }
      if (cont) { const e = xx > 0 && yy > 0 && xx < MW - 1 && yy < MH - 1 ? Math.abs(m[i + 1] - m[i - 1]) + Math.abs(m[i + MW] - m[i - MW]) : 0, l = Math.min(1, e * 1.6); r += 255 * l; g += 246 * l; b += 228 * l; }   /* filo di luce sul bordo */
      if (rif) { const t = (xx - cx) + (yy - (y0 + y1) / 2) * 1.8, s2 = Math.exp(-(t * t) / (2 * wS * wS)); r += 120 * s2 * mm; g += 124 * s2 * mm; b += 132 * s2 * mm; }
      ombra = rifl ? 0.46 * (1 - mm) : cont ? 0.12 * (1 - mm) : 0;   /* Nico 24/11: col contorno lo scuro intorno c'è ma leggero */
      d[q] = Math.min(255, r * k); d[q + 1] = Math.min(255, g * k); d[q + 2] = Math.min(255, b * k); d[q + 3] = 255; o[q] = o[q + 1] = o[q + 2] = 0; o[q + 3] = Math.round(255 * ombra); }
    tmpx.putImageData(id, 0, 0); x.clearRect(0, 0, MW, MH); x.fillStyle = '#000'; x.fillRect(0, 0, MW, MH); x.filter = `blur(${MW / 1920}px)`; x.drawImage(tmp, 0, 0); x.filter = 'none';
    ox.clearRect(0, 0, MW, MH); ox.putImageData(od, 0, 0);
  }
  function rendiLuce(c, oC, hv) {
    const fas = M.info.fascia, x = c.getContext('2d'); x.clearRect(0, 0, MW, MH); if (!fas || !fas.children.length) return;
    const fog = scene.fog, tm = renderer.toneMapping, auto = renderer.autoClear, ombre = renderer.shadowMap.autoUpdate, cc = renderer.getClearColor(new THREE.Color()), ca = renderer.getClearAlpha();
    scene.fog = null; renderer.toneMapping = THREE.NoToneMapping; renderer.shadowMap.autoUpdate = false;
    renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 1); renderer.clear();
    const via = []; scene.traverse(o => { const m = o.material; if (o.visible && m && !Array.isArray(m) && (m.visible === false || m.colorWrite === false)) { via.push(o); o.visible = false; } });
    fas.visible = false; scene.overrideMaterial = nero; renderer.render(scene, camera); scene.overrideMaterial = null; fas.visible = true; for (const o of via) o.visible = true;
    renderer.autoClear = false; renderer.render(fas, camera);   // solo la fascia, coi suoi materiali, davanti alla torre nera (stessa profondità)
    renderer.readRenderTargetPixels(rt, 0, 0, MW, MH, buf); renderer.setRenderTarget(null); renderer.autoClear = auto; renderer.shadowMap.autoUpdate = ombre; renderer.toneMapping = tm; renderer.setClearColor(cc, ca); scene.fog = fog;
    /* luce ambra come SAMAR: dal 3D prendo solo quanto è forte (non il colore, che sul vetro chiaro della foto diventerebbe bianco), il cuore schiarisce appena;
       poi una sfocatura di 2 px toglie i puntini dei montanti che nel passaggio nero coprono la fascia */
    if (MODO !== 'ambra') { modoNuovo(c, oC, hv); return; }
    const id = tmpx.createImageData(MW, MH), d = id.data, k = R.luce ?? 1, AM = R.ambra || [255, 190, 92], CU = [255, 232, 196];
    for (let yy = 0; yy < MH; yy++) { const ry = (MH - 1 - yy) * MW * 4, wy = yy * MW * 4; for (let xx = 0; xx < MW * 4; xx += 4) {
      const L = Math.max(buf[ry + xx], buf[ry + xx + 1], buf[ry + xx + 2]) / 255; if (L < 0.004) { d[wy + xx] = d[wy + xx + 1] = d[wy + xx + 2] = 0; d[wy + xx + 3] = 255; continue; }
      const a = Math.pow(Math.min(1, L * 1.15), 0.85) * k, w = Math.max(0, Math.min(1, (L - 0.75) / 0.25)) * 0.45;
      d[wy + xx] = (AM[0] + (CU[0] - AM[0]) * w) * a; d[wy + xx + 1] = (AM[1] + (CU[1] - AM[1]) * w) * a; d[wy + xx + 2] = (AM[2] + (CU[2] - AM[2]) * w) * a; d[wy + xx + 3] = 255; } }
    tmpx.putImageData(id, 0, 0); x.fillStyle = '#000'; x.fillRect(0, 0, MW, MH); x.filter = `blur(${MW / 960}px)`; x.drawImage(tmp, 0, 0); x.filter = 'none';
  }

  // ---------- «View the house» (Nico 21/11): panorama a 180° della casa, ti guardi intorno col mouse ----------
  // Il panorama è cilindrico (21:9, ~187°), alto come la foto d'arrivo (fov 70): al centro combacia con la foto e con la clip dopo.
  const PANO = {};
  if (R.pano) await Promise.all(Object.entries(R.pano).map(async ([k, f]) => { const im = new Image(); im.src = base + f + '.jpg'; await im.decode().catch(() => 0);
    const meta = await fetch(base + f + '.json').then(r => r.json()).catch(() => ({ fov: 70, pitch: 0, gradi: 187.2 })); PANO[k] = { im, meta, tex: null }; }));
  const DPR = REC ? 2 : Math.min(2, Math.max(1, window.devicePixelRatio || 1)), pc = document.createElement('canvas'); pc.style.cssText = css + 'z-index:800000'; box.appendChild(pc);
  let pr = null, pmat = null, pscene = null, pcam = null;
  function panoPronto() { if (pr) return; pr = new THREE.WebGLRenderer({ canvas: pc, antialias: false, alpha: false, preserveDrawingBuffer: true }); pr.setPixelRatio(1); pr.setSize(Math.round(W * DPR), Math.round(H * DPR), false);
    pmat = new THREE.ShaderMaterial({ uniforms: { tex: { value: null }, yaw: { value: 0 }, pitch: { value: 0 }, tanV: { value: 0.7 }, asp: { value: W / H }, k: { value: 1.4 }, Hc: { value: 3.27 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
      fragmentShader: `uniform sampler2D tex; uniform float yaw, pitch, tanV, asp, k, Hc; varying vec2 vUv;
        void main(){ vec2 s = vUv * 2. - 1.; vec3 d = normalize(vec3(s.x * tanV * asp, s.y * tanV, 1.));
          float cp = cos(pitch), sp = sin(pitch); d = vec3(d.x, d.y * cp + d.z * sp, -d.y * sp + d.z * cp);
          float th = atan(d.x, d.z) + yaw, y = d.y / length(d.xz);
          gl_FragColor = vec4(texture2D(tex, vec2(0.5 + th / Hc, 0.5 + y / k)).rgb, 1.); }` });
    pscene = new THREE.Scene(); pscene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), pmat)); pcam = new THREE.Camera(); }
  function panoTex(P) { if (!P.tex) { const t = new THREE.Texture(P.im); t.colorSpace = THREE.NoColorSpace; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = pr.capabilities.getMaxAnisotropy(); t.needsUpdate = true; P.tex = t; } return P.tex; }
  let casa = null, tCasa = T.now;   // { key, yaw, uscita, chiude }
  function disegnaPano() { const P = PANO[casa.key], m = P.meta, v = THREE.MathUtils.degToRad((m.fov || 70) / 2), kk = 2 * Math.tan(v), Hc = THREE.MathUtils.degToRad(m.gradi || 187.2);
    Object.assign(pmat.uniforms.tex, { value: panoTex(P) }); pmat.uniforms.yaw.value = casa.yaw; pmat.uniforms.pitch.value = m.pitch || 0; pmat.uniforms.tanV.value = Math.tan(v); pmat.uniforms.k.value = kk; pmat.uniforms.Hc.value = Hc; pr.render(pscene, pcam); }
  const yawMax = P => { const v = THREE.MathUtils.degToRad((P.meta.fov || 70) / 2), hv = 2 * Math.atan(Math.tan(v) * W / H); return Math.max(0, (THREE.MathUtils.degToRad(P.meta.gradi || 187.2) - hv) / 2); };
  if (Object.keys(PANO).length) { panoPronto(); for (const P of Object.values(PANO)) pr.initTexture(panoTex(P)); }   /* texture già sulla scheda video all'avvio: al clic su «View the house» niente scatto (21/11) */
  function chiudiCasa(dur = 0.25) { if (!casa || casa.chiude) return; casa.chiude = true; fade(pc, 0, dur); tardi(() => { casa = null; }, dur); }

  // ---------- sfondo piccolo per le carte di vetro della UI (sfocato, basta poco) ----------
  const sf = tela(640, 360), sfx = sf.getContext('2d');
  function aggiornaSfondo() { const vis = casa ? pc : seq && seq.avviata ? seq.lista[seq.i] : tieni || (foto ? FOTO[foto] : null); if (vis) try { sfx.drawImage(vis, 0, 0, 640, 360); } catch (e) { } }

  const idLiv = st => S.livelli[st.liv].id;
  return {
    sfondo: sf, foto: FOTO, clip: V,
    // versione vera: le clip sono quelle della Sky Majlis, quindi un piano qualsiasi porta nella Sky Majlis (come la tribuna dello stadio)
    guida(tipo, nodo) { if (R.guida === 'stanza' && tipo === 'piani' && nodo && !nodo.stanza && !nodo.attico && M.nodoStanza) return M.nodoStanza(); return nodo; },
    entra(daTipo, aTipo, volo, ids = {}) {
      const a = ids.a, key = (ids.da || '') + '>' + a; senza = false;
      if (!volo || !ids.da) { if (!seq) fotoIn(a, 0); return; }
      if (R.clip[key]) { const s = nuovaSeq(key, a, !!seq); if (casa) { poi = s; casa.uscita = true; return; } if (seq) poi = s; else { seq = s; avvia(s); } return; }   /* dal panorama: prima torni dritto al centro, poi parte la clip */
      if (casa) chiudiCasa(0.3);
      senza = true; poi = null; const durD = R.dissolvenza ?? 1.1;   // volo senza clip: dissolvenza lenta sulla foto d'arrivo
      if (seq) { const s = seq; seq = null; s.lista.forEach(v => { fade(v, 0, durD); tardi(() => v.pause(), durD); }); }
      fotoIn(a, durD); diss = { fine: T.now + durD, att: [] };
    },
    salta() { const s = senza; senza = false; return s; },
    quandoArriva(liv, fn) { const id = S.livelli[liv].id, s = poi || seq;
      if (s && s.aId === id) { s.att.push({ lead: anticipo(id), fn }); return; }
      if (diss && T.now < diss.fine) { diss.att.push(fn); return; } fn(); },
    casa(on, id) { if (!on || !PANO[id]) return; panoPronto(); casa = { key: id, yaw: 0 }; tCasa = T.now; disegnaPano(); pc.style.opacity = '0'; fade(pc, 1, 0.35); },
    reset(id) {   /* da capo (R, giro automatico): via ogni dissolvenza rimasta, la foto d'arrivo subito piena (21/11: prima il giro partiva dal nero) */
      for (const v of Object.values(V)) { v.pause(); v.style.opacity = '0'; } tw.clear(); for (const im of Object.values(FOTO)) im.style.opacity = '0';
      seq = poi = diss = null; tieni = null; senza = false; tardivi.length = 0; foto = null; fotoIn(id, 0); chiave = ''; casa = null; pc.style.opacity = '0'; },
    mostra(id) { this.reset(id); },
    async disegna(st, volando) {
      passaTardi();
      if (seq) {
        if (!seq.avviata) avvia(seq);
        if (REC) { let v = seq.lista[seq.i], t = seq.off[seq.i] + (T.now - seq.tc); while (t >= v.duration - 0.5 * F && seq.i < seq.lista.length - 1) { avanti(seq); v = seq.lista[seq.i]; t = seq.off[seq.i] + (T.now - seq.tc); }
          await seek(v, Math.min(v.duration - 0.02, t)); if (t >= v.duration - 0.5 * F && seq.i === seq.lista.length - 1) chiudi(seq); }
        else { const v = seq.lista[seq.i]; if (v.ended || v.currentTime >= v.duration - 0.004) { if (seq.i < seq.lista.length - 1) avanti(seq); else chiudi(seq); } }
        if (seq) { const r = restante(seq); seq.att = seq.att.filter(a => { if (r <= a.lead) { a.fn(); return false; } return true; }); }
      }
      if (diss && T.now >= diss.fine) { const f = diss.att; diss = null; f.forEach(fn => fn()); }
      if (casa) { const P = PANO[casa.key], dt = Math.max(0, Math.min(0.1, T.now - tCasa)), ym = yawMax(P), obj = casa.uscita ? 0 : ((st.mx ?? 0.5) - 0.5) * 2 * ym, y0 = casa.yaw;
        casa.yaw += (obj - casa.yaw) * (1 - Math.exp(-dt / (casa.uscita ? 0.16 : 0.3))); if (Math.abs(casa.yaw - y0) > 1e-5) disegnaPano();
        if (casa.uscita && Math.abs(casa.yaw) < 0.004 && !casa.chiude) { casa.yaw = 0; disegnaPano(); chiudiCasa(0.25); } }
      tCasa = T.now;
      if (!seq && poi && !casa) { seq = poi; poi = null; avvia(seq); }   /* la clip in attesa del panorama parte appena torna la foto */
      passaFade();
      // luce del piano: solo sulla foto madre, a camera ferma, quando cambia il piano sotto il mouse
      const fermo = st.arrivato === st.liv && !seq && !diss && foto === idLiv(st), hv = st.hover || st.ultimoHover, suPiano = (idLiv(st) === 'piano' || S.livelli[st.liv].tipo === 'piani') && fermo && hv;   /* torre-golf: il livello si chiama «piani» */
      const ch = suPiano ? st.liv + '|' + hv.id + '|' + (M.info.fascia ? M.info.fascia.children.map(f => f.position.y.toFixed(2) + (f.visible ? 'v' : '')).join(',') : '') : '';
      if (ch !== chiave) { const daPiano = !!chiave; chiave = ch; const vecchia = luci[qualeLuce], oV = ombre[qualeLuce]; fade(vecchia, 0, 0.12); if (ch && daPiano) { fade(oV, 0, 0); } else fade(oV, 0, 0.12);   /* Nico 24/11: lo scuro intorno non lampeggia da un piano all'altro: si scambia secco, sfuma solo quando compare o sparisce */
        if (ch) { qualeLuce = 1 - qualeLuce; const c = luci[qualeLuce], k2 = ch + '|' + camera.position.toArray().map(v => v.toFixed(1)).join(',') + '|' + (M.info.fascia ? M.info.fascia.children.map(f => f.position.y.toFixed(2) + 'x' + f.scale.y.toFixed(2)).join(',') : ''),   /* se la fascia si sposta dopo, si ricalcola */ x = c.getContext('2d');
          /* 21/11: ogni piano si calcola una volta sola e poi resta in memoria (al massimo 30): passando col mouse non c'è nessuno scatto */
          const oC = ombre[qualeLuce], ox = oC.getContext('2d');
          if (cacheLuce.has(k2)) { const [kl, ko] = cacheLuce.get(k2); x.clearRect(0, 0, MW, MH); x.drawImage(kl, 0, 0); ox.clearRect(0, 0, MW, MH); ox.drawImage(ko, 0, 0); }
          else { ox.clearRect(0, 0, MW, MH); rendiLuce(c, oC, hv); const k = tela(MW, MH), ko = tela(MW, MH); k.getContext('2d').drawImage(c, 0, 0); ko.getContext('2d').drawImage(oC, 0, 0); cacheLuce.set(k2, [k, ko]); if (cacheLuce.size > 30) cacheLuce.delete(cacheLuce.keys().next().value); }
          c.style.opacity = '0'; fade(c, 1, 0.12); if (daPiano) fade(oC, 1, 0); else { oC.style.opacity = '0'; fade(oC, 1, 0.12); } } }
      aggiornaSfondo();
    },
    stato: () => ({ casa: casa ? { k: casa.key, yaw: +casa.yaw.toFixed(3), uscita: !!casa.uscita } : null, foto, seq: seq ? { clip: seq.lista[seq.i].dataset.nome, t: +seq.lista[seq.i].currentTime.toFixed(2), resta: +restante(seq).toFixed(2) } : null, poi: !!poi, diss: !!diss, luce: chiave }),
  };
}
