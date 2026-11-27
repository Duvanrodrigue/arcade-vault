# SPEC batisfera-02 — BATISFERA en el catálogo

> **Status:** borrador
> **Depends on:** SPEC 05, SPEC 06, SPEC 07, SPEC batisfera-01
> **Date:** 2026-11-27
> **Objective:** Registrar el motor `batisfera` en `lib/games/registry.ts`, añadir la fila `batisfera` a `public.games` y comprobar que se juega en `/juegos/batisfera/jugar` y guarda puntuaciones en Supabase.

---

## Por qué existe esta spec

La spec `batisfera-01` entrega el motor aislado. Esta spec lo integra con el resto de la plataforma sin código nuevo de reproductor ni de guardado: reutiliza `EnginePlayer` (SPEC 07) y `saveScore` (SPEC 06). Solo hay una entrada de registro, una migración y la verificación de extremo a extremo.

---

## Scope

**In:**

- Entrada `batisfera` en `lib/games/registry.ts`.
- Migración `add_game_batisfera` en `public.games`: `id = 'batisfera'`, `title = 'BATISFERA'`, `cat = 'ARCADE'`, `cover = 'cover-rocas'`, `color = 'cyan'`, `short` y `long` en español con controles, puntuación y fin.
- Invalidar la caché `games` tras la migración.
- Verificación con Playwright del flujo completo: tarjeta, ficha, juego, pausa, fin, guardado y `/salon`.
- Comprobación de seguridad con `get_advisors`.
- Diseño de cualquier ajuste visual con el skill `frontend-design`, según `CLAUDE.md`.

**Out of scope (para specs futuras):**

- Cambios de reglas o balance del motor (van en una spec nueva sobre `batisfera-01`).
- Portada propia `.cover-batisfera`.
- Sonido, controles táctiles y soporte móvil jugable.
- Tocar Asteroides, Tetris o los juegos simulados.
- Antitrampas, auth y tests automatizados (no hay runner).

---

## Data model

```sql
-- Migración add_game_batisfera
insert into public.games (id, title, short, long, cat, cover, color, position)
values (
  'batisfera',
  'BATISFERA',
  'Desciende por la fosa, esquiva medusas y no te quedes sin aire.',
  'Tu batiscafo baja sin parar por la fosa oceánica. Muévelo con ← →, mantén ↓ para descender más rápido y ganar 2 puntos por metro, y pulsa ESPACIO para lanzar un pulso de sonar que ilumina todo durante 0,6 segundos (se recarga en 8). Esquiva rocas y medusas: tienes 3 puntos de casco. Recoge burbujas (+25 puntos y oxígeno) y perlas (+100). Subes de nivel cada 250 metros: más velocidad y menos luz. La partida termina si el casco o el oxígeno llegan a 0. P pausa.',
  'ARCADE',
  'cover-rocas',
  'cyan',
  (select coalesce(max(position), 0) + 1 from public.games)
);
```

```ts
// lib/games/registry.ts — entrada nueva
batisfera: () => import("@/lib/games/batisfera/engine"),
```

Convenciones:

- `id` en `games` coincide con la clave del registro y con la carpeta `lib/games/batisfera/`.
- `best` y `plays` salen de `games_with_stats`; no se tocan.
- La portada reutiliza `cover-rocas` (ya definida en `app/globals.css`); no hay CSS nuevo.
- El motor se renderiza en `.crt-screen` con `aspectRatio: 480 / 640` (3/4).

---

## Implementation plan

Cada paso deja la app compilando y ejecutable (`npm run dev`).

1. Verificar que `lib/games/registry.ts`, `lib/games/engine.ts` y `components/engine-player.tsx` existen y que `lib/games/batisfera/engine.ts` (spec 01) está presente. No volver a especificarlos. Verificación: `npm run build`.
2. Leer en `node_modules/next/dist/docs/` lo relevante a `cacheComponents` y a la invalidación de caché con `updateTag`/`revalidateTag` antes de tocar código Next.js.
3. Añadir `batisfera` a `lib/games/registry.ts` con el import dinámico indicado. Verificación: `npm run build`.
4. Aplicar la migración `add_game_batisfera` con `apply_migration`. Verificación: `list_tables` y `select id, title, cat, cover, color, position from games`.
5. Invalidar la caché `games` (reiniciar dev o `revalidateTag('games')`). Verificación: `/juegos` muestra la tarjeta.
6. Ejecutar `get_advisors` de tipo security. Verificación: sin avisos nuevos.
7. Probar con Playwright (screenshots en `.playwright-screenshots/`, p. ej. `batisfera-juego.png`): tarjeta en `/juegos` y filtro ARCADE, ficha `/juegos/batisfera`, jugar (mover, `↓`, sonar, recoger burbuja, pausa con botón y con `P`, FIN, JUGAR DE NUEVO), guardar una puntuación, comprobar `/juegos/batisfera` y `/salon`, navegar fuera y volver, comprobar 375 px. Verificación: capturas guardadas sin errores de consola.
8. Borrar las filas de prueba de `scores` con `execute_sql` (`delete from scores where game_id = 'batisfera' and name like 'TEST%'`). Verificación: `select count(*)` de esas filas devuelve 0.

---

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] La fila `batisfera` existe en `public.games` (ARCADE, `cover-rocas`, `cyan`); `/juegos` muestra la tarjeta BATISFERA y aparece al filtrar por ARCADE.
- [ ] `/juegos/batisfera` muestra la ficha con el texto `long`, que explica controles, puntuación y fin.
- [ ] `/juegos/batisfera/jugar` muestra el canvas 480×640 en la pantalla CRT (3/4), sin deformar y sin scroll horizontal a 375 px.
- [ ] `app/juegos/[id]/jugar/page.tsx` no se modifica y elige `EnginePlayer` vía `hasEngine('batisfera')`.
- [ ] `←` `→` `↓` y `Espacio` no hacen scroll de la página dentro del reproductor.
- [ ] El HUD de la plataforma (Puntuación, Casco, Nivel, Profundidad) coincide con los valores de la lógica.
- [ ] PAUSA y la tecla `P` congelan el juego y muestran "EN PAUSA"; el botón pasa a REANUDAR en ambos casos; reanudar no produce saltos.
- [ ] FIN, casco 0 y oxígeno 0 abren el modal FIN DEL JUEGO con la puntuación final.
- [ ] JUGAR DE NUEVO reinicia con puntuación 0, casco 3, nivel 1 y cierra el modal.
- [ ] Guardar una puntuación la muestra en `/juegos/batisfera` y en `/salon` (pestaña BATISFERA); `plays` sube en 1.
- [ ] Navegar a otra página y volver no duplica velocidad ni entradas (un solo loop y un solo listener).
- [ ] Asteroides y Tetris siguen funcionando en `EnginePlayer`; los simulados siguen en `GamePlayer`.
- [ ] Recargar `/juegos/batisfera/jugar` no produce errores de hidratación ni de consola.
- [ ] `get_advisors` de seguridad no reporta avisos nuevos.
- [ ] Las filas de prueba se borran de `scores` al terminar la verificación.

---

## Decisions

- **Yes:** fila nueva `batisfera` en `games`. Decisión cerrada de `/add-game`.
- **Yes:** `EnginePlayer` + registro, sin reproductor propio. Decisión cerrada de `/add-game`.
- **Yes:** guardado con `ScoreSaveForm` → `saveScore` de SPEC 06. No se crea otro flujo.
- **Yes:** `cat = ARCADE` y `color = cyan`. Decisión del agente game-jam; los otros dos juegos del jam usan PUZZLE/yellow y SHOOTER/green.
- **Yes:** reutilizar `cover-rocas`. Decisión del agente game-jam; sin CSS nuevo aunque comparta portada con ASTEROIDES y ROCAS.
- **No:** `.cover-batisfera` propia. Va en otra spec si se quiere diferenciar.
- **No:** tocar el motor en esta spec. Cualquier ajuste de reglas va en una spec nueva.

---

## Risks

| Riesgo                                           | Mitigación                                                                 |
| ------------------------------------------------ | -------------------------------------------------------------------------- |
| Catálogo cacheado no muestra el juego nuevo      | Paso 5 invalida el tag `games`.                                            |
| `id` del registro distinto del `id` de `games`   | Criterio de aceptación sobre `hasEngine('batisfera')` y la ruta de juego.  |
| Canvas 3/4 alto no cabe en pantallas bajas       | `aspectRatio` inline y `width: 100%`; revisar a 375 px y en escritorio.    |
| Filas de prueba contaminan el leaderboard        | Paso 8 las borra con `execute_sql`; nombres con prefijo `TEST`.            |
| Cambios de API de Next.js 16 (`cacheComponents`) | El paso 2 obliga a leer `node_modules/next/dist/docs/` antes de codificar. |

---

## What is **not** in this spec

- Cambios de reglas o balance del motor.
- Portada propia, sonido y controles táctiles.
- Tocar otros juegos, reproductores o el contrato de motor.
- Antitrampas, auth y tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propia spec.
