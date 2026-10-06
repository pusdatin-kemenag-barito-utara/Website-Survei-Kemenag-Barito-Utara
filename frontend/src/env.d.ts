interface ImportMetaEnv {
  // Core App & API URLs
  readonly PUBLIC_APP_URL?: string
  readonly PUBLIC_API_URL?: string
  readonly PUBLIC_SUPER_ADMIN_EMAIL?: string

  // Google Analytics & Google Tag
  readonly PUBLIC_GA_MEASUREMENT_ID?: string
  readonly PUBLIC_GTAG_ID?: string
  readonly PUBLIC_GOOGLE_SITE_VERIFICATION?: string

  // PocketBase Database & Pusdatin
  readonly PUBLIC_POCKETBASE_URL?: string
  readonly PUBLIC_PUSDATIN_URL?: string

  // Security & Cloudflare Turnstile
  readonly PUBLIC_TURNSTILE_SITE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare namespace App {
  interface Locals {}
}