// MOTORE CHOOSE-YOUR · Omnya Lab
// Un solo motore per tutti i reel «choose your …»: Mondo → Edificio/settore → Piano/fila → Unità/posto → dentro.
// Il soggetto (soggetti/*.js) dà: modello (da un kit), livelli, nomi, prezzi, disponibilità, riprese, giri automatici A/B/C.
// Il motore fa: luce e cielo (look), camera che vola dritta, mouse che accende e sceglie, biglietti, cursore finto, registrazione a passi.
import * as THREE from 'three';
import { EffectComposer } from '../vendor/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/addons/postprocessing/RenderPass.js';
import { GTAOPass } from '../vendor/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from '../vendor/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../vendor/addons/postprocessing/OutputPass.js';
import { UI } from './ui.js';
import { creaReale } from './reale.js';
import { creaRealeTorre } from './reale-torre.js';   /* torri: clip originali e foto 4K (S.reale.modulo = 'torre') */
import { clamp, lerp } from './kit/forme.js';

const Q = new URLSearchParams(location.search.slice(1) + "&" + (window.__Q0 || ""));   /* sito 25/11: valori di default della pagina (reale=1, ao=0), quelli dell indirizzo vincono */
export const W = 1920, H = 1080;
const ease = t => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };   // un solo movimento morbido
const easeDolce = t => { t = clamp(t); return t * t * t * (t * (t * 6 - 15) + 10); };   // partenza e arrivo più lenti (smootherstep)

export async function avvia(S) {
  // ---------------- render 16:9 che copre lo schermo (anche il 21:9 di Nico: taglia sopra e sotto) ----------------
  const qual = +Q.get('q') || Math.min(2, Math.max(1, (screen.width * devicePixelRatio) / W)), RW = +Q.get('w') || Math.round(W * qual), RH = +Q.get('h') || Math.round(H * qual);
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(RW, RH, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const cv3 = renderer.domElement; cv3.id = 'c3'; document.body.appendChild(cv3);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, W / H, 0.3, 16000);

  // ---------------- soggetto ----------------
  const M = S.costruisci(THREE);              // il kit costruisce il modello e ritorna l'adattatore dei livelli
  scene.add(M.gruppo);

  // ---------------- cielo, sole, luci ----------------
  const sky = skyDome(); scene.add(sky);
  const sun = new THREE.DirectionalLight(0xffffff, 3); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
  const sc = sun.shadow.camera, ext = M.ombra || 260; sc.left = -ext; sc.right = ext; sc.top = ext; sc.bottom = -ext; sc.near = 10; sc.far = 3000; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.6;
  scene.add(sun, sun.target); const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6); scene.add(hemi);
  const fill = new THREE.PointLight(0xfff1dc, 0, 600, 1.2); fill.position.set(...(M.fariPos || [0, 46, 0])); scene.add(fill);   // fari del catino la sera
  const pmrem = new THREE.PMREMGenerator(renderer);
  const lucidi = []; scene.traverse(o => { const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []; for (const m of ms) if (m.userData.notte || m.userData.sera) lucidi.push([o, m]); });

  let LOOK = null;
  function look(nome) {
    const L = S.looks[nome] || S.looks[Object.keys(S.looks)[0]]; LOOK = { nome, ...L };
    const el = THREE.MathUtils.degToRad(L.sole.alt), az = THREE.MathUtils.degToRad(L.sole.az), dir = new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
    sky.material.uniforms.top.value.set(L.cielo[0]); sky.material.uniforms.mid.value.set(L.cielo[1]); sky.material.uniforms.hor.value.set(L.cielo[2]);
    sky.material.uniforms.sunDir.value.copy(dir); sky.material.uniforms.sunCol.value.set(L.sole.alone); sky.material.uniforms.sunK.value = L.sole.aloneK ?? 1;
    sun.position.copy(dir).multiplyScalar(1400); sun.color.set(L.sole.colore); sun.intensity = L.sole.forza * (el > 0 ? 1 : 0);
    hemi.color.set(L.amb.cielo); hemi.groundColor.set(L.amb.terra); hemi.intensity = L.amb.forza;
    fill.intensity = L.fari || 0;
    scene.fog = new THREE.FogExp2(new THREE.Color(L.nebbia.colore), L.nebbia.densita); sky.material.uniforms.fogC.value.set(L.nebbia.colore); sky.material.uniforms.fogK.value = L.nebbia.orizzonte ?? 0; sky.material.uniforms.horH.value = L.orizzonte ?? 0.18;
    renderer.toneMappingExposure = L.esposizione;
    for (const [o, m] of lucidi) { if (m.userData.notte) m.emissiveIntensity = Math.max(m.userData.minimo || 0, m.userData.notte * (L.luci || 0)); if (m.userData.sera) o.visible = (L.luci || 0) > 0.05; }
    // riflessi dal cielo
    const envScene = new THREE.Scene(), d2 = skyDome(); d2.material.uniforms.top.value.copy(sky.material.uniforms.top.value); d2.material.uniforms.mid.value.copy(sky.material.uniforms.mid.value);
    d2.material.uniforms.hor.value.copy(sky.material.uniforms.hor.value); d2.material.uniforms.sunDir.value.copy(dir); d2.material.uniforms.sunCol.value.set(L.sole.alone); d2.material.uniforms.sunK.value = L.envSole ?? 0.4; /* riflessi del sole sul vetro: le torri li vogliono più larghi */ d2.material.fog = false; envScene.add(d2);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(9000, 16), new THREE.MeshBasicMaterial({ color: L.amb.terra })); ground.rotation.x = -Math.PI / 2; ground.position.y = -50; envScene.add(ground);
    if (scene.environment) scene.environment.dispose(); scene.environment = pmrem.fromScene(envScene, 0.02).texture; scene.environmentIntensity = L.amb.riflessi ?? 1;
    if (bloom) { bloom.strength = L.bloom?.[0] ?? 0.15; bloom.radius = L.bloom?.[1] ?? 0.4; bloom.threshold = L.bloom?.[2] ?? 0.92; }
  }

  // ---------------- post: occlusione morbida, bagliore, colore ----------------
  const rt = new THREE.WebGLRenderTarget(RW, RH, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt); composer.setSize(RW, RH);
  composer.addPass(new RenderPass(scene, camera));
  let gtao = null; if (Q.get('ao') !== '0') { gtao = new GTAOPass(scene, camera, RW, RH); gtao.blendIntensity = 0.75; gtao.updateGtaoMaterial({ radius: 1.2, distanceExponent: 1.5, thickness: 2, scale: 1 }); composer.addPass(gtao); }
  const bloom = new UnrealBloomPass(new THREE.Vector2(RW / 2, RH / 2), 0.15, 0.4, 0.92); composer.addPass(bloom);
  composer.addPass(new OutputPass());
  look(Q.get('look') || S.lookIniziale);

  // ---------------- camera: riprese e voli dritti ----------------
  const cam = { pos: new THREE.Vector3(), tgt: new THREE.Vector3(), fov: 40 }, fly = { on: false };
  function setCam(s) { cam.pos.set(...s.pos); cam.tgt.set(...s.tgt); cam.fov = s.fov || 40; cam.shift = s.shift || 0; applyCam(); }
  function applyCam() {
    camera.position.copy(cam.pos); camera.up.set(0, 1, 0); camera.lookAt(cam.tgt); camera.fov = cam.fov;
    sky.position.copy(cam.pos);   // il cielo segue la camera: l'orizzonte sta sempre all'altezza degli occhi
    // decentramento (come l'obiettivo basculante dei fotografi di architettura): verticali dritte, torre intera nel quadro
    if (Math.abs(cam.shift || 0) > 1e-4) camera.setViewOffset(W, H, 0, -cam.shift * H, W, H); else camera.clearViewOffset();
    const h = Math.max(1, cam.pos.y); camera.near = clamp(h * 0.004, 0.08, 4); camera.far = 16000; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  }
  /* una ripresa ferma da un tratto (21/11: R o un giro nuovo da dentro una casa davano errore perché la ripresa era un percorso) */
  const fermo = sh => { if (!sh) return sh; let f = sh.percorso ? sh.percorso[sh.percorso.length - 1] : sh; while (f && f.poi) f = f.poi; return f; };
  // vola da qui alla ripresa s in dur secondi: posizione su Catmull-Rom centripeta (al massimo un punto di passaggio), sguardo dritto
  function vola(s, dur = 2.4, { via = null, fine = null, gira = false } = {}) {
    if (s.percorso) { fly.P = percorso(s); fly.t0 = T.now; fly.on = true; fly.libero = false; fly.fine = fine; fly.s = s; fly.curve = null; fly.gira = false; return; }
    fly.P = null; fly.libero = false; fly.vel = null;
    const A = cam.pos.clone(), B = new THREE.Vector3(...s.pos), pts = via ? [A, new THREE.Vector3(...via), B] : [A, B];
    fly.curve = pts.length > 2 ? new THREE.CatmullRomCurve3(pts, false, 'centripetal') : null; fly.A = A; fly.B = B;
    fly.tA = cam.tgt.clone(); fly.tB = new THREE.Vector3(...s.tgt); fly.fA = cam.fov; fly.fB = s.fov || cam.fov; fly.sA = cam.shift || 0; fly.sB = s.shift || 0;
    fly.t0 = T.now; fly.dur = dur; fly.on = true; fly.fine = fine; fly.s = s; fly.gira = !!gira;
    if (gira) { const ang = (P, T2) => { const d = T2.clone().sub(P); return [Math.atan2(d.x, d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)), d.length()]; };
      fly.aA = ang(A, fly.tA); fly.aB = ang(B, fly.tB); let dy = fly.aB[0] - fly.aA[0]; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI; if (typeof gira === 'number' && Math.abs(Math.abs(dy) - Math.PI) < 0.3) dy = Math.abs(dy) * Math.sign(gira); fly.dYaw = dy; }
  }
  /* percorso (torri, 20/11): la camera passa da tutte le chiavi { pos, tgt, fov, shift, t } senza fermarsi (Hermite sui tempi, tangenti dai vicini, ferma solo ai capi);
     lo sguardo va in yaw/pitch, così le girate non passano mai sotto i piedi. arrivo = quando compaiono titoli e bottoni: dopo la camera continua a scivolare piano.
     Se si clicca mentre scivola, il percorso dopo parte con la stessa velocità: niente strappi. */
  function percorso(s) {
    const K = [{ pos: cam.pos.toArray(), tgt: cam.tgt.toArray(), fov: cam.fov, shift: cam.shift || 0, t: 0 }, ...s.percorso], ts = K.map(k => k.t), ch = []; let yp = null;
    for (const k of K) { const d = [k.tgt[0] - k.pos[0], k.tgt[1] - k.pos[1], k.tgt[2] - k.pos[2]]; let yaw = Math.atan2(d[0], d[2]);
      if (k.yaw != null) yaw = k.yaw;
      if (yp != null) { while (yaw - yp > Math.PI) yaw -= 2 * Math.PI; while (yaw - yp < -Math.PI) yaw += 2 * Math.PI; } yp = yaw;
      ch.push([k.pos[0], k.pos[1], k.pos[2], yaw, Math.atan2(d[1], Math.hypot(d[0], d[2])), Math.max(1, Math.hypot(...d)), k.fov ?? cam.fov, k.shift ?? 0]); }
    /* tangenti monotone (niente camera che supera la chiave e torna indietro): media pesata delle pendenze, zero se cambiano verso, al massimo 3 volte la pendenza più piccola */
    const n = ch.length, lim = (m0, a, b) => { if (a * b <= 0) return 0; const k = 3 * Math.min(Math.abs(a), Math.abs(b)); return Math.max(-k, Math.min(k, m0)); };
    const m = ch.map((c, i) => c.map((_, j) => { if (i === 0 || i === n - 1) return 0; const a = (ch[i][j] - ch[i - 1][j]) / (ts[i] - ts[i - 1]), b = (ch[i + 1][j] - ch[i][j]) / (ts[i + 1] - ts[i]); return lim((a * (ts[i + 1] - ts[i]) + b * (ts[i] - ts[i - 1])) / (ts[i + 1] - ts[i - 1]), a, b); }));
    if (fly.on && fly.libero && fly.vel && n > 1) m[0] = fly.vel.slice(0, 8).map((v, j) => { const a = (ch[1][j] - ch[0][j]) / (ts[1] - ts[0]); return lim(v, a, a); });
    return { ch, ts, m, dur: ts[n - 1], arrivo: s.arrivo ?? ts[n - 1] };
  }
  function valutaP(P, t) {
    const { ch, ts, m } = P; let i = 0; while (i < ts.length - 2 && t > ts[i + 1]) i++;
    const h = ts[i + 1] - ts[i], u = clamp((t - ts[i]) / h), u2 = u * u, u3 = u2 * u, h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
    return ch[i].map((p0, j) => h00 * p0 + h10 * h * m[i][j] + h01 * ch[i + 1][j] + h11 * h * m[i + 1][j]);
  }
  function stepFly() {
    if (fly.on && fly.P) { const P = fly.P, t = Math.min(T.now - fly.t0, P.dur), v = valutaP(P, t), v2 = valutaP(P, Math.min(t + 0.02, P.dur));
      cam.pos.set(v[0], v[1], v[2]); const yaw = v[3], pit = v[4], dist = v[5];
      cam.tgt.set(v[0] + Math.sin(yaw) * Math.cos(pit) * dist, v[1] + Math.sin(pit) * dist, v[2] + Math.cos(yaw) * Math.cos(pit) * dist); cam.fov = v[6]; cam.shift = v[7];
      fly.vel = t + 0.02 <= P.dur ? v.map((q, j) => (v2[j] - q) / 0.02) : null;
      if (M.dopoCamera) M.dopoCamera(cam, t / P.dur); applyCam();
      if (!fly.libero && t >= P.arrivo) { fly.libero = true; const f = fly.fine; fly.fine = null; f && f(); }
      if (t >= P.dur) { fly.on = false; fly.libero = false; fly.vel = null; fly.P = null; const f = fly.fine; fly.fine = null; f && f(); }
      return; }
    if (!fly.on) return; const u = (fly.s && fly.s.dolce ? easeDolce : ease)((T.now - fly.t0) / fly.dur);
    if (fly.curve) cam.pos.copy(fly.curve.getPoint(u)); else cam.pos.lerpVectors(fly.A, fly.B, u);
    if (fly.gira) { const yaw = fly.aA[0] + fly.dYaw * u, pit = lerp(fly.aA[1], fly.aB[1], u), dist = lerp(fly.aA[2], fly.aB[2], u);
      cam.tgt.set(cam.pos.x + Math.sin(yaw) * Math.cos(pit) * dist, cam.pos.y + Math.sin(pit) * dist, cam.pos.z + Math.cos(yaw) * Math.cos(pit) * dist); }
    else cam.tgt.lerpVectors(fly.tA, fly.tB, u);
    cam.fov = lerp(fly.fA, fly.fB, u); cam.shift = lerp(fly.sA, fly.sB, u);
    if (M.dopoCamera) M.dopoCamera(cam, u);
    applyCam(); if (u >= 1) { fly.on = false; const f = fly.fine; fly.fine = null; f && f(); }
  }

  // ---------------- tempo (vero, o a passi per registrare) ----------------
  const REC = Q.get('rec') === '1', T = { now: 0, last: performance.now() / 1000 };
  function tick(dt) { T.now += dt; }

  // ---------------- livelli e scelte ----------------
  let RE = null;   // versione vera (?reale=1): clip Kling e foto ferme al posto del 3D
  const st = { liv: 0, sel: [], hover: null, scelti: [], vip: [], upgrade: false, tIn: 0 };   // sel[k] = nodo scelto al livello k
  const ui = new UI(S, M, { W, H, camera, cam, T });
  function proietta(v) { const p = v.clone().project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H, p.z < 1]; }
  ui.proietta = proietta;

  function entra(liv, nodo) {   // va al livello liv; nodo = cosa hai scelto al livello prima
    st.livPrima = st.liv; st.tEntra = T.now; st.casa = false; st.casaBase = null; st.yawCasa = 0; st.hover = null; if (liv > 0) st.sel[liv - 1] = nodo; st.sel.length = liv; st.liv = liv; st.tIn = T.now; const tp = S.livelli[liv].tipo;
    if (['mondo', 'zone', 'blocchi', 'posti'].includes(tp)) { st.scelti = []; st.vip = []; } st.ultimoHover = null; if (tp === 'vip') st.vip = []; if (tp === 'mondo') st.visti = 0; if (tp === 'dentro') st.visti = (st.visti || 0) + 1;
    st.pend = null;
    M.accendi(st);
    const L = S.livelli[liv], shot = M.ripresa(liv, nodo, st);
    if (tp === 'mondo' && S.intro) { if (RE) RE.entra(st.tipoPrima || 'mondo', 'mondo', false); st.tipoPrima = 'mondo'; st.idPrima = L.id; fly.on = false; fly.P = null; setCam(fermo(shot)); introParti(); return; }   /* inizio a strisce: da fuori si vola sopra lo stadio, poi la card */
    st.arrivato = -1; const arriva0 = () => { st.tIn = T.now; st.arrivato = liv; ui.arrivo(liv); }, arriva = () => (RE && RE.quandoArriva ? RE.quandoArriva(liv, arriva0) : arriva0());   /* versione vera delle torri: la UI arriva quando finisce la clip */
    if (shot && Q.get('etic')) { const da = st.tipoPrima || 'mondo', a = S.livelli[liv].tipo, nomi = { 'mondo>zone': "da fuori dritti nell'oculo", 'zone>blocchi': 'verso la tribuna', 'blocchi>posti': 'sul blocco', 'posti>dentro': 'entri nel posto e ti giri sul campo',
      'dentro>blocchi': 'Not satisfied: torni alla tribuna', 'dentro>vip': 'verso il box VIP', 'vip>dentro': 'ti siedi in poltrona e ti giri', 'dentro>booked': 'su sopra lo stadio · Booked', 'booked>mondo': 'da capo' };
      st.clipN = (st.clipN || 0) + 1; st.clipT = `C${st.clipN} · ${nomi[da + '>' + a] || a} · ${((shot.dur || L.volo || 2.4) + (shot.poi ? shot.poi.dur || 1.6 : 0)).toFixed(0)} s`; }
    if (RE) RE.entra(st.tipoPrima || 'mondo', S.livelli[liv].tipo, !!shot, { da: st.idPrima ?? null, a: S.livelli[liv].id });
    st.tipoPrima = S.livelli[liv].tipo; st.idPrima = S.livelli[liv].id;
    if (shot && RE && RE.salta && RE.salta()) { let f = shot.percorso ? shot.percorso[shot.percorso.length - 1] : shot; while (f.poi) f = f.poi; fly.on = false; fly.P = null; setCam(f); arriva(); return; }   /* volo senza clip: dissolvenza, la camera 3D salta alla fine */
    const catena = sh => () => vola(sh, sh.dur || 1.6, { via: sh.via || null, gira: sh.gira, fine: sh.poi ? catena(sh.poi) : arriva });   // tratti dritti uno dopo l'altro (poi dentro poi)
    if (shot) vola(shot, shot.dur || L.volo || 2.4, { via: M.via ? M.via(liv, cam, shot) : null, gira: shot.gira, fine: shot.poi ? catena(shot.poi) : arriva });
    else arriva();
  }
  function indietro() { if (st.liv > 0) entra(st.liv - 1, st.sel[st.liv - 2]); }
  function scegli(nodo) {
    const L = S.livelli[st.liv];
    if (RE && RE.guida && nodo && !nodo.esaurito) nodo = RE.guida(L.tipo, nodo);   // versione vera: le clip sono del giro, quindi tribuna e blocco seguono il giro
    if (L.tipo === 'posti') {
      if (!nodo || nodo.preso) { ui.scuoti(nodo); return; }
      const i = st.scelti.findIndex(n => n.id === nodo.id);
      if (L.coppia) { const v = M.vicino && M.vicino(nodo); if (!v) { ui.scuoti(nodo); return; } st.scelti = [nodo, v]; }   // D2: un clic prende due posti vicini
      else if (i >= 0) st.scelti.splice(i, 1); else if (st.scelti.length < (L.quanti || 1)) st.scelti.push(nodo);
      M.accendi(st); ui.scelta(st);
      if (L.subito && st.scelti.length >= (L.quanti || 1)) st.pend = { t: T.now + (L.subito === true ? 0.6 : L.subito), fn: conferma };
      return;
    }
    if (L.tipo === 'vip') {   // poltrone del box: un clic accende, un altro spegne, al massimo L.quanti
      if (!nodo) return; if (nodo.preso) { ui.scuoti(nodo); return; } const i = st.vip.indexOf(nodo.k);   /* poltrona già Booked: trema e basta */
      if (i >= 0) st.vip.splice(i, 1); else if (st.vip.length < (L.quanti || 1)) st.vip.push(nodo.k);
      M.accendi(st); ui.scelta(st);
      if (L.subito && st.vip.length >= (L.quanti || 1)) st.pend = { t: T.now + (L.subito === true ? 0.6 : L.subito), fn: conferma };
      return;
    }
    if (nodo && nodo.esaurito) { ui.scuoti(nodo); return; }
    entra(st.liv + 1, nodo);
  }
  const livDi = tipo => S.livelli.findIndex(l => l.tipo === tipo);
  function conferma() { const L = S.livelli[st.liv];
    if (L.tipo === 'posti' && st.scelti.length >= (L.quanti || 1)) entra(st.liv + 1, st.scelti[0]);
    if (L.tipo === 'vip' && st.vip.length >= (L.quanti || 1)) entra(livDi('dentro'), null);
    if (L.tipo === 'dentro' && livDi('booked') >= 0) entra(livDi('booked'), null); }
  function passaPend() { if (st.pend && T.now >= st.pend.t && !fly.on) { const f = st.pend.fn; st.pend = null; f(); } }

  // ---------------- mouse (vero o finto) ----------------
  const mouse = { x: -1, y: -1, vero: !Q.get('auto') }, ray = new THREE.Raycaster();
  function toCanvas(e) { const r = cv3.getBoundingClientRect(), s = (matchMedia('(min-aspect-ratio: 19/10)').matches ? Math.min : Math.max)(r.width / W, r.height / H),   /* sito 25/11: sugli schermi più larghi di 19:10 (telefoni in orizzontale) tutto intero, bande ai lati */ ox = (r.width - W * s) / 2, oy = (r.height - H * s) / 2; return [(e.clientX - r.left - ox) / s, (e.clientY - r.top - oy) / s]; }
  function pickAt(x, y) {
    if (fly.on && !fly.libero) return null; const btn = ui.bottone(x, y); if (btn) return { bottone: btn };   /* durante lo scivolo dopo l'arrivo i bottoni si possono già cliccare */
    if (RE && RE.trovaVip && S.livelli[st.liv].tipo === 'vip') { const k = RE.trovaVip(x, y); if (k !== undefined) return k == null ? null : { id: 'v' + k, k, liv: st.liv, preso: RE.vipPreso(k) }; }   /* versione vera: le poltrone si scelgono sulla foto */
    ray.setFromCamera(new THREE.Vector2(x / W * 2 - 1, -(y / H * 2 - 1)), camera); return M.trova(st.liv, ray, st);
  }
  function muovi(x, y) { mouse.x = x; mouse.y = y; st.mx = x / W; const h = pickAt(x, y); const prev = st.hover; st.hover = h && !h.bottone ? h : null; if (st.hover) st.ultimoHover = st.hover; st.hBtn = h && h.bottone || null;
    if ((prev && prev.id) !== (st.hover && st.hover.id)) { M.accendi(st); ui.hover(st); } }
  function clic(x, y) { const h = pickAt(x, y); if (!h) return; if (h.bottone) return azione(h.bottone); scegli(h); }
  function azione(b) { if (b === 'scegliUltimo') { if (st.ultimoHover) scegli(st.ultimoHover); return; } if (b === 'avanti') st.liv === 0 ? entra(1, null) : conferma(); else if (b === 'upgrade' || b === 'vip') entra(livDi('vip'), null); else if (b === 'altro') entra(livDi('blocchi'), st.sel[livDi('blocchi') - 1]); else if (b === 'conferma') conferma(); else if (b === 'tieni') entra(livDi('dentro'), null); else if (b === 'indietro') indietro(); else if (b === 'rifai') entra(0, null); else if (b === 'casa') { st.casa = true; st.tCasa = T.now; st.casaBase = null; st.yawCasa = 0; if (!RE) { fly.on = false; fly.P = null; } if (RE && RE.casa) RE.casa(true, S.livelli[st.liv].id); }   /* «View the house» (Nico 21/11): ti guardi intorno nella casa col mouse */
    else if (b.startsWith('liv:')) entra(+b.slice(4), null); }
  addEventListener('mousemove', e => { if (mouse.vero) muovi(...toCanvas(e)); });
  addEventListener('mousedown', e => { if (mouse.vero) clic(...toCanvas(e)); });
  addEventListener('keydown', e => {
    if (e.key === 'r' || e.key === 'R') { tour.on = false; const I0 = S.inizio || 0; entra(I0, null); fly.on = false; fly.P = null; setCam(fermo(M.ripresa(I0, null, st))); st.arrivato = I0; if (RE && RE.reset) RE.reset(S.livelli[I0].id); introParti(); }
    if (e.key === 'Escape' || e.key === 'Backspace') indietro();
    if (e.key === 'h' || e.key === 'H') ui.nascosta = !ui.nascosta;
    if (e.key === ' ' && Q.get('auto')) { if (!tour.on) avviaGiro(Q.get('auto')); }
    if (/^[1-3]$/.test(e.key) && Q.get('look') == null) look(Object.keys(S.looks)[+e.key - 1]);
  });

  // ---------------- giro automatico: un cursore disegnato fa tutto (A, B, C sono tre riprese diverse) ----------------
  const tour = { on: false, passi: [], i: 0, t0: 0, cur: [W * 0.5, H * 0.62], da: null };
  function introParti() {   // 22/11 Nico (stadio 2034): mentre si vola da fuori a sopra lo stadio le strisce del Mondiale, poi la card centrale col bottone
    const I = S.intro; if (!I || S.livelli[st.liv].tipo !== 'mondo' || !S.riprese[I.ripresa]) return;
    const a = S.riprese[I.ripresa]; st.arrivato = -1; st.tIn = T.now; st.introT0 = T.now; if (tour.on) tour.cur = [W * 0.64, H * 0.9];
    vola(a, I.dur || a.dur || 3, { fine: () => { st.tIn = T.now; st.arrivato = st.liv; ui.arrivo(st.liv); } });
  }
  function avviaGiro(nome) { const g = S.giri[nome]; if (!g) return; tour.on = true; tour.passi = g.passi; tour.i = 0; tour.t0 = T.now; tour.da = null;
    if (g.look) look(g.look); const I0 = S.inizio || 0; entra(I0, null); fly.on = false; fly.P = null; setCam(fermo(M.ripresa(I0, null, st))); st.arrivato = I0; st.tIn = T.now; st.clipN = 0; st.tipoPrima = 'mondo'; if (RE && RE.reset) RE.reset(S.livelli[I0].id); introParti(); mouse.x = tour.cur[0]; mouse.y = tour.cur[1]; }
  function stepTour() {
    if (!tour.on) return; const p = tour.passi[tour.i]; if (!p) { tour.on = false; return; }
    const el = T.now - tour.t0;
    if (p.aspetta != null) { if (el >= p.aspetta && (!fly.on || fly.libero) && !st.pend) next(); return; }
    if (p.pausa != null) { if ((fly.on && !fly.libero) || st.pend) { tour.t0 = T.now; return; } if (el >= p.pausa) next(); return; }   /* pausa: conta dall'arrivo, anche se la camera scivola ancora */
    if ((fly.on && !fly.libero) || st.pend) { tour.t0 = T.now; return; }
    if (!tour.da) { const to = (p.poltrona != null && RE && RE.puntoVip && RE.puntoVip(p.poltrona)) || M.punto(p, st, proietta, ui);
      if (!to && (p.bottone || p.poltrona != null) && (tour.attesa = (tour.attesa || 0) + 1) < 72) { tour.t0 = T.now; return; }   // il bottone non c'è ancora: aspetta che compaia
      tour.attesa = 0; tour.da = [...tour.cur]; tour.to = to || tour.cur; tour.t0 = T.now; }
    const dur = p.dur ?? 0.9, u = ease(clamp((T.now - tour.t0) / dur));
    tour.cur = [lerp(tour.da[0], tour.to[0], u), lerp(tour.da[1], tour.to[1], u)]; muovi(...tour.cur);
    if (T.now - tour.t0 >= dur + (p.ferma ?? 0.35)) { if (p.clic) { ui.clicFinto(); clic(...tour.cur); } next(); }
    function next() { tour.i++; tour.t0 = T.now; tour.da = null; }
  }

  /* «View the house» nel 3D: la camera si gira a destra e a sinistra seguendo il mouse (nella versione vera lo fa il panorama a 180°, reale-torre.js) */
  let tCasa0 = 0;
  function guardaCasa() { const dt = Math.max(0, Math.min(0.1, T.now - tCasa0)); tCasa0 = T.now; if (!st.casa || RE) return;
    if (!st.casaBase) st.casaBase = { p: cam.pos.clone(), t: cam.tgt.clone() };
    const yMax = S.casaYaw ?? 0.74, obj = ((st.mx ?? 0.5) - 0.5) * 2 * yMax; st.yawCasa = (st.yawCasa || 0) + (obj - (st.yawCasa || 0)) * (1 - Math.exp(-dt / 0.3));
    const d = st.casaBase.t.clone().sub(st.casaBase.p).applyAxisAngle(new THREE.Vector3(0, 1, 0), -st.yawCasa); cam.pos.copy(st.casaBase.p); cam.tgt.copy(st.casaBase.p).add(d); applyCam(); }

  // ---------------- giro di disegno ----------------
  function frame() {
    if (!REC) { const t = performance.now() / 1000; tick(Math.min(0.05, t - T.last)); T.last = t; }
    stepTour(); stepFly(); guardaCasa(); passaPend(); if (M.ogniFrame) M.ogniFrame(T.now, st, cam);
    if (RE) RE.disegna(st, fly.on); else composer.render(); ui.disegna(st, tour.on ? tour.cur : (mouse.vero ? null : tour.cur), T.now); if (Q.get('etic')) ui.etichetta(st, fly.on);
    if (!REC) requestAnimationFrame(frame);
  }
  // avvio
  const s0 = Q.get('shot'), I0 = S.inizio || 0; entra(I0, null); fly.on = false; fly.P = null; setCam(fermo(M.ripresa(I0, null, st))); st.arrivato = I0; introParti();   /* S.inizio: le torri partono già da «choose your floor» */
  if (s0) { const s = S.riprese?.[s0] || M.ripresaNome?.(s0, st); if (s) { if (s.liv != null) { st.liv = s.liv; st.sel = s.sel || []; M.accendi(st); } setCam(s); } }
  if (Q.get('auto')) mouse.vero = false;
  await ui.pronta; if (M.pronta) await M.pronta;
  if (Q.get('reale') === '1' && S.reale) { RE = await (S.reale.modulo === 'torre' ? creaRealeTorre : creaReale)(S, M, { renderer, scene, camera, T, W, H, ui, REC }); RE.entra('mondo', 'mondo', false, { da: null, a: S.livelli[st.liv].id }); introParti(); }   /* le strisce ripartono insieme alla clip d'arrivo */
  ui.sfondo = RE ? (RE.sfondo || document.getElementById('reale')) : cv3; ui.reale = RE;   // le carte di vetro sfocano quello che c'è sotto
  window.__motore = {
    S, M, ui, st, cam, fly, T, look, vola, setCam, entra, giroAcceso: () => tour.on || fly.on, scegli, conferma, muovi, clic, avviaGiro, renderer, scene, camera, reale: () => RE,
    step(n = 1, fps = 24) { for (let i = 0; i < n; i++) { tick(1 / fps); stepTour(); stepFly(); guardaCasa(); passaPend(); if (M.ogniFrame) M.ogniFrame(T.now, st, cam); } const p = RE ? RE.disegna(st, fly.on) : composer.render(); ui.disegna(st, tour.on ? tour.cur : null, T.now); if (Q.get('etic')) ui.etichetta(st, fly.on); return p; },
    ready: true,
  };
  if (!REC) requestAnimationFrame(frame); else { if (RE) await RE.disegna(st, fly.on); else composer.render(); ui.disegna(st, null, T.now); }
  document.body.dataset.pronto = '1';
}

// cielo a gradiente con alone del sole (controllabile per oro, blu, giorno)
function skyDome() {
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, fogC: { value: new THREE.Color() }, fogK: { value: 0 }, horH: { value: 0.18 }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color() }, sunK: { value: 1 } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); vec4 p = modelViewMatrix*vec4(position,1.); gl_Position = projectionMatrix*p; gl_Position.z = gl_Position.w; }',
    fragmentShader: `uniform vec3 top, mid, hor, sunCol, sunDir, fogC; uniform float sunK, fogK, horH; varying vec3 vD;
      void main(){ float y = vD.y; vec3 c = y > 0. ? mix(mid, top, pow(clamp(y/0.55,0.,1.),0.7)) : hor;
        c = mix(hor, c, smoothstep(-0.02, horH, y)); c = mix(c, fogC, fogK * (1. - smoothstep(-0.005, 0.045, y)));
        float s = max(dot(normalize(vD), normalize(sunDir)), 0.); c += sunCol * (pow(s, 6.) * 0.35 + pow(s, 60.) * 0.8 + pow(s, 900.) * 3.) * sunK;
        gl_FragColor = vec4(c, 1.); }`,
  });
  const d = new THREE.Mesh(new THREE.SphereGeometry(12000, 48, 24), m); d.frustumCulled = false; d.renderOrder = -1; return d;
}
