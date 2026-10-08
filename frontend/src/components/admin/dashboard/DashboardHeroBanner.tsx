import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, PlusCircle, BarChart3 } from "lucide-react";

export function DashboardHeroBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 p-6 sm:p-8 text-white shadow-xl shadow-emerald-950/10 border border-emerald-700/50"
    >
      <div className="absolute top-0 right-0 -mr-16 -mt-16 size-80 rounded-full bg-emerald-500/15 blur-3xl" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3.5 py-1 text-xs font-semibold text-emerald-200 border border-emerald-400/30 backdrop-blur-md">
            <Sparkles className="size-3.5 text-emerald-300 animate-pulse" />
            <span>Sistem Informasi Terintegrasi SI-ARUS</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Dashboard Rekapitulasi Survei
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed">
            Pantau seluruh aktivitas survei kepuasan masyarakat (IPKP & IPAK)
            Kantor Kementerian Agama Kabupaten Barito Utara secara real-time.
          </p>
        </div>

        {/* Quick Action Button Group */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            href="/admin/layanan"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-emerald-900 shadow-md hover:bg-emerald-50 transition-all duration-200 active:scale-95 cursor-pointer"
          >
            <PlusCircle className="size-4 text-emerald-700" />
            <span>Tambah Layanan</span>
          </Link>
          <Link
            href="/admin/laporan"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700/80 border border-emerald-500/50 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-600 transition-all duration-200 active:scale-95 cursor-pointer backdrop-blur-md"
          >
            <BarChart3 className="size-4 text-emerald-200" />
            <span>Laporan Detail</span>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
