// Helpers sin dependencias de servidor: importables desde Client Components.
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";

export const CATS: ("TODOS" | GameCategory)[] = [
  "TODOS",
  "ARCADE",
  "PUZZLE",
  "SHOOTER",
  "VERSUS",
];

// best / plays = 0 significan "sin partidas".
export const formatBest = (n: number) =>
  n > 0 ? n.toLocaleString("es-ES") : "—";

export const formatPlays = (n: number) =>
  n > 0 ? n.toLocaleString("es-ES", { notation: "compact" }) : "—";
