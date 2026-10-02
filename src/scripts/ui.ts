// Persistent UI: cursor, free-sample sheet, mobile menu, header behaviour,
// WhatsApp button, live clocks. Everything uses delegation so it survives
// page swaps.
import { gsap, fine, reduced, lenis, stopScroll, startScroll } from './core';
import { onDestroy } from './anim';

const html = document.documentElement;

/* ---------- Cursor (desktop only) ---------- */
export function initCursor() {
  if (!fine) return;
  const root = document.querySelector<HTMLElement>('[data-cursor-el]');
  if (!root) return;
  const dot = root.querySelector<HTMLElement>('.cursor__dot')!;
  const bub = root.querySelector<HTMLElement>('.cursor__bub')!;
  const label = root.querySelector<HTMLElement>('[data-cursor-label]')!;
  // The dot replaces the system arrow (see .has-dot in global.css), so it follows almost at once
  html.classList.add('has-dot');
  const qx = [gsap.quickTo(dot, 'x', { duration: 0.08, ease: 'power3' }), gsap.quickTo(bub, 'x', { duration: 0.55, ease: 'power3' })];
  const qy = [gsap.quickTo(dot, 'y', { duration: 0.08, ease: 'power3' }), gsap.quickTo(bub, 'y', { duration: 0.55, ease: 'power3' })];
  let shown = false;
  let mx = -1, my = -1;
  window.addEventListener('mousemove', (e) => {
    mx = e.clientX;
    my = e.clientY;
    if (!shown) {
      shown = true;
      gsap.set([dot, bub], { x: e.clientX, y: e.clientY });
      root.classList.remove('is-hidden');
    }
    qx.forEach((q) => q(e.clientX));
    qy.forEach((q) => q(e.clientY));
  });
  // Content moves under a still mouse while scrolling: re-check what is below it
  window.addEventListener('scroll', () => {
    if (mx < 0) return;
    const t = document.elementFromPoint(mx, my);
    if (t) setState(t);
  }, { passive: true });
  document.addEventListener('mouseover', (e) => setState(e.target as Element));
  function setState(t: Element) {
    const view = t.closest<HTMLElement>('[data-cursor]');
    if (view) {
      label.textContent = view.dataset.cursor || 'View';
      root.classList.add('is-view');
      root.classList.remove('is-link');
      return;
    }
    root.classList.remove('is-view');
    root.classList.toggle('is-link', !!t.closest('a, button'));
  }
  document.documentElement.addEventListener('mouseleave', () => { root.classList.add('is-hidden'); shown = false; });
  document.addEventListener('astro:after-swap', () => root.classList.remove('is-view', 'is-link'));
}

/* ---------- In-page links that scroll smoothly ([data-scroll-to], e.g. the home "Scroll" cue) ---------- */
export function initScrollLinks() {
  document.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[data-scroll-to]');
    if (!a) return;
    const target = document.querySelector<HTMLElement>(a.getAttribute('href') || '');
    if (!target) return;
    e.preventDefault();
    if (lenis && !reduced) lenis.scrollTo(target, { duration: 1.2 });
    else target.scrollIntoView({ behavior: 'auto' });
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });
}

/* ---------- Free-sample sheet ---------- */
let sheetTl: gsap.core.Timeline | null = null;
let lastFocus: HTMLElement | null = null;

export function initSheet() {
  const desktop = () => window.matchMedia('(min-width: 900px)').matches;
  // The sheet is persisted per language, so look it up each time it opens
  let sheet: HTMLElement | null = null;

  const open = () => {
    sheet = document.querySelector<HTMLElement>('[data-sheet]');
    if (!sheet) return;
    const panel = sheet.querySelector<HTMLElement>('[data-sheet-panel]')!;
    const bg = sheet.querySelector<HTMLElement>('.sheet__bg')!;
    const items = sheet.querySelectorAll<HTMLElement>('[data-s]');
    lastFocus = document.activeElement as HTMLElement;
    sheetTl?.kill();
    sheetTl = gsap.timeline({ paused: true })
      .set(sheet, { visibility: 'visible' })
      .to(bg, { opacity: 1, duration: 0.6, ease: 'expo.out' }, 0)
      .fromTo(panel, desktop() ? { xPercent: 100, yPercent: 0 } : { yPercent: 100, xPercent: 0 }, { xPercent: 0, yPercent: 0, duration: 0.8, ease: 'expo.out' }, 0)
      .fromTo(items, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.06, ease: 'expo.out' }, 0.12);
    html.classList.add('sheet-open');
    sheet.setAttribute('aria-hidden', 'false');
    stopScroll();
    if (reduced) sheetTl.progress(1);
    else sheetTl.play(0);
    (sheet.querySelector('.sheet__opt') as HTMLElement)?.focus({ preventScroll: true });
  };
  const close = () => {
    if (!html.classList.contains('sheet-open')) return;
    html.classList.remove('sheet-open');
    sheet?.setAttribute('aria-hidden', 'true');
    if (!html.classList.contains('menu-open')) startScroll();
    if (sheetTl) {
      if (reduced) sheetTl.progress(0);
      else sheetTl.timeScale(1.6).reverse();
    }
    lastFocus?.focus({ preventScroll: true });
  };
  closeSheet = close;

  document.addEventListener('click', (e) => {
    const t = e.target as Element;
    if (t.closest('[data-sample]')) { e.preventDefault(); open(); return; }
    if (t.closest('[data-sheet-close]')) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { close(); closeMenu?.(); }
  });
}
export let closeSheet: (() => void) | null = null;

/* ---------- Mobile menu (per page, lives in the header) ---------- */
export let closeMenu: (() => void) | null = null;

export function initMenu() {
  const btn = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const menu = document.querySelector<HTMLElement>('[data-menu]');
  if (!btn || !menu) return;
  const items = menu.querySelectorAll<HTMLElement>('[data-m]');
  const tl = gsap.timeline({ paused: true })
    .set(menu, { visibility: 'visible' })
    .fromTo(menu, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.8, ease: 'expo.out' })
    .fromTo(items, { yPercent: 50, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.7, stagger: 0.06, ease: 'expo.out' }, 0.15);

  const set = (on: boolean) => {
    html.classList.toggle('menu-open', on);
    btn.setAttribute('aria-expanded', String(on));
    btn.setAttribute('aria-label', (on ? btn.dataset.labelClose : btn.dataset.labelOpen) || '');
    menu.setAttribute('aria-hidden', String(!on));
    if (on) { stopScroll(); reduced ? tl.progress(1) : tl.timeScale(1).play(); }
    else { startScroll(); reduced ? tl.progress(0) : tl.timeScale(1.5).reverse(); }
  };
  const toggle = () => set(!html.classList.contains('menu-open'));
  btn.addEventListener('click', toggle);
  closeMenu = () => { if (html.classList.contains('menu-open')) set(false); };
  onDestroy(() => { tl.kill(); closeMenu = null; });
}

/* ---------- Header: hide on scroll down, light over dark sections ---------- */
let lightEls: HTMLElement[] = [];
export function collectHeaderZones() {
  lightEls = Array.from(document.querySelectorAll<HTMLElement>('[data-header="light"]'));
  updateHeader(true);
}

/** Is the point at viewport height y over a dark section? A sticky section
    (the desktop reel) stops counting where the content sliding over it begins. */
/** The dark section under viewport height y, if any. A sticky section (the
    desktop reel) stops counting where the content sliding over it begins. */
function darkAt(y: number): HTMLElement | null {
  for (const el of lightEls) {
    const r = el.getBoundingClientRect();
    let bottom = r.bottom;
    const until = el.dataset.headerUntil && document.querySelector(el.dataset.headerUntil);
    if (until) bottom = Math.min(bottom, until.getBoundingClientRect().top);
    if (r.top <= y && bottom >= y) return el;
  }
  return null;
}
const isDarkAt = (y: number) => !!darkAt(y);

let lastY = 0;
let fabDown = false;
let fabMoved = 0;
function updateHeader(force = false) {
  const hdr = document.querySelector<HTMLElement>('[data-hdr]');
  if (!hdr) return;
  const y = lenis ? lenis.scroll : window.scrollY;
  const dy = y - lastY;
  if (!html.classList.contains('menu-open')) {
    if (y > 140 && dy > 3) hdr.classList.add('is-hidden');
    else if (dy < -3 || y <= 140) hdr.classList.remove('is-hidden');
  }
  lastY = y;
  const zone = darkAt(hdr.offsetHeight / 2);
  const set = (cls: string, on: boolean) => {
    if (force || hdr.classList.contains(cls) !== on) hdr.classList.toggle(cls, on);
  };
  set('is-light', !!zone);
  // over the reel or a project cover: soft shadow so it reads on any frame
  set('is-media', !!zone && zone.hasAttribute('data-header-media'));
  // on paper, once the page moves: a solid bar (mobile, see CSS)
  set('is-solid', !zone && y > 8);

  // WhatsApp button: out of the way while scrolling down, back when scrolling up
  // or after a short stop; never over the footer
  const fab = document.querySelector<HTMLElement>('[data-fab]');
  if (fab) {
    const now = performance.now();
    if (dy > 2) { fabDown = true; fabMoved = now; }
    else if (dy < -2) { fabDown = false; fabMoved = now; }
    const ftr = document.querySelector('.ftr');
    const overFooter = !!ftr && ftr.getBoundingClientRect().top < window.innerHeight - 8;
    const resting = now - fabMoved > 700;
    fab.classList.toggle('is-on', y > 40 && !overFooter && (!fabDown || resting));
  }
}

export function initHeaderLoop() {
  gsap.ticker.add(() => updateHeader());
}

/* ---------- Clocks in the footer ---------- */
export function initClocks() {
  const spans = document.querySelectorAll<HTMLElement>('[data-tz]');
  if (!spans.length) return;
  const run = () =>
    spans.forEach((s) => {
      const tz = s.dataset.tz!;
      const t = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz }).format(new Date());
      s.textContent = `${s.dataset.city} ${t}`;
    });
  run();
  const id = window.setInterval(run, 15000);
  onDestroy(() => clearInterval(id));
}

/* ---------- Custom scrollbar (desktop, lusion-style) ----------
   A thin pill on the right, driven by Lenis: drag it, click the track to jump,
   it widens on hover and fades when you stop scrolling. Touch keeps the native one. */
export function initScrollbar() {
  if (!fine || !lenis) return;
  const bar = document.querySelector<HTMLElement>('[data-sbar]');
  const thumb = bar?.querySelector<HTMLElement>('[data-sbar-thumb]');
  if (!bar || !thumb) return;
  html.classList.add('has-sbar');
  const l = lenis;
  let th = 48;
  let idle = 0;
  let drag: { y: number; scroll: number } | null = null;

  const wake = () => {
    bar.classList.remove('is-idle');
    clearTimeout(idle);
    idle = window.setTimeout(() => { if (!drag) bar.classList.add('is-idle'); }, 1200);
  };

  const update = () => {
    const limit = l.limit;
    const trackH = bar.clientHeight;
    bar.classList.toggle('is-off', limit < 4);
    if (limit < 4) return;
    th = Math.max(48, (trackH * window.innerHeight) / (limit + window.innerHeight));
    const y = (trackH - th) * Math.min(1, Math.max(0, l.scroll / limit));
    thumb.style.height = `${th}px`;
    thumb.style.transform = `translate3d(0, ${y}px, 0)`;
    // light pill over dark sections (reel, covers, footer)
    bar.classList.toggle('is-light', isDarkAt(bar.getBoundingClientRect().top + y + th / 2));
  };
  gsap.ticker.add(update);
  l.on('scroll', wake);

  thumb.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    drag = { y: e.clientY, scroll: l.scroll };
    thumb.setPointerCapture(e.pointerId);
    bar.classList.add('is-drag');
    wake();
  });
  thumb.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const ratio = l.limit / Math.max(1, bar.clientHeight - th);
    l.scrollTo(drag.scroll + (e.clientY - drag.y) * ratio, { immediate: true });
  });
  const end = () => { drag = null; bar.classList.remove('is-drag'); wake(); };
  thumb.addEventListener('pointerup', end);
  thumb.addEventListener('pointercancel', end);
  bar.addEventListener('pointerdown', (e) => {
    if (e.target === thumb) return;
    const r = bar.getBoundingClientRect();
    const p = (e.clientY - r.top - th / 2) / Math.max(1, r.height - th);
    l.scrollTo(Math.min(1, Math.max(0, p)) * l.limit);
  });
  wake();
}
