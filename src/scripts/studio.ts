// Studio page.
// - Posters: the giant word rises from behind the building (1.1s, expo.out).
// - From model to image: one frame, four stages, driven by a single value p (0..3).
//   Desktop (fine pointer, 900px+): the section is pinned for three screens and the
//   scroll scrubs p, snapping on each stage. Touch: no pin, the stages run on their
//   own (every 2.2s) while the frame is on screen; at the end of a view the next view
//   comes in by itself and starts again from 01. Dots, swipe and the view buttons
//   stop the automatic run.
//   Changing view always starts again from stage 01 (on desktop the page scrolls
//   back to the start of the pinned section).
//   Reduced motion: a still grid (CSS), only the view buttons work.
// - Timings: the figures count up from zero once, in 1.2s.
// The pictures never move with the scroll: only the stage changes.
import { gsap, ScrollTrigger, SplitText, reduced, lenis } from './core';
import { onDestroy, inPage, onIntro } from './anim';

const EASE = 'expo.out';
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

export function studio(intro: Promise<void>) {
  posters(intro);
  stages();
  times();
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
  let pin: ScrollTrigger | null = null; // desktop pin, when active
  let pinTw: gsap.core.Tween | null = null;
  let onUserView: (() => void) | null = null; // touch: a view tap stops the automatic run
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
      // desktop: jump back to the start of the pinned range. The section is pinned,
      // so the jump is invisible: only the stage goes back to 01.
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
  pills.forEach((b, i) => b.addEventListener('click', () => { onUserView?.(); setView(i); }));
  render();

  const mm = gsap.matchMedia();
  onDestroy(() => mm.revert());

  // Desktop: pinned for three screens, the scroll moves through the stages
  mm.add('(min-width: 900px) and (hover: hover) and (pointer: fine)', () => {
    const tw = gsap.to(state, {
      p: 3,
      ease: 'none',
      onUpdate: render,
      scrollTrigger: {
        trigger: live,
        start: 'top top',
        end: () => `+=${window.innerHeight * 3}`,
        pin: true,
        scrub: 0.8,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        snap: { snapTo: [0, 1 / 3, 2 / 3, 1], duration: { min: 0.3, max: 0.8 }, delay: 0.08, ease: 'power2.inOut' },
      },
    });
    pin = tw.scrollTrigger ?? null;
    pinTw = tw;
    return () => { pin = null; pinTw = null; tw.scrollTrigger?.kill(); tw.kill(); state.p = 0; render(); };
  });

  // Touch and small screens: no pin. The stages run once by themselves, then dots and swipe.
  mm.add('(max-width: 899px), (hover: none), (pointer: coarse)', () => {
    const box = live.querySelector<HTMLElement>('[data-stages-frames]')!;
    // durations per step: the 1→2 dissolve lasts 0.6s (it fills 70% of its step)
    const STEP = [0.86, 1.1, 1.4];
    let tween: gsap.core.Tween | null = null;
    let auto: gsap.core.Tween | null = null;
    let user = false;
    let visible = false;

    const goTo = (i: number) => {
      i = Math.max(0, Math.min(3, i));
      const from = state.p;
      if (Math.abs(i - from) < 0.001) return;
      tween?.kill();
      const one = Math.abs(i - from) <= 1.001 && Number.isInteger(from);
      const d = one ? STEP[Math.min(i, from) | 0] : Math.min(1.2, Math.abs(i - from) * 0.5);
      tween = gsap.to(state, { p: i, duration: d, ease: one && i > from && from === 0 ? 'none' : 'power1.inOut', onUpdate: render });
    };
    // one step every 2.2s while the frame is on screen; at stage 04 the next view
    // fades in and runs again from 01. After the last view it stops.
    const next = () => {
      auto = null;
      if (user || !visible) return;
      if (state.p >= 3) {
        if (view >= frames.length - 1) return;
        tween?.kill();
        setView(view + 1);
      } else goTo(Math.round(state.p) + 1);
      auto = gsap.delayedCall(2.2, next);
    };
    const stopAuto = () => { user = true; auto?.kill(); auto = null; };
    onUserView = stopAuto;

    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (!visible) { auto?.kill(); auto = null; return; }
        if (!user && !auto) auto = gsap.delayedCall(2.2, next);
      },
      { threshold: 0.5 }
    );
    io.observe(box);

    const onDot = (e: Event) => {
      const b = (e.currentTarget as HTMLElement);
      stopAuto();
      goTo(Number(b.dataset.goto));
    };
    dots.forEach((d) => d.addEventListener('click', onDot));

    let sx = 0, sy = 0, tracking = false;
    const down = (e: PointerEvent) => { tracking = true; sx = e.clientX; sy = e.clientY; };
    const up = (e: PointerEvent) => {
      if (!tracking) return;
      tracking = false;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      stopAuto();
      goTo(Math.round(state.p) + (dx < 0 ? 1 : -1));
    };
    const cancel = () => { tracking = false; };
    box.addEventListener('pointerdown', down);
    box.addEventListener('pointerup', up);
    box.addEventListener('pointercancel', cancel);

    return () => {
      onUserView = null;
      io.disconnect();
      tween?.kill();
      auto?.kill();
      dots.forEach((d) => d.removeEventListener('click', onDot));
      box.removeEventListener('pointerdown', down);
      box.removeEventListener('pointerup', up);
      box.removeEventListener('pointercancel', cancel);
    };
  });
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
