import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { type Variants } from "framer-motion";
import { fetchCachedAdminStats, getCachedAdminStatsSync } from "@/lib/data-cache";
import type { SurveyPeriod } from "@/types";

import { DashboardHeroBanner } from "@/components/admin/dashboard/DashboardHeroBanner";
import { DashboardScoreOverview } from "@/components/admin/dashboard/DashboardScoreOverview";
import { DashboardStatCards } from "@/components/admin/dashboard/DashboardStatCards";
import { DashboardQuickShortcuts } from "@/components/admin/dashboard/DashboardQuickShortcuts";

interface Stats {
  totalResponses: number;
  activeServices: number;
  totalUnsur: number;
  activePeriod: SurveyPeriod | null;
  ipkpScore: number | null;
  ipakScore: number | null;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemAnimVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

export default function AdminDashboardPage() {
  const cachedInitial = getCachedAdminStatsSync();
  const [stats, setStats] = useState<Stats>(() => {
    if (cachedInitial) {
      return {
        totalResponses: cachedInitial.total_responses || 0,
        activeServices: cachedInitial.active_services || 0,
        totalUnsur: cachedInitial.total_unsur || 0,
        activePeriod: cachedInitial.active_period || null,
        ipkpScore: cachedInitial.ipkp_score ?? null,
        ipakScore: cachedInitial.ipak_score ?? null,
      };
    }
    return {
      totalResponses: 0,
      activeServices: 0,
      totalUnsur: 0,
      activePeriod: null,
      ipkpScore: null,
      ipakScore: null,
    };
  });
  const [loading, setLoading] = useState(() => !cachedInitial);

  useEffect(() => {
    let isMounted = true;
    const safetyTimer = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 3500);

    async function fetchStats() {
      try {
        const data = await fetchCachedAdminStats();
        if (isMounted) {
          setStats({
            totalResponses: data.total_responses || 0,
            activeServices: data.active_services || 0,
            totalUnsur: data.total_unsur || 0,
            activePeriod: data.active_period || null,
            ipkpScore: data.ipkp_score ?? null,
            ipakScore: data.ipak_score ?? null,
          });
        }
      } catch (err) {
        console.error("Failed fetching admin stats:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchStats();

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-10 animate-spin text-emerald-600" />
          <span className="text-emerald-800 font-semibold text-sm">
            Memuat Ringkasan Dasbor...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      {/* Hero Welcome Banner */}
      <DashboardHeroBanner />

      {/* Primary Indicator Score Cards (IPKP & IPAK) */}
      <DashboardScoreOverview
        ipkpScore={stats.ipkpScore}
        ipakScore={stats.ipakScore}
        containerVariants={containerVariants}
        itemAnimVariants={itemAnimVariants}
      />

      {/* 4 Top Stat Cards */}
      <DashboardStatCards
        totalResponses={stats.totalResponses}
        activeServices={stats.activeServices}
        totalUnsur={stats.totalUnsur}
        activePeriod={stats.activePeriod}
        containerVariants={containerVariants}
        itemAnimVariants={itemAnimVariants}
      />

      {/* Quick Shortcuts */}
      <DashboardQuickShortcuts />
    </div>
  );
}
