import { defineMiddleware } from "astro:middleware";
import { createServerClient } from "@supabase/ssr";

const PUSDATIN_URL =
  process.env.PUBLIC_PUSDATIN_URL ||
  import.meta.env.PUBLIC_PUSDATIN_URL ||
  "";
const APP_ID = "sikap";

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

let cachedMaintenance: { isMaintenance: boolean; timestamp: number } = {
  isMaintenance: false,
  timestamp: 0,
};

async function getMaintenanceStatus(): Promise<boolean> {
  const now = Date.now();
  if (now - cachedMaintenance.timestamp < 30000) {
    return cachedMaintenance.isMaintenance;
  }

  if (!PUSDATIN_URL) return false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 600);

    const res = await fetch(`${PUSDATIN_URL}/api/public/apps/${APP_ID}/status`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const isMaint = data.status === "maintenance";
      cachedMaintenance = { isMaintenance: isMaint, timestamp: now };
      return isMaint;
    }
  } catch {
    // If pusdatin is slow or times out, keep current cached state and don't block request
  }

  return cachedMaintenance.isMaintenance;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // === MAINTENANCE CHECK (Fast non-blocking check with 30s cache) ===
  if (PUSDATIN_URL && pathname !== "/api/health" && !pathname.startsWith("/api/v1")) {
    const isMaintenance = await getMaintenanceStatus();
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

  // === API PROXY: same-origin /api/v1 requests to the Go backend ===
  if (pathname.startsWith("/api/v1")) {
    const apiTarget =
      process.env.API_PROXY_TARGET ||
      "http://127.0.0.1:8080";
    const target = new URL(pathname + context.url.search, apiTarget);
    
    // Clean hop-by-hop headers to prevent decompression/host mismatch
    const headers = new Headers();
    context.request.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (!["host", "connection", "accept-encoding"].includes(lowerKey)) {
        headers.set(key, value);
      }
    });
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
      
      const responseHeaders = new Headers();
      res.headers.forEach((value, key) => {
        const lowerKey = key.toLowerCase();
        // Remove content-encoding and content-length because Node fetch decodes response body in memory
        if (!["content-encoding", "content-length", "transfer-encoding", "connection"].includes(lowerKey)) {
          responseHeaders.set(key, value);
        }
      });

      if (!responseHeaders.has("Content-Type") && res.headers.has("Content-Type")) {
        responseHeaders.set("Content-Type", res.headers.get("Content-Type")!);
      }

      const bodyBuffer = await res.arrayBuffer();
      return new Response(bodyBuffer, {
        status: res.status,
        headers: responseHeaders,
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

  // === SUPABASE SESSION REFRESH (Only for /admin routes with existing auth cookie) ===
  const hasAuthCookie = context.request.headers.get("cookie")?.includes("sb-survey-auth-token");
  if (pathname.startsWith("/admin") && hasAuthCookie) {
    try {
      const supabaseUrl =
        process.env.PUBLIC_SUPABASE_URL ||
        import.meta.env.PUBLIC_SUPABASE_URL;
      const supabaseAnonKey =
        process.env.PUBLIC_SUPABASE_ANON_KEY ||
        import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseAnonKey) {
        const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
          db: {
            schema:
              process.env.PUBLIC_PUSDATIN_SCHEMA ||
              import.meta.env.PUBLIC_PUSDATIN_SCHEMA ||
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
