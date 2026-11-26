# SPEC 07 — Tetris jugable y reproductor genérico de motores

> **Status:** aprobado
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-11-26
> **Objective:** Portar a TypeScript el Tetris de `references/resources/started-games/03-tetris/`, añadirlo como juego nuevo `tetris` del catálogo y jugarlo en `/juegos/tetris/jugar` con un reproductor genérico que también ejecuta Asteroides, guardando puntuaciones en Supabase.

---

## Por qué existe esta spec

Asteroides (SPEC 05) tiene su propio reproductor (`components/asteroids-player.tsx`) y su propia API (`createAsteroids`). SPEC 05 dejó dicho que se abstraería cuando hubiera un segundo juego real: este es el segundo. Por eso esta spec incluye primero el contrato genérico de motor, el registro `id → motor` y `EnginePlayer`, migra Asteroides a ellos y después añade Tetris.

`game.js` del Tetris no se puede montar tal cual en React:

- Usa `document.getElementById` para dos canvas (`board`, `next-canvas`), el HUD (`score`, `lines`, `level`) y el overlay (`overlay`, `restart-btn`).
- Guarda el estado en variables globales de módulo (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `animId`…).
- Registra un `keydown` en `document` que nunca se quita y un `requestAnimationFrame` sin cancelar al remontar.
- Solo llama a `preventDefault` en `Space`; flechas hacen scroll de la página.
- Incluye un toggle de tema claro/oscuro con `localStorage.tetris-theme` que choca con el tema de la plataforma.

---

## Scope

**In:**

- Contrato genérico de motor en `lib/games/engine.ts` (`EngineModule`, `EngineSnapshot`, `EngineCallbacks`, `EngineControls`, `HudField`), con `paused?: boolean` en el snapshot.
- `lib/games/registry.ts`: mapa `id → import dinámico del motor` y `hasEngine(id)`.
- `components/engine-player.tsx` (client): reproductor genérico que sustituye a `AsteroidsPlayer`. HUD desde `module.hud`, PAUSA/REANUDAR, FIN, SALIR, overlay "EN PAUSA", modal FIN DEL JUEGO con `ScoreSaveForm`, JUGAR DE NUEVO y VOLVER AL VAULT.
- Migración de Asteroides al contrato: `lib/games/asteroids/engine.ts` exporta un `EngineModule` (800×600, HUD Puntuación/Vidas/Nivel) sin cambiar su jugabilidad. Se elimina `components/asteroids-player.tsx`.
- `app/juegos/[id]/jugar/page.tsx`: `hasEngine(game.id) ? <EnginePlayer game={game} /> : <GamePlayer game={game} />`.
- Port fiel de `game.js` a `lib/games/tetris/engine.ts`:
  - Tablero 10×20, `BLOCK = 30`, las 8 piezas (I, O, T, S, Z, J, L y **N tuerca** 3×3), `COLORS` y `PIECES` idénticos.
  - Rotación horaria con wall kicks `[0, ±1, ±2]`, pieza fantasma (`globalAlpha = 0.2`), siguiente pieza.
  - Puntuación `LINE_SCORES = [0, 100, 300, 500, 800]` × nivel; hard drop +2 por celda; soft drop +1 por fila.
  - Nivel `floor(líneas / 10) + 1`; `dropInterval = max(100, 1000 − (nivel − 1) × 90)` ms.
  - Fin de partida cuando una pieza recién generada colisiona.
  - Controles: `←` `→` mover, `↑` o `X` rotar, `↓` soft drop, `Espacio` hard drop, `P` pausa.
- Canvas único 480×600: el tablero (300×600) a la izquierda y un panel de 180 px a la derecha con la caja NEXT (120×120) dibujada en el mismo canvas. El panel no repite Puntuación, Líneas ni Nivel.
- HUD de la plataforma: Puntuación, Líneas (`extra.lines`) y Nivel.
- Overlays de pausa y game over del original (DOM) sustituidos por los de la plataforma ("EN PAUSA" y modal FIN DEL JUEGO).
- Nuevo juego en `public.games` (migración `add_game_tetris`): `id = 'tetris'`, `title = 'TETRIS'`, `cat = 'PUZZLE'`, `cover = 'cover-tetro'`, `color = 'green'`, `short` y `long` en español describiendo controles, puntuación, niveles y la pieza N.
- Guardado de puntuaciones con `ScoreSaveForm` → `saveScore` (SPEC 06), sin código nuevo de guardado.
- Diseño de interfaces con el skill `frontend-design`, según `CLAUDE.md`.

**Out of scope (para specs futuras):**

- Cambios de jugabilidad o balance (T-spin, hold, bolsa de 7 piezas, DAS, lock delay).
- Toggle de tema claro/oscuro del original y la lista de controles del sidebar (los controles van en `long`).
- Tecla de reinicio en game over: el original solo reinicia con botón; aquí es JUGAR DE NUEVO.
- Controles táctiles o soporte móvil jugable; solo teclado.
- Sonido y assets (el juego no tiene).
- Portada propia `.cover-tetris`.
- Tocar `CAÍDA` u otros juegos simulados: siguen en `GamePlayer`.
- Antitrampas, auth y todo lo que SPEC 06 dejó fuera.
- Tests automatizados (no hay runner configurado).

---

## Data model

```sql
-- Migración add_game_tetris
insert into public.games (id, title, short, long, cat, cover, color, position)
values ('tetris', 'TETRIS', '<español>', '<español>', 'PUZZLE', 'cover-tetro', 'green',
        (select coalesce(max(position), 0) + 1 from public.games));
```

```ts
// lib/games/engine.ts — generaliza lib/games/asteroids/engine.ts
export type EngineState = "playing" | "dead" | "gameover";

export interface EngineSnapshot {
  score: number;
  state: EngineState;
  paused?: boolean; // true también cuando la pausa viene de una tecla del motor (P)
  lives?: number;
  level?: number;
  extra?: Record<string, number>; // Tetris: { lines }
}

export interface EngineCallbacks {
  onChange(snapshot: EngineSnapshot): void; // solo cuando cambia algo, no cada frame
}

export interface EngineControls {
  pause(): void;
  resume(): void;
  end(): void; // fuerza state = "gameover"
  restart(): void; // equivale al init original
  destroy(): void; // cancela RAF y quita listeners
}

export interface HudField {
  key: "score" | "lives" | "level" | `extra.${string}`;
  label: string;
}

export interface EngineModule {
  width: number;
  height: number;
  hud: HudField[];
  create(canvas: HTMLCanvasElement, cb: EngineCallbacks): EngineControls;
}
```

```ts
// lib/games/registry.ts
export function hasEngine(id: string): boolean;
export function loadEngine(id: string): Promise<EngineModule>;
// ids registrados: "asteroides", "tetris"
```

```ts
// lib/games/tetris/engine.ts
const engine: EngineModule = {
  width: 480, // 300 de tablero + 180 de panel NEXT
  height: 600,
  hud: [
    { key: "score", label: "PUNTUACIÓN" },
    { key: "extra.lines", label: "LÍNEAS" },
    { key: "level", label: "NIVEL" },
  ],
  create,
};
export default engine;
```

Convenciones:

- Asteroides: `width = 800`, `height = 600`, `hud` = Puntuación, Vidas, Nivel; constantes y física sin cambios.
- Tetris: constantes (`COLS`, `ROWS`, `BLOCK`, `COLORS`, `PIECES`, `LINE_SCORES`), fórmulas de nivel y velocidad, y `dt` idénticos al original.
- `EnginePlayer` pinta `<canvas width={width} height={height}>` con `display: block; width: 100%; height: 100%` dentro de `.crt-screen` con `aspectRatio: width / height` (4/3 en Asteroides, 4/5 en Tetris).
- `EnginePlayer` muestra "EN PAUSA" si `snapshot.paused` es verdadero, venga del botón o de la tecla `P`.
- La caja NEXT se dibuja en el canvas con el mismo `drawBlock` que el tablero.

---

## Implementation plan

Cada paso deja la app compilando y ejecutable (`npm run dev`).

1. Leer en `node_modules/next/dist/docs/` lo relevante a Client Components, `useEffect` y `import()` dinámico con `cacheComponents` activo (`next.config.ts`) antes de escribir código Next.js.
2. Crear `lib/games/engine.ts` con el contrato genérico. Verificación: `npm run build`.
3. Migrar `lib/games/asteroids/engine.ts` al contrato: exporta un `EngineModule` por defecto y reporta `paused` en el snapshot. Sin cambios de jugabilidad. Verificación: `npm run build`.
4. Crear `lib/games/registry.ts` (solo `asteroides` por ahora) y `components/engine-player.tsx`, generalizando `components/asteroids-player.tsx` (carga en `useEffect`, `destroy()` en el cleanup, botones con `blur()`, `ScoreSaveForm` en el modal). Verificación: `npm run build`.
5. En `app/juegos/[id]/jugar/page.tsx`, usar `hasEngine(game.id)` para elegir `EnginePlayer` o `GamePlayer`; borrar `components/asteroids-player.tsx`. Verificación: Asteroides se juega igual que antes (puntos, vidas, pausa, FIN, guardado) y los simulados siguen en `GamePlayer`.
6. Crear `lib/games/tetris/engine.ts` portando `game.js`: estado por instancia, canvas 480×600, tablero, fantasma, pieza N, panel NEXT, puntuación, niveles, pausa con `P` reportada en el snapshot, `preventDefault` en `ArrowLeft`, `ArrowRight`, `ArrowDown`, `ArrowUp`, `Space`, listener en `document` como el original, `destroy()` limpio. Verificación: `npm run build`.
7. Registrar `tetris` en `lib/games/registry.ts`.
8. Aplicar la migración `add_game_tetris` con `apply_migration`; invalidar la caché de `games` (reiniciar dev o `revalidateTag('games')`). Verificación: `list_tables` y `select id, title, cat, cover, color, position from games`; `get_advisors` de tipo security sin avisos nuevos.
9. Probar con Playwright (screenshots en `.playwright-screenshots/`): jugar Tetris (mover, rotar, soft/hard drop, limpiar líneas, pausa con botón y con `P`, FIN, JUGAR DE NUEVO, guardar puntuación), repetir un guardado en Asteroides, navegar fuera y volver, y comprobar 375 px. Borrar las filas de prueba de `scores` con `execute_sql` al terminar.

---

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `lib/games/registry.ts` existe y `components/asteroids-player.tsx` ya no existe; `app/juegos/[id]/jugar/page.tsx` no compara `game.id` con ningún juego concreto.
- [ ] La fila `tetris` existe en `public.games` (PUZZLE, `cover-tetro`, `green`); `/juegos` muestra la tarjeta TETRIS y aparece al filtrar por PUZZLE junto a CAÍDA.
- [ ] `/juegos/tetris` muestra la ficha con el texto `long`, que explica los controles y la pieza N.
- [ ] `/juegos/tetris/jugar` muestra el canvas 480×600 en la pantalla CRT (4/5), sin deformar y sin scroll horizontal a 375 px.
- [ ] `←` `→` mueven, `↑` y `X` rotan, `↓` baja, `Espacio` hace hard drop; ninguna de esas teclas hace scroll de la página.
- [ ] Las 8 piezas aparecen, incluida la tuerca N 3×3, con los colores del original.
- [ ] Soft drop suma 1 punto por fila; hard drop suma 2 por celda; limpiar 1, 2, 3 y 4 líneas suma 100, 300, 500 y 800 × nivel.
- [ ] El nivel sube cada 10 líneas y el intervalo de caída sigue `max(100, 1000 − (nivel − 1) × 90)` ms.
- [ ] La pieza fantasma se dibuja con opacidad 0.2 en la posición de aterrizaje; la caja NEXT muestra la siguiente pieza.
- [ ] El HUD de la plataforma muestra Puntuación, Líneas y Nivel con los mismos valores que la lógica del juego; el canvas no repite esos marcadores.
- [ ] PAUSA y la tecla `P` congelan el juego y muestran "EN PAUSA"; el botón cambia a REANUDAR en ambos casos; reanudar continúa sin salto.
- [ ] FIN y que una pieza nueva colisione al aparecer abren el modal FIN DEL JUEGO con la puntuación final.
- [ ] JUGAR DE NUEVO reinicia con tablero vacío, puntuación 0, líneas 0 y nivel 1, y cierra el modal.
- [ ] Guardar una puntuación de Tetris la muestra en `/juegos/tetris` y en `/salon` (pestaña TETRIS); `plays` sube en 1.
- [ ] Navegar a otra página y volver no duplica la velocidad de caída ni las entradas de teclado (un solo loop y un solo listener).
- [ ] Asteroides funciona igual que antes en `EnginePlayer` (800×600, puntos 20/50/100, vidas, niveles, power-up `3x`, guardado) y `CAÍDA` y los demás simulados siguen en `GamePlayer` con su modal de guardado.
- [ ] `localStorage` no contiene `tetris-theme` tras jugar.
- [ ] Recargar `/juegos/tetris/jugar` no produce errores de hidratación ni de consola.
- [ ] Las filas de prueba se borran de `scores` al terminar la verificación.

---

## Decisions

- **Yes:** juego nuevo `tetris` como fila nueva en `games`; `CAÍDA` queda simulado. Decisión cerrada de `/add-game`.
- **Yes:** `id = tetris`, `TETRIS`, `PUZZLE`, `green`. Decisión del usuario; el verde distingue la tarjeta de otros PUZZLE.
- **Yes:** reutilizar `cover-tetro`. Decisión del usuario; sin CSS nuevo aunque comparta portada con CAÍDA.
- **No:** `.cover-tetris` propia. Va en otra spec si se quiere diferenciar.
- **Yes:** refactor a `EnginePlayer` + registro dentro de esta spec, al inicio del plan. Decisión del usuario; evita dos specs encadenadas.
- **No:** spec de refactor separada.
- **Yes:** un único canvas 480×600 con panel NEXT dibujado dentro. Decisión del usuario; respeta el contrato de un canvas por motor sin ampliarlo.
- **No:** segundo canvas React para NEXT. Ampliaría el contrato para un solo juego.
- **No:** quitar NEXT. Cambia la jugabilidad del original.
- **Yes:** HUD de plataforma con Puntuación, Líneas y Nivel, sin repetirlos en el canvas. Decisión del usuario.
- **Yes:** `paused?: boolean` en `EngineSnapshot`. Decisión del usuario; la tecla `P` y el botón PAUSA quedan sincronizados.
- **No:** quitar la tecla `P`. Perdería un control del original.
- **Yes:** port fiel con la pieza N (tuerca). Decisión del usuario; es mecánica propia del juego.
- **No:** quitar el toggle de tema ni la lista de controles. El tema lo manda la plataforma; los controles van en `long`.
- **Yes:** solo botón JUGAR DE NUEVO para reiniciar, solo teclado, sin sonido ni assets. Decisión del usuario; fiel al original.
- **No:** tecla Enter de reinicio. Desviación del original no pedida.
- **Yes:** `preventDefault` en flechas y Espacio. Adaptación al contexto de página con scroll, no cambio de jugabilidad.
- **Yes:** listener de teclado en `document`, como el original. Se quita siempre en `destroy()`.
- **Yes:** guardado con `ScoreSaveForm` → `saveScore` de SPEC 06. No se crea otro flujo.

---

## Risks

| Riesgo                                                             | Mitigación                                                                                                             |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| La migración de Asteroides al contrato rompe su jugabilidad        | Paso 5 verifica puntos, vidas, niveles, pausa, FIN y guardado antes de tocar Tetris; criterio de aceptación explícito. |
| Strict Mode monta dos veces y quedan dos loops o listeners         | `destroy()` cancela RAF y quita el listener; criterio de navegar y volver.                                             |
| Canvas 4/5 alto no cabe en pantallas bajas dentro de `.crt-screen` | `aspectRatio` inline y `width: 100%`; revisar a 375 px y a una altura de escritorio común con Playwright.              |
| `P` pausa dentro del motor pero la plataforma no se entera         | `paused` en el snapshot; criterio de aceptación con la tecla `P`.                                                      |
| `onChange` en cada frame provoca re-renders y baja el FPS          | El motor solo llama `onChange` cuando cambia score, líneas, nivel, estado o pausa.                                     |
| `dt` grande al reanudar o volver de otra pestaña                   | Se conserva el límite de `dt` del original; `lastTime` se reinicia al reanudar.                                        |
| ESPACIO (hard drop) activa un botón enfocado del reproductor       | Los botones hacen `blur()` al pulsarse.                                                                                |
| El port cambia la jugabilidad sin querer                           | Mismas constantes y fórmulas; comparar con el original (`npx serve` en la carpeta de referencia).                      |
| Catálogo cacheado no muestra el juego nuevo                        | Paso 8 invalida el tag `games`.                                                                                        |
| Cambios de API de Next.js 16 (`cacheComponents`)                   | El paso 1 obliga a leer `node_modules/next/dist/docs/` antes de codificar.                                             |

---

## What is **not** in this spec

- Cambios de jugabilidad o balance (hold, T-spin, bolsa de 7, lock delay).
- Toggle de tema, lista de controles en pantalla y tecla de reinicio.
- Controles táctiles, sonido y portada propia.
- Tocar los juegos simulados.
- Antitrampas, auth y tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propia spec.
