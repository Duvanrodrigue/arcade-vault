# SPEC batisfera-01 — Motor de BATISFERA

> **Status:** borrador
> **Depends on:** SPEC 05, SPEC 06, SPEC 07
> **Date:** 2026-11-27
> **Objective:** Crear el motor jugable de BATISFERA en `lib/games/batisfera/engine.ts`, un descenso vertical infinito en la fosa oceánica donde se esquivan rocas y medusas, se recoge oxígeno y la puntuación sale de la profundidad.

---

## Por qué existe esta spec

Tema del game jam: "océano profundo". BATISFERA convierte el tema en la mecánica: la cámara baja sin parar, la luz se apaga con la profundidad y el oxígeno es un reloj. Es un juego de género (descenso con esquiva), original en reglas, arte y ambientación.

Se separa el motor del catálogo para que cada spec deje la app compilando. `lib/games/engine.ts`, `lib/games/registry.ts` y `components/engine-player.tsx` ya existen (SPEC 07) y no se vuelven a especificar. Esta spec no toca ni el registro ni la base de datos.

---

## Scope

**In:**

- `lib/games/batisfera/engine.ts` exporta por defecto un `EngineModule` (`width = 480`, `height = 640`) con estado por instancia y `destroy()` limpio.
- Un canvas 2D, solo teclado, sin sonido ni assets: todo se dibuja con formas y degradados.
- Batiscafo del jugador fijo en `y = 160` que se mueve en horizontal; el mundo sube (scroll vertical) a velocidad creciente.
- Obstáculos: roca (bloque fijo), medusa (oscila en horizontal) y pared de coral lateral.
- Recolectables: burbuja de oxígeno (+25 puntos) y perla abisal (+100 puntos).
- Medidor de oxígeno dibujado en el canvas (barra), casco (vidas), profundidad en metros y nivel.
- Oscuridad creciente: máscara radial alrededor del batiscafo; pulso de sonar (`Espacio`) que revela toda la pantalla 0.6 s con enfriamiento de 8 s.
- HUD de la plataforma: Puntuación, Vidas, Nivel y Profundidad (`extra.depth`). El oxígeno y el enfriamiento del sonar solo viven en el canvas.
- Pausa con `P` reportada en el snapshot (`paused`), `pause()`, `resume()`, `end()`, `restart()`.
- Fin de partida: casco en 0 u oxígeno en 0.
- Diseño visual neón/retro con el skill `frontend-design`, según `CLAUDE.md`.

**Out of scope (para specs futuras):**

- Registro del motor, fila en `games`, portada y ficha (spec `batisfera-02`).
- Sonido y música.
- Controles táctiles o soporte móvil jugable.
- Jefes, tienda de mejoras y modos de juego adicionales.
- Antitrampas, auth y tests automatizados (no hay runner).
- Cambios en `EnginePlayer` o en el contrato de motor.

---

## Data model

```ts
// lib/games/batisfera/engine.ts — constantes
const W = 480;
const H = 640;
const SUB_Y = 160; // posición vertical fija del batiscafo
const SUB_W = 28; // hitbox
const SUB_H = 20;
const SUB_SPEED = 240; // px/s horizontal
const MAX_HULL = 3;
const INVULN_MS = 1500; // tras un golpe
const OXY_MAX = 100;
const OXY_DRAIN_BASE = 4; // unidades/s
const OXY_DRAIN_PER_LEVEL = 0.5; // + por nivel, tope 8
const OXY_BUBBLE = 30; // recarga por burbuja
const SONAR_MS = 600;
const SONAR_COOLDOWN_MS = 8000;
const DT_MAX = 0.05; // s
```

```ts
type Kind = "roca" | "medusa" | "burbuja" | "perla";
interface Entity {
  kind: Kind;
  x: number; // centro
  y: number; // coordenada de mundo en pantalla; baja a medida que sube el scroll
  w: number;
  h: number;
  phase?: number; // solo medusa
}
interface State {
  entities: Entity[];
  subX: number;
  hull: number;
  oxygen: number;
  distancePx: number; // profundidad en px; metros = floor(distancePx / 10)
  bonus: number; // puntos por burbujas y perlas
  level: number;
  invulnMs: number;
  sonarActiveMs: number;
  sonarCdMs: number;
  paused: boolean;
  state: "playing" | "dead" | "gameover";
}
```

```ts
const engine: EngineModule = {
  width: 480,
  height: 640,
  hud: [
    { key: "score", label: "PUNTUACIÓN" },
    { key: "lives", label: "CASCO" },
    { key: "level", label: "NIVEL" },
    { key: "extra.depth", label: "PROFUNDIDAD" },
  ],
  create,
};
export default engine;
```

Convenciones:

- Origen del canvas arriba a la izquierda; `y` crece hacia abajo; las entidades suben a `scrollSpeed` px/s porque el batiscafo desciende.
- Profundidad en metros: `floor(distancePx / 10)`. Puntuación: `metros + bonus`.
- Nivel: `floor(metros / 250) + 1`.
- Velocidad de descenso: `scrollSpeed = min(320, 120 + (nivel − 1) × 15)` px/s.
- Drenaje de oxígeno: `min(8, 4 + (nivel − 1) × 0.5)` por segundo.
- Radio de luz: `max(110, 300 − (nivel − 1) × 20)` px. Fuera del radio solo se ve la silueta tenue del coral lateral; las entidades se ven solo dentro del radio o durante el pulso de sonar.
- Spawn: una fila cada `rowGap = max(150, 260 − (nivel − 1) × 10)` px de scroll. Cada fila genera 1 a 3 entidades en x aleatorios sin solaparse; probabilidades: roca 50 %, medusa 30 %, burbuja 15 %, perla 5 %. Garantiza siempre un pasillo libre de al menos 80 px.
- Tamaños: roca 48×32, medusa 36×36 (oscila `x ± 60` con periodo 3 s), burbuja 20×20, perla 14×14, coral lateral 16 px de ancho en ambos bordes (colisión con los bordes: el batiscafo se limita a `[16 + SUB_W/2, W − 16 − SUB_W/2]`, sin daño).
- Golpe de roca o medusa: casco −1, entidad eliminada, `invulnMs = 1500` (parpadeo). Con casco en 0: `state = "gameover"`.
- Oxígeno en 0: `state = "gameover"`.
- Controles: `←` `→` mover; `↓` acelera el descenso ×1.5 mientras se mantiene (y duplica los puntos de profundidad por metro mientras se mantiene, es decir, 2 por metro); `Espacio` lanza el pulso de sonar si el enfriamiento es 0; `P` pausa.
- `onChange` solo cuando cambia puntuación, casco, nivel, profundidad (metro entero), estado o pausa.

---

## Implementation plan

Cada paso deja la app compilando y ejecutable (`npm run dev`).

1. Leer en `node_modules/next/dist/docs/` lo relevante a Client Components y `import()` dinámico con `cacheComponents` activo antes de escribir código Next.js (el motor es TypeScript puro, pero lo carga `EnginePlayer`). Verificación: nota de lectura en el commit.
2. Crear `lib/games/batisfera/engine.ts` con constantes, tipos y el `EngineModule` vacío (`create` devuelve controles no-op). Verificación: `npm run build`.
3. Implementar estado por instancia, bucle `requestAnimationFrame` con `dt` limitado a `DT_MAX`, listener de teclado en `document`, y `destroy()` que cancela RAF y quita el listener. Verificación: `npm run build` y `npm run lint`.
4. Implementar movimiento, scroll, generación de filas, colisiones, oxígeno, casco, nivel y puntuación según las convenciones. Verificación: `npm run build`.
5. Implementar render: fondo con degradado `#021a2b` a `#000208` según profundidad, coral lateral, entidades, batiscafo con parpadeo, máscara radial de luz, pulso de sonar, barra de oxígeno y icono de enfriamiento de sonar. Usar el skill `frontend-design` para la paleta neón. Verificación: `npm run build`.
6. Implementar `onChange` solo-en-cambio, `paused` en el snapshot, `pause()`, `resume()` (reinicia `lastTime`), `end()` y `restart()` (estado inicial). `preventDefault` en `ArrowLeft`, `ArrowRight`, `ArrowDown`, `Space`. Verificación: `npm run build`.
7. Prueba temporal en local con un arnés: importar el motor desde una página no versionada o desde la consola, jugar una partida y comprobar casco, oxígeno y fin. Retirar el arnés antes de cerrar el paso. Verificación: `git status` sin archivos de arnés.

---

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `lib/games/batisfera/engine.ts` existe, exporta por defecto un `EngineModule` con `width = 480`, `height = 640` y los 4 campos de HUD indicados.
- [ ] El motor no usa `document.getElementById` ni variables globales de módulo para el estado de juego.
- [ ] `←` `→` mueven el batiscafo a 240 px/s y lo limitan a los bordes del coral sin daño.
- [ ] `↓`, `←`, `→` y `Espacio` no hacen scroll de la página.
- [ ] La profundidad sube 1 metro cada 10 px de descenso; con `↓` mantenido la velocidad es ×1.5 y la puntuación suma 2 por metro.
- [ ] Recoger una burbuja suma 25 puntos y 30 de oxígeno (tope 100); recoger una perla suma 100 puntos.
- [ ] El oxígeno baja 4 por segundo en el nivel 1 y sube 0.5 por nivel hasta 8; con 0 de oxígeno la partida acaba.
- [ ] Tocar roca o medusa resta 1 de casco y da 1.5 s de invulnerabilidad; con casco 0 la partida acaba.
- [ ] El nivel sube cada 250 metros; la velocidad de descenso sigue `min(320, 120 + (nivel − 1) × 15)`.
- [ ] El radio de luz sigue `max(110, 300 − (nivel − 1) × 20)`; `Espacio` revela toda la pantalla 0.6 s y no se puede repetir hasta pasados 8 s.
- [ ] Cada fila generada deja un pasillo libre de al menos 80 px.
- [ ] El HUD de la plataforma muestra Puntuación, Casco, Nivel y Profundidad con los mismos valores que la lógica; el canvas no repite esos marcadores.
- [ ] `P` pausa y reanuda; `snapshot.paused` es `true` mientras dura la pausa; al reanudar no hay salto de `dt`.
- [ ] `end()` fuerza `gameover` y `restart()` deja puntuación 0, casco 3, oxígeno 100, nivel 1 y profundidad 0.
- [ ] `destroy()` cancela el loop y quita el listener; montar y desmontar dos veces no duplica velocidad ni entradas.
- [ ] La puntuación final es un entero entre 0 y 10.000.000.

---

## Decisions

- **Yes:** un solo canvas 480×640 (aspecto 3/4), sin canvas extra. Respeta el contrato de motor.
- **Yes:** fila nueva `batisfera` en `games`, `EnginePlayer` + registro y guardado con `ScoreSaveForm` → `saveScore` (decisiones cerradas de `/add-game`; se aplican en la spec 02).
- **Yes:** oxígeno y sonar solo en el canvas; el HUD de plataforma lleva Puntuación, Casco, Nivel y Profundidad. Decisión del agente game-jam.
- **Yes:** la puntuación base es la profundidad en metros. Decisión del agente game-jam; hace la puntuación monótona y fácil de verificar.
- **Yes:** `↓` como arriesgar por más puntos (×1.5 de velocidad, 2 por metro). Decisión del agente game-jam.
- **Yes:** pulso de sonar con enfriamiento de 8 s como respuesta mecánica a la oscuridad. Decisión del agente game-jam.
- **No:** jefes, mejoras y tienda. Sobrepasan el alcance de una spec de motor.
- **No:** tecla propia de reinicio en game over. No hay original; el reinicio es el botón JUGAR DE NUEVO.
- **No:** sonido ni assets. No se pide y añade dependencias.
- **Yes:** listener de teclado en `document`, quitado siempre en `destroy()`, como Tetris.

---

## Risks

| Riesgo                                         | Mitigación                                                                         |
| ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| Filas imposibles por solapes de entidades      | Pasillo libre mínimo de 80 px garantizado en cada fila; criterio de aceptación.    |
| La máscara de oscuridad cuesta FPS             | Un único `createRadialGradient` por frame sobre una capa; sin filtros.             |
| `dt` grande al volver de otra pestaña          | `DT_MAX = 0.05` y `lastTime` reiniciado al reanudar.                               |
| `onChange` en cada frame provoca re-renders    | Solo se llama cuando cambia un campo observable.                                   |
| Strict Mode monta dos veces y quedan dos loops | `destroy()` cancela RAF y quita el listener.                                       |
| Dificultad excesiva a partir del nivel 8       | Velocidad tope 320 px/s, drenaje tope 8 y radio mínimo 110; revisar en la spec 02. |

---

## What is **not** in this spec

- Registro en `lib/games/registry.ts`, fila en `games`, portada y ficha.
- Sonido, controles táctiles y jefes.
- Antitrampas, auth y tests automatizados.
- Cambios en `EnginePlayer` o en el contrato de motor.

Cada uno de estos puntos, si se aborda, va en su propia spec.
