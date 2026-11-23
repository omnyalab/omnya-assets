// GET /api/seats?m=list|taken&n=<number>&s=<signature>: the founders' seats picture of the THE 3D FUTURE launch mails
// (api/_lib/seats-card.js says why). Same address = same picture, so the CDN keeps it for a year and draws it once.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { seatsCard, seatsOk, W, H } from './_lib/seats-card.js';

const ROOTS = [join(process.cwd(), 'private', 'seats'), fileURLToPath(new URL('../private/seats', import.meta.url))];
const read = (f) => { for (const r of ROOTS) { try { return readFileSync(join(r, f)); } catch {} } throw new Error(`seats: missing ${f}`); };
let assets;
const load = () => (assets ||= {
  logo: `data:image/png;base64,${read('knot.png').toString('base64')}`,
  fonts: [
    { name: 'Inter', data: read('Inter-SemiBold.otf'), weight: 600, style: 'normal' },
    { name: 'Inter', data: read('Inter-Bold.otf'), weight: 700, style: 'normal' },
  ],
});

export async function GET(request) {
  const u = new URL(request.url);
  const m = u.searchParams.get('m'); const n = Number(u.searchParams.get('n'));
  if (!seatsOk(m, n, u.searchParams.get('s'))) return new Response('Not found', { status: 404 });
  const a = load();
  const svg = await satori(seatsCard(m, n, a.logo), { width: W, height: H, fonts: a.fonts });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();
  return new Response(png, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable' } });
}
