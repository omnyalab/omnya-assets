# Come consegniamo un 3D interattivo

Questo è il metodo usato dall'8/11/2026 per la casa (`/demo/hold-to-build`) e per la torre SAMAR (`/demo/choose-your-floor`). Il 3D gira in localhost mentre lo facciamo; al cliente va un link veloce, che funziona su ogni telefono.

## 1. Standard: un link su Vercel

È quello che vendiamo con "Hosting & updates" a 49 € al mese.

**Dove sta.** Ogni progetto è una cartella statica (`index.html` + file), senza build.
- Demo nostre: `public/demo/<nome>/` di questo repo, online su `omnyalab.com/demo/<nome>/`.
- Progetti dei clienti: un progetto Vercel per cliente nel nostro team, con il loro sottodominio (es. `3d.cliente.com`, un record CNAME verso Vercel). Così un cliente non pesa sul sito Omnya, e se smette di pagare l'hosting si spegne solo il suo.
- I link privati di prova (`/view/<codice>/`) restano dove sono. Non si sovrascrivono: la versione veloce va in una cartella nuova.

**Come si prepara perché sia veloce.** Si usano sempre i fotogrammi e i video originali: niente interpolazioni e niente risoluzione più bassa sul PC.
- *Sequenze di fotogrammi* (casa che si costruisce allo scroll): JPG → AVIF.
  - PC: 1280 px, tutti i fotogrammi.
  - Telefono: taglio verticale 540×960, un fotogramma ogni due.
  - Si caricano a strati: prima il fotogramma 0 (che è anche il poster nell'HTML), poi le tappe, poi passate sempre più fitte (24, 12, 6, 3, 2, 1).
  ```bash
  ffmpeg -i frames/0500.jpg -vf scale=1280:-2 -c:v libaom-av1 -still-picture 1 -crf 33 -cpu-used 6 d/0500.avif
  ffmpeg -i frames/0500.jpg -vf "crop=608:1080:656:0,scale=540:960" -c:v libaom-av1 -still-picture 1 -crf 32 -cpu-used 6 m/0250.avif
  ```
- *Video a clip* (torre: volo, entrata, ritorni): H.264 a 1920×1080, CRF 20, preset slow, stessi fotogrammi (`-fps_mode passthrough`), `+faststart`. Il volo SAMAR esce con SSIM 0,988 rispetto all'originale, cioè a occhio è identico.
  ```bash
  ffmpeg -i fly.mp4 -an -c:v libx264 -crf 20 -preset slow -pix_fmt yuv420p -fps_mode passthrough -movflags +faststart fly.mp4
  ```
  - I clip si scaricano uno alla volta, nell'ordine in cui si guardano. Il primo sblocca la pagina, gli altri arrivano mentre il cliente si guarda intorno, e ogni clip entra tutto in memoria prima di partire (niente scatti).
  - Il primo fotogramma del primo clip è il poster, ed è precaricato.
- Telefono: una pagina `m/` con i file del telefono. La pagina PC ci manda chi ha lo schermo stretto.

**Numeri misurati (8/11, 4G simulato a 12 Mbit/s, 70 ms):**

| | Prima | Dopo |
|---|---|---|
| Casa, peso totale | 208 MB (960 JPG) | PC 37,6 MB · telefono 8,4 MB |
| Casa, telefono, sequenza completa | oltre 60 s (dopo 60 s ne aveva 56 MB su 208) | 10 s |
| Torre SAMAR, peso PC | 112 MB | 23,9 MB |
| Torre SAMAR, PC, pronta per il volo | tutti e 6 i clip prima di partire (il primo finito a 37 s) | 3,3 s |
| Torre SAMAR, telefono, pronta per il volo | tutti e 6 i clip prima di partire (il primo finito a 8,3 s) | 2,8 s |
| Prima immagine | | 0,3 s in locale; il dato vero è PageSpeed mobile online |

Il controllo finale è PageSpeed in modalità mobile sul link online: LCP sotto 2,5 s.

## 2. Dentro il sito del cliente: iframe

Se il cliente vuole il 3D dentro il suo sito, gli diamo questo pezzo da incollare. Punta allo stesso link Vercel, quindi gli aggiornamenti arrivano da soli.

```html
<iframe src="https://3d.cliente.com/" title="Choose your floor"
  style="width:100%;height:100vh;border:0;display:block"
  allow="fullscreen; autoplay" loading="lazy"></iframe>
```

- Per i 3D che vanno a scroll (la casa) l'iframe deve essere alto quanto lo schermo, e lo scroll vive dentro l'iframe. Se il sito del cliente ha una pagina intera libera è meglio un link a pagina intera.
- Per la torre a clic l'iframe va bene a qualsiasi altezza dalla 16:9 in su.

## 3. Versione offline per l'ufficio vendite (+490 €, solo su richiesta)

Da costruire solo quando un cliente la chiede. La procedura:

1. Si parte dalla cartella del link Vercel, ma con i file originali ad alta qualità: per lo schermo dell'ufficio non serve comprimere.
2. Si mette tutto in una cartella con un piccolo server locale (`python3 -m http.server`, o un'app Electron se il cliente non vuole il Terminale) e un'icona sul desktop che apre Chrome a schermo intero: `--kiosk --app=http://localhost:PORTA`.
3. Si prova senza Wi-Fi prima di consegnarla: font e librerie (gsap) vanno copiati dentro la cartella, perché da internet non arrivano.
4. Si consegna su chiavetta o col link di download, con una pagina di istruzioni di una riga ("doppio clic su Avvia").
