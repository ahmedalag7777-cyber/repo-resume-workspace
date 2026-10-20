# Cloudflare Compatibility Assessment — 2026-09-17

## Current architecture

Report-Advisor is currently a **React + Vite single-page application**, not a Next.js SSR application. `vite.config.ts` uses the React Vite plugin and emits a static `dist` build; `package.json` has React/Vite dependencies and no Next.js runtime dependency.

## Cloudflare target

The correct immediate Cloudflare target is **Cloudflare Pages for the existing SPA**, with:

- Build command: `npm run build`
- Build output: `dist`
- Production branch: `main`
- Supabase remains the application data/auth backend.

Cloudflare documents direct React and Vite support on Pages. Pages also provides SPA rendering when no top-level `404.html` is present, which matches the current repository layout. No global `_redirects` rewrite is added because Pages already provides the SPA fallback and a catch-all rewrite can interfere with static assets. [Cloudflare React guide](https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/) [Cloudflare SPA serving](https://developers.cloudflare.com/pages/configuration/serving-pages/)

## What is proven now

- Static Vite build configuration is deterministic and repository-native.
- No Next.js runtime dependency is present.
- No Next.js `pages/`/`app/` server convention is used by the current project structure.
- No top-level `404.html` is present in `public/`, so the current SPA route model is compatible with Pages' default SPA behavior.
- A dedicated CI compatibility checker now validates these conditions on the exact source SHA.

## Not claimed yet

This is **not** a production Cloudflare deployment proof. The following remain separate runtime work:

- actual Cloudflare Pages deployment identity;
- custom-domain routing and TLS;
- Supabase Auth/browser behavior from the Cloudflare origin;
- CDN/cache behavior and stale-asset invalidation;
- Cloudflare Pages/Workers Functions, if introduced later;
- R2 migration or object lifecycle changes.

## Workers / SSR

Cloudflare Workers supports React + Vite applications, but this repository does not currently require a Worker SSR runtime. A Workers migration should remain a separate architecture decision rather than be mixed into the current static SPA certification path.

## R2 decision gate

R2 remains an optional storage target for large documents, OCR artifacts, exports, reports, and temporary objects. No production storage migration is performed by this compatibility front. Before any R2 migration, prove object naming, tenant isolation, signed-access model, lifecycle/retention, restore behavior, and exact artifact provenance.
