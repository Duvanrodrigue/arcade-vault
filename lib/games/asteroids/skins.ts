// Paletas de Asteroides. El motor no contiene colores literales: todo sale de aquí.
// Contrastes medidos con contrastRatio (WCAG 2.x) contra `bg`:
// texto ≥ 4.5:1, entidades jugables ≥ 3:1. Ver references/resources/game-with-themes.md.

import type { SkinId, SkinPalette } from "@/lib/games/skins";

export interface AsteroidsPalette extends SkinPalette {
  /** Texto secundario del overlay de game over. */
  fgDim: string;
  ship: string;
  asteroid: string;
  bullet: string;
  /** Rombo del power-up y su etiqueta "3x" (también es texto). */
  powerUp: string;
  flame: string;
  /** Color base de las chispas; la opacidad la pone el motor. */
  particle: string;
  /** Opacidad de las scanlines (0 = sin scanlines). */
  scanlines: number;
}

export const ASTEROIDS_SKINS: Record<SkinId, AsteroidsPalette> = {
  // Colores de la plataforma con brillo.
  neon: {
    bg: "#0a0a0f",
    fg: "#e6e9ff",
    fgDim: "#8a8fb5",
    accent: "#00ff88",
    hud: "#00f5ff",
    glow: 10,
    ship: "#00f5ff",
    asteroid: "#ff006e",
    bullet: "#f5ff00",
    powerUp: "#00ff88",
    flame: "#f5ff00",
    particle: "#ff006e",
    scanlines: 0,
  },
  // Fósforo ámbar monocromo, sin brillo, con scanlines suaves.
  retro: {
    bg: "#0c0700",
    fg: "#ffcc66",
    fgDim: "#c98f1e",
    accent: "#ffe08a",
    hud: "#ffb000",
    glow: 0,
    ship: "#ffe39e",
    asteroid: "#d98a00",
    bullet: "#fff1cc",
    powerUp: "#ffb000",
    flame: "#ff8a00",
    particle: "#b87400",
    scanlines: 0.22,
  },
  // Colores sólidos tradicionales, sin brillo ni efectos.
  clasico: {
    bg: "#0b0d17",
    fg: "#f1f1f1",
    fgDim: "#b8bcc8",
    accent: "#2dc653",
    hud: "#f1f1f1",
    glow: 0,
    ship: "#3a86ff",
    asteroid: "#b08968",
    bullet: "#ffd23f",
    powerUp: "#2dc653",
    flame: "#f77f00",
    particle: "#b08968",
    scanlines: 0,
  },
};
