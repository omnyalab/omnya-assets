// Home hero. Two worlds, switched by gsap.matchMedia at 768px (heroIsMobile):
//
// DESKTOP (768px and up): the drone shot is an image sequence drawn on a
// canvas, driven by the scroll.
// - The hero stays put (position: sticky inside .hero-pin, see global.css) for
//   120% of the screen, then the page slides over it. Sticky instead of a JS
//   pin: nothing switches to position: fixed, so nothing jumps.
// - Frames were picked at equal steps of motion (scripts/hero-frames.mjs), so a
//   steady scroll moves the camera at a steady speed.
// - The scroll only sets a target position, in frames and fractional (37.4).
//   One loop on gsap.ticker eases the drawn position towards it (a frame-rate
//   independent lerp) and stops as soon as it gets there. Between two frames
//   the next one is cross-faded over the current one (alpha = the decimals), so
//   the picture moves continuously instead of in steps.
// - Frames are fetched as files and decoded ahead with createImageBitmap, in a
//   window around the position; the ones that leave the window are closed.
//   drawImage only ever gets decoded pictures. A frame not decoded yet is
//   replaced by the nearest one that is: never an empty canvas.
// - The first frame is the <picture> in the page (no-JS, under the preloader,
//   which waits for it). Right after the preloader come the key frames, one in
//   eight; the rest once the page has settled or the visitor moves, the holes
//   nearest to the position first.
// - The canvas is 100lvh tall and is only reallocated when the width or the
//   orientation changes.
//
// PHONES (up to 767px): no scrub at all. The reel (public/reel/hero_mobile.mp4,
// muted, looping) starts as soon as the page loads, over its poster; the hero
// is a normal 100svh section the page slides over. None of the frame code runs
// and no frame is downloaded.
//
// Both: the h1 is simply there, still, from the moment the preloader lifts. It
// only leaves when the next section slides over the hero: it fades, rises 40px
// and blurs to 8px over the first 60% of that slide, tied to the scroll (and
// comes back the same way).
import { gsap, ScrollTrigger, reduced, fine } from './core';
import { onDestroy } from './anim';

type Frames = { count: number; w: number; h: number };

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function hero(intro: Promise<void>) {
  const pin = document.querySelector<HTMLElement>('[data-hero-pin]');
  const section = pin?.querySelector<HTMLElement>('[data-hero]');
  const canvas = section?.querySelector<HTMLCanvasElement>('[data-hero-frames]');
  const first = section?.querySelector<HTMLImageElement>('[data-hero-first]');
  const video = section?.querySelector<HTMLVideoElement>('[data-hero-video]');
  const h1 = section?.querySelector<HTMLElement>('[data-hero-title]');
  const after = document.querySelector<HTMLElement>('.after-hero');
  if (!pin || !section || !canvas || !first || !video || !h1 || !after) return;
  const frames = (JSON.parse(section.dataset.frames || '{}') as { desktop: Frames }).desktop;
  const cue = section.querySelector<HTMLElement>('.hero__cue');
  // The reel's file, as the page gives it (only on a phone without reduced motion)
  const reelSource = video.querySelector('source');
  const reelUrl = reelSource?.getAttribute('src') || '';

  // The intro has started (preloader gone, or the page transition done). A
  // branch mounted later (a resize across 768px) finds it already resolved.
  const ready = intro.then(() => undefined);

  /* Shared: the title leaves while the next section slides over the hero
     (opacity, 40px up, blur 8px over the first 60% of that slide), and the
     scroll cue fades with it. Until then the h1 carries no inline style. */
  const clearTitle = () => { h1.style.opacity = h1.style.transform = h1.style.filter = ''; };
  const titleExit = (trigger: ScrollTrigger.Vars, hideCue: () => boolean) => {
    const cueOut = cue ? gsap.to(cue, { autoAlpha: 0, duration: 0.4, ease: 'power1.out', paused: true }) : null;
    let cueHidden = false;
    let leaving = false;
    const cueSync = () => {
      const hide = hideCue() || leaving;
      if (!cueOut || hide === cueHidden) return;
      cueHidden = hide;
      if (hide) cueOut.play();
      else cueOut.reverse();
    };
    const exit = { e: 0 };
    const ease = gsap.parseEase('power1.in');
    gsap.to(exit, {
      e: 1,
      ease: 'none',
      onUpdate: () => {
        const k = ease(exit.e);
        leaving = exit.e > 0;
        cueSync();
        if (k <= 0) { clearTitle(); return; }
        h1.style.opacity = String(1 - k);
        h1.style.transform = `translate3d(0, ${-40 * k}px, 0)`;
        h1.style.filter = `blur(${8 * k}px)`;
      },
      scrollTrigger: { ...trigger, scrub: 0.6, invalidateOnRefresh: true },
    });
    return cueSync;
  };

  const mm = gsap.matchMedia();
  onDestroy(() => mm.revert());

  /* ---------- Desktop (768px and up): the scroll-driven drone shot ---------- */
  mm.add('(min-width: 768px)', () => {
    // Coming from phone width: the reel must not keep a file or a download going
    if (reelSource?.getAttribute('src')) { video.pause(); reelSource.removeAttribute('src'); video.load(); }
    let alive = true;
    const seq = sequence(canvas, first, frames);

    // Reduced motion: no scrub, the last frame and the plain h1
    if (reduced) {
      seq.seek(1, true);
      ready.then(() => { if (alive) seq.load([frames.count - 1]); });
      return () => { alive = false; seq.destroy(); };
    }

    // The scroll left to the drone: the pin is the hero, the drone's run and
    // one more screen for the page to slide over the hero
    const run = () => Math.max(1, pin.offsetHeight - 2 * section.offsetHeight);
    let p = 0; // raw scroll progress through the drone's run
    const cueSync = titleExit(
      { trigger: pin, start: () => `top+=${run()} top`, end: () => `top+=${run() + section.offsetHeight * 0.6} top` },
      () => p > 0.05
    );
    // No scrub here: the trigger only hands the target to the sequence, which
    // does its own smoothing (see sequence below)
    ScrollTrigger.create({
      trigger: pin,
      start: 'top top',
      end: () => `+=${run()}`,
      invalidateOnRefresh: true,
      onUpdate: (self) => { p = self.progress; seq.seek(p); cueSync(); },
      onRefresh: (self) => { p = self.progress; seq.seek(p); cueSync(); },
    });

    // Key frames right after the intro: whoever scrolls at once already sees
    // the drone move. The ones in between wait for the page to settle (load +
    // 2s), or for the visitor to move first.
    let timer = 0;
    const evs = ['scroll', 'wheel', 'touchstart', 'pointerdown', 'keydown'];
    const off = () => {
      clearTimeout(timer);
      window.removeEventListener('load', later);
      evs.forEach((e) => window.removeEventListener(e, start));
    };
    function start() { off(); seq.loadRest(); }
    function later() { timer = window.setTimeout(start, 2000); }
    ready.then(() => {
      if (!alive) return;
      seq.loadKeys();
      evs.forEach((e) => window.addEventListener(e, start, { passive: true }));
      if (document.readyState === 'complete') later();
      else window.addEventListener('load', later, { once: true });
    });

    return () => { alive = false; off(); seq.destroy(); clearTitle(); };
  });

  /* ---------- Phones (up to 767px): the reel ----------
     No pin, no canvas, no frames: the hero is a normal 100svh section and
     #statement slides over it. The reel (muted, inline, looping) gets its file
     from the page itself (a <source> that only matches a phone without reduced
     motion) and starts on its own as soon as it can, preloader or not. It only
     shows once it really plays: if autoplay is refused (iOS Low Power Mode) the
     poster stays, no play button, and the first tap or scroll tries again.
     Paused while the next section covers the hero, playing again when it comes
     back. Reduced motion: no file at all, the poster only. */
  mm.add('(max-width: 767px)', () => {
    if (reduced) return;
    let alive = true;
    let covered = false;

    titleExit({ trigger: after, start: 'top bottom', end: () => `top bottom-=${section.offsetHeight * 0.6}` }, () => false);

    // Autoplay refused: try again on the first touch, tap, scroll or key
    const retryEvents = ['touchend', 'click', 'scroll', 'keydown'];
    const retry = () => play();
    const retryOff = () => retryEvents.forEach((e) => window.removeEventListener(e, retry));
    // playing, whoever started it (autoplay or us): show it, stop retrying
    const show = () => { video.classList.add('is-on'); retryOff(); };
    const play = () => {
      if (!alive || covered || document.hidden) return;
      video.play().then(show, () => {});
    };
    retryEvents.forEach((e) => window.addEventListener(e, retry, { passive: true }));
    video.addEventListener('playing', show);

    // Coming from desktop width: the file was dropped there (or never picked
    // at load), attach it again
    if (reelSource && reelUrl && !reelSource.getAttribute('src')) { reelSource.src = reelUrl; video.load(); }
    else if (!video.currentSrc && reelSource?.getAttribute('src')) video.load();
    play();

    // Paused while the next section covers the hero, playing again when it comes back
    ScrollTrigger.create({
      trigger: after,
      start: 'top top',
      onEnter: () => { covered = true; video.pause(); },
      onLeaveBack: () => { covered = false; play(); },
    });
    const onVis = () => { if (!document.hidden) play(); };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      alive = false;
      retryOff();
      video.removeEventListener('playing', show);
      document.removeEventListener('visibilitychange', onVis);
      video.pause();
      video.classList.remove('is-on');
      clearTitle();
    };
  });
}

/* ---------- The frame sequence ---------- */
type Pic = (ImageBitmap | HTMLImageElement) & { __i?: number };

function sequence(canvas: HTMLCanvasElement, first: HTMLImageElement, set: Frames) {
  const ctx = canvas.getContext('2d')!;
  const touch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  // Smoothing per 16.7ms: a little quicker on desktop, where Lenis already
  // smooths the wheel before it gets here
  const LERP = fine ? 0.25 : 0.18;
  // Decoded window around the position (a 1600px frame is ~5.7MB decoded: all
  // 144 would be ~820MB, so a window; a little narrower on touch screens)
  const AHEAD = touch ? 20 : 40;
  const BEHIND = touch ? 8 : 12;

  const key = 'desktop';
  let ext: 'avif' | 'webp' | null = null;
  let gen = 0; // bumps on set change and on destroy: stale work is dropped
  let dead = false;
  let blobs: Array<Blob | null> = [];
  let pics: Array<Pic | null> = [];
  const fetching = new Set<number>();
  const decoding = new Set<number>();
  const urls = new Map<number, string>(); // object URLs of the <img> fallback
  let order: number[] = []; // what is left to fetch, in order
  let phase = 0; // 0 nothing yet, 1 key frames, 2 everything (holes near the position first)

  let target = 0; // frames, fractional
  let pos = 0; // drawn position, eases towards target
  let dir = 1;
  let running = false;
  let dirty = true;
  let drawnSig = '';
  let shown = false;

  const count = () => set.count;
  const url = (i: number) => `/hero/${key}/${String(i + 1).padStart(4, '0')}.${ext}`;

  // Same format the <picture> picked: AVIF where the browser takes it, WebP otherwise
  const format = (): Promise<'avif' | 'webp'> =>
    new Promise((res) => {
      const pickExt = () => res(/\.avif(\?|$)/.test(first.currentSrc) ? 'avif' : 'webp');
      if (first.complete) pickExt();
      else {
        first.addEventListener('load', pickExt, { once: true });
        first.addEventListener('error', pickExt, { once: true });
      }
    });

  /* --- canvas size: allocated once, again only if the width or the orientation changes --- */
  let cssW = 0;
  let cssH = 0;
  let land = false;
  function size(force = false) {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const l = w > h;
    if (!force && cssW) {
      // touch: the Safari toolbar only changes the height, by less than 160px
      if (touch && w === cssW && l === land && Math.abs(h - cssH) < 160) return false;
      if (w === cssW && h === cssH) return false;
    }
    cssW = w;
    cssH = h;
    land = l;
    // Never more pixels than the frames have: past their own resolution a bigger
    // canvas adds no detail, only work for every drawImage
    const { w: fw, h: fh } = set;
    const native = Math.min(fw / w, fh / h); // frame px per CSS px, at object-fit: cover
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1, native));
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    drawnSig = '';
    return true;
  }

  /* --- drawing --- */
  function cover(img: Pic, alpha: number) {
    const iw = (img as ImageBitmap).width || (img as HTMLImageElement).naturalWidth;
    const ih = (img as ImageBitmap).height || (img as HTMLImageElement).naturalHeight;
    const cw = canvas.width;
    const ch = canvas.height;
    const s = Math.max(cw / iw, ch / ih);
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, (cw - iw * s) / 2, (ch - ih * s) / 2, iw * s, ih * s);
  }

  function nearestPic(x: number): number {
    const n = pics.length;
    const c = Math.round(x);
    if (pics[c]) return c;
    for (let d = 1; d < n; d++) {
      if (pics[c - d]) return c - d;
      if (pics[c + d]) return c + d;
    }
    return -1;
  }

  function render() {
    if (!cssW) size(true);
    let a = Math.floor(pos);
    let f = pos - a;
    if (f >= 0.98 && pics[a + 1]) { a += 1; f = 0; }
    const A = pics[a];
    // within 2% of a whole frame one picture is enough: the overlay would not show
    const B = f > 0.02 ? pics[a + 1] : null;
    let sig: string;
    if (A && (B || f <= 0.02)) {
      sig = B ? `${a}+${f.toFixed(3)}` : `${a}`;
      if (sig === drawnSig) return;
      cover(A, 1);
      if (B) cover(B, f);
    } else {
      // the pair is not ready: the nearest decoded frame, never an empty canvas
      const k = nearestPic(pos);
      if (k < 0) return;
      sig = `${k}`;
      if (sig === drawnSig) return;
      cover(pics[k]!, 1);
    }
    ctx.globalAlpha = 1;
    drawnSig = sig;
    if (!shown) { shown = true; canvas.classList.add('is-on'); }
  }

  /* --- one loop: ease the position, draw, stop when settled --- */
  function tick(_t: number, dt: number) {
    if (dead) return;
    const k = 1 - Math.pow(1 - LERP, Math.min(dt, 100) / 16.67);
    const before = Math.floor(pos);
    pos += (target - pos) * k;
    if (Math.abs(target - pos) < 0.01) pos = target;
    if (Math.floor(pos) !== before) { release(); decodePump(); fetchPump(); }
    render();
    dirty = false;
    if (pos === target) stop();
  }
  function start() {
    if (running || dead) return;
    running = true;
    gsap.ticker.add(tick);
  }
  function stop() {
    if (!running) return;
    running = false;
    gsap.ticker.remove(tick);
  }
  const kick = () => { dirty = true; start(); };

  /* --- the decoded window --- */
  const inWindow = (i: number) => {
    const c = pos;
    return dir >= 0 ? i >= c - BEHIND - 1 && i <= c + AHEAD + 1 : i <= c + BEHIND + 1 && i >= c - AHEAD - 1;
  };
  // window indexes, nearest first, the scroll direction before the other
  function windowOrder() {
    const n = count();
    const c = Math.round(pos);
    const out: number[] = [];
    for (let d = 0; d <= AHEAD; d++) {
      const fwd = c + d * dir;
      if (fwd >= 0 && fwd < n) out.push(fwd);
      if (d && d <= BEHIND) {
        const back = c - d * dir;
        if (back >= 0 && back < n) out.push(back);
      }
    }
    return out;
  }

  function closePic(i: number) {
    const pic = pics[i];
    if (!pic) return;
    if ('close' in pic) (pic as ImageBitmap).close();
    const u = urls.get(i);
    if (u) { URL.revokeObjectURL(u); urls.delete(i); }
    pics[i] = null;
  }
  function release() {
    for (let i = 0; i < pics.length; i++) if (pics[i] && !inWindow(i)) closePic(i);
  }

  async function decodeOne(i: number, g: number) {
    const blob = blobs[i]!;
    let pic: Pic | null = null;
    try {
      if ('createImageBitmap' in window) pic = await createImageBitmap(blob);
    } catch { pic = null; }
    if (!pic) {
      // fallback: an <img> decoded off the main thread before it is ever drawn
      const u = URL.createObjectURL(blob);
      const img = new Image();
      img.src = u;
      try { await img.decode(); pic = img; urls.set(i, u); } catch { URL.revokeObjectURL(u); }
    }
    if (!pic) return;
    if (g !== gen || dead || !inWindow(i)) {
      if ('close' in pic) (pic as ImageBitmap).close();
      else if (pic instanceof HTMLImageElement) URL.revokeObjectURL(pic.src);
      return;
    }
    pic.__i = i; // frame index, handy when profiling
    pics[i] = pic;
    kick();
  }
  function decodePump() {
    const g = gen;
    for (const i of windowOrder()) {
      if (decoding.size >= 3) return;
      if (!blobs[i] || pics[i] || decoding.has(i)) continue;
      decoding.add(i);
      decodeOne(i, g).finally(() => { if (g === gen) { decoding.delete(i); decodePump(); } });
    }
  }

  /* --- fetching: the files, kept as blobs (small), decoded only when needed --- */
  async function fetchOne(i: number, g: number) {
    try {
      const r = await fetch(url(i));
      if (!r.ok) return;
      const b = await r.blob();
      if (g !== gen || dead) return;
      blobs[i] = b;
      decodePump();
    } catch {}
  }
  function nextToFetch(): number {
    const ready = (i: number) => !blobs[i] && !fetching.has(i);
    if (phase >= 2) for (const i of windowOrder()) if (ready(i)) return i;
    while (order.length) {
      const i = order.shift()!;
      if (ready(i)) return i;
    }
    return -1;
  }
  async function fetchPump() {
    const g = gen;
    if (!ext) ext = await format();
    if (g !== gen || dead) return;
    while (fetching.size < 4) {
      const i = nextToFetch();
      if (i < 0) return;
      fetching.add(i);
      fetchOne(i, g).finally(() => { if (g === gen) { fetching.delete(i); fetchPump(); } });
    }
  }

  // Key frames: one in eight and the last one, plus the first few after 0
  function keys() {
    const n = count();
    const out: number[] = [];
    for (let i = 1; i <= Math.min(8, n - 1); i++) out.push(i);
    for (let i = 0; i < n; i += 8) out.push(i);
    if (out[out.length - 1] !== n - 1) out.push(n - 1);
    return out;
  }
  function rest() {
    const n = count();
    const out: number[] = [];
    for (let i = 0; i < n; i++) if (i % 8 && i !== n - 1) out.push(i);
    return out;
  }
  const enqueue = (list: number[]) => { order.push(...list.filter((i) => !order.includes(i))); fetchPump(); };

  function reset() {
    gen++;
    for (let i = 0; i < pics.length; i++) closePic(i);
    const n = count();
    blobs = new Array(n).fill(null);
    pics = new Array(n).fill(null);
    fetching.clear();
    decoding.clear();
    order = [];
    drawnSig = '';
  }
  reset();

  // Redraw on resize (the phone/desktop switch is the caller's matchMedia)
  let t = 0;
  const onResize = () => {
    clearTimeout(t);
    t = window.setTimeout(() => { if (size()) kick(); }, 120);
  };
  window.addEventListener('resize', onResize);

  return {
    /** scroll progress 0..1 → target position; `jump` skips the easing */
    seek(p: number, jump = false) {
      const next = clamp01(p) * (count() - 1);
      if (next !== target) dir = next > target ? 1 : -1;
      target = next;
      if (jump) pos = target;
      if (pos !== target || dirty) kick();
    },
    /** just these frames (reduced motion: the last one) */
    load: enqueue,
    loadKeys() { if (phase < 1) { phase = 1; enqueue(keys()); } },
    loadRest() { this.loadKeys(); if (phase < 2) { phase = 2; enqueue(rest()); } },
    destroy() {
      dead = true;
      stop();
      clearTimeout(t);
      window.removeEventListener('resize', onResize);
      reset();
    },
  };
}
