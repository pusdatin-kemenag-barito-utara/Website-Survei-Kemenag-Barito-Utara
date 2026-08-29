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

function logRequest(status: number, method: string, pathname: string, durationMs: number) {
  // Skip static assets and internal vite/astro paths to keep terminal clean
  if (
    pathname.startsWith("/_astro/") ||
    pathname.startsWith("/@") ||
    pathname.startsWith("/node_modules/") ||
    /\.(ico|png|jpg|jpeg|svg|webp|gif|woff2?|ttf|eot|css|js|map|json)$/i.test(pathname)
  ) {
    return;
  }

  const timeStr = new Date().toTimeString().split(" ")[0];
  const durationStr = `${durationMs.toFixed(1)}ms`.padStart(7, " ");

  // Status color codes for ANSI terminal
  let statusColor = "\x1b[32m"; // Green for 2xx
  if (status >= 500) statusColor = "\x1b[31m"; // Red for 5xx
  else if (status >= 400) statusColor = "\x1b[33m"; // Yellow for 4xx
  else if (status >= 300) statusColor = "\x1b[36m"; // Cyan for 3xx
  const reset = "\x1b[0m";

  console.log(
    `[${timeStr}] ${statusColor}${status}${reset} - \x1b[35m${durationStr}\x1b[0m | \x1b[1m${method.padEnd(5, " ")}\x1b[0m ${pathname}`
  );
}

export const onRequest = defineMiddleware(async (context, next) => {
  const startTime = performance.now();
  const { pathname } = context.url;

  // === MAINTENANCE CHECK (Fast non-blocking check with 30s cache) ===
  if (PUSDATIN_URL && pathname !== "/api/health" && !pathname.startsWith("/api/v1")) {
    const isMaintenance = await getMaintenanceStatus();
    if (isMaintenance) {
      if (pathname !== "/maintenance") {
        logRequest(302, context.request.method, pathname, performance.now() - startTime);
        return context.redirect("/maintenance");
      }
    } else {
      if (pathname === "/maintenance") {
        logRequest(302, context.request.method, pathname, performance.now() - startTime);
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
      logRequest(res.status, context.request.method, pathname, performance.now() - startTime);
      return new Response(bodyBuffer, {
        status: res.status,
        headers: responseHeaders,
      });
    } catch (err) {
      console.error("[MIDDLEWARE] API Proxy to Golang failed:", err);
      logRequest(502, context.request.method, pathname, performance.now() - startTime);
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

  // === Cloudflare Edge & CDN Smart Caching Rules ===
  if (pathname.startsWith("/admin") || pathname.startsWith("/login")) {
    response.headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate");
    response.headers.set("CDN-Cache-Control", "no-store");
  } else if (
    pathname.startsWith("/_astro/") ||
    pathname.startsWith("/fonts/") ||
    /\.(ico|png|jpg|jpeg|svg|webp|gif|woff2?|ttf|eot|css|js)$/i.test(pathname)
  ) {
    response.headers.set("Cache-Control", "public, max-age=31536000, immutable");
    response.headers.set("CDN-Cache-Control", "public, max-age=31536000, immutable");
  } else {
    // Public SSR Pages: Micro-cache on Cloudflare Edge with stale-while-revalidate for instantaneous response
    response.headers.set("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=300");
    response.headers.set("CDN-Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  }

  // === HTTP/3 (QUIC) & Cloudflare Network Protocol Headers ===
  response.headers.set(
    "Alt-Svc",
    'h3=":443"; ma=86400, h3-29=":443"; ma=86400',
  );
  response.headers.set(
    "Accept-CH",
    "DPR, Width, Viewport-Width, Downlink, ECT",
  );
  response.headers.set("Vary", "Accept-Encoding, Accept, Cookie");

  // === Security & Cross-Origin Isolation ===
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );

  logRequest(response.status, context.request.method, pathname, performance.now() - startTime);
  return response;
});
