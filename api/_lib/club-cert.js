// 28/11 (Nico, board «Le card del club»: C1 «fatto da dio», R1 + R4, «al termine del corso lo possono sempre scaricare»):
// the certificate of a finished course, A4 landscape, drawn here as one SVG and turned into a picture by /api/club/cert
// (resvg, the fonts in private/cert). The frame is a guilloché band like a banknote, the seal is gold with the knot and
// two ribbons; the member's name, the day they finished and the certificate's id are the only things that change.
// The id is made from the email and the course with a secret: never a number in order, so nobody learns how many we are.
import { createHmac } from 'node:crypto';

export const W = 2970; // the drawing's units: tenths of a millimetre on A4 landscape (297 × 210 mm)
export const H = 2100;

/** the courses that give a certificate: the key is the one in the address (?c=samar) */
export const CERT_COURSES = {
  samar: {
    title: 'SAMAR, floor by floor', short: 'SAMAR', steps: 11,
    lines: ['for completing SAMAR, floor by floor, the eleven-step course of THE 3D FUTURE,', 'and building a tower online where buyers choose their floor in 3D.'],
  },
};

const secret = () => process.env.FILES_SECRET || process.env.NEWSLETTER_SECRET || process.env.IG_ADMIN_KEY || 'club-cert';
const B32 = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
/** 8 letters and digits in two groups (7KQ2-M9XA): the same email and course always give the same id */
export function certId(email, course) {
  const h = createHmac('sha256', secret()).update(`cert|${String(email).toLowerCase()}|${course}`).digest();
  let s = ''; for (let i = 0; i < 8; i++) s += B32[h[i] % 32];
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}

/** LinkedIn's own «Add licence or certification» form, filled in (the member saves it on LinkedIn) */
export function linkedInUrl(course, id, iso) {
  const c = CERT_COURSES[course], d = new Date(iso);
  const q = new URLSearchParams({
    startTask: 'CERTIFICATION_NAME', name: `${c.title} · THE 3D FUTURE`, organizationName: 'Omnya Lab',
    issueYear: String(d.getUTCFullYear()), issueMonth: String(d.getUTCMonth() + 1), certId: id,
    certUrl: 'https://www.omnyalab.com/the-3d-future',
  });
  return `https://www.linkedin.com/profile/add?${q}`;
}

/** the name as it goes on the certificate: the full name when there is one, every word with a capital */
export function certName(full, profile) {
  const pick = [profile, full].map((s) => String(s || '').replace(/\s+/g, ' ').trim()).filter(Boolean)
    .sort((a, b) => b.split(' ').length - a.split(' ').length)[0] || 'Member';
  return pick.slice(0, 48).replace(/(^|[\s'-])(\p{Ll})/gu, (m, a, b) => a + b.toUpperCase());
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const f1 = (n) => Math.round(n * 10) / 10;

/* the centre line of the frame: a rectangle with round corners, walked by its length (so the waves turn the corners smoothly) */
function walker(x0, y0, x1, y1, r) {
  const w = x1 - x0 - 2 * r, h = y1 - y0 - 2 * r, q = Math.PI * r / 2, segs = [w, q, h, q, w, q, h, q], L = segs.reduce((a, b) => a + b, 0);
  const at = (s) => {
    s = ((s % L) + L) % L; let i = 0; while (s > segs[i]) { s -= segs[i]; i++; }
    const arc = (cx, cy, a0) => { const a = a0 + s / r; return [cx + r * Math.cos(a), cy + r * Math.sin(a), Math.cos(a), Math.sin(a)]; };
    switch (i) {
      case 0: return [x0 + r + s, y0, 0, -1];
      case 1: return arc(x1 - r, y0 + r, -Math.PI / 2);
      case 2: return [x1, y0 + r + s, 1, 0];
      case 3: return arc(x1 - r, y1 - r, 0);
      case 4: return [x1 - r - s, y1, 0, 1];
      case 5: return arc(x0 + r, y1 - r, Math.PI / 2);
      case 6: return [x0, y1 - r - s, -1, 0];
      default: return arc(x0 + r, y0 + r, Math.PI);
    }
  };
  return { L, at };
}
/* a guilloché band: waves of two lengths crossing each other along the frame */
function band(inset, half) {
  const wk = walker(inset, inset, W - inset, H - inset, 70), out = [];
  const fam = [[22, half * .92, 0], [22, half * .92, Math.PI], [33, half * .62, Math.PI / 2], [33, half * .62, 3 * Math.PI / 2]];
  for (const [per, amp, ph0] of fam) {
    const n = Math.round(wk.L / per / 2) * 2, P = wk.L / n; // a whole number of waves, so the line closes on itself
    for (let k = 0; k < 3; k++) {
      let d = ''; const ph = ph0 + k * Math.PI * 2 / 9;
      for (let s = 0; s <= wk.L + 0.1; s += 5) {
        const [x, y, nx, ny] = wk.at(s), o = amp * Math.sin(2 * Math.PI * s / P + ph);
        d += (d ? 'L' : 'M') + f1(x + nx * o) + ',' + f1(y + ny * o);
      }
      out.push(`<path d="${d}Z"/>`);
    }
  }
  return out.join('');
}
/* a rosette (the round guilloché of the corners, of the seal and of the watermark) */
function rosette(cx, cy, R, a, k, lines, step = 0.02) {
  const out = [];
  for (let j = 0; j < lines; j++) {
    let d = ''; const ph = j * Math.PI * 2 / lines / k;
    for (let t = 0; t <= Math.PI * 2 + 1e-9; t += step) {
      const r = R + a * Math.sin(k * (t + ph));
      d += (d ? 'L' : 'M') + f1(cx + r * Math.cos(t)) + ',' + f1(cy + r * Math.sin(t));
    }
    out.push(`<path d="${d}Z"/>`);
  }
  return out.join('');
}
/* the burst edge of the seal */
function burst(cx, cy, r0, r1, n) {
  let d = '';
  for (let i = 0; i < n * 2; i++) { const a = Math.PI * i / n - Math.PI / 2, r = i % 2 ? r1 : r0; d += (d ? 'L' : 'M') + f1(cx + r * Math.cos(a)) + ',' + f1(cy + r * Math.sin(a)); }
  return d + 'Z';
}

/**
 * the certificate as SVG. name: the member's name, course: a key of CERT_COURSES, date: when they finished (ISO),
 * id: certId(), knot: the logo as a data URL (PNG), sign: Nico's signature as a data URL (PNG, optional: without it the
 * name is written in the script font).
 */
export function certSvg({ name, course, date, id, knot, sign }) {
  const c = CERT_COURSES[course];
  const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Rome' }).format(new Date(date));
  const cx = W / 2, nmSize = Math.min(196, Math.floor(1950 / Math.max(6, name.length * 0.43)));
  const SX = cx, SY = 1612; // the seal
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<defs>
  <radialGradient id="paper" cx="50%" cy="42%" r="75%"><stop offset="0" stop-color="#fffdf8"/><stop offset=".55" stop-color="#f8f1e1"/><stop offset="1" stop-color="#eadcbc"/></radialGradient>
  <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8c6a2c"/><stop offset=".22" stop-color="#d6b462"/><stop offset=".42" stop-color="#f6e5ad"/><stop offset=".58" stop-color="#c39a4b"/><stop offset=".8" stop-color="#e6cb84"/><stop offset="1" stop-color="#8a6527"/></linearGradient>
  <linearGradient id="goldT" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9cf86"/><stop offset=".45" stop-color="#b98d3c"/><stop offset=".55" stop-color="#9a7230"/><stop offset="1" stop-color="#d8b768"/></linearGradient>
  <radialGradient id="sealG" cx="38%" cy="32%" r="80%"><stop offset="0" stop-color="#fff1c4"/><stop offset=".35" stop-color="#e3c173"/><stop offset=".75" stop-color="#b48635"/><stop offset="1" stop-color="#7e5a20"/></radialGradient>
  <radialGradient id="sealIn" cx="40%" cy="35%" r="75%"><stop offset="0" stop-color="#f9e6ad"/><stop offset=".6" stop-color="#cfa654"/><stop offset="1" stop-color="#9c7330"/></radialGradient>
  <linearGradient id="rib" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0f2a66"/><stop offset=".5" stop-color="#2a5bd0"/><stop offset="1" stop-color="#0f2a66"/></linearGradient>
  <linearGradient id="blue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fbcff"/><stop offset=".55" stop-color="#2f7bff"/><stop offset="1" stop-color="#1d4fd8"/></linearGradient>
  <filter id="gilt" x="-10%" y="-10%" width="120%" height="120%"><feColorMatrix type="matrix" values=".33 .33 .33 0 0  .33 .33 .33 0 0  .33 .33 .33 0 0  0 0 0 1 0"/><feComponentTransfer><feFuncR type="linear" slope="1.05" intercept=".42"/><feFuncG type="linear" slope=".9" intercept=".28"/><feFuncB type="linear" slope=".55" intercept=".06"/></feComponentTransfer></filter>
  <filter id="lift" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur in="SourceAlpha" stdDeviation="9"/><feOffset dx="0" dy="10"/><feComponentTransfer><feFuncA type="linear" slope=".35"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <path id="ring" d="M ${SX - 126},${SY} a 126,126 0 1,1 252,0 a 126,126 0 1,1 -252,0"/>
</defs>
<rect width="${W}" height="${H}" fill="url(#paper)"/>
<g fill="none" stroke="#b08a43" stroke-width="1" opacity=".07">${rosette(cx, 1010, 560, 70, 18, 14, 0.012)}${rosette(cx, 1010, 400, 46, 13, 10, 0.014)}</g>
<g fill="none" stroke="url(#gold)">
  <rect x="58" y="58" width="${W - 116}" height="${H - 116}" stroke-width="7"/>
  <rect x="80" y="80" width="${W - 160}" height="${H - 160}" stroke-width="1.6"/>
  <rect x="196" y="196" width="${W - 392}" height="${H - 392}" stroke-width="1.6"/>
  <rect x="210" y="210" width="${W - 420}" height="${H - 420}" stroke-width="5"/>
</g>
<g fill="none" stroke="#b6914a" stroke-width="1.15" opacity=".75">${band(138, 44)}</g>
${[[138, 138], [W - 138, 138], [138, H - 138], [W - 138, H - 138]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="74" fill="#f6eedb" stroke="url(#gold)" stroke-width="5"/><g fill="none" stroke="#a77f37" stroke-width="1.1">${rosette(x, y, 48, 16, 12, 6, 0.03)}</g><circle cx="${x}" cy="${y}" r="9" fill="url(#gold)"/>`).join('')}

<g transform="translate(${cx}, 352)">
  <image x="-232" y="-52" width="92" height="92" href="${knot}"/>
  <text x="-122" y="20" font-family="Inter" font-weight="700" font-size="58" letter-spacing="-1.6" fill="#14224d">THE <tspan fill="url(#blue)">3D</tspan> FUTURE</text>
</g>
<text x="${cx}" y="430" text-anchor="middle" font-family="Cert Serif Bold" font-size="26" letter-spacing="10" fill="#9a7d45">BY OMNYA LAB</text>

<text x="${cx}" y="640" text-anchor="middle" font-family="Cert Serif Bold" font-size="168" letter-spacing="34" fill="url(#goldT)" stroke="#8a6527" stroke-width="1.2">CERTIFICATE</text>
<text x="${cx}" y="748" text-anchor="middle" font-family="Cert Italic" font-size="92" fill="#14224d">of Completion</text>
<g fill="url(#gold)"><rect x="${cx - 420}" y="806" width="350" height="3"/><rect x="${cx + 70}" y="806" width="350" height="3"/><path d="M${cx - 40},807.5 L${cx},787 L${cx + 40},807.5 L${cx},828 Z"/><circle cx="${cx - 70}" cy="807.5" r="7"/><circle cx="${cx + 70}" cy="807.5" r="7"/></g>

<text x="${cx}" y="912" text-anchor="middle" font-family="Cert Serif Bold" font-size="31" letter-spacing="11" fill="#8f7848">THIS IS PROUDLY PRESENTED TO</text>
<text x="${cx}" y="${1062 + nmSize * .18}" text-anchor="middle" font-family="Cert Italic" font-size="${nmSize}" fill="#0f1c45">${esc(name)}</text>
<g fill="url(#gold)"><rect x="${cx - 640}" y="1150" width="1280" height="2.5"/><path d="M${cx - 18},1151 L${cx},1133 L${cx + 18},1151 L${cx},1169 Z"/></g>
${c.lines.map((l, i) => `<text x="${cx}" y="${1262 + i * 66}" text-anchor="middle" font-family="Cert Serif" font-size="47" fill="#3a3f55">${esc(l).replace(esc(c.title), `<tspan font-family="Cert Serif Bold" fill="#14224d">${esc(c.title)}</tspan>`).replace('THE 3D FUTURE', '<tspan font-family="Cert Serif Bold" fill="#14224d">THE 3D FUTURE</tspan>')}</text>`).join('')}

<g>
  <text x="680" y="1640" text-anchor="middle" font-family="Cert Italic" font-size="64" fill="#14224d">${esc(day)}</text>
  <rect x="420" y="1672" width="520" height="2.5" fill="url(#gold)"/>
  <text x="680" y="1726" text-anchor="middle" font-family="Cert Serif Bold" font-size="25" letter-spacing="8" fill="#8f7848">DATE OF COMPLETION</text>
</g>
<g>
  ${sign ? `<image x="${W - 940}" y="1470" width="520" height="190" href="${sign}" preserveAspectRatio="xMidYMax meet"/>` : `<text x="${W - 680}" y="1640" text-anchor="middle" font-family="Cert Script" font-size="150" fill="#14224d">Nico</text>`}
  <rect x="${W - 940}" y="1672" width="520" height="2.5" fill="url(#gold)"/>
  <text x="${W - 680}" y="1726" text-anchor="middle" font-family="Cert Serif Bold" font-size="25" letter-spacing="8" fill="#8f7848">NICO · FOUNDER</text>
  <text x="${W - 680}" y="1764" text-anchor="middle" font-family="Cert Serif" font-size="27" letter-spacing="3" fill="#8f7848">THE 3D FUTURE</text>
</g>

<g filter="url(#lift)">
  <path d="M${SX - 120},${SY + 90} L${SX - 205},${SY + 330} L${SX - 150},${SY + 296} L${SX - 120},${SY + 352} L${SX - 40},${SY + 130} Z" fill="url(#rib)"/>
  <path d="M${SX + 120},${SY + 90} L${SX + 205},${SY + 330} L${SX + 150},${SY + 296} L${SX + 120},${SY + 352} L${SX + 40},${SY + 130} Z" fill="url(#rib)"/>
  <path d="${burst(SX, SY, 212, 194, 60)}" fill="url(#sealG)" stroke="#8a6527" stroke-width="1.5"/>
</g>
<circle cx="${SX}" cy="${SY}" r="176" fill="none" stroke="#fff3cf" stroke-width="2" opacity=".7"/>
<circle cx="${SX}" cy="${SY}" r="166" fill="url(#sealIn)" stroke="#8a6527" stroke-width="2"/>
<g fill="none" stroke="#8a6527" stroke-width=".9" opacity=".55">${rosette(SX, SY, 150, 9, 30, 4, 0.01)}</g>
<text font-family="Cert Serif Bold" font-size="23" letter-spacing="3" fill="#5e4114"><textPath href="#ring" startOffset="0">THE 3D FUTURE • CERTIFIED 3D BUILDER • OMNYA LAB •</textPath></text>
<circle cx="${SX}" cy="${SY}" r="98" fill="url(#sealG)" stroke="#8a6527" stroke-width="2"/>
<circle cx="${SX}" cy="${SY}" r="88" fill="none" stroke="#fff3cf" stroke-width="1.5" opacity=".8"/>
<circle cx="${SX}" cy="${SY}" r="78" fill="#0d1b44" stroke="#f3dc9a" stroke-width="3"/>
<image x="${SX - 62}" y="${SY - 62}" width="124" height="124" href="${knot}"/>

<text x="680" y="${H - 250}" text-anchor="middle" font-family="Cert Serif Bold" font-size="23" letter-spacing="6" fill="#9b8a62">CERTIFICATE ID  ${esc(id)}</text>
<text x="${W - 680}" y="${H - 250}" text-anchor="middle" font-family="Cert Serif Bold" font-size="23" letter-spacing="6" fill="#9b8a62">OMNYALAB.COM/THE-3D-FUTURE</text>
</svg>`;
}
