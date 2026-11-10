// Learn: playbooks (PDF), private lessons and the community waitlist.
// Every button goes through /go/<id>, so Vercel Analytics counts the click as a page view
// before the visitor leaves for the checkout or the booking page.
// Checkout and booking links stay empty until the Stripe and Cal.com accounts exist:
// until then each button opens WhatsApp with the request already written.
import type { Lang } from '../i18n';
import { everythingUpgrade } from '../../api/_lib/learn-upgrade.js';

export type ProductId = 'white-to-real' | 'reel' | 'before-it-exists' | 'bundle' | 'session' | 'build' | 'community'
  // offers shown only after a purchase, on /learn/thanks/<product> (sample, the free image, is not one of them since 10/11:
  // /go/sample stays for the links on the funnel pages)
  | 'session-reader' | 'rest-30' | 'rest-50' | 'build-upgrade' | 'sample'
  // the other two playbooks after buying 02 (€30) or 03 (€40), with the 7/11 prices (01 €79, 02 €49, 03 €39)
  | 'rest-02' | 'rest-03'
  // step 2 (10/11, ready but off): "Everything we teach" for the difference, €53, offered on /learn/thanks/full-* after a verified payment
  | 'everything-upgrade'
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
  | 'full-towers'
  // the Full Towers Blueprint and The Towers Scene File in one payment (10/11, ready but off: its link is empty below)
  | 'full-towers-scene';

/**
 * Step 2 (10/11, Nico): after a Full guide (€5.99) the page /learn/thanks/full-* offers "Everything we teach" for the
 * difference, €53 (€59 minus the €5.99 already paid), only once Stripe has confirmed the payment (views/Thanks.astro),
 * and the email with the PDFs says the same in one line (api/stripe-webhook.js).
 * THE SWITCH is api/_lib/learn-upgrade.js, one file for the site and the webhook: while it is an empty string the block
 * is not in the page at all and the email is as it was. Paste the Stripe Payment Link there to turn both on.
 */
export { everythingUpgrade };

/**
 * The pack at €29 for someone we owe a thank you or an apology: a link Nico sends by hand, on no public page and
 * with no /go/ address. Kept here only so the link is written in one place. Stripe product name:
 * "Everything we teach · thank you price" (the webhook delivers the whole pack), back to
 * https://www.omnyalab.com/learn/thanks/everything?session_id={CHECKOUT_SESSION_ID}
 */
export const everythingApology = '';

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
  // empty until the switch above is on: /go/everything-upgrade then opens WhatsApp, and no page links to it
  { id: 'everything-upgrade', checkout: everythingUpgrade },
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
  // THE SWITCH of the scene card on /the-towers-blueprint/sent (10/11, Nico): a second Stripe Payment Link with the two
  // products in it, "The Full Towers Blueprint" (€5.99) and "The Towers Scene File" (€12), €17.99, back to
  // https://www.omnyalab.com/learn/thanks/full-towers?session_id={CHECKOUT_SESSION_ID} (the webhook already delivers both
  // by their names). While this is an empty string the card only says "Add it at checkout" and the button is the guide's;
  // paste the link here and the card becomes a tick, with the button "Get both · €17.99" going to /go/full-towers-scene.
  { id: 'full-towers-scene', checkout: '' },
];

// 10/11 (site check 2 and 21): the launch prices are gone from the code. fullTowerDeal, full3dDeal and fullCityDeal (the Full
// guides at €1.99 until Sunday 8 November, their Stripe links are off), bundleDeal (the three playbooks at €39 until 7/11,
// it never had a link) and dealOn were removed with the scripts that swapped the price in the page. Every Full guide is
// €5.99, written in its page, and /go/<id> opens the one link of the product above.

/** Playbook prices from 7/11 (one by one €167, all three €79). Used for the "Are you sure?" box and the funnels. */
export const prices = { 'white-to-real': 79, reel: 49, 'before-it-exists': 39, bundle: 79, everything: 59, 'everything-upgrade': 53 } as const;

/**
 * After each purchase the checkout returns to /learn/thanks/<product>. That page makes one
 * offer that exists only there (oto), the most natural next step for that buyer, and if
 * they pass, a smaller one (down). Every price is real: a lesson for readers, or the
 * difference to the next tier. No countdowns, no fake scarcity.
 * 10/11 (Nico): the free image ("One image of your project, free", id sample) is no longer offered after a
 * payment. Where it was the second offer there is none now (no "No thanks" button either); where it was the
 * first one (the Build lesson and the Full guides) the community waiting list, which was already there, takes its place.
 */
export const thanks: Partial<Record<ProductId, { kind: 'pdf' | 'lesson'; oto: ProductId; down?: ProductId }>> = {
  // 01 costs as much as all three, so after it there is no "other two" offer (7/11)
  'white-to-real': { kind: 'pdf', oto: 'session-reader' },
  reel: { kind: 'pdf', oto: 'rest-02', down: 'session-reader' },
  'before-it-exists': { kind: 'pdf', oto: 'rest-03' },
  everything: { kind: 'pdf', oto: 'session-reader' },
  bundle: { kind: 'pdf', oto: 'session-reader', down: 'community' },
  session: { kind: 'lesson', oto: 'build-upgrade' },
  build: { kind: 'lesson', oto: 'community' },
  'full-tower': { kind: 'pdf', oto: 'community' },
  'full-3d': { kind: 'pdf', oto: 'community' },
  'full-city': { kind: 'pdf', oto: 'community' },
  'full-build': { kind: 'pdf', oto: 'community' },
  'full-towers': { kind: 'pdf', oto: 'community' },
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

// The paid files (10/11): they are not in public/ any more and no page is built with their links.
// They live in private/learn/, the map from Stripe product to files is api/_lib/learn-files.js, and
// /learn/thanks shows them only after api/files.js has checked the payment with Stripe (views/Thanks.astro).

/** Where a lesson buyer picks the day and time: our booking pages (Session 60 min, Build two calls of 90). */
export const booking: Partial<Record<ProductId, string>> = {
  session: '/book/session',
  build: '/book/build',
};
