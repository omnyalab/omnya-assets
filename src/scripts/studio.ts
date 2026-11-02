// Studio page.
// - Posters: the giant word rises from behind the building (1.1s, expo.out).
// - From model to image: one frame, four stages, driven by a single value p (0..3).
//   Everywhere the section is pinned and the scroll scrubs p, snapping on each
//   stage; when the picture reaches 04 the page scrolls on. Desktop (fine
//   pointer, 900px+): the pin lasts three screens. Touch and small screens: two
//   screens (200svh), so a thumb gets through it without effort.
//   The dots 01-04 show the stage; tapping one scrolls the page to that stage.
//   Changing view always starts again from stage 01: the page goes back to the
//   start of the pinned section (invisible, the section is pinned).
//   Reduced motion: a still grid (CSS), only the view buttons work.
// - Timings: the figures count up from zero once, in 1.2s.
// The pictures never move with the scroll: only the stage changes.
import { gsap, ScrollTrigger, SplitText, reduced, lenis } from './core';
import { onDestroy, inPage, onIntro } from './anim';
import createGlobe from 'cobe';

const EASE = 'expo.out';
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

export function studio(intro: Promise<void>) {
  globe();
  posters(intro);
  stages();
  times();
}

/* ---------- The globe (2/11): Venice and Dubai, swinging gently between the two;
   drag it with the mouse or a finger, and it settles back between the studios ---------- */
function globe() {
  const box = document.querySelector<HTMLElement>('[data-globe]');
  const canvas = box?.querySelector('canvas');
  if (!box || !canvas) return;
  // the angle that turns a longitude to face us (cobe's own formula)
  const face = (lng: number) => Math.PI - ((lng * Math.PI) / 180 - Math.PI / 2);
  const venice = face(12.33), dubai = face(55.27);
  const mid = (venice + dubai) / 2, swing = (venice - dubai) / 2 + 0.12;
  let width = 0, drag = 0, offset = 0, down: number | null = null, t = 0;
  // the two names sit as pills on their dots: each frame we turn the point like cobe turns the globe
  const pins = [
    { el: box.querySelector<HTMLElement>('[data-pin="venice"]'), lat: 45.44, lng: 12.33 },
    { el: box.querySelector<HTMLElement>('[data-pin="dubai"]'), lat: 25.2, lng: 55.27 },
  ];
  const theta = 0.5;
  const place = (phi: number) => {
    const r = width * 0.4; // cobe draws the sphere at 80% of the canvas
    pins.forEach(({ el, lat, lng }) => {
      if (!el) return;
      const a = (lat * Math.PI) / 180, b = (lng * Math.PI) / 180 - Math.PI, c = Math.cos(a);
      const x = -c * Math.cos(b), y = Math.sin(a), z = c * Math.sin(b);
      const x1 = x * Math.cos(phi) + z * Math.sin(phi), z1 = -x * Math.sin(phi) + z * Math.cos(phi);
      const y2 = y * Math.cos(theta) - z1 * Math.sin(theta), z2 = y * Math.sin(theta) + z1 * Math.cos(theta);
      el.style.transform = `translate(${width / 2 + x1 * r}px, ${width / 2 - y2 * r}px)`;
      el.style.opacity = z2 > 0.15 ? '1' : '0';
    });
  };
  const size = () => (width = canvas.offsetWidth);
  size();
  const g = createGlobe(canvas, {
    devicePixelRatio: 2, width: width * 2, height: width * 2, phi: mid, theta,
    dark: 0, diffuse: 1.2, mapSamples: 22000, mapBrightness: 6, mapBaseBrightness: 0.05,
    baseColor: [0.93, 0.8, 0.72], markerColor: [0.72, 0.38, 0.24], glowColor: [0.98, 0.93, 0.88],
    markers: [{ location: [45.44, 12.33], size: 0.06 }, { location: [25.2, 55.27], size: 0.06 }],
    onRender: (st) => {
      if (!reduced && down === null) t += 0.006;
      if (down === null) offset *= 0.97; // after a drag, back between the two studios
      st.phi = mid + Math.sin(t) * swing + offset + drag;
      st.width = width * 2; st.height = width * 2;
      place(st.phi);
    },
  });
  canvas.style.cursor = 'grab';
  const start = (x: number) => { down = x; canvas.style.cursor = 'grabbing'; };
  const move = (x: number) => { if (down !== null) drag = (x - down) / 160; };
  const end = () => { if (down === null) return; offset += drag; drag = 0; down = null; canvas.style.cursor = 'grab'; };
  canvas.addEventListener('pointerdown', (e) => start(e.clientX));
  window.addEventListener('pointermove', (e) => move(e.clientX));
  window.addEventListener('pointerup', end);
  canvas.addEventListener('touchmove', (e) => move(e.touches[0].clientX), { passive: true });
  window.addEventListener('resize', size);
  requestAnimationFrame(() => box.classList.add('is-on'));
  onDestroy(() => { g.destroy(); window.removeEventListener('resize', size); window.removeEventListener('pointerup', end); });
}

/* ---------- Posters ---------- */
function posters(intro: Promise<void>) {
  if (reduced) return;
  const rise = (els: Element[]) =>
    gsap.fromTo(els, { y: 0, yPercent: 102 }, { yPercent: 0, duration: 1.1, stagger: 0.08, ease: EASE });
  document.querySelectorAll<HTMLElement>('[data-poster]').forEach((poster) => {
    const words = Array.from(poster.querySelectorAll('.poster__w'));
    if (poster.dataset.poster === 'intro') onIntro(intro, () => rise(words));
    else inPage(() => ScrollTrigger.create({ trigger: poster, start: 'top 62%', once: true, onEnter: () => rise(words) }));
  });
}

/* ---------- From model to image ---------- */
function loadStageImgs(scope: ParentNode) {
  const imgs = Array.from(scope.querySelectorAll<HTMLImageElement>('img[data-stage-src]'));
  return Promise.all(
    imgs.map((img) => {
      img.srcset = img.dataset.stageSrcset || '';
      img.src = img.dataset.stageSrc!;
      img.removeAttribute('data-stage-src');
      img.removeAttribute('data-stage-srcset');
      return img.decode().catch(() => {});
    })
  );
}

function stages() {
  const root = document.querySelector<HTMLElement>('[data-stages]');
  if (!root) return;
  const live = root.querySelector<HTMLElement>('[data-stages-live]')!;
  const still = root.querySelector<HTMLElement>('[data-stages-still]')!;
  const sets = reduced
    ? Array.from(still.querySelectorAll<HTMLElement>('[data-still-list]'))
    : Array.from(live.querySelectorAll<HTMLElement>('[data-frame]'));
  let view = 0;

  // Pictures load only when the section gets close: the open view first, then the other
  const loaded = new Set<number>();
  const ensure = (v: number) => {
    if (loaded.has(v)) return Promise.resolve();
    loaded.add(v);
    return loadStageImgs(sets[v]).then(() => undefined);
  };
  const near = new IntersectionObserver(
    ([e]) => {
      if (!e.isIntersecting) return;
      near.disconnect();
      ensure(view).then(() => ensure(view ? 0 : 1));
    },
    { rootMargin: '100% 0px 100% 0px' }
  );
  near.observe(root);
  onDestroy(() => near.disconnect());

  if (reduced) {
    const pills = Array.from(still.querySelectorAll<HTMLButtonElement>('[data-still-view]'));
    pills.forEach((b, i) =>
      b.addEventListener('click', () => {
        view = i;
        ensure(i);
        pills.forEach((x, j) => x.setAttribute('aria-pressed', String(j === i)));
        sets.forEach((l, j) => l.classList.toggle('is-on', j === i));
      })
    );
    return;
  }

  /* --- Live version --- */
  const frames = sets;
  const parts = frames.map((f) => ({
    stages: Array.from(f.querySelectorAll<HTMLElement>('[data-stage]')),
    wip: f.querySelector<HTMLImageElement>('.stage--3 img')!,
    ui: f.querySelector<HTMLElement>('.stages__ui')!,
    status: f.querySelector<HTMLElement>('[data-status]')!,
    bar: f.querySelector<HTMLElement>('[data-bar]')!,
    line: f.querySelector<HTMLElement>('[data-line]')!,
  }));
  const words = (live.dataset.words || '').split('|'); // Generating | Refining | Delivered
  const pills = Array.from(live.querySelectorAll<HTMLButtonElement>('[data-view]'));
  const dots = Array.from(live.querySelectorAll<HTMLButtonElement>('[data-goto]'));
  const blocks = Array.from(live.querySelectorAll<HTMLElement>('[data-stage-txt]'));
  const state = { p: 0 };
  let shown = 0; // stage whose text is on screen
  let pin: ScrollTrigger | null = null; // the pin, while active
  let pinTw: gsap.core.Tween | null = null;
  let lastStatus = '';

  const render = () => {
    const p = state.p;
    const f = parts[view];
    const dis = seg(p, 0.15, 0.85);
    const w23 = seg(p, 1.15, 1.85);
    const def = seg(p, 2, 2.55);
    const w34 = seg(p, 2.5, 2.95);
    f.stages[1].style.opacity = String(dis);
    f.stages[2].style.clipPath = `inset(0 ${(1 - w23) * 100}% 0 0)`;
    f.stages[3].style.clipPath = `inset(0 ${(1 - w34) * 100}% 0 0)`;
    // stage 3: the final picture still being made, slowly getting sharper
    f.wip.style.filter = `blur(${18 - 13 * def}px) saturate(${0.6 * def})`;
    f.wip.style.transform = `scale(${1.04 - 0.03 * def})`;
    f.wip.style.opacity = String(0.85 + 0.1 * def);
    const wipe = w23 > 0 && w23 < 1 ? w23 : w34 > 0 && w34 < 1 ? w34 : -1;
    f.line.style.opacity = wipe < 0 ? '0' : '1';
    if (wipe >= 0) f.line.style.left = `${wipe * 100}%`;
    f.ui.style.opacity = String(seg(p, 1.5, 1.85));
    const s = words[p < 2.3 ? 0 : p < 2.75 ? 1 : 2] || '';
    if (s !== lastStatus) { f.status.textContent = s; lastStatus = s; }
    f.bar.style.transform = `scaleX(${0.08 + 0.92 * seg(p, 2, 2.95)})`;
    const idx = Math.max(0, Math.min(3, Math.round(p)));
    if (idx !== shown) showText(idx);
  };

  /* Text: number, title and line change with the same mask effect as the headings */
  const splits: SplitText[][] = [];
  let textReady = false;
  const linesOf = (i: number) => splits[i]?.flatMap((s) => s.lines) ?? [];
  const showText = (i: number) => {
    const from = shown;
    shown = i;
    dots.forEach((d, j) => d.setAttribute('aria-pressed', String(j === i)));
    blocks.forEach((b, j) => {
      if (j === i) b.removeAttribute('aria-hidden');
      else b.setAttribute('aria-hidden', 'true');
    });
    if (!textReady) {
      blocks.forEach((b, j) => b.classList.toggle('is-on', j === i));
      return;
    }
    const out = linesOf(from);
    const inn = linesOf(i);
    gsap.killTweensOf([...out, ...inn]);
    blocks[i].classList.add('is-on');
    gsap.to(out, {
      yPercent: -120, duration: 0.6, stagger: 0.04, ease: EASE,
      onComplete: () => { if (shown !== from) blocks[from].classList.remove('is-on'); },
    });
    gsap.fromTo(inn, { yPercent: 135 }, { yPercent: 0, duration: 0.85, stagger: 0.08, delay: 0.08, ease: EASE });
  };

  document.fonts.ready.then(() => {
    if (!root.isConnected) return;
    inPage(() => {
      blocks.forEach((b, i) => {
        splits[i] = Array.from(b.querySelectorAll<HTMLElement>('[data-stage-split]')).map((el) =>
          SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'line', autoSplit: true, aria: 'none' })
        );
      });
      textReady = true;
      // first stage: its text rises when the section comes in, like every heading
      gsap.set(linesOf(0), { yPercent: 135 });
      ScrollTrigger.create({
        trigger: live, start: 'top 75%', once: true,
        onEnter: () => {
          if (shown === 0) gsap.to(linesOf(0), { yPercent: 0, duration: 0.85, stagger: 0.08, ease: EASE });
          else gsap.set(linesOf(0), { yPercent: 0 });
        },
      });
    });
  });

  const setView = (v: number) => {
    if (v === view) return;
    view = v;
    lastStatus = '';
    ensure(v);
    // every view starts from stage 01
    if (pin && pinTw) {
      // jump back to the start of the pinned range. The section is pinned, so
      // the jump is invisible: only the stage goes back to 01.
      if (pin.scroll() > pin.start + 1) {
        if (lenis) lenis.scrollTo(pin.start, { immediate: true, force: true });
        else window.scrollTo(0, pin.start);
        pin.update();
        pin.getTween()?.progress(1); // finish the scrub at its new target, no rewind animation
        pinTw.progress(0);
      }
    } else {
      gsap.killTweensOf(state);
    }
    state.p = 0;
    pills.forEach((b, j) => b.setAttribute('aria-pressed', String(j === v)));
    frames.forEach((f, j) => {
      f.classList.toggle('is-on', j === v);
      if (j === v) f.removeAttribute('aria-hidden');
      else f.setAttribute('aria-hidden', 'true');
    });
    render();
  };
  pills.forEach((b, i) => b.addEventListener('click', () => setView(i)));
  // Dots: scroll to that stage inside the pinned range. While that scroll runs,
  // the snap aims at the same stage instead of guessing from the speed.
  let dotTarget: number | null = null;
  let dotTimer = 0;
  dots.forEach((d) =>
    d.addEventListener('click', () => {
      if (!pin) return;
      const i = Number(d.dataset.goto);
      dotTarget = i / 3;
      clearTimeout(dotTimer);
      dotTimer = window.setTimeout(() => (dotTarget = null), 2000);
      const y = pin.start + ((pin.end - pin.start) * i) / 3;
      if (lenis) lenis.scrollTo(y, { duration: 1 });
      else window.scrollTo({ top: y, behavior: 'smooth' });
    })
  );
  onDestroy(() => clearTimeout(dotTimer));
  render();

  const mm = gsap.matchMedia();
  onDestroy(() => mm.revert());

  // Pinned for `screens` screens, the scroll moves through the stages
  const pinned = (screens: () => number) => {
    const tw = gsap.to(state, {
      p: 3,
      ease: 'none',
      onUpdate: render,
      scrollTrigger: {
        trigger: live,
        start: 'top top',
        end: () => `+=${screens()}`,
        pin: true,
        scrub: 0.8,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        snap: {
          snapTo: (v: number) => dotTarget ?? Math.round(v * 3) / 3,
          duration: { min: 0.3, max: 0.8 }, delay: 0.08, ease: 'power2.inOut',
        },
      },
    });
    pin = tw.scrollTrigger ?? null;
    pinTw = tw;
    return () => { pin = null; pinTw = null; tw.scrollTrigger?.kill(); tw.kill(); state.p = 0; render(); };
  };

  // Desktop: three screens
  mm.add('(min-width: 900px) and (hover: hover) and (pointer: fine)', () => pinned(() => window.innerHeight * 3));

  // Touch and small screens: two screens of the small viewport (200svh), measured
  // once per refresh, so the iPhone toolbar coming and going changes nothing
  mm.add('(max-width: 899px), (hover: none), (pointer: coarse)', () => pinned(() => svh() * 2));
}

/** 100svh in px (the viewport with the iPhone toolbars shown). */
function svh() {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:100svh;visibility:hidden;pointer-events:none';
  document.body.append(probe);
  const h = probe.offsetHeight;
  probe.remove();
  return h || window.innerHeight;
}

/* ---------- Timings: count up once ---------- */
function times() {
  const sec = document.querySelector<HTMLElement>('[data-times]');
  if (!sec || reduced) return;
  const nums = Array.from(sec.querySelectorAll<HTMLElement>('[data-count]'));
  nums.forEach((n) => (n.textContent = '0'));
  inPage(() =>
    ScrollTrigger.create({
      trigger: sec.querySelector('.times__list'),
      start: 'top 85%',
      once: true,
      onEnter: () =>
        nums.forEach((n, i) => {
          const o = { v: 0 };
          const to = Number(n.dataset.count);
          gsap.to(o, { v: to, duration: 1.2, delay: i * 0.08, ease: 'power2.out', onUpdate: () => (n.textContent = String(Math.round(o.v))) });
        }),
    })
  );
}
