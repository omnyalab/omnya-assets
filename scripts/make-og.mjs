// Generates the social previews and the icons from the new logo.
//   public/og/omnya-lab.jpg      1200x630, Penthouse Dubai cover + logo (general pages)
//   public/og/<project>.jpg      1200x630, each project cover + small logo
//   public/favicon.ico, favicon-32.png   "o" monogram from the logo
//   public/icon-192.png, apple-touch-icon.png   full two-tone wordmark on paper
// Runs before every build (npm "prebuild"). If sharp is missing it keeps the
// committed files and lets the build go on.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.warn('[og] sharp not available, keeping the committed images');
  process.exit(0);
}

const PAPER = { r: 237, g: 234, b: 228, alpha: 1 };
const W = 1200;
const H = 630;
const INK = { left: 110, top: 110, width: 1380, height: 232 }; // logo ink box in the 1600x452 PNGs
const O = { left: 110, width: 169 }; // the first "o"

const projects = JSON.parse(readFileSync('src/data/projects.json', 'utf8'));
const slug = (p) => p.id.replace(/^\d+_/, '').replace(/_/g, '-');
mkdirSync('public/og', { recursive: true });

const logo = (file, width) => sharp(`public/brand/${file}`).extract(INK).resize({ width }).png().toBuffer();

// Soft dark gradient at the bottom so the white logo always reads
const shade = Buffer.from(
  `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0.45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/></linearGradient></defs>
  <rect width="100%" height="100%" fill="url(#g)"/></svg>`
);

async function og(src, out, logoWidth) {
  const mark = await logo('logo_twotone_white.png', logoWidth);
  const { height: mh } = await sharp(mark).metadata();
  await sharp(`public${src}`)
    .resize(W, H, { fit: 'cover', position: sharp.strategy.attention })
    .composite([
      { input: shade, top: 0, left: 0 },
      { input: mark, left: 56, top: H - 56 - mh },
    ])
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(out);
}

const penthouse = projects.find((p) => p.id === '01_penthouse_dubai');
await og(penthouse.cover.src, 'public/og/omnya-lab.jpg', 380);
for (const p of projects) await og(p.cover.src, `public/og/${slug(p)}.jpg`, 220);

// Icons
async function monogram(size) {
  const inner = Math.round(size * 0.62);
  // sharp trims before extracting, so cut the glyph out first, then trim it
  const cut = await sharp('public/brand/logo_twotone_black.png')
    .extract({ left: O.left, top: INK.top, width: O.width, height: INK.height })
    .png()
    .toBuffer();
  const glyph = await sharp(await sharp(cut).trim().png().toBuffer())
    .resize({ width: inner, height: inner, fit: 'inside' })
    .png()
    .toBuffer();
  const meta = await sharp(glyph).metadata();
  return sharp({ create: { width: size, height: size, channels: 4, background: PAPER } })
    .composite([{ input: glyph, left: Math.round((size - meta.width) / 2), top: Math.round((size - meta.height) / 2) }])
    .png()
    .toBuffer();
}
async function wordmark(size) {
  const mark = await logo('logo_twotone_black.png', Math.round(size * 0.78));
  const meta = await sharp(mark).metadata();
  return sharp({ create: { width: size, height: size, channels: 4, background: PAPER } })
    .composite([{ input: mark, left: Math.round((size - meta.width) / 2), top: Math.round((size - meta.height) / 2) }])
    .png()
    .toBuffer();
}

writeFileSync('public/favicon-32.png', await monogram(32));
writeFileSync('public/icon-192.png', await wordmark(192));
writeFileSync('public/apple-touch-icon.png', await wordmark(180));

// favicon.ico with PNG entries (16, 32, 48)
const sizes = [16, 32, 48];
const pngs = await Promise.all(sizes.map(monogram));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((s, i) => {
  const e = 6 + i * 16;
  header.writeUInt8(s, e);
  header.writeUInt8(s, e + 1);
  header.writeUInt8(0, e + 2);
  header.writeUInt8(0, e + 3);
  header.writeUInt16LE(1, e + 4);
  header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(pngs[i].length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += pngs[i].length;
});
writeFileSync('public/favicon.ico', Buffer.concat([header, ...pngs]));

console.log(`[og] ${projects.length + 1} social images and icons ready`);
