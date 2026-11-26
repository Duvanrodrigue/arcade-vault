"use server";

import { updateTag } from "next/cache";
import { getGame } from "@/lib/games";
import { createClient } from "@/lib/supabase/server";

const MAX_SCORE = 10_000_000;
// Mismo patrón que el CHECK de public.scores.name.
const NAME_RE = /^[A-Z0-9_ ÑÁÉÍÓÚ-]{1,10}$/;

export type SaveScoreResult = { ok: true } | { ok: false; error: string };

export async function saveScore(input: {
  gameId: string;
  name: string;
  score: number;
}): Promise<SaveScoreResult> {
  try {
    const name = String(input?.name ?? "")
      .trim()
      .toUpperCase();
    if (!NAME_RE.test(name)) {
      return { ok: false, error: "Nombre no válido (1–10 caracteres)." };
    }

    const score = input?.score;
    if (!Number.isInteger(score) || score < 0 || score > MAX_SCORE) {
      return { ok: false, error: "Puntuación no válida." };
    }

    const gameId = String(input?.gameId ?? "");
    if (!(await getGame(gameId))) {
      return { ok: false, error: "Juego no encontrado." };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("scores")
      .insert({ game_id: gameId, name, score });
    if (error) return { ok: false, error: "No se pudo guardar la puntuación." };

    updateTag("scores");
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo guardar la puntuación." };
  }
}
