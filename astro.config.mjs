// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import { existsSync } from 'node:fs';

/** Local preview only: serves the Vercel functions in /api (slots, book) from the dev server. */
const devApi = () => ({
  name: 'omnya-dev-api',
  /** @param {import('vite').ViteDevServer} server */
  configureServer(server) {
    for (const [k, v] of Object.entries(loadEnv('development', server.config.root, ''))) process.env[k] ??= v;
    // same as the vercel.json rewrite: /city/@username is the one house page
    server.middlewares.use((req, _res, next) => {
      const p = decodeURIComponent((req.url || '').split('?')[0]);
      if (/^\/city\/[^/]+\/?$/.test(p) && !/^\/city\/house\/?$/.test(p) && !existsSync(`${server.config.root}/public${p}`)) req.url = '/city/house/';
      next();
    });
    server.middlewares.use('/api', async (req, res, next) => {
      // /api/city/link → api/city.js (the function reads the action from the path)
      const name = (req.url || '').split('?')[0].replace(/^\/+|\/+$/g, '').replace(/^city\/[a-z]+$/, 'city');
      if (!/^[a-z]+$/.test(name)) return next();
      try {
        const mod = await server.ssrLoadModule(`/api/${name}.js`);
        const fn = mod[req.method || 'GET'];
        if (!fn) return next();
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const body = chunks.length ? Buffer.concat(chunks) : undefined;
        const r = await fn(new Request(`http://localhost${req.originalUrl}`, { method: req.method, headers: /** @type {any} */ (req.headers), body }));
        res.statusCode = r.status;
        r.headers.forEach((v, k) => res.setHeader(k, v));
        res.end(Buffer.from(await r.arrayBuffer()));
      } catch (e) {
        next(e);
      }
    });
  },
});

export default defineConfig({
  site: 'https://www.omnyalab.com',
  server: { port: 5173, host: true },
  devToolbar: { enabled: false },
  // Corfu Resort is now Hygeia Grove. Real 301s live in vercel.json; these pages
  // are the fallback for any other static host and for the local preview.
  redirects: {
    '/work/corfu-resort': { status: 301, destination: '/work/hygeia-grove' },
    '/it/work/corfu-resort': { status: 301, destination: '/it/work/hygeia-grove' },
  },
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  // three.js is a separate chunk, loaded only on desktop for the home WebGL
  vite: { build: { chunkSizeWarningLimit: 600 }, plugins: [devApi()] },
});
