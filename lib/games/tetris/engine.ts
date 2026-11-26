// Port fiel a TypeScript de references/resources/started-games/03-tetris/game.js.
// Todo el estado vive en el cierre de create (sin globales de módulo). Un único
// canvas: tablero a la izquierda y panel NEXT a la derecha.

import type {
  EngineCallbacks,
  EngineControls,
  EngineModule,
  EngineSnapshot,
  EngineState,
} from "@/lib/games/engine";

// ── Constantes ────────────────────────────────────────────────────────────────
const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
const BOARD_W = COLS * BLOCK; // 300
const PANEL_W = 180;
const W = BOARD_W + PANEL_W; // 480
const H = ROWS * BLOCK; // 600

const COLORS: (string | null)[] = [
  null,
  "#4dd0e1", // I - cyan
  "#ffd54f", // O - yellow
  "#ba68c8", // T - purple
  "#81c784", // S - green
  "#e57373", // Z - red
  "#90caf9", // J - pale blue
  "#ffb74d", // L - orange
  "#9e9e9e", // N - tuerca (gris metálico)
];

const PIECES: number[][][] = [
  [],
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
  [
    [8, 8, 8],
    [8, 0, 8],
    [8, 8, 8],
  ], // N (tuerca)
];

const LINE_SCORES = [0, 100, 300, 500, 800];
const GAME_KEYS = ["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", "Space"];

// Colores del tema oscuro del original (el toggle de tema queda fuera de alcance).
const BOARD_BG = "#1a1a25";
const GRID_LINE = "#22222e";
const PANEL_BG = "#0f0f17";
const BORDER = "#2a2a3a";
const LABEL = "#555570";

// Caja NEXT dentro del panel
const NEXT_BOX = 120;
const NEXT_X = BOARD_W + (PANEL_W - NEXT_BOX) / 2; // 330
const NEXT_Y = 60;

interface Piece {
  type: number;
  shape: number[][];
  x: number;
  y: number;
}

// ── Piezas ────────────────────────────────────────────────────────────────────
function randomPiece(): Piece {
  const type = Math.floor(Math.random() * 8) + 1;
  const shape = PIECES[type].map((row) => [...row]);
  return {
    type,
    shape,
    x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  };
}

function rotateCW(shape: number[][]): number[][] {
  const rows = shape.length;
  const cols = shape[0].length;
  const result = Array.from({ length: cols }, () =>
    new Array<number>(rows).fill(0),
  );
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
  return result;
}

const createBoard = () =>
  Array.from({ length: ROWS }, () => new Array<number>(COLS).fill(0));

function drawBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  colorIndex: number,
  size: number,
  alpha = 1,
) {
  if (!colorIndex) return;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = COLORS[colorIndex] as string;
  ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  ctx.globalAlpha = 1;
}

// ── Motor ─────────────────────────────────────────────────────────────────────
function create(
  canvas: HTMLCanvasElement,
  callbacks: EngineCallbacks,
): EngineControls {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");

  let board: number[][] = createBoard();
  let current: Piece = randomPiece();
  let next: Piece = randomPiece();
  let score = 0;
  let lines = 0;
  let level = 1;
  let state: EngineState = "playing";
  let paused = false;
  let dropInterval = 1000;
  let dropAccum = 0;
  let lastTime = 0;
  let rafId = 0;
  let destroyed = false;
  let last: EngineSnapshot | null = null;

  function emit() {
    if (
      last &&
      last.score === score &&
      last.level === level &&
      last.extra?.lines === lines &&
      last.state === state &&
      last.paused === paused
    )
      return;
    last = { score, level, state, paused, extra: { lines } };
    callbacks.onChange(last);
  }

  function collide(shape: number[][], ox: number, oy: number) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const nx = ox + c;
        const ny = oy + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && board[ny][nx]) return true;
      }
    }
    return false;
  }

  function tryRotate() {
    const rotated = rotateCW(current.shape);
    for (const kick of [0, -1, 1, -2, 2]) {
      if (!collide(rotated, current.x + kick, current.y)) {
        current.shape = rotated;
        current.x += kick;
        return;
      }
    }
  }

  function merge() {
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c])
          board[current.y + r][current.x + c] = current.shape[r][c];
  }

  function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every((v) => v !== 0)) {
        board.splice(r, 1);
        board.unshift(new Array<number>(COLS).fill(0));
        cleared++;
        r++;
      }
    }
    if (cleared) {
      lines += cleared;
      score += (LINE_SCORES[cleared] || 0) * level;
      level = Math.floor(lines / 10) + 1;
      dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    }
  }

  function ghostY() {
    let gy = current.y;
    while (!collide(current.shape, current.x, gy + 1)) gy++;
    return gy;
  }

  function endGame() {
    state = "gameover";
    cancelAnimationFrame(rafId);
  }

  function spawn() {
    current = next;
    next = randomPiece();
    if (collide(current.shape, current.x, current.y)) endGame();
  }

  function lockPiece() {
    merge();
    clearLines();
    spawn();
  }

  function hardDrop() {
    const gy = ghostY();
    score += (gy - current.y) * 2;
    current.y = gy;
    lockPiece();
  }

  function softDrop() {
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
      score += 1;
    } else {
      lockPiece();
    }
  }

  // ── Dibujo ──────────────────────────────────────────────────────────────────
  function drawGrid() {
    if (!ctx) return;
    ctx.strokeStyle = GRID_LINE;
    ctx.lineWidth = 0.5;
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * BLOCK, 0);
      ctx.lineTo(c * BLOCK, H);
      ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * BLOCK);
      ctx.lineTo(BOARD_W, r * BLOCK);
      ctx.stroke();
    }
  }

  function drawNext() {
    if (!ctx) return;
    ctx.fillStyle = PANEL_BG;
    ctx.fillRect(BOARD_W, 0, PANEL_W, H);
    ctx.fillStyle = LABEL;
    ctx.font = "12px monospace";
    ctx.textAlign = "center";
    ctx.fillText("NEXT", BOARD_W + PANEL_W / 2, NEXT_Y - 14);
    ctx.fillStyle = BOARD_BG;
    ctx.fillRect(NEXT_X, NEXT_Y, NEXT_BOX, NEXT_BOX);
    ctx.strokeStyle = BORDER;
    ctx.lineWidth = 1;
    ctx.strokeRect(NEXT_X + 0.5, NEXT_Y + 0.5, NEXT_BOX - 1, NEXT_BOX - 1);

    const shape = next.shape;
    const offX = Math.floor((4 - shape[0].length) / 2);
    const offY = Math.floor((4 - shape.length) / 2);
    ctx.save();
    ctx.translate(NEXT_X, NEXT_Y);
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        drawBlock(ctx, offX + c, offY + r, shape[r][c], BLOCK);
    ctx.restore();
  }

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = BOARD_BG;
    ctx.fillRect(0, 0, BOARD_W, H);
    drawGrid();

    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) drawBlock(ctx, c, r, board[r][c], BLOCK);

    // fantasma
    const gy = ghostY();
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c])
          drawBlock(
            ctx,
            current.x + c,
            gy + r,
            current.shape[r][c],
            BLOCK,
            0.2,
          );

    // pieza actual
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        drawBlock(
          ctx,
          current.x + c,
          current.y + r,
          current.shape[r][c],
          BLOCK,
        );

    drawNext();
  }

  // ── Bucle ───────────────────────────────────────────────────────────────────
  function loop(ts: number) {
    if (destroyed) return;
    const dt = ts - lastTime;
    lastTime = ts;
    dropAccum += dt;
    if (dropAccum >= dropInterval) {
      dropAccum = 0;
      if (!collide(current.shape, current.x, current.y + 1)) current.y++;
      else lockPiece();
    }
    draw();
    emit();
    if (state === "gameover") return;
    rafId = requestAnimationFrame(loop);
  }

  function pause() {
    if (paused || state === "gameover") return;
    paused = true;
    cancelAnimationFrame(rafId);
    emit();
  }

  function resume() {
    if (!paused || state === "gameover") return;
    paused = false;
    lastTime = performance.now(); // evita un dt grande al reanudar
    emit();
    rafId = requestAnimationFrame(loop);
  }

  function init() {
    board = createBoard();
    score = 0;
    lines = 0;
    level = 1;
    state = "playing";
    paused = false;
    dropInterval = 1000;
    dropAccum = 0;
    lastTime = performance.now();
    next = randomPiece();
    spawn();
    cancelAnimationFrame(rafId);
    draw();
    emit();
    rafId = requestAnimationFrame(loop);
  }

  // ── Input ───────────────────────────────────────────────────────────────────
  const onKeyDown = (e: KeyboardEvent) => {
    // No robar teclas al formulario de guardado (nombre del jugador).
    const t = e.target;
    if (
      t instanceof HTMLElement &&
      (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))
    )
      return;
    if (GAME_KEYS.includes(e.code)) e.preventDefault();
    if (e.code === "KeyP") {
      if (paused) resume();
      else pause();
      return;
    }
    if (paused || state === "gameover") return;
    switch (e.code) {
      case "ArrowLeft":
        if (!collide(current.shape, current.x - 1, current.y)) current.x--;
        break;
      case "ArrowRight":
        if (!collide(current.shape, current.x + 1, current.y)) current.x++;
        break;
      case "ArrowDown":
        softDrop();
        break;
      case "ArrowUp":
      case "KeyX":
        tryRotate();
        break;
      case "Space":
        hardDrop();
        break;
      default:
        return;
    }
    draw();
    emit();
  };
  document.addEventListener("keydown", onKeyDown);

  init();

  return {
    pause,
    resume,
    end() {
      if (state === "gameover") return;
      paused = false;
      endGame();
      draw();
      emit();
    },
    restart: init,
    destroy() {
      destroyed = true;
      cancelAnimationFrame(rafId);
      document.removeEventListener("keydown", onKeyDown);
    },
  };
}

const engine: EngineModule = {
  width: W,
  height: H,
  hud: [
    { key: "score", label: "PUNTUACIÓN" },
    { key: "extra.lines", label: "LÍNEAS" },
    { key: "level", label: "NIVEL" },
  ],
  create,
};

export default engine;
