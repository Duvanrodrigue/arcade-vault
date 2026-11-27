# Receta de integración de un juego real en Arcade Vault

Destilada de SPEC 05 (Asteroides jugable) y SPEC 06 (catálogo y leaderboard en Supabase). La spec generada **cita** esta receta y la adapta al juego; no la copia entera.

## 1. Contrato genérico de motor (`lib/games/engine.ts`)

Solo se crea la primera vez (cuando `lib/games/registry.ts` no existe). Generaliza la API de `lib/games/asteroids/engine.ts`.

```ts
export type EngineState = "playing" | "dead" | "gameover";

export interface EngineSnapshot {
  score: number;
  state: EngineState;
  lives?: number;
  level?: number;
  extra?: Record<string, number>; // p. ej. líneas en Tetris
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
  width: number; // resolución lógica del canvas
  height: number;
  hud: HudField[];
  create(canvas: HTMLCanvasElement, cb: EngineCallbacks): EngineControls;
}
```

Cada juego exporta un `EngineModule` desde `lib/games/<id>/engine.ts`. Asteroides migra a este contrato sin cambiar su jugabilidad.

## 2. Registro y reproductor

- `lib/games/registry.ts`: mapa `id → () => import("./<id>/engine")` y `hasEngine(id)`. Importable desde servidor; no ejecuta ningún motor.
- `components/engine-player.tsx` (client): generaliza `components/asteroids-player.tsx`.
  - Carga el módulo del registro en `useEffect` y llama `create(canvas, { onChange })`; `destroy()` en el cleanup.
  - `<canvas width height>` con el tamaño del módulo, `display:block; width:100%; height:100%`, dentro de `.crt-screen` con `aspectRatio: width/height` si no es 4:3.
  - HUD de plataforma desde `hud`; botones PAUSA/REANUDAR, FIN (`resume()` y luego `end()`), SALIR (`/juegos/<id>`); los botones hacen `blur()` al pulsarse para que ESPACIO no los reactive.
  - Overlay "EN PAUSA" y modal FIN DEL JUEGO derivado de `state === "gameover"`, con `ScoreSaveForm` (`components/score-save-form.tsx`), JUGAR DE NUEVO (`restart()`) y VOLVER AL VAULT.
  - Mismas clases CSS que `GamePlayer`: `.av-player`, `.player-hud`, `.crt`, `.crt-screen`, `.crt-bottom`, `.modal-bd`, `.modal`.
- `app/juegos/[id]/jugar/page.tsx`: `hasEngine(game.id) ? <EnginePlayer game={game} /> : <GamePlayer game={game} />`. Sustituye el `if (game.id === "asteroides")` actual.

## 3. Checklist de port (original → TypeScript)

- Todo el estado vive en el cierre de `create…`; ningún global de módulo.
- Sin `document.getElementById`: el canvas llega por parámetro. Canvases extra (preview) se dibujan en el mismo canvas o se pasan en el snapshot.
- `destroy()` cancela el `requestAnimationFrame` y quita **todos** los listeners (siguen en `window`, como el original).
- `preventDefault` en las teclas del juego (flechas, espacio…) para que la página no haga scroll.
- `dt` limitado como en el original; `lastTime` se reinicia al reanudar.
- `onChange` solo al cambiar score/lives/level/state/extra.
- En pausa no corre `update`; el último frame queda visible.
- `end()` fuerza `gameover`; `restart()` = init original; ESPACIO (o la tecla del original) en game over reinicia y vuelve a `playing`.
- Mismas constantes, física y puntuación que el original (port fiel salvo decisión contraria).
- Assets en `public/games/<id>/` con rutas absolutas; cargarlos dentro de `create` y esperar a que estén listos.
- Sonido solo si la spec lo incluye explícitamente.
- El motor exporta `skins` con `neon`, `retro` y `clasico` válidos en oscuro (paletas en `lib/games/<id>/skins.ts` sobre `SkinPalette` de `lib/games/skins.ts`; `create(canvas, cb, { skin })` y `setSkin(id)` sin reiniciar la partida; sin colores literales en el render). Ver agente `skin-designer`.

## 4. Catálogo (Supabase)

Migración `add_game_<id>` con `apply_migration` (el repo no tiene carpeta `supabase/`):

```sql
insert into public.games (id, title, short, long, cat, cover, color, position)
values ('<id>', '<TÍTULO>', '<short>', '<long>', '<ARCADE|PUZZLE|SHOOTER|VERSUS>',
        '<cover-…>', '<cyan|magenta|yellow|green>',
        (select coalesce(max(position), 0) + 1 from public.games));
```

- `short` y `long` en español, describiendo el juego real (controles, puntuación, fin).
- No se tocan `best`/`plays`: salen de `games_with_stats`.
- Invalidar el catálogo cacheado: `games` usa `cacheTag('games')`; tras la migración, reiniciar dev o `revalidateTag('games')`.
- Verificar con `list_tables`, `select … from games` y `get_advisors` (security).
- Portada: reutilizar una `cover-*` de `app/globals.css` o añadir `.cover-<id>` siguiendo las existentes.

## 5. Guardado de puntuaciones

Sin código nuevo: `ScoreSaveForm` → Server Action `saveScore` (`app/juegos/[id]/jugar/actions.ts`) valida y hace `updateTag("scores")`. Solo hay que pasar `gameId` y `score` desde el modal.

## 6. Convenciones del proyecto

- Diseñar UI con el skill `frontend-design` (`CLAUDE.md`).
- Next.js 16: leer `node_modules/next/dist/docs/` antes de codificar (Client Components, `useEffect`, `cacheComponents`).
- Screenshots de Playwright en `.playwright-screenshots/`.
- Specs en español, estado `borrador` → `aprobado` → `implementado`.

## 7. Criterios de aceptación base

Se incluyen siempre en la spec, más los específicos del juego:

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] La fila existe en `public.games`; `/juegos` muestra la tarjeta (categoría y portada correctas) y aparece al filtrar por su categoría.
- [ ] `/juegos/<id>` muestra la ficha con el texto `long`.
- [ ] `/juegos/<id>/jugar` muestra el canvas en la pantalla CRT, sin deformar y sin scroll horizontal a 375 px.
- [ ] Las teclas del juego no hacen scroll de la página.
- [ ] El HUD de la plataforma coincide con el HUD del canvas (puntuación y demás campos).
- [ ] PAUSA congela el juego y muestra "EN PAUSA"; REANUDAR continúa sin salto.
- [ ] FIN y perder la partida abren el modal FIN DEL JUEGO con la puntuación final.
- [ ] JUGAR DE NUEVO reinicia con el estado inicial; la tecla de reinicio del original en game over también, y cierra el modal.
- [ ] Guardar una puntuación la muestra en `/juegos/<id>` y en `/salon` (pestaña del juego); `plays` sube en 1.
- [ ] Navegar a otra página y volver no duplica velocidad ni entradas (un solo loop y un solo juego de listeners).
- [ ] Asteroides y los demás juegos reales siguen funcionando en `EnginePlayer`; los simulados siguen en `GamePlayer` con su modal de guardado.
- [ ] Recargar `/juegos/<id>/jugar` no produce errores de hidratación ni de consola.
- [ ] Las filas de prueba se borran de `scores` al terminar la verificación.

## 8. Fuera de alcance habitual

Controles táctiles, sonido (salvo decisión), cambios de jugabilidad o estética, portada propia (salvo decisión), antitrampas, auth, tests automatizados (no hay runner).
