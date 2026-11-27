# SPEC caverna-01 — Motor de CAVERNA

> **Status:** borrador
> **Depends on:** SPEC 05, SPEC 06, SPEC 07
> **Date:** 2026-11-27
> **Objective:** Crear el motor jugable de CAVERNA en `lib/games/caverna/engine.ts`, un vuelo de un solo botón por una cueva neón que se estrecha y acelera, con puntuación por distancia recorrida.

---

## Por qué existe esta spec

Tema del game jam: "caverna". El usuario eligió el juego `caverna` de `references/resources/game-suggestions-todo.md` (propuesto, 27/30). CAVERNA convierte el tema en la mecánica: el techo y el suelo de la cueva son el único enemigo, el túnel se estrecha con cada nivel y las estalactitas y estalagmitas cierran el paso. Es un juego de género (vuelo de un botón con scroll lateral), original en reglas, arte y ambientación.

Se separa el motor del catálogo para que cada spec deje la app compilando. `lib/games/engine.ts`, `lib/games/registry.ts` y `components/engine-player.tsx` ya existen (SPEC 07) y no se vuelven a especificar. Esta spec no toca ni el registro ni la base de datos.

---

## Scope

**In:**

- `lib/games/caverna/engine.ts` exporta por defecto un `EngineModule` (`width = 800`, `height = 600`) con estado por instancia y `destroy()` limpio.
- Un canvas 2D, solo teclado, sin sonido ni assets: todo se dibuja con formas, trazos y degradados.
- Nave del jugador fija en `x = 160` que sube mientras se mantiene el botón y cae por gravedad al soltarlo.
- Cueva generada por columnas de 8 px: techo y suelo siguen una línea central que se desplaza hacia objetivos aleatorios.
- Hueco de la cueva que se estrecha por nivel y pendiente máxima que crece por nivel.
- Obstáculos internos: estalactita (anclada al techo) y estalagmita (anclada al suelo).
- Recolectable: cristal (+50 puntos).
- Tramo inicial recto y sin obstáculos para empezar sin muerte inmediata.
- Muerte al tocar techo, suelo, estalactita o estalagmita: explosión de partículas de 0,8 s y después fin de partida.
- HUD de la plataforma: Puntuación, Distancia (`extra.distance`), Cristales (`extra.crystals`) y Nivel.
- Pausa con `P` reportada en el snapshot (`paused`), `pause()`, `resume()`, `end()`, `restart()`.
- Diseño visual neón/retro con el skill `frontend-design`, según `CLAUDE.md`.

**Out of scope (para specs futuras):**

- Registro del motor, fila en `games`, portada y ficha (spec `caverna-02`).
- Vidas extra, escudos, power-ups o armas.
- Sonido y música.
- Controles táctiles o clic de ratón como botón; solo teclado.
- Tecla de reinicio en game over (el reinicio es el botón JUGAR DE NUEVO).
- Semilla fija o modo diario de cueva.
- Cambios en `EnginePlayer` o en el contrato de motor.
- Antitrampas, auth y tests automatizados (no hay runner).

---

## Data model

```ts
// lib/games/caverna/engine.ts — constantes
const W = 800;
const H = 600;
const SHIP_X = 160; // posición horizontal fija de la nave
const SHIP_W = 24; // hitbox rectangular
const SHIP_H = 12;
const GRAVITY = 900; // px/s² hacia abajo
const THRUST = 1800; // px/s² hacia arriba mientras se mantiene el botón
const VY_MAX = 360; // |vy| máximo en px/s
const COL_W = 8; // ancho de columna de cueva
const START_COLS = 120; // tramo inicial recto (960 px)
const TARGET_EVERY = 40; // columnas entre objetivos de la línea central
const WALL_MARGIN = 20; // margen mínimo entre hueco y borde del canvas
const OBST_W = 24;
const OBST_RATIO = 0.35; // alto del obstáculo respecto al hueco
const CRYSTAL_R = 8;
const CRYSTAL_POINTS = 50;
const CRYSTAL_CHANCE = 0.3;
const DEATH_MS = 800; // explosión antes de gameover
const HUD_THROTTLE_MS = 100; // onChange de score/distancia
const SCORE_MAX = 10_000_000;
const DT_MAX = 0.05; // s
```

```ts
interface Column {
  x: number; // borde izquierdo en coordenadas de pantalla
  top: number; // y del techo
  bottom: number; // y del suelo
}
interface Obstacle {
  kind: "estalactita" | "estalagmita";
  x: number;
  y: number; // borde superior
  h: number;
}
interface Crystal {
  x: number;
  y: number;
  taken: boolean;
}
interface State {
  columns: Column[];
  obstacles: Obstacle[];
  crystals: Crystal[];
  shipY: number; // centro
  vy: number;
  thrust: boolean;
  center: number; // línea central actual
  targetCenter: number;
  colsToTarget: number;
  colsGenerated: number;
  distancePx: number;
  nextObstaclePx: number;
  crystalsTaken: number;
  bonus: number;
  level: number;
  deathMs: number;
  paused: boolean;
  state: "playing" | "dead" | "gameover";
}
```

```ts
const engine: EngineModule = {
  width: 800,
  height: 600,
  hud: [
    { key: "score", label: "PUNTUACIÓN" },
    { key: "extra.distance", label: "DISTANCIA" },
    { key: "extra.crystals", label: "CRISTALES" },
    { key: "level", label: "NIVEL" },
  ],
  create,
};
export default engine;
```

Convenciones:

- Origen del canvas arriba a la izquierda; `y` crece hacia abajo. La nave no se mueve en `x`; la cueva, los obstáculos y los cristales se desplazan a la izquierda a `scrollSpeed` px/s.
- Física por frame: `vy += (thrust ? GRAVITY − THRUST : GRAVITY) × dt`, recortado a `[−VY_MAX, VY_MAX]`; `shipY += vy × dt`. Estado inicial: `shipY = H / 2`, `vy = 0`.
- Distancia en metros: `floor(distancePx / 10)`. Puntuación: `min(SCORE_MAX, metros + bonus)`, siempre entera.
- Nivel: `floor(metros / 300) + 1`.
- Velocidad de scroll: `scrollSpeed = min(420, 200 + (nivel − 1) × 20)` px/s.
- Hueco de la cueva: `gap = max(140, 360 − (nivel − 1) × 20)` px. `top = center − gap / 2`, `bottom = center + gap / 2`.
- Pendiente máxima: `slope = min(6, 2 + (nivel − 1) × 0.5)` px por columna.
- Línea central: cada `TARGET_EVERY` columnas se elige `targetCenter` uniforme en `[gap / 2 + WALL_MARGIN, H − gap / 2 − WALL_MARGIN]`. En cada columna `center` avanza hacia `targetCenter` como máximo `slope` px y se recorta al mismo intervalo.
- Tramo inicial: las primeras `START_COLS` columnas tienen `center = H / 2`, `gap = 360` y ningún obstáculo ni cristal.
- Columnas: se generan por la derecha hasta cubrir `W + COL_W`; se descartan las que salen por la izquierda (`x + COL_W < 0`).
- Obstáculos: uno cada `obstacleGap = max(320, 640 − (nivel − 1) × 40)` px de distancia tras el tramo inicial. Tipo 50 % estalactita y 50 % estalagmita. Ancho `OBST_W`, alto `round(gap × OBST_RATIO)`, anclado al techo o al suelo de su columna. El pasillo libre junto a un obstáculo es siempre `gap × 0.65` (mínimo 91 px).
- Cristales: tras cada obstáculo, con probabilidad `CRYSTAL_CHANCE`, aparece un cristal a `obstacleGap / 2` px por delante, en la línea central de su columna. Tocarlo (distancia al centro de la nave menor que `CRYSTAL_R + SHIP_H / 2`) suma `CRYSTAL_POINTS` a `bonus` y 1 a `crystalsTaken`.
- Colisión: el rectángulo de la nave (`SHIP_W` × `SHIP_H`) toca techo o suelo de cualquier columna que solape en `x`, o el rectángulo de un obstáculo. Salir del canvas por arriba o por abajo también es colisión.
- Al chocar: `state = "dead"`, el scroll se detiene, se dibuja la explosión durante `DEATH_MS`; después `state = "gameover"`. La puntuación no cambia durante `dead`.
- Controles: `Espacio` o `↑` mantenidos activan `thrust`; soltarlos lo desactiva; `P` pausa y reanuda. Al perder el foco la ventana (`blur`), `thrust = false`.
- `preventDefault` en `Space` y `ArrowUp`. Listener de `keydown` y `keyup` en `document` y de `blur` en `window`.
- `onChange` solo cuando cambia un campo. Puntuación y distancia se reportan como máximo cada `HUD_THROTTLE_MS`. Estado, pausa, nivel y cristales se reportan al instante.
- El canvas no dibuja Puntuación, Distancia, Cristales ni Nivel: los muestra el HUD de la plataforma. Solo dibuja el aviso "MANTÉN ESPACIO" durante el tramo inicial.

---

## Implementation plan

Cada paso deja la app compilando y ejecutable (`npm run dev`).

1. Leer en `node_modules/next/dist/docs/` lo relevante a Client Components e `import()` dinámico con `cacheComponents` activo antes de escribir código (el motor es TypeScript puro, pero lo carga `EnginePlayer`). Comprobar que `lib/games/engine.ts`, `lib/games/registry.ts` y `components/engine-player.tsx` existen. Verificación: los tres archivos existen.
2. Crear `lib/games/caverna/engine.ts` con constantes, tipos y el `EngineModule` por defecto; `create` devuelve controles no-op. Verificación: `npm run build`.
3. Implementar el estado por instancia, el bucle `requestAnimationFrame` con `dt` limitado a `DT_MAX`, los listeners (`keydown`, `keyup` en `document`; `blur` en `window`) y `destroy()` que cancela el RAF y quita los tres listeners. Verificación: `npm run build` y `npm run lint`.
4. Implementar la generación de la cueva: tramo inicial, línea central con objetivos, `gap` y `slope` por nivel, alta y baja de columnas. Verificación: `npm run build`.
5. Implementar la física de la nave, obstáculos, cristales, distancia, nivel y puntuación según las convenciones. Verificación: `npm run build`.
6. Implementar colisiones, estado `dead` con explosión de `DEATH_MS` y paso a `gameover`. Verificación: `npm run build`.
7. Implementar el render con el skill `frontend-design`: fondo `#07000f`, relleno de roca `#1a0020`, borde de cueva magenta `#ff006e` con `shadowBlur`, estalactitas y estalagmitas como triángulos con el mismo borde, nave cian `#00f5ff` con estela de 12 puntos, cristales amarillos `#f5ff00` con brillo, partículas de explosión y aviso "MANTÉN ESPACIO". Verificación: `npm run build`.
8. Implementar `onChange` solo-en-cambio con el límite de `HUD_THROTTLE_MS`, `paused` en el snapshot, `pause()`, `resume()` (reinicia `lastTime` y `thrust = false`), `end()` (fuerza `gameover`) y `restart()` (estado inicial). Verificación: `npm run build` y `npm run lint`.
9. Prueba temporal en local con un arnés no versionado (página o consola que importe el motor): jugar una partida, comprobar el tramo inicial, un choque y el paso a `gameover`. Retirar el arnés antes de cerrar el paso. Verificación: `git status` sin archivos de arnés.

---

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `lib/games/caverna/engine.ts` existe y exporta por defecto un `EngineModule` con `width = 800`, `height = 600` y los 4 campos de HUD indicados, en ese orden.
- [ ] El motor no usa `document.getElementById` ni variables globales de módulo para el estado de juego.
- [ ] Mantener `Espacio` o `↑` hace subir la nave; soltarlos la hace caer; la velocidad vertical nunca supera 360 px/s en valor absoluto.
- [ ] `Espacio` y `↑` no hacen scroll de la página.
- [ ] Las primeras 120 columnas (960 px) son rectas, con hueco de 360 px centrado en `y = 300` y sin obstáculos ni cristales.
- [ ] La distancia sube 1 metro cada 10 px de scroll y la puntuación es `metros + 50 × cristales`.
- [ ] Tocar un cristal suma exactamente 50 puntos y 1 a Cristales.
- [ ] El nivel sube cada 300 metros.
- [ ] La velocidad de scroll sigue `min(420, 200 + (nivel − 1) × 20)` px/s.
- [ ] El hueco sigue `max(140, 360 − (nivel − 1) × 20)` px y la pendiente máxima `min(6, 2 + (nivel − 1) × 0.5)` px por columna.
- [ ] Aparece un obstáculo cada `max(320, 640 − (nivel − 1) × 40)` px; su alto es `round(gap × 0.35)` y deja siempre un pasillo de al menos 91 px.
- [ ] Tocar techo, suelo, estalactita o estalagmita, o salir del canvas, detiene el scroll, muestra la explosión 0,8 s y después pasa a `gameover`.
- [ ] La puntuación no cambia entre el choque y `gameover`.
- [ ] El HUD de la plataforma muestra Puntuación, Distancia, Cristales y Nivel con los mismos valores que la lógica; el canvas no repite esos marcadores.
- [ ] `onChange` no se llama más de 10 veces por segundo por cambios de puntuación o distancia.
- [ ] `P` pausa y reanuda; `snapshot.paused` es `true` mientras dura la pausa; al reanudar no hay salto de `dt` y `thrust` empieza en `false`.
- [ ] Cambiar de pestaña con `Espacio` pulsado deja `thrust` en `false` al volver.
- [ ] `end()` fuerza `gameover` y `restart()` deja puntuación 0, distancia 0, cristales 0, nivel 1, `shipY = 300` y `vy = 0`.
- [ ] `destroy()` cancela el loop y quita los listeners; montar y desmontar dos veces no duplica velocidad ni entradas.
- [ ] La puntuación final es un entero entre 0 y 10.000.000.

---

## Decisions

- **Yes:** fila nueva `caverna` en `games`, `EnginePlayer` + registro y guardado con `ScoreSaveForm` → `saveScore`. Decisiones cerradas de `/add-game`; se aplican en la spec `caverna-02`.
- **Yes:** `id = caverna`, `CAVERNA`, `ARCADE`, `magenta`. Decisión del usuario (línea propuesta de `game-suggestions-todo.md`).
- **Yes:** un solo canvas 800×600 (4:3), sin canvas extra. Decisión del agente game-jam; es el aspecto por defecto de `.crt-screen` y da recorrido horizontal al scroll.
- **No:** canvas panorámico 16:9. Más vista por delante, pero baja en pantallas estrechas y no se ha probado en `EnginePlayer`.
- **Yes:** una sola vida y muerte al primer choque. Decisión del agente game-jam; es la regla del género y la puntuación por distancia ya mide el progreso.
- **No:** vidas, escudos o power-ups. Cambian el género y amplían el alcance.
- **Yes:** `Espacio` y `↑` como el único botón. Decisión del agente game-jam; `↑` ayuda a quien espera flechas.
- **No:** clic de ratón o toque como botón. Fuera de "solo teclado".
- **Yes:** cristales de +50 puntos en la línea central. Decisión del agente game-jam; premian arriesgar sin romper el botón único.
- **Yes:** tramo inicial recto de 960 px con aviso "MANTÉN ESPACIO". Decisión del agente game-jam; evita morir antes de entender el control.
- **Yes:** estado `dead` de 0,8 s antes de `gameover`. Decisión del agente game-jam; deja ver el choque antes del modal.
- **Yes:** HUD de plataforma con Puntuación, Distancia, Cristales y Nivel; el canvas no los repite. Decisión del agente game-jam, igual que Tetris.
- **Yes:** `onChange` limitado a 10 por segundo para puntuación y distancia. Decisión del agente game-jam; la distancia cambia hasta 42 veces por segundo a 420 px/s.
- **No:** tecla de reinicio en game over. Mantener `Espacio` al morir reiniciaría sin querer; el reinicio es JUGAR DE NUEVO.
- **Yes:** `thrust = false` en `blur` y al reanudar. Evita una tecla "pegada" que no recibió `keyup`.
- **Yes:** listeners de teclado en `document`, quitados siempre en `destroy()`, como Tetris.
- **No:** sonido ni assets. No se piden y añaden dependencias.

---

## Risks

| Riesgo                                                         | Mitigación                                                                             |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| La cueva genera un paso imposible                              | `slope` limitado y pasillo mínimo de 91 px junto a obstáculos; criterio de aceptación. |
| Una pendiente fuerte combinada con un obstáculo cierra el paso | El obstáculo se ancla a su columna; el pasillo `gap × 0.65` se mide sobre esa columna. |
| `keyup` perdido deja la nave subiendo sin parar                | `thrust = false` en `blur` de `window` y en `resume()`.                                |
| `onChange` demasiado frecuente baja el FPS                     | Límite de `HUD_THROTTLE_MS = 100` para puntuación y distancia.                         |
| `dt` grande al volver de otra pestaña atraviesa una pared      | `DT_MAX = 0.05` y `lastTime` reiniciado al reanudar.                                   |
| Strict Mode monta dos veces y quedan dos loops                 | `destroy()` cancela RAF y quita los tres listeners.                                    |
| `shadowBlur` en cada columna cuesta FPS                        | El borde de la cueva se traza como un único `Path2D` por techo y por suelo por frame.  |
| Dificultad excesiva a partir del nivel 12                      | Topes: velocidad 420 px/s, hueco 140 px, pendiente 6 px; revisar en la spec 02.        |

---

## What is **not** in this spec

- Registro en `lib/games/registry.ts`, fila en `games`, portada y ficha.
- Vidas, power-ups, sonido, controles táctiles y tecla de reinicio.
- Semilla fija o modo diario.
- Cambios en `EnginePlayer` o en el contrato de motor.
- Antitrampas, auth y tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propia spec.
