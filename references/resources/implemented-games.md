# Juegos implementados

Fuente: tabla `games` de Supabase (10 juegos). Estado "Jugable" = tiene motor real en `lib/games/registry.ts`; "Simulado" = usa el reproductor simulado (`components/game-player.tsx`).

| Pos. | ID | Título | Categoría | Color | Cover | Estado |
| ---- | -- | ------ | --------- | ----- | ----- | ------ |
| 1 | `bloque-buster` | BLOQUE BUSTER | ARCADE | cyan | cover-bricks | Simulado |
| 2 | `caida` | CAÍDA | PUZZLE | magenta | cover-tetro | Simulado |
| 3 | `serpentina` | SERPENTINA | ARCADE | green | cover-snake | Simulado |
| 4 | `gloton` | GLOTÓN | ARCADE | yellow | cover-glot | Simulado |
| 5 | `invasores` | INVASORES | SHOOTER | green | cover-invaders | Simulado |
| 6 | `rocas` | ROCAS | SHOOTER | yellow | cover-rocas | Simulado |
| 7 | `ranaria` | RANARIA | ARCADE | green | cover-rana | Simulado |
| 8 | `duelo-pixel` | DUELO PIXEL | VERSUS | cyan | cover-duelo | Simulado |
| 9 | `asteroides` | ASTEROIDES | SHOOTER | cyan | cover-rocas | **Jugable** |
| 10 | `tetris` | TETRIS | PUZZLE | green | cover-tetro | **Jugable** |

## Descripciones

### ASTEROIDES (`asteroides`) — Jugable
- Corta: Rota, propulsa y dispara entre rocas a la deriva.
- Larga: Pilota tu nave en el vacío: rota, propulsa y dispara para destruir asteroides que se parten en fragmentos más pequeños. Tienes 3 vidas, cada oleada trae más rocas y los power-ups de triple disparo te darán ventaja. ¿Cuántos niveles sobrevivirás?

### TETRIS (`tetris`) — Jugable
- Corta: Encaja ocho piezas, incluida la tuerca, y limpia líneas.
- Larga: Ocho piezas caen sin parar: I, O, T, S, Z, J, L y la tuerca N, un anillo de 3×3 con hueco. Muévelas con ← →, rótalas con ↑ o X, acelera la caída con ↓ (+1 punto por fila) y lánzalas de golpe con ESPACIO (+2 por celda). P pausa la partida. Limpiar 1, 2, 3 o 4 líneas da 100, 300, 500 u 800 puntos multiplicados por tu nivel. Subes de nivel cada 10 líneas y la caída se acelera. La partida termina cuando una pieza nueva no cabe.

### BLOQUE BUSTER (`bloque-buster`) — Simulado
- Corta: Rebota la pelota y destruye muros de neón.
- Larga: Pilota una nave-paleta y rebota un núcleo de plasma para pulverizar muros de bloques cromáticos. Cada nivel reorganiza la grilla en patrones imposibles. ¿Hasta dónde llegará tu racha?

### CAÍDA (`caida`) — Simulado
- Corta: Encaja las piezas antes de que el techo te aplaste.
- Larga: Piezas geométricas descienden desde la oscuridad. Rótalas, encástralas y limpia líneas para sobrevivir. La velocidad aumenta sin piedad cada 10 líneas.

### SERPENTINA (`serpentina`) — Simulado
- Corta: Crece sin morder tu propia cola.
- Larga: Una serpiente de luz recorre la grilla buscando núcleos magenta. Cada bocado la alarga y la hace más veloz. Un movimiento en falso y se devora a sí misma.

### GLOTÓN (`gloton`) — Simulado
- Corta: Devora puntos y escapa de los fantasmas.
- Larga: Un círculo glotón patrulla un laberinto coleccionando puntos luminosos. Cuatro espectros lo persiguen, pero cada cierto tiempo aparece una píldora que invierte los papeles.

### INVASORES (`invasores`) — Simulado
- Corta: Defiende el planeta de filas alienígenas.
- Larga: Olas de pixeles hostiles descienden formación tras formación. Mueve tu cañón en horizontal y abre fuego con precisión, antes de que toquen la superficie.

### ROCAS (`rocas`) — Simulado
- Corta: Pulveriza asteroides en gravedad cero.
- Larga: Tu nave triangular flota en vacío absoluto. Dispara y rota para dividir rocas en fragmentos cada vez más pequeños. Cuidado con los OVNIs en el horizonte.

### RANARIA (`ranaria`) — Simulado
- Corta: Cruza la autopista de pixeles.
- Larga: Salta entre carriles de coches a toda velocidad y troncos a la deriva en el río. Llega a los nenúfares antes de que se acabe el tiempo.

### DUELO PIXEL (`duelo-pixel`) — Simulado
- Corta: Dos paletas. Una pelota. Reflejos máximos.
- Larga: El duelo más puro: dos paletas verticales se enfrentan por rebotar una pelota luminosa. Modo solitario contra la CPU o partida local a dos jugadores.
