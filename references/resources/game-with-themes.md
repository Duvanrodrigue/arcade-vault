# Juegos con skins

Registro de qué juegos ya tienen los skins `neon`, `retro` y `clasico`. Lo mantiene el agente `skin-designer` (`.claude/agents/skin-designer.md`). Los skins se aplican **solo al juego que el usuario indique**, de uno en uno.

Estado: `pendiente` (sin skins), `parcial` (faltan skins o fallan el contraste), `completo` (3 skins válidos en oscuro y verificados).

| ID | Título | Estado | neon | retro | clasico | Contraste mín. (HUD / piezas) | Fecha | Paleta |
| -- | ------ | ------ | ---- | ----- | ------- | ----------------------------- | ----- | ------ |
| `asteroides` | ASTEROIDES | pendiente | - | - | - | - | - | - |
| `tetris` | TETRIS | pendiente | - | - | - | - | - | - |

Solo se listan juegos jugables (con motor en `lib/games/registry.ts`). Los simulados se añaden cuando tengan motor.

## Historial

Una línea por ejecución: `fecha — id — skins aplicados — resultado`.

_Sin ejecuciones todavía._
