// Minimal Next.js server API compatibility shims.
// The Astro migration does not use these (proxy.ts was replaced by
// src/middleware.ts, and route handlers by Astro endpoints), but the
// module is kept so legacy imports never break resolution.

export class NextResponse {
  static json(body: unknown, init?: ResponseInit) {
    return Response.json(body, init);
  }

  static next(_opts?: { request?: Request }) {
    return new Response(null, { status: 200 });
  }

  static redirect(url: string, status?: number) {
    return Response.redirect(url, status ?? 302);
  }
}

export class NextRequest extends Request {}