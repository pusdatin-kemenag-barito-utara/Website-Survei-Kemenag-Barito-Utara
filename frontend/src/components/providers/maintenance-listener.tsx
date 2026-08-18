
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function MaintenanceListener() {
  const pathname = usePathname();

  useEffect(() => {
    let active = true;

    const checkStatus = async () => {
      try {
        const pusdatinUrl = import.meta.env.PUBLIC_PUSDATIN_URL || "";
        const appId = "sikap";

        if (!pusdatinUrl) return;

        const res = await fetch(`${pusdatinUrl}/api/public/apps/${appId}/status`, {
          cache: "no-store",
        });

        if (res.ok && active) {
          const data = await res.json();
          const isMaintenance = data.status === "maintenance";

          if (isMaintenance) {
            if (window.location.pathname !== "/maintenance") {
              window.location.replace("/maintenance");
            }
          } else {
            if (window.location.pathname === "/maintenance") {
              window.location.replace("/");
            }
          }
        }
      } catch {
        // Ignore network errors during polling
      }
    };

    // Check immediately on mount/route change
    checkStatus();

    // Check periodically every 5 seconds
    const interval = setInterval(checkStatus, 5000);

    // Lock navigation back/forward when on /maintenance
    const lockHistory = () => {
      if (window.location.pathname === "/maintenance") {
        window.history.pushState(null, "", window.location.href);
      }
    };

    if (pathname === "/maintenance") {
      window.history.pushState(null, "", window.location.href);
      window.addEventListener("popstate", lockHistory);
    }

    const onFocus = () => {
      checkStatus();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("popstate", lockHistory);
    };
  }, [pathname]);

  return null;
}
