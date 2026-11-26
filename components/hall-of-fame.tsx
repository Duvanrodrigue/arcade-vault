"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMyBest } from "@/app/salon/actions";
import { useSession } from "@/components/session-provider";
import type { Game } from "@/lib/games";
import type { ScoreRow } from "@/lib/scores";

const fmt = (n: number) => n.toLocaleString("es-ES");

function Slot({
  row,
  cls,
  num,
  champion,
}: {
  row?: ScoreRow;
  cls: string;
  num: string;
  champion?: boolean;
}) {
  return (
    <div className={"podium-slot " + cls}>
      {champion && (
        <div
          className="pixel"
          style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.18em" }}
        >
          CAMPEÓN
        </div>
      )}
      <div
        className="rank-num"
        style={champion ? { fontSize: 36, marginTop: 4 } : undefined}
      >
        {num}
      </div>
      <div className="name">{row?.name ?? "—"}</div>
      <div className="score" style={champion ? { fontSize: 20 } : undefined}>
        {row ? fmt(row.score) : "—"}
      </div>
      <div className="date">{row?.date ?? ""}</div>
    </div>
  );
}

export function HallOfFame({
  games,
  boards,
}: {
  games: Game[];
  boards: Record<string, ScoreRow[]>;
}) {
  const { user } = useSession();
  const [tab, setTab] = useState(games[0].id);
  const [mine, setMine] = useState<{
    key: string;
    row: ScoreRow | null;
  } | null>(null);
  const rows = boards[tab] ?? [];
  const game = games.find((g) => g.id === tab) ?? games[0];

  const userName = user?.name ?? null;
  const key = userName ? `${tab}|${userName}` : null;

  useEffect(() => {
    if (!key || !userName) return;
    let cancelled = false;
    getMyBest(tab, userName)
      .then((row) => {
        if (!cancelled) setMine({ key, row });
      })
      .catch(() => {
        if (!cancelled) setMine({ key, row: null });
      });
    return () => {
      cancelled = true;
    };
  }, [key, tab, userName]);

  const you = key && mine?.key === key ? mine.row : null;

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <div className="hall-tabs">
        {games.map((g) => (
          <button
            key={g.id}
            type="button"
            className={"chip" + (tab === g.id ? " active" : "")}
            onClick={() => setTab(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "80px 0",
            color: "var(--ink-faint)",
          }}
        >
          <div
            className="pixel"
            style={{ fontSize: 14, color: "var(--magenta)", marginBottom: 12 }}
          >
            SIN PUNTUACIONES AÚN
          </div>
          <div>Sé el primero en dejar tu marca en {game.title}.</div>
        </div>
      ) : (
        <>
          <div className="podium">
            <Slot row={rows[1]} cls="silver" num="02" />
            <Slot row={rows[0]} cls="gold" num="01" champion />
            <Slot row={rows[2]} cls="bronze" num="03" />
          </div>

          <div className="hall-table">
            <div className="th">
              <div>RANGO</div>
              <div>JUGADOR</div>
              <div>PUNTUACIÓN</div>
              <div>FECHA</div>
            </div>
            {rows.map((r, i) => (
              <div
                key={r.name}
                className={
                  "tr" +
                  (i === 0
                    ? " top1"
                    : i === 1
                      ? " top2"
                      : i === 2
                        ? " top3"
                        : "")
                }
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
                <div className="pl">{r.name}</div>
                <div className="sc">{fmt(r.score)}</div>
                <div className="dt">{r.date}</div>
              </div>
            ))}
            {you && (
              <>
                <div className="tr you-label">
                  ▸ TU MEJOR MARCA EN {game.title}
                </div>
                <div
                  className="tr you"
                  style={{ animationDelay: `${rows.length * 50 + 50}ms` }}
                >
                  <div className="rk" style={{ color: "var(--yellow)" }}>
                    #{String(you.rank).padStart(2, "0")}
                  </div>
                  <div className="pl" style={{ color: "var(--yellow)" }}>
                    {you.name}
                  </div>
                  <div
                    className="sc"
                    style={{
                      color: "var(--yellow)",
                      textShadow: "0 0 6px rgba(245,255,0,0.5)",
                    }}
                  >
                    {fmt(you.score)}
                  </div>
                  <div className="dt">{you.date}</div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/juegos" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
