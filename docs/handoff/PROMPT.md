Come primo passo, dalla cartella principale del repo, esegui `npm install` (lo script di configurazione dell'ambiente è vuoto di proposito). Se l'installazione dà errore per la versione di Node, usa Node 22 o superiore e riprova.

Lavora sul repo omnyalab/omnya-assets (Astro + GSAP + Lenis, EN alla radice, IT sotto /it/). Prima di toccare qualcosa leggi README.md, docs/BRIEF.md, src/i18n/index.ts, src/styles/global.css, src/scripts/core.ts, anim.ts, pages.ts, ui.ts e src/views/*. Rispetta le regole già scritte nel codice: durate 0.6-0.9s con expo.out, elementi che entrano insieme sfalsati, le foto non si muovono con lo scroll (niente parallax, scale o skew sulle immagini), su touch le immagini sono ferme.

Lavora sul branch `site-update-oct-2026`, che esiste già su GitHub: fai checkout di quel branch, non partire da main. Alla fine fai push dello stesso branch (Vercel crea l'anteprima). Non fare merge su main: lo controllo io dall'anteprima.

I file da usare sono già nel branch:
- Immagini della pagina Studio: `docs/handoff/studio-page/` (originali; convertili tu in WebP dentro `public/studio/`)
- PDF già compressi e già nella posizione finale: `public/kit/en/` e `public/kit/it/`
- Questo stesso prompt è salvato in `docs/handoff/PROMPT.md`
Quando hai finito di usare `docs/handoff/studio-page/`, eliminalo dal branch: non deve restare nel sito.

Tutti i testi qui sotto sono definitivi: usali parola per parola, in inglese e in italiano. Se ti serve un testo che non c'è, scrivilo con queste regole: frasi corte, un'idea per frase, parole semplici, numeri veri al posto degli aggettivi, seconda persona ("you send us", "ci mandi"), niente metafore, niente trattini lunghi, niente punto finale nei titoli, italiano scritto in italiano e non tradotto parola per parola. Parole vietate: leverage, seamless, unlock, elevate, transform, cutting-edge, stunning, immersive, crafted, bring to life, elevare, trasformare, innovativo, all'avanguardia, esperienza unica, a 360 gradi, eccellenza, dare vita.

---

## 1. Pulizia del repo

Elimina dalla cartella principale i 6 file del vecchio sito Squarespace: `omnya-hero.mp4`, `omnya-hero.webm`, `omnya-hero-poster.jpg`, `w-alchimia.mp4`, `w-corfu.mp4`, `w-elvira.mp4`. Prima controlla con una ricerca nel codice che nessuno li usi.

## 2. Hygeia Grove

Il progetto "Corfu Resort" si chiama Hygeia Grove. In `src/data/projects.json` cambia il titolo in `Hygeia Grove` (lo slug diventa `hygeia-grove`). Aggiungi redirect permanenti da `/work/corfu-resort` a `/work/hygeia-grove` e da `/it/work/corfu-resort` a `/it/work/hygeia-grove`. Non rinominare le cartelle in `public/projects`.

## 3. Home: si deve capire subito cosa facciamo

Oggi la prima schermata è solo il video, senza testo. Il cliente non capisce chi siamo.

- Sopra il video dell'hero, centrato, un titolo grande in due toni (prima riga bianca, seconda riga bianco al 70%), stessa tipografia dei titoli del sito, nessun punto finale:
  - EN: `Renders and films` / `made with AI`
  - IT: `Render e video` / `fatti con l'AI`
- Il titolo entra con lo stesso effetto `data-split` degli altri titoli, dopo il preloader. Rinforza leggermente `hero__shade` solo quanto serve perché il testo sia leggibile su ogni fotogramma del video (contrasto minimo 4.5:1 sulla parte più chiara).
- La scritta "Scroll" resta in basso al centro, ma più leggibile: testo a 14px, linea animata più lunga, area cliccabile 44x44 che porta alla sezione successiva con Lenis.
- Su mobile l'hero è alto 92svh, così si vede l'inizio della sezione dopo.
- Nell'hero c'è solo il titolo e la scritta "Scroll": nessun altro testo sopra il video.
- Tutte le informazioni vanno nella sezione chiara subito sotto (statement). Tieni il titolo `We show spaces / before they exist` e sostituisci la riga con:
  - EN: `Photorealistic images and films for developers, real estate agencies, architects and luxury brands. We start from your floor plans, 3D model or photos.`
  - IT: `Immagini e video fotorealistici per costruttori, agenzie immobiliari, architetti e brand del lusso. Partiamo dalle tue planimetrie, dal modello 3D o da semplici foto.`
- Sotto la riga aggiungi una fila di tre fatti, testo piccolo, separati da un punto medio su desktop e uno per riga su mobile:
  - EN: `From €25 per image` · `First views in 1–2 days` · `First image free`
  - IT: `Da 25 € a render` · `Prime viste in 1-2 giorni` · `Prima immagine gratis`
- Testo della sezione AI in home:
  - EN aiText: `Every image and film on this site was made by our studio with AI, starting from floor plans, 3D models or a photo of an empty room. No photo shoots and no waiting for the building to be finished. Art direction, materials and quality control are done by us, image by image.`
  - EN aiNote: `From drawings to final images in days, not weeks.`
  - IT aiText: `Ogni immagine e ogni video di questo sito è stato realizzato dal nostro studio con l'AI, partendo da planimetrie, modelli 3D o la foto di una stanza vuota. Niente servizi fotografici e niente attese che l'edificio sia finito. Direzione artistica, materiali e controllo qualità li facciamo noi, immagine per immagine.`
  - IT aiNote: `Dai disegni alle immagini finali in pochi giorni, non in settimane.`
- Teaser dello studio in home: EN `A small studio` / `between Venice and Dubai`, IT `Uno studio piccolo` / `tra Venezia e Dubai`.
- Meta IT: `siteDescription` diventa `Immagini e video fotorealistici per costruttori, agenzie immobiliari, architetti e brand del lusso.`

## 4. Pagina Studio, da rifare da zero

Riscrivi `src/views/Studio.astro` e le sue animazioni. Deve essere la pagina più bella del sito, ma coerente con il resto: stesso font SF Pro Display, stesso fondo `--bg`, titoli `Duo` in due toni, etichette tra parentesi, stesse durate ed easing, stessi margini `--g`, `.wrap`. Converti le immagini in WebP (desktop 2400px e `_mobile` 1200px, come le altre) dentro `public/studio/`.

### 4.1 Apertura poster
- A tutto schermo `studio_poster_bg.jpg`. Sopra, la parola `studio` gigantesca (SF Pro Display 600, letter-spacing -0.062em, line-height 0.8, colore `#16140f`), allineata a sinistra e dimensionata in modo che la "o" finale passi dietro il volume in travertino. Sopra la parola, `studio_poster_fg.png` (lo stesso scatto con il cielo trasparente): la parola risulta dietro l'edificio. Le due immagini devono avere lo stesso `object-fit: cover` e la stessa `object-position`, così restano allineate a ogni dimensione dello schermo.
- In alto, testo piccolo: EN `how we work` / `from your file to the final image`, IT `come lavoriamo` / `dal tuo file all'immagine finale`.
- All'apertura la parola sale da dietro l'edificio (translateY dal basso dentro una maschera, 1.1s, expo.out). Con prefers-reduced-motion è già in posizione.
- Mobile: stessa composizione in verticale, parola dimensionata sulla larghezza dello schermo, controlla che la "o" resti dietro l'edificio a 390, 430 e 768px.

### 4.2 Introduzione
- Titolo: EN `A small studio` / `between Venice and Dubai`, IT `Uno studio piccolo` / `tra Venezia e Dubai`
- Testo: EN `We make photorealistic images and films for developers, real estate agencies, architects and interior designers. You send us what you already have and within days you receive images ready for listings, presentations and social media.` IT `Realizziamo immagini e video fotorealistici per costruttori, agenzie immobiliari, architetti e interior designer. Ci mandi quello che hai già e in pochi giorni ricevi immagini pronte per annunci, presentazioni e social.`

### 4.3 Dal modello all'immagine (il pezzo forte)
Etichetta EN `(From model to image)`, IT `(Dal modello all'immagine)`. Titolo EN `From your model` / `to the final image`, IT `Dal tuo modello` / `all'immagine finale`.

Due viste dello stesso progetto, selezionabili con due pillole (area 44px): EN `View 1 · Business hall` / `View 2 · Bar`, IT `Vista 1 · Business hall` / `Vista 2 · Bar`. Didascalia: `Elvira Business Centre, Dubai`.

Quattro stadi per ogni vista:
- Stadio 1 `stage1_model_viewN.png` (modello grigio del cliente)
- Stadio 2 `stage2_clay_viewN.png` (plastico bianco con la luce)
- Stadio 3 `stage4_final_viewN.png` mostrato in versione "in lavorazione": blur 18px, saturazione 0, scale 1.04, opacità 0.85, che si definisce fino a nitido. Sopra, una barra di avanzamento sottile in basso e una pillola di stato che cambia: EN `Generating` → `Refining` → `Delivered`, IT `In lavorazione` → `Rifinitura` → `Consegnato`
- Stadio 4 `stage4_final_viewN.png` nitido

`stage2` e `stage4` sono allineati al pixel: tra stadio 2, 3 e 4 la transizione è una linea verticale sottile che scorre da sinistra a destra e scopre lo stadio successivo (clip-path). Lo stadio 1 ha un'inquadratura diversa: tra stadio 1 e 2 usa una dissolvenza di 0.6s, non la linea. Usa per tutti e quattro lo stesso contenitore con il rapporto dello stadio finale (vista 1: 2048x1360, vista 2: 2752x1536), stadio 1 in `object-fit: cover`.

A sinistra (sopra, su mobile) il numero dello stadio grande e il testo, che cambiano a ogni stadio con l'effetto `data-split`:
- 01 EN `Your model` - `You send us SketchUp, Revit, a rough 3D or a set of drawings. We do not remodel anything.` IT `Il tuo modello` - `Ci mandi SketchUp, Revit, un 3D grezzo o dei disegni. Non rimodelliamo niente.`
- 02 EN `Light` - `We set the light first: where the sun comes in and how the shadows fall. You see it before any material.` IT `La luce` - `Prima impostiamo la luce: da dove entra il sole e come cadono le ombre. La vedi prima di qualsiasi materiale.`
- 03 EN `Materials` - `Materials, furniture and people go in. Every change you ask for is a single note.` IT `I materiali` - `Entrano materiali, arredi e persone. Ogni modifica che ci chiedi è una nota.`
- 04 EN `Delivery` - `The final image in 4K, in every format you need. First views in 1 to 2 working days.` IT `Consegna` - `L'immagine finale in 4K, in tutti i formati che ti servono. Le prime viste in 1-2 giorni lavorativi.`

Comportamento:
- Desktop (pointer fine, larghezza ≥ 900px): la sezione si ferma (ScrollTrigger pin) per circa 3 altezze di schermo e lo scroll fa avanzare gli stadi, con scrub morbido e snap su ogni stadio. L'immagine non si muove, cambia solo lo stadio. Usa DrawSVG (o una linea CSS) per la barra di avanzamento.
- Mobile e touch: niente pin. Quando la sezione è visibile al 50% gli stadi avanzano da soli ogni 2.2s, una volta sola; sotto l'immagine quattro puntini/numeri toccabili (44x44) per andare a uno stadio, e swipe orizzontale sull'immagine.
- prefers-reduced-motion: nessuna animazione, i quattro stadi uno sotto l'altro (mobile) o in griglia 2x2 (desktop) con il loro testo.
- Precarica gli stadi solo quando la sezione è vicina (lazy), mai al caricamento della pagina.

### 4.4 Cosa facciamo
Etichetta EN `(What we make)`, IT `(Cosa facciamo)`. Titolo EN `What we make` / `images, films and virtual staging`, IT `Cosa facciamo` / `immagini, video e home staging virtuale`.

Tre righe grandi a tutta larghezza, separate da una linea sottile. Ogni riga: nome grande a sinistra, descrizione piccola al centro, prezzo a destra:
- EN `Images` - `Photorealistic interiors and exteriors from floor plans, 3D models or photos, delivered in 4K.` - `From €25`; IT `Immagini` - `Interni ed esterni fotorealistici da planimetrie, modelli 3D o foto, consegnati in 4K.` - `Da 25 €`
- EN `Films` - `Videos from 10 to 90 seconds for social media, presentations and launches. Music, editing and colour grading included.` - `From €150`; IT `Video` - `Video da 10 a 90 secondi per social, presentazioni e lanci. Musica, montaggio e color grading inclusi.` - `Da 150 €`
- EN `Virtual staging` - `Send us a photo of an empty room and we send it back furnished, ready to be listed.` - `From €25`; IT `Home staging virtuale` - `Ci mandi la foto di una stanza vuota e te la restituiamo arredata, pronta per l'annuncio.` - `Da 25 €`

Desktop: passando sopra una riga compare una piccola immagine (circa 22vw) che segue il cursore con `gsap.quickTo` (durata 0.5, power3), con clip-path che si apre. Immagini: Images → `/projects/01_penthouse_dubai/penthouse_dubai_gallery_02.webp`, Films → `/projects/03_ca_dei_colli/ca_dei_colli_gallery_04.webp`, Virtual staging → `/projects/12_seaview_suites/seaview_suites_cover.webp`. Mobile: nessuna immagine che segue, la piccola immagine sta fissa sotto ogni riga. Sotto le righe, un bottone `See prices` / `Vedi i prezzi` che porta alla pagina prezzi.

### 4.5 Tempi
Etichetta EN `(Timings)`, IT `(Tempi)`. Sezione scura come il footer. Titolo EN `How long it takes` / `in working days`, IT `Quanto ci vuole` / `in giorni lavorativi`. Quattro numeri giganti che contano da zero quando entrano (una volta sola, 1.2s):
- `1–2` EN `Days for the first views` IT `Giorni per le prime viste`
- `5` EN `Days for a whole house` IT `Giorni per una casa intera`
- `2` EN `Weeks for a complete launch*` IT `Settimane per un lancio completo*`
- `1` EN `Day for each round of changes` IT `Giorno per ogni giro di modifiche`

Nel numero `1–2` il trattino deve avere spazio su entrambi i lati e stare a metà altezza delle cifre. Nota: EN `*Images and film. These are our usual delivery times. When we have several projects running at once, they can take a few days longer. We always confirm the delivery date before we start.` IT `*Immagini e video. Sono i nostri tempi abituali. Quando abbiamo più progetti in corso possono allungarsi di qualche giorno, ma la data di consegna te la confermiamo sempre prima di iniziare.`

### 4.6 Fatto con l'AI
Titolo EN `Yes, it is made with AI` / `and checked by people`, IT `Sì, lo facciamo con l'AI` / `e lo controlliamo noi`. Testo EN `AI is the reason we are fast and the reason a change costs almost nothing. Art direction, materials and quality control are done by us, and every image is checked like a photograph before it leaves the studio.` IT `Grazie all'AI siamo veloci e una modifica costa pochissimo. Direzione artistica, materiali e controllo qualità li facciamo noi, e ogni immagine viene controllata come una fotografia prima di uscire dallo studio.` A fianco, `/studio/studio_05_mother_of_pearl.webp` (già nel repo).

### 4.7 Il kit da scaricare
Etichetta EN `(Download)`, IT `(Da scaricare)`. Titolo EN `Our kit` / `three files to share with your team`, IT `Il nostro kit` / `tre file da girare al tuo team`.
Le tre copertine (`kit_cover_*`) come carte verticali, leggermente sovrapposte e ruotate di pochi gradi su desktop; al passaggio del mouse la carta si alza e si raddrizza. Mobile: carte in fila con scroll orizzontale e scroll-snap. Sotto ogni carta: nome, peso del file (calcolato al build) e link di download.
- EN: `Portfolio 2026`, `How we work`, `Price list 2026` → `kit_cover_portfolio_en`, `kit_cover_howwework_en`, `kit_cover_pricelist_en`
- IT: `Portfolio 2026`, `Come lavoriamo`, `Listino 2026` → `kit_cover_portfolio_it`, `kit_cover_comelavoriamo_it`, `kit_cover_listino_it`

### 4.8 Siti web, su richiesta
Subito dopo il kit, una sola riga piccola tra parentesi, colore `--mute`, allineata alla colonna del testo. Non deve sembrare un servizio principale:
- EN `(On private request, we also build and update websites for studios and agencies. Write to us.)`
- IT `(Su richiesta privata realizziamo e aggiorniamo anche siti web per studi e agenzie. Scrivici.)`
"Write to us" / "Scrivici" è un link a `mailto:info@omnyalab.com` con oggetto EN `Website request` IT `Richiesta sito web`.

### 4.9 Chiusura poster
Come l'apertura: `tryfree_poster_bg.jpg` + `tryfree_poster_fg.png`, parola su due righe che passa dietro il muro in travertino: EN `try it` / `free`, IT `prova` / `gratis`. In alto testo piccolo: `info@omnyalab.com` / `omnyalab.com · @omnyalab` e EN `the first image is free` IT `la prima immagine è gratis`. Bottone del campione gratuito (lo stesso `SampleCta`) in basso.

## 5. Pagina prezzi nuova

Crea `src/views/Pricing.astro`, `src/pages/pricing.astro` e `src/pages/it/pricing.astro`. Aggiungi la voce nel menu desktop e mobile: EN `Pricing` con nota `From €25`, IT `Prezzi` con nota `Da 25 €`. Stesso stile del sito (fondo chiaro, titoli Duo, tabelle con linee sottili, prezzi grandi).

- Titolo EN `Prices` / `clear from the start`, IT `Prezzi` / `chiari dall'inizio`
- Tabella render. Titolo EN `Images` / `package prices`, IT `Render` / `prezzi a pacchetto`. Colonne EN `Quantity`, `Price*`, `Per image`; IT `Quantità`, `Prezzo*`, `Al pezzo`:
  - 1 → €70 → €70
  - 5 → €300 → €60
  - 10 → €480 → €48
  - 20 → €800 → €40
  - 40 → €1,000 (IT `€ 1.000`) → €25, con pillola EN `Best value` IT `Più conveniente`. È l'unica riga evidenziata della pagina.
  - Sotto: EN `Every order includes one revision, 4K images and formats for web, social media and print. First views arrive in 1 to 2 working days.` IT `Ogni ordine comprende una revisione, immagini in 4K e i formati per web, social e stampa. Le prime viste arrivano in 1-2 giorni lavorativi.`
- Tabella video. Titolo EN `Films` / `prices by length`, IT `Video` / `prezzi in base alla durata`. Colonne EN `Length`, `Price*`, `Best for`; IT `Durata`, `Prezzo*`, `Ideale per`:
  - 10 s → €150 → EN `Social and ads` IT `Social e pubblicità`
  - 30 s → €350 → EN `Reels and pitches` IT `Reel e presentazioni`
  - 60 s → €650 → EN `Property film` IT `Video dell'immobile`
  - 90 s → €900 → EN `Launch film` IT `Film di lancio`
  - Sotto: EN `Music, editing and colour grading are always included. For films longer than 90 seconds we prepare a tailored quote.` IT `Musica, montaggio e color grading sono sempre inclusi. Per video più lunghi di 90 secondi ti prepariamo un preventivo su misura.`
- Nota: EN `*Prices for standard work. A simple project can cost less; a very complex one we price together before we start.` IT `*Prezzi per lavori standard. Un progetto semplice può costare meno; uno molto complesso lo valutiamo insieme prima di partire.`
- Caso reale, sezione scura con immagine di sfondo `/projects/05_corfu_resort/corfu_resort_gallery_06.webp` scurita: EN titolo `€1,860` / `that turned into millions`, testo `Hygeia Grove, Corfu. The resort only existed on paper. With 24 images and a 90-second film, for €1,860, the client presented it before the first stone was laid. Today the resort is open and turns over millions.` IT titolo `1.860 euro` / `che sono diventati milioni`, testo `Hygeia Grove, Corfù. Il resort esisteva solo sulla carta. Con 24 render e un film da 90 secondi, per 1.860 euro, il cliente l'ha presentato prima di posare la prima pietra. Oggi il resort è aperto e fattura milioni.` Tre numeri: `24` EN `Images, inside and out` IT `Render, interni ed esterni`; `90″` EN `Of film with music` IT `Di film con musica`; `€1,860` (IT `€ 1.860`) EN `Total cost, at list price` IT `Spesa totale, a listino`. Link al progetto `/work/hygeia-grove`.
- Condizioni: EN `50% deposit on confirmation, balance on delivery. Prices in euro, VAT not applied. Timings start from the deposit. In busier periods they can be a few days longer, but we always confirm the delivery date before we start. For larger volumes or ongoing work we prepare a tailored offer.` IT `Acconto del 50% alla conferma, saldo alla consegna. Prezzi esenti IVA. I tempi partono dal versamento dell'acconto. Nei periodi con più lavoro possono allungarsi di qualche giorno, ma la data di consegna te la confermiamo sempre prima di iniziare. Per volumi più grandi o collaborazioni continuative prepariamo un'offerta su misura.`
- In fondo il campione gratuito (`SampleCta`) e il link al listino PDF della lingua corrente.
- Mobile: le tabelle diventano liste, una riga per quantità, prezzo grande a destra.

## 6. PDF scaricabili

I 6 PDF sono già compressi in `public/kit/en/` e `public/kit/it/`: `omnya-lab-portfolio-2026-en.pdf` (11 MB), `omnya-lab-how-we-work-en.pdf`, `omnya-lab-price-list-2026-en.pdf`, `omnya-lab-portfolio-2026-it.pdf` (11 MB), `omnya-lab-come-lavoriamo-it.pdf`, `omnya-lab-listino-2026-it.pdf`. Non ricomprimerli. Link ai PDF della lingua corrente nella pagina Studio (sezione kit), nella pagina prezzi e nel footer (EN `Download our kit`, IT `Scarica il kit`).

## 7. Testi del resto del sito

Aggiorna in `src/i18n/index.ts`:
- `studio.description` EN `How Omnya Lab works: from your 3D model to the final image, in days.` IT `Come lavora Omnya Lab: dal tuo modello 3D all'immagine finale, in pochi giorni.`
- Elimina dal dizionario tutte le chiavi della vecchia pagina Studio che non usi più (`services`, `steps`, `detailsA`, ecc.).
- In IT sostituisci ovunque "sviluppatori immobiliari" con "costruttori", "film cinematografici" con "video", "Virtual staging" con "Home staging virtuale".
- Rileggi ogni testo rimasto in EN e IT con le regole scritte in cima e correggi solo quello che le viola.

## 8. Regole Apple (Human Interface Guidelines)

- `--mute` passa da `#9b9893` a `#6b6761` (contrasto 4.7:1 su `#edeae4`, oggi è 2.4:1). Controlla che i titoli in due toni restino eleganti; se la seconda riga dei titoli grandi (≥ 24px) usa una variabile separata, può restare più chiara purché abbia almeno 3:1.
- Aree cliccabili minimo 44x44: hamburger (oggi 28x28), selettore EN/IT, `.btn--sm` (oggi 40px), pallini e pillole nuove. Allarga con padding, non ingrandire le icone.
- Bottone WhatsApp flottante: rispetta `env(safe-area-inset-bottom)` e `env(safe-area-inset-right)`.
- Aggiungi `viewport-fit=cover` se manca, e usa le safe area sugli elementi fissi.
- Testo minimo 14px sul web. Lo zoom al 200% non deve tagliare o sovrapporre testi.
- prefers-reduced-motion: ogni animazione nuova deve avere la sua versione ferma.

## 9. Cursore su desktop

Su dispositivi con `(hover: hover) and (pointer: fine)` nascondi la freccia del sistema (`cursor: none` su html e su link e bottoni) e lascia solo il puntino che c'è già. Nei campi di testo e nelle aree selezionabili tieni il cursore di testo. Porta la durata del `quickTo` del puntino da 0.18 a 0.08, così segue il mouse senza ritardo ora che è l'unico cursore. Su touch non cambia niente. Se il mouse esce dalla finestra il puntino si nasconde (c'è già).

## 10. Controlli prima del push

1. `npm run build` senza errori.
2. `npx astro preview --port 4322` e `npm run check:media`.
3. Screenshot di ogni pagina, EN e IT, a 390x844, 430x932, 768x1024 e 1440x900: nessuno scroll orizzontale, nessun testo sovrapposto, nessuna immagine grigia o vuota (oggi nella pagina Studio da iPhone alcune foto restano grigie: trova il motivo e risolvilo).
4. Stessi controlli con prefers-reduced-motion attivo e con zoom al 200%.
5. Lighthouse mobile sulla home e sulla Studio: accessibilità ≥ 95, performance ≥ 85.
6. Mandami nel riepilogo finale: link dell'anteprima Vercel, elenco delle modifiche e gli screenshot della nuova pagina Studio a 390 e 1440.
