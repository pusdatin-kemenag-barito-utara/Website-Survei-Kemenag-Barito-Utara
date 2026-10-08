import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { Users, FileText, Layers, Calendar } from "lucide-react";
import type { SurveyPeriod } from "@/types";

interface DashboardStatCardsProps {
  totalResponses: number;
  activeServices: number;
  totalUnsur: number;
  activePeriod: SurveyPeriod | null;
  containerVariants: Variants;
  itemAnimVariants: Variants;
}

export function DashboardStatCards({
  totalResponses,
  activeServices,
  totalUnsur,
  activePeriod,
  containerVariants,
  itemAnimVariants,
}: DashboardStatCardsProps) {
  const statCards = [
    {
      title: "Total Respon Survei",
      value: (totalResponses ?? 0).toLocaleString(),
      desc: "Respon publik yang tercatat",
      icon: <Users className="size-6 text-emerald-600" />,
      color: "border-l-4 border-l-emerald-500",
      bgLight: "bg-emerald-50/60",
      href: "/admin/respon",
    },
    {
      title: "Layanan Aktif",
      value: `${activeServices ?? 0} Layanan`,
      desc: "Jenis layanan PTSP aktif",
      icon: <FileText className="size-6 text-blue-600" />,
      color: "border-l-4 border-l-blue-500",
      bgLight: "bg-blue-50/60",
      href: "/admin/layanan",
    },
    {
      title: "Unsur Evaluasi",
      value: `${totalUnsur ?? 0} Unsur`,
      desc: "Indikator kuesioner aktif",
      icon: <Layers className="size-6 text-purple-600" />,
      color: "border-l-4 border-l-purple-500",
      bgLight: "bg-purple-50/60",
      href: "/admin/unsur",
    },
    {
      title: "Periode Berjalan",
      value: activePeriod?.label ?? "Belum Ditentukan",
      desc: activePeriod
        ? `${activePeriod.start_date} s/d ${activePeriod.end_date}`
        : "Silakan atur periode aktif",
      icon: <Calendar className="size-6 text-amber-600" />,
      color: "border-l-4 border-l-amber-500",
      bgLight: "bg-amber-50/60",
      href: "/admin/periode",
    },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
    >
      {statCards.map((card) => (
        <motion.div key={card.title} variants={itemAnimVariants}>
          <Link href={card.href} className="block group">
            <div
              className={`relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 p-5 shadow-sm border border-gray-100 dark:border-gray-800 ${card.color} hover:shadow-lg hover:-translate-y-1 transition-all duration-200`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {card.title}
                </span>
                <div
                  className={`p-2.5 rounded-xl ${card.bgLight} group-hover:scale-110 transition-transform`}
                >
                  {card.icon}
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-gray-900 dark:text-white">
                  {card.value}
                </div>
                <p className="mt-1 text-xs text-gray-500 truncate">
                  {card.desc}
                </p>
              </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
}
