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
// - The h1 assembles from the pixels of its own text (pixelTitle below).
import { gsap, reduced, fine, heroIsMobile } from './core';
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
  const px = section?.querySelector<HTMLCanvasElement>('[data-hero-px]');
  if (!pin || !section || !canvas || !first || !h1 || !px) return;
  const sets = JSON.parse(section.dataset.frames || '{}') as Sets;

  const seq = sequence(canvas, first, sets);
  onDestroy(seq.destroy);

  // Reduced motion: no scrub, no pixels, the last frame and the plain h1
  if (reduced) {
    seq.show(1);
    onIntro(intro, () => seq.load([sets[setKey()].count - 1]));
    return;
  }

  let title: ReturnType<typeof pixelTitle> | null = null;
  try {
    title = pixelTitle(h1, px, section);
    onDestroy(title.destroy);
  } catch (e) {
    console.error(e);
    h1.style.setProperty('--ta', '1');
  }

  const cue = section.querySelector<HTMLElement>('.hero__cue');
  inPage(() => {
    // The scroll left to the drone: the pin is the hero, the drone's run and
    // one more screen for the page to slide over the hero
    const run = () => Math.max(1, pin.offsetHeight - 2 * section.offsetHeight);
    const state = { p: 0 };
    const cueOut = cue ? gsap.to(cue, { autoAlpha: 0, duration: 0.4, ease: 'power1.out', paused: true }) : null;
    let cueHidden = false;
    const update = () => {
      seq.show(state.p);
      title?.progress(state.p);
      const hide = state.p > 0.05;
      if (cueOut && hide !== cueHidden) {
        cueHidden = hide;
        if (hide) cueOut.play();
        else cueOut.reverse();
      }
    };
    gsap.to(state, {
      p: 1,
      ease: 'none',
      onUpdate: update,
      scrollTrigger: { trigger: pin, start: 'top top', end: () => `+=${run()}`, scrub: 0.6, invalidateOnRefresh: true },
    });
    // As before, desktop only: a darkening veil while the page slides over the hero
    if (fine) {
      gsap.to(section.querySelector('.hero__dim'), {
        opacity: 0.5, ease: 'none',
        scrollTrigger: { trigger: pin, start: () => `top+=${run()} top`, end: 'bottom bottom', scrub: true, invalidateOnRefresh: true },
      });
    }
  });

  onIntro(intro, () => {
    title?.start();
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

/* ---------- Pixel assemble title ----------
   The h1 stays a real h1. Its text is drawn (font, size, line breaks, two
   tones, all read from the DOM) on a hidden canvas and sampled on a grid: every
   filled cell becomes a square with a home position and a colour. At progress
   0 the squares drift in a soft cloud around the title; by 0.6 they have
   landed, left to right; from 0.6 to 0.75 the squares fade and the real h1
   comes back. */
function pixelTitle(h1: HTMLElement, canvas: HTMLCanvasElement, hero: HTMLElement) {
  const ctx = canvas.getContext('2d')!;
  const ease = gsap.parseEase('power3.out');
  let n = 0;
  let cell = 4;
  let fx = new Float32Array(0); // home, top-left of the cell, canvas px
  let fy = new Float32Array(0);
  let jr = new Float32Array(0); // own drift: radius, angle, angular speed
  let ja = new Float32Array(0);
  let jw = new Float32Array(0);
  let delay = new Float32Array(0);
  let base = new Float32Array(0); // opacity in the cloud
  let tone = new Uint8Array(0);
  let colors: string[] = [];
  let amp = 60; // noise displacement, px
  let freq = 1 / 200;
  let sig = '';

  let p = 0;
  let time = 0;
  let last = 0;
  let raf = 0;
  let running = false;
  let visible = true;
  let started = false;
  let dead = false;
  const fade = { a: 0 }; // the cloud fades in when the preloader is gone

  function build() {
    const box = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(box.width * dpr);
    canvas.height = Math.round(box.height * dpr);
    cell = heroIsMobile() ? 3 : 4;

    // Read the colours at full strength (the h1 itself is faded out meanwhile)
    const prev = h1.style.getPropertyValue('--ta');
    h1.style.setProperty('--ta', '1');
    type Glyph = { ch: string; x: number; y: number; w: number; h: number; font: string; tone: number };
    const glyphs: Glyph[] = [];
    colors = [];
    const range = document.createRange();
    const walker = document.createTreeWalker(h1, NodeFilter.SHOW_TEXT);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
      const cs = getComputedStyle(node.parentElement!);
      const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      let ti = colors.indexOf(cs.color);
      if (ti < 0) ti = colors.push(cs.color) - 1;
      const text = node.data;
      for (let i = 0; i < text.length; i++) {
        if (!text[i].trim()) continue;
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const r = range.getBoundingClientRect();
        if (!r.width) continue;
        const g = { ch: text[i], x: r.left - box.left, y: r.top - box.top, w: r.width, h: r.height, font, tone: Math.min(2, ti) };
        glyphs.push(g);
        minX = Math.min(minX, g.x); minY = Math.min(minY, g.y);
        maxX = Math.max(maxX, g.x + g.w); maxY = Math.max(maxY, g.y + g.h);
      }
    }
    if (prev) h1.style.setProperty('--ta', prev);
    else h1.style.removeProperty('--ta');
    if (!glyphs.length) { n = 0; return; }

    // Hidden canvas, 1 px = 1 CSS px. Each tone in its own channel so the
    // antialiased edges never blur one tone into the other.
    const pad = cell * 2;
    const ox = Math.floor(minX - pad);
    const oy = Math.floor(minY - pad);
    const W = Math.ceil(maxX + pad) - ox;
    const H = Math.ceil(maxY + pad) - oy;
    const off = document.createElement('canvas');
    off.width = W;
    off.height = H;
    const o = off.getContext('2d', { willReadFrequently: true })!;
    o.textBaseline = 'alphabetic';
    const paint = ['#f00', '#0f0', '#00f'];
    for (const g of glyphs) {
      o.font = g.font;
      const m = o.measureText(g.ch);
      const asc = m.fontBoundingBoxAscent ?? m.actualBoundingBoxAscent;
      const desc = m.fontBoundingBoxDescent ?? m.actualBoundingBoxDescent;
      o.fillStyle = paint[g.tone];
      o.fillText(g.ch, g.x - ox, g.y - oy + (g.h - (asc + desc)) / 2 + asc);
    }
    const data = o.getImageData(0, 0, W, H).data;

    const cols = Math.floor(W / cell);
    const rows = Math.floor(H / cell);
    const hx: number[] = [], hy: number[] = [], ht: number[] = [];
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        let a = 0;
        const ch = [0, 0, 0];
        for (let y = cy * cell; y < cy * cell + cell; y++) {
          for (let x = cx * cell; x < cx * cell + cell; x++) {
            const k = (y * W + x) * 4;
            const al = data[k + 3];
            a += al;
            ch[0] += data[k] * al; ch[1] += data[k + 1] * al; ch[2] += data[k + 2] * al;
          }
        }
        if (a / (cell * cell) < 110) continue; // less than ~43% covered
        hx.push(ox + cx * cell);
        hy.push(oy + cy * cell);
        ht.push(ch[0] >= ch[1] && ch[0] >= ch[2] ? 0 : ch[1] >= ch[2] ? 1 : 2);
      }
    }

    n = hx.length;
    fx = Float32Array.from(hx);
    fy = Float32Array.from(hy);
    tone = Uint8Array.from(ht);
    jr = new Float32Array(n);
    ja = new Float32Array(n);
    jw = new Float32Array(n);
    delay = new Float32Array(n);
    base = new Float32Array(n);
    const fs = parseFloat(getComputedStyle(h1).fontSize) || 80;
    amp = fs * 0.75;
    freq = 1 / (fs * 2.2);
    const spread = fs * 0.5;
    const rand = mulberry(n * 7919 + Math.round(fs));
    const span = Math.max(1, maxX - minX);
    for (let i = 0; i < n; i++) {
      // soft, roughly gaussian scatter, most squares close to home
      jr[i] = spread * Math.sqrt(-2 * Math.log(1 - rand() * 0.98));
      ja[i] = rand() * Math.PI * 2;
      jw[i] = (0.12 + rand() * 0.22) * (rand() < 0.5 ? -1 : 1);
      // left to right, with a little play
      delay[i] = ((fx[i] - minX) / span) * 0.4 + rand() * 0.05;
      // some squares fainter than others: depth, like smoke
      base[i] = 0.16 + rand() * 0.28;
    }
  }

  function render() {
    const dpr = canvas.width / Math.max(1, canvas.clientWidth);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const q = p / 0.6;
    const z = time * 0.11;
    let lastTone = -1;
    for (let i = 0; i < n; i++) {
      const e = ease(clamp01((q - delay[i]) / 0.55));
      let x = fx[i];
      let y = fy[i];
      let s = cell;
      let a = 1;
      if (e < 1) {
        const nx = fx[i] * freq;
        const ny = fy[i] * freq;
        const ang = ja[i] + jw[i] * time;
        const cx = fx[i] + amp * fbm(nx, ny, z) + jr[i] * Math.cos(ang);
        const cy = fy[i] + amp * 0.7 * fbm(nx + 17.3, ny - 9.1, z) + jr[i] * 0.8 * Math.sin(ang);
        x = cx + (fx[i] - cx) * e;
        y = cy + (fy[i] - cy) * e;
        s = cell * (3 - 2 * e);
        a = base[i] + (1 - base[i]) * e;
      }
      if (tone[i] !== lastTone) { lastTone = tone[i]; ctx.fillStyle = colors[lastTone]; }
      ctx.globalAlpha = a;
      const S = Math.max(1, Math.round(s * dpr));
      ctx.fillRect(Math.round((x + cell / 2) * dpr - S / 2), Math.round((y + cell / 2) * dpr - S / 2), S, S);
    }
    ctx.globalAlpha = 1;
  }

  function apply() {
    // 0.6 → 0.75: squares out, the real h1 in
    const f = clamp01((p - 0.6) / 0.15);
    h1.style.setProperty('--ta', String(f));
    canvas.style.opacity = String(fade.a * (1 - f));
  }

  function frame(now: number) {
    raf = 0;
    if (!running) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    time += dt;
    render();
    apply();
    raf = requestAnimationFrame(frame);
  }

  // The cloud only moves while it can be seen: hero on screen, tab active,
  // squares not yet faded away
  function sync() {
    const go = started && !dead && visible && !document.hidden && p < 0.75 && n > 0;
    if (go === running) return;
    running = go;
    if (go) { last = 0; raf = requestAnimationFrame(frame); }
    else { cancelAnimationFrame(raf); raf = 0; apply(); }
  }

  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); });
  io.observe(hero);
  const onVis = () => sync();
  document.addEventListener('visibilitychange', onVis);

  // Rebuild only if the title itself moved or changed size (a width change, a
  // new line break); the iPhone toolbar changing the height leaves it alone
  let t = 0;
  const onResize = () => {
    clearTimeout(t);
    t = window.setTimeout(() => {
      const r = h1.getBoundingClientRect();
      const b = canvas.getBoundingClientRect();
      const s = `${r.left - b.left}|${r.top - b.top}|${r.width}|${r.height}|${b.width}|${heroIsMobile()}`;
      if (s === sig) return;
      sig = s;
      build();
      if (!running) { render(); apply(); }
    }, 150);
  };

  return {
    start() {
      document.fonts.ready.then(() => {
        if (dead) return;
        const r = h1.getBoundingClientRect();
        const b = canvas.getBoundingClientRect();
        sig = `${r.left - b.left}|${r.top - b.top}|${r.width}|${r.height}|${b.width}|${heroIsMobile()}`;
        build();
        window.addEventListener('resize', onResize);
        started = true;
        render();
        apply();
        gsap.to(fade, { a: 1, duration: 0.8, ease: 'expo.out', onUpdate: apply });
        sync();
      });
    },
    progress(v: number) {
      p = clamp01(v);
      if (!started) return;
      if (!running) { render(); apply(); }
      sync();
    },
    destroy() {
      dead = true;
      running = false;
      cancelAnimationFrame(raf);
      clearTimeout(t);
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('resize', onResize);
      gsap.killTweensOf(fade);
    },
  };
}

/* Small helpers: a seeded random and smooth 3D value noise (two octaves) */
function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(x: number, y: number, z: number) {
  let h = Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1) ^ Math.imul(z, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) & 0xffff) / 0x7fff - 1;
}

function noise(x: number, y: number, z: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  return l(
    l(l(hash(xi, yi, zi), hash(xi + 1, yi, zi), u), l(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), u), v),
    l(l(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), u), l(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), u), v),
    w
  );
}

const fbm = (x: number, y: number, z: number) => noise(x, y, z) * 0.7 + noise(x * 2.1 + 5.2, y * 2.1 - 3.7, z * 1.6) * 0.3;
