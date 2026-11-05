// Omnya City (5/11/2026): what /city/@username sells under the house.
// STRIPE: Nico creates the three Payment Links and pastes them in `checkout`.
// While `checkout` is empty the button opens WhatsApp with the request already written (same rule as learn.ts).
// The page adds ?client_reference_id=<username> to Stripe links (dots become dashes: Stripe allows only
// letters, numbers, - and _), so every payment says whose house it is.
export type CityOffer = { id: 'real' | 'downtown' | 'film'; title: string; line: string; price: string; checkout: string };

export const cityOffers: CityOffer[] = [
  { id: 'real', title: 'Make it real', line: 'A photoreal picture of your house, like we do for real villas.', price: '€19', checkout: '' /* STRIPE: Make it real €19 */ },
  { id: 'downtown', title: 'Move downtown', line: 'Swap your lot for one by the fountain.', price: '€4.99', checkout: '' /* STRIPE: Move downtown €4.99 */ },
  { id: 'film', title: 'Film of your house', line: 'A short cinematic film of your home, ready to post.', price: '€49', checkout: '' /* STRIPE: Film of your house €49 */ },
];

export const cityWhatsApp = 'https://wa.me/393792220465';
