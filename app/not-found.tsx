import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="fade-in"
      style={{ textAlign: "center", padding: "96px 16px" }}
    >
      <div className="pixel neon-magenta" style={{ fontSize: 40 }}>
        404
      </div>
      <div
        className="pixel"
        style={{ fontSize: 14, color: "var(--magenta)", margin: "20px 0 12px" }}
      >
        JUEGO NO ENCONTRADO
      </div>
      <p style={{ color: "var(--ink-dim)", marginBottom: 28 }}>
        Esta página no existe o el juego ya no está en el Vault.
      </p>
      <Link href="/" className="btn lg">
        VOLVER A LA BIBLIOTECA
      </Link>
    </div>
  );
}
