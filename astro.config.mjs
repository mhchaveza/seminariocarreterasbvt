// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://seminariocarreteras.udem.edu.co',
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  // Azure App Service enruta al contenedor: hay que escuchar en 0.0.0.0,
  // no en localhost. El puerto lo inyecta Azure vía la variable PORT.
  server: {
    host: true
  },
  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [sitemap()]
});