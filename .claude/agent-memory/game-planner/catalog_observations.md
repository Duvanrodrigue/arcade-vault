---
name: catalog-observations
description: Observaciones no obvias del catalogo de Arcade Vault que afectan a que juego proponer (duplicados simulados, uso real)
metadata:
  type: project
---

Observaciones a 2026-11-27:

- `caida` (PUZZLE, magenta) y `rocas` (SHOOTER, yellow) son simulados que duplican juegos ya jugables (Tetris y Asteroides). No proponer convertirlos en jugables; como mucho, sugerir al usuario retirarlos o redisenarlos.
- Uso real casi nulo: solo 1 score en toda la BD (asteroides, best 2260). El uso no sirve aun para priorizar; priorizar por hueco y coste.
- `04-arkanoid` es la unica referencia en `started-games/` sin spec ni motor; encaja con la fila `bloque-buster`.

**Why:** evita gastar candidatos en duplicados y en metricas de uso sin senal.
**How to apply:** revisar de nuevo con SELECT en cada ejecucion; actualizar si cambian scores o catalogo. Ver [[suggestions]].
