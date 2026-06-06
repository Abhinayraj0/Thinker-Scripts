// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	site: 'https://thinkerscripts.com',
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
		cacheDir: '.vite',
		plugins: [tailwindcss()],
	},
});
