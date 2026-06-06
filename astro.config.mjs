// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
	site: 'https://thinkerscripts.com',
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
		cacheDir: '.vite',
		plugins: [tailwindcss()],
	},
});
