# SPEC 05 — Asteroides jugable en Arcade Vault

> **Status:** implementado
> **Depends on:** SPEC 01
> **Date:** 2026-11-23
> **Objective:** Portar a TypeScript el Asteroids de `references/resources/started-games/02-asteroids/` y hacerlo jugable en `/juegos/asteroides/jugar` como nuevo juego del catálogo, sin guardar puntuaciones.

---

## Por qué existe esta spec

Todos los juegos del catálogo usan hoy un reproductor simulado (`components/game-player.tsx`: la puntuación sube con un `setInterval`). El Asteroids de `references/resources/started-games/02-asteroids/` ya está terminado como página estática (`index.html` + `game.js`, canvas 800×600, sin dependencias). Esta spec lo convierte en el primer juego real de la plataforma.

`game.js` no se puede montar tal cual en React: usa `document.getElementById('canvas')`, estado global a nivel de módulo, listeners en `window` que nunca se quitan y un `requestAnimationFrame` sin cancelar. Con React Strict Mode (doble montaje) y la navegación del App Router eso duplica loops y listeners. Además no llama a `preventDefault`, así que flechas y espacio harían scroll de la página.

---

## Scope

**In:**

- Nuevo juego `asteroides` en `GAMES` (`lib/games.ts`), al final del array:
  - `title: "ASTEROIDES"`, `cat: "SHOOTER"`, `cover: "cover-rocas"` (reutiliza la portada existente), `color: "cyan"`, `best` y `plays` ficticios como el resto.
  - `short` y `long` en español describiendo el juego real (rotar/propulsar/disparar, asteroides que se parten, 3 vidas, niveles, power-up de triple disparo).
- Port fiel de `game.js` a TypeScript en `lib/games/asteroids/`: mismas constantes, física, power-ups, puntuación (20/50/100), niveles (`3 + level` asteroides), vidas e invencibilidad al reaparecer. El canvas sigue dibujando su HUD (puntaje, nivel, vidas, `3x` del power-up) y sus overlays (`GAME OVER … ESPACIO PARA REINICIAR`).
- Adaptaciones mínimas, solo estructurales:
  - Todo el estado vive en un cierre por instancia (sin globales de módulo).
  - API `createAsteroids(canvas, callbacks)` que devuelve controles: `pause()`, `resume()`, `end()`, `restart()`, `destroy()`.
  - `destroy()` cancela el `requestAnimationFrame` y quita los listeners de teclado.
  - `preventDefault` en las teclas del juego (`ArrowLeft`, `ArrowRight`, `ArrowUp`, `Space`) para que la página no haga scroll.
  - Los listeners siguen en `window`, igual que el original.
- Componente cliente `components/asteroids-player.tsx` que replica el shell visual de `GamePlayer` (mismas clases CSS: `.av-player`, `.player-hud`, `.crt`, `.crt-screen`, `.crt-bottom`, `.modal-bd`, `.modal`):
  - Monta `<canvas width={800} height={600}>` dentro de `.crt-screen` (ya es `aspect-ratio: 4/3`), escalado con CSS al 100 %.
  - HUD de la plataforma con datos reales del juego: Jugador (`user?.name ?? "INVITADO"`), Puntuación, Vidas (`♥` × vidas restantes), Nivel. El HUD del canvas también se mantiene (decisión "ambos").
  - PAUSA/REANUDAR pausa el juego real y muestra el overlay "EN PAUSA" existente.
  - FIN termina la partida (`end()`), lo que abre el modal.
  - SALIR vuelve a `/juegos/asteroides`.
  - Modal FIN DEL JUEGO con "PUNTUACIÓN FINAL" y botones JUGAR DE NUEVO (`restart()`) y VOLVER AL VAULT. **Sin** campo de iniciales ni botón GUARDAR PUNTUACIÓN.
  - El modal se abre cuando el juego entra en estado `gameover` y se cierra cuando vuelve a `playing` (por JUGAR DE NUEVO o por ESPACIO en el canvas).
- `app/juegos/[id]/jugar/page.tsx`: si `game.id === "asteroides"` renderiza `AsteroidsPlayer`; el resto de juegos sigue con `GamePlayer` sin cambios.
- La ficha `/juegos/asteroides`, la biblioteca y el Salón de la Fama muestran el juego nuevo automáticamente por estar en `GAMES`.
- Diseño de interfaces con el skill `frontend-design`, según `CLAUDE.md`.

**Out of scope (para specs futuras):**

- Guardar puntuaciones (ni localStorage `av_scores` ni Supabase). El Salón de la Fama sigue con datos ficticios (`seededScores`).
- Controles táctiles o soporte móvil jugable; solo teclado.
- Cambios de jugabilidad, balance, estética (recolorear con la paleta neón) o nuevos power-ups.
- Portada CSS propia para Asteroides.
- Tocar `rocas` u otros juegos: siguen con el reproductor simulado.
- Sonido.
- Refactor genérico de `GamePlayer` para motores de juego (se hará cuando exista un segundo juego real).
- Tests automatizados (no hay runner configurado).

---

## Data model

No hay persistencia. Solo la entrada de catálogo y el contrato del motor.

```ts
// lib/games.ts — nueva entrada en GAMES
{
  id: "asteroides",
  title: "ASTEROIDES",
  short: "...", // español, del juego real
  long: "...",
  cat: "SHOOTER",
  cover: "cover-rocas",
  color: "cyan",
  best: /* ficticio */,
  plays: /* ficticio */,
}
```

```ts
// lib/games/asteroids/engine.ts
export type AsteroidsState = "playing" | "dead" | "gameover";

export interface AsteroidsSnapshot {
  score: number;
  lives: number;
  level: number;
  state: AsteroidsState;
}

export interface AsteroidsCallbacks {
  // Se llama solo cuando cambia algún campo, no en cada frame.
  onChange(snapshot: AsteroidsSnapshot): void;
}

export interface AsteroidsControls {
  pause(): void;
  resume(): void;
  end(): void; // fuerza state = "gameover"
  restart(): void; // equivale al initGame() original
  destroy(): void; // cancela RAF y quita listeners
}

export function createAsteroids(
  canvas: HTMLCanvasElement,
  callbacks: AsteroidsCallbacks,
): AsteroidsControls;
```

Convenciones:

- Constantes (`RADII`, `SPEEDS`, `POINTS`, `POWERUP_*`, `TRIPLE_SPREAD`), resolución lógica `W = 800`, `H = 600` y `dt` limitado a 50 ms: idénticos al original.
- Las clases `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle` reciben el `ctx` (o el estado de la instancia) en vez de leer globales.
- En pausa no corre `update`; el último frame queda visible bajo el overlay "EN PAUSA". Al reanudar, `lastTime` se reinicia para no saltar con un `dt` grande.

---

## Implementation plan

Cada paso deja la app compilando y ejecutable (`npm run dev`).

1. Leer en `node_modules/next/dist/docs/` lo relevante a Client Components y `useEffect` con `cacheComponents` activo (`next.config.ts`) antes de escribir código Next.js.
2. Añadir la entrada `asteroides` al final de `GAMES` en `lib/games.ts`. Verificación: `/juegos` lista ASTEROIDES con la portada de rocas; `/juegos/asteroides` muestra la ficha; `/juegos/asteroides/jugar` abre el reproductor simulado (todavía).
3. Crear `lib/games/asteroids/engine.ts` portando `game.js` a TypeScript con la API `createAsteroids`. Estado por instancia, `preventDefault` en teclas del juego, `onChange` solo al cambiar score/lives/level/state, `destroy()` limpio. Verificación: `npm run build` sin errores de tipos.
4. Crear `components/asteroids-player.tsx` (client): `useRef` al canvas, `useEffect` que crea el motor y devuelve `destroy`; estado React desde `onChange`; HUD, PAUSA/FIN/SALIR, overlay de pausa y modal sin guardado, reutilizando las clases CSS de `GamePlayer`. Canvas con `width: 100%; height: 100%; display: block` dentro de `.crt-screen`; si hace falta una regla CSS, añadirla a `app/globals.css`.
5. En `app/juegos/[id]/jugar/page.tsx`, renderizar `AsteroidsPlayer` cuando `game.id === "asteroides"`.
6. Probar con Playwright (screenshots en `.playwright-screenshots/`): jugar, pausar, terminar con FIN, reiniciar, salir y volver (sin loops duplicados), y comprobar que la página no hace scroll con flechas/espacio.

---

## Acceptance criteria

- [ ] `npm run build` termina sin errores de TypeScript ni de compilación.
- [ ] `npm run lint` termina sin errores.
- [ ] `/juegos` muestra la tarjeta ASTEROIDES (SHOOTER, portada `cover-rocas`) y aparece al filtrar por SHOOTER.
- [ ] `/juegos/asteroides` muestra la ficha con el texto `long` del juego.
- [ ] `/juegos/asteroides/jugar` muestra el canvas dentro de la pantalla CRT, escalado sin deformar (4:3) y sin scroll horizontal a 375 px de ancho.
- [ ] `←`/`→` rotan, `↑` propulsa y `Espacio` dispara; ninguna de esas teclas hace scroll de la página.
- [ ] Destruir un asteroide grande, mediano y pequeño suma 20, 50 y 100 puntos, y el HUD de la plataforma muestra el mismo valor que el HUD del canvas.
- [ ] Al perder una vida, el HUD de la plataforma muestra un `♥` menos; al limpiar la oleada, el nivel sube en ambos HUD.
- [ ] PAUSA congela el juego y muestra "EN PAUSA"; REANUDAR continúa sin salto de posición.
- [ ] FIN abre el modal FIN DEL JUEGO con la puntuación final; el modal no tiene campo de iniciales ni botón GUARDAR PUNTUACIÓN.
- [ ] Al perder la última vida se abre el mismo modal; JUGAR DE NUEVO reinicia con 3 vidas, nivel 1 y puntuación 0.
- [ ] Pulsar ESPACIO en GAME OVER reinicia la partida y cierra el modal.
- [ ] `localStorage.av_scores` no cambia tras jugar una partida completa.
- [ ] Navegar a otra página y volver no duplica la velocidad del juego ni los disparos (un solo loop y un solo par de listeners activos).
- [ ] El power-up de triple disparo aparece y funciona como en el original (indicador `3x` en el canvas).
- [ ] Los otros 8 juegos siguen mostrando el reproductor simulado con su modal de guardado.
- [ ] Recargar `/juegos/asteroides/jugar` no produce errores de hidratación ni errores en la consola.
- [ ] Las pantallas de las SPEC 01–04 siguen funcionando sin errores en la consola.

---

## Decisions

- **Yes:** juego nuevo `asteroides` en el catálogo. Decisión del usuario; `rocas` queda como juego simulado.
- **No:** reemplazar `rocas`. Descartado por el usuario.
- **Yes:** reutilizar `cover-rocas` como portada. Decisión del usuario; evita CSS nuevo aunque dos tarjetas compartan portada.
- **No:** portada CSS propia. Queda para otra spec si se quiere diferenciar.
- **Yes:** port a TypeScript con `createAsteroids(canvas, callbacks)` y `destroy()`. Necesario para Strict Mode, navegación del App Router y para que el HUD de la plataforma reciba datos reales.
- **No:** `<iframe>` con el HTML estático en `public/`. Sin tipos y el HUD necesitaría `postMessage`.
- **No:** copiar `game.js` casi tal cual. Globales y listeners sin limpiar duplican loops al remontar.
- **Yes:** HUD en ambos sitios (canvas y plataforma). Decisión del usuario; el canvas conserva su aspecto original.
- **Yes:** port fiel, sin cambios de jugabilidad ni estética. Decisión del usuario; las mejoras van en otra spec.
- **Yes:** `preventDefault` en las teclas del juego. Es adaptación al contexto de página con scroll, no cambio de jugabilidad.
- **Yes:** modal FIN DEL JUEGO sin guardado. Decisión del usuario: no se hace nada con la puntuación por ahora.
- **No:** guardar en `av_scores` o Supabase. Fuera de alcance; requiere su propia spec.
- **Yes:** escalar el canvas 800×600 con CSS dentro de `.crt-screen` (ya 4:3). La física no depende del tamaño en pantalla.
- **No:** controles táctiles. Amplían el alcance; solo teclado.
- **Yes:** componente `AsteroidsPlayer` propio y bifurcación por `game.id` en la página. Es el único juego real; abstraer `GamePlayer` para motores se hará con el segundo juego.
- **Yes:** el modal se deriva del estado del motor (`state === "gameover"`). Así ESPACIO en el canvas y JUGAR DE NUEVO quedan sincronizados sin lógica duplicada.

---

## Risks

| Riesgo                                                     | Mitigación                                                                                                                                                |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Strict Mode monta dos veces y quedan dos loops o listeners | `destroy()` cancela RAF y quita listeners; criterio de aceptación de navegar y volver.                                                                    |
| Flechas y espacio hacen scroll o activan botones enfocados | `preventDefault` en las teclas del juego; al abrir el modal, ESPACIO sobre un botón enfocado y el reinicio del motor llevan al mismo estado (`playing`).  |
| `onChange` en cada frame provoca re-renders y baja el FPS  | El motor solo llama `onChange` cuando cambia score, lives, level o state.                                                                                 |
| `dt` grande al reanudar o volver de otra pestaña           | Se conserva el límite de 50 ms y `lastTime` se reinicia al reanudar.                                                                                      |
| El port cambia la jugabilidad sin querer                   | Port fiel con las mismas constantes; prueba manual de puntuación, vidas, niveles y power-up contra el original (`npx serve` en la carpeta de referencia). |
| Canvas borroso al escalar                                  | Resolución lógica 800×600 aceptada; mejora de DPR fuera de alcance.                                                                                       |
| Cambios de API de Next.js 16 (`cacheComponents`)           | El paso 1 obliga a leer `node_modules/next/dist/docs/` antes de codificar.                                                                                |

---

## What is **not** in this spec

- Guardar puntuaciones (localStorage o Supabase) y Salón de la Fama real.
- Controles táctiles y soporte móvil jugable.
- Cambios de jugabilidad, estética, sonido o portada propia.
- Abstracción genérica de reproductor para varios motores.
- Tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propia spec.
