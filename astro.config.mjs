// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

export default defineConfig({
  site: 'https://omnyalab.com',
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
  vite: { build: { chunkSizeWarningLimit: 600 } },
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Inter Tight',
      cssVariable: '--font-inter-tight',
      // 600 only for the giant words on the Studio posters
      weights: [400, 600],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['Helvetica Neue', 'Arial', 'sans-serif'],
    },
  ],
});
