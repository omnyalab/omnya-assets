// Omnya City (5/11/2026): what /city/@username sells under the house.
// 1,000 followers offer (Nico, 5/11): super discounted, the photo is one Nano Banana Pro image,
// the film is one 10-second clip of the house (about 10 credits).
// Stripe Payment Links created 5/11 from Nico's Chrome (Make it real €0.99 at Nico's request).
// While `checkout` is empty the button opens WhatsApp with the request already written (same rule as learn.ts).
// The page adds ?client_reference_id=<username> to Stripe links (dots become dashes: Stripe allows only
// letters, numbers, - and _), so every payment says whose house it is.
export type CityOffer = { id: 'real' | 'downtown' | 'film'; title: string; line: string; was: string; price: string; checkout: string };

export const cityOffers: CityOffer[] = [
  { id: 'real', title: 'Make it real', line: 'Your house as a real photo, like the villas we shoot for developers.', was: '€49', price: '€0.99', checkout: 'https://buy.stripe.com/9B68wOacR3bW5pI9et8so0h' },
  { id: 'film', title: '10-second film of your house', line: 'A cinematic clip of your home, ready to post.', was: '€99', price: '€9', checkout: 'https://buy.stripe.com/00wbJ01GlaEobO6duJ8so0i' },
  { id: 'downtown', title: 'Move downtown', line: 'Swap your lot for one by the fountain.', was: '€19', price: '€1.99', checkout: 'https://buy.stripe.com/9B6fZg3OtaEo6tMbmB8so0j' },
];

export const cityWhatsApp = 'https://wa.me/393792220465';

/** The funnel page for people who want to build a city like this (free blueprint, then the Full one). */
export const cityBlueprint = '/the-city-blueprint';
