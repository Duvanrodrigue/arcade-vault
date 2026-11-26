import { cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";

import type { GameCategory } from "@/lib/games-format";

export type { GameCategory };
export type GameColor = "cyan" | "magenta" | "yellow" | "green";

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;
  color: GameColor;
  best: number; // de games_with_stats; 0 = sin partidas
  plays: number; // conteo real; 0 = sin partidas
}

export async function getGames(): Promise<Game[]> {
  "use cache";
  cacheTag("games", "scores");

  const { data, error } = await createPublicClient()
    .from("games_with_stats")
    .select("*")
    .order("position");
  if (error) throw error;

  return data.map((g) => ({
    id: g.id!,
    title: g.title!,
    short: g.short!,
    long: g.long!,
    cat: g.cat as GameCategory,
    cover: g.cover!,
    color: g.color as GameColor,
    best: g.best ?? 0,
    plays: g.plays ?? 0,
  }));
}

export async function getGame(id: string): Promise<Game | undefined> {
  const games = await getGames();
  return games.find((g) => g.id === id);
}
