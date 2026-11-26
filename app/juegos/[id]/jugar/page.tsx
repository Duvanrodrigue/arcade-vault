import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AsteroidsPlayer } from "@/components/asteroids-player";
import { GamePlayer } from "@/components/game-player";
import { getGame, getGames } from "@/lib/games";

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
  if (game.id === "asteroides") return <AsteroidsPlayer game={game} />;
  return <GamePlayer game={game} />;
}
