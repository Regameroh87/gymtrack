// Error tracking server-side (Node y Edge runtimes de Next). Sin DSN queda
// desactivado, así el build/dev local no requiere configurar Sentry.
import * as Sentry from "@sentry/nextjs";

export async function register() {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
    environment: process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: 0.2,
  });
}

// Captura errores de request de React Server Components / route handlers.
export const onRequestError = Sentry.captureRequestError;
