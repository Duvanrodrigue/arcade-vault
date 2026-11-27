"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ScoreSaveForm } from "@/components/score-save-form";
import { useSession } from "@/components/session-provider";
import type {
  EngineControls,
  EngineModule,
  EngineSnapshot,
  HudField,
} from "@/lib/games/engine";
import type { Game } from "@/lib/games";
import { loadEngine } from "@/lib/games/registry";
import {
  DEFAULT_SKIN,
  SKIN_IDS,
  SKIN_LABELS,
  isSkinId,
  type SkinId,
} from "@/lib/games/skins";

const INITIAL: EngineSnapshot = { score: 0, state: "playing" };

const skinKey = (gameId: string) => `av-skin:${gameId}`;

function readSkin(gameId: string): SkinId {
  try {
    const stored = window.localStorage.getItem(skinKey(gameId));
    return isSkinId(stored) ? stored : DEFAULT_SKIN;
  } catch {
    return DEFAULT_SKIN;
  }
}

function writeSkin(gameId: string, skin: SkinId) {
  try {
    window.localStorage.setItem(skinKey(gameId), skin);
  } catch {
    // Sin almacenamiento (modo privado): el skin dura solo esta visita.
  }
}

// Cabecera + HUD + marco CRT ocupan ~320px: la pantalla cabe en la ventana.
const MAX_SCREEN_H = "max(240px, calc(100svh - 320px))";

function hudValue(field: HudField, snap: EngineSnapshot): string {
  if (field.key === "score") return snap.score.toLocaleString("es-ES");
  if (field.key === "lives") {
    const lives = snap.lives ?? 0;
    return lives > 0 ? "♥ ".repeat(lives).trim() : "—";
  }
  if (field.key === "level") return String(snap.level ?? 1).padStart(2, "0");
  const value = snap.extra?.[field.key.slice("extra.".length)] ?? 0;
  return value.toLocaleString("es-ES");
}

export function EnginePlayer({ game }: { game: Game }) {
  const { user } = useSession();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controlsRef = useRef<EngineControls | null>(null);
  const [engine, setEngine] = useState<EngineModule | null>(null);
  const [snap, setSnap] = useState<EngineSnapshot>(INITIAL);
  const [skin, setSkin] = useState<SkinId>(DEFAULT_SKIN);

  const name = user?.name ?? "INVITADO";
  const over = snap.state === "gameover";
  const paused = !!snap.paused;

  useEffect(() => {
    let cancelled = false;
    let controls: EngineControls | null = null;
    loadEngine(game.id).then((mod) => {
      const canvas = canvasRef.current;
      if (cancelled || !canvas) return;
      setEngine(mod);
      const initialSkin = mod.skins ? readSkin(game.id) : DEFAULT_SKIN;
      setSkin(initialSkin);
      controls = mod.create(
        canvas,
        { onChange: setSnap },
        { skin: initialSkin },
      );
      controlsRef.current = controls;
    });
    return () => {
      cancelled = true;
      controls?.destroy();
      controlsRef.current = null;
    };
  }, [game.id]);

  const togglePause = () => {
    const c = controlsRef.current;
    if (!c) return;
    if (paused) c.resume();
    else c.pause();
  };

  const finish = () => {
    const c = controlsRef.current;
    if (!c) return;
    // Reanuda antes: un motor en pausa no procesa la tecla de reinicio.
    c.resume();
    c.end();
  };

  const restart = () => controlsRef.current?.restart();

  // Solo cambia la paleta del canvas: no toca la partida ni el guardado.
  const changeSkin = (id: SkinId) => {
    setSkin(id);
    writeSkin(game.id, id);
    controlsRef.current?.setSkin?.(id);
  };

  const skins = engine?.skins;

  const width = engine?.width ?? 800;
  const height = engine?.height ?? 600;

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
          {engine?.hud.map((field) => (
            <div
              key={field.key}
              className={`hud-stat${
                field.key === "lives" || field.key === "level"
                  ? ` ${field.key}`
                  : ""
              }`}
            >
              <div className="l">{field.label}</div>
              <div className="v">{hudValue(field, snap)}</div>
            </div>
          ))}
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

      {skins && (
        <div
          className="av-chips"
          role="radiogroup"
          aria-label="Skin de la pantalla"
          style={{ justifyContent: "flex-end", marginBottom: 14 }}
        >
          {SKIN_IDS.map((id) => {
            const pal = skins[id];
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={skin === id}
                className={`chip${skin === id ? " active" : ""}`}
                onClick={(e) => {
                  e.currentTarget.blur(); // ESPACIO no debe reactivar el chip
                  changeSkin(id);
                }}
                style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
              >
                <span
                  aria-hidden
                  style={{
                    display: "inline-flex",
                    width: 18,
                    height: 10,
                    border: `1px solid ${pal.hud}`,
                    background: pal.bg,
                  }}
                >
                  <span style={{ flex: 1, background: pal.hud }} />
                  <span style={{ flex: 1, background: pal.accent }} />
                </span>
                {SKIN_LABELS[id]}
              </button>
            );
          })}
        </div>
      )}

      <div className="crt">
        <div
          className="crt-screen"
          style={{
            aspectRatio: width / height,
            maxHeight: MAX_SCREEN_H,
            maxWidth: `calc(${MAX_SCREEN_H} * ${width / height})`,
            marginInline: "auto",
          }}
        >
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            aria-label={`Pantalla del juego ${game.title}`}
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
