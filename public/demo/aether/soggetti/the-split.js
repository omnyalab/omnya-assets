// SOGGETTO · "THE SPLIT" (scelta di Nico 20/11: T2 uguale alla foto, col nostro tocco).
// Dal concept «THE SPLIT II, conceptual facade» (autore da chiedere a Nico: credito nel LEGGIMI e nella caption).
// Misure prese dalla foto di Nico (_Riferimenti/The Split/split-facciata.jpg, 4,33 px/m, sagoma riga per riga):
// volume sinistro 268 m con la cima ad arco, destro 238 m, fessura 7,4 m, stanza sotto lo sbalzo a 123 m (soffitto 126,6 → 131,7 m),
// bronzo che si apre a tromba alla base (sinistra 9 m su 17 m, destra 12 m su 21 m), vela di vetro concava sopra la fessura.
// Colori dai pixel della foto: vetro #838d9a/#98a0ad, riflessi #edd8be, bronzo #a37150, cielo #a4c7e3 → #e9e0e0.
// Il nostro tocco: la fessura si accende al piano che scegli, la stanza sospesa è una lanterna calda, l'attico in cima con l'Upgrade.
import { costruisciTorre } from '../engine/kit/torre-livelli.js';

const H = 268, HD = 238;
/* nome della torre (Nico 20/11 «ci serve un nome»): proposte N1-N4 legate ai giardini e alle oasi, ?nome=falaj|hadiqa|saqiya|rawdah per provarle */
const NOMI = { falaj: ['Falaj', 'فلج'], hadiqa: ['Hadiqa', 'حديقة'], saqiya: ['Saqiya', 'ساقية'], rawdah: ['Rawdah', 'روضة'],   /* primo giro: bocciati da Nico («fan cagare, roba più figa») */
  vesper: ['Vesper', ''], ambra: ['Ambra', ''], sirr: ['Sirr', 'سرّ'], seam: ['Seam', ''], sahar: ['Sahar', 'سحر'], noctis: ['Noctis', ''],   /* secondo giro: «più figa ancora» */
  kairos: ['Kairos', ''], aether: ['Æther', ''], obsidian: ['Obsidian', ''], layla: ['Layla', 'ليلى'], solstice: ['Solstice', ''], burjkairos: ['Burj Kairos', ''] };   /* terzo giro N1-N6, Kairos consigliato */
const NOME = NOMI[new URLSearchParams(location.search).get('nome')] || NOMI.aether;   /* Nico 20/11: la torre si chiama Æther */
// città vere (riferimenti/the-split/citta.json, altezze da Wikipedia/CTBUH, posizioni da OSM): ?citta=dubai|riyadh|miami, senza = città bassa generica
const CITTA = await fetch(new URL('../riferimenti/the-split/citta.json', import.meta.url)).then(r => r.json()).catch(() => ({ citta: [] }));
const QC = new URLSearchParams(location.search).get('citta') ?? 'dubaihills';   /* Nico 20/11: Dubai Hills, si scopre solo dalle vetrate */
/* P1 Dubai Hills (Nico 20/11: la torre nei giardini degli Emirati): parco su OpenStreetMap way 857722893 (25,1063185 N, 55,2435398 E),
   lo skyline di Downtown e Business Bay ricalcolato dalle coordinate delle torri vere (Burj Khalifa a 10,6 km, verso nord-nord-est) */
const DH = { lat: 25.1063185, lon: 55.2435398 };
const daDH = t => ({ ...t, x: (t.lon - DH.lon) * 111320 * Math.cos(DH.lat * Math.PI / 180), z: -(t.lat - DH.lat) * 110574 });
if (QC === 'dubaihills') { const d = CITTA.citta.find(c => c.id === 'dubai'); if (d) {
  /* il lotto si può orientare: giro lo skyline vero (distanze e posizioni relative intatte) così che il Burj Khalifa stia davanti alla vetrata della Sky Room e non dietro la torre nella foto dal prato */
  const T0 = d.torri.map(daDH), burj = T0.find(t => /Burj Khalifa/.test(t.nome)), giro = Math.atan2(0.86, 0.5) - Math.atan2(burj.z, burj.x);
  const ruota = t => { const r = Math.hypot(t.x, t.z), a = Math.atan2(t.z, t.x) + giro; return { ...t, x: r * Math.cos(a), z: r * Math.sin(a) }; };
  CITTA.citta.push({ id: 'dubaihills', nome: 'Dubai Hills', torri: T0.map(ruota), bassi: { h: 18, stima: true } }); } }
const CIT = CITTA.citta.find(c => c.id === QC) || null;
const BASSI = { dubai: [35, 110], riyadh: [6, 22], miami: [18, 80], dubaihills: [8, 26] };   /* STIME, nessuna altezza media pubblicata */
const nellaPiazza = (x, z) => Math.abs(x) < 170 && z > -120 && z < 640;   // le torri vere che cadrebbero nella piazza della foto non si mettono
const TORRI = CIT ? CIT.torri.filter(t => !nellaPiazza(t.x, t.z)).map(t => ({ x: t.x, z: t.z, h: t.h, w: 26 + t.h * 0.07, d: 26 + t.h * 0.07, forma: /Burj Khalifa/.test(t.nome) ? 'burj' : 'box', nome: t.nome })) : [];
export const MODELLO = {
  seme: 5, ombra: 330, altezzaPiano: 4.2,
  volumi: [   // profili dalla foto: semiasse dal bordo della fessura verso fuori (m) a ogni quota (m)
    { lato: -1, n: 2.4, prof: 0.95, altezza: H, giro: 5, montanti: 62, largMontante: 0.08, profMontante: 0.18,
      profilo: [[0, 28.8], [24, 31.2], [47, 32.2], [75, 33.0], [103, 33.9], [130, 34.3], [149, 33.8], [177, 33.1], [204, 32.7], [223, 32.2], [244, 30.1], [258, 28.2], [268, 26.8]],
      arco: { picco: 0.58, giuFessura: 9.5, pot: 1.25, giuFuori: 11.5 } },
    { lato: 1, n: 2.3, prof: 0.98, altezza: HD, giro: 5, montanti: 56, largMontante: 0.08, profMontante: 0.18,
      profilo: [[0, 19.5], [24, 20.3], [47, 22.0], [75, 24.4], [94, 26.5], [121, 28.1], [130, 28.8], [149, 29.0], [167, 28.3], [186, 27.0], [204, 25.3], [223, 23.3], [232, 22.5], [238, 22.1]],
      arco: { picco: 0.5, giuFessura: 0.3, pot: 2, giuFuori: 0.6 } },
  ],
  fessura: { larghezza: 9.7, mezza: { sx: [[0, 3.7], [24, 4.2], [47, 4.6], [70, 4.8], [94, 4.7], [117, 4.2], [140, 3.2], [163, 2.6], [186, 2.2], [209, 1.8], [232, 1.2], [268, 1.1]],   // mezza fessura a sinistra: liscia
      dx: [[0, 3.7], [24, 4.2], [47, 4.6], [70, 4.8], [94, 4.9], [117, 4.9], [123, 4.8], [125.9, 4.8], [126.0, 2.4], [150, 2.2], [186, 2.0], [209, 1.7], [232, 1.2], [268, 1.1]] },
      siAccende: true, fondo: 9, sporgenza: 0.5, gradino: 0.3, passo: 5.4, spessoreSoletta: 0.35, atrio: 13, bronzoFino: 237.5,
    svasa: { sx: { h: 19, d: 9, pot: 1.4, vetro: true, lama: 2.6 }, dx: { h: 19, d: 19, pot: 1.4, vetro: true, lama: 4.2 } } },   // a sinistra solo il filo e l'atrio di vetro, a destra la grande falda di bronzo curva
  deriva: [[0, 2.6], [24, 2.6], [47, 1.4], [70, 0.2], [94, -0.6], [117, -1.4], [140, -2.2], [163, -2.6], [186, -2.1], [209, -1.0], [232, 0.1], [268, 0.1]],
  filo: 0.45, filoSx: 0.75, filoDx: 0.35, filoLuce: 0.1, ruvido: 0.13, riflessi: 1.15,
  vela: { fine: 11.5, parte: 252, quota: 240, pot: 1.6, spessore: 8 },
  stanza: { tipo: 'sbalzo', volume: 1, y0: 123, y1: [127.8, 136.5], yStanza: [127.7, 133.4], piatto: 0.25, piega: 0, labbro: 0.05, spessoreLabbro: 1.2, rientro: 0.76, muro: 0 },   // bordo dello sbalzo fino a ~2,7 piani in punta, vetro della stanza fino a 2 piani
  attico: { volume: 0, y0: 251.5, h: 3.1, casaJ: 0.1, palette: 1, specchio: true },   /* The Glass Crown: altri colori (I1 smeraldo) e casa a specchio (Nico 20/11) */
  palette: 2,   /* I2 avorio e bordeaux (Nico 20/11); si cambia con ?pal=1|2|3 */
  vista: [0.5, 0.86],   /* dove sta lo skyline di Downtown (lo stesso giro della città): l'attico si gira verso il Burj Khalifa */
  colori: { vetro: '#8b8e92', vela: '#98a1ac', montanti: '#aba79f', nucleo: '#2d2420', nucleoBasso: '#5a4030', soletta: '#55402f', bordoSoletta: '#a88660', soffitto: '#8f6d52', bronzo: '#5e4536', bronzoChiaro: '#9a7656', filo: '#d8b88e', solaio: '#d6cdbf', tetto: '#8c949d',
    luceCalda: '#ffcf96', luceFessura: '#ffd9a0', scelta: '#ff7a12', stanza: '#ffcf6a', preso: '#9ea3a8', pavimentoAttico: '#cbb393' },
};

export default {
  id: 'the-split', nome: 'Æther', valuta: 'AED',
  modello: MODELLO,
  colori: { scelta: '#ff7a12', sceltaChiara: '#ffb070', stanza: '#ffcf6a', preso: '#9ea3a8' },
  pianoMin: 4, esauriti: [12, 13, 27, 40, 41, 44],
  prezzo: { base: 2400000, perPiano: 38000, stanza: 18500000, attico: 64000000 },
  /* il piano aperto sotto lo sbalzo si chiama The Sky Majlis (Nico 20/11: un nome importante): il majlis è la sala d'onore delle case emiratine */
  testi: { torre: NOME[0], torreAr: NOME[1], vistaBreve: 'Downtown', stanza: 'The Sky Majlis', stanzaSopra: 'One of one', attico: 'The Glass Crown', atticoSopra: 'The top floor', biglietto: 'Choose your floor', data: 'Dubai Hills', nota: 'Concept by Omnya Lab', vista: 'view on Downtown Dubai' },
  pannello: true,
  uiTorre: 'U5',   /* card scelta da Nico 20/11: U5 Vetro liquido col filo (engine/ui-torre.js); ?ui= per provare le altre */
  /* versione vera (?reale=1, Nico 20/11 «non perdere minimamente qualità»): clip Kling originali e foto 4K filtro T, niente ricompressione.
     Le foto ferme sono gli arrivi dei voli (madre MC, dentro la Sky Majlis, la vista, dentro il Glass Crown); C1+C2 entrano nella Majlis, C3 la vista,
     C4+C5+C6 la salita dritta al Glass Crown, C7 il ritorno alla madre. «No, choose another floor» dalla vista non ha clip: dissolvenza sulla madre. */
  reale: { modulo: 'torre', cartella: 'assets/reale/the-split/', guida: 'stanza', luce: 1,
    /* «View the house» (Nico 21/11): panorama a 180° per casa; per ora quello del 3D (pano3d), poi le foto vere. La UI dentro le case arriva a clip finita */
    pano: { dentro: 'pano/P2', attico: 'pano/P6' }, anticipo: { dentro: 0, attico: 0 },   /* foto vere Seedream 5.5 (21/11), i panorami del 3D restano in pano3d/ */
    foto: { piano: '4k/T/MC.jpg', dentro: '4k/T/F2.jpg', vista: '4k/T/F3.jpg', attico: '4k/T/F6.jpg' },
    clip: { 'piano>dentro': ['clip/C1', 'clip/C2'], 'dentro>vista': ['clip/C3'], 'vista>attico': ['clip/C4', 'clip/C5', 'clip/C6'], 'attico>piano': ['clip/C7'] } },
  inizio: 1,
  casaYaw: 0.74,   /* nel 3D quanto ti giri a destra e a sinistra in «View the house» (come il panorama: ±42°) */   /* si parte già da «choose your floor» sulla foto madre, senza bottone (Nico 20/11) */
  lanterne: 1,
  // intorno come nella foto: piazza in pietra chiara con le strisce di prato sull'asse dell'ingresso, filari di alberi tondi, città bassa nella foschia
  intorno: T => ({
    seme: 4, lato: QC === 'dubaihills' ? 16000 : 5200,
    colori: { terra: [178, 170, 152], lotti: ['#cfc6b4', '#bcb3a1'], strada: '#56534f', prato: '#6f8f45', pratoChiaro: '#86a552', aiuola: '#4d6b33', pietra: '#a99f90', cordolo: '#e2dacb',
      chioma: '#4f6a36', citta: ['#cfc8bb', '#c3bfb6', '#d8d0c2', '#b8b6b2', '#c9c2b5'], torriCitta: '#a9b2bd' },
    verde: [{ x: -380, z: 260, r: 260 }, { x: 420, z: 300, r: 240 }, { x: 0, z: 760, r: 220 }],
    strade: [{ punti: [[-2600, 640], [0, 640], [2600, 640]], largh: 26 }, { punti: [[-2600, -260], [2600, -260]], largh: 22 }, { punti: [[-260, -2600], [-260, 2600]], largh: 20 }, { punti: [[300, -2600], [300, 2600]], largh: 20 }],
    piazza: { w: 300, d: 1080, z0: 20,
      prati: [[-9, 60, 18, 470], [-120, 60, 72, 520], [48, 60, 72, 520], [-22, 960, 44, 14], [-30, 1000, 60, 10], [-26, 905, 52, 9]],   // striscia di prato sull'asse dell'ingresso + prati ai lati
      aiuole: [[-6, 70, 12, 26], [-6, 130, 12, 26], [-6, 190, 12, 26], [-6, 250, 12, 26], [-6, 310, 12, 26], [-6, 370, 12, 26], [-6, 430, 12, 26], [-6, 490, 12, 26]], panchine: true },
    alberi: [{ x: 70, z: 850, r: 26, n: 9, s: 2.0 }, { x: 105, z: 790, r: 30, n: 10, s: 2.0 }, { x: 95, z: 640, r: 45, n: 16, s: 1.8 }, { x: 88, z: 470, r: 50, n: 16, s: 1.7 },
      { x: 82, z: 150, r: 55, n: 22, s: 1.5 }, { x: 70, z: 280, r: 40, n: 12, s: 1.5 }, { x: -58, z: 985, r: 6, n: 2, s: 2.4 }, { x: -95, z: 200, r: 40, n: 10, s: 1.4 }, { x: -110, z: 520, r: 40, n: 8, s: 1.6 },
      { x: -300, z: 250, r: 180, n: 160, s: 1.3 }, { x: 300, z: 250, r: 180, n: 160, s: 1.3 }, { x: -330, z: -160, r: 200, n: 160, s: 1.2 }, { x: 330, z: -160, r: 200, n: 160, s: 1.2 }],
    gente: { n: 0, w: 50, z0: 36, d: 200 },
    citta: { n: CIT ? 2200 : 1400, da: CIT ? 520 : 900, a: CIT ? 3800 : 2600, h: CIT ? BASSI[CIT.id] : [12, 70], luce: 0.8, torri: TORRI, libero: (x, z) => (Math.abs(x) < 380 && z > -60 && z < 1400) || TORRI.some(t => Math.hypot(t.x - x, t.z - z) < 60) },
    vuoti: (x, z) => (Math.abs(x) < 46 && z > -45 && z < 42) || (Math.abs(x) < 12 && z > 40 && z < 1100),
  }),
  costruisci() { return costruisciTorre(this); },
  lookIniziale: 'chiaro',
  looks: {
    // come la foto: tramonto chiaro, sole basso dietro a destra, cielo azzurro che va al pesca, foschia sulla città
    chiaro: { sole: { alt: 8, az: 112, colore: '#ffb070', forza: 5.0, alone: '#ffb070', aloneK: 1.0 }, envSole: 4.2, cielo: ['#8fbde3', '#cfd8e2', '#f3d2b4'], orizzonte: 0.2, amb: { cielo: '#c2d3e8', terra: '#a8896a', forza: 0.75, riflessi: 1.45 },
      nebbia: { colore: '#e7dcd6', densita: QC === 'dubaihills' ? 0.00009 : 0.00036, orizzonte: 0.6 }, esposizione: 1.0, luci: 0.2, fari: 0, bloom: [0.16, 0.4, 0.92] },
    blu: { sole: { alt: -4, az: 112, colore: '#7d8fc4', forza: 0, alone: '#ff9a62', aloneK: 0.5 }, cielo: ['#0e1c3e', '#30528f', '#db9470'], amb: { cielo: '#5b75b6', terra: '#2c2722', forza: 1.0, riflessi: 0.9 },
      nebbia: { colore: '#3a4a74', densita: 0.00034 }, esposizione: 1.15, luci: 1, fari: 0, bloom: [0.45, 0.3, 0.8] },
    oro: { sole: { alt: 5, az: 112, colore: '#ffb36e', forza: 4.6, alone: '#ffb27a', aloneK: 1.1 }, cielo: ['#6e98cf', '#e6b997', '#f8d3b0'], amb: { cielo: '#b5c4dc', terra: '#7d6450', forza: 0.65, riflessi: 1.2 },
      nebbia: { colore: '#efc9a8', densita: 0.00034 }, esposizione: 1.0, luci: 0.35, fari: 0, bloom: [0.2, 0.42, 0.9] },
  },
  riprese: {
    mondo: { pos: [-3.05, 1.7, 1050], tgt: [-3.05, 1.7, 0], fov: 21.51, shift: 0.251 },   /* 20/11 notte: camera adattata alla foto madre vera (viale con la vasca): la torre combacia entro 2 px. Prima: pos [0,1.7,1050] fov 17.2 shift 0.395 */   // dal prato sull'asse dell'ingresso, verticali dritte: la foto di Nico
    torre: { pos: [-3.05, 1.7, 1050], tgt: [-3.05, 1.7, 0], fov: 21.51, shift: 0.251 },   /* scegli il piano dalla foto madre dal basso (Nico 20/11): stessa ripresa del mondo, si sceglie tutto da lì */
    torreLato: { pos: [160, 60, 440], tgt: [0, 60, 0], fov: 40, shift: 0.297 },   /* la vecchia ripresa di tre quarti, tenuta per prove */
    vicino: { pos: [70, 112, 95], tgt: [12, 128, 10], fov: 42 },
    sbalzo: { pos: [40, 106, 112], tgt: [18, 130, 0], fov: 50 },   // come la seconda foto di Nico: lo sbalzo dal basso, la fessura a sinistra
    sotto: { pos: [36, 96, 52], tgt: [14, 134, 6], fov: 52 },
    drone: { pos: [420, 330, 820], tgt: [0, 150, -300], fov: 46 },   // per le prove delle città: si vede lo skyline dietro la torre
    base: { pos: [0, 1.7, 140], tgt: [0, 1.7, 0], fov: 38, shift: 0.42 },
    cima: { pos: [-40, 250, 160], tgt: [0, 245, 0], fov: 40 },
    booked: { pos: [120, 150, 520], tgt: [213, 150, -6], fov: 40 },   // finale: torre a sinistra, biglietto Booked a destra
    viaAttico: [40, 196, 120], viaBooked: [70, 175, 210],
  },
  // solo «choose your floor» (Nico 20/11): niente Booked né biglietto finale. Dalla Sky Room «Upgrade to the penthouse» porta in cima.
  livelli: [
    { id: 'mondo', tipo: 'mondo', titolo: () => ['Dubai Hills', 'Choose your floor'], bottone: () => ({ testo: 'Choose your floor', id: 'avanti' }), volo: 3.4 },
    { id: 'piano', tipo: 'piani', titolo: null, volo: 0.5 },   /* stessa ripresa della foto madre: si parte da qui (inizio: 1); il titolo sta nel pannello di vetro come SAMAR */
    /* Nico 21/11: appena entri «View the house» (ti guardi intorno col mouse), poi sotto «View the skyline» */
    { id: 'dentro', tipo: 'dentro', titolo: st => [st.casa ? 'Move the mouse to look around' : 'Floor 29 · 123 m', 'The Sky Majlis'], bottone: st => st.casa ? { testo: 'View the skyline', id: 'liv:3' } : { testo: 'View the house', id: 'casa' } },
    { id: 'vista', tipo: 'dentro', titolo: () => ['The Sky Majlis · Downtown Dubai', 'Are you satisfied?'], bottoni: () => [{ testo: 'No, choose another floor', id: 'liv:1', secondario: true }, { testo: 'Upgrade to the Glass Crown', id: 'liv:4' }] },
    { id: 'attico', tipo: 'dentro', titolo: st => [st.casa ? 'Move the mouse to look around' : 'Floor 60 · 252 m', 'The Glass Crown'], bottone: st => st.casa ? { testo: 'Choose another floor', id: 'liv:1' } : { testo: 'View the house', id: 'casa' } },
  ],
  giri: {
    /* 20/11 notte, il video da ~30 s tutto continuo: choose your floor già aperto sulla foto madre, la luce passa su due piani, Sky Majlis, «Enter»,
       sali ed entri, «View the skyline», «Are you satisfied?» → «Upgrade to the Glass Crown»: giri intorno alla torre salendo, entri in cima (altri colori),
       «Choose another floor»: esci all'indietro e torni giù alla foto madre. pausa = secondi dopo l'arrivo (la camera intanto scivola). */
    /* tempi tarati sulle clip (Kling 3-4 s): clic su Enter a 4,0 s; poi C1 3 s + C2 3 s, C3 4 s, C4 4 s + C5 3 s + C6 3 s, C7 3 s + C8 3 s, fine sulla foto madre */
    A: { look: 'chiaro', passi: [{ pausa: 0.5 }, { piano: 16, dur: 0.6, ferma: 0.15 }, { piano: 40, dur: 0.5, ferma: 0.15 }, { stanza: true, dur: 0.6, ferma: 0.45 }, { bottone: 'scegliUltimo', dur: 0.55, ferma: 0.25, clic: true },
      { pausa: 0.3 }, { bottone: 'casa', dur: 0.6, ferma: 0.25, clic: true }, { pausa: 0.5 }, { xy: [80, 600], dur: 1.6, ferma: 0.5 }, { xy: [1840, 600], dur: 2.4, ferma: 0.5 }, { xy: [960, 640], dur: 1.1, ferma: 0.1 }, { bottone: 'liv:3', dur: 0.6, ferma: 0.25, clic: true }, { pausa: 0.27 }, { bottone: 'liv:4', dur: 0.7, ferma: 0.25, clic: true }, { pausa: 0.3 }, { bottone: 'casa', dur: 0.6, ferma: 0.25, clic: true }, { pausa: 0.5 }, { xy: [1840, 600], dur: 1.6, ferma: 0.5 }, { xy: [80, 600], dur: 2.4, ferma: 0.5 }, { xy: [960, 640], dur: 1.1, ferma: 0.1 }, { bottone: 'liv:1', dur: 0.6, ferma: 0.25, clic: true }, { pausa: 1.3 }] },
    /* B più corto: Sky Majlis, skyline, upgrade, fine dentro il Glass Crown */
    B: { look: 'chiaro', passi: [{ pausa: 0.8 }, { piano: 40, dur: 0.7 }, { stanza: true, dur: 0.7, ferma: 0.5 }, { bottone: 'scegliUltimo', dur: 0.6, clic: true },
      { pausa: 0.5 }, { bottone: 'liv:3', dur: 0.7, clic: true }, { pausa: 0.7 }, { bottone: 'liv:4', dur: 0.8, clic: true }, { pausa: 2.4 }] },
  },
  biglietto: false,
};
