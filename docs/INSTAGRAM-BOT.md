# Bot Instagram di @omnyalab (al posto di ManyChat)

Gira sul sito, su Vercel, senza Mac acceso e senza costi. Dal 10/11/2026 fa tutto quello che facevano le automazioni ManyChat: ogni reel con la sua pagina, risposta a qualsiasi commento sui reel in mappa (con il suo interruttore), Omnya City con il link monouso, i vecchi tasti dei DM di ManyChat, la coda per il tetto di Meta, i clic sul link contati per post.

| File | Cosa fa |
| --- | --- |
| `api/_lib/ig-posts.js` | **la mappa: quale post porta a quale pagina** (l'unico posto dove si aggiunge un reel) |
| `api/_lib/ig-texts.js` | tutte le frasi, una serie per destinazione |
| `api/_lib/ig.js` | il giro, la coda, i contatori, il controllo di salute |
| `api/_lib/ig-store.js` | quello che il bot ricorda su Redis (chiavi `omnya:ig:*`) |
| `api/instagram.js` | riceve gli eventi da Meta, conta i clic, risponde al controllo di salute |
| `api/igtick.js` | svuota la coda e manda promemoria e follow-up (GitHub Actions ogni 5 minuti, Vercel Cron ogni minuto su Pro) |
| `api/leads.js` | la pagina di Nico: contatti, coda, errori, numeri per post, comandi |
| `scripts/ig-test.mjs` | le prove: `~/.local/node/bin/node scripts/ig-test.mjs` |

## Le modalità: `direct` (di default), `gate`, `comment`

**Perché esiste `direct`.** Prova dal vivo del 10/11/2026: con ManyChat tolto e Omnya Bot come app di routing predefinita, il tester @gghizzoo riceve tutto il giro, e i commenti di chiunque ricevono la risposta pubblica e il primo DM. Ma il tocco sul tasto di chi **non ha un ruolo sull'app** non arriva mai al webhook, né come messaggio né in standby: con lo Standard Access Meta non ci consegna i messaggi in entrata degli sconosciuti. Finché l'App Review non passa (Advanced Access) il bot non può dipendere da nessun tocco o messaggio in entrata.

**`direct` (link diretto), il default.** Al commento escono la risposta pubblica e **un solo DM che ha già il link**: un testo corto che chiede il follow in una riga e un tasto che apre la pagina giusta del post (`Get the Blueprint`, per City `Get my house`), con `?ig=<codice>` per contare i clic. Per City il link personale monouso viene creato al momento del commento, dal nome utente del commento. Il follow non si controlla più, si chiede e basta. Se Instagram rifiuta il tasto con il link, parte subito lo stesso testo con il link scritto dentro, e per 6 ore il bot manda direttamente il testo (così ogni commento costa una chiamata sola); la salute lo dice in `linkAs`. Niente promemoria "check Requests" dopo 3 ore, perché senza i "visto" non sappiamo chi ha aperto il DM. I tocchi e i messaggi che arrivano lo stesso (tester, chi ha un ruolo) ricevono il link subito, senza controllo del follow.

I testi di `direct` (`direct` in `ig-texts.js`), tutti con il tasto `Get the Blueprint`:

| Post | Testo del DM |
| --- | --- |
| Blueprint normale | Hey 🙌🏻 The Blueprint is ready 👇🏻 follow @omnyalab so you catch the next one, we drop a new build every week |
| torre rossa, 1 DAY | Hey 🙌🏻 The Tower Blueprint is ready 👇🏻 follow @omnyalab so you catch the next one, we drop a new build every week |
| 3D KILLED, CLAUDE COOKED | Hey 🙌🏻 The 3D to film blueprint is ready 👇🏻 follow @omnyalab so you catch the next one, we drop a new build every week |
| BUILD | Hey 🙌🏻 The Build Blueprint is ready 👇🏻 follow @omnyalab so you catch the next one, we drop a new build every week |
| TOWERS | Hey 🙌🏻 The Towers Blueprint is ready 👇🏻 follow @omnyalab so you catch the next one, we drop a new build every week |
| City (tasto `Get my house`) | Hey 🙌🏻 your house in Omnya City is ready 🏠 tap below, it’s one link, one house, made for your username, and follow @omnyalab so you watch the city grow |

**`gate` (giro completo).** Quello descritto sotto: tasto da toccare → controllo del follow → link. Si torna a usarlo quando la review passa.

**`comment` (cancello a commenti), pronta ma spenta: NON si può accendere prima della review.** La sonda dal vivo del 10/11 (commento di un account senza ruolo) ha risposto `ERROR 200 (#200) App does not have Advanced Access to instagram_manage_messages permission, and recipient user does not have role on app`: Meta non ci dice il follow di chi ha soltanto commentato, quindi oggi questa modalità manderebbe sempre il link al secondo commento. Resta nel codice per dopo. Il follow torna obbligatorio anche senza review, usando come canale di ritorno i commenti, che Meta ci consegna da chiunque:

1. primo commento di una persona di cui non abbiamo ancora l'id dei messaggi: risposta pubblica ("Check your DMs 👀 one quick step and it’s yours" e simili) e un DM **senza link**: "Hey 🙌🏻 The Towers Blueprint is ready, one step first: follow @omnyalab, then comment DONE under the reel and I’ll send it right over 👇🏻". La risposta di Meta a quel DM ci dà l'id dei messaggi della persona, che il bot salva;
2. la persona commenta di nuovo sotto lo stesso reel (qualsiasi parola): **prima di rispondere** il bot chiede a Meta se quell'id ci segue. Se segue, risposta privata a quel commento con il tasto che apre la pagina ("Thanks for the follow 🙌🏻 The Towers Blueprint is ready 👇🏻 we drop a new build every week, so keep an eye on the reels") e risposta pubblica; se non segue, solo il DM "Almost there 👀 follow @omnyalab first, then comment again under the reel and it’s yours";
3. al terzo commento il link parte comunque, come faceva ManyChat, con il testo di `direct`; dal quarto in poi niente;
4. una persona di cui abbiamo già l'id da un reel precedente viene controllata subito: se segue riceve il link al primo commento;
5. se il controllo dà errore o Meta non risponde (permesso negato, consenso mancante, nessun id), il bot fa come in `direct` e manda il link: nessuno resta senza niente.

Ogni risposta è la risposta privata a un commento diverso (mai due allo stesso commento), quindi resta nelle regole di Meta e dentro la coda a 750 l'ora; una persona può ricevere al massimo tre risposte per reel. I testi sono in `comment` dentro `ig-texts.js`. **Prima di accenderla guarda la sonda qui sotto**: ha senso solo se Meta ci dice il follow di chi ha soltanto commentato.

**La sonda del follow (sempre accesa, in ogni modalità).** Dopo ogni DM riuscito a un commento il bot salva l'id dei messaggi che Meta restituisce e chiede subito `is_user_follow_business` per quell'id. Non cambia niente del comportamento e non può rallentare né far fallire l'invio: scrive una riga nei log e conta. Nei log di Vercel cerca **`[ig] probe`**:

- `[ig] probe <username> → follows=true` oppure `follows=false`: Meta ce lo dice, la modalità `comment` può funzionare;
- `[ig] probe <username> → follows=unknown`: Meta risponde ma senza il dato;
- `[ig] probe <username> → ERROR <codice> <cosa ha detto Meta>`: Meta rifiuta.

I totali (seguono, non seguono, senza risposta, errori, ultimo errore) sono nella pagina di Nico, in `&format=json` (`followProbe`) e nella salute. Si spegne con `IG_PROBE=0` su Vercel.

**Cambiare modalità, senza deploy:** `https://www.omnyalab.com/api/leads?key=IG_ADMIN_KEY&action=mode&value=direct`, `&value=gate` oppure `&value=comment`. La scelta sta su Redis e vale entro 15 secondi; se non è mai stata scelta vale `direct`. La modalità in uso si legge nella pagina di Nico e nella salute (`flow`).

**Dopo la review** (Advanced Access su `instagram_manage_messages`): prova con un account senza ruolo che il tocco arrivi (in `gate`, una riga `[ig] message … → get` nei log), poi `&action=mode&value=gate`. Con i messaggi in entrata tornano anche il controllo del follow, il promemoria a 3 ore, il follow-up a 20 ore e la mail a Nico quando qualcuno risponde.

## Come registrare lo screencast per la review

La review di Meta vuole vedere il giro completo (tasto, controllo del follow, link). Si registra con @gghizzoo, che ha un ruolo sull'app, **senza toccare gli utenti veri**: chi è in lista riceve sempre il giro `gate`, tutti gli altri restano in `direct`.

**Prima di registrare**

1. Metti @gghizzoo in lista: `https://www.omnyalab.com/api/leads?key=IG_ADMIN_KEY&action=gatefor&value=gghizzoo` (più nomi separati da virgola; vale entro 15 secondi; in alternativa la variabile `IG_GATE_FOR` su Vercel, che però chiede un Redeploy). La risposta deve dire `"gateFor":["gghizzoo"]`.
2. Controlla la salute: `gateFor` contiene `gghizzoo`, `flow` resta `direct`.
3. Sul telefono, con @gghizzoo, **smetti di seguire @omnyalab** (serve per far vedere il passo "follow + Done").
4. Tieni aperti i log di Vercel filtrati su **`[ig] gate`**: ogni passo scrive una riga `[ig] gate gghizzoo step=…`.

**La scena, in ordine (registrazione schermo del telefono con @gghizzoo)**

| # | Cosa fa Nico sul telefono | Cosa deve comparire | Riga nei log |
| --- | --- | --- | --- |
| 1 | apre il reel della torre rossa e commenta `AI` | sotto il commento la risposta pubblica di @omnyalab ("Sent 🙌🏻 check your DMs…") | `step=comment "AI" post=DfSXvGDtt4s`, `step=dm-sent with the button "Get the Blueprint"`, `step=public-reply-sent` |
| 2 | apre i DM (anche in Richieste) | il messaggio "Hey 🙌🏻 The Tower Blueprint is ready, tap below and I’ll send it over 👇🏻" con il tasto **Get the Blueprint** | |
| 3 | tocca **Get the Blueprint** | "Hey, thanks for the comment 🙌🏻 … follow @omnyalab and I’ll send you the link right away…" con il tasto **Done ✅**, e nessun link | `step=tap "Get the Blueprint" → get`, `step=follow-check follows=false`, `step=ask-follow-sent (follow + Done button)` |
| 4 | (facoltativo) tocca **Done ✅** senza seguire | "Hmm, I can’t see the follow yet 👀 …" | `step=follow-check follows=false`, `step=still-not-following-sent (follow + Done again)` |
| 5 | apre il profilo @omnyalab e tocca **Segui**, torna nel DM e tocca **Done ✅** | "Thanks for the follow 🙌🏻 The Tower Blueprint is free on this page… " con il link omnyalab.com/the-tower-blueprint e la domanda con i tasti **Working on a project** / **Just curious** | `step=tap "Done ✅" → done`, `step=follow-check follows=true`, `step=link-sent page=/the-tower-blueprint with the question project/curious` |
| 6 | tocca il link | si apre la pagina del Blueprint | |
| 7 | torna nel DM e tocca **Working on a project** | "Love it 🙌🏻 the best way is a quick call where I show you a 3D demo of your tower, pick a time here: … Or text me on WhatsApp…" | `step=choice "Working on a project" → project`, `step=project-answer-sent (call link and WhatsApp)` |

Sotto i reel BUILD, TOWERS e 3D il giro è lo stesso fino al link, senza la domanda finale (passo 7).

**Rifare la scena.** Per chi è in lista non vale "una risposta per persona per reel": basta smettere di seguire e commentare di nuovo, anche sotto lo stesso reel (mai due risposte allo stesso commento). Se un passo non compare, la riga `[ig] gate` che manca dice dove si è fermato, e gli errori di Meta sono in `[ig] ERROR`.

**Dopo il video**: `https://www.omnyalab.com/api/leads?key=IG_ADMIN_KEY&action=gatefor&value=` (valore vuoto) toglie tutti dalla lista, e @gghizzoo torna in `direct` come gli altri.

## Il giro in `gate`

1. Qualcuno commenta sotto un reel. Il commento entra in coda e, se nell'ultima ora sono partiti meno di 750 DM, viene servito subito.
2. Sotto il commento esce una risposta pubblica a rotazione e parte il DM con il tasto **Get the Blueprint** (per City **Get my house**). Ogni persona lo riceve una volta sola per reel.
3. Tocca il tasto e il bot guarda se ci segue:
   - se ci segue riceve **un solo DM in inglese con il link della pagina** (la mail si raccoglie sul sito, nessun PDF allegato);
   - se non ci segue riceve "follow @omnyalab" con il tasto **Done ✅** (vale anche se scrive "done"), e al Done riceve il link, oppure "I can't see the follow yet" se ancora non segue.
4. Se il DM non può partire perché quella persona non riceve messaggi, sotto il commento esce "We can't send you the blueprint unless you send us a text…" e appena scrive il giro riparte.
5. Se dopo 3 ore il DM non è stato aperto, sotto il commento esce "Sometimes it goes on Request or General…".
6. Circa 20 ore dopo l'ultimo messaggio della persona parte un solo follow-up (dopo 24 ore Instagram non lo permette più).
7. Se Nico scrive a mano a qualcuno il bot si fa da parte con quella persona, e un DM che arriva dal nulla senza una parola resta a Nico.

Sui primi due Blueprint (pagina `/the-blueprint` e `/the-tower-blueprint`, anche `/the-tower-floors`) dopo il link resta la domanda "project or just curious?" con i due tasti, come deciso il 3/11; sugli altri (3D to film, Build, Towers, City) il DM è solo il link, come su ManyChat. Si cambia con `ask` in `ig-texts.js`.

## La mappa: quale post porta dove

Tutto in `api/_lib/ig-posts.js`. Vince la prima regola che trova:

1. **il post è in `POSTS`**, per il codice che sta nel link del reel (instagram.com/reel/**DfSXvGDtt4s**/):

   | Reel | Codice | Pagina |
   | --- | --- | --- |
   | torre rossa | `DfSXvGDtt4s` | omnyalab.com/the-tower-blueprint |
   | Tower "1 DAY" | `DfaH3QkN4qs` | omnyalab.com/the-tower-floors |
   | 3D "KILLED" | `DfU-nniRvNQ` | omnyalab.com/3d-to-film |
   | CLAUDE "COOKED" | `DfPzJmMtf2B` | omnyalab.com/3d-to-film |
   | Hold to build | `Dfh1ppmtT8t` | omnyalab.com/the-build-blueprint |
   | Omnya City Ep.1 | `DfXg47dtoyz` | link monouso della City |

2. **la caption dice "Comment PAROLA"** e la parola è in `WORDS`: `TOWERS` → /the-towers-blueprint, `BUILD` → /the-build-blueprint, `HOUSE` → City. Il reel TOWERS dell'11/11 e quello del 12/11 passano di qui da soli, senza scrivere il loro codice da nessuna parte.
3. la caption dice "Comment PAROLA" con un'altra parola: Tower Blueprint se la caption parla di una torre, Blueprint normale altrimenti, e solo a chi scrive quella parola (un errore di battitura è perdonato).
4. niente di tutto questo (teaser per i clienti ecc.): il bot non risponde.

Nei casi 1 e 2 (i post "in mappa") il bot risponde a **qualsiasi commento**, qualunque parola (Nico, 7/11 e 10/11): vedi qui sotto.

## Ogni commento riceve risposta (interruttore `any`)

Nico, 10/11: "tutti i messaggi vengono fatti con reply e gli mandiamo sempre tutto in DM anche se scrivono altro". Sotto un reel in mappa **qualsiasi commento di un'altra persona**, anche un'emoji, una domanda o una risposta scritta sotto il commento di qualcun altro, riceve la stessa risposta pubblica e lo stesso DM con il link di quel reel, come se avesse scritto la parola. È acceso di default.

Chi resta fuori, sempre:

- **noi**: i commenti di @omnyalab e le risposte che il bot stesso scrive sotto i commenti (riconosciuti dall'id dell'account e, come seconda sicura, dal nome `omnyalab`; se un giorno l'account cambia nome va messa la variabile `IG_USERNAME` su Vercel);
- **chi ha già ricevuto per quel reel**: una risposta per persona per reel, anche se commenta dieci volte;
- lo stesso commento consegnato due volte da Meta, e tutto quello che la coda già scarta (commenti più vecchi di 7 giorni, bot spento);
- **i post che non sono in mappa**: lì vale la regola di prima, risponde solo a chi scrive la parola della caption (caso 3), e sotto i post senza "Comment PAROLA" non risponde a nessuno (caso 4). Per far rispondere a tutti anche sotto un vecchio reel basta aggiungerlo alla mappa con `action=post` (vedi "Aggiungere un reel").

La coda e il tetto dei 750 DM l'ora sono gli stessi: più commenti con risposta vuol dire solo che l'ora si riempie prima, e chi arriva dopo aspetta in coda e riceve più tardi.

**Spegnerlo, senza deploy:** `https://www.omnyalab.com/api/leads?key=IG_ADMIN_KEY&action=any&value=off`, e `&value=on` per riaccenderlo. Vale entro 15 secondi e resta su Redis. Da spento i reel in mappa tornano a rispondere **solo a chi scrive la parola** (quella della caption, più `TOWERS`, `BUILD` o `HOUSE` se il reel porta a quelle pagine; errori di battitura perdonati), e chi aveva scritto altro può ancora scrivere la parola dopo. Lo stato si legge come `anyComment: true|false` in `&format=json` e nella salute, e in una riga della pagina di Nico.

### Aggiungere un reel

- **Non serve fare niente** se la caption contiene `comment "TOWERS"`, `comment "BUILD"` o `comment "HOUSE"`.
- **Subito, senza deploy**: apri `https://www.omnyalab.com/api/leads?key=IG_ADMIN_KEY&action=post&code=LINK-DEL-REEL&dest=towers` (in `code` va il link del reel o solo il codice; `dest` è uno tra `blueprint`, `tower`, `floors`, `film`, `build`, `towers`, `city`; senza `dest` lo toglie). Vale dal commento dopo.
- **Per sempre**: una riga in `POSTS` dentro `api/_lib/ig-posts.js`, per esempio `{ code: 'DfXXXXXXXXX', dest: 'towers', note: 'Choose your view, 11/11' },` e push.
- Una **pagina nuova** (un funnel nuovo): una serie di frasi in `ig-texts.js` con `funnel({ name, url, page })`, il nome aggiunto a `kinds`, una riga in `WORDS` o `POSTS`, e lo slug della pagina aggiunto alla prima regola di `vercel.json` (quella con `"key": "ig"`); la prova "vercel.json" avvisa se manca.

## Omnya City

Parola HOUSE (o il reel Ep.1 per codice): tasto **Get my house** → controllo del follow → il bot crea il link monouso con lo stesso codice di `POST /api/city/link` (`linkFor` in `api/_lib/city.js`, senza passare da una chiamata esterna e senza chiave) → DM con il tasto **Reserve my spot**. Chiedere due volte dà lo stesso link, il link vale una volta sola, e chi ha già la casa riceve il link della sua casa. Il reel Ep.2 non è in `POSTS`: funziona se la sua caption dice Comment "HOUSE", altrimenti va aggiunto col suo codice e `dest=city`.

## I vecchi tasti di ManyChat

Chi tocca un tasto di un DM mandato da ManyChat non resta senza risposta. Instagram ci passa l'etichetta del tasto, non il codice di ManyChat, e il bot la legge (vale anche se la persona scrive la stessa parola):

- **Get the Blueprint**, **Following**: controllo del follow, poi un DM con tre tasti (Tower Blueprint, 3D to film, Build Blueprint), perché non possiamo sapere sotto quale reel aveva commentato; è quello che faceva l'automazione "Vecchi tasti Blueprint" di ManyChat. Se la persona è già passata dal nostro bot riceve il link del suo reel.
- **Get my house**, **Done**: controllo del follow, poi il link monouso della City.

## La coda (tetto Meta: 750 DM l'ora)

Meta permette 750 risposte private l'ora (il DM che risponde a un commento) e ognuna vale 7 giorni dal commento. Il bot conta i DM dell'ultima ora (finestra che scorre, non l'ora d'orologio): finché sono meno di 750 il commento è servito subito, oltre resta in coda e parte appena si libera un posto, cioè un'ora dopo i primi DM, in ordine di arrivo. Nessuno si perde e nessuno riceve due DM: lo stesso commento consegnato due volte da Meta viene riconosciuto, due chiamate insieme non possono prendere lo stesso commento né lo stesso posto dell'ora, e la risposta pubblica "check your DMs" esce solo insieme al DM.

Chi svuota la coda:

- **ogni evento che arriva da Meta** (commenti, tocchi, "visto"), quindi mentre un reel gira la coda si muove da sola;
- **il cron di Vercel ogni minuto** su `/api/igtick` (`crons` in cima a `vercel.json`, dal 10/11 con il piano Pro; sul piano Hobby un cron più frequente di una volta al giorno fa fallire il deploy, quindi se si torna a Hobby va tolto);
- **GitHub Actions ogni 5 minuti** (`.github/workflows/igtick.yml`), come riserva.

Se è Meta a dire "too many calls" (conta anche i DM di altre app collegate) il bot si ferma 10 minuti e riparte dallo stesso punto. Se cinque DM di fila falliscono per un problema non della persona (token, permessi, chat ancora di un'altra app) il bot si ferma 2 minuti, prova con uno, e se va ancora male aspetta di più (fino a 15 minuti): i commenti restano in coda e partono quando il problema è risolto. Un commento che fallisce viene riprovato dopo 2, 10, 30, 120 e 360 minuti.

Variabili facoltative su Vercel: `IG_HOURLY_CAP` (default 750; si può abbassare a 700 per stare larghi), `IG_DRAIN_MS` e `IG_TICK_MS` (quanto lavora ogni chiamata).

## Quando Instagram rifiuta la risposta pubblica (errore `code 20 sub 1772107`)

Visto il 10/11 alle 09:56: `POST <id-commento>/replies: This API call does not support the requested response format [code 20 sub 1772107]`. Il testo dell'errore inganna, non c'entrano né il formato né il token: è il modo in cui Meta dice **"Instagram Comment Not Added"**, cioè Instagram non ha aggiunto la nostra risposta sotto quel commento. Succede quando il suo filtro automatico trattiene la risposta perché gli sembra ripetuta (le stesse poche frasi sotto tanti commenti), oppure quando quel commento non può ricevere risposte (nascosto da Instagram, cancellato nel frattempo, account limitato). Meta lo segna come non temporaneo, quindi riprovare non serve.

Cosa fa il bot:

- **il DM non ne risente**: parte sempre prima della risposta pubblica ed è una chiamata separata, quindi la persona ha già il link;
- la risposta pubblica viene provata una volta sola e non viene ripetuta (insistere peggiorerebbe il filtro);
- **non mette mai il bot in pausa**: la pausa scatta solo per i DM che falliscono, mai per le risposte pubbliche;
- l'errore resta nel contatore e nella pagina di Nico con una frase leggibile: `Instagram did not add our public reply [code 20 sub 1772107], the DM went out all the same: …`, con l'id del commento e il nome di chi ha commentato nei log (`[ig] ERROR public reply`).

Uno ogni tanto è normale. Se diventano tanti di fila vuol dire che Instagram sta frenando le risposte pubbliche dell'account: i DM continuano, e la cosa che aiuta è avere più frasi diverse in `publicReplies` dentro `ig-texts.js`.

## I titoli dei reel per l'app sul Mac (`action=media`)

`https://www.omnyalab.com/api/leads?key=IG_ADMIN_KEY&action=media` risponde in JSON con gli ultimi 30 post e reel dell'account, dal più nuovo:

```json
{ "media": [ { "id": "…", "shortcode": "DfSXvGDtt4s", "caption": "…", "permalink": "https://www.instagram.com/reel/DfSXvGDtt4s/", "thumbnail_url": "https://…", "media_type": "VIDEO", "timestamp": "2026-11-03T17:00:00+0000" } ] }
```

`shortcode` è lo stesso codice della mappa e dei numeri per post, così l'app può mettere il titolo accanto a ogni riga. `caption` è vuota se il post non ne ha; `thumbnail_url` è la copertina dei video e la foto stessa per le foto (per i caroselli può essere vuota), ed è un indirizzo di Instagram che scade dopo qualche giorno, quindi va ricaricato e non salvato. Il bot chiede la lista a Meta **al massimo una volta ogni 10 minuti** (con il token e l'account che usa già) e nel mezzo la legge da Redis; `&fresh=1` la richiede subito.

Se Meta rifiuta, la risposta è sempre un 200 con `{ "media": [], "error": "cosa ha detto Meta" }`; se c'era una lista di meno di un giorno fa torna quella, con `"stale": true` accanto all'errore. Non tocca il bot: non entra nel contatore degli errori e non ferma niente.

## I clic sul link

Il link nel DM è quello della pagina con il post in coda, per esempio `https://www.omnyalab.com/the-towers-blueprint?ig=DfXXXXXXXXX`. Una regola in `vercel.json` manda i link con `?ig=` a `/api/instagram?go=…`, che conta il clic per quel post e apre la pagina pulita. Le anteprime che Instagram fa del link non contano. Se la regola mancasse il link aprirebbe la pagina lo stesso, si perderebbe solo il conteggio.

## Cosa guardare

- **Pagina di Nico**: `https://www.omnyalab.com/api/leads?key=IG_ADMIN_KEY` → contatti, commenti in coda, DM dell'ultima ora, errori dell'ultima ora, e per ogni post commenti, DM mandati, DM bloccati, link mandati, clic sul link. Con `&format=json` solo i numeri (dentro ci sono anche `on`, `mode` e `anyComment`).
- **Salute**: `https://www.omnyalab.com/api/instagram?health=IG_ADMIN_KEY` → `on` (acceso o spento), `flow` (`direct`, `gate` o `comment`), `anyComment` (`true` = sui reel in mappa risponde a ogni commento, `false` = solo alla parola), `followProbe` (la sonda del follow), `gateFor` (chi riceve sempre il giro completo), `linkAs` (il link va sul tasto o nel testo), `mode` (tutti o solo i tester), `token` (valido, quale Pagina e quale Instagram), `webhook` (i campi accesi sulla Pagina e sull'app, e in `missing` quelli che mancano tra `comments`, `messages`, `messaging_postbacks`), `lastComment` (l'ultimo commento arrivato, anche se non ha avuto risposta: è la prova che il webhook è acceso), `line` (coda, DM dell'ultima ora, eventuale fermo), `errors` (ultima ora e gli ultimi cinque), `map` (i post e le parole).
- **Log**: Vercel → Logs → cerca `[ig]`; gli errori sono le righe `[ig] ERROR`. Nessun errore di Meta passa in silenzio: ognuno ha la sua riga con il codice (per esempio `[code 100 sub 2534037]` = la chat è ancora di un'altra app) e finisce nel contatore.

## Comandi (tutti con la chiave)

| Indirizzo | Cosa fa |
| --- | --- |
| `/api/leads?key=…` | la pagina |
| `/api/leads?key=…&action=post&code=…&dest=…` | aggiunge un reel alla mappa, subito |
| `/api/leads?key=…&action=mode&value=direct` | il primo DM ha già il link (default) |
| `/api/leads?key=…&action=mode&value=gate` | giro completo: tasto, controllo del follow, link |
| `/api/leads?key=…&action=mode&value=comment` | cancello a commenti: prima il follow, poi "comment DONE", poi il link |
| `/api/leads?key=…&action=gatefor&value=gghizzoo` | giro completo solo per questi username, per lo screencast (valore vuoto = nessuno) |
| `/api/leads?key=…&action=any&value=off` | sui reel in mappa risponde solo a chi scrive la parola (`&value=on`, il default: a ogni commento) |
| `/api/leads?key=…&action=media` | gli ultimi 30 post e reel in JSON, per i titoli nell'app (`&fresh=1` salta la memoria di 10 minuti) |
| `/api/leads?key=…&action=off` | **spegne il bot subito**, senza deploy (non risponde a nessuno e non tiene i commenti che arrivano) |
| `/api/leads?key=…&action=on` | lo riaccende |
| `/api/leads?key=…&action=subscribe` | collega la Pagina al webhook (una volta sola) |
| `/api/instagram?health=…` | salute |

## Chi riceve risposta (`IG_ONLY`)

- `IG_ONLY=gghizzoo` su Vercel (username o id, separati da virgola): il bot risponde **solo** a quegli account, a commenti e DM. Sotto i post senza "Comment PAROLA" il tester può usare le parole dei DM (BLUEPRINT, 3D, AI…).
- `IG_ONLY` vuota o tolta: il bot risponde **a tutti**. Dopo aver cambiato una variabile su Vercel serve un Redeploy.
- I messaggi arrivano al bot in due modi: normali, quando Omnya Bot è l'app che gestisce la chat, e "standby", quando la gestisce ancora un'altra app (ManyChat). Il bot risponde in tutti e due i casi; se la chat è ancora dell'altra app Meta rifiuta con l'errore #100 e lo si vede nei log e nel contatore.

## Per andare live al posto di ManyChat

Fatto il 10/11: Vercel su Pro, ManyChat tolto, Omnya Bot app di routing predefinita, `IG_ONLY` tolta, `comments` acceso. Resta:

1. **Push di `main`** da GitHub Desktop, e su Vercel il deploy deve dire Ready (il cron compare in Settings → Cron Jobs).
2. Apri la **salute**: `on` true, `flow` `direct`, `mode` `everyone`, `token.ok` true, `webhook.missing` vuoto.
3. **Prova da un account senza nessun ruolo sull'app**: un commento sotto un reel in mappa, e devono arrivare la risposta pubblica e un DM con il testo e il tasto `Get the Blueprint` che apre la pagina giusta. Poi tocca il tasto e ricarica la pagina di Nico: il clic deve comparire nella riga di quel post (se la pagina si apre ma il clic non compare, è la regola `?ig=` di `vercel.json` che non scatta: il funnel funziona lo stesso, manca solo il conteggio).
4. Se nel DM il link è scritto nel testo invece che sul tasto, Instagram ha rifiutato il tasto: va bene lo stesso, e la salute dice `linkAs: text`.
5. Quando esce il reel: la caption deve contenere `comment "TOWERS"`; primo commento di prova entro un minuto, poi la pagina di Nico per vedere commenti, DM e clic.

### Tornare indietro

- **Subito**: `/api/leads?key=…&action=off` spegne il bot senza deploy.
- Poi rimetti ManyChat come app delle conversazioni (punto 6 al contrario), riaccendi le sue automazioni e, se vuoi, metti di nuovo in pausa `comments` sull'app Omnya Bot.
- Per tornare alla sola prova: `IG_ONLY=gghizzoo` su Vercel, Redeploy, e `action=on`.

## Accensione da zero (già fatta il 3/11)

Meta: app "Omnya Bot" (id 1607399760453809) nel portfolio Omnya Lab, accesso tramite la Pagina Facebook Omnya Lab collegata a @omnyalab, webhook `https://www.omnyalab.com/api/instagram` con il verify token uguale a `IG_VERIFY_TOKEN`. Vercel: `IG_TOKEN` (token dell'utente di sistema, non scade), `IG_APP_SECRET`, `IG_VERIFY_TOKEN`, `IG_ADMIN_KEY`; facoltativa `IG_APP_ID` se l'app cambia. Poi una volta `/api/leads?key=…&action=subscribe`.
