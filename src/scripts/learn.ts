// Learn page hero: the 3D model over the final image, same camera.
// Phones: you land on the 3D and the scroll wipes it into the photo under the title, all the
// way, with a short hold before the page moves on. Desktop: the line sweeps once on arrival,
// then it is yours to drag.
// The pictures never move; only the line does. Room buttons swap both pictures.
// Keyboard and screen readers use the range input, kept in sync with the line.
import { gsap, ScrollTrigger, reduced } from './core';
import { onDestroy } from './anim';

export function learn() {
  const box = document.querySelector<HTMLElement>('[data-cmp]');
  if (!box) return;
  const range = box.querySelector<HTMLInputElement>('[data-cmp-range]')!;
  const white = box.querySelector<HTMLImageElement>('[data-cmp-white]')!;
  const real = box.querySelector<HTMLImageElement>('[data-cmp-real]')!;
  const whiteM = box.querySelector<HTMLSourceElement>('[data-cmp-white-m]')!;
  const realM = box.querySelector<HTMLSourceElement>('[data-cmp-real-m]')!;
  const ac = new AbortController();
  const opt = { signal: ac.signal };
  const state = { x: 100 };

  const set = (pct: number) => {
    state.x = Math.min(100, Math.max(0, pct));
    box.style.setProperty('--x', `${state.x}%`);
    range.value = String(Math.round(state.x));
  };

  const hero = document.querySelector<HTMLElement>('[data-lhero]')!;
  const phone = window.matchMedia('(max-width: 899px)').matches && !reduced;

  // The sweep: model, then the photo wipes in, and the line rests in the middle
  let sweep: gsap.core.Timeline | null = null;
  const play = (delay = 0.5) => {
    sweep?.kill();
    if (reduced) return set(50);
    set(100);
    sweep = phone
      ? gsap.timeline({ onComplete: () => { sweep = null; } }).to(state, { x: 0, duration: 1.6, ease: 'expo.inOut', onUpdate: () => set(state.x) })
      : gsap.timeline({ delay })
        .to(state, { x: 8, duration: 1.9, ease: 'expo.inOut', onUpdate: () => set(state.x) })
        .to(state, { x: 50, duration: 1.1, ease: 'expo.out', onUpdate: () => set(state.x) });
  };
  const stopSweep = () => { sweep?.kill(); sweep = null; };

  let wipe: ScrollTrigger | null = null;
  if (phone) {
    // The wipe ends at 82% of the runway: the photo is whole before the page starts to move
    set(100);
    wipe = ScrollTrigger.create({
      trigger: hero,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (st) => { if (!sweep) set(100 - Math.min(1, st.progress / 0.82) * 100); },
    });
  } else play();

  // The other views load quietly once the page has settled, so switching is instant
  const warm = () => document.querySelectorAll<HTMLButtonElement>('[data-room]').forEach((b) => {
    const mobile = window.matchMedia('(max-width: 699px)').matches;
    [mobile ? b.dataset.whiteM : b.dataset.white, mobile ? b.dataset.realM : b.dataset.real].forEach((src) => { if (src) new Image().src = src; });
  });
  const idle = setTimeout(warm, 4000);
  onDestroy(() => clearTimeout(idle));

  const fromEvent = (e: PointerEvent) => {
    const r = box.getBoundingClientRect();
    set(((e.clientX - r.left) / r.width) * 100);
  };
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let decided = false;
  box.addEventListener('pointerdown', (e) => {
    stopSweep();
    dragging = true;
    decided = e.pointerType === 'mouse';
    startX = e.clientX;
    startY = e.clientY;
    if (decided) { box.classList.add('is-drag'); fromEvent(e); }
  }, opt);
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    // On touch, a mostly vertical move is a scroll, not a drag
    if (!decided) {
      const dx = Math.abs(e.clientX - startX);
      const dy = Math.abs(e.clientY - startY);
      if (dx < 6 && dy < 6) return;
      if (dy > dx) { dragging = false; return; }
      decided = true;
      box.classList.add('is-drag');
    }
    fromEvent(e);
  }, opt);
  const stop = () => { dragging = false; box.classList.remove('is-drag'); };
  window.addEventListener('pointerup', stop, opt);
  window.addEventListener('pointercancel', stop, opt);
  range.addEventListener('input', () => { stopSweep(); set(Number(range.value)); }, opt);

  document.querySelectorAll<HTMLButtonElement>('[data-room]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.getAttribute('aria-pressed') === 'true') return;
      document.querySelectorAll('[data-room]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      white.src = btn.dataset.white!;
      whiteM.srcset = btn.dataset.whiteM!;
      real.src = btn.dataset.real!;
      realM.srcset = btn.dataset.realM!;
      real.alt = btn.dataset.alt!;
      play(0);
    }, opt);
  });

  onDestroy(() => { stopSweep(); wipe?.kill(); ac.abort(); });
}
