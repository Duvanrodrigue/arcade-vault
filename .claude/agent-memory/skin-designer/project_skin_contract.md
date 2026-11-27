---
name: project-skin-contract
description: Decisiones del contrato de skins (skins/setSkin opcionales mientras Tetris no migre) y estado por juego
metadata:
  type: project
---

`skins` en `EngineModule` y `setSkin` en `EngineControls` son **opcionales** (creado 2026-11-27 con asteroides).

**Why:** Tetris aún no tiene skins y solo se trabaja un juego por ejecución; hacerlos obligatorios rompía `npm run build`.
**How to apply:** cuando todos los motores registrados tengan skins (ver `references/resources/game-with-themes.md`), proponer hacerlos obligatorios. El player oculta el selector si el motor no exporta `skins`.

Estado: asteroides completo (2026-11-27); tetris pendiente.

Nota: la fuente pixel (Press Start 2P) no tiene glifos Ó/Á en mayúscula y los chips muestran "NEóN"/"CLASICO" (mismo problema en "CRéDITOS" del nav). Es de la fuente de la plataforma, no del skin.
