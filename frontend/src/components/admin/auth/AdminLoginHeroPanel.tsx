import Image from "next/image";
import { motion } from "framer-motion";

export function AdminLoginHeroPanel() {
  return (
    <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[#061e16] p-12 lg:flex xl:p-16 border-r border-emerald-900/30 select-none">
      {/* Subtle Ambient Radial Lighting */}
      <div className="absolute -top-24 -left-24 size-[520px] rounded-full bg-emerald-600/[0.07] blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 size-[400px] rounded-full bg-teal-600/[0.05] blur-[120px] pointer-events-none" />

      {/* Top Header: Dignified & Clean Brand Identity */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/kemenag.svg"
            alt="Logo Kemenag"
            width={32}
            height={32}
            priority
            className="object-contain"
          />
          <div className="h-4.5 w-px bg-white/15" />
          <Image
            src="/arus.webp"
            alt="Logo SI-ARUS"
            width={32}
            height={32}
            priority
            className="object-contain"
          />
          <div className="ml-1.5 flex items-center gap-2">
            <span className="text-sm font-extrabold text-white tracking-wide">
              SI-ARUS
            </span>
            <span className="text-xs font-medium text-emerald-300/60">
              • Kemenag Barito Utara
            </span>
          </div>
        </div>
      </div>

      {/* Center Content: Minimalist, Authoritative & Spacious */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 my-auto py-12 max-w-md space-y-10"
      >
        <div className="space-y-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-400/90">
            Portal Administrator
          </p>

          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl leading-[1.25]">
            Pengawasan Mutu & Integritas Pelayanan Publik
          </h1>

          <p className="text-xs sm:text-sm leading-relaxed text-emerald-100/70 font-normal">
            Instrumen terpadu pengukuran Indeks Kepuasan Masyarakat (IPKP) dan Indeks Persepsi Anti-Korupsi (IPAK) berbasis transparansi data nyata.
          </p>
        </div>

        {/* Minimalist Metric Strip */}
        <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/[0.08]">
          <div>
            <div className="text-2xl font-black text-white tracking-tight">
              9 Unsur
            </div>
            <div className="text-[11px] font-medium text-emerald-200/60 mt-1">
              Mutu Pelayanan
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white tracking-tight">
              5 Unsur
            </div>
            <div className="text-[11px] font-medium text-emerald-200/60 mt-1">
              Integritas IPAK
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white tracking-tight">
              Real-Time
            </div>
            <div className="text-[11px] font-medium text-emerald-200/60 mt-1">
              Rekapitulasi
            </div>
          </div>
        </div>
      </motion.div>

      {/* Bottom Footer: Minimalist Footnote */}
      <div className="relative z-10 flex items-center justify-between text-[11px] font-medium text-emerald-300/40 pt-4 border-t border-white/[0.06]">
        <span>Standar PermenPAN-RB No. 14 Tahun 2017</span>
        <span>© 2026 Kemenag Barito Utara</span>
      </div>
    </div>
  );
}
