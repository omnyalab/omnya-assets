// SOGGETTO · la torre della foto di Nico del 23/11 («deve essere questa torre»), choose your floor come SAMAR.
// Riferimento: riferimenti/torre-golf/torre-riferimento.jpg (copia in _Riferimenti/Torre golf 23-11 (da Nico)/). Misure e colori: vedi torre-golf-kit.js.
// Nico 23/11: view un po' più alta, dietro lo skyline del Burj Khalifa, la torre (pochi piani) sotto con la natura, sul golf di Dubai Hills, stessi colori di SAMAR
// (tramonto chiaro, luce ambra sul piano, card di vetro, bottone blu), si entra dalla loggia in alto a sinistra, salone col ficus enorme, cucina a destra,
// bagno, e si esce da dietro verso lo skyline sul golf.
// Dubai Hills Golf Club (OpenStreetMap, ~25,106 N 55,244 E): il Burj Khalifa sta a ~10,6 km verso nord-nord-est. Qui il mondo è girato così che, dalla foto madre,
// il Burj stia 6° a sinistra della torre (dentro il taglio 9:16 centrale), alla sua distanza vera.
import { costruisciTorreGolf } from './torre-golf-kit.js';

const SX = [11.1, 15.1, 19.1, 23.1, 27.1, 31.1, 35.1, 39.1, 43.1, 47.1, 51.1, 55.1, 59.1, 63.1, 67.1, 71.1, 77.1, 86.0];
const DX = [11.1, 15.1, 19.1, 23.1, 27.1, 31.1, 35.1, 39.1, 43.1, 47.1, 51.1, 55.1, 59.1, 63.1, 67.1, 71.1, 76.3, 81.5, 86.25];
const OCCHI = 43.1 + 1.7, XL = -10.85;   // occhi al piano della loggia, in asse con la loggia

export default {
  id: 'torre-golf', nome: 'Torre golf', valuta: 'AED',
  torre: {
    prof: 22, raggio: 2.4,   /* profondità STIMA (la foto mostra solo la facciata); raggio degli angoli dalla foto (~19 px) */
    sx: { x0: -16.6, x1: -5.1, livelli: SX }, dx: { x0: -2.0, x1: 16.6, livelli: DX },
    nucleo: { x0: -5.1, x1: -2.0, rientro: 0.6, top: 85 },
    corona: { y: 86.0, h: 2.4, sbalzo: 0.9 },
    logge: [
      { lato: 'sx', y0: 43.1, y1: 51.1, prof: 3.5, colonne: [-13.75, -6.75], porta: { x: XL, w: 2.6, h: 3.2 },   /* l'entrata: «la finestra in alto a sinistra aperta» */
        piante: [{ x: -15.2, z: 9.6, h: 1.6, r: 0.8, vaso: 0.45, seme: 3 }] },
      { lato: 'sx', y0: 11.1, y1: 19.1, prof: 4.0, colonne: [-15.0, -7.2], piante: [{ tipo: 'palma', x: -14.2, z: 9.0, h: 6 }, { tipo: 'palma', x: -10.2, z: 8.4, h: 6.6 }, { x: -7.6, z: 9.2, h: 3, r: 1.3, vaso: 0.6, seme: 9 }] },
      { lato: 'dx', y0: 27.1, y1: 35.1, prof: 3.2, colonne: [1.2, 13.8], piante: [{ x: 15.0, z: 9.4, h: 2.4, r: 1.0, vaso: 0.5, seme: 11 }] },
    ],
    podio: [{ x: -40, z: -2, w: 46, d: 20, h: 12.5 }, { x: 40, z: -3, w: 46, d: 18, h: 11 }],
  },
  casa: { duplex: { lato: 'sx', y: 47.1, y0: 43.1, y1: 51.1 }, vetri: { sx: [43.1], dx: [43.1] }, passaggio: { y0: 43.1, y1: 46.65, z0: 0.5, z1: 3.5 },   /* Nico 23/11 notte: «deve essere un corridoio, non vetrate»: corridoio di lusso largo 3 m fino alla cucina */   /* Nico 23/11 sera: «i varchi aperti»: varco largo 7 m */
    pianiDuplex: [11, 12], entrata: { x: XL }, uscita: { lato: 'dx', x: 4.8, w: 2.6 }, corridoio: 3.0 },
  palette: 1,   /* ?pal=1|2|3 (torre-arredi.js): da far scegliere in board */
  areaPiano: '640',   /* STIMA: 18,6 x 22 + 11,5 x 22 meno nucleo e muri */
  esauriti: [5, 9, 14, 17, 20],
  pianoMin: 3,
  testi: { vista: 'golf and Burj Khalifa view', duplex: 'The Ghaf Duplex', duplexSotto: '≈ 900 m² · double-height living · garden loggia' },
  modello: { colori: {
    vetro: '#9aa5b0', vetroAlto: '#c9ccd0', vetroBasso: '#6f747a', solaio: '#34302d', corona: '#a38168', bronzo: '#a07a58', bronzoChiaro: '#e2bf8f', bronzoScuro: '#3b2e25',
    foglie: ['#4f6a2e', '#647d38', '#3e5626', '#7a8c44'], alberi: ['#3d5228', '#4a6030', '#556a35', '#34481f', '#61713a'], palme: ['#5b7434', '#6b8240', '#4c652c'],
    sabbia: '#d6c19c', rough: '#5f7c3a', fairway: '#7fa64a', green: '#93bb58', bunker: '#ecdcb8', sentiero: '#d3c9b6', strada: '#5a554d', piazza: '#cfc5b3', prato: '#6f9445' } },
  intorno: {
    fairway: [{ p: [[-520, 150], [-200, 120], [160, 135], [620, 110]], l: 70 }, { p: [[-950, -300], [-300, -380], [300, -330], [950, -420]], l: 85 }, { p: [[-800, -900], [0, -820], [760, -950]], l: 95 },
      { p: [[-1300, -1500], [-200, -1400], [1000, -1560]], l: 95 }, { p: [[-1400, 300], [-850, 200], [-520, -120]], l: 70 }, { p: [[1400, 300], [900, 220], [560, -140]], l: 70 }],
    green: [[620, 110, 22], [-660, -280, 20], [740, -950, 24], [-940, -1500, 22], [-520, -120, 18]],
    bunker: [[570, 140, 12, 6, 0.3], [-610, -250, 10, 5, 0.5], [680, -920, 14, 6, 0.2], [180, -360, 16, 7, 0.6], [-200, -820, 12, 6, 0.4], [-360, 160, 10, 5, 0.2], [560, -170, 11, 5, 0.1]],
    laghi: [[380, -560, 150, 60, 0.3], [-520, -620, 130, 55, -0.2], [100, -1180, 200, 70, 0.1]],
    sentieri: [[[-160, 62], [-80, 56], [0, 58], [90, 54], [180, 60]], [[-700, -500], [-200, -560], [300, -480], [800, -600]]],
    strade: [{ p: [[-3000, -2050], [3000, -2050]], l: 30 }],
    aiuole: [[-66, 20, 34, 18], [32, 22, 36, 16]],
    boschi: [{ x: -42, z: 32, rx: 24, rz: 9, n: 14, h: [7, 11], palme: 0.75 }, { x: 46, z: 30, rx: 20, rz: 9, n: 10, h: [7, 10], palme: 0.6 },
      { x: -320, z: 20, rx: 200, rz: 130, n: 170, h: [8, 16], palme: 0.35 }, { x: 320, z: 20, rx: 200, rz: 130, n: 170, h: [8, 16], palme: 0.35 },
      { x: 0, z: -620, rx: 1500, rz: 720, n: 1100, h: [8, 16], palme: 0.35 }, { x: 0, z: -1750, rx: 2600, rz: 260, n: 900, h: [10, 18], palme: 0.3 }],
    quartieri: [{ x: 0, z: -2500, rx: 2800, rz: 300, n: 220, h: [10, 42] }, { x: -2300, z: -900, rx: 500, rz: 900, n: 110, h: [10, 38] }, { x: 2300, z: -900, rx: 500, rz: 900, n: 110, h: [10, 38] }],
    luci: [[-24, 40], [0, 42], [24, 40], [44, 38]],
    /* niente alberi sulla torre, sulla piazza, nei laghi e sui fairway (STIMA dei bordi) */
    libero: (x, z) => (Math.abs(x) < 72 && z > -24 && z < 48) || (z > 44 && z < 240 && Math.abs(x) < 700) || (Math.abs(x) < 120 && z > -30 && z < 48) || (Math.pow((x - 380) / 160, 2) + Math.pow((z + 560) / 70, 2) < 1)
      || (Math.pow((x + 520) / 140, 2) + Math.pow((z + 620) / 65, 2) < 1) || (Math.pow((x - 100) / 210, 2) + Math.pow((z + 1180) / 80, 2) < 1) || (Math.abs(z - 128) < 40 && Math.abs(x) < 600) || (Math.abs(z + 345) < 45 && Math.abs(x) < 950),
  },
  /* Nico 23/11 sera: «strada sotto figa con macchinoni da soldi ma più natura»: viale a due carreggiate (z 100-126) con palme e lampioni, parco fra piazza e viale */
  viale: { z: 64, x0: -320, x1: 300, varco: [-75, 60], luciVere: [-60, -20, 20, 60], cespugli: 900,
    parco: [{ x: -100, z: 28, rx: 18, rz: 14, n: 12, h: [7, 11] }, { x: 100, z: 28, rx: 18, rz: 14, n: 12, h: [7, 11] }, { x: -150, z: 0, rx: 30, rz: 30, n: 22, h: [8, 13] }, { x: 150, z: 0, rx: 30, rz: 30, n: 22, h: [8, 13] },
      { x: -95, z: -40, rx: 30, rz: 20, n: 16, h: [8, 13] }, { x: 95, z: -40, rx: 30, rz: 20, n: 16, h: [8, 13] },
      { x: -50, z: 41, rx: 14, rz: 3, n: 5, h: [7, 9] }, { x: 52, z: 41, rx: 14, rz: 3, n: 5, h: [7, 9] }],
    alberiAccesi: [[-50, 40], [-38, 41], [45, 40], [56, 41]],
    auto: [{ tipo: 'berlina', colore: '#0b0b0d', corsia: 'A', l: 2, x: -70 }, { tipo: 'coupe', colore: '#d8741c', corsia: 'A', l: 6, x: -28 }, { tipo: 'suv', colore: '#1a1a1c', corsia: 'A', l: 2, x: 18 }, { tipo: 'coupe', colore: '#eeece6', corsia: 'A', l: 6, x: 52 },
      { tipo: 'suv', colore: '#f0eee8', corsia: 'B', l: 6, x: -82, verso: -1 }, { tipo: 'berlina', colore: '#1f3329', corsia: 'B', l: 2, x: -45, verso: -1 }, { tipo: 'coupe', colore: '#6b6f73', corsia: 'B', l: 6, x: 0, verso: -1 }, { tipo: 'berlina', colore: '#141c33', corsia: 'B', l: 2, x: 38, verso: -1 },
      { tipo: 'berlina', colore: '#f2efe8', z: 42, x: 2 }, { tipo: 'suv', colore: '#0b0b0d', z: 43.5, x: 26 }] },
  dubai: { O: [25.1063, 55.2435], burj: [-832, -7215], zMax: -2600 },   /* M2: il Burj 6,3° a sinistra e 1,4 volte più grande del vero → skyline avvicinato a 7,5 km (il vero è 10,6 km) */
  /* versione vera (?reale=1, Nico 23/11 notte): clip Kling 4.0 incatenate (start = ultimo fotogramma vero della clip prima, end = foto Seedream approvata, guida = video 3D),
     foto 4K senza filtro (uguali alle clip, così le giunte non saltano). Dallo skyline: K8 = giro in volo sul retro della torre, si sceglie di nuovo il piano. */
  reale: { modulo: 'torre', cartella: 'assets/reale/torre-golf/', luce: 1,
    foto: { piani: '4k/madre.jpg', dentro: '4k/skyline.jpg', retro: '4k/retro.jpg' }, anticipo: { piani: 0, dentro: 0.6, retro: 0.6 },
    clip: { 'piani>dentro': ['clip/K1', 'clip/K2', 'clip/K3', 'clip/K4', 'clip/K5', 'clip/K6', 'clip/K7'], 'dentro>retro': ['clip/K8'],
      'retro>dentro': ['clip/K1', 'clip/K2', 'clip/K3', 'clip/K4', 'clip/K5', 'clip/K6', 'clip/K7'] } },
  costruisci() { return costruisciTorreGolf(this); },
  inizio: 1,   /* si parte già da «choose your floor» sulla foto madre (Nico 20/11) */
  lookIniziale: 'tramonto',
  looks: {
    /* tramonto chiaro come SAMAR: sole basso a ovest-sud-ovest (a sinistra, dietro la camera) che scalda la facciata, cielo dalla foto (#6486b6 → #82a2c6) che scende al pesca */
    tramonto: { sole: { alt: 7, az: 306, colore: '#ffbf86', forza: 4.4, alone: '#ffb987', aloneK: 1.0 }, envSole: 3.2, cielo: ['#6486b6', '#a7c0da', '#f4d6b9'], orizzonte: 0.22,
      amb: { cielo: '#bccfe4', terra: '#a08a6c', forza: 0.8, riflessi: 1.4 }, nebbia: { colore: '#e8d8cb', densita: 0.00008, orizzonte: 0.55 }, esposizione: 1.0, luci: 0.4, fari: 0, bloom: [0.18, 0.4, 0.9] },
  },
  riprese: {
    mondo: { pos: [-9.5, 36.3, 240], tgt: [-9.5, 36.3, -1000], fov: 30, shift: 0.0139 },   /* Nico 23/11 sera ha scelto la foto M2 (Seedream): camera ricalcata sulla M2 (orizzonte a 555/1080 = 36,3 m, 8,8 px/m, torre 84 px a destra del centro) */
    mondo1: { pos: [XL, 55, 240], tgt: [XL, 55, -1000], fov: 30, shift: -0.1437 },   /* Nico 23/11 sera: camera un po' più alta (60 m), verticali dritte (lente decentrata), sotto il viale con le auto e il parco */
    mondo0: { pos: [XL, OCCHI, 310], tgt: [XL, OCCHI, -1000], fov: 24, shift: 0 },   /* la foto madre: occhi della loggia, la torre al centro (68% dell'altezza), il Burj 6° a sinistra */
    rif: { pos: [0, 41.2, 281.5], tgt: [0, 41.2, -1000], fov: 24, shift: 0 },   /* stessa scala e stessa altezza della foto di Nico (8 px/m su 920 px = 9,39 px/m a 1080): la facciata in pianta frontale coincide */   /* come la foto di Nico (dal basso, verticali dritte): per il giudice delle sagome */
    salone: { pos: [XL, OCCHI, 6.0], tgt: [XL, OCCHI, -60], fov: 48 },
    loggia: { pos: [XL, OCCHI, 24], tgt: [XL, OCCHI, -60], fov: 44 },
    varco: { pos: [-6.85, OCCHI, 2.0], tgt: [60, OCCHI, 2.0], fov: 48 },   /* fine della curva a destra: il corridoio davanti */
    cucina: { pos: [1.8, OCCHI, 2.0], tgt: [61.8, OCCHI, 2.0], fov: 48 },   /* in fondo al corridoio: la cucina */
    bagno: { pos: [4.8, OCCHI, -1.0], tgt: [4.8, OCCHI, -60], fov: 48 },   /* fine della curva a sinistra: il varco del bagno */
    vasca: { pos: [4.8, OCCHI, -6.2], tgt: [4.8, OCCHI, -60], fov: 48 },
    skyline: { pos: [4.8, OCCHI, -110], tgt: [4.8, OCCHI, -1000], fov: 34 },
    retro: { pos: [-10, 46, -265], tgt: [-10, 46, 1000], fov: 30 },   /* Nico 23/11 notte: dopo lo skyline ci si gira sul retro della torre e si sceglie di nuovo il piano */
    drone: { pos: [210, 150, 420], tgt: [0, 50, 0], fov: 40 },
  },
  tempi: { volo: 4.0, entra: 3.0, gira: 3.0, cammina: 4.0, bagno: 3.0, fuori: 4.0, retro: 4.0, fine: 1.8, sceltaRetro: 4.0 },
  livelli: [
    { id: 'mondo', tipo: 'mondo', titolo: null, bottone: () => ({ testo: 'Choose your floor', id: 'avanti' }) },
    { id: 'piani', tipo: 'piani', titolo: null },
    { id: 'dentro', tipo: 'dentro', titolo: () => ['Level 11–12 · The Ghaf Duplex', 'Is this your floor?'] },
    { id: 'retro', tipo: 'piani', titolo: null },   /* dal retro della torre: scegli di nuovo il piano */
    { id: 'dentro', tipo: 'dentro', titolo: () => ['Level 11–12 · The Ghaf Duplex', 'Is this your floor?'] },
  ],
  giri: {
    /* ~28 s tutto continuo: la luce passa sul 6 e sul 16, poi il duplex 11-12 a sinistra (la loggia) → dentro dritti → salone → cucina → bagno → fuori verso lo skyline */
    A: { look: 'tramonto', passi: [{ pausa: 0.6 }, { piano: 6, lato: 'dx', dur: 0.7, ferma: 0.35 }, { piano: 16, lato: 'dx', dur: 0.7, ferma: 0.35 }, { piano: 11, lato: 'sx', dur: 0.6, ferma: 0.5, clic: true }, { pausa: 2.6 }] },
  },
  pannello: true,
  biglietto: false,
};
