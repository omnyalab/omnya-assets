// Generates the social previews from the logo.
//   public/og/omnya-lab.jpg      1200x630, Penthouse Dubai cover + logo (general pages)
//   public/og/<project>.jpg      1200x630, each project cover + small logo
// Favicons and app icons come ready from the brand kit (public/favicon*, apple-touch-icon.png).
// Runs before every build (npm "prebuild"). If sharp is missing it keeps the
// committed files and lets the build go on.
import { readFileSync, mkdirSync } from 'node:fs';

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.warn('[og] sharp not available, keeping the committed images');
  process.exit(0);
}

const W = 1200;
const H = 630;

const projects = JSON.parse(readFileSync('src/data/projects.json', 'utf8'));
const slug = (p) => p.slug ?? p.id.replace(/^\d+_/, '').replace(/_/g, '-');
mkdirSync('public/og', { recursive: true });

// rendered large, trimmed to the ink, then scaled down
const logo = async (file, width) =>
  sharp(await sharp(`public/brand/${file}`, { density: 600 }).trim().png().toBuffer()).resize({ width }).png().toBuffer();

// Soft dark gradient at the bottom so the white logo always reads
const shade = Buffer.from(
  `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0.45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/></linearGradient></defs>
  <rect width="100%" height="100%" fill="url(#g)"/></svg>`
);

async function og(src, out, logoWidth) {
  const mark = await logo('OmnyaLab_Logo_White.svg', logoWidth);
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

console.log(`[og] ${projects.length + 1} social images ready`);
