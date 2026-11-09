import { gsap, ScrollTrigger, Flip, reduced, fine, isMobile, lenis } from './core';
import { onDestroy, inPage } from './anim';
import { hero } from './hero';

/* ---------- Project cards on touch screens ----------
   No cursor to say "View": the same circle appears on the picture while the
   card crosses the middle of the screen, and goes when it leaves. */
function cardHints() {
  if (fine) return;
  const cards = document.querySelectorAll<HTMLElement>('.pcard');
  if (!cards.length) return;
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.target.classList.toggle('is-center', e.isIntersecting)),
    { rootMargin: '-45% 0px -45% 0px' }
  );
  cards.forEach((c) => io.observe(c));
  onDestroy(() => io.disconnect());
}

/* ---------- [data-hbar]: under a carousel that scrolls sideways (phones), a hairline with a
   terracotta capsule that shows how much you see and where you are ---------- */
export function hbars() {
  document.querySelectorAll<HTMLElement>('[data-hbar]').forEach((list) => {
    const bar = document.createElement('div');
    bar.className = 'hbar';
    bar.setAttribute('aria-hidden', 'true');
    bar.innerHTML = '<i></i>';
    list.after(bar);
    const cap = bar.firstElementChild as HTMLElement;
    const upd = () => {
      const max = list.scrollWidth - list.clientWidth;
      bar.classList.toggle('is-off', max < 4);
      const w = list.clientWidth / Math.max(1, list.scrollWidth);
      cap.style.width = `${w * 100}%`;
      cap.style.transform = `translateX(${(max > 0 ? list.scrollLeft / max : 0) * ((1 - w) / w) * 100}%)`;
    };
    list.addEventListener('scroll', upd, { passive: true });
    window.addEventListener('resize', upd);
    upd();
    onDestroy(() => window.removeEventListener('resize', upd));
  });
}

/* ---------- [data-play]: plays once by itself when it comes into view (not tied to the scroll) ---------- */
export function playOnView() {
  const els = document.querySelectorAll<HTMLElement>('[data-play]');
  if (!els.length) return;
  if (reduced) { els.forEach((el) => el.classList.add('is-play')); return; }
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-play'); io.unobserve(e.target); } }),
    { threshold: 0.45 }
  );
  els.forEach((el) => io.observe(el));
  onDestroy(() => io.disconnect());
}

/* ---------- Home ---------- */
export function home(intro: Promise<void>) {
  seeAll();
  cardHints();
  hero(intro);
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
  cardHints();
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

/* ---------- Contact: the booking box stays closed until "Book a call" opens it ---------- */
export function contactPage() {
  const box = document.querySelector<HTMLElement>('[data-book-box]');
  if (!box) return;
  const open = (scroll: boolean) => {
    box.classList.remove('is-closed');
    ScrollTrigger.refresh();
    lenis?.resize();
    if (!scroll) return;
    if (lenis && !reduced) lenis.scrollTo(box, { duration: 1.2, offset: -80 });
    else box.scrollIntoView({ behavior: 'auto' });
  };
  const btns = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-book-open]'));
  const onClick = (e: Event) => { e.preventDefault(); e.stopPropagation(); open(true); };
  btns.forEach((b) => b.addEventListener('click', onClick));
  if (location.hash === '#book') open(false);
  onDestroy(() => btns.forEach((b) => b.removeEventListener('click', onClick)));
}

/* ---------- [data-lazyvideo]: a muted preview that loads and plays only while it is on screen ---------- */
export function lazyVideos() {
  // phones go straight to the tower's phone page, without the redirect the computer page makes (one trip less)
  if (matchMedia('(max-width: 820px)').matches || /iPhone|Android.+Mobile/i.test(navigator.userAgent)) {
    document.querySelectorAll<HTMLAnchorElement>('a[href="/demo/choose-your-floor/"]').forEach((a) => (a.href = '/demo/choose-your-floor/m/'));
  }
  const vids = document.querySelectorAll<HTMLVideoElement>('video[data-lazyvideo]');
  if (!vids.length) return;
  if (reduced) return;
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      const v = e.target as HTMLVideoElement;
      if (e.isIntersecting) { v.preload = 'auto'; v.play().catch(() => {}); } else v.pause();
      if (!v.dataset.on) { v.dataset.on = '1'; v.addEventListener('playing', () => v.classList.add('is-on'), { once: true }); }
    }),
    { rootMargin: '200px 0px' }
  );
  vids.forEach((v) => io.observe(v));
  onDestroy(() => io.disconnect());
}

/* ---------- Prices, the "i" next to a name: a small card with the description and a preview.
   Next to the button on desktop (hover or click), a sheet from the bottom on phones. ---------- */
export function priceInfo() {
  const pop = document.querySelector<HTMLElement>('[data-info-pop]');
  const btns = document.querySelectorAll<HTMLButtonElement>('[data-info]');
  if (!pop || !btns.length) return;
  const body = pop.querySelector<HTMLElement>('[data-info-body]')!;
  let open: HTMLButtonElement | null = null;
  let timer = 0;
  let leave = 0;
  if (fine) {
    pop.addEventListener('mouseenter', () => window.clearTimeout(leave));
    pop.addEventListener('mouseleave', () => { leave = window.setTimeout(close, 280); });
  }
  const place = (b: HTMLButtonElement) => {
    if (!window.matchMedia('(min-width: 900px)').matches) { pop.style.left = ''; pop.style.top = ''; return; }
    const r = b.getBoundingClientRect();
    const w = pop.offsetWidth, h = pop.offsetHeight;
    const left = Math.min(Math.max(16, r.left - 12), window.innerWidth - w - 16);
    const below = r.bottom + 12;
    const top = below + h < window.innerHeight - 16 ? below : Math.max(16, r.top - h - 12);
    pop.style.left = `${left}px`; pop.style.top = `${top}px`;
  };
  const close = () => {
    if (!open) return;
    open.setAttribute('aria-expanded', 'false');
    open = null;
    pop.classList.remove('is-open');
    window.clearTimeout(timer);
    timer = window.setTimeout(() => { if (!open) { pop.hidden = true; body.innerHTML = ''; } }, 350);
  };
  const show = (b: HTMLButtonElement) => {
    if (open === b) return;
    if (open) open.setAttribute('aria-expanded', 'false');
    const tpl = document.getElementById(`info-${b.dataset.info}`) as HTMLTemplateElement | null;
    if (!tpl) return;
    window.clearTimeout(timer);
    body.innerHTML = '';
    body.append(tpl.content.cloneNode(true));
    pop.setAttribute('aria-label', b.getAttribute('aria-label') || '');
    pop.hidden = false;
    open = b;
    b.setAttribute('aria-expanded', 'true');
    place(b);
    body.querySelector('video')?.play().catch(() => {});
    requestAnimationFrame(() => pop.classList.add('is-open'));
  };
  btns.forEach((b) => {
    b.setAttribute('aria-expanded', 'false');
    b.addEventListener('click', (e) => { e.stopPropagation(); open === b ? close() : show(b); });
    if (fine) {
      b.addEventListener('mouseenter', () => { window.clearTimeout(leave); show(b); });
      b.addEventListener('mouseleave', () => { leave = window.setTimeout(close, 280); });
    }
  });
  pop.querySelector('[data-info-close]')?.addEventListener('click', close);
  const outside = (e: Event) => { if (open && !pop.contains(e.target as Node)) close(); };
  const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { const b = open; close(); b?.focus(); } };
  document.addEventListener('click', outside);
  document.addEventListener('keydown', esc);
  window.addEventListener('scroll', close, { passive: true });
  onDestroy(() => {
    document.removeEventListener('click', outside);
    document.removeEventListener('keydown', esc);
    window.removeEventListener('scroll', close);
    pop.hidden = true;
  });
}
