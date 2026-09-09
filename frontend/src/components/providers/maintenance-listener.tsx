
import { useEffect, useState } from "react";

export function MaintenanceListener() {
  const [currentPath, setCurrentPath] = useState(
    typeof window !== "undefined" ? window.location.pathname : ""
  );

  useEffect(() => {
    let active = true;
    const pusdatinUrl =
      (typeof window !== "undefined" && (window as any).__ENV__?.PUBLIC_PUSDATIN_URL) ||
      import.meta.env.PUBLIC_PUSDATIN_URL ||
      "";
    const appId = "sikap";

    if (!pusdatinUrl) return;

    const checkStatus = async () => {
      try {
        const res = await fetch(`${pusdatinUrl}/api/public/apps/${appId}/status`, {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        if (res.ok && active) {
          const data = await res.json();
          const isMaintenance = data.status === "maintenance";
          const pathname = window.location.pathname;

          if (isMaintenance) {
            if (pathname !== "/maintenance") {
              window.location.replace("/maintenance");
            }
          } else {
            if (pathname === "/maintenance") {
              window.location.replace("/");
            }
          }
        }
      } catch {
        // Ignore network hiccups during polling
      }
    };

    // Initial check
    checkStatus();

    // Polling interval (every 10 seconds, light footprint)
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        checkStatus();
      }
    }, 10000);

    // Astro SPA navigation listener
    const handleAstroPageLoad = () => {
      setCurrentPath(window.location.pathname);
      checkStatus();
    };
    document.addEventListener("astro:page-load", handleAstroPageLoad);

    // Lock navigation back/forward when on /maintenance
    const lockHistory = () => {
      if (window.location.pathname === "/maintenance") {
        window.history.pushState(null, "", window.location.href);
      }
    };

    if (window.location.pathname === "/maintenance") {
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
      document.removeEventListener("astro:page-load", handleAstroPageLoad);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("popstate", lockHistory);
    };
  }, [currentPath]);

  return null;
}
