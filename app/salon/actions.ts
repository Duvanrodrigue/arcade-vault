"use server";

import { getPlayerBest, type ScoreRow } from "@/lib/scores";

// El nombre del jugador solo existe en el navegador (av_user); el Salón lo
// consulta a través de esta Server Action, que reutiliza la lectura cacheada.
export async function getMyBest(
  gameId: string,
  name: string,
): Promise<ScoreRow | null> {
  const clean = name.trim().toUpperCase();
  if (!gameId || clean.length < 1 || clean.length > 10) return null;
  return getPlayerBest(gameId, clean);
}
