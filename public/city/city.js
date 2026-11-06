// Omnya City: generatore procedurale della citta, tre look (A originale, B Omnya, C plastico)
import * as THREE from './three.module.min.js';

export function hashStr(s) {
  let h1 = 0xdeadbeef ^ 0, h2 = 0x41c6ce57 ^ 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  return h1 >>> 0;
}
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];

export const STYLES = {

  V: null, W: null,

  P: { // come lui ma piu figo: colori caramella, sole caldo, ombre nette, piu dettagli
    sky: ['#3FA4FF', '#BFE6FF'], fog: '#BFE3FA', ground: '#6FD34A',
    asphalt: '#454C5A', sidewalk: '#E4E7EC', lawn: ['#5FD13E', '#6BDB47', '#56C637'], marking: '#FFFFFF',
    fields: ['#8EE04F', '#B6EA55', '#FFE066', '#6FD34A', '#D4F07A', '#FFB84D'],
    tree: ['#2DB84B', '#45CC52', '#1FA346', '#7BDB4A'], trunk: '#8A5530', sea: '#1FA8F2', sand: '#FFE3A1',
    walls: ['#FFE9A8', '#FFB3A1', '#FFD234', '#9FD8FF', '#B5F2C8', '#E2C8FF', '#FFFFFF', '#FF9C66', '#FF8DB0', '#7FE0D6'],
    roofs: ['#F2392B', '#2563EB', '#16A06B', '#FF7A1A', '#7C3AED', '#E11D74', '#0EA5E9'],
    doors: ['#14532D', '#DC2626', '#1E3A8A', '#7E22CE', '#F59E0B'], glass: '#1D4ED8', frame: '#FFFFFF',
    flowers: ['#FF4D8D', '#FFD60A', '#FF7AB6', '#FFFFFF', '#B983FF'],
    plaza: '#FFE7B8', stone: '#FFF1D6', water: '#38D3FF', hl: '#FFE600',
    sun: ['#FFE7BF', 2.9], hemi: ['#D9EEFF', '#8CD45E', .78], sunDir: [-0.7, 0.58, -0.42],
    font: 'Lilita', accent: '#FFD21F', text: '#FFFFFF', houses: 'classic', details: true
  },
  D: { // ville pop Miami: moderne ma sgargianti
    sky: ['#2E9BFF', '#FFD9E8'], fog: '#FFD8E6', ground: '#6FD34A',
    asphalt: '#3F4656', sidewalk: '#F3EEE8', lawn: ['#5FD13E', '#6BDB47', '#56C637'], marking: '#FFFFFF',
    fields: ['#8EE04F', '#B6EA55', '#FFE066', '#6FD34A', '#FFB84D'],
    tree: ['#2DB84B', '#45CC52', '#1FA346', '#7BDB4A'], trunk: '#B08350', sea: '#12C6E8', sand: '#FFE3A1',
    walls: ['#FF8FB1', '#FFD23F', '#6EE7C8', '#7CC8FF', '#FF9E5E', '#C7A6FF', '#FFFFFF', '#FFB4C9'],
    uppers: ['#FFFFFF', '#FF5C8A', '#2563EB', '#FFB703', '#10B9A0', '#FF7A1A', '#8B5CF6'],
    roofTop: ['#5FD13E', '#FFFFFF', '#FF7A1A', '#5FD13E'],
    roofs: ['#FFFFFF'], doors: ['#1E3A8A'], glass: '#0F3C66', frame: '#FFFFFF',
    pool: '#22E1FF', deck: '#FFF1DE', terracotta: '#FF5C8A', umbrella: ['#FF4D8D', '#FFD60A', '#22D3EE', '#FFFFFF', '#FF7A1A'],
    plaza: '#FFE7D6', stone: '#FFF6EA', water: '#22E1FF', hl: '#FFE600',
    sun: ['#FFE2C4', 2.8], hemi: ['#E1EEFF', '#9AD46A', .8], sunDir: [-0.7, 0.58, -0.42],
    font: 'Lilita', accent: '#FFD21F', text: '#FFFFFF', houses: 'modern'
  },
  A: { // copia del riferimento: low-poly colori pieni
    sky: ['#7EC3F2', '#DDEFF7'], fog: '#CFE7F2', ground: '#8DCB55',
    asphalt: '#4F5660', sidewalk: '#D5D8DC', lawn: ['#7CC646', '#86D04E', '#74BE40'], marking: '#FFFFFF',
    fields: ['#9FD65C', '#B8E06A', '#E3D774', '#86C94C', '#C9E27A'],
    tree: ['#3FA23C', '#52B547', '#2F8F35', '#67C04F'], trunk: '#7A4E2C', sea: '#3FA7E0', sand: '#EAD9A4',
    walls: ['#F7E3AE', '#F7B9A2', '#FFD45E', '#A8D2EE', '#BDE8C3', '#DCC6F0', '#FBF6EC', '#F2A774', '#F48FA0'],
    roofs: ['#E0402E', '#2C5A9E', '#26946A', '#F07A22', '#8A4B2E', '#3E78B8', '#C9302C'],
    doors: ['#2E6B55', '#C23B2E', '#2B4A86', '#7A3B8E'], glass: '#27486E', frame: '#FFFFFF',
    plaza: '#EBDDBE', stone: '#F1E6CF', water: '#55C3EE', hl: '#FFE347',
    sun: ['#FFF1D6', 2.3], hemi: ['#DCEEFF', '#9CC46A', .95], sunDir: [-0.55, 0.8, -0.35],
    font: 'Lilita', accent: '#FFD21F', text: '#FFFFFF', houses: 'classic'
  },
  B: { // Omnya: ville moderne, colori pieni e caldi (Miami / Dubai)
    sky: ['#4FA8EC', '#FFE2C2'], fog: '#F6DCC4', ground: '#93C25A',
    asphalt: '#555A63', sidewalk: '#EADFCF', lawn: ['#7FC352', '#8BCB58', '#76B94B'], marking: '#FFFFFF',
    fields: ['#A9D46A', '#C9DB78', '#E8D08A', '#93C95C', '#D9C27A'],
    tree: ['#3E9E46', '#4FB052', '#2E8C40', '#62BC55'], trunk: '#9B7A55', sea: '#1FB5C9', sand: '#F3DFB4',
    walls: ['#FFFFFF', '#FBE8D0', '#FAD6C2', '#EAF4EE', '#FFF1D9', '#F3E1CC'],
    uppers: ['#D0784A', '#2F3A40', '#E9B98F', '#8FC1AE', '#F2C9A0', '#FFFFFF', '#E58B6B'],
    roofTop: ['#FFFFFF', '#FFFFFF', '#7FC352', '#E07A4F'],
    roofs: ['#FFFFFF'], doors: ['#7A4E31'], glass: '#1C3A4F', frame: '#2A2724',
    pool: '#2FD0E0', deck: '#F1E4CF', terracotta: '#D9663C', umbrella: ['#D9663C', '#FFFFFF', '#F2B33D'],
    plaza: '#F2E6D3', stone: '#FAF3E8', water: '#2FD0E0', hl: '#FFE347',
    sun: ['#FFE0B8', 2.4], hemi: ['#D6EAFF', '#B7C47A', .9], sunDir: [-0.6, 0.62, -0.45],
    font: 'SF', accent: '#FFC94A', text: '#FFFFFF', houses: 'modern'
  },
  C: { // plastico bianco
    sky: ['#DCE1E4', '#F3F1ED'], fog: '#EDEBE7', ground: '#EEEBE5',
    asphalt: '#C9C4BC', sidewalk: '#E4E0D9', lawn: ['#EFECE6'], marking: '#FFFFFF',
    fields: ['#ECE9E3', '#F2F0EB', '#E6E2DB'],
    tree: ['#FFFFFF', '#F7F5F1'], trunk: '#E2DDD4', sea: '#DDE5E8', sand: '#EFEBE4',
    walls: ['#EDEAE4'], uppers: ['#EDEAE4', '#D2BC98'], roofTop: ['#F4F2EE'], roofs: ['#FBFAF8'], doors: ['#E4DED4'],
    glass: '#BFCDD2', frame: '#E9E5DF', pool: '#CFE0E4', deck: '#F1EEE9', terracotta: '#D9C3A0', umbrella: ['#FFFFFF'],
    plaza: '#F3F1EC', stone: '#FBFAF8', water: '#CFE0E4', hl: '#0A84FF',
    sun: ['#FFFFFF', 1.5], hemi: ['#FFFFFF', '#CFC9BF', .62], sunDir: [-0.5, 0.75, -0.4],
    font: 'SF', accent: '#0A84FF', text: '#111111', houses: 'modern'
  }
};

{
  const A = STYLES.A;
  const vill = {
    walls: ['#FFFFFF', '#F7E3AE', '#F7B9A2', '#FFD45E', '#A8D2EE', '#BDE8C3', '#DCC6F0', '#F2A774', '#F48FA0'],
    uppers: ['#FFFFFF', '#F7E3AE', '#A8D2EE', '#BDE8C3', '#F7B9A2', '#FFD45E', '#DCC6F0'],
    roofTop: ['#E0402E', '#2C5A9E', '#26946A', '#F07A22', '#C9302C', '#3E78B8'],
    doors: ['#2E6B55', '#C23B2E', '#2B4A86'], glass: '#27486E', frame: '#FFFFFF',
    pool: '#55C3EE', deck: '#F1E6CF', terracotta: '#E0402E', umbrella: ['#E0402E', '#FFD21F', '#2C5A9E', '#FFFFFF'],
    houses: 'modern'
  };
  STYLES.V = Object.assign({}, A, vill, { roofs: ['#FFFFFF'] });
  STYLES.X = Object.assign({}, A, vill, { roofs: ['#FFFFFF'], pitched: true, sameWall: true, walls: A.walls, roofTop: A.roofs, doors: A.doors, umbrella: ['#E0402E', '#FFD21F', '#2C5A9E', '#FFFFFF'] });
  const tierBase = Object.assign({}, A, vill, { roofs: ['#FFFFFF'], pitched: true, sameWall: true, walls: A.walls, roofTop: A.roofs, doors: A.doors,
    umbrella: ['#E0402E', '#FFD21F', '#2C5A9E', '#FFFFFF'], tiers: true, rich: true, hills: true,
    sky: ['#8FC6EE', '#F3EEDB'], fog: '#E9EBDC' });
  STYLES.T = Object.assign({}, tierBase, { trailer: true });
  STYLES.Y = Object.assign({}, tierBase, { mixed: true, tex: true });
  STYLES.Z = Object.assign({}, tierBase, { sun: ['#FFEFD8', 3.2], hemi: ['#E4EDF4', '#8FA872', .85], glass: '#7C97B4', doors: ['#1E3550', '#2B4A3A', '#5A2A2A'], sunDir: [.62, .7, -.36],
    walls: ['#EAD6A6', '#E8E2D4', '#D9C7A6', '#C8D3D8', '#E6C7A2', '#D8DCC6', '#EFE3C6', '#D6B79A', '#E3CFC4'],
    roofTop: ['#C4532E', '#A9412F', '#7A5A40', '#5C6E86', '#58775A', '#7C6A9C', '#B5683A', '#44708E', '#8C3F33'],
    lawn: ['#92CC64', '#9AD06C', '#8BC55E'], ground: '#9BCB72', fields: ['#A9D27A', '#C2DC86', '#E9D78F', '#9CCB70', '#D6E29A', '#E6C77E'],
    sidewalk: '#ECE6D8', asphalt: '#5A6170', tree: ['#4FA85A', '#5DB866', '#3F9A52', '#76C26A'], sea: '#4AA8DF', sand: '#F2DEA6',
    sky: ['#3E9BEA', '#BFE2FB'], fog: '#BFE2FB', mixed: true, tex: true, mix: true, cozy: true, details: true, flowers: ['#FF4D8D', '#FFD60A', '#FF7AB6', '#FFFFFF', '#B983FF'] });
  STYLES.U = Object.assign({}, tierBase, { trailer: false });
  STYLES.W = Object.assign({}, A, vill, { roofs: ['#FFFFFF'], pitched: true, uppers: ['#FFFFFF', '#FFFFFF', '#FBF6EC'] });
}
// geometrie unitarie centrate
function gableGeo() {
  const v = [
    -.5, -.5, .5, .5, -.5, .5, 0, .5, .5, // front tri
    .5, -.5, -.5, -.5, -.5, -.5, 0, .5, -.5, // back tri
    -.5, -.5, -.5, -.5, -.5, .5, 0, .5, .5, -.5, -.5, -.5, 0, .5, .5, 0, .5, -.5, // left slope
    .5, -.5, .5, .5, -.5, -.5, 0, .5, -.5, .5, -.5, .5, 0, .5, -.5, 0, .5, .5, // right slope
    -.5, -.5, -.5, .5, -.5, -.5, .5, -.5, .5, -.5, -.5, -.5, .5, -.5, .5, -.5, -.5, .5 // bottom
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return g;
}

export function buildCity(scene, styleKey, opts = {}) {
  const st = STYLES[styleKey];
  const G = {
    box: new THREE.BoxGeometry(1, 1, 1),
    gable: gableGeo(),
    hip: new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1).rotateY(Math.PI / 4),
    // opts.lite (phones): fewer segments, same shapes, about a third fewer triangles
    cyl: new THREE.CylinderGeometry(.5, .5, 1, opts.lite ? 6 : 10),
    ico: new THREE.IcosahedronGeometry(.5, 0),
    sph: new THREE.SphereGeometry(.5, opts.lite ? 8 : 14, opts.lite ? 6 : 10),
    cone: new THREE.ConeGeometry(.5, 1, opts.lite ? 7 : 10),
    mount: new THREE.ConeGeometry(.5, 1, 7, 1),
    terr: new THREE.CylinderGeometry(.5, .58, 1, opts.lite ? 40 : 72),
    disc: new THREE.CylinderGeometry(.5, .5, 1, opts.lite ? 40 : 72),
    plane: new THREE.PlaneGeometry(1, 1),
  };
  const M = {
    matte: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .82, metalness: 0 }),
    glass: styleKey === 'C'
      ? new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .2, metalness: .1, transparent: true, opacity: .75 })
      : new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .35, metalness: .1, envMapIntensity: .6 }),
    water: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .04, metalness: .15, envMapIntensity: 1.2 }),
    flat: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .95, metalness: 0, flatShading: true }),
  };
  function texMat(kind, flat) {
    const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .85, metalness: 0, flatShading: !!flat });
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;')
        .replace('#include <project_vertex>', `#include <project_vertex>
        vec4 wpx = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          wpx = instanceMatrix * wpx;
        #endif
        vWp = (modelMatrix * wpx).xyz;`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        varying vec3 vWp;
        float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
          return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }`)
        .replace('#include <color_fragment>', `#include <color_fragment>
        ${kind === 'roof' ? `
          float row = vWp.y / 0.36; float rf = fract(row); float ri = floor(row);
          float u = (vWp.x + vWp.z) / 0.62 + ri * 0.5; float uf = fract(u);
          float k = smoothstep(0.0, 0.16, rf) * (0.86 + 0.14 * smoothstep(0.0, 0.06, uf) * smoothstep(1.0, 0.94, uf));
          float aa = smoothstep(0.18, 0.45, max(fwidth(row), fwidth(u))); k = mix(k, 0.9, aa); rf = mix(rf, 0.75, aa);
          float tn = h21(vec2(floor(u), ri));
          diffuseColor.rgb *= mix(0.74, 1.0, k) * (0.94 + 0.1 * tn) * (1.0 - 0.18 * (1.0 - rf));` : ''}
        ${kind === 'siding' ? `
          float sr = fract(vWp.y / 0.3); float aa2 = smoothstep(0.15, 0.4, fwidth(vWp.y / 0.3));
          diffuseColor.rgb *= mix(0.93 + 0.07 * smoothstep(0.0, 0.12, sr), 0.965, aa2) + 0.02 * vn(vWp.xz * 2.0);` : ''}
        ${kind === 'grass' ? `
          float g = vn(vWp.xz * 0.35) * 0.6 + vn(vWp.xz * 1.7) * 0.4;
          diffuseColor.rgb *= 0.88 + 0.2 * g;` : ''}
        ${kind === 'paving' ? `
          vec2 q = fract(vWp.xz / 1.6);
          float aa3 = smoothstep(0.1, 0.3, fwidth(vWp.x / 1.6));
          float e0 = smoothstep(0.0, 0.04, q.x) * smoothstep(1.0, 0.96, q.x) * smoothstep(0.0, 0.04, q.y) * smoothstep(1.0, 0.96, q.y);
          float e = mix(e0, 0.9, aa3);
          diffuseColor.rgb *= 0.9 + 0.1 * e + 0.03 * h21(floor(vWp.xz / 1.6));` : ''}
        ${kind === 'asphalt' ? `
          diffuseColor.rgb *= 0.93 + 0.1 * vn(vWp.xz * 3.0) + 0.04 * h21(floor(vWp.xz * 9.0));` : ''}`);
    };
    return m;
  }
  if (st.tex) Object.assign(M, { roof: texMat('roof', true), siding: texMat('siding'), grass: texMat('grass'), paving: texMat('paving'), asphalt: texMat('asphalt') });
  const TX = (k, fallback) => st.tex ? k : fallback;
  const winTex = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 160; const x = c.getContext('2d');
    x.fillStyle = '#F4F1EA'; x.fillRect(0, 0, 128, 160);
    const g = x.createLinearGradient(0, 0, 0, 160); g.addColorStop(0, '#B9CCDA'); g.addColorStop(.55, '#8EA7BC'); g.addColorStop(1, '#6E8AA3');
    for (const [px, py, pw, ph] of [[14, 14, 46, 62], [68, 14, 46, 62], [14, 84, 46, 62], [68, 84, 46, 62]]) { x.fillStyle = g; x.fillRect(px, py, pw, ph);
      x.save(); x.beginPath(); x.rect(px, py, pw, ph); x.clip(); x.fillStyle = 'rgba(255,255,255,.28)'; x.beginPath(); x.moveTo(px + pw * .15, py + ph); x.lineTo(px + pw * .55, py + ph); x.lineTo(px + pw * 1.1, py); x.lineTo(px + pw * .7, py); x.closePath(); x.fill();
      x.fillStyle = 'rgba(40,55,75,.18)'; x.fillRect(px, py, pw, 5); x.fillRect(px, py, 4, ph); x.restore(); }
    x.strokeStyle = 'rgba(0,0,0,.12)'; x.lineWidth = 2; x.strokeRect(1, 1, 126, 158);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; })();
  M.win = new THREE.MeshStandardMaterial({ map: winTex, roughness: .55, metalness: 0 });
  // Ep.2: glass that reflects, lit panes at night, tower glass, lamps, glowing pools, the lit penthouse
  const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const winEm = canvasTex(128, 160, (x) => { x.fillStyle = '#000'; x.fillRect(0, 0, 128, 160); x.fillStyle = '#FFFFFF'; for (const [px, py, pw, ph] of [[14, 14, 46, 62], [68, 14, 46, 62], [14, 84, 46, 62], [68, 84, 46, 62]]) x.fillRect(px, py, pw, ph); });
  const tR = rng(77);
  const towerMap = canvasTex(64, 256, (x) => { x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, 64, 256); x.fillStyle = 'rgba(30,45,60,.25)'; for (let i = 0; i < 16; i++) x.fillRect(i * 4, 0, 1, 256); for (let j = 0; j < 64; j++) x.fillRect(0, j * 4, 64, 1); });
  const towerEm = canvasTex(64, 256, (x) => { x.fillStyle = '#000'; x.fillRect(0, 0, 64, 256); for (let i = 0; i < 16; i++) for (let j = 0; j < 64; j++) if (tR() < .3) { x.fillStyle = tR() < .8 ? '#FFE2B0' : '#FFFFFF'; x.fillRect(i * 4 + 1, j * 4 + 1, 3, 3); } });
  if (styleKey !== 'C' && Object.values(opts.districts || {}).some((v) => v === true)) Object.assign(M.glass, { roughness: .12, metalness: .5, envMapIntensity: 1.4 });
  M.tower = new THREE.MeshStandardMaterial({ map: towerMap, roughness: .1, metalness: .6, envMapIntensity: 1.5, emissive: 0xFFD9A0, emissiveMap: towerEm, emissiveIntensity: 0 });
  M.pool = M.water.clone(); M.pool.emissive = new THREE.Color('#19D2F5'); M.pool.emissiveIntensity = 0;
  M.lamp = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .5, emissive: 0xFFC879, emissiveIntensity: 0 });
  M.pent = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .2, metalness: .2, emissive: 0xFFC060, emissiveIntensity: 1.6 });
  M.win.emissive = new THREE.Color('#FFC46B'); M.win.emissiveMap = winEm; M.win.emissiveIntensity = 0;
  M.glass.emissive = new THREE.Color('#FFB45E'); M.glass.emissiveIntensity = 0;
  let buckets = new Map();
  const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler();
  const V = new THREE.Vector3(), S = new THREE.Vector3();
  let ghost = false; // white model villas on the free lots of The Hills
  let mute = false; // opts.lite: far trees and orchards are skipped, but their R() calls still run (same city on every device)
  function put(geom, mat, color, pos, scl, rot = [0, 0, 0], base = null, order = 'XYZ', noShadow = false) {
    if (mute) return;
    if (ghost) { color = mat === 'glass' ? '#C3D3DB' : mat === 'pool' ? '#BFE3EA' : mat === 'flat' ? '#E6E4DE' : '#F7F5F1'; if (mat === 'pool') mat = 'water'; }
    tmpE.set(rot[0], rot[1], rot[2], order); tmpQ.setFromEuler(tmpE);
    const m = new THREE.Matrix4().compose(V.set(pos[0], pos[1], pos[2]), tmpQ, S.set(scl[0], scl[1], scl[2]));
    if (base) m.premultiply(base);
    const small = (Math.max(scl[0], scl[1], scl[2]) < 1.6 || mat === 'glass') && !noShadow;
    const key = geom + '|' + mat + (noShadow ? '|ns' : small ? '|d' : '');
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push([m, new THREE.Color(color)]);
  }
  const lotBase = (x, z, yaw) => new THREE.Matrix4().makeRotationY(yaw).setPosition(x, 0, z);

  const MIX = st.cozy ? [
    { villaBig: 10, villaSmall: 8, gable2: 22, hip2: 18, flat2: 14, L2: 16, gable1: 6 },
    { villaBig: 10, villaSmall: 8, gable2: 22, hip2: 18, flat2: 14, L2: 16, gable1: 6 },
    { villaSmall: 8, gable2: 22, hip2: 16, flat2: 12, L2: 18, gable1: 14, hip1: 10 },
    { villaSmall: 4, gable2: 18, hip2: 12, flat2: 10, L2: 16, gable1: 24, hip1: 16 },
    { gable2: 12, gable1: 28, hip1: 22, L1: 18, flat1: 10, trailer: 5, shack: 5 },
    { gable2: 6, gable1: 26, hip1: 22, L1: 14, flat1: 8, shack: 12, trailer: 12 },
    { gable1: 22, hip1: 16, L1: 8, shack: 26, trailer: 28 },
    { gable1: 12, hip1: 10, L1: 5, flat1: 4, shack: 33, trailer: 36 },
  ] : [
    { villaBig: 34, villaSmall: 12, hip2: 16, gable2: 16, flat2: 14, L2: 8 },
    { villaBig: 22, villaSmall: 16, hip2: 16, gable2: 16, flat2: 14, L2: 16 },
    { villaBig: 6, villaSmall: 20, gable2: 18, hip2: 14, flat2: 12, L2: 16, gable1: 14 },
    { villaSmall: 12, gable2: 16, hip2: 10, flat2: 10, L2: 16, gable1: 22, hip1: 14 },
    { villaSmall: 4, gable2: 12, gable1: 26, hip1: 22, L1: 16, flat1: 10, shack: 5, trailer: 5 },
    { gable2: 6, gable1: 24, hip1: 20, L1: 12, flat1: 8, shack: 15, trailer: 15 },
    { gable1: 18, hip1: 14, L1: 6, shack: 30, trailer: 32 },
    { gable1: 10, hip1: 8, L1: 5, flat1: 4, shack: 34, trailer: 39 },
  ];
  function chooseType(r, dist, prev) {
    let wts = MIX[Math.min(dist, 7)];
    if (curLW < 10) { wts = Object.fromEntries(Object.entries(wts).filter(([k]) => !k.startsWith('villa') && !k.startsWith('L'))); }
    if (curLW > 13 && Math.random() < 0) wts = wts;
    for (let tries = 0; tries < 4; tries++) {
      let tot = 0; for (const k in wts) tot += wts[k];
      let x = r() * tot, t;
      for (const k in wts) { x -= wts[k]; if (x <= 0) { t = k; break; } }
      if (t !== prev) return t;
    }
    return Object.keys(wts).find(k => k !== prev);
  }
  function buildType(t, base, r, dist) {
    const sc = 1.16 - dist * .05;
    switch (t) {
      case 'villaBig': return modernVilla(base, r, dist, false);
      case 'villaSmall': return modernVilla(base, r, dist, true);
      case 'gable2': return classicHouse(base, r, { fl: 2, roof: 'gable', sc });
      case 'hip2': return classicHouse(base, r, { fl: 2, roof: 'hip', sc });
      case 'flat2': return classicHouse(base, r, { fl: 2, roof: 'flat', sc });
      case 'L2': return classicHouse(base, r, { fl: 2, roof: 'gable', sc, wing: true });
      case 'gable1': return classicHouse(base, r, { fl: 1, roof: 'gable', sc });
      case 'hip1': return classicHouse(base, r, { fl: 1, roof: 'hip', sc });
      case 'flat1': return classicHouse(base, r, { fl: 1, roof: 'flat', sc });
      case 'L1': return classicHouse(base, r, { fl: 1, roof: 'hip', sc, wing: true });
      case 'trailer': return trailer(base, r);
      case 'shack': return shack(base, r);
    }
  }
  const stats = {};
  // ---- layout
  const NB = 7, BW = 44, BD = 30, PX = 54, PZ = 40, LW = 11, LD = 15;
  const R = rng(hashStr('omnya-city-' + styleKey));
  let curLW = LW, curLD = LD, force = null;
  const NBX = st.mix ? 8 : NB, NBZ = st.mix ? 6 : NB, ROAD = PX - BW;
  const colW = {}, rowD = {}, colX = {}, rowZ = {};
  for (let i = -NBX; i <= NBX; i++) colW[i] = (!st.mix || Math.abs(i) <= 1) ? BW : pick(R, [34, 44, 44, 56, 62]);
  for (let j = -NBZ; j <= NBZ; j++) rowD[j] = (!st.mix || Math.abs(j) <= 1) ? BD : pick(R, [24, 30, 30, 38, 46]);
  colX[0] = 0; rowZ[0] = 0;
  for (let i = 1; i <= NBX; i++) { colX[i] = colX[i - 1] + colW[i - 1] / 2 + ROAD + colW[i] / 2; colX[-i] = colX[-i + 1] - colW[-i + 1] / 2 - ROAD - colW[-i] / 2; }
  for (let j = 1; j <= NBZ; j++) { rowZ[j] = rowZ[j - 1] + rowD[j - 1] / 2 + (PZ - BD) + rowD[j] / 2; rowZ[-j] = rowZ[-j + 1] - rowD[-j + 1] / 2 - (PZ - BD) - rowD[-j] / 2; }
  const RZ = PZ - BD;
  const block = (i, j) => ({ x: colX[i], z: rowZ[j], w: colW[i], d: rowD[j] });
  const ext = st.mix ? { x: colX[NBX] + colW[NBX] / 2 + ROAD / 2, z: rowZ[NBZ] + rowD[NBZ] / 2 + RZ / 2 } : { x: NB * PX + PX / 2, z: NB * PZ + PZ / 2 };
  const lots = [];

  // la citta ha una forma: un ovale di isolati che finisce nei campi
  const inCity = (i, j) => {
    if (Math.abs(i) > NBX || Math.abs(j) > NBZ) return false;
    if (!st.mix) return true;
    const edge = Math.abs(i) === NBX || Math.abs(j) === NBZ;
    if (Math.abs(i) === NBX && Math.abs(j) === NBZ) return false;
    return !(edge && (hashStr(`e${i},${j}`) % 100) < 30);
  };
  const inCityW = (x, z, m = 0) => Math.abs(x) < ext.x + m && Math.abs(z) < ext.z + m;
  // terreno, asfalto, mare
  put('box', 'flat', st.ground, [0, -.6, 0], [4000, 1, 4000]);
  for (let i = -NBX; i <= NBX; i++) for (let j = -NBZ; j <= NBZ; j++) if (inCity(i, j)) { const b = block(i, j); put('box', TX('asphalt', 'matte'), st.asphalt, [b.x, -.05, b.z], [b.w + ROAD, .1, b.d + RZ]); }
  const seaZ = ext.z + 170;
  put('box', 'water', st.sea, [0, .05, seaZ + 1200], [4000, .2, 2400], [0, 0, 0], null, 'XYZ', true);
  put('box', 'flat', st.sand, [0, .02, seaZ - 15], [4000, .2, 34]);
  const DIS = opts.districts || {};
  const HILL = { cx: 790, cz: 150, r0: 235, dr: 30, rows: 6, h0: 2.5, dh: 9 };
  const RES = { x0: -920, x1: -612, z0: 150, z1: seaZ - 60 };
  // the towers of The Residences: [x, z, floors, main]; the main one has the penthouse
  const RES_T = [[-668, 335, 40, 1, 'B'], [-735, 245, 36, 0, 'A'], [-800, 340, 34, 0, 'C'], [-860, 240, 32, 0, 'A'], [-680, 190, 30, 0, 'C'], [-880, 345, 30, 0, 'B']];
  const inRect = (x, z, a, b, c, d) => x > a && x < b && z > c && z < d;
  const inDist = (x, z) => (DIS.hills && Math.hypot(x - HILL.cx, z - HILL.cz) < HILL.r0 * 1.09 + 40)
    || (DIS.marina && inRect(x, z, -340, 560, seaZ - 130, seaZ + 10)) || (DIS.residences && inRect(x, z, RES.x0 - 30, RES.x1 + 20, RES.z0 - 30, seaZ))
    || (DIS.river && Math.abs(x - riverX(z)) < 40);
  // strade che escono dalla citta verso campagna e mare
  if (st.mix) {
    const zr = rowZ[0] + rowD[0] / 2 + RZ / 2, xr = colX[0] + colW[0] / 2 + ROAD / 2;
    { const mm = mute; if (DIS.hills) mute = true; put('box', 'matte', st.asphalt, [ext.x + 700, -.04, zr], [1400, .1, 8]); mute = mm; } // Ep.2: The Hills take this road
    put('box', 'matte', st.asphalt, [-ext.x - 700, -.04, zr], [1400, .1, 8]);
    put('box', 'matte', st.asphalt, [xr, -.04, (ext.z + seaZ) / 2], [8, .1, seaZ - ext.z]);
    put('box', 'matte', st.asphalt, [xr, -.04, -ext.z - 700], [8, .1, 1400]);
    const xl = colX[-3] - colW[-3] / 2 - ROAD / 2;
    put('box', 'matte', st.asphalt, [xl, -.04, (ext.z + seaZ) / 2], [8, .1, seaZ - ext.z]);
    // strada curva che esce in basso a destra
    let px = colX[4] + colW[4] / 2 + ROAD / 2, pz = -ext.z, ang = 0;
    for (let k = 0; k < 40; k++) { ang += .045; const nx = px + Math.sin(ang) * 18, nz = pz - Math.cos(ang) * 18;
      put('box', 'matte', st.asphalt, [(px + nx) / 2, -.04, (pz + nz) / 2], [8, .1, 19], [0, Math.atan2(nx - px, nz - pz), 0]); px = nx; pz = nz; }
  } else {
    put('box', 'matte', st.asphalt, [0, -.04, 0], [9, .1, 2800]);
    put('box', 'matte', st.asphalt, [0, -.04, 0], [2800, .1, 9]);
  }

  // campi, fattorie e alberi fuori citta
  for (let gx = -1400; gx < 1400; gx += 64) for (let gz = -1400; gz < seaZ - 40; gz += 52) {
    const fx = gx + 32, fz = gz + 26;
    if (inCityW(fx, fz, 40)) continue;
    put('box', 'flat', pick(R, st.fields), [fx, -.05 + R() * .04, fz], [60, .1, 48]);
    mute = (!!opts.lite && !inCityW(fx, fz, 220)) || inDist(fx, fz); // the R() calls still run: the old lots never move
    const near = !inCityW(fx, fz, 420);
    const rr = R();
    if (st.mix && !near && rr < .08 && !(opts.clear && Math.hypot(fx - opts.clear[0], fz - opts.clear[1]) < opts.clear[2] + 30)) { // fienile rosso con silo
      const ry = R() * Math.PI;
      put('box', 'matte', '#C9442F', [fx, 4, fz], [12, 8, 9], [0, ry, 0]);
      put('gable', 'flat', '#7A3B2E', [fx, 10, fz], [12.8, 4, 10], [0, ry + Math.PI / 2, 0]);
      put('box', 'matte', '#FFFFFF', [fx + Math.sin(ry + Math.PI / 2) * 6.05, 3, fz + Math.cos(ry + Math.PI / 2) * 6.05], [4, 5, .3], [0, ry + Math.PI / 2, 0]);
      put('cyl', 'matte', '#D9D4C8', [fx + Math.cos(ry) * 9, 7, fz - Math.sin(ry) * 9], [4.5, 14, 4.5]);
      put('cone', 'flat', '#8E9294', [fx + Math.cos(ry) * 9, 15.5, fz - Math.sin(ry) * 9], [5, 3, 5]);
      for (let k = 0; k < 6; k++) put('cyl', 'flat', '#E8C25A', [fx - 20 + k * 7, 1.2, fz + 14 + (k % 2) * 4], [2.4, 2.4, 2.4], [Math.PI / 2, 0, 0]);
    } else if (st.mix && rr < .16) { // frutteto
      for (let a = 0; a < 5; a++) for (let b = 0; b < 4; b++) { const tx = fx - 24 + a * 12, tz = fz - 16 + b * 10;
        if (opts.clear && Math.hypot(tx - opts.clear[0], tz - opts.clear[1]) < opts.clear[2]) continue;
        put('cyl', 'matte', '#7A5232', [tx, 1.2, tz], [.5, 2.4, .5]); put('ico', 'flat', a % 2 ? '#4DB35A' : '#5FC25E', [tx, 3.6, tz], [3.4, 3, 3.4], [a, b, 0]); }
    }
    const nt = Math.floor(R() * 5);
    for (let k = 0; k < nt; k++) {
      const tx = gx + R() * 64, tz = gz + (R() < .5 ? 1 : 51), s = 3 + R() * 3;
      if (opts.clear && Math.hypot(tx - opts.clear[0], tz - opts.clear[1]) < opts.clear[2]) continue;
      if (inCityW(tx, tz, 20)) continue;
      { const mm = mute; if (inDist(tx, tz)) mute = true; put('ico', 'flat', pick(R, st.tree), [tx, s * .9 + 1.5, tz], [s * 1.6, s * 1.8, s * 1.6], [R(), R(), 0]); mute = mm; }
    }
    mute = false;
  }
  if (st.hills) {
    for (let k = 0; k < 70; k++) { // colline verdi con boschi
      const a = k / 70 * Math.PI * 2, rad = 1150 + R() * 260, x = Math.cos(a) * rad, z = Math.sin(a) * rad * .85;
      if (z > seaZ - 160) continue;
      put('sph', 'flat', pick(R, ['#6DBA55', '#5FB04C', '#7CC35E', '#68B552']), [x, -20, z], [340, 70 + R() * 60, 280]);
      mute = !!opts.lite; // the forests on the hills: only seen from very high
      for (let t = 0; t < 7; t++) put('cone', 'flat', pick(R, ['#3F8A50', '#4E8F55', '#2F7A47']), [x + (R() - .5) * 170, 40 + R() * 30, z + (R() - .5) * 130], [16, 26, 16]);
      mute = false;
    }
    if (st.mix) for (let k = 0; k < 26; k++) { // montagne ai lati e dietro, con la neve in cima
      const a = Math.PI * (.62 + k / 26 * 1.76), rad = 1500 + R() * 350, x = Math.cos(a) * rad * 1.1, z = Math.sin(a) * rad;
      if (z > seaZ - 300) continue;
      const h = 120 + R() * 120, r = 260 + R() * 160, ry = R() * Math.PI;
      put('mount', 'flat', pick(R, ['#4FA552', '#5BB05A', '#47994C']), [x, h / 2 - 10, z], [r * 2, h, r * 2], [0, ry, 0]);
      put('mount', 'flat', '#3F8F4C', [x, h * .72, z], [r * .9, h * .44, r * .9], [0, ry, 0]);
      put('mount', 'flat', '#FFFFFF', [x, h * .9, z], [r * .45, h * .22, r * .45], [0, ry, 0]);
    }
    if (false) for (let k = 0; k < 22; k++) { // catena di monti oltre il mare, leggera all'orizzonte
      const x = -2600 + k * 250 + R() * 80, z = seaZ + 2900 + R() * 400, h = 80 + R() * 110, r = 240 + R() * 100, ry = R() * Math.PI;
      put('mount', 'flat', pick(R, ['#7DBE86', '#86C48D', '#74B57F']), [x, h / 2 - 10, z], [r * 2, h, r * 2], [0, ry, 0], null, 'XYZ', true);
      if (h > 175) put('mount', 'flat', '#FFFFFF', [x, h * .9, z], [r * .4, h * .2, r * .4], [0, ry, 0], null, 'XYZ', true);
    }
    if (false) for (const side of [-1, 1]) for (let k = 0; k < 7; k++) { // promontori ai lati della baia
      const x = side * (330 + k * 60 + R() * 30), z = seaZ - 30 + k * 120, h = 70 + k * 22 + R() * 40, r = 100 + R() * 45, ry = R() * Math.PI;
      put('mount', 'flat', pick(R, ['#6FB06A', '#64A563', '#7ABB72']), [x, h / 2 - 8, z], [r * 2, h, r * 2], [0, ry, 0]);
      if (h > 9999) put('mount', 'flat', '#FFFFFF', [x, h * .9, z], [r * .4, h * .2, r * .4], [0, ry, 0]);
      for (let t = 0; t < 6; t++) put('cone', 'flat', '#3F8A50', [x + (R() - .5) * r, 12 + R() * 20, z + (R() - .5) * r * .6 - r * .3], [12, 20, 12]);
    }
  }

  // segnaletica: solo dove ci sono strade vere
  for (let i = -NBX; i <= NBX; i++) for (let j = -NBZ; j <= NBZ; j++) {
    if (!inCity(i, j)) continue;
    const b = block(i, j), x0 = b.x - b.w / 2 - ROAD / 2, x1 = b.x + b.w / 2 + ROAD / 2, z0 = b.z - b.d / 2 - RZ / 2, z1 = b.z + b.d / 2 + RZ / 2;
    if (inCity(i, j - 1)) for (let x = x0 + 4; x < x1 - 2; x += 9) put('box', 'matte', st.marking, [x, .02, z0], [3, .03, .28], [0, 0, 0], null, 'XYZ', true);
    if (inCity(i - 1, j)) for (let z = z0 + 4; z < z1 - 2; z += 9) put('box', 'matte', st.marking, [x0, .02, z], [.28, .03, 3], [0, 0, 0], null, 'XYZ', true);
    if (Math.max(Math.abs(i), Math.abs(j)) <= 4 && inCity(i - 1, j) && inCity(i, j - 1) && inCity(i - 1, j - 1)) {
      for (const sz of [-1, 1]) for (let k = -3; k <= 3; k++) put('box', 'matte', st.marking, [x0 + k * 1.3, .03, z0 + sz * 7], [.7, .03, 3], [0, 0, 0], null, 'XYZ', true);
      for (const sx of [-1, 1]) for (let k = -3; k <= 3; k++) put('box', 'matte', st.marking, [x0 + sx * 7.5, .03, z0 + k * 1.3], [3, .03, .7], [0, 0, 0], null, 'XYZ', true);
    }
  }

  // isolati
  for (let i = -NBX; i <= NBX; i++) for (let j = -NBZ; j <= NBZ; j++) {
    if (!inCity(i, j)) continue;
    const bb = block(i, j), cx = bb.x, cz = bb.z, bw = bb.w, bd = bb.d;
    put('box', TX('paving', 'matte'), st.sidewalk, [cx, .15, cz], [bw + 2, .3, bd + 2]);
    if (i === 0 && j === 0) { plaza(cx, cz); continue; }
    const dist = Math.max(Math.abs(i), Math.abs(j));
    if (dist > 1 && R() < (st.mix ? .11 : .07)) { park(cx, cz, bw, bd); continue; }
    // isolati diversi: 3, 4 o 5 case per fila, a volte mezzo isolato a giardinetto
    const cols = st.mix ? Math.max(2, Math.min(6, Math.round(bw / (9.5 + R() * 2.5)))) : 4, lw = bw / cols, ld = bd / 2;
    const pocket = st.mix && dist > 1 && R() < .14;
    for (let r = 0; r < 2; r++) {
      if (pocket && r === 1) { pocketPark(cx, cz + ld / 2, bw, ld); continue; }
      for (let c = 0; c < cols; c++) {
        const x = cx - bw / 2 + lw * (c + .5), z = cz + (r ? ld / 2 : -ld / 2), yaw = r ? 0 : Math.PI;
        lots.push({ i, j, r, c, x, z, yaw, dist, lw, ld });
      }
    }
  }
  const reservedSet = new Set(opts.reserved || []);
  lots.forEach(L => { if (reservedSet.has(`${L.i},${L.j},${L.r},${L.c}`)) L.reserved = true; });
  lots.forEach((L, n) => {
    L.seed = hashStr(`lot-${L.i}-${L.j}-${L.r}-${L.c}`);
    const base = lotBase(L.x, L.z, L.yaw); L.base = base;
    put('box', TX('grass', 'matte'), pick(rng(L.seed + 7), st.tiers && L.dist >= 6 ? ['#BFC46E', '#CDBB7E', '#AFBD68', '#C9B98A'] : st.lawn), [0, .4, 0], [L.lw - .8, .2, L.ld - .8], [0, 0, 0], base);
    if (L.reserved || opts.empty) return;
    if (L.c === 0) house.prev = null;
    curLW = L.lw; curLD = L.ld;
    house(base, L.seed, L.dist); L.type = house.prev;
  });

  function plaza(cx, cz) {
    put('box', 'matte', st.plaza, [cx, .4, cz], [BW, .2, BD]);
    if (st.houses === 'classic' || st.cozy) {
      put('cyl', 'matte', st.stone, [cx, .8, cz], [9, .6, 9]);
      put('cyl', 'water', st.water, [cx, 1.05, cz], [8, .2, 8]);
      put('cyl', 'matte', st.stone, [cx, 2, cz], [1.2, 2.4, 1.2]);
      put('cyl', 'matte', st.stone, [cx, 3.2, cz], [3, .3, 3]);
      for (let k = 0; k < 10; k++) {
        const a = k / 10 * Math.PI * 2, rx = cx + Math.cos(a) * 16, rz = cz + Math.sin(a) * 11;
        tree(rx, rz, 1);
      }
      for (const s of [-1, 1]) for (let k = -2; k <= 2; k++) put('box', 'matte', '#B9874F', [cx + k * 6, .75, cz + s * 7.5], [2.2, .4, .7]);
      for (const s of [-1, 1]) { put('box', 'flat', pick(R, st.lawn), [cx + s * 17, .55, cz], [8, .1, 22]); }
    } else {
      put('box', 'matte', st.stone, [cx, .6, cz], [26, .3, 7]);
      put('box', 'water', st.water, [cx, .8, cz], [24, .15, 5]);
      for (const s of [-1, 1]) for (let k = -3; k <= 3; k++) palm(cx + k * 6, cz + s * 9.5, 1.1);
      for (const s of [-1, 1]) put('box', 'flat', pick(R, st.lawn), [cx + s * 18.5, .55, cz], [5, .1, 24]);
    }
  }
  function pocketPark(cx, cz, BW, LD) {
    put('box', 'flat', pick(R, st.lawn), [cx, .45, cz], [BW, .3, LD]);
    put('box', 'matte', st.plaza, [cx, .62, cz], [BW - 6, .06, 2.4]);
    put('cyl', 'water', st.water, [cx + 9, .66, cz + 1], [8, .1, 5]);
    for (let k = -2; k <= 2; k++) put('box', 'matte', '#B9874F', [cx + k * 5, .8, cz - 2.2], [2, .4, .7]);
    for (let k = 0; k < 9; k++) tree(cx + (R() - .5) * (BW - 6), cz + (R() - .5) * (LD - 5), .7 + R() * .4);
    for (let k = 0; k < 12; k++) put('ico', 'flat', ['#FF4D8D', '#FFD60A', '#FFFFFF', '#B983FF'][k % 4], [cx - 16 + k * 2.8, .75, cz + 5.5], [.6, .5, .6]);
  }
  function park(cx, cz, BW = 44, BD = 30) {
    put('box', 'flat', pick(R, st.lawn), [cx, .45, cz], [BW, .3, BD]);
    put('box', 'matte', st.plaza, [cx, .62, cz], [BW, .06, 3]);
    put('box', 'matte', st.plaza, [cx, .62, cz], [3, .06, BD]);
    put('cyl', 'matte', st.plaza, [cx, .63, cz], [Math.min(BW, BD) * .6, .05, Math.min(BW, BD) * .6]);
    put('cyl', 'flat', pick(R, st.lawn), [cx, .64, cz], [Math.min(BW, BD) * .5, .06, Math.min(BW, BD) * .5]);
    put('cyl', 'water', st.water, [cx, .7, cz], [Math.min(BW, BD) * .22, .1, Math.min(BW, BD) * .22]);
    for (let k = 0; k < 14; k++) tree(cx + (R() - .5) * (BW - 6), cz + (R() - .5) * (BD - 6), .8 + R() * .5);
  }
  function tree(x, z, s, base = null) {
    const r = rng(hashStr(`t${x.toFixed(1)}${z.toFixed(1)}`));
    put('cyl', 'matte', st.trunk, [x, .5 + 1.2 * s, z], [.45 * s, 2.4 * s, .45 * s], [0, 0, 0], base);
    put('ico', 'flat', pick(r, st.tree), [x, .5 + 3.6 * s, z], [3.4 * s, 3.6 * s, 3.4 * s], [r(), r(), 0], base);
  }
  function palm(x, z, s, base = null) {
    const r = rng(hashStr(`p${x.toFixed(1)}${z.toFixed(1)}`));
    const h = (6 + r() * 2.5) * s, lean = (r() - .5) * .16;
    put('cyl', 'matte', st.trunk, [x, .5 + h / 2, z], [.32 * s, h, .32 * s], [lean, 0, lean], base);
    const top = [x + lean * h * .5, .5 + h, z - lean * h * .5];
    const green = pick(r, st.tree);
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * Math.PI * 2 + r();
      put('box', 'flat', green, [top[0] + Math.sin(a) * 1.25 * s, top[1] - .3 * s, top[2] + Math.cos(a) * 1.25 * s], [.7 * s, .12, 2.8 * s], [.42, a, 0], base, 'YXZ');
    }
    put('sph', 'flat', st.trunk, top, [.7 * s, .6 * s, .7 * s], [0, 0, 0], base);
  }

  function pine(x, z, s, base = null) {
    const g = pick(rng(hashStr(`pn${x.toFixed(1)}${z.toFixed(1)}`)), ['#2E7D4F', '#2F8A52', '#25704A']);
    put('cyl', 'matte', st.trunk, [x, .5 + .8 * s, z], [.35 * s, 1.6 * s, .35 * s], [0, 0, 0], base);
    put('cone', 'flat', g, [x, .5 + 3 * s, z], [3 * s, 3.4 * s, 3 * s], [0, 0, 0], base);
    put('cone', 'flat', g, [x, .5 + 4.7 * s, z], [2.1 * s, 2.6 * s, 2.1 * s], [0, 0, 0], base);
  }
  function trailer(base, r) {
    const y0 = .5, zc = -1.5, body = pick(r, ['#F4F1E6', '#E9E4D3', '#DCE8EC', '#F1E3C8']), stripe = pick(r, st.roofTop);
    put('box', 'matte', body, [0, y0 + 1.75, zc], [8.4, 2.4, 2.8], [0, 0, 0], base);
    put('box', 'matte', '#B9B4A8', [0, y0 + 3.0, zc], [8.5, .14, 2.9], [0, 0, 0], base);
    for (const sz of [-1, 1]) put('box', 'matte', stripe, [0, y0 + 1.95, zc + sz * 1.42], [8.42, .32, .04], [0, 0, 0], base);
    for (const wx of [-2.4, 2.4]) { put('box', 'matte', '#FFFFFF', [wx, y0 + 2.1, zc + 1.42], [1.4, .95, .06], [0, 0, 0], base);
      put('box', 'glass', st.glass, [wx, y0 + 2.1, zc + 1.45], [1.15, .72, .05], [0, 0, 0], base); }
    put('box', 'matte', '#8F887A', [0, y0 + 1.5, zc + 1.43], [.85, 1.9, .06], [0, 0, 0], base);
    for (const sz of [-1, 1]) put('cyl', 'matte', '#2A2A2A', [.6, y0 + .35, zc + sz * 1.45], [.75, .3, .75], [Math.PI / 2, 0, 0], base);
    for (const sx of [-3.6, 3.6]) put('box', 'matte', '#9A9A96', [sx, y0 + .27, zc], [.5, .55, 2.2], [0, 0, 0], base);
    put('box', 'matte', stripe, [0, y0 + 2.75, zc + 2.6], [3.4, .08, 2.4], [-.18, 0, 0], base);
    for (const sx of [-1.6, 1.6]) put('cyl', 'matte', '#CFCFCF', [sx, y0 + 1.3, zc + 3.7], [.07, 2.6, .07], [0, 0, 0], base);
    put('box', 'matte', '#FFFFFF', [-.6, y0 + .45, zc + 3.4], [.55, .9, .55], [0, 0, 0], base);
    put('cyl', 'matte', '#A4512F', [3.2, y0 + .55, 3.5], [.8, 1.1, .8], [0, 0, 0], base);
    for (let k = 0; k < 3; k++) put('ico', 'flat', '#9AA85A', [-3.8 + k * 1.1, y0 + .4, 5.6 + r()], [1, .8, 1], [k, k, 0], base);
    for (let k = 0; k < 8; k++) { if (r() < .3) continue; put('box', 'matte', '#8B7D68', [-curLW / 2 + .6 + k * (curLW - 1.2) / 7, y0 + .55, curLD / 2 - .6], [.14, 1.1, .1], [0, 0, (r() - .5) * .5], base); }
  }
  function shack(base, r) {
    const y0 = .5, zc = -1.8, wall = pick(r, ['#C9B79C', '#B7C2C9', '#D3C29A', '#C4A79A', '#B9BFA0']), roofC = pick(r, ['#8C5A3C', '#8E9294', '#9C6B48', '#7E8A8C']);
    put('box', 'matte', wall, [0, y0 + 1.3, zc], [5.2, 2.6, 4.4], [0, 0, 0], base);
    put('box', TX('roof', 'flat'), roofC, [0, y0 + 2.95, zc], [6, .16, 5.4], [.2, 0, 0], base);
    put('box', 'matte', new THREE.Color(wall).multiplyScalar(.75), [1.3, y0 + 1.6, zc + 2.21], [1.4, 1.1, .05], [0, 0, .12], base);
    put('box', 'matte', '#FFFFFF', [-1.4, y0 + 1.6, zc + 2.21], [1.1, 1, .06], [0, 0, 0], base);
    put('box', 'glass', st.glass, [-1.4, y0 + 1.6, zc + 2.24], [.85, .75, .05], [0, 0, 0], base);
    put('box', 'matte', '#7A5A3C', [-1.4, y0 + 1.6, zc + 2.27], [.95, .1, .04], [0, 0, .7], base);
    put('box', 'matte', '#7A6A58', [.5, y0 + 1.05, zc + 2.22], [.95, 2.0, .06], [0, 0, 0], base);
    put('cyl', 'matte', '#8E9294', [1.8, y0 + 3.4, zc - 1], [.28, 1.6, .28], [0, 0, 0], base);
    put('box', 'matte', '#9C8466', [3.8, y0 + 1, -5], [1.4, 2, 1.4], [0, 0, 0], base);
    put('cyl', 'matte', '#A4512F', [-3.6, y0 + .55, 3.2], [.8, 1.1, .8], [0, 0, 0], base);
    put('cyl', 'matte', '#6B4E33', [3.4, y0 + 1.2, 4], [.3, 2.4, .3], [0, 0, .1], base);
    put('ico', 'flat', '#8FA052', [3.5, y0 + 2.8, 4], [2, 1.6, 2], [1, 2, 0], base);
    for (let k = 0; k < 8; k++) { if (r() < .35) continue; put('box', 'matte', '#8B7D68', [-curLW / 2 + .6 + k * (curLW - 1.2) / 7, y0 + .55, curLD / 2 - .6], [.14, 1.1, .1], [0, 0, (r() - .5) * .5], base); }
  }
  function house(base, seed, dist) {
    const r = rng(seed);
    if (st.mix) {
      const t = chooseType(r, dist, house.prev); house.prev = t;
      const ring = Math.min(dist, 7); (stats[ring] ||= { types: {}, n: 0, run: 0, maxRun: 0, last: null });
      const S = stats[ring]; S.n++; S.types[t] = (S.types[t] || 0) + 1;
      S.run = S.last === t ? S.run + 1 : 1; S.maxRun = Math.max(S.maxRun, S.run); S.last = t;
      buildType(t, base, r, dist);
      return;
    }
    if (st.tiers) {
      if (dist <= 1) modernVilla(base, r, dist, false);
      else if (dist <= 3) modernVilla(base, r, dist, true);
      else if (dist <= 5) classicHouse(base, r);
      else if (st.mixed ? r() < .5 : st.trailer) trailer(base, r); else shack(base, r);
      return;
    }
    if (st.houses === 'classic') classicHouse(base, r); else modernVilla(base, r, dist);
  }
  function classicHouse(base, r, o = {}) {
    const sc = o.sc || 1, wing = !!o.wing;
    const w = Math.min((6.4 + r() * 1.8) * sc, wing ? 6.2 : 9.4, curLW - 1.6), d = Math.min((6.4 + r() * 1.8) * sc, 9.4, curLD - 4.2);
    const fl0 = o.fl || (r() < .6 ? 2 : 1), fl = fl0 === 2 && st.rich && r() < .22 && !force ? 3 : fl0, fh = 2.9, h = fl * fh, y0 = .5, zc = Math.min(-1.5, -curLD / 2 + 1.3 + d / 2);
    let wall = pick(r, st.walls), roof = pick(r, st.houses === 'modern' || st.tiers ? st.roofTop : st.roofs);
    if (force) { wall = force.wall; roof = force.roof; }
    const roofType = o.roof || (r() < .35 ? 'hip' : 'gable');
    put('box', TX('siding', 'matte'), wall, [0, y0 + h / 2, zc], [w, h, d], [0, 0, 0], base);
    const rh = 1.8 + r() * 2.2;
    if (roofType === 'hip') put('hip', TX('roof', 'flat'), roof, [0, y0 + h + rh / 2, zc], [w + .9, rh, d + .9], [0, 0, 0], base);
    else if (roofType === 'gable') put('gable', TX('roof', 'flat'), roof, [0, y0 + h + rh / 2, zc], [d + .9, rh, w + .9], [0, Math.PI / 2, 0], base);
    else { // tetto piatto con parapetto bianco, come la casa rosa/arancio del suo video
      put('box', 'matte', '#FFFFFF', [0, y0 + h + .25, zc], [w + .3, .5, d + .3], [0, 0, 0], base);
      put('box', TX('roof', 'flat'), roof, [0, y0 + h + .33, zc], [w - .1, .1, d - .1], [0, 0, 0], base);
    }
    if (wing) { // ala laterale: casa a L
      const w2 = 3.4, d2 = d * .62, side = r() < .5 ? -1 : 1, x2 = side * (w / 2 + w2 / 2 - .05), z2 = zc + d / 2 - d2 / 2;
      put('box', TX('siding', 'matte'), wall, [x2, y0 + fh / 2, z2], [w2, fh, d2], [0, 0, 0], base);
      put('gable', TX('roof', 'flat'), roof, [x2, y0 + fh + 1.0, z2], [w2 + .7, 2.0, d2 + .7], [0, 0, 0], base);
      put('box', 'matte', st.frame, [x2, y0 + 1.6, z2 + d2 / 2 + .05], [1.25, 1.45, .12], [0, 0, 0], base);
      put('box', 'glass', st.glass, [x2, y0 + 1.6, z2 + d2 / 2 + .1], [.95, 1.15, .1], [0, 0, 0], base);
    }
    put('box', 'matte', '#FFFFFF', [0, y0 + h + .05, zc], [w + .3, .18, d + .3], [0, 0, 0], base);
    if (st.rich) {
      if (roofType !== 'flat') put('box', 'matte', new THREE.Color(roof).multiplyScalar(.62), [0, y0 + h + .2, zc], [w + 1.0, .22, d + 1.0], [0, 0, 0], base);
      for (let f = 1; f < fl; f++) put('box', 'matte', '#FFFFFF', [0, y0 + f * fh, zc], [w + .14, .24, d + .14], [0, 0, 0], base);
      put('box', 'matte', new THREE.Color(wall).multiplyScalar(.8), [0, y0 + .18, zc], [w + .12, .36, d + .12], [0, 0, 0], base);
      for (const sx of [-1, 1]) put('box', 'matte', '#FFFFFF', [sx * w / 2, y0 + h / 2, zc + d / 2], [.22, h, .22], [0, 0, 0], base);
    }
    const zf = zc + d / 2;
    const cols = w > 7.6 ? 3 : 2;
    for (let f = 0; f < fl; f++) for (let k = 0; k < cols; k++) {
      const x = -w / 2 + w * (k + .5) / cols, y = y0 + f * fh + 1.65;
      if (f === 0 && k === Math.floor(cols / 2)) continue;
      if (st.rich) { put('box', 'matte', '#F4F1EA', [x, y, zf + .03], [1.38, 1.62, .08], [0, 0, 0], base);
        put('plane', 'win', '#FFFFFF', [x, y, zf + .075], [1.18, 1.42, 1], [0, 0, 0], base);
        put('box', 'matte', '#F4F1EA', [x, y - .82, zf + .14], [1.55, .13, .26], [0, 0, 0], base);
        put('box', 'matte', '#F4F1EA', [x, y + .78, zf + .08], [1.45, .1, .14], [0, 0, 0], base); }
      else { put('box', 'matte', st.frame, [x, y, zf + .05], [1.25, 1.45, .12], [0, 0, 0], base);
        put('box', 'glass', st.glass, [x, y, zf + .1], [.95, 1.15, .1], [0, 0, 0], base);
        put('box', 'matte', st.frame, [x, y, zf + .16], [.08, 1.15, .06], [0, 0, 0], base); }
    }
    for (const sx of [-1, 1]) for (let f = 0; f < fl; f++) {
      if (st.rich) { for (const oz of (d > 7 ? [-1.4, 1.4] : [0])) {
        put('box', 'matte', '#F4F1EA', [sx * (w / 2 + .02), y0 + f * fh + 1.65, zc + oz], [.08, 1.62, 1.38], [0, 0, 0], base);
        put('plane', 'win', '#FFFFFF', [sx * (w / 2 + .07), y0 + f * fh + 1.65, zc + oz], [1.18, 1.42, 1], [0, sx * Math.PI / 2, 0], base);
        put('box', 'matte', '#F4F1EA', [sx * (w / 2 + .12), y0 + f * fh + .83, zc + oz], [.26, .13, 1.55], [0, 0, 0], base); } }
      else { put('box', 'matte', st.frame, [sx * (w / 2 + .05), y0 + f * fh + 1.65, zc], [.12, 1.45, 1.25], [0, 0, 0], base);
        put('box', 'glass', st.glass, [sx * (w / 2 + .1), y0 + f * fh + 1.65, zc], [.1, 1.15, .95], [0, 0, 0], base); }
    }
    const dx = cols === 3 ? 0 : (w / 4) * (r() < .5 ? -1 : 1) * 0;
    const doorC = pick(r, st.doors);
    put('box', 'matte', doorC, [dx, y0 + 1.1, zf + .06], [1.1, 2.2, .14], [0, 0, 0], base);
    if (st.rich) { put('sph', 'matte', '#E2B544', [dx + .35, y0 + 1.1, zf + .15], [.14, .14, .14], [0, 0, 0], base); put('box', 'glass', st.glass, [dx, y0 + 1.75, zf + .14], [.55, .5, .04], [0, 0, 0], base);
      put('box', 'matte', '#FFFFFF', [dx, y0 + 1.2, zf + .03], [1.4, 2.45, .1], [0, 0, 0], base);
      put('box', 'matte', '#D9D4C8', [dx, y0 + .08, zf + .45], [1.8, .16, .8], [0, 0, 0], base); }
    put('box', 'matte', roof, [dx, y0 + 2.45, zf + .6], [1.9, .16, 1.2], [0, 0, 0], base);
    put('box', 'matte', '#E9E4DA', [dx, y0 + .06, zf + 3.3], [1.4, .1, 6.4], [0, 0, 0], base);
    const hasCh = r() < .38; if (roofType !== 'flat' && (hasCh || force)) { const chx = w * .24, chz = zc + d * .2; put('box', 'matte', '#8E7C6C', [chx, y0 + h + rh * .55 + .6, chz], [1.05, rh * 1.1 + 1.2, 1.05], [0, 0, 0], base);
      put('box', 'matte', '#6E6055', [chx, y0 + h + rh * 1.1 + 1.25, chz], [1.3, .22, 1.3], [0, 0, 0], base); }
    if (r() < .55) {
      put('box', 'flat', pick(r, st.tree), [-3.1, y0 + .45, curLD / 2 - .9], [3.6, .9, .8], [0, 0, 0], base);
      put('box', 'flat', pick(r, st.tree), [3.1, y0 + .45, curLD / 2 - .9], [3.6, .9, .8], [0, 0, 0], base);
    }
    if (st.rich && r() < .6) pine((r() < .5 ? -1 : 1) * (2.6 + r()), 4.6, .8 + r() * .3, base); else
    tree((r() < .5 ? -1 : 1) * (2.6 + r()), 4.4, .75 + r() * .3, base);
    if (st.details) {
      for (let k = 0; k < 7; k++) { const fx = -w / 2 + .4 + k * (w - .8) / 6; if (Math.abs(fx - dx) < .9) continue;
        put('ico', 'flat', '#2FA84F', [fx, y0 + .35, zf + .55], [.7, .6, .7], [k, k, 0], base);
        put('ico', 'flat', pick(r, st.flowers), [fx, y0 + .62, zf + .55], [.32, .3, .32], [k, 0, k], base); }
      if (r() < .75) { for (let k = 0; k < 14; k++) { const fx = -curLW / 2 + .6 + k * (curLW - 1.2) / 13; if (Math.abs(fx - dx) < 1) continue;
          put('box', 'matte', '#FFFFFF', [fx, y0 + .45, curLD / 2 - .7], [.14, .9, .1], [0, 0, 0], base); }
        put('box', 'matte', '#FFFFFF', [-2.9, y0 + .6, curLD / 2 - .7], [4.6, .12, .08], [0, 0, 0], base);
        put('box', 'matte', '#FFFFFF', [2.9, y0 + .6, curLD / 2 - .7], [4.6, .12, .08], [0, 0, 0], base); }
      put('box', 'matte', '#E63946', [dx + 1.3, y0 + .75, curLD / 2 - 1.2], [.35, .3, .5], [0, 0, 0], base);
      for (const sx of [-1, 1]) put('ico', 'flat', pick(r, ['#3FA34D', '#4DB35A', '#2E8F45']), [sx * (w / 2 + .3), y0 + .55, zf + .2], [1.5, 1.2, 1.5], [sx, 1, 0], base);
      if (r() < .7) tree((r() - .5) * 6, -curLD / 2 + 1.6, .7 + r() * .25, base);
      put('cyl', 'matte', '#FFFFFF', [dx + 1.3, y0 + .3, curLD / 2 - 1.2], [.1, .6, .1], [0, 0, 0], base);
    }
  }
  function modernVilla(base, r, dist, small = false) {
    const y0 = .5, w1 = Math.min(small ? 6.2 + r() * 1.2 : 8.4 + r() * 1.4, curLW - 1.4), d1 = Math.min(small ? 5.8 + r() : 7 + r() * 1.4, curLD - 5.5), h1 = small ? 3 : 3.4, zc = -curLD / 2 + 1.1 + d1 / 2;
    const wall = pick(r, st.walls);
    const hasUp = r() < (small ? .35 : .85);
    const roofC = pick(r, st.roofTop);
    put('box', 'matte', wall, [0, y0 + h1 / 2, zc], [w1, h1, d1], [0, 0, 0], base);
    put('box', 'matte', st.roofs[0], [0, y0 + h1 + .12, zc], [w1 + .5, .24, d1 + .5], [0, 0, 0], base);
    { const rt0 = st.sameWall ? roofC : pick(r, st.roofTop); if (st.pitched && hasUp) put('box', 'matte', '#FFFFFF', [0, y0 + h1 + .3, zc], [w1 - .4, .06, d1 - .4], [0, 0, 0], base); else if (st.pitched) put('hip', TX('roof', 'flat'), rt0, [0, y0 + h1 + .24 + .7, zc], [w1 + .9, 1.4, d1 + .9], [0, 0, 0], base); else put('box', 'flat', rt0, [0, y0 + h1 + .3, zc], [w1 - .4, .06, d1 - .4], [0, 0, 0], base); }
    const zf1 = zc + d1 / 2;
    const gw = w1 * .58, side = r() < .5 ? -1 : 1;
    put('box', 'glass', st.glass, [side * (w1 / 2 - gw / 2 - .3), y0 + h1 / 2 - .1, zf1 + .05], [gw, h1 - .6, .1], [0, 0, 0], base);
    for (let k = 0; k <= 3; k++) put('box', 'matte', st.frame, [side * (w1 / 2 - .3) - side * gw * k / 3, y0 + h1 / 2 - .1, zf1 + .1], [.07, h1 - .6, .06], [0, 0, 0], base);
    put('box', 'matte', st.doors[0], [-side * (w1 / 2 - 1.3), y0 + 1.3, zf1 + .06], [1.2, 2.6, .14], [0, 0, 0], base);
    for (const sx of [-1, 1]) put('box', 'glass', st.glass, [sx * (w1 / 2 + .04), y0 + h1 / 2, zc + .5], [.1, h1 - .9, d1 * .5], [0, 0, 0], base);
    if (hasUp) {
      const w2 = w1 * (.55 + r() * .25), d2 = d1 * (.75 + r() * .3), h2 = 3.1;
      const ox = (r() - .5) * (w1 - w2), oz = r() * 1.6 - .2;
      const up = st.sameWall ? wall : pick(r, st.uppers);
      const y2 = y0 + h1 + .24;
      put('box', 'matte', up, [ox, y2 + h2 / 2, zc + oz], [w2, h2, d2], [0, 0, 0], base);
      put('box', 'matte', st.roofs[0], [ox, y2 + h2 + .12, zc + oz], [w2 + .5, .24, d2 + .5], [0, 0, 0], base);
      { const rt = st.sameWall ? roofC : pick(r, st.roofTop); if (st.pitched) put('hip', TX('roof', 'flat'), rt, [ox, y2 + h2 + .24 + .8, zc + oz], [w2 + .9, 1.6, d2 + .9], [0, 0, 0], base); else put('box', 'flat', rt, [ox, y2 + h2 + .31, zc + oz], [w2 - .4, .08, d2 - .4], [0, 0, 0], base);
        if (r() < .3) put('box', 'pool', st.pool, [ox + w2 * .15, y2 + h2 + .4, zc + oz], [w2 * .45, .06, d2 * .4], [0, 0, 0], base); }
      put('box', 'glass', st.glass, [ox, y2 + h2 / 2, zc + oz + d2 / 2 + .05], [w2 * .78, h2 - .5, .1], [0, 0, 0], base);
      for (let k = 0; k <= 4; k++) put('box', 'matte', st.frame, [ox - w2 * .39 + w2 * .78 * k / 4, y2 + h2 / 2, zc + oz + d2 / 2 + .1], [.06, h2 - .5, .06], [0, 0, 0], base);
      // ringhiera vetro terrazza
      put('box', 'glass', st.glass, [-ox * .2, y0 + h1 + .7, zf1 + .2], [w1 * .9, .9, .06], [0, 0, 0], base);
      if (r() < .4) put('box', 'matte', st.terracotta, [ox, y2 + h2 + .5, zc + oz], [w2 * .4, .8, d2 * .4], [0, 0, 0], base);
    }
    // giardino davanti: piscina, deck, palme, muretto
    const px = (r() - .5) * 2.6, pw = small ? 3.2 + r() : 4.6 + r() * 1.4;
    const hasPool = !small || r() < .45;
    if (hasPool) {
    put('box', 'matte', st.deck, [px, y0 + .05, 3.6], [pw + 1.6, .12, 3.6], [0, 0, 0], base);
    put('box', 'pool', st.pool, [px, y0 + .13, 3.6], [pw, .06, 2.2], [0, 0, 0], base);
    for (let k = 0; k < 2; k++) put('box', 'matte', '#FFFFFF', [px - pw / 2 + 1 + k * 1.1, y0 + .3, 1.9], [.7, .3, 1.6], [0, 0, 0], base);
    }
    if (!small && r() < .55) {
      const ux = px + pw / 2 + .2;
      put('cyl', 'matte', '#FFFFFF', [ux, y0 + 1.2, 2.2], [.08, 2.3, .08], [0, 0, 0], base);
      put('cone', 'flat', pick(r, st.umbrella), [ux, y0 + 2.4, 2.2], [2.6, .6, 2.6], [0, 0, 0], base);
    }
    put('box', 'matte', wall, [-3.4, y0 + .5, curLD / 2 - .5], [3.6, 1, .3], [0, 0, 0], base);
    put('box', 'matte', wall, [3.4, y0 + .5, curLD / 2 - .5], [3.6, 1, .3], [0, 0, 0], base);
    put('box', 'matte', st.deck, [0, y0 + .04, 5.5], [1.6, .08, 3.8], [0, 0, 0], base);
    const np = small ? (r() < .5 ? 1 : 0) : 1 + Math.floor(r() * 2);
    if (small && np === 0) tree(3.6, 5, .7, base);
    for (let k = 0; k < np; k++) palm((k ? -1 : 1) * (4.3 - r() * .5), 5.6 - r() * 1.5, .75 + r() * .3, base);
    if (r() < .5) tree(-side * 3.8, -6.8, .7, base);
  }

  // Omnya City sito (Nico 5/11): in downtown le ville enormi prendono due lotti, e alcune hanno la supercar fuori
  function sportsCar(base, x, z, yaw, color) {
    const y = .5, R = [0, yaw, 0];
    const at = (lx, ly, lz) => { const c = Math.cos(yaw), s = Math.sin(yaw); return [x + lx * c + lz * s, ly, z - lx * s + lz * c]; };
    put('box', 'matte', color, at(0, y + .42, 0), [1.95, .46, 4.5], R, base);               // corpo basso
    put('box', 'matte', color, at(0, y + .7, -.25), [1.7, .22, 2.2], R, base);              // fianchi alti
    put('box', 'glass', '#1B2430', at(0, y + .92, -.35), [1.5, .34, 1.7], R, base);         // abitacolo
    put('box', 'matte', color, at(0, y + 1.1, -.45), [1.3, .06, 1.1], R, base);             // tetto
    put('box', 'matte', '#111111', at(0, y + .78, -2.05), [1.9, .08, .35], R, base);         // spoiler
    put('box', 'matte', '#FFF6D6', at(-.68, y + .48, 2.26), [.42, .1, .04], R, base);         // fari
    put('box', 'matte', '#FFF6D6', at(.68, y + .48, 2.26), [.42, .1, .04], R, base);
    for (const sx of [-1, 1]) for (const sz of [-1.45, 1.45]) put('cyl', 'matte', '#151515', at(sx * .92, y + .34, sz), [.68, .26, .68], [0, yaw, Math.PI / 2], base, 'YXZ');
  }
  function megaVilla(base, r) {
    const y0 = .5, W = curLW, D = curLD;
    put('box', TX('grass', 'matte'), pick(r, st.lawn), [0, .42, 0], [W - .8, .2, D - .8], [0, 0, 0], base); // un solo prato sui due lotti
    const w1 = W - 5.5, d1 = Math.min(9.5, D - 6), h1 = 3.8, zc = -D / 2 + 1.2 + d1 / 2;
    const wall = pick(r, ['#FFFFFF', '#F4EEE2', '#EFE6D6', '#FFFFFF']);
    const trim = pick(r, st.roofTop);
    // piano terra lungo, tutto vetro sul fronte
    put('box', 'matte', wall, [0, y0 + h1 / 2, zc], [w1, h1, d1], [0, 0, 0], base);
    put('box', 'matte', '#FFFFFF', [0, y0 + h1 + .15, zc], [w1 + .8, .3, d1 + .8], [0, 0, 0], base);
    const zf = zc + d1 / 2;
    put('box', 'glass', st.glass, [-w1 * .12, y0 + h1 / 2 - .1, zf + .05], [w1 * .66, h1 - .7, .1], [0, 0, 0], base);
    for (let k = 0; k <= 6; k++) put('box', 'matte', '#2A2724', [-w1 * .45 + w1 * .66 * k / 6, y0 + h1 / 2 - .1, zf + .1], [.07, h1 - .7, .06], [0, 0, 0], base);
    put('box', 'matte', '#5A3A24', [w1 * .36, y0 + 1.6, zf + .07], [1.8, 3.2, .14], [0, 0, 0], base); // portone
    // primo piano a sbalzo, sfalsato
    const w2 = w1 * .62, d2 = d1 * .9, h2 = 3.4, ox = (r() < .5 ? -1 : 1) * w1 * .16, oz = 1.4, y2 = y0 + h1 + .3;
    put('box', 'matte', wall, [ox, y2 + h2 / 2, zc + oz], [w2, h2, d2], [0, 0, 0], base);
    put('box', 'matte', trim, [ox, y2 + h2 + .14, zc + oz], [w2 + .7, .28, d2 + .7], [0, 0, 0], base);
    put('box', 'glass', st.glass, [ox, y2 + h2 / 2, zc + oz + d2 / 2 + .05], [w2 * .86, h2 - .6, .1], [0, 0, 0], base);
    for (let k = 0; k <= 5; k++) put('box', 'matte', '#2A2724', [ox - w2 * .43 + w2 * .86 * k / 5, y2 + h2 / 2, zc + oz + d2 / 2 + .1], [.06, h2 - .6, .06], [0, 0, 0], base);
    put('box', 'glass', st.glass, [0, y0 + h1 + .8, zf + .25], [w1 * .94, 1, .06], [0, 0, 0], base); // ringhiera terrazza
    // terrazza sul tetto con piccola piscina e pergola
    put('box', 'pool', st.pool, [ox - w2 * .18, y2 + h2 + .36, zc + oz], [w2 * .42, .06, d2 * .38], [0, 0, 0], base);
    for (const sx of [-1, 1]) put('box', 'matte', '#FFFFFF', [ox + w2 * .25 + sx * 1.2, y2 + h2 + 1.3, zc + oz], [.15, 2, .15], [0, 0, 0], base);
    put('box', 'matte', '#C9B38C', [ox + w2 * .25, y2 + h2 + 2.35, zc + oz], [3, .12, 2.4], [0, 0, 0], base);
    // giardino: piscina lunga, deck, lettini, ombrelloni, palme
    const pw = w1 * .58, pz = zf + 3.3, px = -w1 * .1;
    put('box', 'matte', st.deck, [px, y0 + .05, pz], [pw + 2.4, .12, 4.6], [0, 0, 0], base);
    put('box', 'pool', st.pool, [px, y0 + .13, pz], [pw, .06, 2.8], [0, 0, 0], base);
    for (let k = 0; k < 4; k++) put('box', 'matte', '#FFFFFF', [px - pw / 2 + 1 + k * 1.3, y0 + .3, pz - 2.1], [.75, .3, 1.7], [0, 0, 0], base);
    for (const sx of [-1, 1]) {
      const ux = px + sx * (pw / 2 + .6);
      put('cyl', 'matte', '#FFFFFF', [ux, y0 + 1.3, pz - 1.6], [.09, 2.5, .09], [0, 0, 0], base);
      put('cone', 'flat', pick(r, st.umbrella), [ux, y0 + 2.6, pz - 1.6], [2.8, .6, 2.8], [0, 0, 0], base);
    }
    for (const sx of [-1, 1]) palm(sx * (W / 2 - 1.6), D / 2 - 2.2, .95 + r() * .2, base);
    palm(-W / 2 + 1.8, zc - 1, .9, base);
    // muro di cinta con cancello e vialetto per l'auto
    const gx = w1 * .36;
    { const a = -W / 2 + .6, b = gx - 1.9, c = gx + 1.9, e = W / 2 - .6;
      put('box', 'matte', wall, [(a + b) / 2, y0 + .55, D / 2 - .5], [b - a, 1.1, .3], [0, 0, 0], base);
      if (e > c) put('box', 'matte', wall, [(c + e) / 2, y0 + .55, D / 2 - .5], [e - c, 1.1, .3], [0, 0, 0], base); }
    put('box', 'matte', '#3A3A3A', [gx, y0 + .04, D / 2 - 2.6], [3, .08, 4.6], [0, 0, 0], base);
    put('box', 'matte', '#2A2724', [gx + 1.8, y0 + .8, D / 2 - .5], [.25, 1.6, .25], [0, 0, 0], base);
    // la supercar fuori, non su tutte: rossa, gialla, a volte nera o bianca
    if (r() < .62) {
      const cr = r(), col = cr < .5 ? '#D3141B' : cr < .88 ? '#F5B800' : cr < .95 ? '#16181C' : '#F2F2F0';
      sportsCar(base, gx, D / 2 - 2.6, (r() - .5) * .12, col);
    }
  }

  // ---- Ep.2 (6/11/2026): the city grows. The Hills (new lots, LA style), the river, the Marina, the Omnya Tower,
  // and the old city gets boulevards, cars and a livelier plaza. Everything here uses its own random stream
  // and only adds things around the lots: the old lots and the claimed houses never move or change.
  function districts() {
    const D = opts.districts || {};
    const Rd = rng(hashStr('omnya-city-ep2'));
    const lite = !!opts.lite; // phones: same places, fewer small things
    const lampAt = (x, y, z, base = null) => { if (lite) return; put('cyl', 'matte', '#3A3530', [x, y + 2.2, z], [.16, 4.4, .16], [0, 0, 0], base); put('sph', 'lamp', '#FFE2A8', [x, y + 4.5, z], [.6, .6, .6], [0, 0, 0], base); };
    const CARS = ['#F2F2F0', '#16181C', '#B9BEC4', '#D3141B', '#1F4E8C', '#C9B48A', '#F2F2F0', '#2E3B33'];
    // ---------- old city: boulevards on the two main axes, parked and driving cars, people around the fountain
    if (D.refresh) {
      const xb = colW[0] / 2 + ROAD / 2, zb = rowD[0] / 2 + RZ / 2;
      for (const sx of [-1, 1]) for (let j = -NBZ; j <= NBZ; j++) { if (!inCity(0, j) && !inCity(1, j)) continue; const zc = rowZ[j], L = rowD[j] - 4;
        put('box', 'flat', '#7DBE5A', [sx * xb, .12, zc], [1.6, .24, L]); for (let z = zc - L / 2 + 3; z < zc + L / 2 - 2; z += 7) tree(sx * xb, z, .55); }
      for (const sz of [-1, 1]) for (let i = -NBX; i <= NBX; i++) { if (!inCity(i, 0) && !inCity(i, 1)) continue; const xc = colX[i], L = colW[i] - 4;
        put('box', 'flat', '#7DBE5A', [xc, .12, sz * zb], [L, .24, 1.6]); for (let x = xc - L / 2 + 3; x < xc + L / 2 - 2; x += 7) tree(x, sz * zb, .55); }
      for (let i = -NBX; i <= NBX; i++) for (let j = -NBZ; j <= NBZ; j++) {
        if (!inCity(i, j)) continue; const b = block(i, j);
        if (inCity(i, j - 1) && Rd() < .55) { const z0 = b.z - b.d / 2 - RZ / 2, s = Rd() < .5 ? 1 : -1; car(b.x + (Rd() - .5) * (b.w - 6), z0 + s * 2.6, s > 0 ? Math.PI / 2 : -Math.PI / 2, pick(Rd, CARS)); }
        if (inCity(i - 1, j) && Rd() < .45) { const x0 = b.x - b.w / 2 - ROAD / 2, s = Rd() < .5 ? 1 : -1; car(x0 + s * 2.6, b.z + (Rd() - .5) * (b.d - 6), s > 0 ? Math.PI : 0, pick(Rd, CARS)); }
      }
      // the plaza: café tables under umbrellas and people as tiny traces
      for (const [x, z] of [[-9, -3.6], [9, -3.6], [-9, 3.6], [9, 3.6], [-13, 0], [13, 0]]) { put('cyl', 'matte', '#FFFFFF', [x, 1.5, z], [.08, 2, .08]); put('cone', 'flat', pick(Rd, ['#E0402E', '#FFFFFF', '#2C5A9E', '#FFD21F']), [x, 2.6, z], [2.6, .5, 2.6]);
        put('cyl', 'matte', '#FFFFFF', [x, .9, z], [1, .08, 1]); }
      for (let k = 0; k < 46; k++) { const a = Rd() * Math.PI * 2, rr = 6 + Rd() * 14; person(Math.cos(a) * rr * 1.2, .5, Math.sin(a) * rr * .7); }
    }
    // ---------- the river: from the hills down the west side of the city to the sea, with bridges
    if (D.river) {
      let px = riverX(-1100), pz = -1100;
      for (let z = -1090; z <= seaZ + 10; z += 9) { const x = riverX(z), a = Math.atan2(x - px, z - pz), l = Math.hypot(x - px, z - pz) + 1.2, wd = 22 + 10 * Math.max(0, (z - 100) / (seaZ - 100));
        put('box', 'flat', '#E8D6A6', [(x + px) / 2, .03, (z + pz) / 2], [wd + 12, .1, l], [0, a, 0], null, 'XYZ', true);
        put('box', 'water', st.sea, [(x + px) / 2, .08, (z + pz) / 2], [wd, .1, l], [0, a, 0], null, 'XYZ', true);
        if (Rd() < .55) { const s = Rd() < .5 ? 1 : -1; if (!lite || Rd() < .4) tree(x + s * (wd / 2 + 8 + Rd() * 6), z + (Rd() - .5) * 6, .7 + Rd() * .5); }
        px = x; pz = z; }
      const zr = rowZ[0] + rowD[0] / 2 + RZ / 2;
      for (const [z, road] of [[zr, true], [-260, false], [190, false]]) bridge(riverX(z), z, road);
    }
    // ---------- the Marina and the beach club
    if (D.marina) {
      const zb = seaZ, x0 = -300, x1 = 230, zw = zb + 120;
      put('box', TX('paving', 'matte'), '#EFE4CC', [(x0 + x1) / 2, .2, zb - 26], [x1 - x0 + 40, .4, 16]);
      for (let x = x0 + 6; x < x1; x += 14) { palm(x, zb - 31, 1.3); lampAt(x + 7, .4, zb - 20); if (Rd() < .5) person(x + Rd() * 10, .6, zb - 24 + Rd() * 6); }
      put('box', 'flat', '#D8CDB6', [x0, .9, (zb + zw) / 2], [9, 1.8, zw - zb], [0, 0, 0], null, 'XYZ', true);
      put('box', 'flat', '#D8CDB6', [(x0 + x1 - 70) / 2, .9, zw], [x1 - 70 - x0, 1.8, 9], [0, 0, 0], null, 'XYZ', true);
      { const lx = x1 - 70, lz = zw; put('cyl', 'matte', '#FFFFFF', [lx, 9, lz], [4, 16, 4]); put('cyl', 'matte', '#D9483B', [lx, 6, lz], [4.1, 3, 4.1]); put('cyl', 'matte', '#D9483B', [lx, 13, lz], [4.1, 3, 4.1]);
        put('cyl', 'lamp', '#FFF3C4', [lx, 18.2, lz], [2.6, 2.4, 2.6]); put('cone', 'matte', '#D9483B', [lx, 20.6, lz], [3.6, 2.4, 3.6]); }
      for (let p = 0; p < 5; p++) { const px = x0 + 50 + p * 92;
        put('box', 'matte', '#C79B6B', [px, .7, zb + 38], [4, .3, 76], [0, 0, 0], null, 'XYZ', true);
        for (let b = 0; b < 5; b++) for (const s of [-1, 1]) { if (Rd() < .2) continue; const big = Rd() < .35 ? 2.2 : 1.6; boat(px + s * (4 + 2 * big), zb + 8 + b * 15, s > 0 ? 0 : Math.PI, big); } }
      for (let b = 0; b < (lite ? 0 : 12); b++) sail(-700 + Rd() * 1500, zw + 50 + Rd() * 360, Rd() * 6, 1.8);
      for (let u = 0; u < 44; u++) { const ux = x1 + 30 + (u % 22) * 13, uz = zb - 13 + Math.floor(u / 22) * 10;
        put('cyl', 'matte', '#FFFFFF', [ux, 1.2, uz], [.1, 2.4, .1]); put('cone', 'flat', pick(Rd, ['#E0402E', '#FFD21F', '#2C5A9E', '#FFFFFF', '#FF8DB0']), [ux, 2.5, uz], [3.6, .7, 3.6]);
        put('box', 'matte', '#FFFFFF', [ux + 1.6, .35, uz], [.8, .3, 1.8]); if (Rd() < .3) person(ux - 1.5, .1, uz + 1); }
    }
    // ---------- THE HILLS: round terraces with winding palm roads, villas looking at the ocean, OMNYA on top
    if (D.hills) {
      const H = HILL;
      for (let k = 0; k <= H.rows; k++) {
        const r = H.r0 - k * H.dr, h = H.h0 + k * H.dh;
        put(k ? 'disc' : 'terr', 'flat', k % 2 ? '#C9B994' : '#D4C4A0', [H.cx, h / 2, H.cz], [r * 2, h, r * 2], [0, 0, 0], null, 'XYZ', k > 0); // stone retaining walls, so no slope covers the terrace below
        if (k < H.rows) {
          put('disc', TX('asphalt', 'matte'), '#55575C', [H.cx, h + .04, H.cz], [r * 2 - .6, .1, r * 2 - .6]);
          put('disc', TX('grass', 'matte'), '#8CC460', [H.cx, h + .09, H.cz], [(r - 5.2) * 2, .1, (r - 5.2) * 2]);
          const n = Math.floor(r * Math.PI * 2 / 15);
          for (let p = 0; p < n; p++) { const a = p / n * Math.PI * 2; if (lite && p % 3) continue; palm(H.cx + Math.sin(a) * (r - .6), H.cz + Math.cos(a) * (r - .6), 1.45 + ((p * 7) % 5) * .06); if (p % 4 === 0) lampAt(H.cx + Math.sin(a + .02) * (r - 5.6), h, H.cz + Math.cos(a + .02) * (r - 5.6)); }
          // the back of the hill: trees instead of villas
          for (let t = 0; t < r / 6; t++) { const a = Math.PI * (.62 + Rd() * .76) * (Rd() < .5 ? 1 : -1), rr = r - 8 - Rd() * (H.dr - 12); tree(H.cx + Math.sin(a) * rr, H.cz + Math.cos(a) * rr, .8 + Rd() * .5); }
        } else {
          put('disc', TX('grass', 'matte'), '#8CC460', [H.cx, h + .09, H.cz], [r * 2, .1, r * 2]);
          for (let t = 0; t < 26; t++) { const a = Rd() * Math.PI * 2, rr = Rd() * (r - 6); if (Math.cos(a) * rr > 8) continue; put('cone', 'flat', pick(Rd, ['#3F8A50', '#4E8F55', '#2F7A47']), [H.cx + Math.sin(a) * rr, h + 7, H.cz + Math.cos(a) * rr], [6, 14, 6]); }
          sign('OMNYAWOOD', H.cx, h, H.cz + r * .42, 11.5);
        }
      }
      // the road from the city climbs onto the first terrace
      { const zr = rowZ[0] + rowD[0] / 2 + RZ / 2, xh = H.cx - Math.sqrt(H.r0 * H.r0 - (zr - H.cz) ** 2);
        put('box', TX('asphalt', 'matte'), '#55575C', [(ext.x + xh) / 2, -.03, zr], [xh - ext.x + 10, .1, 9]);
        for (let x = ext.x + 8; x < xh - 4; x += 14) for (const s of [-1, 1]) palm(x, zr + s * 6, 1.4); }
    }
    // ---------- the Omnya Tower: already tall, the penthouse lit at the top
    // ---------- THE RESIDENCES, west of the river: towers of 30-40 floors for the new followers, townhouses on the beach
    if (D.residences) {
      const RS = RES, T = RES_T;
      // a warm stone plaza with lawns, a fountain, palms, cafés and people: no bare grass
      put('box', TX('paving', 'matte'), '#EFE4CC', [(RS.x0 + RS.x1) / 2, .1, (RS.z0 + RS.z1) / 2], [RS.x1 - RS.x0, .2, RS.z1 - RS.z0]);
      for (let gx = RS.x0 + 22; gx < RS.x1 - 10; gx += 44) for (let gz = RS.z0 + 20; gz < RS.z1 - 10; gz += 40) {
        if (T.some(([tx, tz]) => Math.abs(gx - tx) < 36 && Math.abs(gz - tz) < 34)) continue;
        put('box', TX('grass', 'matte'), '#8CC460', [gx, .26, gz], [30, .14, 26]);
        if (!lite || (gx + gz) % 3 < 1) { tree(gx - 9, gz - 7, .8); palm(gx + 9, gz + 7, 1.3); }
        if (!lite && Rd() < .5) for (const [cx, cz] of [[-4, 4], [4, -4]]) { put('cyl', 'matte', '#FFFFFF', [gx + cx, 1.4, gz + cz], [.08, 2, .08]); put('cone', 'flat', pick(Rd, ['#E0402E', '#FFD21F', '#2C5A9E', '#FFFFFF']), [gx + cx, 2.5, gz + cz], [2.8, .5, 2.8]); }
      }
      { const fx = (RS.x0 + RS.x1) / 2 - 20, fz = RS.z0 + 110; put('cyl', 'matte', '#F4EEE2', [fx, .5, fz], [22, .6, 22]); put('cyl', 'pool', st.pool, [fx, .82, fz], [20, .1, 20]); put('cyl', 'matte', '#F4EEE2', [fx, 2.4, fz], [1.6, 4, 1.6]); }
      for (const t of T) residence(...t);
      for (let k = 0; k < (lite ? 0 : 40); k++) person(RS.x0 + 10 + Rd() * (RS.x1 - RS.x0 - 20), .2, RS.z0 + 10 + Rd() * (RS.z1 - RS.z0 - 20));
      // the river promenade on the west bank, lined with palms
      for (let z = RS.z0 - 20; z < seaZ - 30; z += lite ? 24 : 12) { const x = riverX(z) - 26; put('box', TX('paving', 'matte'), '#EFE4CC', [x + 4, .12, z], [8, .2, 13]); palm(x, z, 1.35); }
      // boulevard with palms between the towers and the beach
      put('box', TX('asphalt', 'matte'), '#55575C', [(RS.x0 + RS.x1) / 2, -.02, RS.z1 + 6], [RS.x1 - RS.x0, .1, 9]);
      for (let x = RS.x0 + 6; x < RS.x1; x += lite ? 22 : 11) palm(x, RS.z1 + 12, 1.4);
      for (let k = 0; k < 10; k++) car(RS.x0 + 10 + Rd() * (RS.x1 - RS.x0 - 20), RS.z1 + 6 + (Rd() < .5 ? -2.2 : 2.2), Math.PI / 2, pick(Rd, CARS));
      // townhouses on the beach, facing the sea
      const zt = seaZ - 40; let x = RS.x0 + 8, k = 0;
      while (x < RS.x1 - 8) { townhouse(x, zt, k++); x += 8.2; if (k % 8 === 0) x += 10; }
      for (let u = 0; u < (lite ? 12 : 26); u++) { const ux = RS.x0 + 14 + u * (RS.x1 - RS.x0 - 28) / (lite ? 12 : 26), uz = seaZ - 8;
        put('cyl', 'matte', '#FFFFFF', [ux, 1.2, uz], [.1, 2.4, .1]); put('cone', 'flat', pick(Rd, ['#E0402E', '#FFD21F', '#2C5A9E', '#FFFFFF', '#FF8DB0']), [ux, 2.5, uz], [3.6, .7, 3.6]); }
    }
  }
  const Rd0 = rng(hashStr('omnya-towers'));
  function riverX(z) { return -ext.x - 95 + 58 * Math.sin(z / 150 + 1) + 20 * Math.sin(z / 61); }
  function bridge(x, z, road) {
    const w = road ? 10 : 5, len = 46;
    put('box', road ? 'matte' : 'matte', road ? '#55575C' : '#EFE6D6', [x, 1.6, z], [len, .5, w]);
    for (const s of [-1, 1]) put('box', 'matte', '#F4EEE2', [x, 2.3, z + s * w / 2], [len, .9, .35]);
    for (let k = 0; k < 9; k++) { const t = k / 8 - .5, y = 1.4 - 1.2 * (4 * t * t); put('box', 'matte', '#F4EEE2', [x + t * 30, y / 2, z], [3.6, Math.max(.3, y), w - .6]); }
    for (const s of [-1, 1]) put('box', 'matte', road ? '#55575C' : '#EFE6D6', [x + s * (len / 2 + 5), .8, z], [11, .3, w], [0, 0, s * .15]);
  }
  function car(x, z, yaw, color) {
    const b = new THREE.Matrix4().makeRotationY(yaw).setPosition(x, 0, z);
    put('box', 'matte', color, [0, .55, 0], [1.8, .7, 4.2], [0, 0, 0], b, 'XYZ', true);
    put('box', 'glass', '#22303D', [0, 1.1, -.2], [1.6, .5, 2.2], [0, 0, 0], b, 'XYZ', true);
  }
  function person(x, y, z) { if (opts.lite) return; put('sph', 'matte', pick(rng(hashStr(`pp${x.toFixed(1)}${z.toFixed(1)}`)), ['#2B2B2B', '#F2F2F0', '#C9442F', '#2C5A9E', '#E8C25A']), [x, y + .85, z], [.5, 1.7, .5], [0, 0, 0], null, 'XYZ', true); }
  function boat(x, z, yaw, s = 1) {
    const b = new THREE.Matrix4().makeRotationY(yaw).setPosition(x, 0, z);
    put('box', 'matte', '#FFFFFF', [0, .55, 0], [3.2 * s, 1.1, 9 * s], [0, 0, 0], b);
    put('cone', 'matte', '#FFFFFF', [0, .55, 4.5 * s + 1.5 * s], [3.2 * s, 3 * s, 1.1], [Math.PI / 2, 0, 0], b);
    put('box', 'matte', '#1E3550', [0, .25, 0], [3.3 * s, .3, 9 * s], [0, 0, 0], b);
    put('box', 'matte', '#F4F1EA', [0, 1.5, -.6 * s], [2.4 * s, .9, 4 * s], [0, 0, 0], b);
    put('box', 'glass', '#25384C', [0, 1.6, .9 * s], [2.3 * s, .6, .8], [-.5, 0, 0], b);
    put('box', 'matte', '#C79B6B', [0, 1.12, -3.5 * s], [2.8 * s, .06, 1.8 * s], [0, 0, 0], b);
  }
  function sail(x, z, yaw, s = 1) {
    const b = new THREE.Matrix4().makeRotationY(yaw).setPosition(x, 0, z).scale(new THREE.Vector3(s, s, s));
    put('box', 'matte', '#FFFFFF', [0, .5, 0], [2.4, .9, 7], [0, 0, 0], b);
    put('cyl', 'matte', '#DADDE2', [0, 6, .3], [.15, 11, .15], [0, 0, 0], b);
    put('cone', 'flat', '#FFFFFF', [.05, 6.5, -1.2], [.1, 9.5, 5], [0, 0, 0], b);
  }
  // big white letters standing on the hill, our own word
  function sign(word, cx, y, cz, H) {
    const W = H * .62, gap = H * .28, T = H * .16, total = word.length * W + (word.length - 1) * gap;
    const bar = (x0, y0, x1, y1) => { const l = Math.hypot(x1 - x0, y1 - y0); put('box', 'matte', '#FFFFFF', [(x0 + x1) / 2, y + 2 + (y0 + y1) / 2, cz], [T, l + T * .6, T], [0, 0, Math.atan2(x0 - x1, y1 - y0)]); };
    [...word].forEach((ch, i) => { const x = cx - total / 2 + i * (W + gap), r = x + W;
      if (ch === 'O') { bar(x, 0, x, H); bar(r, 0, r, H); bar(x, 0, r, 0); bar(x, H, r, H); }
      if (ch === 'M') { bar(x, 0, x, H); bar(r, 0, r, H); bar(x, H, (x + r) / 2, H * .45); bar((x + r) / 2, H * .45, r, H); }
      if (ch === 'N') { bar(x, 0, x, H); bar(r, 0, r, H); bar(x, H, r, 0); }
      if (ch === 'Y') { bar(x, H, (x + r) / 2, H * .5); bar(r, H, (x + r) / 2, H * .5); bar((x + r) / 2, 0, (x + r) / 2, H * .5); }
      if (ch === 'W') { bar(x, H, x + W * .25, 0); bar(x + W * .25, 0, (x + r) / 2, H * .6); bar((x + r) / 2, H * .6, r - W * .25, 0); bar(r - W * .25, 0, r, H); }
      if (ch === 'D') { bar(x, 0, x, H); bar(x, H, x + W * .6, H); bar(x, 0, x + W * .6, 0); bar(x + W * .6, H, r, H * .7); bar(r, H * .7, r, H * .3); bar(r, H * .3, x + W * .6, 0); }
      if (ch === 'A') { bar(x, 0, (x + r) / 2, H); bar(r, 0, (x + r) / 2, H); bar(x + W * .22, H * .38, r - W * .22, H * .38); }
      for (const px of [x + W * .2, r - W * .2]) put('box', 'matte', '#8A8F96', [px, y + 1, cz - T], [.3, 2, .3]);
    });
  }
  // the towers, in the look of the Ep.1 reel: A blue glass with white slabs and a spire, B stone with gold bands, stepped,
  // gold top (the main one has the lit penthouse), C a white cylinder with teal glass strips and trees on the roof
  function residence(x, z, floors, main, type) {
    const fh = 3.4, y0 = 1.2, Ht = floors * fh, lite = !!opts.lite, every = lite ? 3 : 1;
    // podium: shops with awnings on the ground floor, planters, palms
    const pw = 46, pd = 40;
    put('box', 'matte', '#F4EEE2', [x, y0 + 2.5, z], [pw, 5, pd]);
    put('box', 'glass', st.glass, [x, y0 + 2.2, z + pd / 2 + .05], [pw - 4, 3.6, .1]);
    for (let k = 0; k < 5; k++) put('box', 'matte', ['#E0402E', '#2C5A9E', '#FFD21F', '#2E8B57', '#E0402E'][k], [x - pw / 2 + 6 + k * 8.5, y0 + 4.3, z + pd / 2 + 1], [6, .3, 2], [-.3, 0, 0]);
    put('box', TX('grass', 'matte'), '#8CC460', [x, y0 + 5.1, z], [pw - 2, .2, pd - 2]);
    if (!lite) for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) palm(x + px * (pw / 2 - 3), z + pz * (pd / 2 - 3), 1.1);
    const b0 = y0 + 5.2;
    if (type === 'A') {
      const segs = [[0, .5, 26], [.5, .82, 23], [.82, 1, 20]];
      for (const [a, b, w] of segs) { const ya = b0 + a * Ht, yb = b0 + b * Ht;
        put('box', 'tower', '#3F86D8', [x, (ya + yb) / 2, z], [w, yb - ya, w]);
        for (let f = Math.ceil(a * floors); f < b * floors; f += every) put('box', 'matte', '#F2F4F6', [x, b0 + f * fh, z], [w + 1.4, .45, w + 1.4], [0, 0, 0], null, 'XYZ', true); }
      put('cone', 'flat', '#9AA3AB', [x, b0 + Ht + 9, z], [8, 18, 8]);
      if (main) put('box', 'pent', '#FFD27A', [x, b0 + Ht - 2.5, z], [20.4, 4, 20.4]);
    } else if (type === 'B') {
      const segs = [[0, .45, 28], [.45, .78, 23], [.78, 1, 18]];
      for (const [a, b, w] of segs) { const ya = b0 + a * Ht, yb = b0 + b * Ht;
        put('box', 'matte', '#DCD2BE', [x, (ya + yb) / 2, z], [w, yb - ya, w]);
        for (let f = Math.ceil(a * floors); f < b * floors; f += every) put('box', 'matte', '#E2B53A', [x, b0 + f * fh + 1.2, z], [w + .3, 1, w + .3], [0, 0, 0], null, 'XYZ', true);
        put('box', 'matte', '#EFE9DC', [x, yb, z], [w + 2, 1, w + 2]); }
      if (main) put('box', 'pent', '#FFD27A', [x, b0 + Ht + 2.5, z], [15, 5, 15]);
      put('hip', 'flat', '#D9A520', [x, b0 + Ht + (main ? 9 : 5), z], [14, 12, 14]);
      put('cyl', 'matte', '#D9A520', [x, b0 + Ht + (main ? 20 : 16), z], [.5, 10, .5]);
    } else {
      const R = 12;
      put('disc', 'matte', '#F2F2EE', [x, b0 + Ht / 2, z], [R * 2, Ht, R * 2]);
      const n = lite ? 10 : 16;
      for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; put('box', 'glass', '#2FB7C4', [x + Math.sin(a) * (R + .05), b0 + Ht / 2, z + Math.cos(a) * (R + .05)], [2.6, Ht - 3, .3], [0, a, 0]); }
      for (let f = 6; f < floors; f += lite ? 12 : 6) put('disc', 'matte', '#F2F2EE', [x, b0 + f * fh, z], [R * 2 + 1.2, .5, R * 2 + 1.2], [0, 0, 0], null, 'XYZ', true);
      put('disc', 'matte', '#E8E6E0', [x, b0 + Ht + .6, z], [R * 2 + 1, 1.2, R * 2 + 1]);
      for (let k = 0; k < (lite ? 4 : 9); k++) { const a = k / 9 * Math.PI * 2; put('ico', 'flat', pick(Rd0, ['#4FA85A', '#5DB866', '#3F9A52']), [x + Math.sin(a) * 6, b0 + Ht + 3, z + Math.cos(a) * 6], [4, 3.6, 4], [k, k, 0]); }
    }
  }
  // a beach townhouse: three floors, roof terrace, small garden towards the sea
  function townhouse(x, z, k) {
    const c = ['#FFFFFF', '#F3E3C8', '#FFFFFF', '#E9D3C4', '#DCE8E4', '#FFFFFF', '#F5D9B8'][k % 7], w = 8, d = 11, h = 9;
    put('box', 'matte', c, [x, .4 + h / 2, z - 4], [w - .3, h, d]);
    put('box', 'glass', st.glass, [x, .4 + h / 2, z - 4 + d / 2 + .05], [w - 1.6, h - 1.4, .1]);
    for (const y of [3.4, 6.4]) put('box', 'matte', '#F7F4EE', [x, .4 + y, z - 4 + d / 2 + .7], [w - .3, .3, 1.4], [0, 0, 0], null, 'XYZ', true);
    put('box', 'matte', '#C79B6B', [x, .4 + h + .2, z - 4], [w - .3, .4, d]);
    if (!opts.lite) { put('cone', 'flat', ['#E0402E', '#2C5A9E', '#FFD21F'][k % 3], [x + 1.5, .4 + h + 2, z - 3], [2.4, .5, 2.4]); put('cyl', 'matte', '#FFFFFF', [x + 1.5, .4 + h + 1.2, z - 3], [.07, 1.8, .07]); }
    put('box', TX('grass', 'matte'), '#93C866', [x, .45, z + 4.5], [w - .4, .2, 6]);
    if (k % 2) put('box', 'pool', st.pool, [x, .58, z + 4.8], [w - 3, .06, 3]);
  }
  // phones: the free villas of The Hills as simple white masses (a handful of boxes each)
  function hillMass(base, r) {
    const W = curLW, Dp = curLD, w1 = W - 5, d1 = 8, zc = -Dp / 2 + 1 + d1 / 2;
    put('box', 'matte', '#F7F5F1', [0, 2.3, zc], [w1, 3.6, d1], [0, 0, 0], base);
    put('box', 'matte', '#F7F5F1', [(r() - .5) * 3, 5.8, zc + 1.2], [w1 * .6, 3.2, d1 + 1.5], [0, 0, 0], base);
    put('box', 'water', '#BFE3EA', [0, .64, Dp / 2 - 6], [w1 * .7, .06, 4], [0, 0, 0], base);
  }
  // a villa of The Hills, LA style: white volumes, glass, wood, an infinity pool on the edge, hedges, bougainvillea, a car
  function hillVilla(base, r) {
    const y0 = .5, W = curLW, Dp = curLD;
    const stone = pick(r, ['#FFFFFF', '#FAF7F1', '#F4EFE6', '#FFFFFF']);
    const dark = pick(r, ['#2B2E33', '#3B3631', '#2F3B47']);
    const w1 = W - 4 - r() * 2, d1 = 7.5 + r() * 1.5, h1 = 3.6, zc = -Dp / 2 + 1 + d1 / 2, zf = zc + d1 / 2;
    put('box', 'matte', stone, [0, y0 + h1 / 2, zc], [w1, h1, d1], [0, 0, 0], base);
    put('box', 'glass', st.glass, [0, y0 + h1 / 2, zf + .05], [w1 - 1.2, h1 - .6, .1], [0, 0, 0], base);
    for (let k = 0; k <= 5; k++) put('box', 'matte', dark, [-(w1 - 1.2) / 2 + (w1 - 1.2) * k / 5, y0 + h1 / 2, zf + .1], [.08, h1 - .6, .06], [0, 0, 0], base);
    put('box', 'matte', '#FFFFFF', [0, y0 + h1 + .15, zc + .6], [w1 + 1, .3, d1 + 1.8], [0, 0, 0], base);
    const w2 = w1 * (.5 + r() * .25), d2 = d1 + 1.5, h2 = 3.2, ox = (r() < .5 ? -1 : 1) * (w1 - w2) / 2, y2 = y0 + h1 + .3;
    const up = pick(r, ['#FFFFFF', '#FFFFFF', '#B07A4F', '#FFFFFF']);
    put('box', 'matte', up, [ox, y2 + h2 / 2, zc + 1.2], [w2, h2, d2], [0, 0, 0], base);
    put('box', 'glass', st.glass, [ox, y2 + h2 / 2, zc + 1.2 + d2 / 2 + .05], [w2 - .8, h2 - .7, .1], [0, 0, 0], base);
    put('box', 'matte', '#FFFFFF', [ox, y2 + h2 + .12, zc + 1.2], [w2 + .5, .24, d2 + .5], [0, 0, 0], base);
    if (r() < .6) for (let k = 0; k < 9; k++) put('box', 'matte', '#B07A4F', [-ox * .9 + (k - 4) * .45, y0 + h1 / 2, zf + .35], [.18, h1 - .4, .18], [0, 0, 0], base);
    put('box', 'glass', st.glass, [-ox, y0 + h1 + .8, zf + .7], [w1 - w2 - .4, 1, .06], [0, 0, 0], base);
    const pd = Dp / 2 - zf - 3, pz = zf + 1.6 + pd / 2, pw = w1 * (.55 + r() * .2), px = (r() < .5 ? -1 : 1) * (W - pw - 2) / 2 * .6;
    put('box', 'matte', '#E2CBA6', [0, y0 + .05, (zf + Dp / 2) / 2], [W - 1.2, .12, Dp / 2 - zf], [0, 0, 0], base);
    put('box', 'pool', st.pool, [px, y0 + .14, pz + .4], [pw, .06, pd], [0, 0, 0], base);
    put('box', 'glass', st.glass, [px, y0 + .7, Dp / 2 - .6], [pw + 1, .9, .06], [0, 0, 0], base);
    for (let k = 0; k < 3; k++) put('box', 'matte', '#FFFFFF', [px - pw / 2 + .9 + k * 1.2, y0 + .3, pz - pd / 2 - .3], [.75, .3, 1.7], [0, 0, 0], base);
    for (const sx of [-1, 1]) { put('box', 'flat', '#4F8F45', [sx * (W / 2 - .45), y0 + .7, 0], [.8, 1.4, Dp - 2], [0, 0, 0], base);
      for (let k = 0; k < 3; k++) put('ico', 'flat', pick(r, ['#D6247A', '#E8418F', '#C21D6B']), [sx * (W / 2 - .5), y0 + 1.5, -Dp / 2 + 2 + k * 2.2 + r()], [1.3, 1.1, 1.3], [r(), r(), 0], base); }
    const dx = -Math.sign(px || 1) * (W / 2 - 2.4);
    put('box', 'matte', '#D9D2C4', [dx, y0 + .04, Dp / 2 - 3], [3, .08, 5.6], [0, 0, 0], base);
    if (r() < .7) { const cr = r(); sportsCar(base, dx, Dp / 2 - 3, Math.PI + (r() - .5) * .1, cr < .35 ? '#F2F2F0' : cr < .6 ? '#16181C' : cr < .8 ? '#D3141B' : '#9AA3AB'); }
    palm(-dx * .9, -Dp / 2 + 2, 1.1, base);
  }

  // the new lots of The Hills: numbered after the old ones, lowest terrace (by the sea) first, west to east
  const hillLots = [];
  if (DIS.hills) {
    const H = HILL, ARC = Math.PI * .56;
    for (let k = 0; k < H.rows; k++) {
      const rk = H.r0 - k * H.dr, y = H.h0 + k * H.dh + .1, rc = rk - 5.2 - 12, n = Math.floor((rc - 12) * ARC * 2 / 18);
      for (let c = 0; c < n; c++) {
        const a = -ARC + (c + .5) / n * ARC * 2, x = H.cx + Math.sin(a) * rc, z = H.cz + Math.cos(a) * rc;
        const L = { hills: true, row: k, c, x, y, z, yaw: a, lw: 18, ld: 24, dist: 9 };
        L.base = new THREE.Matrix4().makeRotationY(a).setPosition(x, y, z);
        put('box', TX('grass', 'matte'), (k + c) % 2 ? '#9AD06C' : '#8BC55E', [0, .3, 0], [17.2, .2, 23.2], [0, 0, 0], L.base);
        hillLots.push(L);
      }
    }
  }
  districts();

  // instancing
  function makeGroup(bk) {
    const group = new THREE.Group();
    for (const [key, arr] of bk) {
      const [g, m, ns] = key.split('|');
      const mesh = new THREE.InstancedMesh(G[g], M[m], arr.length);
      arr.forEach(([mm, c], k) => { mesh.setMatrixAt(k, mm); mesh.setColorAt(k, c); });
      mesh.castShadow = ns !== 'ns' && m !== 'water';
      if (ns === 'd') mesh.userData.detail = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      group.add(mesh);
    }
    return group;
  }
  const mainGroup = makeGroup(buckets); scene.add(mainGroup);
  const setDetail = v => { mainGroup.children.forEach(m => { if (m.userData.detail) m.visible = v; }); M.water.roughness = v ? .04 : .55; M.water.envMapIntensity = v ? 1.2 : .4; M.pool.roughness = M.water.roughness; M.pool.envMapIntensity = M.water.envMapIntensity; };
  // casa singola da mostrare (username, vetrina): costruita attorno all'origine, poi posizionata dal chiamante
  function makeHouse(type, seed, dist, lw = 11, fc = null) {
    const saved = buckets; buckets = new Map(); house.prev = null; const savedLW = curLW, savedLD = curLD; curLW = lw; curLD = 15; force = fc;
    const r = rng(seed);
    if (type) buildType(type, null, r, dist); else house(null, seed, dist);
    const g = makeGroup(buckets); buckets = saved; curLW = savedLW; curLD = savedLD; force = null; return g;
  }
  // Omnya City sito: tutte le case prenotate in un solo gruppo (poche draw call anche con migliaia di case)
  function makeHouses(items) {
    const saved = buckets; buckets = new Map(); const sLW = curLW, sLD = curLD;
    for (const { L, seed } of items) { house.prev = null; curLW = L.lw; curLD = L.ld; if (L.hills) hillVilla(L.base, rng(seed)); else if (L.mega) megaVilla(L.base, rng(seed)); else house(L.base, seed, L.dist); }
    const g = makeGroup(buckets); buckets = saved; curLW = sLW; curLD = sLD; return g;
  }
  // the free lots of The Hills as white models: they get colour when someone moves in
  function makeModels(items) { if (opts.lite) { const saved = buckets; buckets = new Map(); for (const { L, seed } of items) { curLW = L.lw; curLD = L.ld; hillMass(L.base, rng(seed)); } const g = makeGroup(buckets); buckets = saved; return g; } ghost = true; const g = makeHouses(items); ghost = false; return g; }
  function makeWith(fn) { const saved = buckets; buckets = new Map(); fn(put); const g = makeGroup(buckets); buckets = saved; return g; }
  // evidenziatore downtown (scena "Early?")
  const hl = new THREE.Group();
  const hlMat = new THREE.MeshBasicMaterial({ color: st.hl, toneMapped: false });
  const hb0 = block(-1, -1), hb1 = block(1, 1);
  const hx = (hb1.x + hb1.w / 2 - (hb0.x - hb0.w / 2)) / 2 + 2, hz = (hb1.z + hb1.d / 2 - (hb0.z - hb0.d / 2)) / 2 + 2;
  for (const s of [-1, 1]) {
    const a = new THREE.Mesh(G.box, hlMat); a.scale.set(hx * 2 + 3, .8, 3); a.position.set(0, 9, s * hz); hl.add(a);
    const b = new THREE.Mesh(G.box, hlMat); b.scale.set(3, .8, hz * 2 + 3); b.position.set(s * hx, 9, 0); hl.add(b);
  }
  const tint = new THREE.Mesh(G.box, new THREE.MeshBasicMaterial({ color: st.hl, transparent: true, opacity: styleKey === 'C' ? .1 : .22, depthWrite: false }));
  tint.scale.set(hx * 2, .2, hz * 2); tint.position.set(0, 9, 0); hl.add(tint);
  hl.visible = false; scene.add(hl);

  // night: 0 = day, 1 = night (the end of the Ep.2 reel)
  const setNight = (k) => { M.glass.emissiveIntensity = k * .85; M.win.emissiveIntensity = k * 1.1; M.tower.emissiveIntensity = k * .8; M.pool.emissiveIntensity = k * .75; M.lamp.emissiveIntensity = k * 3; M.pent.emissiveIntensity = 1.6 + k * 1.4;
    M.water.envMapIntensity = 1.2 * (1 - k * .7); M.pool.envMapIntensity = M.water.envMapIntensity; };
  return { lots, hillLots, hl, PX, PZ, ext, seaZ, stats, makeHouse, makeHouses, makeModels, makeWith, st, setDetail, setNight, inCity, block, HILL, RES, residences: DIS.residences ? RES_T.map(([x, z, floors, main]) => ({ x, z, floors, main: !!main })) : [] };
}
