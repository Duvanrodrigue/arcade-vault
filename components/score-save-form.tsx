"use client";

import { useState } from "react";
import { useSession } from "@/components/session-provider";
import { saveScore } from "@/app/juegos/[id]/jugar/actions";

type Status = "idle" | "saving" | "saved" | "error";

// Campo de iniciales + botón de guardado del modal FIN DEL JUEGO.
// Se monta una vez por partida terminada: al reiniciar, el modal se desmonta.
export function ScoreSaveForm({
  gameId,
  score,
}: {
  gameId: string;
  score: number;
}) {
  const { user } = useSession();
  const [typedName, setTypedName] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");

  const name = typedName ?? user?.name ?? "";
  const canSave = status !== "saving" && name.trim().length > 0;

  const onSave = async () => {
    if (!canSave) return;
    setStatus("saving");
    try {
      const res = await saveScore({ gameId, name, score });
      setStatus(res.ok ? "saved" : "error");
    } catch {
      setStatus("error");
    }
  };

  if (status === "saved") {
    return <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>;
  }

  return (
    <>
      <div className="input-row">
        <input
          value={name}
          onChange={(e) =>
            setTypedName(e.target.value.toUpperCase().slice(0, 10))
          }
          placeholder="TUS INICIALES"
          aria-label="Tus iniciales"
          disabled={status === "saving"}
        />
        <button
          type="button"
          className="btn yellow"
          disabled={!canSave}
          onClick={onSave}
        >
          {status === "saving" ? "GUARDANDO…" : "GUARDAR PUNTUACIÓN"}
        </button>
      </div>
      {status === "error" && (
        <div
          role="alert"
          className="pixel"
          style={{ fontSize: 10, color: "var(--magenta)", marginTop: 10 }}
        >
          ERROR AL GUARDAR
        </div>
      )}
    </>
  );
}
