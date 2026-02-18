import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    csrf: {
      // Désactive la vérification Origin (sinon 403 en prod si proxy enlève l’en-tête ou ORIGIN incorrect)
      trustedOrigins: ['*'],
    },
  },
};

export default config;
