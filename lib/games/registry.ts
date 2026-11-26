import type { EngineModule } from "@/lib/games/engine";

const ENGINES: Record<string, () => Promise<{ default: EngineModule }>> = {
  asteroides: () => import("@/lib/games/asteroids/engine"),
};

export function hasEngine(id: string): boolean {
  return Object.hasOwn(ENGINES, id);
}

export async function loadEngine(id: string): Promise<EngineModule> {
  if (!hasEngine(id)) throw new Error(`Motor no registrado: ${id}`);
  return (await ENGINES[id]()).default;
}
