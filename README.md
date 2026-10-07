# Omnya Lab, sito

Brief completo in `docs/BRIEF.md`. Contenuti già compressi in `public/`, dati dei progetti in `src/data/projects.json`.

## Stack
Astro (statico) + GSAP (ScrollTrigger, SplitText, Flip) + Lenis, sincronizzati su un unico ticker. Font: Inter Tight (Google Fonts, servito in locale dal build).

## Comandi
```bash
npm install
npm run dev      # anteprima su http://localhost:5173
npm run build    # sito statico in dist/
npm run check:media   # con `npx astro preview --port 4322` attivo: controlla immagini e video di tutte le pagine, mobile e desktop
                      # (su Linux: CHROME_PATH=/percorso/di/chrome npm run check:media)
npm run hero:frames   # rigenera i fotogrammi desktop della hero da hero-src/pc_video_1.mp4 (serve ffmpeg; non fa parte del build, poi committa public/hero)
```

## Lingue
Inglese alla radice, italiano sotto `/it/` con gli stessi indirizzi (`/work/x` ↔ `/it/work/x`). Tutti i testi sono in `src/i18n/index.ts`; la privacy italiana è in `docs/PRIVACY.it.md`. Le pagine stanno in `src/views/`, `src/pages/` e `src/pages/it/` le richiamano soltanto.

## Immagini generate
`npm run build` lancia prima `scripts/make-og.mjs`, che crea da logo e copertine le anteprime social 1200x630 (`public/og/`), favicon e icona iPhone. I file in `public/projects` non vengono toccati.

## Dove mettere le mani
- Progetti: `src/data/projects.json` (`featured: true` = in home; campo opzionale `description`, massimo due righe, sotto la cover; campo opzionale `slug` quando l'indirizzo deve essere diverso dall'id, come `hygeia-grove`)
- Kit da scaricare: PDF in `public/kit/en/` e `public/kit/it/`, copertine in `public/studio/kit_cover_*`, elenco in `src/lib/kit.ts` (il peso dei file si calcola al build)
- Prezzi: tutti i numeri sono testi in `src/i18n/index.ts` (`pricing`), la pagina è `src/views/Pricing.astro`
- Pagina Studio: `src/views/Studio.astro`, animazioni in `src/scripts/studio.ts` (poster con la parola dietro l'edificio, i quattro stadi dal modello all'immagine, conteggio dei tempi)
- Redirect: `vercel.json` (301 veri su Vercel) e `redirects` in `astro.config.mjs` (per l'anteprima locale)
- Contatti e link: `src/lib/contact.ts`
- Privacy: `docs/PRIVACY.md` (la pagina /privacy-policy si genera da lì)
- Stili: `src/styles/global.css`
- Hero della home, logica in `src/scripts/hero.ts`. Desktop: scrub a fotogrammi da `hero-src/pc_video_1.mp4`, fotogrammi in `public/hero/desktop/` (script `scripts/hero-frames.mjs`). Telefoni: il reel, `public/reel/hero_mobile.mp4` in loop, con il poster `hero_mobile_poster.webp` (primo frame, 828px, ~110 KB perché arrivi prima del video). Il reel è stato ricodificato più leggero così:
  ```bash
  ffmpeg -i reel.mp4 -vf "scale=1080:1920:flags=lanczos,fps=24" -c:v libx264 -preset veryslow -crf 27.5 -x264-params aq-mode=3 -profile:v high -level 4.1 -pix_fmt yuv420p -g 48 -keyint_min 48 -sc_threshold 0 -an -movflags +faststart public/reel/hero_mobile.mp4
  ```
  (keyframe ogni 2 s, circa 3 MB; con un reel nuovo regola il CRF per stare tra 2,5 e 3 MB)
- Animazioni: `src/scripts/`

## Deploy
Vercel rileva Astro da solo (build `npm run build`, output `dist`). Attivare Vercel Analytics nel progetto: lo script `/_vercel/insights/script.js` è già incluso in produzione.
