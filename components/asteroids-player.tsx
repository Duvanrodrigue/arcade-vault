"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ScoreSaveForm } from "@/components/score-save-form";
import { useSession } from "@/components/session-provider";
import asteroids from "@/lib/games/asteroids/engine";
import type { EngineControls, EngineSnapshot } from "@/lib/games/engine";
import type { Game } from "@/lib/games";

const INITIAL: EngineSnapshot = {
  score: 0,
  lives: 3,
  level: 1,
  state: "playing",
};

export function AsteroidsPlayer({ game }: { game: Game }) {
  const { user } = useSession();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controlsRef = useRef<EngineControls | null>(null);
  const [snap, setSnap] = useState<EngineSnapshot>(INITIAL);
  const [paused, setPaused] = useState(false);

  const name = user?.name ?? "INVITADO";
  const over = snap.state === "gameover";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const controls = asteroids.create(canvas, { onChange: setSnap });
    controlsRef.current = controls;
    return () => {
      controls.destroy();
      controlsRef.current = null;
    };
  }, []);

  const togglePause = () => {
    const c = controlsRef.current;
    if (!c) return;
    if (paused) c.resume();
    else c.pause();
    setPaused(!paused);
  };

  const finish = () => {
    const c = controlsRef.current;
    if (!c) return;
    // Reanuda antes: el motor en pausa no procesa ESPACIO para reiniciar.
    c.resume();
    setPaused(false);
    c.end();
  };

  const restart = () => controlsRef.current?.restart();

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{snap.score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">
              {(snap.lives ?? 0) > 0 ? "♥ ".repeat(snap.lives ?? 0).trim() : "—"}
            </div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(snap.level ?? 1).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button
            type="button"
            className="btn yellow"
            onClick={(e) => {
              e.currentTarget.blur(); // ESPACIO no debe reactivar el botón
              togglePause();
            }}
          >
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button
            type="button"
            className="btn magenta"
            onClick={(e) => {
              e.currentTarget.blur();
              finish();
            }}
          >
            FIN
          </button>
          <Link href={`/juegos/${game.id}`} className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            aria-label="Pantalla del juego Asteroides"
            style={{ display: "block", width: "100%", height: "100%" }}
          />
          {paused && !over && (
            <div
              className="crt-content"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{snap.score.toLocaleString("es-ES")}</div>
            <ScoreSaveForm gameId={game.id} score={snap.score} />
            <div className="actions">
              <button type="button" className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <Link href="/juegos" className="btn magenta">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
