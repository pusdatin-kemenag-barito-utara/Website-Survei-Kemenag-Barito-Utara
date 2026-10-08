import Image from "next/image";
import { motion } from "framer-motion";
import {
  Sparkles,
  BarChart3,
  ShieldCheck,
  FileSpreadsheet,
  CheckCircle2,
} from "lucide-react";

export function AdminLoginHeroPanel() {
  return (
    <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 p-12 lg:flex border-r border-emerald-800/40">
      {/* Glow Effects & Grid Pattern Background */}
      <div className="absolute -left-32 -top-32 size-[560px] rounded-full bg-emerald-500/20 blur-[130px] pointer-events-none" />
      <div className="absolute -right-32 -bottom-32 size-[560px] rounded-full bg-teal-400/15 blur-[130px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 size-[400px] rounded-full bg-emerald-600/10 blur-[100px] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#05966912_1px,transparent_1px),linear-gradient(to_bottom,#05966912_1px,transparent_1px)] bg-[size:36px_36px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Top Header Brand Identity */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex items-center gap-2 rounded-2xl bg-white/10 p-2 shadow-xl backdrop-blur-md border border-white/20 ring-1 ring-white/10">
            <Image
              src="/kemenag.svg"
              alt="Logo Kemenag"
              width={34}
              height={34}
              priority
              className="object-contain filter drop-shadow"
            />
            <div className="h-6 w-px bg-white/20" />
            <Image
              src="/arus.webp"
              alt="Logo SI-ARUS"
              width={36}
              height={36}
              priority
              className="object-contain filter drop-shadow"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white tracking-wide">
                SI-ARUS
              </h2>
              <span className="rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-300 border border-emerald-400/30 backdrop-blur-xs">
                v2.0 Official
              </span>
            </div>
            <p className="text-xs font-medium text-emerald-200/80 mt-0.5">
              Kemenag Kab. Barito Utara
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-full bg-emerald-950/60 border border-emerald-700/40 px-3 py-1.5 backdrop-blur-md">
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-bold text-emerald-200">
            Portal PTSP
          </span>
        </div>
      </div>

      {/* Hero Copy & Highlight Cards */}
      <div className="relative z-10 my-auto py-8 max-w-lg space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-4"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-400/30 px-3.5 py-1 text-xs font-bold text-emerald-300">
            <Sparkles className="size-3.5 text-emerald-300" />
            Sistem Manajemen Survei Pelayanan Terpadu
          </div>

          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl leading-tight">
            Pusat Kendali & <br />
            <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
              Analisis Kualitas Pelayanan
            </span>
          </h1>
          <p className="text-sm leading-relaxed text-emerald-100/80 font-normal">
            Kelola rekapitulasi data kepuasan masyarakat (IPKP & IPAK), pantau perkembangan unsur pelayanan secara langsung, dan terbitkan laporan terakreditasi resmi.
          </p>
        </motion.div>

        {/* 3 Value Pillars */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="space-y-3.5"
        >
          <div className="flex items-start gap-3.5 rounded-2xl bg-white/5 border border-white/10 p-3.5 backdrop-blur-md transition-all hover:bg-white/10">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              <BarChart3 className="size-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                Rekapitulasi IPKP & IPAK Real-Time
              </h4>
              <p className="text-xs text-emerald-200/70 mt-0.5 leading-relaxed">
                Perhitungan otomatis 9 unsur mutu pelayanan dan 5 unsur integritas anti-korupsi.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 rounded-2xl bg-white/5 border border-white/10 p-3.5 backdrop-blur-md transition-all hover:bg-white/10">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/20 text-teal-300 border border-teal-400/30">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                Autentikasi Aman & Bebas Bot
              </h4>
              <p className="text-xs text-emerald-200/70 mt-0.5 leading-relaxed">
                Validasi Cloudflare Turnstile, enkripsi sesi JWT, dan proteksi brute-force otomatis.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 rounded-2xl bg-white/5 border border-white/10 p-3.5 backdrop-blur-md transition-all hover:bg-white/10">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
              <FileSpreadsheet className="size-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                Ekspor Laporan PDF & Excel Instan
              </h4>
              <p className="text-xs text-emerald-200/70 mt-0.5 leading-relaxed">
                Unduh sertifikat mutu dan rekapitulasi data siap lapor sesuai standar PermenPAN-RB.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Minimal Copyright & Verification Badge */}
      <div className="relative z-10 flex items-center justify-between pt-4 border-t border-emerald-800/40 text-xs font-medium text-emerald-300/70">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="size-4 text-emerald-400" />
          <span>PermenPAN-RB No. 14 Tahun 2017</span>
        </div>
        <div>© 2026 Kemenag Barito Utara</div>
      </div>
    </div>
  );
}
