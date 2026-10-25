import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Production site: https://classplay.online/ (GitHub Pages + custom domain)
export default defineConfig({
  site: 'https://classplay.online',
  base: '/',
  trailingSlash: 'always',
  integrations: [sitemap()],
});
