# Auditoría de skins

Última actualización: 2026-11-27 (ejecución: `asteroides`).

## Tabla (juego × skin)

| Juego        | neon  | retro | clasico | Notas                                                                                          |
| ------------ | ----- | ----- | ------- | ---------------------------------------------------------------------------------------------- |
| `asteroides` | ok    | ok    | ok      | Antes: colores fijos (`#fff`, `#0ff`, `#000`, rgba). Migrado a `lib/games/asteroids/skins.ts`. |
| `tetris`     | falta | falta | falta   | No auditado en detalle (fuera de alcance). Sin `skins`: el player oculta el selector.          |

## Contrastes mínimos medidos (contrastRatio WCAG 2.x contra `bg`)

| Juego      | Skin    | bg L   | Texto mín.                            | Entidades mín.                     |
| ---------- | ------- | ------ | ------------------------------------- | ---------------------------------- |
| asteroides | neon    | 0.0032 | 6.28 (fgDim)                          | 5.15 (asteroid/particle `#ff006e`) |
| asteroides | retro   | 0.0023 | 7.10 (fgDim); 4.55 bajo scanline 0.22 | 5.29 (particle)                    |
| asteroides | clasico | 0.0042 | 8.59 (accent/powerUp)                 | 5.57 (ship `#3a86ff`)              |

Retro es monocromo: entidades se distinguen por luminancia y forma (ship/asteroid 2.21:1 entre sí).
