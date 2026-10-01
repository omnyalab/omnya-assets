// Page transitions on top of Astro's ClientRouter.
// - Project links: the clicked image grows to full screen and becomes the cover.
// - Everything else: a paper curtain (with the site grain) rises from the bottom,
//   the destination name enters word by word, the page swaps, the curtain lifts.
//   The words enter slowly (0.9s each, 0.12s apart), hold 0.6s, leave in 0.7s,
//   and only then the curtain lifts. All on cubic-bezier(0.16, 1, 0.3, 1).
import { gsap, SplitText, reduced, stopScroll, wait } from './core';
import { projects, slug } from '../lib/data';
import { t, langFromPath, stripLang } from '../i18n';

export type Mode = 'none' | 'curtain' | 'project';

const keys: Record<string, string> = { '/': 'home', '/work': 'work', '/studio': 'studio', '/contact': 'contact', '/privacy-policy': 'privacy' };
const bySlug = new Map(projects.map((p) => [`/work/${slug(p)}`, p]));

/** Two tones [ink, grey], in the language of the destination page. */
function labelFor(url: URL): [string, string] {
  const T = t(langFromPath(url.pathname));
  const path = stripLang(url.pathname).replace(/\/$/, '') || '/';
  const p = bySlug.get(path);
  if (p) return [p.title, T.categories[p.category]];
  return T.transitions[keys[path]] ?? ['Omnya', 'Lab'];
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
let labelSplit: SplitText | null = null;

const layer = () => document.querySelector<HTMLElement>('[data-tlayer]')!;
const curtain = () => document.querySelector<HTMLElement>('[data-curtain]')!;

/* ---------- Out ---------- */
export function leave(source: Element | undefined, to: URL): { mode: Mode; done: Promise<void> } {
  stopScroll();
  if (reduced) return { mode: 'none', done: Promise.resolve() };
  const link = source?.closest?.('[data-plink]') as HTMLElement | null;
  const frame = link?.querySelector<HTMLElement>('[data-cover]');
  if (frame) return { mode: 'project', done: expand(frame) };
  return { mode: 'curtain', done: curtainIn(labelFor(to)) };
}

function expand(frame: HTMLElement) {
  const img = frame.querySelector('img')!;
  const r = frame.getBoundingClientRect();
  const clone = document.createElement('div');
  clone.className = 'tclone';
  const ci = new Image();
  ci.src = img.currentSrc || img.src;
  ci.alt = '';
  clone.append(ci);
  layer().append(clone);
  gsap.set(clone, { left: r.left, top: r.top, width: r.width, height: r.height });
  document.querySelector('[data-hdr]')?.classList.add('is-light');
  gsap.to(document.querySelectorAll('#main, .ftr'), { opacity: 0, duration: 0.6, ease: 'om' });
  // The box grows, the picture inside stays object-fit: cover, so it never stretches
  return gsap
    .to(clone, { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight, duration: 0.9, ease: 'om' })
    .then(() => undefined);
}

function curtainIn([ink, grey]: [string, string]) {
  const c = curtain();
  const t = c.querySelector<HTMLElement>('[data-curtain-label]')!;
  const line = c.querySelector<HTMLElement>('[data-curtain-line]')!;
  labelSplit?.revert();
  t.innerHTML = `${esc(ink)} <span class="mute">${esc(grey)}</span>`;
  labelSplit = SplitText.create(t, { type: 'words', mask: 'words', wordsClass: 'cw' });
  gsap.set([t, line], { yPercent: 0, opacity: 1 });
  // The words take their time: 0.9s each, 0.12s apart, then the name holds
  // still for 0.6s. The curtain only leaves after the text has gone (see out).
  const tl = gsap.timeline();
  tl.fromTo(c, { y: 0, yPercent: 100 }, { y: 0, yPercent: 0, duration: 0.6, ease: 'om' }, 0)
    .to('#main', { y: -40, duration: 0.6, ease: 'om' }, 0)
    .fromTo(line, { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: 'om' }, 0.15)
    .fromTo(labelSplit.words, { yPercent: 140 }, { yPercent: 0, duration: 0.9, stagger: 0.12, ease: 'om' }, 0.2)
    .to({}, { duration: 0.6 }); // hold: readable, nothing moves
  return tl.then(() => undefined);
}

/* ---------- In ---------- */
/** Resolves when the new page should start its own intro. */
export function enter(mode: Mode): Promise<void> {
  if (mode === 'curtain') return curtainOut();
  if (mode === 'project') return dropClone();
  return Promise.resolve();
}

function curtainOut() {
  const c = curtain();
  const t = c.querySelector<HTMLElement>('[data-curtain-label]')!;
  const line = c.querySelector<HTMLElement>('[data-curtain-line]')!;
  // Text leaves softly in 0.7s; the curtain lifts as it finishes
  gsap.timeline({ onComplete: () => gsap.set(c, { yPercent: 100 }) })
    .to([t, line], { yPercent: -20, opacity: 0, duration: 0.7, ease: 'om' }, 0)
    .to(c, { yPercent: -100, duration: 0.7, ease: 'om' }, 0.5);
  // The new page starts its own entrance while the curtain is lifting
  return wait(650);
}

async function dropClone() {
  const clone = layer().querySelector<HTMLElement>('.tclone');
  const hero = document.querySelector<HTMLImageElement>('[data-hero-img]');
  if (hero) {
    try {
      await Promise.race([hero.decode(), wait(1400)]);
    } catch {}
  }
  if (clone) {
    gsap.to(clone, { opacity: 0, duration: 0.6, ease: 'om', onComplete: () => clone.remove() });
  }
  return wait(80);
}
