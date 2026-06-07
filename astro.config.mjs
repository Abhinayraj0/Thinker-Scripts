// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	site: 'https://thinker-scripts.araj20164.workers.dev',
	devToolbar: {
		enabled: false,
	},
	integrations: [mdx()],
	markdown: {
		shikiConfig: {
			themes: {
				light: 'github-light',
				dark: 'github-dark',
			},
			wrap: true,
		},
	},
	vite: {
		cacheDir: process.env.VITE_CACHE_DIR ?? '.vite',
		plugins: [tailwindcss()],
	},
});
