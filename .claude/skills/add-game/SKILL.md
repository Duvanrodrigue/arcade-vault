---
name: add-game
description: Genera la spec para añadir un juego real jugable a Arcade Vault (port desde references/resources/started-games/ o diseño nuevo), siguiendo la receta de SPEC 05 y 06. Antes de escribir la spec lee la skill /spec y las specs de specs/ como referencia. Solo escribe la spec; se implementa con /spec-impl.
disable-model-invocation: true
argument-hint: "<carpeta de referencia o descripción del juego>"
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*)
---

# /add-game — Spec para añadir un juego real a Arcade Vault

## Contexto de sesión

Fecha de hoy (úsala en la cabecera de la spec, nunca la adivines):
!`date +%F`

Specs existentes:
!`ls specs/ 2>/dev/null || echo "La carpeta specs/ no existe"`

Juegos de referencia disponibles:
!`ls references/resources/started-games/ 2>/dev/null || echo "Sin carpeta de referencia"`

Motores ya integrados (si existe `registry.ts`, el reproductor genérico ya está hecho):
!`ls lib/games/ 2>/dev/null`

---

Esta skill **no escribe código**. Produce una spec `specs/NN-<slug>.md` en estado `borrador` que describe cómo portar o crear un juego e integrarlo en la plataforma (motor, reproductor, catálogo en Supabase, guardado de puntuaciones). La implementación se hace después con `/spec-impl`.

La receta de integración (contrato de motor, registro, reproductor genérico, migración, checklist de port, criterios base) está en `integration-recipe.md`, en este mismo directorio. La forma de la spec **no se define aquí**: la dicta la skill `/spec` (`.claude/skills/spec/SKILL.md` y `template.md`) y las specs existentes en `specs/`. Esta skill solo añade el contenido específico de juegos.

## Referencia obligatoria antes de escribir la spec

**Antes de crear cualquier archivo en `specs/`**, lee en este orden y sigue lo que dicen:

1. `.claude/skills/spec/SKILL.md`: fases, reglas de escritura, numeración, formato de cabecera, estado por defecto, `Depends on`, siembra de `specs/.spec-config.yml` y reglas duras.
2. `.claude/skills/spec/template.md`: estructura y secciones de la spec.
3. Todas las specs de `specs/` (como mínimo `05-asteroides-juego.md`, `06-leaderboard-tabla-juegos.md` y las dos más recientes): idioma, estados (`borrador`/`aprobado`/`implementado`), encabezados, estilo de decisiones y riesgos.

Si algo de esta skill choca con `/spec`, manda `/spec`, salvo las decisiones cerradas de abajo. No escribas la spec sin haber leído estos archivos en esta ejecución.

Responde en el idioma del prompt inicial (español por defecto en este repo).

## Decisiones ya cerradas (no reabrir)

- Todo juego nuevo es una **fila nueva** en `public.games`; nunca reemplaza un juego simulado existente (CAÍDA, BLOQUE BUSTER…), aunque se parezca.
- Los motores reales usan el **reproductor genérico** (`EnginePlayer` + registro id→motor). Si aún no existe (`lib/games/registry.ts` ausente), la spec incluye primero el refactor, migrando Asteroides a él.
- El guardado de puntuaciones usa `ScoreSaveForm` → `saveScore`. No se crea otro flujo.
- Solo se genera la spec. Nunca se implementa aquí.

## Flujo

### Fase 1 — Contexto

1. Lee `CLAUDE.md`, `integration-recipe.md` y lo listado en "Referencia obligatoria" (skill `/spec`, `template.md` y las specs de `specs/`).
2. Lee los archivos reales que la receta toca, para no inventar nombres: `components/asteroids-player.tsx`, `components/score-save-form.tsx`, `app/juegos/[id]/jugar/page.tsx`, `app/juegos/[id]/jugar/actions.ts` y la cabecera/API de `lib/games/asteroids/engine.ts`.
3. Mira el listado de `specs/` para el siguiente número y para copiar el estilo (idioma, estados como `borrador`/`aprobado`/`implementado`, encabezados).

Si `$ARGUMENTS` viene vacío, pide una descripción de **una sola frase** del juego (o el nombre de una carpeta de `started-games/`). Si no cabe en una frase, el alcance es demasiado grande: propón dividirlo.

### Fase 2 — Origen del juego

- **Si `$ARGUMENTS` coincide con una carpeta de `references/resources/started-games/`** (p. ej. `03-tetris`): lee su `CLAUDE.md`, `README.md`, `index.html`, **todos** los `.js` (y `.css` si lo usa) y lista `assets/`. Extrae y anota:
  - resolución del/los canvas (incluidos canvases extra, p. ej. preview de pieza);
  - controles y teclas que hacen scroll por defecto;
  - puntuación, vidas, niveles, power-ups, condición de fin;
  - estados del juego (pausa, game over, overlays);
  - elementos DOM del original (HUD, sidebar, overlays) que deban pasar al canvas o a React;
  - assets (sprites, sonidos) y cómo se cargan;
  - todo lo que impide montarlo en React: `document.getElementById`, estado global de módulo, listeners en `window` sin quitar, `requestAnimationFrame` sin cancelar.
- **Si no coincide** (juego nuevo): pregunta mecánica, controles, puntuación, fin de partida y resolución. Si viene de otra carpeta o URL, léela igual.

### Fase 3 — Preguntas

Usa `AskUserQuestion` en bloques de 3–5, con tu recomendación primero y etiquetada. Cubre siempre, saltando lo que ya esté claro:

1. **Identidad:** `id` (slug), `title` en mayúsculas y español, `cat` (`ARCADE`/`PUZZLE`/`SHOOTER`/`VERSUS`), `color` (`cyan`/`magenta`/`yellow`/`green`).
2. **Portada:** reutilizar una `cover-*` existente (lista las de `app/globals.css`) o crear `.cover-<id>` en CSS.
3. **HUD de la plataforma:** qué campos (Puntuación siempre; Vidas, Nivel, Líneas…) y si el canvas conserva su propio HUD.
4. **DOM del original:** cada elemento (sidebar, preview, overlays) → dibujado en canvas o HUD React.
5. **Assets y sonido:** copiar a `public/games/<id>/` e incluirlos, o dejarlos fuera de alcance.
6. **Fidelidad:** port fiel (por defecto) o cambios de jugabilidad/estética (mejor en otra spec).
7. **Entrada:** solo teclado (por defecto) o táctil.
8. **Si falta el reproductor genérico:** si la spec resultaría grande, ofrece separar el refactor en su propia spec previa.

Frases concretas, no abiertas. Si una respuesta abre una caja de Pandora (multijugador, auth, antitrampas), indica que merece su propia spec y pregunta si queda fuera.

Detente cuando puedas responder sin suponer: qué archivos aparecen o cambian, cuál es el primer y último paso ejecutable, y cómo se verifica que está terminado.

### Fase 4 — Escribir la spec

Comprueba que ya leíste `.claude/skills/spec/SKILL.md`, `template.md` y las specs de `specs/`. Si no, léelos ahora, antes de escribir.

Si ya tienes toda la información, escribe la spec completa sin pedir confirmación por secciones. Sigue la estructura de `/spec` y `template.md`, que en la práctica es la de las specs 05 y 06:

1. Cabecera: `# SPEC NN — …`, `> **Status:** borrador`, `> **Depends on:** SPEC 05, SPEC 06` (+ la del refactor si es una spec aparte), `> **Date:**` (del contexto), `> **Objective:**` una sola frase.
2. Por qué existe esta spec (breve; qué impide montar el original tal cual).
3. Scope: **In** / **Out of scope** explícitos.
4. Data model: entrada de `games`, contrato del motor del juego, constantes que se conservan.
5. Implementation plan: pasos numerados, cada uno deja la app compilando. Incluye siempre: leer docs de Next en `node_modules/next/dist/docs/`; refactor a `EnginePlayer`/registro si no existe; motor en `lib/games/<id>/engine.ts`; assets; migración `add_game_<id>` con `apply_migration`; portada; prueba con Playwright (screenshots en `.playwright-screenshots/`) y borrado de filas de prueba en `scores`. Menciona el skill `frontend-design` para la UI.
6. Acceptance criteria: casillas booleanas verificables = **criterios base de `integration-recipe.md`** + los específicos del juego (puntos por acción, niveles, ghost, power-ups…).
7. Decisions: Yes/No con justificación breve (incluye las decisiones cerradas de esta skill).
8. Risks: solo los aplicables.
9. What is **not** in this spec.

Solo si falta información, desarrolla sección por sección con confirmación.

### Fase 5 — Guardar

1. Siguiente número de `specs/` con dos dígitos; slug kebab-case (`NN-<juego>-juego.md`, como `05-asteroides-juego.md`).
2. Escribe el archivo directamente, sin pedir permiso. Solo pregunta si ya existe.
3. Marca `borrador`. Nunca `aprobado`.
4. Verifica que cada spec en `Depends on` exista en `specs/`.
5. Si `specs/.spec-config.yml` no existe, créalo con el contenido por defecto que indica `/spec`; si existe, no lo toques.
6. Confirma: ruta creada, estado `borrador`, y que tras revisarla se cambia a `aprobado` y se ejecuta `/spec-impl NN-<slug>`. **Detente ahí.**

## Reglas duras

- Nunca crees un archivo en `specs/` sin haber leído antes `/spec` (`SKILL.md` y `template.md`) y las specs existentes.
- Nunca escribas código de implementación; solo el `.md` final.
- Nunca propongas implementar tras guardar.
- Nunca supongas decisiones no confirmadas.
- No repitas en la Fase 4 preguntas ya respondidas.
- Si el usuario quiere saltarse las preguntas, avísalo y regístralo en Decisions ("Definición rápida sin aclaraciones detalladas").
