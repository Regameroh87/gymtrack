// Error tracking del browser. Sin DSN queda desactivado (dev local sin env).
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 0.2,
});

// Hook de navegación del App Router (lo usa Sentry para trazas de transición).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
