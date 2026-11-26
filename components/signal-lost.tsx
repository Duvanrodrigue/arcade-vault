"use client";

import { useEffect } from "react";

// Fallback compartido de los error boundaries (error.tsx) que leen Supabase.
export function SignalLost({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      className="fade-in"
      role="alert"
      style={{ textAlign: "center", padding: "96px 16px" }}
    >
      <div
        className="pixel neon-magenta"
        style={{ fontSize: 28, letterSpacing: "0.08em" }}
      >
        SEÑAL PERDIDA
      </div>
      <p style={{ color: "var(--ink-dim)", margin: "20px 0 28px" }}>
        No pudimos conectar con el Vault. Revisa tu conexión e inténtalo de
        nuevo.
      </p>
      <button type="button" className="btn lg" onClick={() => retry()}>
        REINTENTAR
      </button>
    </div>
  );
}
