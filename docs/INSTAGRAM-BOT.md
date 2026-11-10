# Bot Instagram di @omnyalab (al posto di ManyChat)

Gira sul sito, su Vercel, senza Mac acceso e senza costi. Dal 10/11/2026 fa tutto quello che facevano le automazioni ManyChat: ogni reel con la sua pagina, risposta a qualsiasi commento sui reel in mappa, Omnya City con il link monouso, i vecchi tasti dei DM di ManyChat, la coda per il tetto di Meta, i clic sul link contati per post.

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

## Il giro

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

Nei casi 1 e 2 il bot risponde a **qualsiasi commento**, qualunque parola (Nico, 7/11).

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
- **`/api/igtick`**, chiamato da GitHub Actions ogni 5 minuti (`.github/workflows/igtick.yml`, GitHub può tardare di qualche minuto);
- **su Vercel Pro, il cron ogni minuto**. Sul piano Hobby un cron più frequente di una volta al giorno fa fallire il deploy, per questo non è in `vercel.json`. Quando il piano è Pro si aggiunge questo blocco in cima a `vercel.json`, subito dopo la prima `{`, e si fa push:

  ```json
  "crons": [
    { "path": "/api/igtick", "schedule": "* * * * *" }
  ],
  ```

Se è Meta a dire "too many calls" (conta anche i DM di altre app collegate) il bot si ferma 10 minuti e riparte dallo stesso punto. Se cinque DM di fila falliscono per un problema non della persona (token, permessi, chat ancora di un'altra app) il bot si ferma 2 minuti, prova con uno, e se va ancora male aspetta di più (fino a 15 minuti): i commenti restano in coda e partono quando il problema è risolto. Un commento che fallisce viene riprovato dopo 2, 10, 30, 120 e 360 minuti.

Variabili facoltative su Vercel: `IG_HOURLY_CAP` (default 750; si può abbassare a 700 per stare larghi), `IG_DRAIN_MS` e `IG_TICK_MS` (quanto lavora ogni chiamata).

## I clic sul link

Il link nel DM è quello della pagina con il post in coda, per esempio `https://www.omnyalab.com/the-towers-blueprint?ig=DfXXXXXXXXX`. Una regola in `vercel.json` manda i link con `?ig=` a `/api/instagram?go=…`, che conta il clic per quel post e apre la pagina pulita. Le anteprime che Instagram fa del link non contano. Se la regola mancasse il link aprirebbe la pagina lo stesso, si perderebbe solo il conteggio.

## Cosa guardare

- **Pagina di Nico**: `https://www.omnyalab.com/api/leads?key=IG_ADMIN_KEY` → contatti, commenti in coda, DM dell'ultima ora, errori dell'ultima ora, e per ogni post commenti, DM mandati, DM bloccati, link mandati, clic sul link. Con `&format=json` solo i numeri.
- **Salute**: `https://www.omnyalab.com/api/instagram?health=IG_ADMIN_KEY` → `on` (acceso o spento), `mode` (tutti o solo i tester), `token` (valido, quale Pagina e quale Instagram), `webhook` (i campi accesi sulla Pagina e sull'app, e in `missing` quelli che mancano tra `comments`, `messages`, `messaging_postbacks`), `lastComment` (l'ultimo commento arrivato, anche se non ha avuto risposta: è la prova che il webhook è acceso), `line` (coda, DM dell'ultima ora, eventuale fermo), `errors` (ultima ora e gli ultimi cinque), `map` (i post e le parole).
- **Log**: Vercel → Logs → cerca `[ig]`; gli errori sono le righe `[ig] ERROR`. Nessun errore di Meta passa in silenzio: ognuno ha la sua riga con il codice (per esempio `[code 100 sub 2534037]` = la chat è ancora di un'altra app) e finisce nel contatore.

## Comandi (tutti con la chiave)

| Indirizzo | Cosa fa |
| --- | --- |
| `/api/leads?key=…` | la pagina |
| `/api/leads?key=…&action=post&code=…&dest=…` | aggiunge un reel alla mappa, subito |
| `/api/leads?key=…&action=off` | **spegne il bot subito**, senza deploy (non risponde a nessuno e non tiene i commenti che arrivano) |
| `/api/leads?key=…&action=on` | lo riaccende |
| `/api/leads?key=…&action=subscribe` | collega la Pagina al webhook (una volta sola) |
| `/api/instagram?health=…` | salute |

## Modalità

- `IG_ONLY=gghizzoo` su Vercel (username o id, separati da virgola): il bot risponde **solo** a quegli account, a commenti e DM. Sotto i post senza "Comment PAROLA" il tester può usare le parole dei DM (BLUEPRINT, 3D, AI…).
- `IG_ONLY` vuota o tolta: il bot risponde **a tutti**. Dopo aver cambiato una variabile su Vercel serve un Redeploy.
- I messaggi arrivano al bot in due modi: normali, quando Omnya Bot è l'app che gestisce la chat, e "standby", quando la gestisce ancora un'altra app (ManyChat). Il bot risponde in tutti e due i casi; se la chat è ancora dell'altra app Meta rifiuta con l'errore #100 e lo si vede nei log e nel contatore.

## Per andare live al posto di ManyChat

1. **Vercel su Pro prima del push.** Con i due file `api/file.js` e `api/files.js` del sito le funzioni in `api/` sono 14, e il limite di Vercel sul piano Hobby è di 12 per deploy: su Hobby il deploy può fallire e online resterebbe la versione di prima.
2. **Push di `main`** da GitHub Desktop, e su Vercel il deploy deve dire Ready.
3. Apri la **salute**: `token.ok` deve essere `true`, e in `webhook.missing` leggi i campi da riaccendere.
4. **ManyChat**: metti in pausa tutte le automazioni (non cancellarle).
5. **Meta**, app Omnya Bot (id 1607399760453809), nella pagina dei webhook di Instagram dove il 3/11 è stato messo in pausa `comments`: riaccendi **`comments`**, e controlla che siano accesi **`messages`**, **`messaging_postbacks`**, **`messaging_seen`** e **`standby`** (facoltativo `message_echoes`, serve al bot per farsi da parte quando Nico scrive a mano).
6. **Chi gestisce le chat**: Meta Business Suite → Impostazioni → Integrazioni → Routing delle conversazioni → Instagram → App partner: a **Omnya Bot** vanno "Accedi a tutte le conversazioni" e "Prendi il controllo delle conversazioni", e ManyChat va tolto (oppure dalla Pagina Facebook → Configurazione della Pagina → Routing delle conversazioni su Instagram, Omnya Bot come app predefinita; Meta avvisa che non si torna a "non configurata", il ritorno è rimettere ManyChat come predefinita).
7. **Prova da tester** con `IG_ONLY=gghizzoo` ancora su: @gghizzoo commenta sotto la torre rossa, devono arrivare la risposta pubblica e il DM, poi tocca il tasto e deve arrivare il link (o "follow" e poi il link). Se il tocco dà l'errore #100 nei log, il punto 6 non è a posto.
8. **Vercel** → Settings → Environment Variables: **svuota o cancella `IG_ONLY`** (Production), poi Deployments → Redeploy.
9. **Prova da un account senza nessun ruolo sull'app**: commento, DM, tocco, link. È la prova che conta.
10. Quando esce il reel: la caption deve contenere `comment "TOWERS"`; primo commento di prova entro un minuto, poi la pagina di Nico per vedere commenti, DM e clic.

### Tornare indietro

- **Subito**: `/api/leads?key=…&action=off` spegne il bot senza deploy.
- Poi rimetti ManyChat come app delle conversazioni (punto 6 al contrario), riaccendi le sue automazioni e, se vuoi, metti di nuovo in pausa `comments` sull'app Omnya Bot.
- Per tornare alla sola prova: `IG_ONLY=gghizzoo` su Vercel, Redeploy, e `action=on`.

## Accensione da zero (già fatta il 3/11)

Meta: app "Omnya Bot" (id 1607399760453809) nel portfolio Omnya Lab, accesso tramite la Pagina Facebook Omnya Lab collegata a @omnyalab, webhook `https://www.omnyalab.com/api/instagram` con il verify token uguale a `IG_VERIFY_TOKEN`. Vercel: `IG_TOKEN` (token dell'utente di sistema, non scade), `IG_APP_SECRET`, `IG_VERIFY_TOKEN`, `IG_ADMIN_KEY`; facoltativa `IG_APP_ID` se l'app cambia. Poi una volta `/api/leads?key=…&action=subscribe`.
