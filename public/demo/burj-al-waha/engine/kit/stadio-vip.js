// Motore choose-your · box VIP dello stadio 2034 (tribuna ovest, nella fascia degli skybox fra anello basso e medio).
// Come nel render ufficiale degli skybox (int06): vetrata sul campo, poltrone in pelle chiara, pavimento in pietra, legno caldo,
// luci a incasso. Le poltrone si scelgono col mouse (2), poi ti siedi e vedi la partita da lì.
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../../vendor/addons/geometries/RoundedBoxGeometry.js';
import { sePoint, canvasTex, noise2, fbm, lerp } from './forme.js';

export function boxVip(info, p, opz = {}) {
  const G = new THREE.Group(); G.name = 'vip';
  const an = opz.anello ?? 0, t0 = info.tiers[an], t1 = info.tiers[an + 1], yF = t0.yEnd + (opz.rialzo ?? 1.1), yC = t1.y0 - 2.6, dG = t0.vano.d, dBack = t0.dEnd + (t1.box || 6) - 0.15;
  // dove sta il box: all'angolo del blocco scelto (così sale dritto dai posti)
  const th = opz.angolo ?? Math.PI * 1.5, P = d => { const pl = info.plan(d); return sePoint(pl.a, pl.b, pl.n, th); };
  const [gx, gz] = P(dG), [bx, bz] = P(dBack), dx = gx - bx, dz = gz - bz, L = Math.hypot(dx, dz), fx = dx / L, fz = dz / L, rx = -fz, rz = fx;   // f = verso il campo, r = di lato
  const W = opz.largo || 9, D = L;   // larghezza e profondità della stanza
  const at = (u, y, v) => new THREE.Vector3(bx + rx * u + fx * v, y, bz + rz * u + fz * v);   // u di lato, v dal fondo verso il vetro
  const rotY = Math.atan2(fx, fz);
  const place = (m, u, y, v, ry = 0) => { m.position.copy(at(u, y, v)); m.rotation.y = rotY + ry; G.add(m); return m; };

  const stone = canvasTex(512, 512, (c, w, h) => { const n = noise2(3), im = c.createImageData(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = fbm(n, x / 40, y / 12, 4), vein = Math.abs(Math.sin((x + v * 160) / 30)) < 0.04 ? 18 : 0, g = 232 + (v - 0.5) * 18 - vein, o = (y * w + x) * 4; im.data[o] = g; im.data[o + 1] = g * 0.975; im.data[o + 2] = g * 0.94; im.data[o + 3] = 255; } c.putImageData(im, 0, 0); }, { repeat: [2, 2] });
  const wood = canvasTex(256, 512, (c, w, h) => { const n = noise2(8), im = c.createImageData(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = fbm(n, x / 3, y / 60, 3), g = 190 + v * 40, o = (y * w + x) * 4; im.data[o] = g * 1.0; im.data[o + 1] = g * 0.88; im.data[o + 2] = g * 0.72; im.data[o + 3] = 255; } c.putImageData(im, 0, 0); }, { repeat: [3, 1] });
  const pelle = new THREE.MeshPhysicalMaterial({ color: opz.pelle || '#efe6d8', roughness: 0.42, sheen: 0.6, sheenRoughness: 0.5, sheenColor: new THREE.Color('#fff4e6'), clearcoat: 0.15, clearcoatRoughness: 0.6 });
  const mStone = new THREE.MeshStandardMaterial({ map: stone, roughness: 0.25, metalness: 0.0 }), mWood = new THREE.MeshStandardMaterial({ map: wood, roughness: 0.55 }), mGold = new THREE.MeshStandardMaterial({ color: '#c9a465', roughness: 0.3, metalness: 0.9 });
  const mCeil = new THREE.MeshStandardMaterial({ color: '#efe7da', roughness: 0.9 });

  // 22/11 Nico: sala VIP grande e tutta aperta, incastrata nella tribuna: davanti due file di poltrone cognac (si scelgono in arancione),
  // dietro la lounge col bar, niente vetrata in mezzo, solo il parapetto di vetro davanti per appoggiarsi
  const T = opz.terrazza ?? 2.6, vG = D - T;   // vG = dove sta la vetrata, da vG a D la terrazza aperta sul campo
  { const g = new THREE.PlaneGeometry(W, D + 0.6); g.rotateX(-Math.PI / 2); g.rotateY(rotY); const m = new THREE.Mesh(g, mStone); m.position.copy(at(0, yF + 0.03, (D + 0.6) / 2 - 0.3)); m.receiveShadow = true; G.add(m); }
  { const g = new THREE.PlaneGeometry(W, D + 0.3); g.rotateX(Math.PI / 2); g.rotateY(rotY); const m = new THREE.Mesh(g, mCeil); m.position.copy(at(0, yC - 0.05, D / 2)); G.add(m); }
  const wall = u => { const g = new THREE.BoxGeometry(0.12, yC - yF, D + 0.3); const m = new THREE.Mesh(g, mWood); place(m, u, (yC + yF) / 2, D / 2); m.castShadow = m.receiveShadow = true; };
  wall(-W / 2); wall(W / 2);
  { const g = new THREE.BoxGeometry(W, yF - t0.yEnd, D + 0.6); const m = new THREE.Mesh(g, mWood); place(m, 0, (yF + t0.yEnd) / 2, (D + 0.6) / 2 - 0.3); }
  // in fondo il bar aperto, come nella lounge ufficiale (int07): mensole retroilluminate con le bottiglie, bancone di pietra col filo di luce, sgabelli
  const mScuro = new THREE.MeshStandardMaterial({ color: '#2a1d14', roughness: 0.6 }), luceCalda = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffcf8f', emissiveIntensity: 1.6 });
  { const g = new THREE.BoxGeometry(W, yC - yF, 0.12); place(new THREE.Mesh(g, mScuro), 0, (yC + yF) / 2, 0.05);
    for (let r = 0; r < 3; r++) { const y = yF + 1.25 + r * 0.55; place(new THREE.Mesh(new THREE.BoxGeometry(W * 0.62, 0.04, 0.32), mWood), 0, y, 0.24); place(new THREE.Mesh(new THREE.BoxGeometry(W * 0.62, 0.03, 0.03), luceCalda), 0, y + 0.03, 0.39);
      for (let k = 0; k < 18; k++) { const hb = 0.26 + ((k * 7 + r * 3) % 5) * 0.03, col = ['#3c6b3a', '#7a4a1e', '#d9c9a8', '#2c3f6b', '#8a2f2a'][(k + r) % 5];
        place(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, hb, 10), new THREE.MeshStandardMaterial({ color: col, roughness: 0.15, emissive: col, emissiveIntensity: 0.25 })), lerp(-W * 0.29, W * 0.29, k / 17), y + 0.02 + hb / 2, 0.22); } } }
  { const top = new THREE.Mesh(new RoundedBoxGeometry(W * 0.6, 0.08, 0.7, 2, 0.03), mStone), body = new THREE.Mesh(new THREE.BoxGeometry(W * 0.58, 1.02, 0.6), mWood);
    place(top, 0, yF + 1.08, 1.55); place(body, 0, yF + 0.51, 1.52); place(new THREE.Mesh(new THREE.BoxGeometry(W * 0.58, 0.04, 0.04), luceCalda), 0, yF + 0.98, 1.84);
    for (let k = 0; k < 6; k++) { const u = lerp(-W * 0.26, W * 0.26, k / 5); place(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 20), cognacSgabello()), u, yF + 0.78, 2.15); place(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.12, 0.76, 10), mGold), u, yF + 0.38, 2.15); } }
  // tavolini alti ai lati, lontano dal centro della vista
  for (const su of [-1, 1]) { const u = su * (W / 2 - 1.3), v = lerp(2.8, vG - 1.2, 0.5);
    place(new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.05, 28), mStone), u, yF + 1.05, v); place(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.18, 1.02, 12), mGold), u, yF + 0.51, v); }
  // fascia di luce morbida sul soffitto, come il soffitto curvo luminoso della lounge
  for (const v of [1.0, vG - 0.9]) place(new THREE.Mesh(new THREE.BoxGeometry(W - 1.4, 0.04, 0.12), luceCalda), 0, yC - 0.07, v);
  for (const su of [-1, 1]) place(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, vG - 1.9), luceCalda), su * (W / 2 - 0.7), yC - 0.07, (1.0 + vG - 0.9) / 2);
  // luci a incasso e fascia luminosa sul bordo del soffitto
  const spot = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#fff1da', emissiveIntensity: 1.6 });
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { const m = new THREE.Mesh(new THREE.CircleGeometry(0.11, 16), spot); m.rotation.x = Math.PI / 2; m.position.copy(at(lerp(-W / 2 + 1.2, W / 2 - 1.2, i / 3), yC - 0.07, lerp(1.4, vG - 0.8, j))); G.add(m); }
  { const m = new THREE.Mesh(new THREE.BoxGeometry(W - 0.3, 0.05, 0.08), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffe2b8', emissiveIntensity: 1.4 })); place(m, 0, yC - 0.08, vG - 0.15); }
  const lamp = new THREE.PointLight(0xffdcb0, opz.luce ?? 9, 14, 2); lamp.position.copy(at(0, yC - 0.6, vG * 0.5)); G.add(lamp); const lampBar = new THREE.PointLight(0xffc98a, (opz.luce ?? 9) * 0.5, 6, 2); lampBar.position.copy(at(0, yF + 2.2, 1.0)); G.add(lampBar);
  const lamp2 = new THREE.PointLight(0xffe6c8, (opz.luce ?? 9) * 0.12, 7, 2); lamp2.position.copy(at(0, yC - 0.4, vG + T * 0.5)); G.add(lamp2);
  // incastrato nella tribuna: cornice di pietra spessa e, ai lati, la facciata continua dei box vicini (vetri scuri), niente vuoto intorno
  { const mFacc = new THREE.MeshStandardMaterial({ color: '#cbb99c', roughness: 0.7 }), mVetroScuro = new THREE.MeshStandardMaterial({ color: '#141210', roughness: 0.15, metalness: 0.3, emissive: '#3a2a18', emissiveIntensity: 0.35 });
    const hT = (yC + 1.2) - (t0.yEnd - 0.6), yM = (yC + 1.2 + t0.yEnd - 0.6) / 2;
    for (const su of [-1, 1]) {
      place(new THREE.Mesh(new THREE.BoxGeometry(0.9, hT, 0.8), mFacc), su * (W / 2 + 0.45), yM, D + 0.1);   // pilastro
      for (let j = 0; j < 2; j++) { const u0 = su * (W / 2 + 0.9 + j * 7 + 3.5);
        place(new THREE.Mesh(new THREE.BoxGeometry(7, hT, 0.5), mFacc), u0, yM, D - 0.25);
        place(new THREE.Mesh(new THREE.BoxGeometry(6.2, yC - yF - 0.4, 0.06), mVetroScuro), u0, (yC + yF) / 2, D + 0.02); } }
    place(new THREE.Mesh(new THREE.BoxGeometry(W + 1.8, 1.2, 0.8), mFacc), 0, yC + 0.6, D + 0.1);   // architrave sopra l'apertura
  }
  // parapetto di vetro in fondo alla terrazza, col corrimano d'oro
  { const g = new THREE.PlaneGeometry(W, 0.78), m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.05, transparent: true, opacity: 0.08, depthWrite: false })); place(m, 0, yF + 0.39, D - 0.05, Math.PI);
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, W, 10), mGold); place(h, 0, yF + 0.78, D - 0.05); h.rotation.z = Math.PI / 2; h.rotation.y = rotY; }

  // poltrone in pelle cognac davanti, nello spazio aperto: 2 file da 5, la seconda un gradino più su, tutte dritte verso il campo
  const poltrone = [], cognac = new THREE.MeshPhysicalMaterial({ color: opz.pelle || '#8a5a3a', roughness: 0.38, sheen: 0.5, sheenRoughness: 0.45, sheenColor: new THREE.Color('#ffd9b3'), clearcoat: 0.25, clearcoatRoughness: 0.5 });
  const selMat = cognac.clone(); selMat.color.set(opz.oro || '#e3c27a'); const hovMat = cognac.clone(); hovMat.color.set('#c99a6a');
  const riser = new THREE.Mesh(new THREE.BoxGeometry(W - 0.25, 0.32, 1.1), mStone); place(riser, 0, yF + 0.16, vG + 0.65);
  for (let r = 0; r < 2; r++) for (let k = 0; k < 5; k++) {
    const u = lerp(-W / 2 + 1.5, W / 2 - 1.5, k / 4), v = D - 0.95 - r * 1.15, y0 = yF + (r ? 0.32 : 0), g = poltrona(cognac, mGold);
    place(g, u, y0, v); g.userData.vip = poltrone.length; g.userData.nome = `Row ${String.fromCharCode(65 + r)} · Seat ${k + 1}`; g.traverse(o => { o.castShadow = true; o.receiveShadow = true; o.userData.vip = poltrone.length; });
    poltrone.push({ g, u, v, y0, nome: g.userData.nome, occhio: at(u, y0 + 1.18, v - 0.05) });
  }
  function colora(sel, hov) { poltrone.forEach((q, i) => { const on = sel.includes(i), h = hov === i; q.g.traverse(o => { if (o.userData.pelle) o.material = on ? selMat : h ? hovMat : cognac; }); }); }
  // riprese: davanti alla vetrata (si vedono le poltrone), dentro seduto
  const fuori = { pos: at(0, yF + (opz.fuoriAlto ?? 2.4), D + (opz.fuoriDist ?? 6.8)).toArray(), tgt: at(0, yF + (opz.fuoriTgtY ?? 0.8), D - 2.2).toArray(), fov: opz.fovFuori ?? 46 };
  const seduto = i => { const q = poltrone[i], e = q.occhio.clone().add(new THREE.Vector3(fx * 0.25, 0.12, fz * 0.25)); return { pos: e.toArray(), tgt: [e.x * 0.05, opz.guardaY ?? 4, e.z * 0.05], fov: opz.fovSeduto ?? 62 }; };
  return { gruppo: G, poltrone, colora, fuori, seduto, centro: at(0, yF + 1.2, D / 2), avanti: [fx, fz], buco: [...at(0, (yF + yC) / 2, D).toArray(), W / 2 + 0.4] };
}

function poltrona(pelle, gold) {   // poltrona da box imbottita: seduta a due cuscini, schienale alto trapuntato, poggiatesta, braccioli larghi, base girevole oro
  const g = new THREE.Group(), add = (geo, x, y, z, m = pelle) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); if (m === pelle) o.userData.pelle = true; g.add(o); return o; };
  const cuci = poltrona.cuci || (poltrona.cuci = new THREE.MeshStandardMaterial({ color: '#b89a74', roughness: 0.6 }));
  add(new RoundedBoxGeometry(0.86, 0.22, 0.74, 4, 0.1), 0, 0.42, 0.04);                    // seduta
  add(new RoundedBoxGeometry(0.8, 0.1, 0.66, 4, 0.05), 0, 0.56, 0.06);                     // cuscino
  const sch = add(new RoundedBoxGeometry(0.86, 0.78, 0.22, 4, 0.1), 0, 0.92, -0.33); sch.rotation.x = -0.14;   // schienale
  for (let i = 0; i < 3; i++) { const q = add(new RoundedBoxGeometry(0.76, 0.2, 0.08, 3, 0.04), 0, 0.72 + i * 0.22, -0.2 + i * 0.03); q.rotation.x = -0.14; }   // trapuntato a fasce
  const pt = add(new RoundedBoxGeometry(0.5, 0.2, 0.16, 4, 0.08), 0, 1.38, -0.4); pt.rotation.x = -0.2;   // poggiatesta
  for (const sx of [-1, 1]) { add(new RoundedBoxGeometry(0.2, 0.36, 0.8, 4, 0.09), sx * 0.5, 0.62, 0.02); add(new THREE.BoxGeometry(0.012, 0.012, 0.74), sx * 0.5, 0.81, 0.02, cuci); }   // braccioli + cucitura
  add(new THREE.CylinderGeometry(0.24, 0.3, 0.3, 24), 0, 0.15, 0.02, gold);               // base girevole
  g.rotation.order = 'YXZ'; return g;
}

function conchiglia(m) {   // poltroncina bianca avvolgente della lounge (solo arredo)
  const g = new THREE.Group(), add = (geo, x, y, z, r = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.y = r; o.castShadow = o.receiveShadow = true; g.add(o); return o; };
  add(new RoundedBoxGeometry(0.72, 0.2, 0.66, 4, 0.09), 0, 0.36, 0);
  const sch = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.4, 0.56, 28, 1, true, Math.PI * 0.55, Math.PI * 0.9), m); sch.position.set(0, 0.6, 0.02); sch.material.side = THREE.DoubleSide; g.add(sch);
  add(new THREE.CylinderGeometry(0.3, 0.34, 0.26, 24), 0, 0.13, 0); return g;
}

function cognacSgabello() { return cognacSgabello.m || (cognacSgabello.m = new THREE.MeshStandardMaterial({ color: '#8a5a3a', roughness: 0.45 })); }
