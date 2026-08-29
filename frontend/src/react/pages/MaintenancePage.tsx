
import { useEffect } from "react";

export default function MaintenancePage() {
  const pusdatinUrl = import.meta.env.PUBLIC_PUSDATIN_URL || "";
  const appId = "sikap";

  useEffect(() => {
    // Push state to prevent back navigation
    window.history.pushState(null, "", window.location.href);

    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
    };

    window.addEventListener("popstate", handlePopState);

    // Auto check if system is back online from Pusdatin
    const checkOnline = async () => {
      if (!pusdatinUrl) return;
      try {
        const res = await fetch(`${pusdatinUrl}/api/public/apps/${appId}/status`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          if (data.status !== "maintenance") {
            window.location.replace("/");
          }
        }
      } catch {
        // ignore
      }
    };

    const interval = setInterval(checkOnline, 5000);

    return () => {
      clearInterval(interval);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [pusdatinUrl]);

  return (
    <div className="w-screen h-screen overflow-hidden bg-slate-50 flex flex-col">
      <iframe
        src={`${pusdatinUrl}/maintenance?app=Survei+Kemenag`}
        title="Sistem Sedang Pemeliharaan"
        className="w-full h-full border-none"
      />
    </div>
  );
}

