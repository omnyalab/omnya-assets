// Motore choose-your · lo skyline vero di Dubai visto da lontano (Dubai Hills, 21/11).
// Burj Khalifa a Y con le ali che scalano a spirale fino alla guglia (828 m, 3 ali attorno al nucleo esagonale: fonte Wikipedia/SOM),
// le torri vere di Downtown e Business Bay da riferimenti/the-split/citta.json (altezze Wikipedia/CTBUH, posizioni OSM/Wikipedia)
// e il tessuto basso in mezzo (Al Quoz, Al Khail Road) come STIMA, nella foschia calda.
import * as THREE from 'three';
import { canvasTex, rng, lerp, unisci } from './forme.js';

const proietta = (O, lat, lon) => ({ x: (lon - O[1]) * 111320 * Math.cos(O[0] * Math.PI / 180), z: -(lat - O[0]) * 110574 });

function texVetroTorre(seed = 7, tono = [150, 165, 182]) {   // facciata di vetro con montanti verticali e solai, poche finestre accese
  const R = rng(seed);
  return canvasTex(256, 512, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, `rgb(${tono.join(',')})`); g.addColorStop(1, `rgb(${tono.map(v => v - 22).join(',')})`); c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 8) { c.fillStyle = 'rgba(230,236,242,0.35)'; c.fillRect(x, 0, 1.5, h); }
    for (let y = 0; y < h; y += 16) { c.fillStyle = 'rgba(60,66,76,0.35)'; c.fillRect(0, y, w, 2.5); }
    for (let i = 0; i < 90; i++) { c.fillStyle = `rgba(255,${200 + R() * 40},${140 + R() * 60},0.25)`; c.fillRect(Math.floor(R() * 32) * 8 + 1, Math.floor(R() * 32) * 16 + 3, 6, 11); }
  }, { aniso: 8 });
}

// Burj Khalifa: tre ali a 120° (larghe ~16 m, lunghe fino a ~38 m dal centro alla base) che finiscono una dopo l'altra a spirale
// (26 gradoni, STIMA delle quote dai disegni SOM), nucleo esagonale fino a ~585 m, poi la guglia fino a 828 m.
export function burjKhalifa(x, z, rot = 0) {
  const g = new THREE.Group(), parts = [], H = 828;
  const mat = new THREE.MeshStandardMaterial({ color: '#d6dde6', metalness: 0.92, roughness: 0.2, map: texVetroTorre(3, [180, 190, 202]) }); mat.name = 'burj';
  // ogni ala: 9 tronconi che si accorciano salendo; il gradino di ogni ala è sfasato di 1/3 (la spirale)
  const tappe = [[0, 38], [92, 35], [175, 31], [250, 27], [318, 23], [380, 19], [436, 15], [486, 11.5], [530, 8.5], [566, 0]];
  for (let a = 0; a < 3; a++) {
    const ang = rot + a * Math.PI * 2 / 3;
    for (let i = 0; i < tappe.length - 1; i++) {
      const y0 = i === 0 ? 0 : tappe[i][0] + a * 9, y1 = tappe[i + 1][0] + a * 9, L = tappe[i][1]; if (L <= 0) continue;
      const w = Math.min(16, 8 + L * 0.22), seg = new THREE.CylinderGeometry(w / 2, w / 2, y1 - y0, 14, 1, false, 0, Math.PI).toNonIndexed();   // punta tonda dell'ala
      seg.rotateY(Math.PI / 2); seg.translate(L - w / 2, (y0 + y1) / 2, 0); const box = new THREE.BoxGeometry(L - w / 2, y1 - y0, w).toNonIndexed(); box.translate((L - w / 2) / 2, (y0 + y1) / 2, 0);
      for (const p of [seg, box]) { p.rotateY(-ang); p.translate(x, 0, z); parts.push(p); }
    }
  }
  const nucleo = new THREE.CylinderGeometry(9.5, 12, 600, 6).toNonIndexed(); nucleo.translate(x, 300, z); parts.push(nucleo);
  const testa = new THREE.CylinderGeometry(5.5, 9, 40, 6).toNonIndexed(); testa.translate(x, 620, z); parts.push(testa);
  const guglia = new THREE.CylinderGeometry(0.6, 5.2, H - 640, 8).toNonIndexed(); guglia.translate(x, 640 + (H - 640) / 2, z); parts.push(guglia);
  const m = new THREE.Mesh(unisci(parts), mat); m.castShadow = true; m.name = 'burj'; g.add(m);
  const luce = new THREE.Mesh(new THREE.SphereGeometry(2.4, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff5a3a' })); luce.position.set(x, H - 3, z); g.add(luce);
  return g;
}

// torri vere + tessuto basso. O = origine [lat, lon] del soggetto; citta = elenco {nome, h, lat, lon}
export function skylineDubai(O, citta, { seme = 31, bassi = 1600 } = {}) {
  const G = new THREE.Group(); G.name = 'skyline'; const R = rng(seme), blocchi = [];
  let burj = null;
  for (const t of citta) {
    const p = proietta(O, t.lat, t.lon);
    if (/Burj Khalifa/.test(t.nome)) { burj = { ...t, ...p }; G.add(burjKhalifa(p.x, p.z, 0.35)); continue; }
    const w = 28 + t.h * 0.06;
    blocchi.push({ x: p.x, z: p.z, w, d: w * (0.8 + R() * 0.4), h: t.h, rot: R() * 1.5, torre: true, cima: R() < 0.5 });
  }
  // Downtown e Business Bay: torri medie attorno al Burj (STIMA, solo massa e altezza nella foschia)
  // gruppi veri (STIMA di posizione dalla mappa): Downtown attorno al Burj, Business Bay a est-sud-est, DIFC e Sheikh Zayed Road a nord-est, Al Barsha basso a ovest
  if (burj) for (const [dx, dz, rx, rz, n, h0, h1] of [[0, 300, 650, 450, 55, 60, 260], [2300, 900, 1300, 650, 80, 70, 300], [1800, -1500, 900, 1300, 50, 90, 330], [-3200, 2600, 1500, 900, 40, 40, 140]]) for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2, r = Math.sqrt(R()), x = burj.x + dx + Math.cos(a) * r * rx, z = burj.z + dz + Math.sin(a) * r * rz;
    if (Math.hypot(x - burj.x, z - burj.z) < 180) continue;
    blocchi.push({ x, z, w: 22 + R() * 24, d: 22 + R() * 24, h: h0 + Math.pow(R(), 1.7) * (h1 - h0), rot: R() * 1.5, torre: true });
  }
  // tessuto basso fra Dubai Hills e Downtown (Al Quoz, Al Barsha): capannoni e palazzine da 6-30 m (STIMA)
  for (let i = 0; i < bassi; i++) {
    const x = (R() - 0.5) * 9000, z = -2600 - R() * 7000; if (burj && Math.hypot(x - burj.x, z - burj.z) < 500) continue;
    blocchi.push({ x, z, w: 20 + R() * 60, d: 20 + R() * 50, h: 6 + Math.pow(R(), 2.2) * 26, rot: (R() - 0.5) * 0.4 });
  }
  const mT = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.55, roughness: 0.28, map: texVetroTorre(5), emissive: 0xffc58a, emissiveIntensity: 0, emissiveMap: texVetroTorre(5) }); mT.name = 'torri';
  const mB = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }); mB.name = 'citta_bassa';
  for (const [list, mat] of [[blocchi.filter(b => b.torre), mT], [blocchi.filter(b => !b.torre), mB]]) {
    const geo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * 1);
    const m = new THREE.InstancedMesh(geo, mat, list.length), M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
    list.forEach((b, i) => { M4.compose(new THREE.Vector3(b.x, 0, b.z), q.setFromEuler(new THREE.Euler(0, b.rot, 0)), new THREE.Vector3(b.w, b.h, b.d)); m.setMatrixAt(i, M4);
      if (b.torre) col.setHSL(0.6, 0.08 + R() * 0.08, 0.62 + R() * 0.18); else col.set(['#d8cdb8', '#cfc4ae', '#e1d7c4', '#c2b8a6', '#d4ccbe'][Math.floor(R() * 5)]); m.setColorAt(i, col); });
    m.castShadow = false; m.receiveShadow = true; G.add(m);
  }
  G.userData.burj = burj; return G;
}
