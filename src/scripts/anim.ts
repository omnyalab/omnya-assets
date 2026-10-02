// Generic, attribute-driven page animations.
// [data-split]          heading lines rise from under a mask ("intro" = plays on page reveal)
// [data-reveal]         desktop only: frame opens with a clip-path mask as it enters
// [data-fade]           small text fades up ("data-intro" = plays on page reveal)
// [data-num]            project numbers rise from under a mask
//
// Images never move with the scroll: no parallax, no scale, no skew. On touch
// screens they are simply there, still.
// [data-lazy-video]     muted loops, loaded and played only on screen
// [data-film]           click-to-play film with sound
//
// Timing rule for the whole site: 0.6 to 0.9s, expo.out (= cubic-bezier(0.16, 1, 0.3, 1)),
// and things that enter together are staggered, never fired all at once.
import { gsap, ScrollTrigger, SplitText, reduced, fine, isMobile } from './core';

const D = 0.85; // default duration
const EASE = 'expo.out';

let ctx: gsap.Context | null = null;
let pageId = 0;
let disposers: Array<() => void> = [];
export const onDestroy = (fn: () => void) => disposers.push(fn);

export function destroyPage() {
  pageId++;
  disposers.forEach((fn) => {
    try { fn(); } catch (e) { console.error(e); }
  });
  disposers = [];
  ctx?.revert();
  ctx = null;
  ScrollTrigger.getAll().forEach((t) => t.kill());
}

/** Run fn inside the current page context so it is reverted on navigation. */
export function inPage(fn: () => void) {
  if (ctx) ctx.add(fn);
  else fn();
}

/** Run fn when the page intro starts, unless the user already left the page. */
export function onIntro(intro: Promise<void>, fn: () => void) {
  const id = pageId;
  intro.then(() => { if (id === pageId) inPage(fn); });
}

export async function initPage(intro: Promise<void>) {
  const id = pageId;
  const alive = () => id === pageId;
  ctx = gsap.context(() => {});
  const myCtx = ctx;
  await document.fonts.ready;
  if (!alive()) return;

  const scope = document.body;
  const splits: Array<{ el: HTMLElement; split: SplitText }> = [];

  myCtx.add(() => {
    scope.querySelectorAll<HTMLElement>('[data-split]').forEach((el) => {
      if (reduced) { el.classList.add('is-split'); return; }
      const split = SplitText.create(el, {
        type: 'lines',
        mask: 'lines',
        linesClass: 'line',
        autoSplit: true,
        onSplit(self) {
          // start fully below the (padded) mask
          if (!el.dataset.played) gsap.set(self.lines, { yPercent: 135 });
        },
      });
      el.classList.add('is-split');
      splits.push({ el, split });
    });
  });

  lazyVideos(scope);
  films(scope);

  await intro;
  if (!alive()) return;
  releaseMedia(scope);

  myCtx.add(() => {
    splits.forEach(({ el, split }) => {
      const play = (delay = 0) => {
        el.dataset.played = '1';
        gsap.to(split.lines, { yPercent: 0, duration: D, stagger: 0.08, delay, ease: EASE });
      };
      if (el.dataset.split === 'intro') play(Number(el.dataset.delay || 0));
      else ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: () => play() });
    });

    if (reduced) return;

    // Project numbers: a soft rise from under a mask
    const nums = gsap.utils.toArray<HTMLElement>('[data-num] > span', scope);
    const rise = (els: Element[], delay = 0) =>
      gsap.fromTo(els, { y: 0, yPercent: 105 }, { yPercent: 0, duration: 0.8, delay, stagger: 0.06, ease: EASE });
    const introNums = nums.filter((n) => n.parentElement!.dataset.num === 'intro');
    if (introNums.length) rise(introNums, 0.1);
    const laterNums = nums.filter((n) => n.parentElement!.dataset.num !== 'intro');
    if (laterNums.length) ScrollTrigger.batch(laterNums, { start: 'top 96%', once: true, onEnter: (b) => rise(b) });

    const fades = gsap.utils.toArray<HTMLElement>('[data-fade]', scope);
    fades.filter((el) => el.hasAttribute('data-intro')).forEach((el) => {
      gsap.fromTo(el, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.8, delay: Number(el.dataset.fade || 0), ease: EASE });
    });
    const later = fades.filter((el) => !el.hasAttribute('data-intro'));
    if (later.length) {
      ScrollTrigger.batch(later, {
        start: 'top 94%',
        once: true,
        onEnter: (b) => gsap.fromTo(b, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.08, ease: EASE }),
      });
    }

    // Everything below is desktop only: on touch screens images stay perfectly still
    if (!fine) return;

    // Frames: the mask opens from the bottom, the picture itself never moves
    const frames = gsap.utils.toArray<HTMLElement>('[data-reveal]', scope);
    const open = (els: HTMLElement[]) => {
      const ready = els.map((el) => {
        const img = el.querySelector('img');
        if (!img || img.complete) return Promise.resolve();
        return Promise.race([img.decode().catch(() => {}), new Promise((r) => setTimeout(r, 1200))]);
      });
      Promise.all(ready).then(() => {
        if (!alive()) return;
        inPage(() => {
          gsap.fromTo(els, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: D, ease: EASE, stagger: 0.12 });
        });
      });
    };
    if (frames.length) ScrollTrigger.batch(frames, { start: 'top 94%', once: true, onEnter: (b) => open(b as HTMLElement[]) });

    const ftr = document.querySelector<HTMLElement>('[data-ftr]');
    if (ftr) {
      gsap.fromTo(ftr, { yPercent: -14 }, {
        yPercent: 0, ease: 'none',
        scrollTrigger: { trigger: ftr.parentElement, start: 'top bottom', end: 'bottom bottom', scrub: true },
      });
    }
  });

  ScrollTrigger.refresh();
}

/* ---------- Deferred media: nothing offscreen loads before the first paint ----------
   Pictures get their file when they come within a screen and a half of the
   viewport. This used to hand everything to the browser at once with
   loading="lazy"; on iPhone Safari a lazy image whose src arrives from script
   after the page has laid out could stay unloaded (an empty grey frame) until
   something forced a new layout. Our own observer does not depend on that. */
function releaseMedia(scope: HTMLElement) {
  const imgs = Array.from(scope.querySelectorAll<HTMLImageElement>('img[data-src]'));
  const load = (img: HTMLImageElement) => {
    if (!img.dataset.src) return;
    if (img.dataset.srcset) img.srcset = img.dataset.srcset;
    img.src = img.dataset.src;
    img.removeAttribute('data-src');
    img.removeAttribute('data-srcset');
  };
  if (imgs.length) {
    if (!('IntersectionObserver' in window)) imgs.forEach(load);
    else {
      const io = new IntersectionObserver(
        (entries) => entries.forEach((e) => {
          if (!e.isIntersecting) return;
          // [data-load-group] (e.g. a horizontal carousel): pictures clipped by
          // the scroller never intersect, so the whole group loads together
          const group = e.target.closest('[data-load-group]');
          const batch = group ? Array.from(group.querySelectorAll<HTMLImageElement>('img[data-src]')) : [e.target as HTMLImageElement];
          batch.forEach((img) => { io.unobserve(img); load(img); });
        }),
        { rootMargin: '150% 0px 150% 0px' }
      );
      imgs.forEach((img) => io.observe(img));
      onDestroy(() => io.disconnect());
    }
  }
  scope.querySelectorAll<HTMLVideoElement>('video[data-poster]').forEach((v) => {
    v.poster = v.dataset.poster!;
    v.removeAttribute('data-poster');
  });
}

/* ---------- Videos ---------- */
function pickSrc(v: HTMLVideoElement) {
  return (isMobile() ? v.dataset.srcM : v.dataset.srcD) || v.dataset.srcD || '';
}

function lazyVideos(scope: HTMLElement) {
  const vids = scope.querySelectorAll<HTMLVideoElement>('[data-lazy-video]');
  if (!vids.length) return;
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        const v = e.target as HTMLVideoElement;
        if (e.isIntersecting) {
          if (!v.src) { v.src = pickSrc(v); v.load(); }
          if (!reduced) v.play().catch(() => {});
        } else if (!v.paused) v.pause();
      });
    },
    { rootMargin: '25% 0px' }
  );
  vids.forEach((v) => io.observe(v));
  onDestroy(() => {
    io.disconnect();
    vids.forEach((v) => v.pause());
  });
}

function films(scope: HTMLElement) {
  scope.querySelectorAll<HTMLElement>('[data-film]').forEach((wrap) => {
    const v = wrap.querySelector('video')!;
    const btn = wrap.querySelector<HTMLButtonElement>('.film__play')!;
    btn.addEventListener('click', () => {
      if (!v.src) v.src = pickSrc(v);
      v.muted = false;
      v.controls = true;
      wrap.classList.add('is-playing');
      v.play().catch(() => {});
    });
    onDestroy(() => v.pause());
  });
}
