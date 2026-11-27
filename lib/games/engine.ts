import type { SkinId, SkinPalette } from "@/lib/games/skins";

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
  /**
   * Cambia la paleta activa sin reiniciar la partida.
   * Opcional hasta que todos los motores registrados exporten skins.
   */
  setSkin?(id: SkinId): void;
}

export interface EngineCreateOptions {
  skin?: SkinId;
}

export interface HudField {
  key: "score" | "lives" | "level" | `extra.${string}`;
  label: string;
}

export interface EngineModule<P extends SkinPalette = SkinPalette> {
  width: number;
  height: number;
  hud: HudField[];
  /**
   * Paletas neon / retro / clasico del juego (lib/games/<id>/skins.ts).
   * Opcional hasta que todos los motores registrados las exporten.
   */
  skins?: Record<SkinId, P>;
  create(
    canvas: HTMLCanvasElement,
    cb: EngineCallbacks,
    opts?: EngineCreateOptions,
  ): EngineControls;
}
