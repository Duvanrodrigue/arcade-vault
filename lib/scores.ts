import { cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string; // "dd/mm/aaaa"
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });

function toRow(r: {
  rank: number | null;
  name: string | null;
  score: number | null;
  created_at: string | null;
}): ScoreRow {
  return {
    rank: r.rank ?? 0,
    name: r.name ?? "",
    score: r.score ?? 0,
    date: r.created_at ? formatDate(r.created_at) : "",
  };
}

export async function getLeaderboard(
  gameId: string,
  limit: number,
): Promise<ScoreRow[]> {
  "use cache";
  cacheTag("scores");

  const { data, error } = await createPublicClient()
    .from("leaderboard")
    .select("rank, name, score, created_at")
    .eq("game_id", gameId)
    .order("rank")
    .limit(limit);
  if (error) throw error;
  return data.map(toRow);
}

export async function getPlayerBest(
  gameId: string,
  name: string,
): Promise<ScoreRow | null> {
  "use cache";
  cacheTag("scores");

  const { data, error } = await createPublicClient()
    .from("leaderboard")
    .select("rank, name, score, created_at")
    .eq("game_id", gameId)
    .eq("name", name)
    .maybeSingle();
  if (error) throw error;
  return data ? toRow(data) : null;
}
