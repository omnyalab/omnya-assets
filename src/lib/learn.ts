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
  | 'free';

export const products: { id: ProductId; checkout: string }[] = [
  { id: 'white-to-real', checkout: '' },
  { id: 'reel', checkout: '' },
  { id: 'before-it-exists', checkout: '' },
  { id: 'bundle', checkout: '' },
  { id: 'session', checkout: '' },
  { id: 'build', checkout: '' },
  { id: 'community', checkout: '' },
  { id: 'session-reader', checkout: '' },
  { id: 'rest-30', checkout: '' },
  { id: 'rest-50', checkout: '' },
  { id: 'build-upgrade', checkout: '' },
  { id: 'sample', checkout: '' },
  { id: 'free', checkout: '/learn/free/omnya-lab-blueprint.pdf' },
];

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
