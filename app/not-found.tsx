'use client'

import Link from 'next/link'
import { FileSearch, Home, ArrowLeft, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  const currentYear = new Date().getFullYear()

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-950 text-white overflow-hidden selection:bg-emerald-500 selection:text-white">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[500px] rounded-full bg-emerald-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-10 size-[380px] rounded-full bg-teal-500/15 blur-[100px] pointer-events-none" />
      
      {/* Radial grid overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff0f_1px,transparent_1px)] [background-size:28px_28px] opacity-60 pointer-events-none" />

      {/* Main Glassmorphic Card Container */}
      <div className="relative z-10 max-w-lg w-full mx-4 p-8 sm:p-12 rounded-3xl bg-slate-900/80 border border-slate-800/80 shadow-2xl shadow-emerald-950/30 backdrop-blur-2xl text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Animated Icon Badge */}
        <div className="relative mx-auto size-28 rounded-3xl bg-gradient-to-b from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center shadow-inner group">
          <div className="absolute inset-0 rounded-3xl bg-emerald-500/10 blur-md group-hover:bg-emerald-500/20 transition-colors" />
          <FileSearch className="size-14 text-emerald-400 drop-shadow-md relative z-10 transform group-hover:scale-110 transition-transform duration-300" />
        </div>

        {/* Big 404 & Typography */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-extrabold text-xs tracking-wider uppercase shadow-xs">
            <ShieldAlert className="size-3.5 text-emerald-400 animate-pulse" />
            <span>404 — Data Tidak Ditemukan</span>
          </div>

          <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-white leading-none">
            Oops! <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">Kosong.</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed max-w-md mx-auto">
            Halaman atau data survei untuk periode ini belum tersedia dalam database <strong className="text-emerald-300">SI-ARUS</strong> Kemenag Barito Utara.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link href="/" className="w-full sm:w-auto">
            <Button className="w-full h-12 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-emerald-900/40 hover:shadow-emerald-900/60 transition-all cursor-pointer">
              <Home className="mr-2 size-4" />
              Kembali ke Beranda
            </Button>
          </Link>
          <Link href="/hasil/ipkp" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full h-12 px-6 rounded-2xl border-slate-700/80 bg-slate-800/50 hover:bg-slate-800 text-slate-200 hover:text-white font-extrabold text-xs sm:text-sm transition-all cursor-pointer">
              <ArrowLeft className="mr-2 size-4 text-emerald-400" />
              Hasil Survei {currentYear}
            </Button>
          </Link>
        </div>

        {/* Footer Credit */}
        <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-500 font-bold tracking-wide uppercase">
          SI-ARUS • Kemenag Kabupaten Barito Utara
        </div>
      </div>
    </div>
  )
}
