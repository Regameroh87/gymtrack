"use client";

// Error boundary raíz del App Router: captura errores de render que escapan a
// todos los boundaries y los reporta a Sentry. Reemplaza <html>/<body>, por eso
// el markup es autocontenido y sin dependencias del layout.
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "-apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
          background: "#f4f4f7",
          color: "#1c1c24",
        }}
      >
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>Algo salió mal</h1>
          <p style={{ fontSize: 14, color: "#6b6b76", marginBottom: 20 }}>
            El error ya fue reportado. Podés reintentar o volver más tarde.
          </p>
          <button
            onClick={() => reset()}
            style={{
              background: "#4A44E4",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "10px 22px",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
