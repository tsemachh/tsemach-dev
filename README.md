# tsemach.dev

Personal home page of Tsemach Hadad — **https://tsemach.dev** (Hebrew) · **https://tsemach.dev/en/** (English).

It boots like an Atari 800XL (`READY` → `RUN "TSEMACH"`), plays a short Galaxian-style shooter whose exploding aliens fly
into the name, and settles into a bilingual, accessible page.

## Principles

- **KISS.** No framework, no runtime dependencies, no cookies. One build script (`tools/build.mjs`, plain Node) writes static HTML.
- **Accessible.** WCAG 2.2 AA checked with axe on every change; Reduce Motion gets a calm intro without the game.
- **Fast and safe.** Self-hosted, subset fonts; strict CSP with hashed inline scripts; ~16 KB of HTML.

## Layout

| Path | What |
|---|---|
| `src/content.mjs` | All text, projects, career levels and links (Hebrew + English) |
| `src/site.css`, `src/intro.js`, `src/game.js`, `src/nav.js` | Styles, intro, shooter, section nav + clips |
| `tools/build.mjs` | Builds `dist/` (pages, sitemap, headers, CSP) |
| `tools/check.mjs` | axe + screenshots in Chromium and WebKit |
| `tools/shots.mjs`, `tools/clips.mjs`, `tools/og.mjs`, `tools/fonts.mjs` | Screenshots, gameplay clips, share images, font subsets |
| `functions/_middleware.js` | `www` → apex redirect on Cloudflare Pages |

## Run

```sh
npm run build      # dist/  (no dependencies needed)
npm run serve      # http://localhost:4321  (?play shows the full intro)
npm install --include=dev && npm run check   # tests
```

Deployed by Cloudflare Pages on every push to `main` (build `npm run build`, output `dist`).

## License

Code: MIT. Fonts: Rubik and Rubik Pixels, SIL Open Font License (see `public/fonts/`).
