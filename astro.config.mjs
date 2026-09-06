// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://laurenbechererpottery.com',
  output: 'static',
  trailingSlash: 'always',
  integrations: [
    sitemap({
      // Client portal pages are private-by-link; keep them out of the sitemap.
      filter: (page) => !page.includes('/client/'),
    }),
  ],
  vite: {
    // model-viewer ships as an ES module; make sure it is bundled for the browser.
    optimizeDeps: { include: ['@google/model-viewer'] },
    // The 3D viewer bundle is ~1 MB (300 KB gzipped) and only loads on pages with a model.
    build: { chunkSizeWarningLimit: 1200 },
  },
});
