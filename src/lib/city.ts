// Omnya City (5/11/2026): what /city/@username sells under the house.
// 1,000 followers offer (Nico, 5/11): super discounted, the photo is one Nano Banana Pro image,
// the film is one 10-second clip of the house (about 10 credits).
// Stripe Payment Links created 5/11 from Nico's Chrome (Make it real €0.99 at Nico's request).
// While `checkout` is empty the button opens WhatsApp with the request already written (same rule as learn.ts).
// The page adds ?client_reference_id=<username> to Stripe links (dots become dashes: Stripe allows only
// letters, numbers, - and _), so every payment says whose house it is.
export type CityOffer = { id: 'real' | 'downtown' | 'film'; title: string; line: string; was: string; price: string; checkout: string };

// 6/11: the photo and the film are gone (they cost generation credits); "Move downtown" became the fountain house below.
export const cityOffers: CityOffer[] = [];

// Ep.2 upsell (6/11/2026, idea from a follower via Nico): places that are only bought, €0.99 each, shown only while the API
// says they are for sale (EP2_LIVE on): 3 penthouses (the 3 tallest towers) and the 10 villas of Omnyawood's top terrace.
// The Stripe links stop by themselves after 3 and 10 payments, so nobody pays for a place that is gone.
// Product names in Stripe must stay exactly these (api/stripe-webhook.js matches them).
export type CityUpgrade = { id: 'penthouse' | 'villa' | 'fountain'; title: string; line: string; was: string; price: string; checkout: string };
export const cityUpgrades: CityUpgrade[] = [
  { id: 'penthouse', title: 'Get a penthouse', line: 'The top floor of a tower in The Residences. Only 3.', was: '€19', price: '€0.99', checkout: 'https://buy.stripe.com/7sY9ASfxb3bW9FY76l8so0o' },
  { id: 'fountain', title: 'A house by the fountain', line: 'One of the 8 houses around the fountain, downtown. Only 8.', was: '€19', price: '€0.99', checkout: 'https://buy.stripe.com/14AbJ098N4g019sgGV8so0n' },
  // 10/11: the villa's Payment Link (…g4m9et8so0p) is no longer active on Stripe, so the link is gone from here and the
  // option is off /city/@username (pages/city/house.astro); with an empty checkout it could only open WhatsApp
  { id: 'villa', title: 'A top villa in Omnyawood', line: 'The top terrace, under the OMNYAWOOD letters. Only 10.', was: '€19', price: '€0.99', checkout: '' },
];

export const cityWhatsApp = 'https://wa.me/393792220465';

/** The funnel page for people who want to build a city like this (free blueprint, then the Full one). */
export const cityBlueprint = '/the-city-blueprint';
