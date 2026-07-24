import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow health endpoint without maintenance check (required for Coolify)
  if (pathname === "/api/health") {
    return NextResponse.next();
  }

  // === MAINTENANCE CHECK ===
  try {
    const pusdatinUrl = process.env.NEXT_PUBLIC_PUSDATIN_URL || "https://pusdatin.kemenag-baritoutara.com";
    const appId = 'sikap';

    const maintenanceRes = await fetch(`${pusdatinUrl}/api/public/apps/${appId}/status`, {
      cache: 'no-store'
    });

    if (maintenanceRes.ok) {
      const data = await maintenanceRes.json();
      const isMaintenance = data.status === 'maintenance';

      if (isMaintenance) {
        // If not already on /maintenance, redirect to /maintenance
        if (pathname !== "/maintenance") {
          return NextResponse.redirect(new URL("/maintenance", request.url));
        }
        return NextResponse.next();
      } else {
        // If system is normal but user visits /maintenance, redirect to home
        if (pathname === "/maintenance") {
          return NextResponse.redirect(new URL("/", request.url));
        }
      }
    }
  } catch (error) {
    console.error("[PROXY] Failed to fetch maintenance status:", error);
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
