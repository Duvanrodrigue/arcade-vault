# SPEC perlas-01 — Motor de PERLAS

> **Status:** borrador
> **Depends on:** SPEC 05, SPEC 06, SPEC 07
> **Date:** 2026-11-27
> **Objective:** Crear el motor jugable de PERLAS en `lib/games/perlas/engine.ts`, un puzzle de grupos de perlas de colores en una rejilla 10×10 donde la marea sube una fila cada pocos segundos.

---

## Por qué existe esta spec

Tema del game jam: "océano profundo". PERLAS es un puzzle de género (eliminar grupos adyacentes del mismo color) con una regla propia: la marea empuja una fila nueva desde el fondo del lecho y la partida termina si una perla sale por arriba. Presión de tiempo sin temporizador global.

`lib/games/engine.ts`, `lib/games/registry.ts` y `components/engine-player.tsx` ya existen (SPEC 07) y no se vuelven a especificar. Esta spec no toca el registro ni la base de datos.

---

## Scope

**In:**

- `lib/games/perlas/engine.ts` exporta por defecto un `EngineModule` (`width = 480`, `height = 600`) con estado por instancia y `destroy()` limpio.
- Un canvas 2D, solo teclado, sin sonido ni assets.
- Rejilla 10 columnas × 10 filas de perlas en 4 colores (cyan, magenta, amarillo, verde).
- Cursor de celda movido con las flechas; `Espacio` o `Enter` elimina el grupo conectado (4 vecinos) del mismo color bajo el cursor si tiene 2 o más perlas.
- Gravedad hacia abajo tras eliminar; las columnas no se desplazan lateralmente.
- Marea: cada `tideInterval` ms entra una fila nueva por abajo y todo sube una fila; si una perla sale por arriba, fin de partida.
- Resaltado del grupo bajo el cursor con su valor en puntos.
- Barra de marea (tiempo hasta la próxima fila) dibujada en el canvas.
- HUD de la plataforma: Puntuación, Nivel y Perlas (`extra.pearls`, total eliminadas).
- Pausa con `P` reportada en el snapshot, `pause()`, `resume()`, `end()`, `restart()`.
- Diseño visual neón/retro con el skill `frontend-design`, según `CLAUDE.md`.

**Out of scope (para specs futuras):**

- Registro del motor, fila en `games`, portada y ficha (spec `perlas-02`).
- Perlas especiales (bombas, comodines) y modos de juego.
- Ratón y controles táctiles; solo teclado.
- Sonido y música.
- Antitrampas, auth y tests automatizados (no hay runner).
- Cambios en `EnginePlayer` o en el contrato de motor.

---

## Data model

```ts
// lib/games/perlas/engine.ts — constantes
const COLS = 10;
const ROWS = 10;
const CELL = 44;
const GRID_X = 20;
const GRID_Y = 130; // el panel superior (0–110) lleva la barra de marea
const COLORS = ["#00f0ff", "#ff2bd6", "#ffe600", "#39ff14"] as const; // cyan, magenta, amarillo, verde
const START_ROWS = 6; // filas iniciales llenas (las de abajo)
const TIDE_BASE_MS = 12000;
const TIDE_STEP_MS = 1000; // menos por nivel
const TIDE_MIN_MS = 4000;
const PEARLS_PER_LEVEL = 30;
const CLEAR_BONUS = 500; // × nivel al vaciar la rejilla
const REFILL_ROWS = 5;
const DT_MAX = 0.05; // s
```

```ts
type Cell = number | null; // índice de COLORS o vacío
interface State {
  grid: Cell[][]; // grid[fila][col], fila 0 arriba
  cursor: { col: number; row: number };
  score: number;
  pearls: number; // total eliminadas
  level: number;
  tideMs: number; // tiempo acumulado desde la última fila
  paused: boolean;
  state: "playing" | "dead" | "gameover";
}
```

```ts
const engine: EngineModule = {
  width: 480,
  height: 600,
  hud: [
    { key: "score", label: "PUNTUACIÓN" },
    { key: "level", label: "NIVEL" },
    { key: "extra.pearls", label: "PERLAS" },
  ],
  create,
};
export default engine;
```

Convenciones:

- Puntos por grupo de `n` perlas (n ≥ 2): `(n − 1)² × 10 × nivel`. Con n = 2, 3, 4, 5 en nivel 1: 10, 40, 90, 160.
- Nivel: `floor(perlas / 30) + 1`.
- `tideInterval = max(4000, 12000 − (nivel − 1) × 1000)` ms.
- Si no queda ningún grupo de 2 o más, la marea avanza de inmediato (evita partidas atascadas).
- Rejilla vaciada del todo: `+500 × nivel` y se rellenan 5 filas nuevas desde abajo; la barra de marea se reinicia.
- Una fila nueva genera colores aleatorios con probabilidad uniforme; no se evitan grupos.
- Fin de partida: al subir la marea, alguna perla pasaría de la fila 0.
- El cursor se queda dentro de la rejilla (sin dar la vuelta); empieza en la fila 9, columna 4.
- Controles: `←` `→` `↑` `↓` mueven el cursor; `Espacio` o `Enter` eliminan el grupo; `P` pausa.
- Con la pausa, `tideMs` no avanza.
- `onChange` solo cuando cambia puntuación, perlas, nivel, estado o pausa.

---

## Implementation plan

Cada paso deja la app compilando y ejecutable (`npm run dev`).

1. Leer en `node_modules/next/dist/docs/` lo relevante a Client Components y `import()` dinámico con `cacheComponents` activo antes de escribir código Next.js. Verificación: nota de lectura en el commit.
2. Crear `lib/games/perlas/engine.ts` con constantes, tipos y el `EngineModule` vacío. Verificación: `npm run build`.
3. Implementar estado por instancia, bucle `requestAnimationFrame` con `dt` limitado a `DT_MAX`, listener de teclado en `document` y `destroy()` limpio. Verificación: `npm run build` y `npm run lint`.
4. Implementar rejilla inicial, búsqueda de grupo por inundación (4 vecinos), eliminación, gravedad, puntuación y nivel. Verificación: `npm run build`.
5. Implementar la marea (temporizador, fila nueva, empuje hacia arriba, fin de partida, adelanto cuando no hay grupos y relleno al vaciar). Verificación: `npm run build`.
6. Implementar render: panel superior con barra de marea, rejilla, perlas con brillo, cursor, resaltado del grupo y su valor. Usar el skill `frontend-design` para la paleta neón. Verificación: `npm run build`.
7. Implementar `onChange` solo-en-cambio, `paused` en el snapshot, `pause()`, `resume()` (reinicia `lastTime`), `end()` y `restart()`. `preventDefault` en `ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`, `Space`, `Enter`. Verificación: `npm run build`.

---

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `lib/games/perlas/engine.ts` existe, exporta por defecto un `EngineModule` con `width = 480`, `height = 600` y los 3 campos de HUD indicados.
- [ ] El motor no usa `document.getElementById` ni variables globales de módulo para el estado de juego.
- [ ] Al empezar hay 6 filas llenas abajo y 4 vacías arriba; el cursor está en la fila 9, columna 4.
- [ ] Las flechas mueven el cursor sin salirse de la rejilla; `Espacio`, `Enter` y las flechas no hacen scroll de la página.
- [ ] `Espacio` sobre un grupo de 2 o más perlas del mismo color lo elimina; sobre una perla sola no hace nada.
- [ ] Eliminar grupos de 2, 3, 4 y 5 perlas en nivel 1 suma 10, 40, 90 y 160 puntos.
- [ ] Tras eliminar, las perlas de la columna caen hasta apoyarse; las columnas no se desplazan lateralmente.
- [ ] El nivel sube cada 30 perlas eliminadas y el intervalo de marea sigue `max(4000, 12000 − (nivel − 1) × 1000)` ms.
- [ ] Cuando entra una fila nueva, todo sube una fila; si una perla saldría por arriba, la partida acaba.
- [ ] Si no existe ningún grupo de 2 o más, la marea avanza de inmediato.
- [ ] Vaciar la rejilla suma `500 × nivel` y rellena 5 filas.
- [ ] El grupo bajo el cursor se resalta y muestra los puntos que daría.
- [ ] El HUD de la plataforma muestra Puntuación, Nivel y Perlas con los mismos valores que la lógica; el canvas no repite esos marcadores.
- [ ] `P` pausa y reanuda; `snapshot.paused` es `true` en pausa; la barra de marea no avanza durante la pausa.
- [ ] `end()` fuerza `gameover` y `restart()` deja puntuación 0, perlas 0, nivel 1 y 6 filas llenas.
- [ ] `destroy()` cancela el loop y quita el listener; montar y desmontar dos veces no duplica el temporizador de marea.
- [ ] La puntuación final es un entero entre 0 y 10.000.000.

---

## Decisions

- **Yes:** un solo canvas 480×600 (aspecto 4/5), sin canvas extra. Respeta el contrato de motor.
- **Yes:** fila nueva `perlas` en `games`, `EnginePlayer` + registro y guardado con `ScoreSaveForm` → `saveScore` (decisiones cerradas de `/add-game`; se aplican en la spec 02).
- **Yes:** grupos de 4 vecinos con mínimo 2 perlas. Decisión del agente game-jam; hace jugable cualquier configuración.
- **Yes:** la marea sube por tiempo y se adelanta sin movimientos. Decisión del agente game-jam; evita partidas atascadas y mantiene la presión.
- **Yes:** puntos `(n − 1)² × 10 × nivel`. Decisión del agente game-jam; premia grupos grandes de forma cuadrática.
- **Yes:** cursor por teclado con `Espacio` o `Enter`. Decisión del agente game-jam; el contrato es solo teclado.
- **No:** perlas especiales (bombas, comodines). Sobrepasan una spec de motor.
- **No:** ratón y controles táctiles. Fuera del contrato.
- **No:** desplazar columnas lateralmente. Simplifica la lógica y la verificación.
- **No:** tecla propia de reinicio en game over. El reinicio es el botón JUGAR DE NUEVO.
- **Yes:** listener de teclado en `document`, quitado siempre en `destroy()`.

---

## Risks

| Riesgo                                                  | Mitigación                                                                  |
| ------------------------------------------------------- | --------------------------------------------------------------------------- |
| Partidas atascadas sin grupos disponibles               | La marea se adelanta de inmediato; criterio de aceptación.                  |
| Marea demasiado rápida en niveles altos                 | Intervalo mínimo 4000 ms; revisar el balance en la spec 02.                 |
| Búsqueda de grupo recursiva sobrecarga la pila          | Inundación iterativa con pila explícita sobre 100 celdas como máximo.       |
| `dt` grande al volver de otra pestaña                   | `DT_MAX = 0.05`, `lastTime` reiniciado al reanudar y marea parada en pausa. |
| `onChange` en cada frame provoca re-renders             | Solo se llama cuando cambia un campo observable.                            |
| Strict Mode monta dos veces y quedan dos temporizadores | `destroy()` cancela RAF y quita el listener; criterio de aceptación.        |

---

## What is **not** in this spec

- Registro en `lib/games/registry.ts`, fila en `games`, portada y ficha.
- Perlas especiales, ratón, controles táctiles y sonido.
- Antitrampas, auth y tests automatizados.
- Cambios en `EnginePlayer` o en el contrato de motor.

Cada uno de estos puntos, si se aborda, va en su propia spec.
