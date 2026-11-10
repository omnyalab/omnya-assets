# Link privati dei PDF a pagamento

Dal 10/11 i PDF a pagamento non sono più in una cartella pubblica: stanno in `private/learn/` e si aprono solo con un link firmato che scade (`/api/file?f=…&e=…&s=…`). I vecchi indirizzi `/learn/files/61dd51d89913fd69/…` non danno più il file ma una pagina gentile che dice di scriverci.

## Chi li riceve e come
- Dopo il pagamento il webhook di Stripe manda la mail con un bottone per ogni PDF, e quei link valgono un anno
- La pagina `/learn/thanks/<prodotto>?session_id=…` mostra i bottoni solo se Stripe conferma il pagamento, con link da 24 ore, e il `session_id` vale 30 giorni
- Se un cliente scrive che il link non va, apri `https://www.omnyalab.com/api/files?key=<IG_ADMIN_KEY>` e trovi un link nuovo da 30 giorni per ogni file, da incollare su WhatsApp o in mail (manda solo quelli che ha pagato)

## Dove sono i file
- `private/learn/en/` e `private/learn/it/`, stessi nomi di prima
- Per sostituire un PDF basta sovrascrivere il file con lo stesso nome; per aggiungerne uno nuovo va messo anche in `api/_lib/learn-files.js` (nome del prodotto Stripe → file)
