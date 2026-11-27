# SPEC perlas-02 — PERLAS en el catálogo

> **Status:** borrador
> **Depends on:** SPEC 05, SPEC 06, SPEC 07, SPEC perlas-01
> **Date:** 2026-11-27
> **Objective:** Registrar el motor `perlas` en `lib/games/registry.ts`, añadir la fila `perlas` a `public.games` y comprobar que se juega en `/juegos/perlas/jugar` y guarda puntuaciones en Supabase.

---

## Por qué existe esta spec

La spec `perlas-01` entrega el motor aislado. Esta spec lo integra sin código nuevo de reproductor ni de guardado: reutiliza `EnginePlayer` (SPEC 07) y `saveScore` (SPEC 06). Solo hay una entrada de registro, una migración y la verificación de extremo a extremo.

---

## Scope

**In:**

- Entrada `perlas` en `lib/games/registry.ts`.
- Migración `add_game_perlas` en `public.games`: `id = 'perlas'`, `title = 'PERLAS'`, `cat = 'PUZZLE'`, `cover = 'cover-glot'`, `color = 'yellow'`, `short` y `long` en español con controles, puntuación y fin.
- Invalidar la caché `games` tras la migración.
- Verificación con Playwright del flujo completo: tarjeta, ficha, juego, pausa, fin, guardado y `/salon`.
- Comprobación de seguridad con `get_advisors`.
- Diseño de cualquier ajuste visual con el skill `frontend-design`, según `CLAUDE.md`.

**Out of scope (para specs futuras):**

- Cambios de reglas o balance del motor (van en una spec nueva sobre `perlas-01`).
- Portada propia `.cover-perlas`.
- Sonido, ratón y controles táctiles.
- Tocar Asteroides, Tetris o los juegos simulados.
- Antitrampas, auth y tests automatizados (no hay runner).

---

## Data model

```sql
-- Migración add_game_perlas
insert into public.games (id, title, short, long, cat, cover, color, position)
values (
  'perlas',
  'PERLAS',
  'Agrupa perlas del mismo color antes de que suba la marea.',
  'Un lecho de perlas de cuatro colores y una marea que sube una fila cada pocos segundos. Mueve el cursor con las flechas y pulsa ESPACIO o ENTER para recoger el grupo de perlas del mismo color que tocan entre sí (mínimo 2): 2 perlas dan 10 puntos, 3 dan 40, 4 dan 90 y así sucesivamente, multiplicado por tu nivel. Subes de nivel cada 30 perlas y la marea se acelera. Vaciar el lecho da 500 puntos por nivel. La partida termina si una perla sale por arriba. P pausa.',
  'PUZZLE',
  'cover-glot',
  'yellow',
  (select coalesce(max(position), 0) + 1 from public.games)
);
```

```ts
// lib/games/registry.ts — entrada nueva
perlas: () => import("@/lib/games/perlas/engine"),
```

Convenciones:

- `id` en `games` coincide con la clave del registro y con la carpeta `lib/games/perlas/`.
- `best` y `plays` salen de `games_with_stats`; no se tocan.
- La portada reutiliza `cover-glot` (ya definida en `app/globals.css`); no hay CSS nuevo.
- El motor se renderiza en `.crt-screen` con `aspectRatio: 480 / 600` (4/5).

---

## Implementation plan

Cada paso deja la app compilando y ejecutable (`npm run dev`).

1. Verificar que `lib/games/registry.ts`, `lib/games/engine.ts` y `components/engine-player.tsx` existen y que `lib/games/perlas/engine.ts` (spec 01) está presente. No volver a especificarlos. Verificación: `npm run build`.
2. Leer en `node_modules/next/dist/docs/` lo relevante a `cacheComponents` y a la invalidación de caché con `updateTag`/`revalidateTag` antes de tocar código Next.js.
3. Añadir `perlas` a `lib/games/registry.ts` con el import dinámico indicado. Verificación: `npm run build`.
4. Aplicar la migración `add_game_perlas` con `apply_migration`. Verificación: `list_tables` y `select id, title, cat, cover, color, position from games`.
5. Invalidar la caché `games` (reiniciar dev o `revalidateTag('games')`). Verificación: `/juegos` muestra la tarjeta.
6. Ejecutar `get_advisors` de tipo security. Verificación: sin avisos nuevos.
7. Probar con Playwright (screenshots en `.playwright-screenshots/`, p. ej. `perlas-juego.png`): tarjeta en `/juegos` y filtro PUZZLE, ficha `/juegos/perlas`, jugar (mover cursor, eliminar grupos de 2 y 3, marea, pausa con botón y con `P`, FIN, JUGAR DE NUEVO), guardar una puntuación, comprobar `/juegos/perlas` y `/salon`, navegar fuera y volver, comprobar 375 px. Verificación: capturas guardadas sin errores de consola.
8. Borrar las filas de prueba de `scores` con `execute_sql` (`delete from scores where game_id = 'perlas' and name like 'TEST%'`). Verificación: `select count(*)` de esas filas devuelve 0.

---

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] La fila `perlas` existe en `public.games` (PUZZLE, `cover-glot`, `yellow`); `/juegos` muestra la tarjeta PERLAS y aparece al filtrar por PUZZLE junto a CAÍDA y TETRIS.
- [ ] `/juegos/perlas` muestra la ficha con el texto `long`, que explica controles, puntuación y fin.
- [ ] `/juegos/perlas/jugar` muestra el canvas 480×600 en la pantalla CRT (4/5), sin deformar y sin scroll horizontal a 375 px.
- [ ] `app/juegos/[id]/jugar/page.tsx` no se modifica y elige `EnginePlayer` vía `hasEngine('perlas')`.
- [ ] Las flechas, `Espacio` y `Enter` no hacen scroll de la página dentro del reproductor.
- [ ] El HUD de la plataforma (Puntuación, Nivel, Perlas) coincide con los valores de la lógica.
- [ ] PAUSA y la tecla `P` congelan el juego (incluida la marea) y muestran "EN PAUSA"; el botón pasa a REANUDAR en ambos casos.
- [ ] FIN y que la marea expulse una perla abren el modal FIN DEL JUEGO con la puntuación final.
- [ ] JUGAR DE NUEVO reinicia con puntuación 0, perlas 0, nivel 1 y 6 filas llenas, y cierra el modal.
- [ ] Guardar una puntuación la muestra en `/juegos/perlas` y en `/salon` (pestaña PERLAS); `plays` sube en 1.
- [ ] Navegar a otra página y volver no duplica el temporizador de marea ni las entradas de teclado.
- [ ] Asteroides y Tetris siguen funcionando en `EnginePlayer`; los simulados siguen en `GamePlayer`.
- [ ] Recargar `/juegos/perlas/jugar` no produce errores de hidratación ni de consola.
- [ ] `get_advisors` de seguridad no reporta avisos nuevos.
- [ ] Las filas de prueba se borran de `scores` al terminar la verificación.

---

## Decisions

- **Yes:** fila nueva `perlas` en `games`. Decisión cerrada de `/add-game`.
- **Yes:** `EnginePlayer` + registro, sin reproductor propio. Decisión cerrada de `/add-game`.
- **Yes:** guardado con `ScoreSaveForm` → `saveScore` de SPEC 06. No se crea otro flujo.
- **Yes:** `cat = PUZZLE` y `color = yellow`. Decisión del agente game-jam; distingue la tarjeta de CAÍDA (magenta) y TETRIS (green).
- **Yes:** reutilizar `cover-glot`. Decisión del agente game-jam; sin CSS nuevo aunque comparta portada con GLOTÓN.
- **No:** `.cover-perlas` propia. Va en otra spec si se quiere diferenciar.
- **No:** tocar el motor en esta spec. Cualquier ajuste de reglas va en una spec nueva.

---

## Risks

| Riesgo                                           | Mitigación                                                                 |
| ------------------------------------------------ | -------------------------------------------------------------------------- |
| Catálogo cacheado no muestra el juego nuevo      | Paso 5 invalida el tag `games`.                                            |
| `id` del registro distinto del `id` de `games`   | Criterio de aceptación sobre `hasEngine('perlas')` y la ruta de juego.     |
| Canvas 4/5 alto no cabe en pantallas bajas       | `aspectRatio` inline y `width: 100%`; revisar a 375 px y en escritorio.    |
| Filas de prueba contaminan el leaderboard        | Paso 8 las borra con `execute_sql`; nombres con prefijo `TEST`.            |
| Cambios de API de Next.js 16 (`cacheComponents`) | El paso 2 obliga a leer `node_modules/next/dist/docs/` antes de codificar. |

---

## What is **not** in this spec

- Cambios de reglas o balance del motor.
- Portada propia, sonido, ratón y controles táctiles.
- Tocar otros juegos, reproductores o el contrato de motor.
- Antitrampas, auth y tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propia spec.
