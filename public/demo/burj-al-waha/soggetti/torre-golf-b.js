// SOGGETTO · torre golf, versione B (Nico 24/11): stessa torre e stessa foto madre (M2), ma si entra nel piano 11 del volume destro, quello col balcone
// e la pianta sull'angolo: «forse è meglio farlo entrare qua». Giro: dentro (Q1) → in fondo a sinistra la cucina con l'isola → di nuovo a sinistra la camera
// con la porta aperta (solo finestroni) → fuori dalla finestra, ci si gira e si vede tutta la torre (si torna alla foto madre e si sceglie di nuovo).
// Regola del 24/11 (skill omnya-choose-your): le foto si fanno a catena, ognuna con la precedente come @ reference; ogni foto chiave è end di una clip e start della dopo.
import A from './torre-golf.js';
import { casaGolfB, giroCasaB, CB } from './torre-golf-casa-b.js';

const logge = A.torre.logge.map(l => ({ ...l }));
logge.push({ lato: 'dx', y0: 43.1, y1: 47.1, prof: 2.4, colonne: [],
  porte: [{ x: CB.entra.x + 0.2, w: 2.0, h: 2.9 }, { x: CB.esce.x, w: 2.2, h: 2.9 }],   /* si entra da destra (Q1), si esce dalla finestra della camera */
  piante: [{ x: 15.3, z: 9.9, h: 2.3, r: 1.0, vaso: 0.5, seme: 17 }, { x: 2.6, z: 10.1, h: 1.2, r: 0.6, vaso: 0.4, seme: 5 }, { x: 0.4, z: 10.0, h: 1.4, r: 0.7, vaso: 0.4, seme: 8 }] });

/* Nico 24/11: «tutti i piani si possono scegliere, destra e sinistra», «la luce perfetta per ogni piano, non deve sbordare».
   Il vetro di ogni piano misurato sulla foto 1 (2720x1536 px): righe dei solai e bordi dei due volumi, non il 3D. A = volume sinistro (più piccolo), B = destro. */
const XA = [1282, 1415], XB = [1455, 1676];
const RETT = [
  ...[[20, 160, 205], [19, 215, 272], [18, 282, 338], [17, 349, 389], [16, 399, 440], [15, 450, 491], [14, 500, 542], [13, 551, 593], [12, 601, 643], [11, 653, 695],
      [10, 703, 745], [9, 753, 795], [7, 809, 886, 8], [6, 901, 946], [5, 955, 996], [4, 1006, 1089], [3, 1096, 1129]].map(([n, y0, y1, n2]) => ({ n, n2, lato: 'dx', x0: XB[0], x1: XB[1], y0, y1 })),
  ...[[19, 165, 273], [18, 281, 341], [17, 349, 390], [16, 399, 441], [15, 450, 491], [14, 500, 542], [13, 551, 593], [11, 608, 686, 12],
      [10, 701, 746], [9, 753, 796], [8, 802, 846], [7, 853, 897], [6, 904, 947], [5, 954, 996], [3, 1010, 1078, 4]].map(([n, y0, y1, n2]) => ({ n, n2, lato: 'sx', x0: XA[0], x1: XA[1], y0, y1 })),
];

export default {
  ...A, id: 'torre-golf-b', nome: 'Torre golf B',
  torre: { ...A.torre, logge },
  casa: { ...A.casa, vetri: { dx: [43.1] }, passaggio: null, uscita: { lato: 'dx', x: 999, w: 0 }, pianoSpeciale: { n: 11, lato: 'dx', nome: 'The Sky Diwan' } },
  benvenuto: { sopra: 'Welcome to', titolo: 'The Sky Diwan', ar: 'الديوان', sotto: 'Level 11B · Burj Al Waha', piano: 'Floor 11B', stile: 'W2', da: 3.3, a: 8.6, fadeIn: 1.4, fadeOut: 0.9, livello: 'salotto', wf: 'V1' },   /* Nico 24/11 sera: welcome al centro a tutto schermo, il nero copre la vetrata che si apre */   /* Nico 24/11: W2 con dissolvenza leggera mentre si entra dalla vetrata */   /* F2 senza punto (Nico 24/11) */
  casaFn: casaGolfB, giroFn: giroCasaB, lucePerLato: true, rettangoli: { foto: [2720, 1536], lista: RETT }, aree: { sx: 230, dx: 380 },   /* m² STIMA dal 3D: 11,5 e 18,6 x 22 m meno muri */
  /* versione vera (?reale=1): foto 1 e le 4 clip Kling del giro a catena; si torna sulla foto 1 e si sceglie di nuovo */
  reale: { modulo: 'torre', cartella: 'assets/reale/torre-golf-b/', luce: 0.62, stileLuce: 'accese,contorno', foto: { piani: '4k/1.jpg', dentro: '4k/1.jpg' },
    clip: { 'piani>salotto': ['clip/K1'], 'salotto>cucina': ['clip/K2'], 'cucina>camera': ['clip/K3'], 'camera>piani': ['clip/K4'] },
    anticipo: { piani: 0, salotto: 0, cucina: 0, camera: 0 } },
  /* Nico 24/11 sera: «sono io che scelgo dove andare»: ci si ferma nel salotto, in cucina e in camera, poi si esce. Niente fermata al tavolo («sennò si blocca»).
     dir = da che parte va la clip dopo (la freccia della pill punta lì): K2 gira a sinistra verso la cucina, K3 a sinistra verso la camera, K4 dritto fuori dalla vetrata. */
  stanze: [
    { id: 'salotto', nome: 'The Lounge', breve: 'Lounge', dir: 'sx' },
    { id: 'cucina', nome: 'The Kitchen', breve: 'Kitchen', dir: 'sx' },
    { id: 'camera', nome: 'The Master Suite', breve: 'Suite', dir: 'su', esci: 'piani' },
  ], fermateStile: 'P2',
  /* Nico 24/11 notte: «tutti i floor abbiano i loro nomi, inventali tu; prima si vede il numero; sopra le penthouse». Nomi dell'oasi e del deserto, [nome, tipo]. */
  nomiPiani: {
    '20B': ['The Crown', 'Penthouse'], '19B': ['The Falcon', 'Penthouse'], '18B': ['The Pearl', 'Penthouse'], '17B': ['The Amber', 'Residence'], '16B': ['The Saffron', 'Residence'],
    '15B': ['The Oud', 'Residence'], '14B': ['The Dune', 'Residence'], '13B': ['The Palm', 'Residence'], '12B': ['The Mirage', 'Residence'], '10B': ['The Dhow', 'Residence'],
    '9B': ['The Lantern', 'Residence'], '7–8B': ['The Garden', 'Duplex'], '6B': ['The Fountain', 'Residence'], '5B': ['The Courtyard', 'Residence'], '4B': ['The Orchard', 'Residence'], '3B': ['The Fairway', 'Residence'],
    '19A': ['The Star', 'Penthouse'], '18A': ['The Moon', 'Penthouse'], '17A': ['The Sand Rose', 'Residence'], '16A': ['The Jasmine', 'Residence'], '15A': ['The Cedar', 'Residence'],
    '14A': ['The Henna', 'Residence'], '13A': ['The Musk', 'Residence'], '11–12A': ['The Majlis', 'Duplex'], '10A': ['The Gazelle', 'Residence'], '9A': ['The Coral', 'Residence'],
    '8A': ['The Lagoon', 'Residence'], '7A': ['The Breeze', 'Residence'], '6A': ['The Olive', 'Residence'], '5A': ['The Date Palm', 'Residence'], '3–4A': ['The Terrace', 'Duplex'],
  },
  riprese: { ...A.riprese,
    q1: { pos: [CB.entra.x, CB.F + 1.7, 7.4], tgt: [CB.entra.x + Math.sin(0.777 * Math.PI) * 60, CB.F + 1.7, 7.4 + Math.cos(0.777 * Math.PI) * 60], fov: 52 },
    sbieco: { pos: [27, CB.F + 2.2, 27], tgt: [9.0, CB.F + 1.5, 3.0], fov: 40 },   /* foto 1b (Nico 24/11): il piano col balcone da fuori, di sbieco dal lato destro davanti, verso la stessa direzione della foto 2 */
    cucinaB: { pos: [8.4, CB.F + 1.7, -5.8], tgt: [-60, CB.F + 1.7, -5.8], fov: 52 },
    cameraB: { pos: [CB.esce.x, CB.F + 1.7, -0.5], tgt: [CB.esce.x, CB.F + 1.7, 60], fov: 52 } },
  tempi: { ...A.tempi, volo: 5.0, cammina: 2.4, gira: 1.6, cammina2: 1.4, camera: 2.0, esce: 1.0, fine: 0.1 },   /* C1 5 s, C2 5 s, C3 5 s, C4 6 s */
  testi: { ...A.testi, torre: 'Burj Al Waha', torreAr: 'برج الواحة', luogo: 'Dubai Hills', senzaScegli: true }, uiTorre: 'D5',   /* Nico 24/11: N2 Burj Al Waha, P2 The Sky Diwan, C3 Concierge */
  livelli: [
    { id: 'mondo', tipo: 'mondo', titolo: null, bottone: () => ({ testo: 'Choose your floor', id: 'avanti' }) },
    { id: 'piani', tipo: 'piani', titolo: null },
    { id: 'salotto', tipo: 'stanza', titolo: null }, { id: 'cucina', tipo: 'stanza', titolo: null }, { id: 'camera', tipo: 'stanza', titolo: null },
  ],
  giri: { A: { look: 'tramonto', passi: [{ pausa: 0.6 }, { piano: 6, lato: 'dx', dur: 0.7, ferma: 0.35 }, { piano: 16, lato: 'sx', dur: 0.7, ferma: 0.35 }, { piano: 11, lato: 'dx', dur: 0.6, ferma: 0.5, clic: true }, { pausa: 7.2 }, { bottone: 'liv:3', dur: 0.9, ferma: 0.45, clic: true }, { pausa: 6.4 }, { bottone: 'liv:4', dur: 0.9, ferma: 0.45, clic: true }, { pausa: 6.2 }, { bottone: 'liv:1', dur: 0.9, ferma: 0.45, clic: true }, { pausa: 7.5 }] } },
};
