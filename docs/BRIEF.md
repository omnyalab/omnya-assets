# omnyalab.com, brief per Claude Code

Leggi tutto prima di scrivere codice. Riferimento di struttura: Exo Ape (exoape.com), dettagli in `docs/exoape_style_reference.md`. Da Exo Ape prendiamo struttura, scala tipografica, spazi e transizioni. Colori, logo e tono sono i nostri, qui sotto.

## Chi siamo
Omnya Lab, studio di produzione visiva: visualizzazione architettonica, immagini e film cinematografici per luxury e real estate. Base tra Veneto e Dubai.

## Stack e hosting
- Sito custom, NON Squarespace. Next.js (o Astro) statico, deploy su Vercel, dominio omnyalab.com puntato su Vercel
- Tutto il materiale è già compresso e pronto in questo repo: non ricomprimere e non rinominare i file
- `src/data/projects.json` contiene progetti, categorie, percorsi di immagini e video, dimensioni e orientamento di ogni immagine. Il sito si costruisce leggendo quel file

## Priorità assoluta
Mobile first. I clienti aprono il sito dal telefono, quasi sempre dal link di Instagram. Ogni sezione si progetta prima a 390px, poi desktop. Lighthouse mobile performance sopra 90.

## Colori
| Ruolo | Valore |
|---|---|
| Fondo pagina | #EDEAE4, bianco sporco caldo, SEMPRE con grana leggera (noise SVG in overlay, opacità 4-6%) e una velatura calda. Mai bianco piatto |
| Testo principale, "omnya" | #111111 |
| Testo secondario, "lab" | #9B9893 |
| Linee sottili | #D6D1C8 |
| Footer | #0B0B0B |
| Accento | nessuno. Il colore arriva solo dalle foto |

## Tipografia
- Un solo font grottesco, un solo peso (400), gerarchia solo con la dimensione
- Font: Neue Montreal (Pangram Pangram). Alternativa gratuita: Inter Tight
- Titoli giganti con tracking negativo (circa -0.04em), su mobile scalano con clamp()
- Titoli in due toni: prima parte #111111, seconda parte #9B9893
- Niente corsivi, niente grassetti, niente punto finale nei titoli, niente maiuscolo urlato
- Testi brevi, discorsivi, tono da pari a pari. Non sembrare un'agenzia corporate perfettina

## Logo
In `public/brand/`:
- `logo_twotone_black.png` su fondo chiaro (versione principale: omnya nero, lab grigio)
- `logo_twotone_white.png` sopra foto e video scuri
- `logo_mono_black.png`, `logo_mono_white.png`, `logo_twotone_gold.png` di scorta
Usare SEMPRE il logo nuovo. Il vecchio simbolo che ruota non esiste più.

## Caricamento iniziale (preloader)
Il sito attuale ha già un preloader che piace molto, il codice è in `docs/current_preloader.md`. Va rifatto con lo stesso comportamento ma nel nuovo stile:
- Una sola volta per visita (sessionStorage), resta almeno 1,1 secondi e al massimo 3
- Fondo #EDEAE4 con grana, al centro il logo: compare "omnya" in nero, poi "lab" in grigio scivola dentro da sinistra
- Sotto, una linea sottilissima da 140px che si riempie in #111111 (finta fino all'85%, poi si chiude sul caricamento vero)
- Uscita: il pannello si alza come un sipario (translateY -100%, easing cubic-bezier(0.16,1,0.3,1), circa 0,9s) e sotto parte il reel della home
- Il contenuto della home aspetta la fine del preloader prima di animarsi

## Struttura
1. Home: reel a tutto schermo (`public/reel/home_reel_1080.mp4`, su mobile `home_reel_720.mp4`, poster `home_reel_poster.webp`), una frase sola, poi i progetti
2. Lavori: griglia asimmetrica con formati diversi, verticali e orizzontali alternati (usa `orientation` dal JSON). MAI griglie di quadrati uguali. Filtro per categoria: luxury, real estate
3. Pagina progetto: cover a tutto schermo con titolo in basso, poi immagini enormi alternate ai video, due righe di testo al massimo
4. Studio: chi siamo in poche righe
5. Contatti: tutto già pronto in `docs/CONTACTS.md` (WhatsApp, email con messaggi precompilati, Calendly, Instagram, LinkedIn, download). Footer scuro con email gigante, telefono, P.IVA, privacy
6. Privacy policy: testo in `docs/PRIVACY.md`

## Motion graphics e animazioni
È il punto che deve rendere il sito super figo. Tutto con GSAP + ScrollTrigger e Lenis:
- Smooth scroll con Lenis su tutto il sito
- Titoli che entrano parola per parola o riga per riga con maschera (testo che sale da sotto una linea)
- Immagini che si rivelano con una maschera che si apre (clip-path) e un leggero zoom out da 1.1 a 1
- Parallax leggero sulle immagini dentro i loro contenitori
- Transizione tra pagine: cliccando un progetto la sua immagine si allarga a tutto schermo e diventa la cover della pagina progetto
- Cursore personalizzato su desktop che diventa "guarda" sopra i progetti
- Numeri e contatori che scorrono (es. numero progetto 01, 02...)
- Un solo momento WebGL in home (three.js): le immagini dei progetti che si deformano leggermente come pellicola allo scroll o al passaggio del mouse. Su mobile disattivato e sostituito da animazioni CSS leggere
- Rispettare prefers-reduced-motion
- Niente particelle, stelline, glitter o effetti "magici"

## Media
- Immagini: ogni immagine ha la versione desktop (2400px) e `_mobile` (1200px), da usare con srcset/sizes. Lazy loading tranne la prima schermata
- Video: `_1080.mp4` per desktop, `_720.mp4` per mobile, `_poster.webp` come poster. autoplay muted loop playsinline, caricati solo quando entrano a schermo
- Il film di Ca' dei Colli ha i sottotitoli in inglese impressi nel video: va bene nella pagina progetto, non usarlo come sfondo muto
