# Omnya City (5/11/2026)

Reel "I'm giving every follower a free house in my city". Comment HOUSE or 🏠 → ManyChat DM → personal one-time link → the house appears on the map.

## Pieces

- `api/city.js` (+ `api/_lib/city.js`): one function, `vercel.json` sends `/api/city/<action>` to it.
  - `POST /api/city/link` — ManyChat External Request. Header `X-City-Secret: <CITY_LINK_SECRET>`. Body `{"username":"…","igId":"…"}`. Answers `{"url": "https://omnyalab.com/city?k=…"}`, or the house page if that profile already has a house. Asking twice gives the same link.
  - `POST /api/city/reserve {k}` — burns the token (GETDEL), one house per profile (SET NX), next lot (INCR).
  - `GET /api/city/houses`, `GET /api/city/house?u=`, `GET /api/city/peek?k=`.
- `/city` (`src/pages/city/index.astro`, `public/city/map.js`): the map. Lots are numbered from the fountain outwards (1,391 lots; past that the house page says "New district").
- `/city/@username` (`src/pages/city/house.astro`, `public/city/house.js`): the house in 3D, number, district, neighbour (lot n+1), share, offers.
- `public/city/city.js`: the reel's generator (style Z) with two additions: `opts.empty` (lawns only) and `makeHouses()` (all houses in one group). The house comes from `hashStr('@' + username)`.
- Redis keys: `omnya:city:*` in the same Upstash as the bookings. Only username, lot, date, Instagram id.

## Nico

- Vercel env: `CITY_LINK_SECRET` (any long random string, the same one goes in the ManyChat header).
- Stripe: three Payment Links (Make it real €19, Move downtown €4.99, Film of your house €49) in `src/lib/city.ts` → `checkout`. Until then the buttons open WhatsApp with the request written. The page adds `client_reference_id=<username>` (dots become dashes).
- "Move downtown" is done by hand for now (no admin action yet).

## Local test

`.env.local` with `CITY_LINK_SECRET=local-test-secret`, `npm run dev`, then
`curl -X POST localhost:5173/api/city/link -H 'X-City-Secret: local-test-secret' -H 'Content-Type: application/json' -d '{"username":"sofia.m"}'`.
Without Redis keys the API keeps everything in memory.

## ManyChat (5/11)

Automation "Omnya City · HOUSE" (Flow Builder, draft): comment on the next post with HOUSE or 🏠 → 3 public replies → DM "Get my house" → condition "Follows your account" → no: "follow and tap Done" (Done re-checks) → yes: External Request POST https://www.omnyalab.com/api/city/link, header X-City-Secret (value pasted by Nico), body {"username": Instagram Username, "igId": Contact Id}, `$.url` → user field `city_url` → DM with the "Reserve my spot" button on {{city_url}}.
Use www: the apex answers 308.
