/// <reference types="astro/client" />
import * as Sentry from "@sentry/astro";

function resolveClientDsn(): string | undefined {
  if (typeof window !== "undefined") {
    const win = window as any;
    const dsnFromEnv =
      win.__ENV__?.PUBLIC_SENTRY_DSN ||
      win.__ENV__?.SENTRY_DSN ||
      win.__PUBLIC_ENV__?.PUBLIC_SENTRY_DSN ||
      win.__PUBLIC_ENV__?.SENTRY_DSN;
    if (dsnFromEnv) return dsnFromEnv;

    const metaTag = document.querySelector('meta[name="sentry-dsn"]');
    if (metaTag) {
      const content = metaTag.getAttribute("content");
      if (content) return content;
    }
  }
  const env = (import.meta as any).env || {};
  return env.PUBLIC_SENTRY_DSN || env.SENTRY_DSN;
}

const dsn = resolveClientDsn();

if (dsn) {
  const env = (import.meta as any).env || {};
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

// Ensure global references for developer tools, extensions, and runtime diagnostics
if (typeof window !== "undefined") {
  (window as any).Sentry = Sentry;
}
