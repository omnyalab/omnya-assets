# Bot Instagram di @omnyalab (al posto di ManyChat)

Gira sul sito, su Vercel, senza Mac acceso. File: `api/instagram.js` (riceve gli eventi da Meta), `api/_lib/ig.js` (il giro), `api/_lib/ig-texts.js` (tutte le frasi), `api/igtick.js` (promemoria e follow-up, chiamato ogni mezz'ora da `.github/workflows/igtick.yml`), `api/leads.js` (elenco contatti). Prove: `node scripts/ig-test.mjs`.

Post delle torri: se la caption parla di una torre (tower, towers, torre, torri) il bot usa i testi e il link della Tower Blueprint (omnyalab.com/the-tower-blueprint), negli altri post il Blueprint normale. I testi torre sono in fondo a `ig-texts.js`.

## Il giro

1. Commento con la parola. La parola la legge da sola dalla caption ("Comment PROJECT", "Commenta 3D", "comment the word AI"): sotto i post senza "Comment PAROLA" in caption (teaser per i clienti, ecc.) il bot non risponde. Maiuscole, emoji e un errore di battitura non contano. Le parole in `IG_WORDS` (BLUEPRINT, PROJECT, 3D, AI, CLAUDE, DUBAI) valgono solo per chi le scrive direttamente in DM.
2. Risposta sotto il commento, una a caso tra sei, e DM con il tasto **Get the Blueprint**. Ogni persona lo riceve una volta sola per reel.
3. Tocca il tasto:
   - se ci segue, riceve il messaggio "se ci segue e commenta" di Nico;
   - se non ci segue, riceve il messaggio "follow @omnyalab" con il tasto **Done ✅** (vale anche se scrive "done").
4. Done: se adesso ci segue riceve "Thanks for the follow", altrimenti "I can't see the follow yet".
5. Sotto il Blueprint ci sono i tasti **Working on a project** e **Just curious**:
   - project: riceve il link della call gratis, e a info@omnyalab.com arriva una mail;
   - se dopo scrive qualcosa a parole, il bot non risponde e arriva una mail a Nico (al massimo una all'ora per persona).
6. Se il DM non parte, il bot scrive sotto il commento "We can't send you the blueprint unless you send us a text…". Appena la persona scrive, il giro riparte.
7. Se dopo 3 ore il DM non è stato aperto, il bot scrive sotto il commento "Sometimes it goes on Request or General…".
8. Circa 20 ore dopo l'ultimo messaggio della persona parte un solo follow-up: a chi non ci segue ancora "Still want The Blueprint?", a chi ha il Blueprint e non ha risposto la domanda sul progetto. Dopo 24 ore Instagram non permette più di scrivere in DM, per questo non si può fare a 2 giorni.
9. Se Nico scrive a mano a qualcuno, il bot si fa da parte con quella persona: niente risposte automatiche e niente follow-up.
10. Un DM che arriva dal nulla senza la parola resta a Nico.

Contatti: `https://www.omnyalab.com/api/leads?key=IG_ADMIN_KEY`

## Accensione (una volta sola)

### Meta (lo fa Nico, gli account e i login sono suoi)
1. developers.facebook.com → My Apps → Create app → caso d'uso **"Manage messaging & content on Instagram"** → nome "Omnya Bot".
2. **API setup with Instagram login** → Generate access tokens → Add account → entra con @omnyalab (deve essere un account professionale). Copia il **token** e, in alto, l'**Instagram app secret**.
3. Configure webhooks:
   - Callback URL: `https://www.omnyalab.com/api/instagram`
   - Verify token: lo stesso valore di `IG_VERIFY_TOKEN`
   - Campi: `comments`, `messages`, `messaging_postbacks`, `messaging_seen`
4. Instagram → Impostazioni → Messaggi → Strumenti collegati: attiva **"Consenti accesso ai messaggi"**.
5. In App settings → Basic:
   - Privacy policy: `https://www.omnyalab.com/privacy-policy`
   - Data deletion: `https://www.omnyalab.com/privacy-policy`

### Vercel (progetto omnyalab → Settings → Environment Variables)
- `IG_TOKEN`: il token del punto 2. Il bot lo rinnova da solo ogni 20 giorni.
- `IG_APP_SECRET`: l'app secret del punto 2.
- `IG_VERIFY_TOKEN`: una parola lunga a caso, la stessa del punto 3.
- `IG_ADMIN_KEY`: una parola lunga a caso per la pagina contatti.

Poi redeploy, e una volta `https://www.omnyalab.com/api/leads?key=IG_ADMIN_KEY&action=subscribe` (collega l'account al webhook).

### Prova e App Review
Finché l'app è in Development, il bot risponde solo agli account che hanno un ruolo sull'app: si aggiunge il profilo personale di Nico come Instagram Tester (App roles) e si prova commentando da lì. Per rispondere a tutti, Meta chiede di solito l'app in **Live** con **Advanced Access** su `instagram_business_manage_messages` e `instagram_business_manage_comments`. Serve un video del giro (si registra con il profilo di prova) e due righe sull'uso. È la stessa strada che ha fatto ManyChat. ManyChat resta acceso finché la review non passa, poi si spegne la sua automazione, altrimenti partono due DM.
