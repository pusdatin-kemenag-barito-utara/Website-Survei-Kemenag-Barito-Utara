import { CheckCircle2, Calendar, Sparkles, Clock } from "lucide-react";
import type { SurveyPeriod } from "@/types";

export function formatDateDisplay(dStr: string) {
  if (!dStr) return "-";
  const clean = dStr.split("T")[0];
  const [y, m, d] = clean.split("-");
  if (!y || !m || !d) return clean;
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const mName = months[parseInt(m, 10) - 1] || m;
  return `${parseInt(d, 10)} ${mName} ${y}`;
}

export function formatDateDMY(dStr: string) {
  if (!dStr) return "-";
  const clean = dStr.split("T")[0];
  const [y, m, d] = clean.split("-");
  if (!y || !m || !d) return clean;
  return `${d}-${m}-${y}`;
}

export function getTypeBadge(type: string) {
  switch (type) {
    case "triwulan":
      return (
        <span className="inline-flex items-center gap-1 font-bold text-[11px] bg-blue-50 text-blue-700 border border-blue-200/80 px-2.5 py-1 rounded-lg">
          Triwulan
        </span>
      );
    case "semester":
      return (
        <span className="inline-flex items-center gap-1 font-bold text-[11px] bg-purple-50 text-purple-700 border border-purple-200/80 px-2.5 py-1 rounded-lg">
          Semester
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 font-bold text-[11px] bg-amber-50 text-amber-700 border border-amber-200/80 px-2.5 py-1 rounded-lg">
          Tahunan
        </span>
      );
  }
}

export function getPeriodStatusBadge(
  p: SurveyPeriod,
  activePeriod?: SurveyPeriod
) {
  const today = new Date().toISOString().split("T")[0];
  const pStart = p.start_date ? p.start_date.split("T")[0] : "";
  const pEnd = p.end_date ? p.end_date.split("T")[0] : "";
  const aStart = activePeriod?.start_date
    ? activePeriod.start_date.split("T")[0]
    : "";
  const aEnd = activePeriod?.end_date
    ? activePeriod.end_date.split("T")[0]
    : "";

  // 1. Manually / Directly Active
  if (p.is_active) {
    const inRange = today >= pStart && today <= pEnd;
    return (
      <div className="flex flex-col items-start gap-1">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 shadow-2xs">
          <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Sedang Aktif</span>
        </span>
        {!inRange && (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 px-2 py-0.5 rounded-md"
            title="Diaktifkan secara manual di luar rentang tanggal"
          >
            <Sparkles className="size-3 text-amber-500" />
            <span>Buka Manual (Luar Jadwal)</span>
          </span>
        )}
      </div>
    );
  }

  // 2. Dynamic Overlap Logic based on Active Reference Period
  if (activePeriod) {
    const overlapsWithActive = pStart <= aEnd && pEnd >= aStart;
    if (overlapsWithActive) {
      return (
        <div className="flex flex-col items-start gap-1">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 shadow-2xs">
            <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Otomatis Aktif</span>
          </span>
          <span
            className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 px-2 py-0.5 rounded-md"
            title={`Terhubung dengan periode aktif: ${activePeriod.label}`}
          >
            <Sparkles className="size-3 text-emerald-500" />
            <span>Terhubung {activePeriod.label}</span>
          </span>
        </div>
      );
    }

    if (pEnd < aStart) {
      return (
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200/90 dark:bg-gray-800 dark:text-slate-400 dark:border-gray-700"
          title="Periode ini telah berakhir"
        >
          <CheckCircle2 className="size-3.5 text-slate-400" />
          <span>Selesai (Telah Berakhir)</span>
        </span>
      );
    }

    if (pStart > aEnd) {
      return (
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/90 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900"
          title="Jadwal periode ini belum dimulai"
        >
          <Calendar className="size-3.5 text-blue-500" />
          <span>Belum Dimulai</span>
        </span>
      );
    }
  } else {
    if (today > pEnd) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200/90 dark:bg-gray-800 dark:text-slate-400 dark:border-gray-700">
          <CheckCircle2 className="size-3.5 text-slate-400" />
          <span>Selesai (Telah Berakhir)</span>
        </span>
      );
    }

    if (today < pStart) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/90 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900">
          <Calendar className="size-3.5 text-blue-500" />
          <span>Belum Dimulai</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 shadow-2xs">
        <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
        <span>Dalam Rentang Waktu</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900">
      <Clock className="size-3.5 text-amber-600" />
      <span>Nonaktif</span>
    </span>
  );
}
