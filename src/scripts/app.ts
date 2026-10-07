import type { TransitionBeforePreparationEvent, TransitionBeforeSwapEvent } from 'astro:transitions/client';
import { gsap, ScrollTrigger, fine, initLenis, lenis, preloaderExit, startScroll, stopScroll, wait } from './core';
import { initPage, destroyPage } from './anim';
import { leave, enter, type Mode } from './transition';
import { initCursor, initSheet, initMenu, initHeaderLoop, initScrollbar, initScrollLinks, collectHeaderZones, initClocks, closeSheet, closeMenu } from './ui';
import { home, work, project, contactPage } from './pages';
import { studio } from './studio';

(window as any).__omApp = true;
// Dev only: lets the browser console inspect live triggers and tweens
if (import.meta.env.DEV) (window as any).__om = { gsap, ScrollTrigger };
const html = document.documentElement;

// Non-critical images that must still be ready before the preloader lifts
function releaseEarly() {
  document.querySelectorAll<HTMLImageElement>('.logo__img--light[data-src], img[data-early][data-src]').forEach((img) => {
    img.src = img.dataset.src!;
    img.removeAttribute('data-src');
  });
}

initLenis();
initCursor();
initSheet();
initHeaderLoop();
initScrollbar();
initScrollLinks();

let booted = false;
let mode: Mode = 'none';
let navType = 'push';

document.addEventListener('astro:before-preparation', (e) => {
  const ev = e as TransitionBeforePreparationEvent;
  navType = ev.navigationType;
  closeSheet?.();
  closeMenu?.();
  const out = leave(ev.sourceElement, ev.to);
  mode = out.mode;
  const load = ev.loader;
  ev.loader = async () => {
    await Promise.all([load(), out.done]);
  };
});

document.addEventListener('astro:before-swap', (e) => {
  const ev = e as TransitionBeforeSwapEvent;
  // We run our own transitions: skip the browser's one and swallow its expected AbortErrors
  const vt = ev.viewTransition as ViewTransition;
  vt.ready?.catch(() => {});
  vt.finished?.catch(() => {});
  vt.updateCallbackDone?.catch(() => {});
  try { vt.skipTransition(); } catch {}
  destroyPage();
});

document.addEventListener('astro:after-swap', () => {
  html.classList.add('js');
  if (lenis) html.classList.add('lenis', 'lenis-smooth');
  if (lenis && fine) html.classList.add('has-sbar');
  if (fine && document.querySelector('[data-cursor-el]')) html.classList.add('has-dot');
  if (navType !== 'traverse') {
    window.scrollTo(0, 0);
    lenis?.scrollTo(0, { immediate: true, force: true });
  }
  lenis?.resize();
});

document.addEventListener('astro:page-load', () => {
  // First visit: let the first paint happen before these start downloading
  if (booted) releaseEarly();
  else setTimeout(releaseEarly, 300);
  let intro: Promise<void>;
  if (!booted) {
    booted = true;
    if ((window as any).__omPre === 'running') {
      stopScroll();
      intro = preloaderExit().then(() => wait(80));
    } else intro = wait(60);
  } else {
    intro = enter(mode);
  }
  mode = 'none';
  intro.then(startScroll);

  initPage(intro);
  initMenu();
  initClocks();
  collectHeaderZones();

  const page = html.dataset.page;
  if (page === 'home') home(intro);
  if (page === 'work') work();
  if (page === 'project') project();
  if (page === 'contact') contactPage();
  if (page === 'studio') studio(intro);
});
