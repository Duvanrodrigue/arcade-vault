---
name: suggestions
description: Registro de todos los candidatos de juego propuestos por game-planner, con fecha, puntuacion, estado y motivo
metadata:
  type: project
---

# Sugerencias de juegos

Estados: propuesto / aceptado / rechazado / implementado. Sincronizar con `specs/` (spec => aceptado) y `lib/games/registry.ts` (motor => implementado).

## 2026-11-27 — Ejecucion 1

### `serpentina` — SERPENTINA (recomendado)

- Fecha: 2026-11-27
- Categoria / color: ARCADE, green (fila ya existe en `games`, hoy Simulado)
- Resumen: serpiente de luz en grilla que come nucleos, crece y acelera; muere al chocar con pared o consigo misma.
- Puntuacion: 28/30 (competicion 4, contrato 5, hueco 4, coste 5, estetica 5, originalidad 5)
- Estado: propuesto
- Motivo: convierte un Simulado en jugable con el motor mas pequeno posible, sin assets ni sonido, genero libre. Sin referencia en started-games: la spec se disena desde descripcion.

### `bloque-buster` — BLOQUE BUSTER

- Fecha: 2026-11-27
- Categoria / color: ARCADE, cyan (fila ya existe, hoy Simulado)
- Resumen: port de la referencia `04-arkanoid` (paleta, pelota, 5 niveles de bloques neon) renombrado como BLOQUE BUSTER.
- Puntuacion: 26/30 (competicion 4, contrato 4, hueco 5, coste 4, estetica 5, originalidad 4)
- Estado: propuesto
- Motivo: referencia lista (~270 lineas, spritesheet, 2 sonidos). Riesgos: score con techo (~10 pts/bloque, 5 niveles finitos; proponer bucle de niveles con mas velocidad), control por raton a sustituir por teclado, nombre comercial "Arkanoid" no debe aparecer. Fuerte segunda opcion.

### `invasores` — INVASORES

- Fecha: 2026-11-27
- Categoria / color: SHOOTER, green (fila ya existe, hoy Simulado)
- Resumen: shooter fijo con oleadas de formaciones alienigenas originales que descienden; canon horizontal y escudos.
- Puntuacion: 25/30 (competicion 5, contrato 5, hueco 3, coste 3, estetica 5, originalidad 4)
- Estado: propuesto
- Motivo: score sin techo por oleadas, pero SHOOTER ya tiene Asteroides jugable; mas piezas (formaciones, balas enemigas, escudos). Enemigos con diseno propio, no los sprites clasicos.
