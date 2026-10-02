import { t, type Lang } from '../i18n';

// Every link here comes from docs/CONTACTS.md, unchanged.
export const contact = {
  email: 'info@omnyalab.com',
  phone: '+39 344 203 0728',
  phoneHref: 'tel:+393442030728',
  phoneNote: 'International: WhatsApp or email only',
  places: 'Venice · Dubai',
  instagram: 'https://www.instagram.com/omnyalab/',
  linkedin: 'https://www.linkedin.com/in/nicolaghizzo',
  vat: '05578770264',
  calendly: 'https://calendly.com/omnyalab-info/30min',
  whatsappSample:
    'https://wa.me/393442030728?text=Hi%20Omnya%20team%2C%20I%E2%80%99d%20like%20to%20request%20a%20free%20sample.',
  emailSample:
    'mailto:info@omnyalab.com?subject=Free%20Sample%20Request&body=Hi%20Omnya%20team%2C%0A%0AI%E2%80%99d%20like%20to%20request%20a%20free%20sample.%0A%0AStudio%20or%20property%3A%20%0AProject%3A%20%0AWhat%20I%20already%20have%20(model%2C%20drawings%2C%20photos)%3A%20%0A%0ALooking%20forward%20to%20seeing%20what%20you%20can%20do.',
};

// Pre-filled messages follow the page language. English keeps the exact links
// from docs/CONTACTS.md; Italian is built from the same template.

export function sampleLinks(lang: Lang) {
  if (lang === 'en') return { whatsapp: contact.whatsappSample, email: contact.emailSample };
  const m = t(lang).messages;
  return {
    whatsapp: `https://wa.me/393442030728?text=${encodeURIComponent(m.whatsapp)}`,
    email: `mailto:${contact.email}?subject=${encodeURIComponent(m.subject)}&body=${encodeURIComponent(m.body)}`,
  };
}
