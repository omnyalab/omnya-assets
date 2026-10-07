// Home hero: the drone shot is an image sequence drawn on a canvas, driven by
// the scroll. No <video> and no video.currentTime: scrubbing a video stutters on
// iOS, a canvas does not.
//
// - The hero stays put (position: sticky inside .hero-pin, see global.css) for
//   120% of the screen on desktop and 100% on phones, then the page slides over
//   it. Sticky instead of a JS pin: nothing switches to position: fixed, so
//   there is never a jump on iOS when the pin starts or ends.
// - Frames were picked at equal steps of motion (scripts/hero-frames.mjs), so a
//   steady scroll moves the camera at a steady speed.
// - The scroll only sets a target position, in frames and fractional (37.4).
//   One loop on gsap.ticker eases the drawn position towards it (a frame-rate
//   independent lerp) and stops as soon as it gets there. Between two frames
//   the next one is cross-faded over the current one (alpha = the decimals), so
//   the picture moves continuously instead of in steps.
// - Frames are fetched as files and decoded ahead with createImageBitmap, in a
//   window around the position (20 ahead in the scroll direction, 8 behind;
//   wider on desktop); the ones that leave the window are closed. drawImage
//   only ever gets decoded pictures. A frame not decoded yet is replaced by the
//   nearest one that is: never an empty canvas.
// - The first frame is the <picture> in the page (no-JS, under the
//   preloader, which waits for it). Right after the preloader come the key
//   frames, one in eight; the rest once the page has settled or the visitor
//   moves, the holes nearest to the position first.
// - The canvas is 100lvh tall and is only reallocated when the width or the
//   orientation changes: the Safari toolbar coming and going changes nothing.
// - The h1 is simply there, still, from the moment the preloader lifts. It only
//   leaves at the end: once the drone has landed and the next section starts
//   sliding over the hero, it fades, rises 40px and blurs to 8px over the first
//   60% of that slide, tied to the scroll (and comes back the same way).
import { gsap, ScrollTrigger, reduced, fine, heroIsMobile } from './core';
import { onDestroy, inPage, onIntro } from './anim';

type SetKey = 'desktop' | 'mobile';
type Sets = Record<SetKey, { count: number; w: number; h: number }>;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const setKey = (): SetKey => (heroIsMobile() ? 'mobile' : 'desktop');

export function hero(intro: Promise<void>) {
  const pin = document.querySelector<HTMLElement>('[data-hero-pin]');
  const section = pin?.querySelector<HTMLElement>('[data-hero]');
  const canvas = section?.querySelector<HTMLCanvasElement>('[data-hero-frames]');
  const first = section?.querySelector<HTMLImageElement>('[data-hero-first]');
  const h1 = section?.querySelector<HTMLElement>('[data-hero-title]');
  if (!pin || !section || !canvas || !first || !h1) return;
  const sets = JSON.parse(section.dataset.frames || '{}') as Sets;

  const seq = sequence(canvas, first, sets);
  onDestroy(seq.destroy);

  // Reduced motion: no scrub, the last frame and the plain h1
  if (reduced) {
    seq.seek(1, true);
    onIntro(intro, () => seq.load([sets[setKey()].count - 1]));
    return;
  }

  const cue = section.querySelector<HTMLElement>('.hero__cue');
  inPage(() => {
    // The scroll left to the drone: the pin is the hero, the drone's run and
    // one more screen for the page to slide over the hero
    const run = () => Math.max(1, pin.offsetHeight - 2 * section.offsetHeight);
    let p = 0; // raw scroll progress through the drone's run
    const cueOut = cue ? gsap.to(cue, { autoAlpha: 0, duration: 0.4, ease: 'power1.out', paused: true }) : null;
    let cueHidden = false;
    let leaving = false; // the title's exit has started
    const cueSync = () => {
      const hide = p > 0.05 || leaving;
      if (!cueOut || hide === cueHidden) return;
      cueHidden = hide;
      if (hide) cueOut.play();
      else cueOut.reverse();
    };
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
    // The title leaves only when the next section starts to slide over the hero:
    // first 60% of that slide, never during the drone's run. Until then it
    // carries no inline style at all (no filter: Safari keeps it crisp).
    const exit = { e: 0 };
    const ease = gsap.parseEase('power1.in');
    gsap.to(exit, {
      e: 1,
      ease: 'none',
      onUpdate: () => {
        const k = ease(exit.e);
        leaving = exit.e > 0;
        cueSync();
        if (k <= 0) { h1.style.opacity = h1.style.transform = h1.style.filter = ''; return; }
        h1.style.opacity = String(1 - k);
        h1.style.transform = `translate3d(0, ${-40 * k}px, 0)`;
        h1.style.filter = `blur(${8 * k}px)`;
      },
      scrollTrigger: {
        trigger: pin,
        start: () => `top+=${run()} top`,
        end: () => `top+=${run() + section.offsetHeight * 0.6} top`,
        scrub: 0.6,
        invalidateOnRefresh: true,
      },
    });
  });

  onIntro(intro, () => {
    // Key frames right away: whoever scrolls at once already sees the drone
    // move. The ones in between wait for the page to settle (load + 2s), or
    // for the visitor to move first.
    seq.loadKeys();
    let timer = 0;
    const evs = ['scroll', 'wheel', 'touchstart', 'pointerdown', 'keydown'];
    const off = () => {
      clearTimeout(timer);
      window.removeEventListener('load', later);
      evs.forEach((e) => window.removeEventListener(e, start));
    };
    function start() { off(); seq.loadRest(); }
    function later() { timer = window.setTimeout(start, 2000); }
    evs.forEach((e) => window.addEventListener(e, start, { passive: true }));
    if (document.readyState === 'complete') later();
    else window.addEventListener('load', later, { once: true });
    onDestroy(off);
  });
}

/* ---------- The frame sequence ---------- */
type Pic = (ImageBitmap | HTMLImageElement) & { __i?: number };

function sequence(canvas: HTMLCanvasElement, first: HTMLImageElement, sets: Sets) {
  const ctx = canvas.getContext('2d')!;
  const touch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  // Smoothing per 16.7ms: a little quicker on desktop, where Lenis already
  // smooths the wheel before it gets here
  const LERP = fine ? 0.25 : 0.18;
  // Decoded window around the position (a 750px phone frame is ~4MB decoded,
  // a 1600px desktop frame ~5.7MB: all 144 would be ~820MB, so desktop gets a
  // wider window instead)
  const AHEAD = touch ? 20 : 40;
  const BEHIND = touch ? 8 : 12;

  let key = setKey();
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

  const count = () => sets[key].count;
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
    const { w: fw, h: fh } = sets[key];
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

  // Redraw on resize; swap the whole set only when the screen crosses 768px
  let t = 0;
  let progress = 0;
  const onResize = () => {
    clearTimeout(t);
    t = window.setTimeout(() => {
      const k = setKey();
      if (k !== key) {
        key = k;
        reset();
        target = pos = progress * (count() - 1);
        if (phase === 0) enqueue([Math.round(target)]);
        if (phase >= 1) enqueue(keys());
        if (phase === 2) enqueue(rest());
      }
      if (size()) kick();
    }, 120);
  };
  window.addEventListener('resize', onResize);

  return {
    /** scroll progress 0..1 → target position; `jump` skips the easing */
    seek(p: number, jump = false) {
      progress = clamp01(p);
      const next = progress * (count() - 1);
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
