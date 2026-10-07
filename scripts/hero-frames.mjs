// Home hero, desktop: image sequence for the scroll-driven drone shot.
//   hero-src/pc_video_1.mp4      → public/hero/desktop/0001.avif|webp … (144 frames, 1600px wide)
//   src/data/hero-frames.json    frame count and size, read by the home page
// Phones have no scrub: they play public/hero/mobile.mp4 (made by hand from
// hero-src/mobile_video_1.mp4, see the README).
//
// The clip starts almost still and slows down at the end. Picking frames at
// equal steps of time would make the scroll crawl at the start and rush in the
// middle, so the frames are picked at equal steps of motion instead: for every
// pair of consecutive frames we measure the mean absolute difference in
// greyscale at 214x120, add them up, and take the frames where the running
// total crosses 0, 1/(n-1), 2/(n-1) … of the whole.
// The camera then moves at the same speed for every pixel scrolled.
//
// Needs ffmpeg with libaom-av1 and libwebp (brew install ffmpeg). Not part of
// `npm run build`: run it by hand when the videos change, then commit the frames.
//   npm run hero:frames
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { cpus, tmpdir } from 'node:os';
import { join } from 'node:path';

const SETS = {
  desktop: { src: 'hero-src/pc_video_1.mp4', count: 144, width: 1600, probe: [214, 120], limitMB: 12 },
};
// Starting quality, as in avifenc/sharp (0-100) and cwebp. Lowered in steps of 5
// if a set goes over its size limit.
const AVIF_Q = 55;
const WEBP_Q = 70;
const OUT = 'public/hero';
const MANIFEST = 'src/data/hero-frames.json';

function run(cmd, args, { capture = false } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', capture ? 'pipe' : 'ignore', 'pipe'] });
    const chunks = [];
    let err = '';
    if (capture) p.stdout.on('data', (c) => chunks.push(c));
    p.stderr.on('data', (c) => (err += c));
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(`${cmd} exited ${code}\n${err.slice(-2000)}`))));
  });
}

/** Motion between consecutive frames, one value per pair. */
async function motion(src, [w, h]) {
  const raw = await run('ffmpeg', ['-v', 'error', '-i', src, '-vf', `scale=${w}:${h}:flags=area,format=gray`, '-f', 'rawvideo', '-'], { capture: true });
  const size = w * h;
  const frames = Math.floor(raw.length / size);
  const diffs = [];
  for (let f = 1; f < frames; f++) {
    let sum = 0;
    const a = (f - 1) * size;
    const b = f * size;
    for (let i = 0; i < size; i++) sum += Math.abs(raw[b + i] - raw[a + i]);
    diffs.push(sum / size);
  }
  return { frames, diffs };
}

/** Frame indexes at equal steps of cumulative motion, first and last included. */
function pick(diffs, count) {
  const cum = [0];
  for (const d of diffs) cum.push(cum[cum.length - 1] + d);
  const total = cum[cum.length - 1];
  const out = [];
  let j = 0;
  for (let k = 0; k < count; k++) {
    const target = (k / (count - 1)) * total;
    while (j < cum.length - 1 && cum[j + 1] <= target) j++;
    // nearest of the two frames around the target
    let idx = j < cum.length - 1 && cum[j + 1] - target < target - cum[j] ? j + 1 : j;
    // never the same frame twice (only possible where one step of motion is huge)
    if (out.length && idx <= out[out.length - 1]) idx = Math.min(cum.length - 1, out[out.length - 1] + 1);
    out.push(idx);
  }
  return out;
}

async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) await fn(items[i++]); }));
}

const dirSize = (dir, ext) => readdirSync(dir).filter((f) => f.endsWith(ext)).reduce((s, f) => s + statSync(join(dir, f)).size, 0);
const mb = (b) => (b / 1024 / 1024).toFixed(2);

async function encode(pngs, dir, ext, q) {
  // avifenc / sharp map quality to the AV1 quantizer as (100 - q) * 63 / 100
  const args = ext === 'avif'
    ? ['-c:v', 'libaom-av1', '-still-picture', '1', '-crf', String(Math.round(((100 - q) * 63) / 100)), '-b:v', '0', '-cpu-used', '3', '-pix_fmt', 'yuv420p', '-threads', '1']
    : ['-c:v', 'libwebp', '-quality', String(q), '-compression_level', '6', '-preset', 'photo'];
  await pool(pngs, Math.max(1, cpus().length), async (png) => {
    const name = png.replace(/\.png$/, `.${ext}`);
    await run('ffmpeg', ['-v', 'error', '-y', '-i', png, ...args, join(dir, name.split('/').pop())]);
  });
}

async function build(key) {
  const set = SETS[key];
  if (!existsSync(set.src)) throw new Error(`missing ${set.src}`);
  console.log(`[hero] ${key}: measuring motion in ${set.src}`);
  const { frames, diffs } = await motion(set.src, set.probe);
  const picks = pick(diffs, set.count);
  console.log(`[hero] ${key}: ${frames} source frames → ${picks.length}: ${picks.join(' ')}`);

  const tmp = mkdtempSync(join(tmpdir(), `hero-${key}-`));
  // one decode of the source, only the chosen frames come out, in order
  const select = picks.map((n) => `eq(n\\,${n})`).join('+');
  await run('ffmpeg', [
    '-v', 'error', '-i', set.src,
    '-vf', `select='${select}',scale=${set.width}:-2:flags=lanczos`,
    '-fps_mode', 'passthrough', join(tmp, '%04d.png'),
  ]);
  const pngs = readdirSync(tmp).filter((f) => f.endsWith('.png')).sort().map((f) => join(tmp, f));
  if (pngs.length !== picks.length) throw new Error(`expected ${picks.length} frames, got ${pngs.length}`);
  const probe = await run('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', pngs[0]], { capture: true });
  const [w, h] = probe.toString().trim().split(',').map(Number);

  const dir = join(OUT, key);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const limit = set.limitMB * 1024 * 1024;
  const quality = {};
  for (const [ext, q0] of [['avif', AVIF_Q], ['webp', WEBP_Q]]) {
    let q = q0;
    for (;;) {
      readdirSync(dir).filter((f) => f.endsWith(`.${ext}`)).forEach((f) => rmSync(join(dir, f)));
      await encode(pngs, dir, ext, q);
      const size = dirSize(dir, `.${ext}`);
      console.log(`[hero] ${key} ${ext} q${q}: ${mb(size)} MB (limit ${set.limitMB} MB)`);
      if (size <= limit || q <= 20) break;
      q -= 5;
    }
    quality[ext] = q;
  }
  rmSync(tmp, { recursive: true, force: true });
  return { count: picks.length, w, h, quality };
}

const only = process.argv[2];
const keys = only ? [only] : Object.keys(SETS);
if (keys.some((k) => !SETS[k])) throw new Error(`unknown set "${only}", use desktop`);
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
for (const key of keys) manifest[key] = await build(key);
writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`[hero] wrote ${MANIFEST}`);
