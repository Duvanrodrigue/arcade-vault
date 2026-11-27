# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arcade Vault: online game platform where players compete for highest score (README is in Spanish). Catalog and leaderboard live in Supabase. Two games are really playable (Asteroides, Tetris); the rest of the catalog still uses a simulated player. Auth (`/auth`) and session (`components/session-provider.tsx`) are still mock/client-side: no real login yet. No tests.

The project follows Spec Driven Design (`/spec` and `/spec-impl` workflow) using skills from `Klerith/fernando-skills`. Write/read the spec in `specs/` before implementing features.

## Commands

```bash
npm run dev     # next dev
npm run build   # next build
npm run start   # next start
npm run lint    # eslint (flat config: eslint.config.mjs)
npm run format  # prettier --write . (semi, double quotes, trailing commas)
```

No test runner configured.

## Stack

Next.js 16.4.5 (App Router, `app/` at repo root, no `src/`), React 19.3, TypeScript, Tailwind CSS 4 (via `@tailwindcss/turbopack`), ESLint 9 + Prettier, Supabase (`@supabase/ssr`, `@supabase/supabase-js`), Resend (contact email). Path alias `@/*` maps to repo root.

**This Next.js has breaking changes vs. older versions** (see `AGENTS.md`). Before writing Next.js code, read the relevant guide in `node_modules/next/dist/docs/` and heed deprecation notices. Data fetchers use `"use cache"` + `cacheTag(...)`; server actions invalidate with `updateTag`.

## Environment

Copy `.env.example` to `.env.local`. Variables:

- `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`: server only, used by `/acerca` contact form.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Supabase clients. Never use the service_role key.

Supabase MCP is configured in `.mcp.json` (project ref `aknsvkkafftjxhkayywr`).

## Routes

- `/` home landing (SPEC 02)
- `/juegos` library, `/juegos/[id]` detail, `/juegos/[id]/jugar` player (+ `actions.ts` with `saveScore`)(see C:\Users\duvan\OneDrive\Documents\ClaudeCode\05-arcade-vault\references\resources\implemented-games.md) when you need to check which games are implemented and how to implement new ones.
- `/salon` hall of fame / leaderboard
- `/acerca` about + contact form (`app/acerca/actions.ts`, Resend)
- `/auth` auth screen (mock)
- `app/juegos/error.tsx`, `app/salon/error.tsx` error boundaries with retry; `app/not-found.tsx`

## Architecture

- **Data layer**: `lib/games.ts` (`getGames`, `getGame` from the `games_with_stats` view) and `lib/scores.ts` (`getLeaderboard`) read Supabase through `lib/supabase/public.ts` (cached, no cookies). `lib/supabase/server.ts` / `client.ts` are the SSR/browser clients. Types in `lib/database.types.ts`. Tables: `games`, `scores`.
- **Saving scores**: `saveScore` server action (`app/juegos/[id]/jugar/actions.ts`) validates name (`/^[A-Z0-9_ ÑÁÉÍÓÚ-]{1,10}$/`, same as the DB CHECK), integer score 0–10,000,000 and that the game exists, inserts into `scores`, then `updateTag`. UI: `components/score-save-form.tsx` shown at game over.
- **Game engines** (SPEC 07): `lib/games/engine.ts` defines the contract (`EngineModule`: `width`, `height`, `hud`, `create(canvas, cb)` → `EngineControls`; `EngineSnapshot` reports `score/state/lives/level/extra` via `onChange`, only on change). `lib/games/registry.ts` maps game `id` → lazy engine import (`asteroides`, `tetris`); `hasEngine(id)` decides the player. Engines live in `lib/games/<name>/engine.ts`.
- **Players**: `components/engine-player.tsx` is the generic player for any registered engine (canvas, HUD, pause/restart, responsive sizing, score save). `components/game-player.tsx` is the old simulated player, used only for games without an engine.
- **Other components**: `library`, `game-card`, `hall-of-fame`, `nav`, `footer`, `reveal`, `signal-lost`, `contact-form`, `auth-form`, etc. in `components/`. Home data in `lib/home.ts`; formatting helpers in `lib/games-format.ts`.

## Specs

`specs/` (status in each header): 01 MVP visual screens, 02 home landing, 03 about + contact (Resend), 04 Supabase connection, 05 Asteroids playable, 06 catalog + leaderboard in Supabase, 07 Tetris + generic engine player. Next number is 08. Branch per spec (`spec-NN-<slug>`), merged by PR.

## Skills

Project skills in `.claude/skills/`: `/spec` (design a spec), `/spec-impl <NN-spec-name>` (implement an approved spec, creates branch, pauses for diff review), `/add-game`.

usa siempre /fronted-design para diseñar interfaces de usuarios.

Para añadir un juego jugable nuevo (de `references/resources/started-games/` o diseño propio) usa `/add-game <carpeta-de-referencia|descripción>`: lee la skill `/spec` y las specs existentes como referencia y genera la spec en `specs/`; luego se implementa con `/spec-impl`. La receta de integración (contrato de motor, registro, checklist de port) está en `.claude/skills/add-game/integration-recipe.md`. Juegos de referencia: `02-asteroids`, `03-tetris`, `04-arkanoid` (Arkanoid aún sin spec ni motor).

Para decidir qué juego añadir a continuación usa el agente `game-planner` (`.claude/agents/game-planner.md`): puntúa candidatos, recomienda uno y entrega la línea `/add-game ...`. Su memoria de sugerencias vive en `.claude/agent-memory/game-planner/` y mantiene además el todo `references/resources/game-suggestions-todo.md` (propuestos, aceptados, implementados, rechazados); solo escribe en esos dos sitios.

Para generar varios juegos a partir de un tema usa el agente `game-jam` (`.claude/agents/game-jam.md`): recibe un tema, diseña 3 juegos originales y crea `specs/game-jam/<game-id>/` con al menos 2 specs en `borrador` por juego, con la forma de SPEC 07. Solo escribe specs.

## Hooks

`.claude/settings.json` runs `.claude/hooks/format-lint.mjs` after every Write/Edit (Prettier + ESLint on the edited file; ignores `node_modules`, `.next`, `references`, `.git`).

## Design reference

`references/resources/templates/` holds a static prototype of the intended UI: `Arcade Vault.html`, `styles.css`, and JSX mockups per screen (`auth`, `biblioteca` = game library, `detalle` = game detail, `reproductor` = player, `salon` = leaderboard/hall, `nav`, `data` = mock data, `app`), plus `home-about/` (home and about). Use it as the visual/behavioral source when building real pages; it is not part of the Next.js build.

## Playwright

Guarda todos los screenshots de Playwright en el directorio `.playwright-screenshots/` (usa `filename: ".playwright-screenshots/<nombre>.png"`).
