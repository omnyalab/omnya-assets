# Funnel da un solo file

Un funnel dei reel (Instant DM → opt-in → pagina video → Stripe → grazie) nasce da `funnels/<id>.json` e da
`scripts/new-funnel`. Le regole di Nico e il giro di lavoro completo sono nella skill `omnya-funnel`
(`~/.claude/skills/omnya-funnel/SKILL.md`); qui c'è solo cosa vuol dire ogni campo.

«Copia» vuol dire IDENTICO al funnel di riferimento: cambiano solo testi, immagini, link e colori. Il formato Riyadh
(pagina video del Riyadh, oggi identica in build, stadio e plane) si copia dalla pagina del Build, che è la versione
pulita in verde da cui sono nati stadio e plane; l'opt-in si copia dallo stadio, come per il plane.

## Comandi (dalla cartella del repo)

```
scripts/new-funnel make <id> --dry     # cosa cambierebbe, senza scrivere
scripts/new-funnel make <id>           # pagine, colori, e il funnel in tutti i file comuni
scripts/new-funnel stripe <id>         # i prodotti Stripe da creare (solo dopo l'ok di Nico)
scripts/new-funnel check <id>          # file mancanti, Stripe, consegna dei file
scripts/new-funnel test <id> --url http://localhost:5490          # prova completa in locale
scripts/new-funnel test <id> --url https://www.omnyalab.com --live # dopo il push
scripts/new-funnel board <id> --url http://localhost:5490 --out <cartella>   # la board ufficiale per Nico, prima del vai
scripts/new-funnel set-stripe <id> full --prod prod_… --price price_… --link https://buy.stripe.com/…
scripts/new-funnel controllo <id>      # le pagine nel controllo funnel, dopo il push
scripts/new-funnel judge plane --base e43bc69^ --vs e43bc69       # il giudice dello strumento
```

`make` si può rilanciare quante volte serve: le pagine si rifanno, nei file comuni aggiunge solo quello che manca.

## I campi

| campo | cosa | esempio (plane) |
|---|---|---|
| `id` | nome corto, minuscolo: dà `free-<id>`, `full-<id>`, `/learn/thanks/full-<id>` | `plane` |
| `slug` | la pagina opt-in | `the-plane-blueprint` |
| `from` | da quale funnel si copia: `watch` (default `build`) e `optin` (default `stadium`) | `{"watch": "build", "optin": "stadium"}` |
| `date` | giorno del funnel, va nei commenti | `18/11` |
| `name` | il nome nei titoli: The `Plane` Blueprint | `Plane` |
| `word` | la parola del reel, maiuscola | `PLANE` |
| `prefix` | le immagini `public/learn/<prefix>_*.webp` | `pl` |
| `theme` | la classe dei colori della card (2-4 lettere, nuova) | `pl` |
| `what` | per i commenti: di che reel è | `the plane reels where you book your own seat` |
| `links` | i link corti per Instant DM, `true` = 308 fisso, `false` = 307 | `{"/plane": true}` |
| `pack` | se il Full (e il kit) entrano in Everything we teach. Se la grazie mostra il Black Friday con «<Name> too», deve essere `true` | `true` |
| `optin.title`, `optin.description` | titolo e descrizione della pagina | |
| `optin.word` | la parola grande della card (Steal our FREE `Plane` method) | `Plane` |
| `optin.proof` | la riga sotto il bottone: sempre «Steal it before your competitors do» | |
| `optin.noMail` | il PDF gratis si scarica dalla pagina video, niente mail | `true` |
| `optin.extra`, `optin.css` | prop in più dell'OptIn (es. `last="" stamp="Skill" stampAfter`) e righe CSS solo di questa pagina | |
| `free.name`, `free.pdf` | il PDF gratis, in `public/learn/free/` | `omnya-lab-plane-blueprint.pdf` |
| `full.title`, `full.pdf` | il Full: titolo (va nella mail e nella grazie) e file in `private/learn/en/` | |
| `watch.title` | il titolo Step 2, con `<u class="hb2">` sulla cifra | |
| `watch.vsl`, `watch.vsl_poster` | il video di Nico in alto e il suo poster | `vsl_plane.mp4?v=1` |
| `watch.hook` | il gancio grande a due righe | `<b class="hb">Stop selling renders</b>clients pay for this now` |
| `watch.reel`, `watch.reel_poster`, `watch.reel_label` | il nostro reel sotto il gancio | `r_plane.mp4`, `p_plane.jpg`, `Our reel` |
| `watch.join` | «You can build `the same booking site` for your clients…» | |
| `watch.book_alt`, `watch.full_list` | il libro del Full e le 6 righe della sua card | |
| `watch.launch_end`, `watch.day2` | fine del prezzo di lancio (uguale per tutti) e il giorno dopo cui salgono i prezzi | `2026-11-22T23:59:59+01:00`, `Monday` |
| `kit` | la riga col kit (14,99): `short`, `row`, `small`, `image`, `list`. `null` = solo il Full | |
| `kit_file` | il file del kit in `private/learn/en/` per la consegna: `const`, `name`, `zip`, `note` | |
| `products` | `full` 5,99, `kit` 14,99, `full9` 9,99, `kit19` 19,99: `pid`, `stripe_name` (nome ESATTO del prodotto Stripe), `eur`, poi `prod`, `price`, `link` quando esistono | |
| `thanks.bf` | le prop della card gialla Black Friday nella grazie (`name`, `book`, e se serve `side`, `h`, `p`) | |
| `thanks.future` | la riga di The 3D Future | `these 3D planes` |
| `colors.watch` | il verde del Build portato al colore del funnel: `bright` [tinta, ×saturazione, +luce], `dark` [tinta, ×saturazione], `map` | `{"bright": [0.555, 1.0, 0.03], "dark": [0.58, 1.0], "map": {"#d4ff5a": "#d9f1ff"}}` |
| `colors.free_card` | la card del PDF gratis: `blue`, o `green` se la pagina è blu | `green` |
| `colors.optin` | i colori della card opt-in: `main`, `deep`, `light`, `mid`, `dh` (tinta dei fondi), `ds`, `bg` | |
| `colors.thanks` | la grazie: `hue` (0-1), `main`, `name` | `{"hue": 0.555, "main": "#38b6ff", "name": "plane sky blue"}` |
| `colors.optin_uncolor` | solo nei funnel che fanno da riferimento: come riportare i loro colori al blu Omnya | |
| `dm` | i testi di Instant DM (finiscono anche in `docs/DM-INSTAGRAM.md`) | |
| `own_words`, `allow` | solo nei riferimenti: parole loro che non devono restare nella copia, e i pezzi permessi | |

I prezzi del formato Riyadh sono fissi (5,99/29, 14,99/69,99, poi 9,99/19,99): sono scritti in tutta la pagina
(risparmi, −80%), quindi un prezzo diverso lo ferma e va fatto a mano.

## Il giudice (20/11/2026)

Rifatto il plane sul repo com'era prima del plane (`judge plane --base e43bc69^ --vs e43bc69`): le quattro pagine
nuove hanno lo stesso codice di quelle online, cambiano solo i commenti in testa; nei file comuni cambiano commenti,
l'ordine di una riga in Go.astro, le regole di consegna scritte col nome Stripe esatto, e le due scelte fatte da Nico il
19/11 (Plane nel pacchetto, Black Friday della grazie). Lo stesso sullo stadio (`--base 467c2ae^ --vs 467c2ae`).
