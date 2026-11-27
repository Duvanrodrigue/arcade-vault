// Contrato común de skins para los motores jugables.
// Cada juego define su paleta en lib/games/<id>/skins.ts extendiendo SkinPalette.

export type SkinId = "neon" | "retro" | "clasico";

export const SKIN_IDS: readonly SkinId[] = ["neon", "retro", "clasico"];

export const SKIN_LABELS: Record<SkinId, string> = {
  neon: "NEÓN",
  retro: "RETRO",
  clasico: "CLÁSICO",
};

export const DEFAULT_SKIN: SkinId = "neon";

export function isSkinId(value: unknown): value is SkinId {
  return typeof value === "string" && SKIN_IDS.includes(value as SkinId);
}

/** Paleta base. Todos los colores en hexadecimal (#rgb o #rrggbb). */
export interface SkinPalette {
  /** Fondo del canvas (luminancia relativa ≤ 0.05). */
  bg: string;
  /** Texto principal (contraste ≥ 4.5 contra bg). */
  fg: string;
  /** Color de realce (contraste ≥ 4.5 si se usa en texto). */
  accent: string;
  /** Texto del HUD dentro del canvas (contraste ≥ 4.5). */
  hud: string;
  /** shadowBlur en px; 0 = sin brillo. */
  glow: number;
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function parseHex(hex: string): [number, number, number] {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3)
    h = h
      .split("")
      .map((ch) => ch + ch)
      .join("");
  if (!/^[0-9a-f]{6}$/i.test(h)) throw new Error(`Color no válido: ${hex}`);
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** Luminancia relativa WCAG 2.x (0 = negro, 1 = blanco). */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Ratio de contraste WCAG 2.x entre dos colores hexadecimales (1–21). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
