import { t, type Lang } from '../i18n';

// Every link here comes from docs/CONTACTS.md, unchanged.
export const contact = {
  email: 'info@omnyalab.com',
  phone: '+39 379 222 0465',
  phoneHref: 'tel:+393792220465',
  phoneNote: 'International: WhatsApp or email only',
  places: 'Venice · Dubai',
  instagram: 'https://www.instagram.com/omnyalab/',
  linkedin: 'https://www.linkedin.com/in/nicolaghizzo',
  /** The name shown next to the VAT number in the footer. 10/11 (Nico): the studio's name, not his own (the Meta review
   *  that wanted the sole trader's name is dropped). */
  legal: 'Omnya Lab',
  vat: '05578770264',
  /** The free 30-minute call, booked on our own page (it replaced Calendly). */
  bookCall: '/book/call',
};

// Pre-filled messages follow the page language (i18n, messages).

/** The live demo the site sends people to (10/11): the tower with the floors to click. Phones are sent to its /m/ page by vercel.json. */
export const demoHref = (lang: Lang) => `${lang === 'it' ? '/it' : ''}/demo/choose-your-floor/`;

export function sampleLinks(lang: Lang) {
  // 10/11 (Nico): no more "I'd like to request a free sample". The round WhatsApp button, the footer and the contact
  // page open a plain message about a project, written in i18n (messages) for both languages.
  const m = t(lang).messages;
  return {
    whatsapp: `https://wa.me/393792220465?text=${encodeURIComponent(m.whatsapp)}`,
    email: `mailto:${contact.email}?subject=${encodeURIComponent(m.subject)}&body=${encodeURIComponent(m.body)}`,
  };
}
