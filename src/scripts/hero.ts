// Home hero: the drone shot is an image sequence drawn on a canvas, driven by
// the scroll. No <video> and no video.currentTime: scrubbing a video stutters on
// iOS, a canvas does not.
//
// - The hero stays put (position: sticky inside .hero-pin, see global.css) for
//   120% of the screen on desktop and 100% on phones, then the page slides over
//   it. Sticky instead of a JS pin: nothing switches to position: fixed, so
//   there is never a jump on iOS when the pin starts or ends.
// - Frames were picked at equal steps of motion (scripts/hero-frames.mjs), so
//   frame = round(progress × (count − 1)) moves the camera at a steady speed.
// - The first frame is the <picture> in the page (no-JS, under the
//   preloader, which waits for it). Right after the preloader come the key
//   frames, one in eight; the ones in between once the page has settled or the
//   visitor moves. A frame that is not there yet is replaced by the
//   nearest one that is.
// - The h1 is simply there, still, from the moment the preloader lifts. It only
//   leaves at the end: once the drone has landed and the next section starts
//   sliding over the hero, it fades, rises 40px and blurs to 8px over the first
//   60% of that slide, tied to the scroll (and comes back the same way).
import { gsap, reduced, heroIsMobile } from './core';
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
    seq.show(1);
    onIntro(intro, () => seq.load([sets[setKey()].count - 1]));
    return;
  }

  const cue = section.querySelector<HTMLElement>('.hero__cue');
  inPage(() => {
    // The scroll left to the drone: the pin is the hero, the drone's run and
    // one more screen for the page to slide over the hero
    const run = () => Math.max(1, pin.offsetHeight - 2 * section.offsetHeight);
    const state = { p: 0 };
    const cueOut = cue ? gsap.to(cue, { autoAlpha: 0, duration: 0.4, ease: 'power1.out', paused: true }) : null;
    let cueHidden = false;
    let leaving = false; // the title's exit has started
    const cueSync = () => {
      const hide = state.p > 0.05 || leaving;
      if (!cueOut || hide === cueHidden) return;
      cueHidden = hide;
      if (hide) cueOut.play();
      else cueOut.reverse();
    };
    gsap.to(state, {
      p: 1,
      ease: 'none',
      onUpdate: () => { seq.show(state.p); cueSync(); },
      scrollTrigger: { trigger: pin, start: 'top top', end: () => `+=${run()}`, scrub: 0.6, invalidateOnRefresh: true },
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
function sequence(canvas: HTMLCanvasElement, first: HTMLImageElement, sets: Sets) {
  const ctx = canvas.getContext('2d')!;
  let key = setKey();
  let frames: Array<HTMLImageElement | null> = [];
  let ext: 'avif' | 'webp' | null = null;
  let gen = 0; // bumps on set change and on destroy: stale loads are dropped
  let progress = 0;
  let drawn: HTMLImageElement | null = null;
  let raf = 0;
  let dead = false;

  const count = () => sets[key].count;
  const url = (i: number) => `/hero/${key}/${String(i + 1).padStart(4, '0')}.${ext}`;
  const target = () => Math.round(progress * (count() - 1));

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

  function nearest(i: number) {
    const n = frames.length;
    if (frames[i]) return frames[i];
    for (let d = 1; d < n; d++) {
      if (frames[i - d]) return frames[i - d];
      if (frames[i + d]) return frames[i + d];
    }
    return null;
  }

  function size() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (w === canvas.width && h === canvas.height) return false;
    canvas.width = w;
    canvas.height = h;
    return true;
  }

  function draw() {
    raf = 0;
    if (dead) return;
    const resized = size();
    const img = nearest(target()) || drawn;
    if (!img || (img === drawn && !resized)) return;
    // object-fit: cover
    const cw = canvas.width;
    const ch = canvas.height;
    const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const w = img.naturalWidth * s;
    const h = img.naturalHeight * s;
    ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    if (!drawn) canvas.classList.add('is-on');
    drawn = img;
  }
  const request = () => { if (!raf && !dead) raf = requestAnimationFrame(draw); };

  function loadOne(i: number, g: number) {
    if (frames[i]) return Promise.resolve();
    const img = new Image();
    img.decoding = 'async';
    img.src = url(i);
    return img.decode().then(
      () => {
        if (g !== gen) return;
        frames[i] = img;
        // only worth a redraw if it is closer to where the scroll is
        if (nearest(target()) === img) request();
      },
      () => {}
    );
  }

  // One queue, four downloads at a time; a set change empties it
  let queue: number[] = [];
  let busy = 0;
  async function pump() {
    const g = gen;
    if (!ext) ext = await format();
    while (busy < 4 && queue.length && g === gen) {
      const i = queue.shift()!;
      busy++;
      loadOne(i, g).finally(() => { busy--; if (g === gen) pump(); });
    }
  }
  const enqueue = (list: number[]) => { queue.push(...list.filter((i) => !queue.includes(i))); pump(); };

  // Key frames: one in eight, and the last one
  function keys() {
    const n = count();
    const out: number[] = [];
    for (let i = 0; i < n; i += 8) out.push(i);
    if (out[out.length - 1] !== n - 1) out.push(n - 1);
    return out;
  }
  // The ones in between
  function rest() {
    const n = count();
    const out: number[] = [];
    for (let i = 0; i < n; i++) if (i % 8 && i !== n - 1) out.push(i);
    return out;
  }

  frames = new Array(count()).fill(null);
  let phase = 0; // 0 nothing yet, 1 key frames asked for, 2 all of them

  // Redraw on resize; swap the whole set only when the screen crosses 768px
  let t = 0;
  const onResize = () => {
    clearTimeout(t);
    t = window.setTimeout(() => {
      const k = setKey();
      if (k !== key) {
        key = k;
        gen++;
        queue = [];
        busy = 0;
        frames = new Array(count()).fill(null);
        if (phase === 0) enqueue([Math.round(progress * (count() - 1))]);
        if (phase >= 1) enqueue(keys());
        if (phase === 2) enqueue(rest());
      }
      request();
    }, 120);
  };
  window.addEventListener('resize', onResize);

  return {
    /** progress 0..1 → frame; draws only when the frame changes */
    show(p: number) {
      progress = clamp01(p);
      if (nearest(target()) !== drawn) request();
    },
    /** just these frames (reduced motion: the last one) */
    load: enqueue,
    loadKeys() { if (phase < 1) { phase = 1; enqueue(keys()); } },
    loadRest() { this.loadKeys(); if (phase < 2) { phase = 2; enqueue(rest()); } },
    destroy() {
      dead = true;
      gen++;
      queue = [];
      cancelAnimationFrame(raf);
      clearTimeout(t);
      window.removeEventListener('resize', onResize);
      frames = [];
    },
  };
}
