// Everything the WhatsApp bot knows about Omnya Lab (the site and Nico's notes; offers and prices of 10/11/2026).
// The prices in section 3 are the ONLY ones the bot may say: the guard in wa-brain.js (ALLOWED_MONEY) lets
// no other amount out, so a price changed here must be changed there too.
// Gone on 10/11: the free image ("free sample", "first image free") and every launch price (1,99 / 4,99 / 19 / 39).
// In their place: the free demos and the pilot at 490 €.

export const DEMO_TOWER = 'https://www.omnyalab.com/demo/choose-your-floor';
export const DEMO_HOUSE = 'https://www.omnyalab.com/demo/hold-to-build';

/**
 * The welcome for someone who writes for the first time: short, asks what project they have and what
 * they need, with the link to the demo. Text only: the bot reads it in its rules (wa-brain.js) and Nico
 * can paste it as the greeting of the WhatsApp Business app. Each line is one separate message.
 * Signed Nico, never Nicola.
 */
export const WELCOME = {
  en: ['hey nico here from omnya lab', 'what project are you working on and what do you need, images, a film or the interactive 3d?', `meanwhile you can try our free demo here ${DEMO_TOWER}`],
  it: ['ciao sono nico di omnya lab', 'che progetto hai e cosa ti serve, immagini, un video o il 3d interattivo?', `intanto qui puoi provare la demo gratis ${DEMO_TOWER}`],
};

export const KNOWLEDGE = `## 1. What Omnya Lab is
- Visual production studio: photorealistic images (architectural visualization), films, virtual staging and interactive 3D for luxury and real estate. Everything is made with AI by the studio; art direction, materials and quality control are done by people, image by image, "checked like a photograph".
- Two studios, one team: Venice (Italy) and Dubai. Venice covers Europe, Dubai the Gulf, so someone is awake in most time zones. Works with clients worldwide.
- Founder: Nico. He does the calls and follows the projects with the team. His name is always written Nico.
- Clients: real estate developers, real estate agencies, architects, interior designers, luxury brands (hotels, resorts).
- Work starts from what the client already has: floor plans, a 3D model (SketchUp, Revit, rough 3D), drawings or photos of an empty space.
- Team size is not stated on the site.
- Also on the site: Learn (guides and private lessons teaching the method). Websites for studios and agencies "on private request" only.

## 2. Services

### 2.1 Images (renders)
- What: photorealistic interiors and exteriors from floor plans, 3D models, or photos, delivered in 4K and in every format needed.
- Client sends: plans, a 3D model (any format, we work on it as it is, no remodelling), sketches, or photos of the space.
- Process per image: light is set first (sun, shadows), then materials, furniture, people; every requested change is a single note.
- Timing: first views in 1-2 working days; a whole house about 5 days; each round of changes about 1 day. Timing starts from the deposit; busier periods can add a few days, delivery date always confirmed by Nico before starting.
- Revisions: two rounds of changes included.
- From 10 views a free 10-second clip of the best view is included.

### 2.2 Films
- 30 s to 2 minutes, for presentations, launches, social media. Music, editing, colour grading and reels for social included.
- Made from the approved images or from renders the client already has.

### 2.3 Launch packages (images + film + reels, from the same work)
- Essential: 8 images, 30 s film, 3 reels, in 5 days.
- Signature: 15 images, 60 s film, 3 reels, presentation, in 1 week.
- Flagship: 25 images, 2 min film, 6 reels, presentation, in 2 weeks.
- Very complex projects are priced together before starting. Several projects or ongoing work: custom quote from Nico.

### 2.4 Virtual staging and photo retouch
- Staging: client sends a photo of an empty room, we send it back furnished, ready to list.
- Retouch: change light, materials or furniture on a photo or render the client already has.

### 2.5 Interactive 3D (the viral reels)
- Choose your floor: a website where the buyer picks the floor and the apartment of a tower, then "flies" into the building through the glass and walks into the apartment (living room, bathroom), with the view from every floor and which apartments are free or sold. Built for off-plan sales.
- Walk-through house: a house that builds itself as you scroll or hold, or turns as you drag, and you walk inside.
- Full tower launch: Choose your floor together with a 60 s film, 15 images and the reels, all from the same work.
- Reference build: SAMAR, a tower in Dubai Marina. Floors selectable, flight into the chosen floor, living room, bathroom, final logo screen. Made from video clips (not a game engine or software), with a mobile version.
- Delivery: a web link (a website), not software to install. Hosting and updates, and an offline version for the sales office, exist: terms and price from Nico.
- It is a PAID project, not free. What is free is the demo (section 4). Say this clearly: many leads think the tower is free.
- What we need from the client: ask what they have. Usually floor plans of floors and apartments, the 3D model of the building, existing renders, logo, location and view. Nico confirms the full list.

## 3. Prices of today (the ONLY prices that exist for you; never say any other number with a currency)
All in euro, the same in every country.
- One image (render): 90 € each. Bigger sets of images cost less per image: that price comes from Nico.
- Films: 30 s 899 €, 60 s 1.490 €, 90 to 120 s 2.490 €.
- Launch packages: Essential 1.390 €, Signature 2.290 €. (Flagship: price from Nico.)
- Interactive 3D, starting prices for a standard project: walk-through house 1.990 € (up to three rooms), Choose your floor 3.900 € (one tower with its floors), Full tower launch 5.900 €. A whole house, more towers or a masterplan are priced on the plans by Nico.
- Pilot: 490 € (section 4).
- Guides (only for people who want to learn the method, section 6): every Full guide 5,99 €, the pack "Everything we teach" 59 €, The Towers Scene File 12 €.
- Not in this list (hosting, offline version, monthly plans, private lessons, single playbooks, Flagship, anything custom, any discount): you don't know the price. Send them to omnyalab.com/pricing or omnyalab.com/learn, or hand off to Nico.
- The only timings you may say are the ones written in this document (first views in 1-2 working days, Essential in 5 days, Signature in 1 week, Flagship in 2 weeks, the pilot in 7 days). A date, a deadline, availability: Nico.

## 4. The free demo and the pilot (this replaces the old "free sample": there is NO free image any more)
- Free demo, to try right now on the phone, no sign-up:
  - the tower, Choose your floor: ${DEMO_TOWER} (fly in, pick a floor, see its view)
  - the house that builds itself: ${DEMO_HOUSE} (scroll and it goes up from the drawing to the front door)
- The pilot, 490 €: ONE floor of THEIR building, clickable, online in 7 days, as a real link they can show to partners and buyers. If they start the full project within 30 days, the 490 € comes off its price in full.
- The pilot is the first step for anyone with a real building who wants the interactive 3D and is not ready for the full price yet.
- We do not make free images, free tests or free samples of a client's project. If a lead asks for "the free sample" or "the free image": say plainly that it is no longer there, and that what is free is the demo, and the first step on their own building is the pilot.
- A free image that Nico personally promised to someone before: that is Nico's, hand off.

## 5. How a project works
1. First contact: WhatsApp, email, Instagram DM, or a free 30-min video call with Nico (omnyalab.com/book/call).
2. We ask what the project is and what they need; they try the free demo if they haven't.
3. Client sends files: plans, 3D model, sketches, photos. Small files on WhatsApp, real projects with many files by email to info@omnyalab.com.
4. Pilot (interactive 3D) or quote and confirmation; client pays 50% deposit on confirmation. Timings start from the deposit.
5. First views in 1-2 working days. The light and composition are agreed first, then materials and furniture.
6. Changes: two rounds included, about 1 day each.
7. Delivery: final images in 4K, every format needed; films/reels if ordered; the interactive 3D as a web link. Remaining 50% paid on delivery.
8. Payment: in euro, same prices in every country, no VAT applied. Invoices, bank details, how to pay: Nico.

## 6. Learn: the guides (ONLY for people who want to do it themselves; never offered to someone with a real project)
All on https://omnyalab.com, in English.
- Free Blueprints, one page each, the PDF comes by email after they leave it on the page: The Blueprint (omnyalab.com/the-blueprint, rough 3D to real photo), The Tower Blueprint (omnyalab.com/the-tower-blueprint), The 3D to film blueprint (omnyalab.com/3d-to-film), The Build Blueprint (omnyalab.com/the-build-blueprint, the house that builds itself), The Towers Blueprint (omnyalab.com/the-towers-blueprint, three towers where the buyer chooses the view). This is what people get when they comment under a reel.
- Full guides, 5,99 € each, on the same pages right after the free one: The Full Tower Blueprint, The Full 3D to film Blueprint, The Full Build Blueprint, The Full Towers Blueprint. PDF by download and email after payment (Stripe).
- The Towers Scene File, 12 €: the base 3D scene of the three towers, to open and edit in the browser; it is added in the cart of The Full Towers Blueprint. It is the base scene, not the photorealistic film of the reel.
- Everything we teach, 59 €: the four Full guides and the three playbooks in one pack.
- Three playbooks (one for architects and interior designers, one for creators, one for agents and developers) and private lessons online with Nico (Session, 60 min; Build, 3 hours in two calls): on omnyalab.com/learn, with their prices there.
- Community on Skool: not open yet, there is a waiting list.
- We never send a PDF in the chat: only the link of the page.

## 7. Projects that can be mentioned (as written on the site)
- SAMAR, Dubai Marina: residential tower, 23 images and a film of the apartments and the view; the "Choose your floor" site. SAMAR is a concept made by Omnya to show the method, not a client's building: never say a developer commissioned it.
- Hygeia Grove (Corfu resort): architect came with only drawings; we made 24 images and a 90-second film; he presented before a stone was laid, his client gave him the project, which earned him almost 100,000 EUR (his earnings, as stated on the pricing page), works have started.
- The Townhall (Vidor, Prosecco hills, Italy): old town hall becoming a five-star boutique hotel; 14 images and a film.
- Penthouse Dubai designed by Davide Algranti: his renders still looked like renders, in two days we made 9 images and 2 films that look photographed.
- Dana (Maldives resort), 13 images; Casa Cresta (Los Angeles hillside house), 11 images; Residence 77, 5 images: these are concepts "we imagined" or pitched, not commissioned work.
- Other projects on omnyalab.com/work: Villa Cape Town, Ca' dei Colli (film), Forest House, Naoshima House, Elvira Dubai, Cavista Dubai, Alma Residence, Seaview Suites, Alchimia Spaces (no description on the site).
- No testimonials or client logos are on file: do not invent any.

## 8. Contacts
- Email: info@omnyalab.com
- Website: https://omnyalab.com (prices: omnyalab.com/pricing, work: omnyalab.com/work)
- Booking: https://omnyalab.com/book/call (free, 30 min, with Nico; Mon-Fri, 10:00-13:00 and 15:00-19:00 Rome time)
- Instagram: @omnyalab, https://www.instagram.com/omnyalab/
- Places: Venice, Dubai. They say they usually answer the same day.
`;
