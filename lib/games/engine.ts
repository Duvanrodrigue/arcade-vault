export type EngineState = "playing" | "dead" | "gameover";

export interface EngineSnapshot {
  score: number;
  state: EngineState;
  /** true también cuando la pausa viene de una tecla del motor (P). */
  paused?: boolean;
  lives?: number;
  level?: number;
  /** Campos propios de un juego. Tetris: { lines }. */
  extra?: Record<string, number>;
}

export interface EngineCallbacks {
  /** Solo cuando cambia algo, no cada frame. */
  onChange(snapshot: EngineSnapshot): void;
}

export interface EngineControls {
  pause(): void;
  resume(): void;
  /** Fuerza state = "gameover". */
  end(): void;
  /** Equivale al init original. */
  restart(): void;
  /** Cancela RAF y quita listeners. */
  destroy(): void;
}

export interface HudField {
  key: "score" | "lives" | "level" | `extra.${string}`;
  label: string;
}

export interface EngineModule {
  width: number;
  height: number;
  hud: HudField[];
  create(canvas: HTMLCanvasElement, cb: EngineCallbacks): EngineControls;
}
