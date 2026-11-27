# SPEC arpon-02 — ARPÓN en el catálogo

> **Status:** borrador
> **Depends on:** SPEC 05, SPEC 06, SPEC 07, SPEC arpon-01
> **Date:** 2026-11-27
> **Objective:** Registrar el motor `arpon` en `lib/games/registry.ts`, añadir la fila `arpon` a `public.games` y comprobar que se juega en `/juegos/arpon/jugar` y guarda puntuaciones en Supabase.

---

## Por qué existe esta spec

La spec `arpon-01` entrega el motor aislado. Esta spec lo integra sin código nuevo de reproductor ni de guardado: reutiliza `EnginePlayer` (SPEC 07) y `saveScore` (SPEC 06). Solo hay una entrada de registro, una migración y la verificación de extremo a extremo.

---

## Scope

**In:**

- Entrada `arpon` en `lib/games/registry.ts`.
- Migración `add_game_arpon` en `public.games`: `id = 'arpon'`, `title = 'ARPÓN'`, `cat = 'SHOOTER'`, `cover = 'cover-invaders'`, `color = 'green'`, `short` y `long` en español con controles, puntuación y fin.
- Invalidar la caché `games` tras la migración.
- Verificación con Playwright del flujo completo: tarjeta, ficha, juego, pausa, fin, guardado y `/salon`.
- Comprobación de seguridad con `get_advisors`.
- Diseño de cualquier ajuste visual con el skill `frontend-design`, según `CLAUDE.md`.

**Out of scope (para specs futuras):**

- Cambios de reglas o balance del motor (van en una spec nueva sobre `arpon-01`).
- Portada propia `.cover-arpon`.
- Sonido, ratón y controles táctiles.
- Tocar Asteroides, Tetris o los juegos simulados.
- Antitrampas, auth y tests automatizados (no hay runner).

---

## Data model

```sql
-- Migración add_game_arpon
insert into public.games (id, title, short, long, cat, cover, color, position)
values (
  'arpon',
  'ARPÓN',
  'Caza criaturas abisales con un solo arpón y no pierdas el combo.',
  'Un buzo solitario en el lecho marino y un único arpón. Gira el punto de mira con ← →, lanza con ESPACIO y espera a que el arpón vuelva antes de disparar otra vez. Los peces dan 10 puntos, los rapes abisales 40 y los tiburones 100 (aguantan 3 impactos). Cada acierto seguido sube el combo hasta ×5; un fallo lo pierde. Evita las medusas: te quitan el arpón, el combo y 20 puntos. Los rapes nadan hacia ti y te quitan una vida. Tienes 3 vidas y subes de nivel cada 12 capturas. P pausa.',
  'SHOOTER',
  'cover-invaders',
  'green',
  (select coalesce(max(position), 0) + 1 from public.games)
);
```

```ts
// lib/games/registry.ts — entrada nueva
arpon: () => import("@/lib/games/arpon/engine"),
```

Convenciones:

- `id` en `games` coincide con la clave del registro y con la carpeta `lib/games/arpon/`.
- `best` y `plays` salen de `games_with_stats`; no se tocan.
- La portada reutiliza `cover-invaders` (ya definida en `app/globals.css`); no hay CSS nuevo.
- El motor se renderiza en `.crt-screen` con 4/3, igual que Asteroides.

---

## Implementation plan

Cada paso deja la app compilando y ejecutable (`npm run dev`).

1. Verificar que `lib/games/registry.ts`, `lib/games/engine.ts` y `components/engine-player.tsx` existen y que `lib/games/arpon/engine.ts` (spec 01) está presente. No volver a especificarlos. Verificación: `npm run build`.
2. Leer en `node_modules/next/dist/docs/` lo relevante a `cacheComponents` y a la invalidación de caché con `updateTag`/`revalidateTag` antes de tocar código Next.js.
3. Añadir `arpon` a `lib/games/registry.ts` con el import dinámico indicado. Verificación: `npm run build`.
4. Aplicar la migración `add_game_arpon` con `apply_migration`. Verificación: `list_tables` y `select id, title, cat, cover, color, position from games`.
5. Invalidar la caché `games` (reiniciar dev o `revalidateTag('games')`). Verificación: `/juegos` muestra la tarjeta.
6. Ejecutar `get_advisors` de tipo security. Verificación: sin avisos nuevos.
7. Probar con Playwright (screenshots en `.playwright-screenshots/`, p. ej. `arpon-juego.png`): tarjeta en `/juegos` y filtro SHOOTER, ficha `/juegos/arpon`, jugar (apuntar, lanzar, acertar un pez, tocar una medusa, perder una vida con un rape, pausa con botón y con `P`, FIN, JUGAR DE NUEVO), guardar una puntuación, comprobar `/juegos/arpon` y `/salon`, navegar fuera y volver, comprobar 375 px. Verificación: capturas guardadas sin errores de consola.
8. Borrar las filas de prueba de `scores` con `execute_sql` (`delete from scores where game_id = 'arpon' and name like 'TEST%'`). Verificación: `select count(*)` de esas filas devuelve 0.

---

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] La fila `arpon` existe en `public.games` (SHOOTER, `cover-invaders`, `green`); `/juegos` muestra la tarjeta ARPÓN y aparece al filtrar por SHOOTER.
- [ ] `/juegos/arpon` muestra la ficha con el texto `long`, que explica controles, puntuación y fin.
- [ ] `/juegos/arpon/jugar` muestra el canvas 640×480 en la pantalla CRT (4/3), sin deformar y sin scroll horizontal a 375 px.
- [ ] `app/juegos/[id]/jugar/page.tsx` no se modifica y elige `EnginePlayer` vía `hasEngine('arpon')`.
- [ ] `←` `→` y `Espacio` no hacen scroll de la página dentro del reproductor.
- [ ] El HUD de la plataforma (Puntuación, Vidas, Nivel, Combo) coincide con los valores de la lógica.
- [ ] PAUSA y la tecla `P` congelan el juego y muestran "EN PAUSA"; el botón pasa a REANUDAR en ambos casos; reanudar no produce saltos.
- [ ] FIN y perder las 3 vidas abren el modal FIN DEL JUEGO con la puntuación final.
- [ ] JUGAR DE NUEVO reinicia con puntuación 0, vidas 3, nivel 1, combo 0 y cierra el modal.
- [ ] Guardar una puntuación la muestra en `/juegos/arpon` y en `/salon` (pestaña ARPÓN); `plays` sube en 1.
- [ ] Navegar a otra página y volver no duplica velocidad ni entradas (un solo loop y un solo listener).
- [ ] Asteroides y Tetris siguen funcionando en `EnginePlayer`; los simulados siguen en `GamePlayer`.
- [ ] Recargar `/juegos/arpon/jugar` no produce errores de hidratación ni de consola.
- [ ] `get_advisors` de seguridad no reporta avisos nuevos.
- [ ] Las filas de prueba se borran de `scores` al terminar la verificación.

---

## Decisions

- **Yes:** fila nueva `arpon` en `games`. Decisión cerrada de `/add-game`.
- **Yes:** `EnginePlayer` + registro, sin reproductor propio. Decisión cerrada de `/add-game`.
- **Yes:** guardado con `ScoreSaveForm` → `saveScore` de SPEC 06. No se crea otro flujo.
- **Yes:** `cat = SHOOTER` y `color = green`. Decisión del agente game-jam; los otros dos juegos del jam usan ARCADE/cyan y PUZZLE/yellow.
- **Yes:** reutilizar `cover-invaders`. Decisión del agente game-jam; sin CSS nuevo aunque comparta portada con INVASORES.
- **No:** `.cover-arpon` propia. Va en otra spec si se quiere diferenciar.
- **No:** tocar el motor en esta spec. Cualquier ajuste de reglas va en una spec nueva.

---

## Risks

| Riesgo                                               | Mitigación                                                                 |
| ---------------------------------------------------- | -------------------------------------------------------------------------- |
| Catálogo cacheado no muestra el juego nuevo          | Paso 5 invalida el tag `games`.                                            |
| `id` del registro distinto del `id` de `games`       | Criterio de aceptación sobre `hasEngine('arpon')` y la ruta de juego.      |
| El acento de `ARPÓN` rompe la validación o el filtro | El `title` va en UTF-8 como CAÍDA y GLOTÓN; el `id` es `arpon` sin acento. |
| Filas de prueba contaminan el leaderboard            | Paso 8 las borra con `execute_sql`; nombres con prefijo `TEST`.            |
| Cambios de API de Next.js 16 (`cacheComponents`)     | El paso 2 obliga a leer `node_modules/next/dist/docs/` antes de codificar. |

---

## What is **not** in this spec

- Cambios de reglas o balance del motor.
- Portada propia, sonido, ratón y controles táctiles.
- Tocar otros juegos, reproductores o el contrato de motor.
- Antitrampas, auth y tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propia spec.
