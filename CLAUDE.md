# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arcade Vault: online game platform where players compete for highest score (README is in Spanish). Early stage: `app/` is still the unmodified Create Next App scaffold (`layout.tsx`, `page.tsx`, `globals.css`). No tests, no backend, no data layer yet.

The README says the project follows Spec Driven Design (`/spec` and `/spec-impl` workflow) using skills from `Klerith/fernando-skills` (`npx skills@latest add Klerith/fernando-skills`). Write/read the spec before implementing features.

## Commands

```bash
npm run dev     # next dev
npm run build   # next build
npm run start   # next start
npm run lint    # eslint (flat config: eslint.config.mjs)
```

No test runner configured.

## Stack

Next.js 16.4.5 (App Router, `app/` at repo root, no `src/`), React 19.3, TypeScript, Tailwind CSS 4 (via `@tailwindcss/turbopack`), ESLint 9. Path alias `@/*` maps to repo root.

**This Next.js has breaking changes vs. older versions** (see `AGENTS.md`). Before writing Next.js code, read the relevant guide in `node_modules/next/dist/docs/` and heed deprecation notices.

## Skills
usa siempre /fronted-design para diseñar interfaces de usuarios.


## Design reference

`iISLvhOSlu40WkgeVXdW_resources/resources/templates/` (untracked) holds a static prototype of the intended UI: `Arcade Vault.html`, `styles.css`, and JSX mockups per screen (`auth`, `biblioteca` = game library, `detalle` = game detail, `reproductor` = player, `salon` = leaderboard/hall, `nav`, `data` = mock data, `app`). Use it as the visual/behavioral source when building real pages; it is not part of the Next.js build.


## Playwright

Guarda todos los screenshots de Playwright en el directorio `.playwright-screenshots/` (usa `filename: ".playwright-screenshots/<nombre>.png"`).
