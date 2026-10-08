import Link from "next/link";
import {
  Sparkles,
  FileText,
  Layers,
  HelpCircle,
  Users,
  Calendar,
  ClipboardList,
  PieChart,
  QrCode,
  ChevronRight,
} from "lucide-react";

export function DashboardQuickShortcuts() {
  const quickShortcuts = [
    {
      title: "Kelola Layanan",
      desc: "Tambah & edit daftar layanan PTSP",
      icon: <FileText className="size-5 text-emerald-600" />,
      href: "/admin/layanan",
    },
    {
      title: "Unsur Penilaian",
      desc: "Kelola 9 IPKP & 5 IPAK unsur",
      icon: <Layers className="size-5 text-blue-600" />,
      href: "/admin/unsur",
    },
    {
      title: "Pertanyaan Evaluasi",
      desc: "Atur butir pertanyaan survei",
      icon: <HelpCircle className="size-5 text-teal-600" />,
      href: "/admin/pertanyaan",
    },
    {
      title: "Field Demografi",
      desc: "Kelola data identitas responden",
      icon: <Users className="size-5 text-indigo-600" />,
      href: "/admin/demografi",
    },
    {
      title: "Periode Survei",
      desc: "Kelola jadwal periode evaluasi",
      icon: <Calendar className="size-5 text-amber-600" />,
      href: "/admin/periode",
    },
    {
      title: "Data Respon",
      desc: "Lihat & verifikasi tanggapan publik",
      icon: <ClipboardList className="size-5 text-purple-600" />,
      href: "/admin/respon",
    },
    {
      title: "Laporan Rekap",
      desc: "Lihat grafik & cetak laporan resmi",
      icon: <PieChart className="size-5 text-teal-600" />,
      href: "/admin/laporan",
    },
    {
      title: "QR Code & Barcode",
      desc: "Unduh barcode akses survei publik",
      icon: <QrCode className="size-5 text-emerald-600" />,
      href: "/admin/barcode",
    },
  ];

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
          <Sparkles className="size-5 text-emerald-600" />
          Pintas Menu Modul Admin
        </h2>
        <span className="text-xs text-gray-500 font-medium">
          {quickShortcuts.length} Modul Terintegrasi
        </span>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {quickShortcuts.map((sc) => (
          <Link key={sc.title} href={sc.href} className="group">
            <div className="flex items-start gap-3.5 rounded-2xl bg-white dark:bg-gray-900 p-4 border border-gray-200/80 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-emerald-300 hover:bg-emerald-50/30 transition-all duration-200">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 group-hover:bg-emerald-100/70 group-hover:scale-105 transition-all">
                {sc.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-emerald-800 transition-colors flex items-center justify-between">
                  <span>{sc.title}</span>
                  <ChevronRight className="size-4 text-gray-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5" />
                </h3>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {sc.desc}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
