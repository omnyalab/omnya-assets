// Media check: every page, mobile and desktop, in real Chrome.
//   1. opens each page, scrolls to the bottom, then verifies every <img> decoded
//      and every <video> (source + poster) can load its metadata
//   2. loads every image and video listed in src/data/projects.json (both the
//      desktop and the mobile files), whatever the pages happen to pick
//   3. reports any HTTP error (404 etc.) seen along the way
//
// Usage: npm run build && npx astro preview --port 4322 &
//        node scripts/check-media.mjs [http://localhost:4322]
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';

const BASE = process.argv[2] || 'http://localhost:4322';
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const IGNORE = [/\/_vercel\/insights\//, /calendly\.com/, /stripe\.com/];

function routes(dir = 'dist', prefix = '') {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === '_astro' || name === 'projects' || name === 'hero' || name === 'brand') continue;
      out.push(...routes(p, `${prefix}/${name}`));
    } else if (name === 'index.html') out.push(prefix || '/');
  }
  return out.sort();
}

const viewports = {
  mobile: {
    viewport: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  },
  desktop: { viewport: { width: 1440, height: 900, deviceScaleFactor: 2 }, ua: null },
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  // as root (CI, containers) Chrome refuses to start without --no-sandbox
  args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio', ...(process.getuid?.() === 0 ? ['--no-sandbox'] : [])],
});

const problems = [];
const stats = { pages: 0, images: 0, videos: 0, posters: 0 };

async function inspect(page) {
  return page.evaluate(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const bad = [];
    // the preloader is skipped after the first visit: its photo intentionally has no file
    // images that are not rendered at all (display: none for this screen or mode,
    // e.g. the reduced-motion grid or the desktop-only hover pictures) are never
    // loaded on purpose
    const imgs = [...document.querySelectorAll('img')].filter((im) => !im.closest('.pre.is-gone') && im.getClientRects().length > 0);
    // give late images a moment
    for (let i = 0; i < 40 && imgs.some((im) => im.src && !im.complete); i++) await wait(250);
    for (const im of imgs) {
      if (im.dataset.src || im.dataset.seeallSrc) bad.push(`image never released: ${im.dataset.src || im.dataset.seeallSrc}`);
      else if (!im.src) bad.push(`image without src: ${im.outerHTML.slice(0, 80)}`);
      else if (!im.complete || im.naturalWidth === 0) bad.push(`broken image: ${im.currentSrc || im.src}`);
    }
    const mobile = matchMedia('(max-width: 899px)').matches;
    const vids = [...document.querySelectorAll('video')].map((v) => ({
      src: v.currentSrc || v.src || (mobile ? v.dataset.srcM : v.dataset.srcD) || [...v.querySelectorAll('source')].find((s) => !s.media || matchMedia(s.media).matches)?.src,
      poster: v.poster || v.dataset.poster || '',
    }));
    const loadMeta = (src) =>
      new Promise((res) => {
        const v = document.createElement('video');
        v.muted = true;
        v.preload = 'metadata';
        const t = setTimeout(() => res(`timeout ${src}`), 20000);
        v.onloadedmetadata = () => { clearTimeout(t); res(v.videoWidth > 0 ? null : `no video track ${src}`); };
        v.onerror = () => { clearTimeout(t); res(`video error ${v.error && v.error.code} ${src}`); };
        v.src = src;
      });
    const loadImg = (src) =>
      new Promise((res) => {
        const i = new Image();
        i.onload = () => res(i.naturalWidth ? null : `empty image ${src}`);
        i.onerror = () => res(`broken poster ${src}`);
        i.src = src;
      });
    let posters = 0;
    for (const v of vids) {
      if (!v.src) bad.push('video without source');
      else { const e = await loadMeta(v.src); if (e) bad.push(e); }
      if (v.poster) { posters++; const e = await loadImg(v.poster); if (e) bad.push(e); }
    }
    return { bad, images: imgs.length, videos: vids.length, posters };
  });
}

for (const [name, vp] of Object.entries(viewports)) {
  for (const route of routes()) {
    const page = await browser.newPage();
    await page.setViewport(vp.viewport);
    if (vp.ua) await page.setUserAgent(vp.ua);
    await page.evaluateOnNewDocument(() => sessionStorage.setItem('omSeenIntro', '1'));
    const http = [];
    page.on('response', (r) => {
      if (r.status() >= 400 && !IGNORE.some((re) => re.test(r.url()))) http.push(`${r.status()} ${r.url().replace(BASE, '')}`);
    });
    page.on('requestfailed', (r) => {
      const err = r.failure()?.errorText || '';
      // media requests get cancelled when a video pauses or a range is dropped: not an error
      if (err.includes('ERR_ABORTED') || IGNORE.some((re) => re.test(r.url()))) return;
      http.push(`failed ${err} ${r.url().replace(BASE, '')}`);
    });
    await page.goto(BASE + route, { waitUntil: 'load', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 1200));
    // scroll to the bottom so lazy media and on-screen videos kick in
    await page.evaluate(async () => {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      for (let y = 0; y < document.documentElement.scrollHeight; y += Math.round(innerHeight * 0.6)) {
        window.scrollTo(0, y);
        await wait(220);
      }
      window.scrollTo(0, document.documentElement.scrollHeight);
      await wait(1200);
    });
    const r = await inspect(page);
    stats.pages++;
    stats.images += r.images;
    stats.videos += r.videos;
    stats.posters += r.posters;
    [...r.bad, ...http].forEach((b) => problems.push(`[${name}] ${route}: ${b}`));
    console.log(`${name.padEnd(7)} ${route.padEnd(28)} img ${String(r.images).padStart(3)}  video ${r.videos}  ${r.bad.length + http.length ? 'PROBLEMS' : 'ok'}`);
    await page.close();
  }
}

// Every file in projects.json, desktop and mobile, plus brand, home hero frames, social images and icons
const data = JSON.parse(readFileSync('src/data/projects.json', 'utf8'));
const imgUrls = new Set([
  ...['desktop', 'mobile'].flatMap((k) => readdirSync(`public/hero/${k}`).map((f) => `/hero/${k}/${f}`)),
  '/process/studio.webp',
  ...readdirSync('public/brand').map((f) => `/brand/${f}`),
  ...readdirSync('public/og').map((f) => `/og/${f}`),
  ...readdirSync('public/studio').map((f) => `/studio/${f}`),
  '/favicon-32.png', '/icon-192.png', '/apple-touch-icon.png', '/favicon.ico',
]);
const vidUrls = new Set();
for (const p of data) {
  for (const m of [p.cover, ...p.gallery]) { imgUrls.add(m.src); imgUrls.add(m.mobile); }
  for (const v of p.videos) { vidUrls.add(v.desktop); vidUrls.add(v.mobile); imgUrls.add(v.poster); }
}
const page = await browser.newPage();
await page.goto(BASE + '/privacy-policy', { waitUntil: 'load' });
const fileProblems = await page.evaluate(async (imgs, vids) => {
  const bad = [];
  for (const src of imgs) {
    const ok = await new Promise((res) => { const i = new Image(); i.onload = () => res(i.naturalWidth > 0); i.onerror = () => res(false); i.src = src; });
    if (!ok) bad.push(`file image broken: ${src}`);
  }
  for (const src of vids) {
    const ok = await new Promise((res) => {
      const v = document.createElement('video'); v.muted = true; v.preload = 'metadata';
      const t = setTimeout(() => res(false), 20000);
      v.onloadedmetadata = () => { clearTimeout(t); res(v.videoWidth > 0); };
      v.onerror = () => { clearTimeout(t); res(false); };
      v.src = src;
    });
    if (!ok) bad.push(`file video broken: ${src}`);
  }
  return bad;
}, [...imgUrls], [...vidUrls]);
problems.push(...fileProblems);
console.log(`\nfiles   ${imgUrls.size} images and ${vidUrls.size} videos from projects.json, brand, hero frames, social images and icons: ${fileProblems.length ? 'PROBLEMS' : 'ok'}`);

await browser.close();
console.log(`\n${stats.pages} page loads, ${stats.images} <img>, ${stats.videos} <video>, ${stats.posters} posters checked on the pages`);
if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  problems.forEach((p) => console.log('  - ' + p));
  process.exit(1);
}
console.log('No 404s, no broken images, no broken videos.');
