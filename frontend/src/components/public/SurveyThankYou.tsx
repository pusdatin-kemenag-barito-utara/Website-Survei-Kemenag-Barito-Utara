import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/components/shared/I18nProvider'
import Link from 'next/link'
import { 
  CheckCircle2, 
  Home, 
  RotateCcw, 
  Sparkles, 
  HeartHandshake, 
  BarChart3, 
  ShieldCheck,
  Calendar,
  Layers,
  Award
} from 'lucide-react'
import { motion } from 'framer-motion'

interface SurveyThankYouProps {
  serviceName?: string
  onReset?: () => void
}

export function SurveyThankYou({ serviceName, onReset }: SurveyThankYouProps) {
  const { t, locale } = useI18n()

  const [submissionTime] = useState(() => {
    const now = new Date()
    return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'id-ID', {
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(now)
  })

  const handleReset = () => {
    if (onReset) {
      onReset()
    } else {
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-100/80 dark:bg-gray-950 relative overflow-hidden">
      {/* Subtle Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-400/15 dark:bg-emerald-600/10 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-3xl sm:rounded-[2.5rem] shadow-2xl shadow-emerald-950/10 border border-slate-200/90 dark:border-gray-800 overflow-hidden relative z-10 my-auto"
      >
        {/* Header Visual Banner with Mesh Gradient */}
        <div className="relative bg-gradient-to-r from-emerald-800 via-teal-700 to-emerald-900 px-6 pt-10 pb-12 text-center overflow-hidden">
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1.5px,transparent_1.5px)] [background-size:18px_18px]" />
          <Sparkles className="absolute top-4 left-6 size-8 text-white/20 animate-pulse" />
          <Sparkles className="absolute bottom-4 right-6 size-10 text-emerald-200/25 animate-pulse" />

          {/* Glowing Success Icon */}
          <div className="relative inline-block mb-3">
            <motion.div
              initial={{ scale: 0, rotate: -25 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 18 }}
              className="relative z-10 flex size-20 sm:size-22 items-center justify-center rounded-3xl bg-gradient-to-tr from-emerald-500 to-emerald-400 text-white shadow-2xl shadow-emerald-900/40 ring-4 ring-white/30"
            >
              <CheckCircle2 className="size-10 sm:size-11 stroke-[2.5]" />
            </motion.div>
          </div>

          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black bg-emerald-500/30 text-emerald-100 border border-emerald-300/30 backdrop-blur-md mb-2.5">
              <HeartHandshake className="size-3.5 text-emerald-200" />
              {locale === 'en' ? 'Survey Submitted Successfully' : 'Survei Berhasil Terkirim'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {t('survey.thank_you')}
            </h1>
            <p className="text-emerald-100/90 text-xs sm:text-sm font-medium mt-1.5 max-w-md mx-auto leading-relaxed">
              {t('survey.thank_you_desc')}
            </p>
          </div>
        </div>

        {/* Card Body */}
        <div className="px-6 sm:px-9 pt-6 pb-8 space-y-5">
          
          {/* Survey Summary Info */}
          <div className="bg-slate-50 dark:bg-gray-800/60 rounded-2xl border border-slate-200/80 dark:border-gray-700/80 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-600" />
                <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                  {locale === 'en' ? 'Submission Summary' : 'Ringkasan Survei'}
                </p>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                {locale === 'en' ? 'Verified' : 'Tersimpan'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {serviceName && (
                <div className="flex items-start gap-2 bg-white dark:bg-gray-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-gray-800">
                  <Layers className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      {locale === 'en' ? 'Service' : 'Layanan'}
                    </p>
                    <p className="font-extrabold text-slate-800 dark:text-slate-200 line-clamp-1">
                      {serviceName}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2 bg-white dark:bg-gray-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-gray-800">
                <Calendar className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    {locale === 'en' ? 'Date & Time' : 'Waktu'}
                  </p>
                  <p className="font-extrabold text-slate-800 dark:text-slate-200">
                    {submissionTime}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Official Appreciation Note */}
          <div className="bg-emerald-50/80 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 p-4 flex items-start gap-3">
            <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-600 text-white shrink-0 shadow-xs mt-0.5">
              <Award className="size-4" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-black text-emerald-950 dark:text-emerald-200 uppercase tracking-wide">
                {locale === 'en' ? 'Service Commitment' : 'Apresiasi & Komitmen Pelayanan'}
              </p>
              <p className="text-xs font-medium text-emerald-900/90 dark:text-emerald-300 leading-relaxed">
                {locale === 'en'
                  ? 'Your feedback is instrumental in improving public service standards at Kantor Kementerian Agama Kabupaten Barito Utara.'
                  : 'Masukan dan penilaian Anda sangat berharga dalam meningkatkan standar pelayanan publik prima di Kantor Kementerian Agama Kabupaten Barito Utara.'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <Link href="/" className="w-full">
              <Button
                size="lg"
                aria-label="Kembali ke Beranda"
                className="w-full h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-lg shadow-emerald-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer gap-2 text-xs sm:text-sm"
              >
                <Home className="size-4" />
                <span>{locale === 'en' ? 'Home' : 'Beranda'}</span>
              </Button>
            </Link>

            <Link href="/hasil" className="w-full">
              <Button
                size="lg"
                variant="outline"
                aria-label="Lihat Hasil Survei"
                className="w-full h-11 rounded-2xl border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950 font-extrabold transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer gap-2 text-xs sm:text-sm"
              >
                <BarChart3 className="size-4 text-emerald-600" />
                <span>{locale === 'en' ? 'View Results' : 'Lihat Hasil'}</span>
              </Button>
            </Link>

            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleReset}
              aria-label="Isi Survei Lagi"
              className="w-full h-11 rounded-2xl border-slate-200 dark:border-gray-700 font-extrabold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-gray-800 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer gap-2 text-xs sm:text-sm"
            >
              <RotateCcw className="size-4 text-slate-600" />
              <span>{locale === 'en' ? 'Survey Again' : 'Survei Lagi'}</span>
            </Button>
          </div>

        </div>
      </motion.div>
    </div>
  )
}
