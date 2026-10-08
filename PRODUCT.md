# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Real estate developers, real estate agencies, architects and interior designers (plus luxury brands). They almost always open the site on a phone, from the Instagram link or from a cold email. In a few seconds they need to understand what Omnya Lab makes and ask for the free sample.

## Product Purpose
omnyalab.com is the studio's portfolio and sales page: it shows the work (stills and films) and turns a visit into a free-sample request (WhatsApp, email, Calendly).

## Positioning
Everything on the site is made with AI by the studio, with art direction, materials and quality control done by people, image by image. Work starts from what the client already has (floor plans, a 3D model, photos of an empty space). Facts in use on the site, kept in `src/i18n/index.ts`: from €25 per image, first views in 1–2 days, first image free.

## Operating Context
Mobile first (390px before desktop), Lighthouse mobile performance above 90. English at the root, Italian under `/it/` with the same slugs. Static Astro site on Vercel; preview deploys per branch, `main` is checked by the owner before merging.

## Capabilities and Constraints
- Stack: Astro (static) + GSAP (ScrollTrigger, SplitText, Flip) + Lenis on one ticker. Font: SF Pro Display 400 (600 only for the Studio posters).
- Projects come from `src/data/projects.json`; all copy from `src/i18n/index.ts`.
- Media is delivered already compressed: do not recompress or rename files in `public/projects`.
- Motion rules in code: 0.6–0.9s, expo.out, staggered entrances; photos never move with the scroll; touch screens keep images still; prefers-reduced-motion respected.
- The site is modified, not redesigned: changes stay inside the requested scope.

## Brand Commitments
- Paper `#EDEAE4` with grain, ink `#111111`, grey `#9B9893`, footer `#0B0B0B`; no accent colour, colour comes only from the pictures.
- Two-tone headings, one weight, no italics, no bold, no final period in titles.
- Voice: short sentences, peer to peer, real numbers instead of adjectives; banned words listed in `docs/handoff/PROMPT.md`.
- Logo files in `public/brand/` (two-tone black on paper, white over media).
- No particles, sparkles or "magic" effects beyond what a brief explicitly asks for.

## Evidence on Hand
Project stills and films in `public/projects/`, Studio pictures in `public/studio/`, downloadable kits in `public/kit/`, contacts in `docs/CONTACTS.md`. No testimonials or client logos are on file: do not invent them.

## Product Principles
1. Understood in one screen on a phone: what we make, then the free sample.
2. The work is the design: pictures lead, the interface stays quiet.
3. Real numbers and real projects only.
4. Fast on a phone from Instagram before anything else.
