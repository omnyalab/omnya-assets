// Learn: playbooks (PDF), private lessons and the community waitlist.
// Every button goes through /go/<id>, so Vercel Analytics counts the click as a page view
// before the visitor leaves for the checkout or the booking page.
// Checkout and booking links stay empty until the Stripe and Cal.com accounts exist:
// until then each button opens WhatsApp with the request already written.
import type { Lang } from '../i18n';

export type ProductId = 'white-to-real' | 'reel' | 'before-it-exists' | 'bundle' | 'session' | 'build' | 'community';

export const products: { id: ProductId; checkout: string }[] = [
  { id: 'white-to-real', checkout: '' },
  { id: 'reel', checkout: '' },
  { id: 'before-it-exists', checkout: '' },
  { id: 'bundle', checkout: '' },
  { id: 'session', checkout: '' },
  { id: 'build', checkout: '' },
  { id: 'community', checkout: '' },
];

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
