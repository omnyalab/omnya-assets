// Learn: playbooks (PDF), private lessons and the community waitlist.
// Every button goes through /go/<id>, so Vercel Analytics counts the click as a page view
// before the visitor leaves for the checkout or the booking page.
// Checkout and booking links stay empty until the Stripe and Cal.com accounts exist:
// until then each button opens WhatsApp with the request already written.
import type { Lang } from '../i18n';

export type ProductId = 'white-to-real' | 'reel' | 'before-it-exists' | 'bundle' | 'session' | 'build' | 'community'
  // offers shown only after a purchase, on /learn/thanks/<product>
  | 'session-reader' | 'rest-30' | 'rest-50' | 'build-upgrade' | 'sample'
  // the other two playbooks after buying 02 (€30) or 03 (€40), with the 7/11 prices (01 €79, 02 €49, 03 €39)
  | 'rest-02' | 'rest-03'
  // everything we teach: four Full blueprints (Tower, 3D, Build, Towers: the City one left the pack on 9/11, Towers joined it the same day, Nico) and the three playbooks, €59 from 9/11 (€39 on 7/11), only in the funnels
  | 'everything'
  // the free PDF people claim from the reel DM, on /learn/<word>
  | 'free'
  // the free tower PDF, on /the-tower-blueprint (3/11)
  | 'free-tower'
  // the paid tower PDF, offered right under the free one on /the-tower-blueprint (4/11)
  | 'full-tower'
  // the free and the paid 3D-to-film PDFs, on /3d-to-film (4/11)
  | 'free-3d'
  | 'full-3d'
  // the free and the paid city PDFs, on /the-city-blueprint (5/11, Omnya City reel)
  | 'free-city'
  | 'full-city'
  // the free and the paid "Hold to build" PDFs, on /the-build-blueprint (9/11, the house that builds itself, word BUILD)
  | 'free-build'
  | 'full-build'
  // the free and the paid three-tower PDFs, on /the-towers-blueprint (9/11, "Choose your view" reels, word TOWERS)
  | 'free-towers'
  | 'full-towers';

export const products: { id: ProductId; checkout: string }[] = [
  { id: 'white-to-real', checkout: 'https://buy.stripe.com/aFaeVcbgVdQA2dwaix8so0s' },
  { id: 'reel', checkout: 'https://buy.stripe.com/3cI28q84J5k47xQ3U98so0t' },
  { id: 'before-it-exists', checkout: 'https://buy.stripe.com/6oUaEWdp3eUEcSabmB8so0u' },
  { id: 'bundle', checkout: 'https://buy.stripe.com/14A8wO5WB6o82dwfCR8so03' },
  { id: 'session', checkout: 'https://buy.stripe.com/7sY14m2KpfYI19s2Q58so04' },
  { id: 'build', checkout: 'https://buy.stripe.com/00w5kCacR27SbO6bmB8so05' },
  { id: 'community', checkout: '' },
  { id: 'session-reader', checkout: 'https://buy.stripe.com/00w7sKet74g03hA62h8so06' },
  { id: 'rest-30', checkout: 'https://buy.stripe.com/9B66oGbgVaEo9FYgGV8so07' },
  { id: 'rest-50', checkout: 'https://buy.stripe.com/bJedR870F9Ak5pI0HX8so08' },
  { id: 'rest-02', checkout: 'https://buy.stripe.com/fZu9ASdp3eUE6tM62h8so0v' },
  { id: 'rest-03', checkout: 'https://buy.stripe.com/6oUfZget7aEoaK29et8so0w' },
  // €59 from 9/11 (Nico: "only here"); the €39 link was https://buy.stripe.com/9B68wOgBf13O6tMbmB8so0r
  { id: 'everything', checkout: 'https://buy.stripe.com/5kQcN4bgVbIs6tMeyN8so0C' },
  { id: 'build-upgrade', checkout: 'https://buy.stripe.com/8x23cufxbcMw4lE76l8so09' },
  { id: 'sample', checkout: '' },
  { id: 'free', checkout: '/learn/free/omnya-lab-blueprint.pdf' },
  { id: 'free-tower', checkout: '/learn/free/omnya-lab-tower-blueprint.pdf' },
  // €5.99 from Monday 9 November (Nico, 8/11); the old €19 link was https://buy.stripe.com/aFa4gyckZh2M7xQ8ap8so0b
  { id: 'full-tower', checkout: 'https://buy.stripe.com/cNi9AS1GlfYI5pI4Yd8so0z' },
  { id: 'free-3d', checkout: '/learn/free/omnya-lab-3d-to-film-blueprint.pdf' },
  // €5.99 from Monday 9 November (Nico, 8/11: every €1.99 PDF goes to €5.99); the old €19 link was https://buy.stripe.com/eVq8wO4SxeUE4lE1M18so0d
  { id: 'full-3d', checkout: 'https://buy.stripe.com/28EcN4dp34g0bO6fCR8so0A' },
  { id: 'free-city', checkout: '/learn/free/omnya-lab-city-blueprint.pdf' },
  // the Full City Blueprint at €5.99 from 9/11 (Nico, 8/11); the old €19 link was https://buy.stripe.com/00w6oGfxbcMw2dw4Yd8so0k
  { id: 'full-city', checkout: 'https://buy.stripe.com/bJecN4gBfcMwf0icqF8so0B' },
  { id: 'free-build', checkout: '/learn/free/omnya-lab-build-blueprint.pdf' },
  // the Full Build Blueprint at €5.99 (€29 struck), Stripe link created 9/11 with Nico's ok (product "The Full Build Blueprint", back to /learn/thanks/full-build)
  { id: 'full-build', checkout: 'https://buy.stripe.com/5kQ3cuacR3bW2dwgGV8so0D' },
  { id: 'free-towers', checkout: '/learn/free/omnya-lab-towers-blueprint.pdf' },
  // the Full Towers Blueprint at €5.99 (€29 struck), Stripe link created 9/11 with Nico's ok (product "The Full Towers Blueprint", back to /learn/thanks/full-towers)
  { id: 'full-towers', checkout: 'https://buy.stripe.com/28E00i2Kp4g04lEbmB8so0E' },
];

/**
 * The Full Tower Blueprint launch price: €1.99 instead of €19 because we hit 1,000 followers (5/11; €4.99 for 500 on 4/11),
 * until Sunday 8 November at midnight, Rome time. After that the page shows `then` (€5.99, Nico 8/11, not €19)
 * and /go/full-tower sends to the €5.99 link by itself. Same for the Full 3D and the Full City (Nico 8/11).
 */
export const fullTowerDeal = {
  until: '2026-11-08T23:59:59+01:00',
  checkout: 'https://buy.stripe.com/14AfZg2Kp13O8BUcqF8so0e',
  price: 1.99,
  was: 19,
  off: 90,
  then: 5.99,
};
export const dealOn = (now = Date.now()) => now < Date.parse(fullTowerDeal.until);

/** The Full Blueprint (How to make a 3D that sells with AI, 4/11): the same launch, €1.99 until the same Sunday. */
export const full3dDeal = { ...fullTowerDeal, checkout: 'https://buy.stripe.com/5kQaEW1Gl9Akg4m62h8so0f' };

/** The Full City Blueprint (5/11): the same 1,000 followers launch, €1.99 until Sunday. */
export const fullCityDeal = { ...fullTowerDeal, checkout: 'https://buy.stripe.com/4gMfZg3Ot3bWbO6duJ8so0g' };

/** All three playbooks: €79 again from 7/11 (Nico: the €39 price is only for "Everything we teach" after a free blueprint). The 6/11 €39 deal is off. */
export const bundleDeal = { ...fullTowerDeal, until: '2026-11-07T00:00:00+01:00', checkout: '' };

/** Playbook prices from 7/11 (one by one €167, all three €79). Used for the "Are you sure?" box and the funnels. */
export const prices = { 'white-to-real': 79, reel: 49, 'before-it-exists': 39, bundle: 79, everything: 59 } as const;

/**
 * After each purchase the checkout returns to /learn/thanks/<product>. That page makes one
 * offer that exists only there (oto), the most natural next step for that buyer, and if
 * they pass, a smaller one (down). Every price is real: a lesson for readers, or the
 * difference to the next tier. No countdowns, no fake scarcity.
 */
export const thanks: Partial<Record<ProductId, { kind: 'pdf' | 'lesson'; oto: ProductId; down: ProductId }>> = {
  // 01 costs as much as all three, so after it there is no "other two" offer (7/11)
  'white-to-real': { kind: 'pdf', oto: 'session-reader', down: 'sample' },
  reel: { kind: 'pdf', oto: 'rest-02', down: 'session-reader' },
  'before-it-exists': { kind: 'pdf', oto: 'rest-03', down: 'sample' },
  everything: { kind: 'pdf', oto: 'session-reader', down: 'sample' },
  bundle: { kind: 'pdf', oto: 'session-reader', down: 'community' },
  session: { kind: 'lesson', oto: 'build-upgrade', down: 'sample' },
  build: { kind: 'lesson', oto: 'sample', down: 'community' },
  'full-tower': { kind: 'pdf', oto: 'sample', down: 'community' },
  'full-3d': { kind: 'pdf', oto: 'sample', down: 'community' },
  'full-city': { kind: 'pdf', oto: 'sample', down: 'community' },
  'full-build': { kind: 'pdf', oto: 'sample', down: 'community' },
  'full-towers': { kind: 'pdf', oto: 'sample', down: 'community' },
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
    'full-city': ['How to build a 3D city that goes viral with AI', 'full-city-blueprint.pdf'],
    'full-build': ['How to build a house that builds itself', 'full-build-blueprint.pdf'],
    'full-towers': ['How to build three towers you choose the view of', 'full-towers-blueprint.pdf'],
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
    'full-city': ['How to build a 3D city that goes viral with AI (EN)', '../en/full-city-blueprint.pdf'],
    'full-build': ['How to build a house that builds itself (EN)', '../en/full-build-blueprint.pdf'],
    'full-towers': ['How to build three towers you choose the view of (EN)', '../en/full-towers-blueprint.pdf'],
  },
} as const;
type FileKey = keyof (typeof pdfs)['en'];
const bundleFiles: FileKey[] = ['white-to-real', 'reel', 'before-it-exists', 'prompts', 'checklist'];
// 9/11 (Nico): the Full Build Blueprint replaces the Full City one in the pack
// 9/11 (Nico): the Full Towers Blueprint joins the pack, nothing taken out
const everythingFiles: FileKey[] = ['full-tower', 'full-3d', 'full-build', 'full-towers', ...bundleFiles];

/** What a buyer downloads after paying for a PDF product (the bundle gets all five files). */
export function filesFor(id: ProductId, lang: Lang) {
  const keys: FileKey[] = id === 'bundle' ? bundleFiles : id === 'everything' ? everythingFiles : id in pdfs.en ? [id as FileKey] : [];
  return keys.map((k) => ({ name: pdfs[lang][k][0], href: `${FILES}/${lang}/${pdfs[lang][k][1]}` }));
}

/** Where a lesson buyer picks the day and time: our booking pages (Session 60 min, Build two calls of 90). */
export const booking: Partial<Record<ProductId, string>> = {
  session: '/book/session',
  build: '/book/build',
};
