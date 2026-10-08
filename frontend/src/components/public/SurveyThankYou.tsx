import { useState, useEffect } from 'react'
import { useI18n } from '@/components/shared/I18nProvider'
import { 
  CheckCircle2, 
  Home, 
  RotateCcw, 
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

  // Prefetch target pages for 0ms instant navigation
  useEffect(() => {
    const targets = ['/', '/hasil/ipkp', '/survei']
    targets.forEach((url) => {
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.href = url
      link.as = 'document'
      document.head.appendChild(link)
    })
  }, [])

  const handleReset = () => {
    if (onReset) {
      onReset()
    } else {
      window.location.href = '/survei'
    }
  }

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center p-3 sm:p-6 lg:p-8 bg-slate-100/80 dark:bg-gray-950 relative overflow-y-auto">
      {/* Background Ambience */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(90vw,650px)] h-[360px] bg-emerald-500/10 dark:bg-emerald-600/10 blur-[100px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="w-[clamp(320px,88vw,700px)] max-w-[700px] bg-white dark:bg-gray-900 rounded-3xl shadow-xl shadow-slate-300/40 dark:shadow-black/50 border border-slate-200/90 dark:border-gray-800 overflow-hidden relative z-10 my-auto"
      >
        {/* Header Visual Banner - Proportional & Compact */}
        <div className="relative bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 px-6 sm:px-10 py-7 sm:py-8 text-center overflow-hidden">
          {/* Subtle ambient lighting */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-72 h-72 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />

          {/* Success Checkmark Badge */}
          <div className="relative inline-block">
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 280, damping: 20 }}
              className="relative z-10 flex size-16 sm:size-18 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-emerald-400 text-white shadow-xl shadow-emerald-950/30 ring-4 ring-white/20 mx-auto"
            >
              <CheckCircle2 className="size-8 sm:size-9 stroke-[2.25]" />
            </motion.div>
          </div>

          <div className="relative z-10 mt-3.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-emerald-900/40 text-emerald-100 border border-emerald-300/25 backdrop-blur-xs">
              <ShieldCheck className="size-3.5 text-emerald-300" />
              <span>{locale === 'en' ? 'Survey Submitted Successfully' : 'Survei Berhasil Terkirim'}</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-2.5">
              {t('survey.thank_you')}
            </h1>

            <p className="text-emerald-100/90 text-xs sm:text-sm font-medium mt-1.5 max-w-md mx-auto leading-relaxed">
              {t('survey.thank_you_desc')}
            </p>
          </div>
        </div>

        {/* Card Body - Balanced Spacing */}
        <div className="p-5 sm:p-7 space-y-4">
          
          {/* Survey Summary Info */}
          <div className="bg-slate-50/90 dark:bg-gray-800/40 rounded-2xl border border-slate-200/80 dark:border-gray-700/60 p-4 space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60 dark:border-gray-700/50">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {locale === 'en' ? 'Submission Summary' : 'Ringkasan Survei'}
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100/90 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60">
                <span className="size-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
                <span>{locale === 'en' ? 'Saved' : 'Tersimpan'}</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-start gap-3 bg-white dark:bg-gray-900 p-3 rounded-xl border border-slate-200/70 dark:border-gray-800 shadow-2xs">
                <div className="size-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Layers className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {locale === 'en' ? 'Service' : 'Layanan'}
                  </p>
                  <p className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm leading-snug line-clamp-2 mt-0.5" title={serviceName}>
                    {serviceName || '-'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white dark:bg-gray-900 p-3 rounded-xl border border-slate-200/70 dark:border-gray-800 shadow-2xs">
                <div className="size-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Calendar className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {locale === 'en' ? 'Date & Time' : 'Waktu'}
                  </p>
                  <p className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm leading-snug mt-0.5" title={submissionTime}>
                    {submissionTime}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Official Appreciation Note */}
          <div className="bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/70 dark:border-emerald-850 p-3.5 sm:p-4 flex items-start gap-3">
            <div className="size-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
              <Award className="size-4" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                {locale === 'en' ? 'Service Commitment' : 'Apresiasi & Komitmen Pelayanan'}
              </p>
              <p className="text-xs font-normal text-emerald-900/85 dark:text-emerald-300/90 leading-relaxed">
                {locale === 'en'
                  ? 'Your feedback is instrumental in improving public service standards at Kantor Kementerian Agama Kabupaten Barito Utara.'
                  : 'Masukan dan penilaian Anda sangat berharga dalam meningkatkan standar pelayanan publik prima di Kantor Kementerian Agama Kabupaten Barito Utara.'}
              </p>
            </div>
          </div>

          {/* Action Buttons - Instant Navigation */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <a
              href="/"
              data-astro-prefetch="load"
              aria-label="Kembali ke Beranda"
              className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all cursor-pointer select-none"
            >
              <Home className="size-4 shrink-0" />
              <span>{locale === 'en' ? 'Home' : 'Beranda'}</span>
            </a>

            <a
              href="/hasil/ipkp"
              data-astro-prefetch="load"
              aria-label="Lihat Hasil Survei"
              className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-white dark:bg-gray-900 border border-emerald-300 dark:border-emerald-700/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 active:scale-[0.98] text-emerald-800 dark:text-emerald-300 font-bold text-xs sm:text-sm shadow-2xs transition-all cursor-pointer select-none"
            >
              <BarChart3 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{locale === 'en' ? 'View Results' : 'Lihat Hasil'}</span>
            </a>

            <button
              type="button"
              onClick={handleReset}
              aria-label="Isi Survei Lagi"
              className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 hover:bg-slate-100 dark:hover:bg-gray-800 active:scale-[0.98] text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm shadow-2xs transition-all cursor-pointer select-none"
            >
              <RotateCcw className="size-4 shrink-0 text-slate-500 dark:text-slate-400" />
              <span>{locale === 'en' ? 'Survey Again' : 'Survei Lagi'}</span>
            </button>
          </div>

        </div>
      </motion.div>
    </div>
  )
}

