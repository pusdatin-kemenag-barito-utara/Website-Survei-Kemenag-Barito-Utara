"use client";

import { useEffect } from "react";

export default function MaintenancePage() {
  const pusdatinUrl =
    process.env.NEXT_PUBLIC_PUSDATIN_URL ||
    "https://pusdatin.kemenag-baritoutara.com";

  useEffect(() => {
    // Push state to prevent back navigation
    window.history.pushState(null, "", window.location.href);

    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

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

