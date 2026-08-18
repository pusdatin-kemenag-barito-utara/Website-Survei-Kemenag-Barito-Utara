import { defineMiddleware } from "astro:middleware";
import { createServerClient } from "@supabase/ssr";

const PUSDATIN_URL =
  process.env.PUBLIC_PUSDATIN_URL ||
  (import.meta as any).env?.PUBLIC_PUSDATIN_URL ||
  "";
const APP_ID = "sikap";
const ENABLE_API_PROXY = process.env.ENABLE_API_PROXY === "true";
const API_PROXY_TARGET =
  process.env.API_PROXY_TARGET || "http://127.0.0.1:8080";

function parseRequestCookies(
  request: Request,
): { name: string; value: string }[] {
  const header = request.headers.get("cookie") || "";
  return header
    .split(";")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const idx = pair.indexOf("=");
      return {
        name: pair.slice(0, idx),
        value: pair.slice(idx + 1),
      };
    });
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // === MAINTENANCE CHECK ===
  if (PUSDATIN_URL && pathname !== "/api/health") {
    try {
      const maintenanceRes = await fetch(
        `${PUSDATIN_URL}/api/public/apps/${APP_ID}/status`,
        { cache: "no-store" },
      );

      if (maintenanceRes.ok) {
        const data = await maintenanceRes.json();
        const isMaintenance = data.status === "maintenance";

        if (isMaintenance) {
          if (pathname !== "/maintenance") {
            return context.redirect("/maintenance");
          }
        } else {
          if (pathname === "/maintenance") {
            return context.redirect("/");
          }
        }
      }
    } catch (error) {
      console.error("[MIDDLEWARE] Failed to fetch maintenance status:", error);
    }
  }

  // === API PROXY: same-origin /api/v1 requests to the Go backend ===
  if (pathname.startsWith("/api/v1")) {
    const apiTarget =
      process.env.API_PROXY_TARGET ||
      (import.meta as any).env?.API_PROXY_TARGET ||
      "http://127.0.0.1:8080";
    const target = new URL(pathname + context.url.search, apiTarget);
    const headers = new Headers(context.request.headers);
    headers.set("Host", target.host);

    const init: RequestInit = {
      method: context.request.method,
      headers,
      redirect: "manual",
    };
    if (context.request.method !== "GET" && context.request.method !== "HEAD") {
      init.body = await context.request.arrayBuffer();
    }

    try {
      const res = await fetch(target, init);
      return new Response(res.body, {
        status: res.status,
        headers: res.headers,
      });
    } catch (err) {
      console.error("[MIDDLEWARE] API Proxy to Golang failed:", err);
      return new Response(
        JSON.stringify({ error: "Backend service temporarily unavailable" }),
        {
          status: 502,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  // === SUPABASE SESSION REFRESH (matches legacy proxy.ts behavior) ===
  try {
    const supabaseUrl =
      process.env.PUBLIC_SUPABASE_URL ||
      (import.meta as any).env?.PUBLIC_SUPABASE_URL;
    const supabaseAnonKey =
      process.env.PUBLIC_SUPABASE_ANON_KEY ||
      (import.meta as any).env?.PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        db: {
          schema:
            process.env.PUBLIC_PUSDATIN_SCHEMA ||
            (import.meta as any).env?.PUBLIC_PUSDATIN_SCHEMA ||
            "kemenag_survey",
        },
        cookieOptions: {
          name: "sb-survey-auth-token",
        },
        cookies: {
          getAll() {
            return parseRequestCookies(context.request);
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              context.cookies.set(name, value, {
                path: options?.path ?? "/",
                maxAge: options?.maxAge,
                domain: options?.domain,
                secure: options?.secure,
                httpOnly: options?.httpOnly,
                sameSite: options?.sameSite as
                  "lax" | "strict" | "none" | undefined,
              });
            });
          },
        },
      });

      await supabase.auth.getUser().catch((err) => {
        console.warn("[MIDDLEWARE] Supabase getUser error:", err);
      });
    }
  } catch (err) {
    console.error("[MIDDLEWARE] Supabase auth refresh error:", err);
  }

  const response = await next();

  // === HTTP/3 (QUIC) & Network Protocol Headers ===
  response.headers.set(
    "Alt-Svc",
    'h3=":443"; ma=86400, h3-29=":443"; ma=86400',
  );
  response.headers.set(
    "Accept-CH",
    "DPR, Width, Viewport-Width, Downlink, ECT",
  );

  // === Security & Cross-Origin Isolation ===
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );

  return response;
});
