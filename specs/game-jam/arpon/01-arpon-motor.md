# SPEC arpon-01 — Motor de ARPÓN

> **Status:** borrador
> **Depends on:** SPEC 05, SPEC 06, SPEC 07
> **Date:** 2026-11-27
> **Objective:** Crear el motor jugable de ARPÓN en `lib/games/arpon/engine.ts`, un shooter donde un buzo fijo en el lecho marino apunta y lanza un arpón contra criaturas abisales que cruzan la pantalla.

---

## Por qué existe esta spec

Tema del game jam: "océano profundo". ARPÓN es un shooter de apuntado (género) con reglas propias: un solo arpón en el aire que hay que recoger, combo por aciertos consecutivos y criaturas con comportamientos distintos (peces, medusas, tiburones y rapes que persiguen).

`lib/games/engine.ts`, `lib/games/registry.ts` y `components/engine-player.tsx` ya existen (SPEC 07) y no se vuelven a especificar. Esta spec no toca el registro ni la base de datos.

---

## Scope

**In:**

- `lib/games/arpon/engine.ts` exporta por defecto un `EngineModule` (`width = 640`, `height = 480`) con estado por instancia y `destroy()` limpio.
- Un canvas 2D, solo teclado, sin sonido ni assets.
- Buzo fijo en `(320, 440)` que rota su punto de mira con `←` `→` y lanza el arpón con `Espacio`.
- Un solo arpón activo a la vez: sale, avanza hasta su alcance o hasta acertar, y se recoge.
- Cuatro criaturas: pez, medusa, tiburón y rape.
- Combo por aciertos consecutivos que multiplica los puntos.
- Vidas, invulnerabilidad tras un golpe, niveles y frecuencia de aparición creciente.
- HUD de la plataforma: Puntuación, Vidas, Nivel y Combo (`extra.combo`).
- Pausa con `P` reportada en el snapshot, `pause()`, `resume()`, `end()`, `restart()`.
- Diseño visual neón/retro con el skill `frontend-design`, según `CLAUDE.md`.

**Out of scope (para specs futuras):**

- Registro del motor, fila en `games`, portada y ficha (spec `arpon-02`).
- Mejoras de arpón, jefes y modos de juego.
- Sonido, ratón y controles táctiles; solo teclado.
- Antitrampas, auth y tests automatizados (no hay runner).
- Cambios en `EnginePlayer` o en el contrato de motor.

---

## Data model

```ts
// lib/games/arpon/engine.ts — constantes
const W = 640;
const H = 480;
const DIVER = { x: 320, y: 440, r: 16 };
const AIM_MIN = 15; // grados desde +x; 90 es vertical
const AIM_MAX = 165;
const AIM_SPEED = 90; // grados/s
const HARPOON_SPEED = 520; // px/s al salir
const HARPOON_REEL = 700; // px/s al recoger
const HARPOON_RANGE = 380; // px
const START_LIVES = 3;
const INVULN_MS = 1500;
const KILLS_PER_LEVEL = 12;
const SPAWN_BASE_MS = 1400;
const SPAWN_STEP_MS = 100; // menos por nivel
const SPAWN_MIN_MS = 500;
const MAX_ALIVE = 12;
const COMBO_CAP = 5;
const DT_MAX = 0.05; // s
```

```ts
type Kind = "pez" | "medusa" | "tiburon" | "rape";
interface Creature {
  kind: Kind;
  x: number;
  y: number;
  vx: number; // pez, medusa, tiburón
  r: number; // radio de colisión
  hp: number; // tiburón 3, resto 1
}
interface Harpoon {
  active: boolean;
  phase: "out" | "reel";
  angle: number; // grados congelados al lanzar
  len: number; // largo actual de la línea desde el buzo
  hitSomething: boolean;
}
interface State {
  creatures: Creature[];
  harpoon: Harpoon;
  aim: number; // grados
  lives: number;
  score: number;
  kills: number;
  level: number;
  combo: number;
  invulnMs: number;
  spawnMs: number;
  paused: boolean;
  state: "playing" | "dead" | "gameover";
}
```

```ts
const engine: EngineModule = {
  width: 640,
  height: 480,
  hud: [
    { key: "score", label: "PUNTUACIÓN" },
    { key: "lives", label: "VIDAS" },
    { key: "level", label: "NIVEL" },
    { key: "extra.combo", label: "COMBO" },
  ],
  create,
};
export default engine;
```

Convenciones:

- Origen arriba a la izquierda; el ángulo 90 apunta hacia arriba; 15 es casi horizontal a la derecha y 165 a la izquierda.
- Puntos base: pez 10, medusa 0 (ver abajo), tiburón 100 (al tercer impacto), rape 40. Puntos finales = base × `min(combo, 5)`, con `combo` contando el acierto actual (el primer acierto tras un fallo usa ×1).
- Pez: `r = 12`, `|vx|` entre 60 y 100 px/s, altura `y` aleatoria en `[60, 360]`; cruza la pantalla de lado a lado y desaparece al salir.
- Medusa: `r = 16`, `|vx|` entre 30 y 50 px/s; si el arpón la toca, el arpón pasa a `reel`, el combo vuelve a 0 y se restan 20 puntos (mínimo 0). La medusa no muere.
- Tiburón (desde el nivel 3): `r = 22`, `|vx| = 140` px/s, `hp = 3`; cada impacto pasa el arpón a `reel`; el tercer impacto lo elimina.
- Rape (desde el nivel 2): `r = 14`, nada hacia el buzo a `70 + 5 × (nivel − 2)` px/s (tope 120); al tocar al buzo, el buzo pierde 1 vida (si no está invulnerable) y el rape desaparece.
- Acierto en pez, tiburón (tercer impacto) o rape: `combo + 1`, `kills + 1`. Fallo (el arpón completa su recorrido sin tocar nada): `combo = 0`.
- Nivel: `floor(kills / 12) + 1`.
- Aparición cada `max(500, 1400 − (nivel − 1) × 100)` ms, con máximo 12 criaturas vivas. Tipos por nivel: nivel 1 pez 70 % y medusa 30 %; nivel 2 añade rape (pez 50 %, medusa 25 %, rape 25 %); nivel 3 o más añade tiburón (pez 40 %, medusa 20 %, rape 25 %, tiburón 15 %).
- Las criaturas aparecen en el borde izquierdo o derecho (50 %) con velocidad hacia el otro lado; el rape aparece en cualquier borde y persigue.
- Daño al buzo: vidas −1, `invulnMs = 1500` (parpadeo). Con 0 vidas, `state = "gameover"`.
- Controles: `←` `→` rotan el punto de mira; `Espacio` lanza si no hay arpón activo; `P` pausa. Mantener la flecha rota de forma continua.
- `onChange` solo cuando cambia puntuación, vidas, nivel, combo, estado o pausa.

---

## Implementation plan

Cada paso deja la app compilando y ejecutable (`npm run dev`).

1. Leer en `node_modules/next/dist/docs/` lo relevante a Client Components y `import()` dinámico con `cacheComponents` activo antes de escribir código Next.js. Verificación: nota de lectura en el commit.
2. Crear `lib/games/arpon/engine.ts` con constantes, tipos y el `EngineModule` vacío. Verificación: `npm run build`.
3. Implementar estado por instancia, bucle `requestAnimationFrame` con `dt` limitado a `DT_MAX`, listener de teclado en `document` y `destroy()` limpio. Verificación: `npm run build` y `npm run lint`.
4. Implementar el buzo, el punto de mira y el arpón (salida, alcance, recogida y bloqueo mientras está activo). Verificación: `npm run build`.
5. Implementar criaturas: aparición, movimiento, persecución del rape, colisiones arpón-criatura y criatura-buzo, puntos, combo, vidas, nivel. Verificación: `npm run build`.
6. Implementar render: degradado del fondo, rayos de luz, lecho con silueta, buzo, línea del arpón, criaturas con luz neón, guía de apuntado de longitud 60 px. Usar el skill `frontend-design`. Verificación: `npm run build`.
7. Implementar `onChange` solo-en-cambio, `paused` en el snapshot, `pause()`, `resume()` (reinicia `lastTime`), `end()` y `restart()`. `preventDefault` en `ArrowLeft`, `ArrowRight`, `Space`. Verificación: `npm run build`.

---

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `lib/games/arpon/engine.ts` existe, exporta por defecto un `EngineModule` con `width = 640`, `height = 480` y los 4 campos de HUD indicados.
- [ ] El motor no usa `document.getElementById` ni variables globales de módulo para el estado de juego.
- [ ] `←` `→` rotan el punto de mira a 90 grados por segundo, limitado a 15–165 grados; `Espacio` y las flechas no hacen scroll de la página.
- [ ] `Espacio` lanza el arpón solo si no hay otro activo; el arpón avanza a 520 px/s hasta 380 px y se recoge a 700 px/s.
- [ ] Acertar un pez suma 10, un rape 40 y el tercer impacto a un tiburón 100, cada uno multiplicado por `min(combo, 5)`.
- [ ] Tocar una medusa recoge el arpón, pone el combo a 0 y resta 20 puntos sin bajar de 0; la medusa no se elimina.
- [ ] Un arpón que vuelve sin tocar nada pone el combo a 0.
- [ ] El tiburón aparece desde el nivel 3 y el rape desde el nivel 2.
- [ ] Un rape que toca al buzo resta 1 vida y concede 1.5 s de invulnerabilidad; con 0 vidas la partida acaba.
- [ ] El nivel sube cada 12 criaturas eliminadas y el intervalo de aparición sigue `max(500, 1400 − (nivel − 1) × 100)` ms con máximo 12 criaturas vivas.
- [ ] El HUD de la plataforma muestra Puntuación, Vidas, Nivel y Combo con los mismos valores que la lógica; el canvas no repite esos marcadores.
- [ ] `P` pausa y reanuda; `snapshot.paused` es `true` en pausa; al reanudar no hay salto de `dt`.
- [ ] `end()` fuerza `gameover` y `restart()` deja puntuación 0, vidas 3, nivel 1, combo 0 y sin criaturas.
- [ ] `destroy()` cancela el loop y quita el listener; montar y desmontar dos veces no duplica velocidad ni entradas.
- [ ] La puntuación final es un entero entre 0 y 10.000.000.

---

## Decisions

- **Yes:** un solo canvas 640×480 (aspecto 4/3), sin canvas extra. Respeta el contrato de motor.
- **Yes:** fila nueva `arpon` en `games`, `EnginePlayer` + registro y guardado con `ScoreSaveForm` → `saveScore` (decisiones cerradas de `/add-game`; se aplican en la spec 02).
- **Yes:** un solo arpón activo. Decisión del agente game-jam; convierte la puntería en una decisión de riesgo y simplifica el estado.
- **Yes:** combo con tope ×5 que se rompe por fallo o medusa. Decisión del agente game-jam.
- **Yes:** medusa como criatura que no se debe tocar. Decisión del agente game-jam; da una mecánica de castigo sin vidas extra.
- **Yes:** apuntado con teclado rotatorio, sin ratón. Decisión del agente game-jam; el contrato es solo teclado.
- **No:** mejoras de arpón y jefes. Sobrepasan una spec de motor.
- **No:** tecla propia de reinicio en game over. El reinicio es el botón JUGAR DE NUEVO.
- **No:** sonido ni assets.
- **Yes:** listener de teclado en `document`, quitado siempre en `destroy()`.

---

## Risks

| Riesgo                                           | Mitigación                                                                    |
| ------------------------------------------------ | ----------------------------------------------------------------------------- |
| Tiburón con 3 impactos frustra con un solo arpón | `hp = 3` pero cada impacto recoge el arpón; revisar el balance en la spec 02. |
| Colisión línea-círculo falla a velocidades altas | Barrido por segmento entre el largo anterior y el actual en cada frame.       |
| Rapes imposibles de esquivar con arpón único     | Velocidad moderada (tope 120 px/s) y 1.5 s de invulnerabilidad.               |
| `dt` grande al volver de otra pestaña            | `DT_MAX = 0.05` y `lastTime` reiniciado al reanudar.                          |
| `onChange` en cada frame provoca re-renders      | Solo se llama cuando cambia un campo observable.                              |
| Strict Mode monta dos veces y quedan dos loops   | `destroy()` cancela RAF y quita el listener.                                  |

---

## What is **not** in this spec

- Registro en `lib/games/registry.ts`, fila en `games`, portada y ficha.
- Mejoras de arpón, jefes, sonido, ratón y controles táctiles.
- Antitrampas, auth y tests automatizados.
- Cambios en `EnginePlayer` o en el contrato de motor.

Cada uno de estos puntos, si se aborda, va en su propia spec.
