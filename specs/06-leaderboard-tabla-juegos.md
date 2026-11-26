# SPEC 06 — Catálogo de juegos y leaderboard en Supabase

> **Status:** aprobado
> **Depends on:** SPEC 04, SPEC 05
> **Date:** 2026-11-26
> **Objective:** Mover el catálogo de juegos a una tabla `games` de Supabase y sustituir las puntuaciones ficticias por un leaderboard real en una tabla `scores`, alimentado desde el modal de fin de partida.

---

## Por qué existe esta spec

Hoy el catálogo es un array en `lib/games.ts` y todas las puntuaciones son inventadas: `seededScores` en `lib/scores.ts` genera rankings con una semilla, y `best`/`plays` son números fijos. El modal de `GamePlayer` guarda en `localStorage.av_scores`, que nadie lee. SPEC 04 dejó los clientes de Supabase listos sin ninguna tabla. Esta spec crea las dos primeras tablas y conecta la UI existente a ellas.

No hay auth real (`av_user` es solo localStorage). Las puntuaciones se envían anónimas con un nombre de hasta 10 caracteres. Se acepta que se pueden falsear.

---

## Scope

**In:**

- Migración Supabase `create_games_and_scores` (vía `apply_migration` del MCP):
  - Tabla `public.games` con los 9 juegos actuales de `lib/games.ts` (sin `best` ni `plays`).
  - Tabla `public.scores` (nombre, puntuación, juego, fecha).
  - Vista `public.games_with_stats`: cada juego con `best = MAX(score)` y `plays = COUNT(*)`, 0 si no hay partidas.
  - Vista `public.leaderboard`: mejor marca por `(game_id, name)` con su rango por juego.
  - RLS: `games` solo SELECT para `anon`; `scores` SELECT e INSERT para `anon`, sin UPDATE ni DELETE.
  - Restricciones CHECK que validan nombre y puntuación.
- Arranque vacío: ninguna puntuación semilla.
- `lib/database.types.ts` generado con `generate_typescript_types`.
- Capa de datos de servidor:
  - `lib/games.ts`: conserva tipos (`Game`, `GameCategory`, `GameColor`) y `CATS`. Elimina el array `GAMES`. Añade `getGames()` y `getGame(id)` que leen `games_with_stats`, con `'use cache'` + `cacheTag('games')` y `cacheTag('scores')`.
  - `lib/scores.ts`: elimina `seededScores`, `SavedScore` y la lista `PLAYERS`. Añade `getLeaderboard(gameId, limit)` y `getPlayerBest(gameId, name)`, con `'use cache'` + `cacheTag('scores')`.
- Server Action `saveScore` en `app/juegos/[id]/jugar/actions.ts`:
  - Valida nombre (trim, mayúsculas, 1–10 caracteres), puntuación (entero, 0–10 000 000) y que el juego exista.
  - Inserta con el cliente de `lib/supabase/server.ts`.
  - Invalida el tag `scores` para que Salón, ficha, tarjetas y home muestren la marca nueva.
  - Devuelve `{ ok: true }` o `{ ok: false, error }`; nunca lanza al cliente.
- Pantallas que pasan a leer Supabase:
  - `app/page.tsx` (home): los 6 primeros juegos de `getGames()`.
  - `components/library.tsx` (`/juegos`): recibe `games` por prop desde `app/juegos/page.tsx`.
  - `components/game-card.tsx`: `best` real (0 se muestra como `—`).
  - `app/juegos/[id]/page.tsx`: ficha con `plays` y `best` reales y top 10 de `getLeaderboard`. `generateStaticParams` usa `getGames()`.
  - `app/juegos/[id]/jugar/page.tsx`: `getGame` y `generateStaticParams` desde Supabase.
  - `/salon` (`components/hall-of-fame.tsx`): pestañas desde `getGames()`, podio y top 12 de `getLeaderboard`. El componente de servidor carga los rankings; el cliente solo cambia de pestaña.
- Fila "TU MEJOR MARCA" del Salón: real. Si hay `av_user`, muestra la mejor marca cuyo `name = user.name` en ese juego y su rango. Si no existe, la fila no se muestra.
- Estados vacíos: sin partidas, ficha y Salón muestran "SIN PUNTUACIONES AÚN" y el podio no se dibuja.
- Guardado desde **todos** los juegos:
  - `components/game-player.tsx` (8 simulados): `saveScore` local con `av_scores` se sustituye por la Server Action.
  - `components/asteroids-player.tsx`: el modal FIN DEL JUEGO gana el mismo campo de iniciales y botón GUARDAR PUNTUACIÓN.
  - Estados del botón: `GUARDAR PUNTUACIÓN` → `GUARDANDO…` (deshabilitado) → `▸ PUNTUACIÓN GUARDADA_`, o `ERROR AL GUARDAR` con el botón activo para reintentar.
  - Campo prerrellenado con `user?.name`; vacío si no hay sesión (ya no `INVITADO`).
- Errores de lectura: `app/juegos/error.tsx` y `app/salon/error.tsx` (client) muestran "SEÑAL PERDIDA" y un botón REINTENTAR (`reset`).
- Diseño de interfaces con el skill `frontend-design`, según `CLAUDE.md`.

**Out of scope (para specs futuras):**

- Autenticación real, perfiles o vincular puntuaciones a un usuario.
- Antitrampas: validación de la puntuación en el servidor, rate limiting o captcha.
- Moderación de nombres (palabrotas, suplantación).
- Editar o borrar puntuaciones; panel de administración del catálogo.
- Puntuaciones semilla o ficticias.
- Fallback local del catálogo si Supabase no responde.
- Cola offline de puntuaciones en localStorage.
- Filtros por periodo (semana, mes) o paginación del leaderboard.
- Campo de dificultad real (sigue siendo texto fijo en la ficha).
- Realtime (el ranking no se actualiza solo mientras se mira).
- Tests automatizados (no hay runner configurado).

---

## Data model

```sql
-- public.games
create table public.games (
  id        text primary key,            -- 'asteroides'
  title     text not null,
  short     text not null,
  long      text not null,
  cat       text not null check (cat in ('ARCADE','PUZZLE','SHOOTER','VERSUS')),
  cover     text not null,               -- clase CSS, p. ej. 'cover-rocas'
  color     text not null check (color in ('cyan','magenta','yellow','green')),
  position  int  not null unique         -- orden actual de lib/games.ts (1..9)
);

-- public.scores
create table public.scores (
  id         bigint generated always as identity primary key,
  game_id    text not null references public.games(id),
  name       text not null check (name ~ '^[A-Z0-9_ ÑÁÉÍÓÚ-]{1,10}$'),
  score      int  not null check (score between 0 and 10000000),
  created_at timestamptz not null default now()
);
create index scores_game_score_idx on public.scores (game_id, score desc);

-- public.games_with_stats: games.* + best int (coalesce max, 0) + plays int (count)
-- public.leaderboard: game_id, name, score (mejor del nombre), created_at de esa marca,
--   rank = row_number() over (partition by game_id order by score desc, created_at asc)
-- Ambas vistas con security_invoker = true.
```

```ts
// lib/games.ts
export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;
  color: GameColor;
  best: number; // de games_with_stats
  plays: number; // antes string ("12.4K"); ahora número
}
export async function getGames(): Promise<Game[]>; // orden por position
export async function getGame(id: string): Promise<Game | undefined>;

// lib/scores.ts
export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;
} // date "dd/mm/aaaa"
export async function getLeaderboard(
  gameId: string,
  limit: number,
): Promise<ScoreRow[]>;
export async function getPlayerBest(
  gameId: string,
  name: string,
): Promise<ScoreRow | null>;

// app/juegos/[id]/jugar/actions.ts
export async function saveScore(input: {
  gameId: string;
  name: string;
  score: number;
}): Promise<{ ok: true } | { ok: false; error: string }>;
```

Convenciones:

- `plays` se muestra formateado (`1,2K`) con `toLocaleString("es-ES", { notation: "compact" })`.
- `best = 0` y `plays = 0` significan "sin partidas"; la UI muestra `—`.
- Empate de puntuación: gana la marca más antigua.
- Solo la publishable key; nunca `service_role`.

---

## Implementation plan

Cada paso deja la app compilando y ejecutable (`npm run dev`).

1. Leer en `node_modules/next/dist/docs/` las guías de `'use cache'`, `cacheTag`, `updateTag`/`revalidateTag`, Server Actions, `error.tsx` y `generateStaticParams` con `cacheComponents` activo. Consultar `search_docs` de Supabase sobre RLS para `anon` y vistas con `security_invoker`.
2. Aplicar la migración `create_games_and_scores` con tablas, vistas, índice, RLS y los 9 `INSERT` de juegos copiados de `lib/games.ts`. Verificación: `list_tables` muestra `games` y `scores`; `select count(*) from games` = 9; `get_advisors` (security) sin avisos de RLS.
3. Generar `lib/database.types.ts` y tipar los clientes de `lib/supabase/`. Verificación: `npm run build`.
4. Reescribir `lib/games.ts` con `getGames`/`getGame` cacheados y migrar sus consumidores (home, `/juegos`, ficha, jugar, `GameCard`). El array `GAMES` desaparece. Verificación: las tres pantallas muestran los 9 juegos con `—` en mejor marca.
5. Reescribir `lib/scores.ts` con `getLeaderboard`/`getPlayerBest` y conectar la ficha (top 10) y el Salón (pestañas, podio, top 12, TU MEJOR MARCA). Estados vacíos "SIN PUNTUACIONES AÚN". Verificación: ambas pantallas muestran el estado vacío.
6. Crear `app/juegos/error.tsx` y `app/salon/error.tsx` con "SEÑAL PERDIDA" + REINTENTAR.
7. Crear la Server Action `saveScore` con validación e invalidación del tag `scores`.
8. Conectar el modal de `GamePlayer` a `saveScore` con los estados GUARDANDO/GUARDADA/ERROR. Eliminar `av_scores` del código.
9. Añadir campo de iniciales y GUARDAR PUNTUACIÓN al modal de `AsteroidsPlayer`, con el mismo comportamiento.
10. Probar con Playwright (screenshots en `.playwright-screenshots/`): guardar una partida en ASTEROIDES y en un simulado, ver la marca en ficha, Salón, tarjeta y TU MEJOR MARCA; borrar las filas de prueba con `execute_sql` al terminar.

---

## Acceptance criteria

- [ ] `npm run build` termina sin errores de TypeScript ni de compilación.
- [ ] `npm run lint` termina sin errores.
- [ ] `list_tables` muestra `games` (9 filas) y `scores`; RLS activo en ambas.
- [ ] `get_advisors` de tipo security no devuelve avisos sobre `games`, `scores` ni las vistas.
- [ ] Con la publishable key, `update` y `delete` sobre `scores` y cualquier escritura sobre `games` son rechazados.
- [ ] Insertar un `name` de 11 caracteres o un `score` negativo es rechazado por la base de datos.
- [ ] `lib/games.ts` ya no exporta `GAMES`; `seededScores`, `SavedScore` y `PLAYERS` ya no existen.
- [ ] Ningún archivo de `app/`, `components/` o `lib/` contiene `av_scores`.
- [ ] Cambiar el `title` de un juego en Supabase e invalidar el tag `games` cambia el título en `/juegos`.
- [ ] Con `scores` vacía, la ficha y el Salón muestran "SIN PUNTUACIONES AÚN" y las tarjetas muestran `—` en mejor marca.
- [ ] Guardar una puntuación en ASTEROIDES la muestra en `/juegos/asteroides` y en `/salon` (pestaña ASTEROIDES) sin recargar la caché a mano.
- [ ] Guardar una puntuación en un juego simulado (p. ej. CAÍDA) funciona igual.
- [ ] `plays` sube en 1 y `best` muestra la mayor marca tras cada guardado.
- [ ] Un mismo nombre con dos marcas aparece una sola vez en el ranking, con la mayor.
- [ ] Con `av_user` = `X`, la fila TU MEJOR MARCA muestra la mejor marca y el rango reales de `X`; sin marcas de `X`, la fila no aparece.
- [ ] El botón de guardar se deshabilita mientras guarda y no permite guardar dos veces la misma partida.
- [ ] Con la red cortada (Playwright offline) al guardar, el modal muestra ERROR AL GUARDAR y el botón permite reintentar.
- [ ] Con una URL de Supabase inválida, `/juegos` y `/salon` muestran "SEÑAL PERDIDA" y REINTENTAR.
- [ ] Recargar `/`, `/juegos`, `/juegos/asteroides` y `/salon` no produce errores de hidratación ni en la consola.
- [ ] Las filas de prueba se borran de `scores` al final de la verificación.

---

## Decisions

- **Yes:** tabla `games` en Supabase como única fuente del catálogo. Decisión del usuario.
- **No:** fallback local con `lib/games.ts`. Dos fuentes de verdad que se desincronizan.
- **Yes:** `best` y `plays` calculados desde `scores` con la vista `games_with_stats`. Decisión del usuario; los números dejan de ser ficticios.
- **No:** columnas fijas `best`/`plays` en `games`. No reflejarían partidas reales.
- **Yes:** columna `position` para mantener el orden actual del catálogo.
- **Yes:** inserts anónimos con nombre de hasta 10 caracteres. Decisión del usuario; no hay auth real.
- **No:** Supabase Auth en esta spec. Amplía mucho el alcance; va en otra spec.
- **Yes:** guardar desde todos los juegos, incluidos los simulados. Decisión del usuario, aunque sus puntuaciones no son de juego real.
- **Yes:** ranking con la mejor marca por nombre. Evita que un jugador llene la tabla.
- **No:** ranking con todas las partidas crudas.
- **Yes:** Server Action con validación + CHECK y RLS en la base. Doble barrera; la publishable key es pública.
- **No:** insert directo desde el navegador. Solo RLS validaría.
- **Yes:** arranque vacío con estado "SIN PUNTUACIONES AÚN". Decisión del usuario.
- **No:** puntuaciones semilla.
- **Yes:** TU MEJOR MARCA real, buscada por nombre. Decisión del usuario.
- **Yes:** `'use cache'` con tags `games` y `scores`; la Server Action invalida `scores`. Catálogo rápido y marcas nuevas visibles al instante.
- **No:** todo dinámico sin caché.
- **Yes:** `error.tsx` con REINTENTAR si Supabase falla.
- **Yes:** error visible + reintento si falla el guardado.
- **No:** cola offline en localStorage.
- **Yes:** migración vía `apply_migration` del MCP. El repo no tiene carpeta `supabase/`; la migración queda registrada en el proyecto.
- **Yes:** `plays` pasa de `string` a `number`. Ahora es un conteo real.

---

## Risks

| Riesgo                                                             | Mitigación                                                                                                           |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Cualquiera puede enviar puntuaciones falsas con la publishable key | Aceptado por el usuario; CHECK limita rango y formato. Antitrampas en otra spec.                                     |
| Spam de inserts llena `scores`                                     | Fuera de alcance; RLS impide borrar o editar. Rate limiting en otra spec.                                            |
| `'use cache'` sirve rankings viejos                                | La Server Action invalida el tag `scores`; criterio de aceptación lo comprueba.                                      |
| `'use cache'` no puede leer `cookies()`                            | Las lecturas cacheadas usan un cliente sin cookies (solo publishable key); el paso 1 obliga a leer la documentación. |
| `generateStaticParams` falla en build si Supabase no responde      | El build depende de Supabase; documentado. Reanudar el proyecto si está pausado.                                     |
| Proyecto Supabase gratuito pausado                                 | `error.tsx` muestra SEÑAL PERDIDA; reanudar desde el dashboard.                                                      |
| Vistas sin `security_invoker` saltan RLS                           | Se crean con `security_invoker = true`; `get_advisors` lo verifica.                                                  |
| Nombres ofensivos o suplantación                                   | Fuera de alcance; moderación en otra spec.                                                                           |

---

## What is **not** in this spec

- Autenticación real y puntuaciones ligadas a usuarios.
- Antitrampas, rate limiting y moderación de nombres.
- Edición o borrado de puntuaciones y panel de administración.
- Datos semilla, fallback local y cola offline.
- Filtros por periodo, paginación y realtime.
- Tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propia spec.
