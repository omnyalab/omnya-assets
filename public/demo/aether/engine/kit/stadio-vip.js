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

  // come nel render ufficiale (int06): dentro la lounge con poltroncine bianche e tavolini, la vetrata, e davanti alla vetrata
  // la terrazza sul catino con due file di poltrone in pelle cognac rivolte dritte al campo (sono quelle che si scelgono)
  const T = opz.terrazza ?? 2.6, vG = D - T;   // vG = dove sta la vetrata, da vG a D la terrazza aperta sul campo
  { const g = new THREE.PlaneGeometry(W, D + 0.6); g.rotateX(-Math.PI / 2); g.rotateY(rotY); const m = new THREE.Mesh(g, mStone); m.position.copy(at(0, yF + 0.03, (D + 0.6) / 2 - 0.3)); m.receiveShadow = true; G.add(m); }
  { const g = new THREE.PlaneGeometry(W, vG + 0.3); g.rotateX(Math.PI / 2); g.rotateY(rotY); const m = new THREE.Mesh(g, mCeil); m.position.copy(at(0, yC - 0.05, vG / 2)); G.add(m); }
  const wall = u => { const g = new THREE.BoxGeometry(0.12, yC - yF, D + 0.3); const m = new THREE.Mesh(g, mWood); place(m, u, (yC + yF) / 2, D / 2); m.castShadow = m.receiveShadow = true; };
  wall(-W / 2); wall(W / 2);
  { const g = new THREE.BoxGeometry(W, yF - t0.yEnd, D + 0.6); const m = new THREE.Mesh(g, mWood); place(m, 0, (yF + t0.yEnd) / 2, (D + 0.6) / 2 - 0.3); }
  { const g = new THREE.BoxGeometry(W, yC - yF, 0.12); const m = new THREE.Mesh(g, mWood); place(m, 0, (yC + yF) / 2, 0.05); }
  // bancone di pietra in fondo con la luce calda sotto il piano
  { const top = new THREE.Mesh(new RoundedBoxGeometry(W * 0.5, 0.08, 0.7, 2, 0.03), mStone), body = new THREE.Mesh(new THREE.BoxGeometry(W * 0.48, 1.0, 0.6), mWood);
    place(top, 0, yF + 1.06, 0.55); place(body, 0, yF + 0.5, 0.52); const strip = new THREE.Mesh(new THREE.BoxGeometry(W * 0.48, 0.04, 0.04), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffcf8f', emissiveIntensity: 1.2 })); place(strip, 0, yF + 0.98, 0.84); }
  // luci a incasso e fascia luminosa sul bordo del soffitto
  const spot = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#fff1da', emissiveIntensity: 1.6 });
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { const m = new THREE.Mesh(new THREE.CircleGeometry(0.11, 16), spot); m.rotation.x = Math.PI / 2; m.position.copy(at(lerp(-W / 2 + 1.2, W / 2 - 1.2, i / 3), yC - 0.07, lerp(1.4, vG - 0.8, j))); G.add(m); }
  { const m = new THREE.Mesh(new THREE.BoxGeometry(W - 0.3, 0.05, 0.08), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffe2b8', emissiveIntensity: 1.4 })); place(m, 0, yC - 0.08, vG - 0.15); }
  const lamp = new THREE.PointLight(0xffdcb0, opz.luce ?? 9, 14, 2); lamp.position.copy(at(0, yC - 0.6, vG * 0.5)); G.add(lamp);
  const lamp2 = new THREE.PointLight(0xffe6c8, (opz.luce ?? 9) * 0.12, 7, 2); lamp2.position.copy(at(0, yC - 0.4, vG + T * 0.5)); G.add(lamp2);
  // vetrata della lounge con montanti d'oro sottili
  { const g = new THREE.PlaneGeometry(W, yC - yF - 0.1), m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.06, depthWrite: false, envMapIntensity: 0.8 })); place(m, 0, (yC + yF) / 2, vG, Math.PI);
    for (let i = 0; i <= 5; i++) { const mu = new THREE.Mesh(new THREE.BoxGeometry(0.04, yC - yF, 0.05), mGold); place(mu, lerp(-W / 2, W / 2, i / 5), (yC + yF) / 2, vG); } }
  // lounge: poltroncine bianche avvolgenti e tavolini tondi (solo arredo)
  const bianca = new THREE.MeshPhysicalMaterial({ color: '#f4f1ea', roughness: 0.5, sheen: 0.5, sheenColor: new THREE.Color('#ffffff') });
  for (let k = 0; k < 3; k++) for (let r = 0; r < 2; r++) { const u = lerp(-W / 2 + 1.6, W / 2 - 1.6, k / 2) + (r ? 0.6 : 0), v = 1.9 + r * 1.5;
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.05, 28), bianca); place(t, u, yF + 0.46, v); place(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.12, 0.44, 12), mGold), u, yF + 0.22, v);
    for (const s of [-1, 1]) place(conchiglia(bianca), u + s * 0.75, yF, v, s * 1.2); }
  // parapetto di vetro in fondo alla terrazza, col corrimano d'oro
  { const g = new THREE.PlaneGeometry(W, 0.78), m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.05, transparent: true, opacity: 0.08, depthWrite: false })); place(m, 0, yF + 0.39, D - 0.05, Math.PI);
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, W, 10), mGold); place(h, 0, yF + 0.78, D - 0.05); h.rotation.z = Math.PI / 2; h.rotation.y = rotY; }

  // poltrone in pelle cognac sulla terrazza: 2 file da 4, la seconda un gradino più su, tutte dritte verso il campo
  const poltrone = [], cognac = new THREE.MeshPhysicalMaterial({ color: opz.pelle || '#8a5a3a', roughness: 0.38, sheen: 0.5, sheenRoughness: 0.45, sheenColor: new THREE.Color('#ffd9b3'), clearcoat: 0.25, clearcoatRoughness: 0.5 });
  const selMat = cognac.clone(); selMat.color.set(opz.oro || '#e3c27a'); const hovMat = cognac.clone(); hovMat.color.set('#c99a6a');
  const riser = new THREE.Mesh(new THREE.BoxGeometry(W - 0.25, 0.32, 1.1), mStone); place(riser, 0, yF + 0.16, vG + 0.65);
  for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) {
    const u = lerp(-W / 2 + 1.25, W / 2 - 1.25, k / 3), v = D - 0.95 - r * 1.15, y0 = yF + (r ? 0.32 : 0), g = poltrona(cognac, mGold);
    place(g, u, y0, v); g.userData.vip = poltrone.length; g.userData.nome = `Row ${String.fromCharCode(65 + r)} · Seat ${k + 1}`; g.traverse(o => { o.castShadow = true; o.receiveShadow = true; o.userData.vip = poltrone.length; });
    poltrone.push({ g, u, v, y0, nome: g.userData.nome, occhio: at(u, y0 + 1.18, v - 0.05) });
  }
  function colora(sel, hov) { poltrone.forEach((q, i) => { const on = sel.includes(i), h = hov === i; q.g.traverse(o => { if (o.userData.pelle) o.material = on ? selMat : h ? hovMat : cognac; }); }); }
  // riprese: davanti alla vetrata (si vedono le poltrone), dentro seduto
  const fuori = { pos: at(0, yF + (opz.fuoriAlto ?? 2.4), D + (opz.fuoriDist ?? 6.8)).toArray(), tgt: at(0, yF + 0.8, D - 2.2).toArray(), fov: opz.fovFuori ?? 46 };
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
