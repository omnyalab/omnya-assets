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
- Stripe (created 5/11 from Nico's Chrome): Make it real €0.99, 10-second film €9, Move downtown €1.99 in `src/lib/city.ts`; the Full City Blueprint €1.99 until Sunday (`fullCityDeal`) and €19 after (`products` in `src/lib/learn.ts`), back to /learn/thanks/full-city. The house page adds `client_reference_id=<username>` (dots become dashes).
- Funnel page: /the-city-blueprint. PDFs built in ~/Desktop/Omnya City Blueprint (free/build_free.py, full/build_full.py, cover/gen.py).
- "Move downtown" is done by hand for now (no admin action yet).

## Local test

`.env.local` with `CITY_LINK_SECRET=local-test-secret`, `npm run dev`, then
`curl -X POST localhost:5173/api/city/link -H 'X-City-Secret: local-test-secret' -H 'Content-Type: application/json' -d '{"username":"sofia.m"}'`.
Without Redis keys the API keeps everything in memory.

## ManyChat (5/11)

Automation "Omnya City · HOUSE" (Flow Builder, draft): comment on the next post with HOUSE or 🏠 → 3 public replies → DM "Get my house" → condition "Follows your account" → no: "follow and tap Done" (Done re-checks) → yes: External Request POST https://www.omnyalab.com/api/city/link, header X-City-Secret (value pasted by Nico), body {"username": Instagram Username, "igId": Contact Id}, `$.url` → user field `city_url` → DM with the "Reserve my spot" button on {{city_url}}.
Use www: the apex answers 308.

## Ep.2 (6/11/2026): the city grows

- New in `public/city/city.js` (`opts.districts`, all from their own random stream: the old lots and houses never move): **Omnyawood** (round terraces east of the city, palm roads, 150 villa lots, OMNYAWOOD letters), **The Residences** west of the river (6 towers of 30–40 floors, `RES_T`, the main one with the lit penthouse, townhouses on the beach), the river with three bridges, the Marina, and the old city refreshed (boulevards, cars, cafés around the fountain). Golden-hour light, haze and ACES in `world.js`. `setNight(k)` exists for reels; the site stays by day.
- Who gets what: `omnya:city:ep2` is the first house number reserved with the Ep.2 code (`SET NX` in `reserve`, sent by `/api/city/houses` as `ep2`). Houses before it stay on their lot. From it on, `W.placeOf(n, ep2)`: penthouse (main tower, floor 40), a villa in Omnyawood, the next floor down, a villa… until both run out, then the old lots carry on. `placeName()` gives "Penthouse · The Residences", "Floor 12 · The Residences", "Omnyawood" or the old district.
- Free villas of Omnyawood show as white models (`makeModels`); on phones they are simple white blocks. Phones: about 424k triangles against 360k before.
- Floors on the house page: the camera turns around the tower at that floor. Per-floor drawings come later.
