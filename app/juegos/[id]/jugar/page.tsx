import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EnginePlayer } from "@/components/engine-player";
import { GamePlayer } from "@/components/game-player";
import { getGame, getGames } from "@/lib/games";
import { hasEngine } from "@/lib/games/registry";

export async function generateStaticParams() {
  return (await getGames()).map((g) => ({ id: g.id }));
}

export async function generateMetadata(
  props: PageProps<"/juegos/[id]/jugar">,
): Promise<Metadata> {
  const { id } = await props.params;
  const game = await getGame(id);
  return {
    title: game
      ? `Jugando ${game.title} · Arcade Vault`
      : "Juego no encontrado",
  };
}

export default async function PlayPage(props: PageProps<"/juegos/[id]/jugar">) {
  const { id } = await props.params;
  const game = await getGame(id);
  if (!game) notFound();
  return hasEngine(game.id) ? (
    <EnginePlayer game={game} />
  ) : (
    <GamePlayer game={game} />
  );
}
