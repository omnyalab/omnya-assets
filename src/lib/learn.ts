// Learn: playbooks (PDF), private lessons and the community waitlist.
// Every button goes through /go/<id>, so Vercel Analytics counts the click as a page view
// before the visitor leaves for the checkout or the booking page.
// Checkout and booking links stay empty until the Stripe and Cal.com accounts exist:
// until then each button opens WhatsApp with the request already written.
import type { Lang } from '../i18n';

export type ProductId = 'white-to-real' | 'reel' | 'before-it-exists' | 'bundle' | 'session' | 'build' | 'community'
  // offers shown only after a purchase, on /learn/thanks/<product>
  | 'session-reader' | 'rest-30' | 'rest-50' | 'build-upgrade' | 'sample'
  // the free PDF people claim from the reel DM, on /learn/<word>
  | 'free'
  // the free tower PDF, on /the-tower-blueprint (3/11)
  | 'free-tower'
  // the paid tower PDF, offered right under the free one on /the-tower-blueprint (4/11)
  | 'full-tower'
  // the free and the paid 3D-to-film PDFs, on /3d-to-film (4/11)
  | 'free-3d'
  | 'full-3d';

export const products: { id: ProductId; checkout: string }[] = [
  { id: 'white-to-real', checkout: 'https://buy.stripe.com/9B66oGet7bIs3hAeyN8so00' },
  { id: 'reel', checkout: 'https://buy.stripe.com/6oUbJ084J4g06tMfCR8so01' },
  { id: 'before-it-exists', checkout: 'https://buy.stripe.com/9B66oGacReUE2dwfCR8so02' },
  { id: 'bundle', checkout: 'https://buy.stripe.com/14A8wO5WB6o82dwfCR8so03' },
  { id: 'session', checkout: 'https://buy.stripe.com/7sY14m2KpfYI19s2Q58so04' },
  { id: 'build', checkout: 'https://buy.stripe.com/00w5kCacR27SbO6bmB8so05' },
  { id: 'community', checkout: '' },
  { id: 'session-reader', checkout: 'https://buy.stripe.com/00w7sKet74g03hA62h8so06' },
  { id: 'rest-30', checkout: 'https://buy.stripe.com/9B66oGbgVaEo9FYgGV8so07' },
  { id: 'rest-50', checkout: 'https://buy.stripe.com/bJedR870F9Ak5pI0HX8so08' },
  { id: 'build-upgrade', checkout: 'https://buy.stripe.com/8x23cufxbcMw4lE76l8so09' },
  { id: 'sample', checkout: '' },
  { id: 'free', checkout: '/learn/free/omnya-lab-blueprint.pdf' },
  { id: 'free-tower', checkout: '/learn/free/omnya-lab-tower-blueprint.pdf' },
  { id: 'full-tower', checkout: 'https://buy.stripe.com/aFa4gyckZh2M7xQ8ap8so0b' },
  { id: 'free-3d', checkout: '/learn/free/omnya-lab-3d-to-film-blueprint.pdf' },
  // €19 after Sunday 8 November; until then /go/full-3d sends to the €4.99 link (full3dDeal)
  { id: 'full-3d', checkout: 'https://buy.stripe.com/eVq8wO4SxeUE4lE1M18so0d' },
];

/**
 * The Full Tower Blueprint launch price (4/11): €4.99 instead of €19 because we hit 500 followers,
 * until Sunday 8 November at midnight, Rome time. After that the page shows €19 and /go/full-tower
 * sends to the €19 link by itself, so the offer really ends.
 */
export const fullTowerDeal = {
  until: '2026-11-08T23:59:59+01:00',
  checkout: 'https://buy.stripe.com/9B6fZg4Sx13O8BUfCR8so0a',
  price: 4.99,
  was: 19,
  off: 74,
};
export const dealOn = (now = Date.now()) => now < Date.parse(fullTowerDeal.until);

/** The Full Blueprint (How to make a 3D that sells with AI, 4/11): the same launch, €4.99 until the same Sunday. */
export const full3dDeal = { ...fullTowerDeal, checkout: 'https://buy.stripe.com/8x2aEW98N7scg4m2Q58so0c' };

/**
 * After each purchase the checkout returns to /learn/thanks/<product>. That page makes one
 * offer that exists only there (oto), the most natural next step for that buyer, and if
 * they pass, a smaller one (down). Every price is real: a lesson for readers, or the
 * difference to the next tier. No countdowns, no fake scarcity.
 */
export const thanks: Partial<Record<ProductId, { kind: 'pdf' | 'lesson'; oto: ProductId; down: ProductId }>> = {
  'white-to-real': { kind: 'pdf', oto: 'session-reader', down: 'rest-30' },
  reel: { kind: 'pdf', oto: 'session-reader', down: 'rest-50' },
  'before-it-exists': { kind: 'pdf', oto: 'sample', down: 'rest-50' },
  bundle: { kind: 'pdf', oto: 'session-reader', down: 'community' },
  session: { kind: 'lesson', oto: 'build-upgrade', down: 'sample' },
  build: { kind: 'lesson', oto: 'sample', down: 'community' },
  'full-tower': { kind: 'pdf', oto: 'sample', down: 'community' },
  'full-3d': { kind: 'pdf', oto: 'sample', down: 'community' },
};

/** The words used in the reels ("Comment 3D"). Each one has its own page, /learn/<word>, and leads with one playbook. */
export const words: { word: string; label: string; focus: ProductId }[] = [
  { word: '3d', label: '3D', focus: 'white-to-real' },
  { word: 'ai', label: 'AI', focus: 'reel' },
  { word: 'claude', label: 'CLAUDE', focus: 'reel' },
  { word: 'dubai', label: 'DUBAI', focus: 'before-it-exists' },
];

const WA = 'https://wa.me/393792220465?text=';

/** Where a button goes when its checkout link is still empty: a WhatsApp message naming the product. */
export function fallback(id: ProductId, lang: Lang, name: string, word?: string) {
  const from = word ? (lang === 'it' ? ` (da ${word.toUpperCase()})` : ` (from ${word.toUpperCase()})`) : '';
  const msg =
    id === 'community'
      ? lang === 'it'
        ? `Ciao Nico, mettimi in lista per la community Before It Exists${from}.`
        : `Hi Nico, put me on the list for the Before It Exists community${from}.`
      : id === 'session' || id === 'build'
        ? lang === 'it'
          ? `Ciao Nico, vorrei prenotare la lezione ${name}${from}.`
          : `Hi Nico, I’d like to book the ${name} lesson${from}.`
        : lang === 'it'
          ? `Ciao Nico, voglio ${name}${from}.`
          : `Hi Nico, I want ${name}${from}.`;
  return WA + encodeURIComponent(msg);
}

/** /go/<id>, with the reel word when the visit came from one. */
export const goHref = (id: ProductId, lang: Lang, word?: string) =>
  `${lang === 'it' ? '/it' : ''}/go/${id}${word ? `?k=${word}` : ''}`;

/** The paid files: private links, not linked from any page and not indexed (see vercel.json).
    The page after a purchase is the only place that shows them. */
const FILES = '/learn/files/61dd51d89913fd69';
const pdfs = {
  en: {
    'white-to-real': ['From 3D to real photo', 'playbook-01-from-3d-to-real-photo.pdf'],
    reel: ['The reel they comment on', 'playbook-02-the-reel-they-comment-on.pdf'],
    'before-it-exists': ['Sell it before it exists', 'playbook-03-sell-it-before-it-exists.pdf'],
    prompts: ['The full prompt files', 'bundle-the-full-prompt-files.pdf'],
    checklist: ['The checklist before every delivery', 'bundle-the-checklist-before-every-delivery.pdf'],
    'full-tower': ['How to build a tower that sells with AI', 'full-tower-blueprint.pdf'],
    'full-3d': ['How to make a 3D that sells with AI', 'full-3d-blueprint.pdf'],
  },
  it: {
    'white-to-real': ['Dal 3D alla foto vera', 'playbook-01-dal-3d-alla-foto-vera.pdf'],
    reel: ['Il reel che fa commentare', 'playbook-02-il-reel-che-fa-commentare.pdf'],
    'before-it-exists': ['Vendilo prima che esista', 'playbook-03-vendilo-prima-che-esista.pdf'],
    prompts: ['I file di prompt completi', 'pacchetto-i-file-di-prompt-completi.pdf'],
    checklist: ['Il controllo prima di ogni consegna', 'pacchetto-il-controllo-prima-di-ogni-consegna.pdf'],
    // only in English: the Italian page gives the English file
    'full-tower': ['How to build a tower that sells with AI (EN)', '../en/full-tower-blueprint.pdf'],
    'full-3d': ['How to make a 3D that sells with AI (EN)', '../en/full-3d-blueprint.pdf'],
  },
} as const;
type FileKey = keyof (typeof pdfs)['en'];
const bundleFiles: FileKey[] = ['white-to-real', 'reel', 'before-it-exists', 'prompts', 'checklist'];

/** What a buyer downloads after paying for a PDF product (the bundle gets all five files). */
export function filesFor(id: ProductId, lang: Lang) {
  const keys: FileKey[] = id === 'bundle' ? bundleFiles : id in pdfs.en ? [id as FileKey] : [];
  return keys.map((k) => ({ name: pdfs[lang][k][0], href: `${FILES}/${lang}/${pdfs[lang][k][1]}` }));
}

/** Where a lesson buyer picks the day and time: our booking pages (Session 60 min, Build two calls of 90). */
export const booking: Partial<Record<ProductId, string>> = {
  session: '/book/session',
  build: '/book/build',
};
