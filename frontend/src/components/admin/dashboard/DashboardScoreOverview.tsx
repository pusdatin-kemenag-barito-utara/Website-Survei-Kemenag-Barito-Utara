import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { Activity, TrendingUp, ArrowUpRight } from "lucide-react";

interface DashboardScoreOverviewProps {
  ipkpScore: number | null;
  ipakScore: number | null;
  containerVariants: Variants;
  itemAnimVariants: Variants;
}

export function getMutuLabel(score: number | null) {
  if (score === null || score === undefined)
    return { label: "Belum Ada Data", color: "bg-gray-100 text-gray-700" };
  const converted = score <= 4.0 ? score * 25 : score;
  if (converted >= 88.31)
    return {
      label: "Mutu A (Sangat Baik)",
      color: "bg-emerald-500 text-white",
    };
  if (converted >= 76.61)
    return { label: "Mutu B (Baik)", color: "bg-blue-500 text-white" };
  if (converted >= 65.0)
    return {
      label: "Mutu C (Kurang Baik)",
      color: "bg-amber-500 text-white",
    };
  return { label: "Mutu D (Sangat Kurang)", color: "bg-rose-500 text-white" };
}

export function DashboardScoreOverview({
  ipkpScore,
  ipakScore,
  containerVariants,
  itemAnimVariants,
}: DashboardScoreOverviewProps) {
  const ipkpMutu = getMutuLabel(ipkpScore);
  const ipakMutu = getMutuLabel(ipakScore);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid gap-6 grid-cols-1 md:grid-cols-2"
    >
      {/* IPKP Card */}
      <motion.div variants={itemAnimVariants}>
        <Link href="/admin/laporan" className="block group">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-800 p-6 sm:p-7 text-white shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border border-emerald-500/30">
            <div className="absolute top-0 right-0 -mr-10 -mt-10 size-48 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-colors" />
            <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md text-white shadow-inner">
                    <Activity className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-wide">
                      Skor IPKP
                    </h3>
                    <p className="text-xs text-emerald-100/80">
                      Indeks Persepsi Kualitas Pelayanan
                    </p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${ipkpMutu.color}`}
                >
                  {ipkpMutu.label}
                </span>
              </div>

              <div className="flex items-baseline justify-between pt-2">
                <div>
                  <div className="text-5xl font-black tracking-tight text-white drop-shadow-sm">
                    {ipkpScore != null
                      ? (ipkpScore <= 4.0 ? (ipkpScore * 25).toFixed(2) : ipkpScore.toFixed(2))
                      : "N/A"}
                  </div>
                  <p className="text-xs text-emerald-200 font-medium mt-1">
                    Skor Skala 4:{" "}
                    <strong className="text-white">
                      {ipkpScore != null
                        ? (ipkpScore <= 4.0 ? ipkpScore.toFixed(2) : (ipkpScore / 25).toFixed(2))
                        : "-"}
                    </strong>{" "}
                    / 4.00
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-emerald-200 group-hover:text-white transition-colors bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-md">
                  <span>Detail</span>
                  <ArrowUpRight className="size-4" />
                </div>
              </div>
            </div>
          </div>
        </Link>
      </motion.div>

      {/* IPAK Card */}
      <motion.div variants={itemAnimVariants}>
        <Link href="/admin/laporan" className="block group">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 p-6 sm:p-7 text-white shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border border-indigo-500/30">
            <div className="absolute top-0 right-0 -mr-10 -mt-10 size-48 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-colors" />
            <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md text-white shadow-inner">
                    <TrendingUp className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-wide">
                      Skor IPAK
                    </h3>
                    <p className="text-xs text-indigo-100/80">
                      Indeks Persepsi Anti Korupsi
                    </p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${ipakMutu.color}`}
                >
                  {ipakMutu.label}
                </span>
              </div>

              <div className="flex items-baseline justify-between pt-2">
                <div>
                  <div className="text-5xl font-black tracking-tight text-white drop-shadow-sm">
                    {ipakScore != null
                      ? (ipakScore <= 4.0 ? (ipakScore * 25).toFixed(2) : ipakScore.toFixed(2))
                      : "N/A"}
                  </div>
                  <p className="text-xs text-indigo-200 font-medium mt-1">
                    Skor Skala 4:{" "}
                    <strong className="text-white">
                      {ipakScore != null
                        ? (ipakScore <= 4.0 ? ipakScore.toFixed(2) : (ipakScore / 25).toFixed(2))
                        : "-"}
                    </strong>{" "}
                    / 4.00
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-indigo-200 group-hover:text-white transition-colors bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-md">
                  <span>Detail</span>
                  <ArrowUpRight className="size-4" />
                </div>
              </div>
            </div>
          </div>
        </Link>
      </motion.div>
    </motion.div>
  );
}
