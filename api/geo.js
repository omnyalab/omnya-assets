// GET /api/geo — which price zone the visitor is in, for the price list on /pricing (10/11, Nico).
// Vercel writes the visitor's country on every request (header x-vercel-ip-country); this function only reads it and
// answers { country, zone }. Nothing is stored and nothing else is read. The page (src/scripts/pages.ts, priceZone)
// shows today's prices and changes them only when the zone says so:
//   zone "gulf" (United Arab Emirates, Saudi Arabia, Qatar, Kuwait, Bahrain, Oman): Choose your floor €4,900 and
//                Full tower launch €7,900 instead of €3,900 and €5,900, and the single image €190
//   zone "west" (Europe and North America): the single image €190 instead of €90
//   zone ""     (India, Central Asia, everywhere else, or a country Vercel could not tell): the prices as written
// The prices themselves are in src/i18n (pricing) and src/views/Pricing.astro, not here: this file only names the zones.
const GULF = ['AE', 'SA', 'QA', 'KW', 'BH', 'OM'];
const WEST = [
  // European Union
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  // the rest of Europe
  'GB', 'CH', 'NO', 'IS', 'LI', 'MC', 'SM', 'VA', 'AD', 'AL', 'BA', 'ME', 'MK', 'RS', 'XK', 'MD', 'UA', 'GI', 'JE', 'GG', 'IM', 'FO',
  // North America
  'US', 'CA',
];

export function zoneOf(country) {
  const c = String(country || '').toUpperCase();
  if (GULF.includes(c)) return 'gulf';
  if (WEST.includes(c)) return 'west';
  return '';
}

export function GET(request) {
  const raw = (request.headers.get('x-vercel-ip-country') || '').toUpperCase();
  const country = /^[A-Z]{2}$/.test(raw) ? raw : '';
  return new Response(JSON.stringify({ country, zone: zoneOf(country) }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' },
  });
}
