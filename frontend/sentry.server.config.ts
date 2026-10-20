import * as Sentry from "@sentry/astro";

const dsn = process.env.PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
    environment: process.env.NODE_ENV || "development",
  });
}
