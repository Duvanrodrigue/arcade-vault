# Juegos con skins

Registro de qué juegos ya tienen los skins `neon`, `retro` y `clasico`. Lo mantiene el agente `skin-designer` (`.claude/agents/skin-designer.md`). Los skins se aplican **solo al juego que el usuario indique**, de uno en uno.

Estado: `pendiente` (sin skins), `parcial` (faltan skins o fallan el contraste), `completo` (3 skins válidos en oscuro y verificados).

| ID | Título | Estado | neon | retro | clasico | Contraste mín. (HUD / piezas) | Fecha | Paleta |
| -- | ------ | ------ | ---- | ----- | ------- | ----------------------------- | ----- | ------ |
| `asteroides` | ASTEROIDES | completo | ok | ok | ok | neon 6.28 / 5.15 · retro 7.10 / 5.29 · clasico 8.59 / 5.57 | 2026-11-27 | neon: cyan/magenta/yellow/green con glow · retro: ámbar CRT + scanlines · clasico: azul/arena/amarillo/verde sólidos |
| `tetris` | TETRIS | pendiente | - | - | - | - | - | - |

Solo se listan juegos jugables (con motor en `lib/games/registry.ts`). Los simulados se añaden cuando tengan motor.

## Historial

Una línea por ejecución: `fecha — id — skins aplicados — resultado`.

- 2026-11-27 — asteroides — neon, retro, clasico — completo (contrato `lib/games/skins.ts` creado; contraste medido; Playwright: cambio de skin en mitad de partida y en pausa sin reinicio).
