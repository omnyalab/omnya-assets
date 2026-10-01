import type { TransitionBeforePreparationEvent, TransitionBeforeSwapEvent } from 'astro:transitions/client';
import { gsap, ScrollTrigger, fine, heroIsMobile, initLenis, lenis, preloaderExit, startScroll, stopScroll, wait } from './core';
import { initPage, destroyPage } from './anim';
import { leave, enter, type Mode } from './transition';
import { initCursor, initSheet, initMenu, initHeaderLoop, initScrollbar, collectHeaderZones, initClocks, closeSheet, closeMenu } from './ui';
import { home, work, project, contactPage } from './pages';

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

// The reel poster (vertical under 768px, only that one is fetched). On a first
// load it waits for the page to finish loading, so it never competes with the
// first paint; under the preloader it still has all the time it needs.
function releasePoster() {
  document.querySelectorAll<HTMLImageElement>('img[data-early][data-src-d]:not([src])').forEach((img) => {
    img.src = (heroIsMobile() ? img.dataset.srcM : img.dataset.srcD)!;
  });
}
function releasePosterAfterLoad() {
  const later = () => setTimeout(releasePoster, 300);
  if (document.readyState === 'complete') later();
  else window.addEventListener('load', later, { once: true });
}

initLenis();
initCursor();
initSheet();
initHeaderLoop();
initScrollbar();

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
  if (navType !== 'traverse') {
    window.scrollTo(0, 0);
    lenis?.scrollTo(0, { immediate: true, force: true });
  }
  lenis?.resize();
});

document.addEventListener('astro:page-load', () => {
  // First visit: let the first paint happen before these start downloading
  // First visit: let the first paint happen before these start downloading
  if (booted) { releaseEarly(); releasePoster(); }
  else { setTimeout(releaseEarly, 300); releasePosterAfterLoad(); }
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
});
