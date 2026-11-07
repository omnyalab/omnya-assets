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

- New in `public/city/city.js` (`opts.districts`, all from their own random stream: the old lots and houses never move): **Omnyawood** (round terraces east of the city, palm roads, 150 villa lots, OMNYAWOOD letters), **The Residences** on the west bank of the river by the sea (6 towers of 30–40 floors in the look of the Ep.1 reel: blue glass with white slabs, stone with gold bands, the white cylinder with teal glass; `RES_T`, the main one with the lit penthouse; a plaza with lawns, fountain and cafés; townhouses on the beach), the river with three bridges, the Marina, and the old city refreshed (boulevards, cars, cafés around the fountain). Golden-hour light, haze and ACES in `world.js`. `setNight(k)` exists for reels; the site stays by day.
- Who gets what: `omnya:city:ep2` is the first house number reserved with the Ep.2 code (`SET NX` in `reserve`, sent by `/api/city/houses` as `ep2`). Houses before it stay on their lot. From it on, `W.placeOf(n, ep2)`: penthouse (main tower, floor 40), a villa in Omnyawood, the next floor down, a villa… until both run out, then the old lots carry on. `placeName()` gives "Penthouse · The Residences", "Floor 12 · The Residences", "Omnyawood" or the old district.
- Free villas of Omnyawood show as white models (`makeModels`); on phones they are simple white blocks. Phones: about 424k triangles against 360k before.
- Floors on the house page: the camera turns around the tower at that floor. Per-floor drawings come later.

### The switch and the upsell (6/11/2026)

- `EP2_LIVE` in `public/city/world.js` AND in `api/_lib/city.js`: false = the map exactly as in Ep.1 (checked pixel by pixel), true = Ep.2. Flip both and push the day the Ep.2 reel goes out. The reel renders pass `districts` themselves.
- Upsell (only with the switch on), €0.99 each, places that are only bought (never given for free, so nobody is moved out): 3 penthouses (top floor of the 3 tallest towers after the main one, whose penthouse was the first free Ep.2 place: house #211; numbers 100000–100002) and the 10 villas of Omnyawood's top terrace under the letters (100003–100012). Stripe links (`cityUpgrades` in src/lib/city.ts): penthouse https://buy.stripe.com/7sY9ASfxb3bW9FY76l8so0o (limit 3), villa https://buy.stripe.com/aFa5kC5WBfYIg4m9et8so0p (limit 10); product names `Omnya City · The penthouse`, `Omnya City · The best villa in Omnyawood`. `api/stripe-webhook.js` calls `upgrade(u, kind)` and mails Nico; the buyer's old place becomes free. Numbers from 100000 up are reserved for these places.

### 6/11 v2 (live)
- Omnyawood is one smooth hill (`bell` lathe, `hillY`), a road that winds up in a spiral from the city road to the letters, 35 villas along it on their own terraces with a driveway (25 free in road order, the top 10 for sale). The houses already given keep their villa number; the villas were redrawn in new spots.
- The river runs further west (`riverX`), clear of the blocks; a street with a bridge goes from the city to The Residences (towers moved 20 west).
- Fountain upsell: the 8 houses closest to the fountain (numbers 1–8), €0.99, link https://buy.stripe.com/14AbJ098N4g019sgGV8so0n (limit 8). The owner moves to the first free villa in Omnyawood. Photo and film offers removed (`cityOffers` is empty).

### 7/11 house page upsell (board approved by Nico)
- Cozy yellow, no blue. The page fades in once the house is found (no "Finding the house…" screen).
- MOVE UP: the sticker on the house card, the "Move up my house" button (black, turning yellow border), the "Get a top spot" cards and their sticker all open the place picker (`#move`): penthouse / top villa / fountain, €0.99, the `cityUpgrades` Stripe links with `client_reference_id`. Only what is still for sale shows; the counts come from `/api/city/houses` → `forSale.left`. The bars look almost full on purpose (Nico).
- The cozy book (top right on the city, and the card next to the house, which replaced the free "Steal our city method" card) sells the Full City Guide (`/go/full-city?k=city`, €1.99 until Sunday, then €19 by itself) or Everything (`/go/everything?k=city`, €39). Images in `public/city/up/`.
- Fountain fix: whoever lived on the bought fountain house moves to a free Omnyawood villa or, when those are gone, to the buyer's old house (before, any empty lot: @jakesplosion went to #484 and @gghizzoo to #507).

### 7/11 the seafront (Nico)
- `districts.sea` (`seaside()` in public/city/city.js, own random stream, after everything else): a coast road from The Residences over the river along the marina to the seafront villas, four streets down from the city, a palm avenue between the two rows of towers, more palms and trees around the towers, boats at the marina in rows that never overlap, white towers with a slab on every floor and every tower's top floor lit as a penthouse.
- For sale (our own Stripe Checkout, no Payment Links: `GET /api/city/buy?kind=town|sea&u=` → 303 to Stripe; the webhook moves the buyer via `metadata.buy`, and refunds by itself if the place was sold out meanwhile): 20 townhouses on the water at €0.99 (house numbers PREM+13…32, tranches 6/6/8: "Only n left", then "Only n remaining out of 12", then "… out of 20 · going fast") and 10 seafront villas at €2.99 (PREM+33…42, 2 at a time). Appended to `premium` in world.js, so the 13 places sold on 6/11 keep their numbers.
- The yacht (at anchor in the open sea, no pier) and the island (one villa, helipad, reachable only by boat): one of each, by auction on /city/yacht and /city/island (`src/pages/city/auction.astro`, `public/city/auction.js`, rewrites in vercel.json and astro.config.mjs). Gold names over them on the map ("YACHT OF ???" until someone wins) and two gold buttons under the counter, always on screen. Starting bid €3.99, +€1 at least, 12 hours from the first bid, +5 minutes for a bid in the last 5. You need a house to bid. A bid = Stripe Checkout with `capture_method: manual` (money held only); the webhook (`metadata.auction`) makes it the top bid and cancels the previous hold; `/api/city/houses` and `/api/city/auction` capture the winner's hold once the time is up and mail Nico. Redis: `omnya:city:auc:<item>`.
