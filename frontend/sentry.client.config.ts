/// <reference types="astro/client" />
import * as Sentry from "@sentry/astro";

const env = (import.meta as any).env || {};
const dsn = env.PUBLIC_SENTRY_DSN || env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // Tracing sample rate: 100% in development, 20% in production
    tracesSampleRate: env.PROD ? 0.2 : 1.0,
    // Session Replay: capture 10% sample of sessions and 100% of sessions with errors
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    environment: env.MODE || (env.PROD ? "production" : "development"),
  });
}
