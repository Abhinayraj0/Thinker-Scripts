# Thinker Scripts

Astro static MPA for Thinker Scripts.

## Commands

```sh
npm install
npm run dev
npm run build
npm run preview
```

## Cloudflare Workers

Use Cloudflare Workers Static Assets for deployment.

Worker configuration lives in `wrangler.jsonc`:

```txt
name: thinker-scripts
assets.directory: ./dist
compatibility_date: 2026-06-06
```

CLI deploy, after Cloudflare authentication:

```sh
npm run deploy
```

The deploy script builds the Astro site and publishes `dist` as Workers Static Assets.
It runs `npm run build:public`, which removes private local-only routes such as `/control-center/` from `dist` before publishing.

Cloudflare Pages deployment is still available as a fallback:

```sh
npm run deploy:pages
```
