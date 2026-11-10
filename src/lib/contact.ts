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
  /** Legal name of the business (sole trader): Meta checks it on the site. */
  legal: 'Nicola Ghizzo',
  vat: '05578770264',
  /** The free 30-minute call, booked on our own page (it replaced Calendly). */
  bookCall: '/book/call',
  whatsappSample:
    'https://wa.me/393792220465?text=Hi%20Omnya%20team%2C%20I%E2%80%99d%20like%20to%20request%20a%20free%20sample.',
  emailSample:
    'mailto:info@omnyalab.com?subject=Free%20Sample%20Request&body=Hi%20Omnya%20team%2C%0A%0AI%E2%80%99d%20like%20to%20request%20a%20free%20sample.%0A%0AStudio%20or%20property%3A%20%0AProject%3A%20%0AWhat%20I%20already%20have%20(model%2C%20drawings%2C%20photos)%3A%20%0A%0ALooking%20forward%20to%20seeing%20what%20you%20can%20do.',
};

// Pre-filled messages follow the page language. English keeps the exact links
// from docs/CONTACTS.md; Italian is built from the same template.

/** The live demo the site sends people to (10/11): the tower with the floors to click. Phones are sent to its /m/ page by vercel.json. */
export const demoHref = (lang: Lang) => `${lang === 'it' ? '/it' : ''}/demo/choose-your-floor/`;

export function sampleLinks(lang: Lang) {
  if (lang === 'en') return { whatsapp: contact.whatsappSample, email: contact.emailSample };
  const m = t(lang).messages;
  return {
    whatsapp: `https://wa.me/393792220465?text=${encodeURIComponent(m.whatsapp)}`,
    email: `mailto:${contact.email}?subject=${encodeURIComponent(m.subject)}&body=${encodeURIComponent(m.body)}`,
  };
}
