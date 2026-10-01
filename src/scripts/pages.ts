import { gsap, ScrollTrigger, Flip, reduced, fine, isMobile, heroIsMobile } from './core';
import { onDestroy, inPage, onIntro } from './anim';
import { contact } from '../lib/contact';

/* ---------- Home ---------- */
export function home(intro: Promise<void>) {
  seeAll();
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  const video = hero?.querySelector('video');
  if (!hero || !video) return;

  inPage(() => {
    // Measured on the reel itself, which starts at rest at the top of the page
    const scrub = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };
    ScrollTrigger.create({
      trigger: hero, start: 'top top', end: 'bottom top',
      onLeave: () => video.pause(),
      onEnterBack: () => video.play().catch(() => {}),
    });
    if (reduced) return;
    // The reel itself never moves: only a darkening veil (desktop) and the cue fading out
    if (fine) gsap.to(hero.querySelector('.hero__dim'), { opacity: 0.5, ease: 'none', scrollTrigger: scrub });
    if (fine) gsap.to(hero.querySelector('.hero__cue'), {
      opacity: 0, ease: 'none',
      scrollTrigger: { trigger: document.body, start: 'top top', end: '+=160', scrub: true },
    });
  });

  onIntro(intro, () => {
    // The reel only starts downloading once the page is on screen, and only the
    // file for this screen: vertical 9:16 under 768px, 16:9 above
    if (!video.getAttribute('src')) video.src = (heroIsMobile() ? video.dataset.srcM : video.dataset.srcD)!;
    video.preload = 'auto';
    video.play().catch(() => {});
    // Browsers pause muted video in background tabs: resume when visible again
    const resume = () => {
      if (!document.hidden && video.paused && window.scrollY < window.innerHeight) video.play().catch(() => {});
    };
    document.addEventListener('visibilitychange', resume);
    onDestroy(() => document.removeEventListener('visibilitychange', resume));
  });
}

/* "See all the work": two rows of gallery shots slide in opposite directions.
   Each row repeats its own set as many times as the screen needs and moves by
   exactly one set per loop, so there is never a gap. Runs only while visible. */
function seeAll() {
  const card = document.querySelector<HTMLElement>('[data-seeall]');
  if (!card) return;
  const tracks = Array.from(card.querySelectorAll<HTMLElement>('[data-track]'));
  let anims: Animation[] = [];
  let visible = false;

  const build = () => {
    anims.forEach((a) => a.cancel());
    anims = [];
    tracks.forEach((track) => {
      const n = Number(track.dataset.n || track.children.length);
      track.dataset.n = String(n);
      while (track.children.length > n) track.lastElementChild!.remove();
      const set = Array.from(track.children) as HTMLElement[];
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      const setW = set.reduce((w, el) => w + el.getBoundingClientRect().width + gap, 0);
      if (!setW) return;
      const copies = Math.ceil(window.innerWidth / setW) + 1;
      for (let c = 0; c < copies; c++) set.forEach((el) => track.append(el.cloneNode(true)));
      if (reduced) return;
      const right = track.parentElement!.dataset.dir === 'right';
      const speed = isMobile() ? 28 : 42; // px per second, same feel on any screen
      const a = track.animate(
        [{ transform: `translate3d(${right ? -setW : 0}px,0,0)` }, { transform: `translate3d(${right ? 0 : -setW}px,0,0)` }],
        { duration: (setW / speed) * 1000, iterations: Infinity }
      );
      if (!visible) a.pause();
      anims.push(a);
    });
  };
  build();

  // Load every picture (copies included) when the card gets close
  const near = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    near.disconnect();
    card.querySelectorAll<HTMLImageElement>('img[data-seeall-src]').forEach((img) => {
      img.src = img.dataset.seeallSrc!;
      img.removeAttribute('data-seeall-src');
    });
  }, { rootMargin: '100% 0px' });
  near.observe(card);
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    anims.forEach((a) => (visible ? a.play() : a.pause()));
  });
  io.observe(card);

  // Rebuild only when the width changes: on iPhone the Safari bar changes the
  // height while scrolling, and that must never restart the rows.
  let t = 0;
  let lastW = window.innerWidth;
  const onResize = () => {
    if (window.innerWidth === lastW) return;
    lastW = window.innerWidth;
    clearTimeout(t);
    t = window.setTimeout(build, 200);
  };
  window.addEventListener('resize', onResize);
  onDestroy(() => {
    near.disconnect();
    io.disconnect();
    window.removeEventListener('resize', onResize);
    anims.forEach((a) => a.cancel());
  });
}

/* ---------- Work: category filter with Flip ---------- */
export function work() {
  const grid = document.querySelector<HTMLElement>('[data-wgrid]');
  const buttons = document.querySelectorAll<HTMLButtonElement>('[data-filter]');
  if (!grid || !buttons.length) return;
  const cards = Array.from(grid.querySelectorAll<HTMLElement>('[data-cat]'));

  const relayout = () => {
    let i = 0;
    cards.forEach((c) => {
      if (c.classList.contains('is-hidden')) return;
      c.dataset.slot = String(i % 4);
      const shape = c.dataset.o === 'vertical' || i % 4 === 1 || i % 4 === 2 ? 'tall' : i % 4 === 3 ? 'wide' : '';
      c.dataset.shape = shape;
      c.querySelector<HTMLElement>('.frame')?.style.setProperty('--ar', shape === 'tall' ? '4 / 5' : shape === 'wide' ? '3 / 2' : '16 / 10');
      i++;
    });
  };

  buttons.forEach((b) =>
    b.addEventListener('click', () => {
      const f = b.dataset.filter!;
      buttons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      const state = Flip.getState(cards);
      grid.style.minHeight = `${grid.offsetHeight}px`;
      cards.forEach((c) => c.classList.toggle('is-hidden', f !== 'all' && c.dataset.cat !== f));
      relayout();
      // Revealed already: keep frames open after a filter change
      cards.forEach((c) => c.querySelectorAll<HTMLElement>('[data-reveal]').forEach((r) => gsap.set(r, { clipPath: 'inset(0% 0% 0% 0%)' })));
      const done = () => { grid.style.minHeight = ''; ScrollTrigger.refresh(); };
      if (reduced) { done(); return; }
      Flip.from(state, {
        duration: 0.8,
        ease: 'expo.out',
        absolute: true,
        nested: true,
        onEnter: (els) => gsap.fromTo(els, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out', delay: 0.15, stagger: 0.08 }),
        onLeave: (els) => gsap.to(els, { opacity: 0, duration: 0.3 }),
        onComplete: done,
      });
    })
  );
}

/* ---------- Project ---------- */
export function project() {
  const hero = document.querySelector<HTMLElement>('[data-phero]');
  // The cover stays still; on desktop only the title drifts away as you scroll
  if (!hero || reduced || !fine) return;
  inPage(() => {
    gsap.to(hero.querySelector('.phero__txt'), {
      yPercent: -30, opacity: 0, ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom 30%', scrub: true },
    });
  });
}

/* ---------- Contact: Calendly inline, loaded only when near ---------- */
export function contactPage() {
  const box = document.querySelector<HTMLElement>('[data-calendly]');
  if (!box) return;
  const url = `${contact.calendly}?hide_gdpr_banner=1&background_color=edeae4&text_color=111111&primary_color=111111`;
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      loadCalendly().then(() => {
        const w = window as any;
        if (!box.isConnected || !w.Calendly) return;
        w.Calendly.initInlineWidget({ url, parentElement: box.querySelector('[data-calendly-mount]') });
      });
    },
    { rootMargin: '0px 0px 150px 0px' }
  );
  io.observe(box);
  onDestroy(() => io.disconnect());
}

let calendlyP: Promise<void> | null = null;
function loadCalendly() {
  if (calendlyP) return calendlyP;
  calendlyP = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://assets.calendly.com/assets/external/widget.js';
    s.async = true;
    s.onload = () => res();
    s.onerror = () => rej();
    document.head.append(s);
  });
  return calendlyP;
}
