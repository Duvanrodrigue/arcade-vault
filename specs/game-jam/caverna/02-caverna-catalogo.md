# SPEC caverna-02 — CAVERNA en el catálogo

> **Status:** borrador
> **Depends on:** SPEC 05, SPEC 06, SPEC 07, SPEC caverna-01
> **Date:** 2026-11-27
> **Objective:** Registrar el motor `caverna` en `lib/games/registry.ts`, añadir la fila `caverna` con su portada `.cover-caverna` a `public.games` y comprobar que se juega en `/juegos/caverna/jugar` y guarda puntuaciones en Supabase.

---

## Por qué existe esta spec

La spec `caverna-01` entrega el motor aislado. Esta spec lo integra con la plataforma sin código nuevo de reproductor ni de guardado: reutiliza `EnginePlayer` (SPEC 07) y `saveScore` (SPEC 06). Añade una entrada de registro, una portada CSS, una migración y la verificación de extremo a extremo.

Ninguna portada existente representa una cueva: `cover-rocas` ya la comparten ASTEROIDES y ROCAS, y `cover-glot` dibuja un comecocos. Por eso esta spec añade `.cover-caverna` en CSS puro.

---

## Scope

**In:**

- Entrada `caverna` en `lib/games/registry.ts`.
- Portada `.cover-caverna` en `app/globals.css`, en CSS puro, junto a las demás `cover-*`.
- Migración `add_game_caverna` en `public.games`: `id = 'caverna'`, `title = 'CAVERNA'`, `cat = 'ARCADE'`, `cover = 'cover-caverna'`, `color = 'magenta'`, `short` y `long` en español con controles, puntuación y fin.
- Invalidar la caché `games` tras la migración.
- Comprobación de seguridad con `get_advisors`.
- Verificación con Playwright del flujo completo: tarjeta, ficha, juego, pausa, fin, guardado y `/salon`.
- Diseño de la portada y de cualquier ajuste visual con el skill `frontend-design`, según `CLAUDE.md`.

**Out of scope (para specs futuras):**

- Cambios de reglas o balance del motor (van en una spec nueva sobre `caverna-01`).
- Cambios en `EnginePlayer`, en `app/juegos/[id]/jugar/page.tsx` o en el contrato de motor.
- Sonido, controles táctiles y soporte móvil jugable.
- Tocar Asteroides, Tetris o los juegos simulados.
- Antitrampas, auth y tests automatizados (no hay runner).

---

## Data model

```sql
-- Migración add_game_caverna
insert into public.games (id, title, short, long, cat, cover, color, position)
values (
  'caverna',
  'CAVERNA',
  'Un botón, una nave y una cueva que no deja de cerrarse.',
  'Tu nave vuela sola por una caverna de neón. Mantén ESPACIO o ↑ para subir y suéltalo para caer. Cada 10 píxeles recorridos suman 1 metro y 1 punto, y cada cristal amarillo suma 50 más. Cada 300 metros subes de nivel: la cueva va más rápido, se estrecha y sus paredes se retuercen. Esquiva estalactitas y estalagmitas. Un solo roce con la roca termina la partida. P pausa.',
  'ARCADE',
  'cover-caverna',
  'magenta',
  (select coalesce(max(position), 0) + 1 from public.games)
);
```

```ts
// lib/games/registry.ts — entrada nueva
caverna: () => import("@/lib/games/caverna/engine"),
```

```css
/* app/globals.css — portada nueva, junto a .cover-duelo */
.cover-caverna {
  background: linear-gradient(180deg, #1a0020, #07000f 50%, #1a0020);
}
.cover-caverna::after {
  /* techo y suelo dentados en magenta con drop-shadow */
}
.cover-caverna::before {
  /* nave cian y cristal amarillo en el centro */
}
```

Convenciones:

- `id` en `games` coincide con la clave del registro y con la carpeta `lib/games/caverna/`.
- `best` y `plays` salen de `games_with_stats`; no se tocan.
- `.cover-caverna` usa solo `var(--magenta)`, `var(--cyan)` y `var(--yellow)`, gradientes y `clip-path`; sin imágenes.
- El techo y el suelo de la portada ocupan cada uno como máximo el 30 % del alto de la tarjeta.
- El motor se renderiza en `.crt-screen` con `aspectRatio: 800 / 600` (4/3).
- `short` tiene como máximo 60 caracteres.

---

## Implementation plan

Cada paso deja la app compilando y ejecutable (`npm run dev`).

1. Verificar que `lib/games/engine.ts`, `lib/games/registry.ts`, `components/engine-player.tsx` y `lib/games/caverna/engine.ts` (spec `caverna-01`) existen. No volver a especificarlos. Verificación: `npm run build`.
2. Leer en `node_modules/next/dist/docs/` lo relevante a `cacheComponents` y a la invalidación de caché con `updateTag`/`revalidateTag` antes de tocar código Next.js.
3. Añadir `caverna` a `lib/games/registry.ts` con el import dinámico indicado. Verificación: `npm run build`; `/juegos/caverna/jugar` aún da 404 porque no hay fila.
4. Diseñar `.cover-caverna` en `app/globals.css` con el skill `frontend-design`, siguiendo el patrón de `.cover-rana` y `.cover-duelo`. Verificación: `npm run build` y `npm run lint`.
5. Aplicar la migración `add_game_caverna` con `apply_migration`. Verificación: `list_tables` y `select id, title, cat, cover, color, position from games`.
6. Invalidar la caché `games` (reiniciar dev o `revalidateTag('games')`). Verificación: `/juegos` muestra la tarjeta CAVERNA.
7. Ejecutar `get_advisors` de tipo security. Verificación: sin avisos nuevos.
8. Probar con Playwright (screenshots en `.playwright-screenshots/`, p. ej. `caverna-tarjeta.png`, `caverna-juego.png`, `caverna-fin.png`, `caverna-375.png`): tarjeta en `/juegos` y filtro ARCADE, ficha `/juegos/caverna`, jugar (mantener y soltar `Espacio`, `↑`, recoger un cristal, pausa con botón y con `P`, FIN, chocar, JUGAR DE NUEVO), guardar una puntuación con nombre `TEST CAV`, comprobar `/juegos/caverna` y `/salon`, navegar fuera y volver, comprobar 375 px. Verificación: capturas guardadas sin errores de consola.
9. Borrar las filas de prueba de `scores` con `execute_sql` (`delete from scores where game_id = 'caverna' and name like 'TEST%'`). Verificación: `select count(*) from scores where game_id = 'caverna' and name like 'TEST%'` devuelve 0.

---

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `lib/games/registry.ts` contiene la clave `caverna` y `hasEngine('caverna')` devuelve `true`.
- [ ] La fila `caverna` existe en `public.games` (ARCADE, `cover-caverna`, `magenta`, `position` = máximo anterior + 1); `/juegos` muestra la tarjeta CAVERNA y aparece al filtrar por ARCADE.
- [ ] La tarjeta CAVERNA muestra la portada `.cover-caverna` (techo y suelo magenta, nave cian) y no reutiliza otra `cover-*`.
- [ ] `/juegos/caverna` muestra la ficha con el texto `long`, que explica controles, puntuación, niveles y fin.
- [ ] `/juegos/caverna/jugar` muestra el canvas 800×600 en la pantalla CRT (4/3), sin deformar y sin scroll horizontal a 375 px.
- [ ] `app/juegos/[id]/jugar/page.tsx` no se modifica y elige `EnginePlayer` vía `hasEngine('caverna')`.
- [ ] `Espacio` y `↑` no hacen scroll de la página dentro del reproductor.
- [ ] El HUD de la plataforma (Puntuación, Distancia, Cristales, Nivel) coincide con los valores de la lógica.
- [ ] Recoger un cristal sube Cristales en 1 y Puntuación en 50 en el HUD de la plataforma.
- [ ] PAUSA y la tecla `P` congelan el juego y muestran "EN PAUSA"; el botón pasa a REANUDAR en ambos casos; reanudar no produce saltos.
- [ ] FIN y chocar con la cueva abren el modal FIN DEL JUEGO con la puntuación final.
- [ ] JUGAR DE NUEVO reinicia con puntuación 0, distancia 0, cristales 0 y nivel 1, y cierra el modal.
- [ ] Guardar una puntuación la muestra en `/juegos/caverna` y en `/salon` (pestaña CAVERNA); `plays` sube en 1.
- [ ] Navegar a otra página y volver no duplica velocidad ni entradas (un solo loop y un solo juego de listeners).
- [ ] Asteroides y Tetris siguen funcionando en `EnginePlayer`; los simulados siguen en `GamePlayer` con su modal de guardado.
- [ ] Recargar `/juegos/caverna/jugar` no produce errores de hidratación ni de consola.
- [ ] `get_advisors` de seguridad no reporta avisos nuevos.
- [ ] Las filas de prueba se borran de `scores` al terminar la verificación.

---

## Decisions

- **Yes:** fila nueva `caverna` en `games`. Decisión cerrada de `/add-game`.
- **Yes:** `EnginePlayer` + registro, sin reproductor propio. Decisión cerrada de `/add-game`.
- **Yes:** guardado con `ScoreSaveForm` → `saveScore` de SPEC 06. No se crea otro flujo.
- **Yes:** `id = caverna`, `CAVERNA`, `ARCADE`, `magenta`. Decisión del usuario (línea propuesta de `game-suggestions-todo.md`); no hay ningún ARCADE magenta en el catálogo.
- **Yes:** portada propia `.cover-caverna` en CSS puro. Decisión del agente game-jam; ninguna `cover-*` existente representa una cueva.
- **No:** reutilizar `cover-rocas` o `cover-glot`. La primera ya la comparten dos juegos y la segunda dibuja otro personaje.
- **Yes:** textos `short` y `long` de esta spec. Decisión del agente game-jam; describen el motor de `caverna-01` con sus números exactos.
- **Yes:** nombre de prueba `TEST CAV`, válido para la regex de `saveScore`. Permite borrar las filas con `name like 'TEST%'`.
- **No:** tocar el motor en esta spec. Cualquier ajuste de reglas va en una spec nueva.

---

## Risks

| Riesgo                                             | Mitigación                                                                 |
| -------------------------------------------------- | -------------------------------------------------------------------------- |
| Catálogo cacheado no muestra el juego nuevo        | El paso 6 invalida el tag `games`.                                         |
| `id` del registro distinto del `id` de `games`     | Criterio de aceptación sobre `hasEngine('caverna')` y la ruta de juego.    |
| La portada nueva rompe el estilo de otras tarjetas | Selectores solo bajo `.cover-caverna`; revisar `/juegos` con Playwright.   |
| Filas de prueba contaminan el leaderboard          | El paso 9 las borra con `execute_sql`; nombres con prefijo `TEST`.         |
| Cambios de API de Next.js 16 (`cacheComponents`)   | El paso 2 obliga a leer `node_modules/next/dist/docs/` antes de codificar. |

---

## What is **not** in this spec

- Cambios de reglas o balance del motor.
- Cambios en `EnginePlayer`, en la página de juego o en el contrato de motor.
- Sonido y controles táctiles.
- Tocar otros juegos o reproductores.
- Antitrampas, auth y tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propia spec.
