// Colore dei pin e delle card (Nico 22/11: «fammi un test su che colore ci sta meglio»). ?col=A…F sceglie la tinta; senza, arancio Omnya.
// OR = colore pieno (pin, bottoni, fili), OR2 = tinta chiara per le scritte piccole, INK = scritta sopra il colore pieno, ORT = scritta colorata su carta bianca.
export const TINTE = {
  A: { nome: 'Arancio Omnya (attuale)', OR: '#ff7a12', OR2: '#ffb27a', INK: '#ffffff', ORT: '#c24a00', BTN: '#c24a00' },   // 22/11 revisore: bianco su #ea6200 solo 3,4:1
  B: { nome: 'Oro', OR: '#d4a24c', OR2: '#f1d79c', INK: '#ffffff', ORT: '#b8862e' },
  C: { nome: 'Champagne', OR: '#f1e1c0', OR2: '#f6e8cf', INK: '#17130c', ORT: '#94733a' },
  D: { nome: 'Turchese', OR: '#19c3b1', OR2: '#93ece2', INK: '#ffffff', ORT: '#0f9c8e' },
  E: { nome: 'Blu elettrico', OR: '#2f6bff', OR2: '#a9c3ff', INK: '#ffffff', ORT: '#2f6bff', BTN: '#2a62f0' },
  F: { nome: 'Rosso', OR: '#ff3b30', OR2: '#ffa39d', INK: '#ffffff', ORT: '#e8291f' },
};
const k = (globalThis.location ? new URLSearchParams(location.search).get('col') : null) || 'A';
const T = TINTE[k] || TINTE.A;
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(',');
export const BTN = T.BTN || T.OR;    // bottoni pieni: un filo più scuri così la scritta bianca si legge benissimo (Nico 22/11)
export const COL = k in TINTE ? k : 'A', OR = T.OR, OR2 = T.OR2, INK = T.INK, ORT = T.ORT, ORC = rgb(T.OR);
export const ora = a => `rgba(${ORC},${a})`;                                   // il colore con la trasparenza
export const ORH = `rgb(${rgb(T.BTN || T.OR).split(',').map(v => Math.min(255, Math.round(+v + (255 - v) * 0.12))).join(',')})`;   // bottone sotto il mouse
