import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { Flip } from 'gsap/Flip';
import { CustomEase } from 'gsap/CustomEase';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText, Flip, CustomEase);
// The brief's curve, cubic-bezier(0.16, 1, 0.3, 1), usable as ease: 'om'
CustomEase.create('om', '0.16,1,0.3,1');
// The iPhone toolbar resizing the viewport must never re-measure the triggers
// (the home hero is a 200svh+ scrub: a refresh mid-scroll would make it jump)
ScrollTrigger.config({ ignoreMobileResize: true });

export { gsap, ScrollTrigger, SplitText, Flip };

export const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
export const isMobile = () => window.matchMedia('(max-width: 899px)').matches;
/** The home reel switches to its vertical cut under 768px. */
export const heroIsMobile = () => window.matchMedia('(max-width: 767px)').matches;

gsap.defaults({ ease: 'expo.out', duration: 0.8 });
// Same curve as the brief's cubic-bezier(0.16, 1, 0.3, 1)
export const EASE_OUT = 'expo.out';
export const EASE_IO = 'expo.inOut';

export let lenis: Lenis | null = null;

export function initLenis() {
  if (reduced) return;
  lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 1, smoothWheel: true, autoRaf: false });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis?.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

export function stopScroll() {
  lenis?.stop();
  document.documentElement.style.overflow = 'hidden';
}
export function startScroll() {
  document.documentElement.style.overflow = '';
  lenis?.start();
}

export function scrollVelocity() {
  return lenis ? lenis.velocity : 0;
}

/** Resolves when the preloader starts lifting (or right away if it already ran). */
export function preloaderExit(): Promise<void> {
  const w = window as any;
  if (w.__omPre !== 'running') return Promise.resolve();
  return new Promise((res) => window.addEventListener('om:pre-exit', () => res(), { once: true }));
}

export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function nextFrame() {
  return new Promise((r) => requestAnimationFrame(() => r(null)));
}
