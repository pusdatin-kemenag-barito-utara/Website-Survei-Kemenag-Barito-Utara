import { useMemo, useState } from 'react'
import {
  FileText, Calendar, Printer, Loader2, Building2, User, Phone, ShieldCheck,
  UserCheck, UserX, ListTodo, Star, MessageSquareText,
  Laugh, Smile, Frown, Angry, Sparkles, Quote, Layers
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import type { Response, Service, SurveyPeriod } from '@/types'
import type { ResponseAnswerDetail, ResponseDemographicDetail } from '@/lib/data'

interface ResponDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedResponse: Response | null
  services: Service[]
  periods: SurveyPeriod[]
  detailLoading: boolean
  detailAnswers: ResponseAnswerDetail[]
  detailDemographics: ResponseDemographicDetail[]
}

/**
 * Deteksi apakah suatu butir pertanyaan termasuk indeks IPAK (Anti Korupsi)
 * Berdasarkan unsur.index_type atau analisis kata kunci teks pertanyaan.
 */
function isIpakAnswer(a: ResponseAnswerDetail): boolean {
  const indexType = (
    a.unsur?.index_type ||
    (a as unknown as { index_type?: string }).index_type ||
    a.question?.unsur?.index_type ||
    ''
  ).toUpperCase()

  if (indexType === 'IPAK') return true
  if (indexType === 'IPKP') return false

  const text = (
    a.questions?.question_text_id ||
    a.question?.question_text_id ||
    (a as unknown as { question_text_id?: string }).question_text_id ||
    ''
  ).toLowerCase()

  if (
    text.includes('pungli') ||
    text.includes('pungutan liar') ||
    text.includes('imbalan') ||
    text.includes('percaloan') ||
    text.includes('diskriminasi') ||
    text.includes('tidak prosedural') ||
    text.includes('penipuan') ||
    text.includes('kecurangan')
  ) {
    return true
  }

  return false
}

function getQuestionText(a: ResponseAnswerDetail): string {
  return (
    a.questions?.question_text_id ||
    a.question?.question_text_id ||
    (a as unknown as { question_text_id?: string }).question_text_id ||
    a.question_id ||
    'Pertanyaan survei'
  )
}

function getUnsurName(a: ResponseAnswerDetail): string {
  return (
    a.unsur?.name ||
    (a as unknown as { unsur_name?: string }).unsur_name ||
    a.question?.unsur?.name ||
    ''
  )
}

/**
 * Mendapatkan teks pilihan jawaban riil yang dipilih responden
 * berdasarkan konfigurasi rating_labels atau label_1..4 pada pertanyaan.
 */
function getAnswerChoiceLabel(a: ResponseAnswerDetail): string {
  const rating = Number(a.rating_value) || 0
  if (rating < 1 || rating > 4) return `Nilai ${rating}`

  const qObj = a.question || a.questions

  // 1. Cek dictionary rating_labels kustom yang tersimpan di pertanyaan
  let ratingLabels: Record<string, string> | null = null
  const rawLabels =
    (qObj as unknown as { rating_labels?: Record<string, string> | string })?.rating_labels ||
    (a as unknown as { rating_labels?: Record<string, string> | string }).rating_labels
  if (typeof rawLabels === 'string') {
    try {
      ratingLabels = JSON.parse(rawLabels)
    } catch {}
  } else if (rawLabels && typeof rawLabels === 'object') {
    ratingLabels = rawLabels as Record<string, string>
  }

  if (ratingLabels && ratingLabels[String(rating)]) {
    return ratingLabels[String(rating)]
  }

  // 2. Cek properti langsung label_1, label_2, label_3, label_4
  const directLabel =
    (qObj as unknown as Record<string, string | undefined>)?.[`label_${rating}`] ||
    (a as unknown as Record<string, string | undefined>)?.[`label_${rating}`]
  if (directLabel && typeof directLabel === 'string' && directLabel.trim()) {
    return directLabel.trim()
  }

  // 3. Fallback pemetaan teks pilihan resmi kuesioner jika label tidak ter-expand
  const isIpak = isIpakAnswer(a)
  if (isIpak) {
    switch (rating) {
      case 4:
        return 'Tidak Ada'
      case 3:
        return 'Jarang Ada'
      case 2:
        return 'Sering Ada'
      case 1:
        return 'Selalu Ada'
    }
  }

  const text = getQuestionText(a).toLowerCase()
  const unsur = getUnsurName(a).toLowerCase()

  // Prosedur
  if (text.includes('prosedur') || unsur.includes('prosedur')) {
    switch (rating) {
      case 4:
        return 'Sangat Mudah'
      case 3:
        return 'Mudah'
      case 2:
        return 'Kurang Mudah'
      case 1:
        return 'Tidak Mudah'
    }
  }

  // Waktu
  if (text.includes('waktu') || text.includes('kecepatan') || unsur.includes('waktu')) {
    switch (rating) {
      case 4:
        return 'Selalu Tepat'
      case 3:
        return 'Banyak Tepatnya'
      case 2:
        return 'Kadang-Kadang Tepat'
      case 1:
        return 'Selalu Tidak Tepat'
    }
  }

  // Kemampuan / Kompetensi
  if (text.includes('kemampuan') || text.includes('kompetensi') || unsur.includes('kompetensi')) {
    switch (rating) {
      case 4:
        return 'Sangat Mampu'
      case 3:
        return 'Mampu'
      case 2:
        return 'Kurang Mampu'
      case 1:
        return 'Tidak Mampu'
    }
  }

  // Kesopanan / Keramahan
  if (text.includes('kesopanan') || text.includes('ramah') || unsur.includes('perilaku')) {
    switch (rating) {
      case 4:
        return 'Sangat Sopan / Ramah'
      case 3:
        return 'Sopan / Ramah'
      case 2:
        return 'Kurang Sopan / Ramah'
      case 1:
        return 'Tidak Sopan / Ramah'
    }
  }

  // Default IPKP (Persyaratan, Biaya, Hasil Layanan, Pengaduan, Sarana)
  switch (rating) {
    case 4:
      return 'Sangat Puas'
    case 3:
      return 'Puas'
    case 2:
      return 'Kurang Puas'
    case 1:
      return 'Tidak Puas'
    default:
      return `Pilihan #${rating}`
  }
}

export function ResponDetailModal({
  open,
  onOpenChange,
  selectedResponse,
  services,
  periods,
  detailLoading,
  detailAnswers,
  detailDemographics,
}: ResponDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'ipkp' | 'ipak'>('all')

  // Pisahkan jawaban IPKP dan IPAK secara terstruktur
  const ipkpAnswers = useMemo(
    () => detailAnswers.filter((a) => !isIpakAnswer(a)),
    [detailAnswers]
  )
  const ipakAnswers = useMemo(
    () => detailAnswers.filter((a) => isIpakAnswer(a)),
    [detailAnswers]
  )

  // Hitung ringkasan skor IPKP
  const ipkpStats = useMemo(() => {
    if (ipkpAnswers.length === 0) return { avg: 0, ikm: 0, mutu: 'D', label: 'Belum Ada' }
    const total = ipkpAnswers.reduce((sum, a) => sum + (Number(a.rating_value) || 0), 0)
    const avg = total / ipkpAnswers.length
    const ikm = avg * 25
    let mutu = 'D'
    let label = 'Tidak Baik'
    if (ikm >= 88.31) {
      mutu = 'A'
      label = 'Sangat Baik'
    } else if (ikm >= 76.61) {
      mutu = 'B'
      label = 'Baik'
    } else if (ikm >= 65.0) {
      mutu = 'C'
      label = 'Kurang Baik'
    }
    return { avg, ikm, mutu, label }
  }, [ipkpAnswers])

  // Hitung ringkasan skor IPAK
  const ipakStats = useMemo(() => {
    if (ipakAnswers.length === 0) return { avg: 0, ipak: 0, mutu: 'D', label: 'Belum Ada' }
    const total = ipakAnswers.reduce((sum, a) => sum + (Number(a.rating_value) || 0), 0)
    const avg = total / ipakAnswers.length
    const ipak = avg * 25
    let mutu = 'D'
    let label = 'Tidak Bersih'
    if (ipak >= 88.31) {
      mutu = 'A'
      label = 'Sangat Bersih'
    } else if (ipak >= 76.61) {
      mutu = 'B'
      label = 'Bersih'
    } else if (ipak >= 65.0) {
      mutu = 'C'
      label = 'Kurang Bersih'
    }
    return { avg, ipak, mutu, label }
  }, [ipakAnswers])

  const getRatingBadge = (rating: number, choiceLabel: string) => {
    switch (rating) {
      case 4:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 font-extrabold text-[11px] sm:text-xs border border-teal-200 dark:border-teal-800 shrink-0 shadow-2xs">
            <Laugh className="size-3.5 sm:size-4 text-teal-600 dark:text-teal-400" />
            <span>{rating} - {choiceLabel}</span>
          </span>
        )
      case 3:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 font-extrabold text-[11px] sm:text-xs border border-cyan-200 dark:border-cyan-800 shrink-0 shadow-2xs">
            <Smile className="size-3.5 sm:size-4 text-cyan-600 dark:text-cyan-400" />
            <span>{rating} - {choiceLabel}</span>
          </span>
        )
      case 2:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-extrabold text-[11px] sm:text-xs border border-amber-200 dark:border-amber-800 shrink-0 shadow-2xs">
            <Frown className="size-3.5 sm:size-4 text-amber-600 dark:text-amber-400" />
            <span>{rating} - {choiceLabel}</span>
          </span>
        )
      case 1:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 font-extrabold text-[11px] sm:text-xs border border-rose-200 dark:border-rose-800 shrink-0 shadow-2xs">
            <Angry className="size-3.5 sm:size-4 text-rose-600 dark:text-rose-400" />
            <span>{rating} - {choiceLabel}</span>
          </span>
        )
      default:
        return (
          <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs">
            {rating}
          </span>
        )
    }
  }

  const renderQuestionCard = (
    a: ResponseAnswerDetail,
    index: number,
    type: 'IPKP' | 'IPAK'
  ) => {
    const isIpak = type === 'IPAK'
    const unsurName = getUnsurName(a)
    const questionText = getQuestionText(a)
    const rating = Number(a.rating_value) || 0
    const choiceLabel = getAnswerChoiceLabel(a)

    return (
      <div
        key={a.id || `${type}-${index}`}
        className={`flex flex-col justify-between gap-3.5 p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
          isIpak
            ? 'bg-gradient-to-b from-indigo-50/40 via-white to-white dark:from-indigo-950/20 dark:via-gray-900 dark:to-gray-900 border-indigo-100 dark:border-indigo-900/50 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-2xs'
            : 'bg-gradient-to-b from-emerald-50/40 via-white to-white dark:from-emerald-950/20 dark:via-gray-900 dark:to-gray-900 border-emerald-100 dark:border-emerald-900/50 hover:border-emerald-300 dark:hover:border-emerald-700 shadow-2xs'
        }`}
      >
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span
                className={`flex size-6 items-center justify-center rounded-lg text-white text-[11px] font-black shadow-xs ${
                  isIpak ? 'bg-indigo-600 dark:bg-indigo-500' : 'bg-emerald-600 dark:bg-emerald-500'
                }`}
              >
                {String(index + 1).padStart(2, '0')}
              </span>
              <span
                className={`text-[11px] font-extrabold uppercase tracking-wider ${
                  isIpak ? 'text-indigo-700 dark:text-indigo-400' : 'text-emerald-700 dark:text-emerald-400'
                }`}
              >
                {isIpak ? `Pertanyaan IPAK #${index + 1}` : `Pertanyaan IPKP #${index + 1}`}
              </span>
            </div>

            {unsurName && (
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-gray-700 truncate max-w-[200px]">
                {unsurName}
              </span>
            )}
          </div>

          <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 leading-relaxed">
            {questionText}
          </p>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-gray-800/80 flex items-center justify-between gap-2">
          {/* Rating Score Visual Indicator */}
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4].map((star) => (
              <span
                key={star}
                className={`size-2 sm:size-2.5 rounded-full transition-colors ${
                  star <= rating
                    ? isIpak
                      ? 'bg-indigo-500'
                      : 'bg-emerald-500'
                    : 'bg-slate-200 dark:bg-gray-700'
                }`}
              />
            ))}
            <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 ml-1">
              {rating}/4
            </span>
          </div>

          {/* Rating Badge dengan Label Pilihan Riil Responden */}
          {getRatingBadge(rating, choiceLabel)}
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={{ width: 'min(96vw, 1480px)', maxWidth: 'min(96vw, 1480px)' }}
        className="w-[96vw] sm:max-w-[96vw] lg:max-w-7xl 2xl:max-w-[1480px] max-h-[92vh] sm:max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-3xl p-0 border border-slate-200/80 dark:border-gray-800 shadow-2xl bg-white dark:bg-gray-900 transition-all"
      >
        {/* Header Banner */}
        <div className="bg-slate-900 dark:bg-gray-950 border-b border-slate-800 p-5 sm:p-7 md:p-8 pr-12 sm:pr-14 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-start sm:items-center gap-3.5 sm:gap-4">
              <div className="flex size-11 sm:size-14 items-center justify-center rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-inner shrink-0 mt-0.5 sm:mt-0">
                <FileText className="size-5 sm:size-7 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg sm:text-2xl font-black text-white tracking-tight flex items-center gap-2 sm:gap-3 flex-wrap">
                  <span>Detail Rincian Respon Survei</span>
                </DialogTitle>
                <div className="text-xs sm:text-sm text-slate-400 font-medium mt-1 sm:mt-1.5 flex items-center gap-2 sm:gap-3 flex-wrap">
                  <span className="flex items-center gap-1.5 shrink-0">
                    <span className="text-slate-500">ID:</span>
                    <span className="text-emerald-300 font-mono font-semibold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60 text-[11px] sm:text-xs">
                      {selectedResponse?.id}
                    </span>
                  </span>
                  <span className="text-slate-600 hidden sm:inline">•</span>
                  <span className="flex items-center gap-1 text-slate-300 shrink-0">
                    <Calendar className="size-3.5 text-slate-400" />
                    <span>
                      {selectedResponse
                        ? new Date(selectedResponse.submitted_at).toLocaleString('id-ID', {
                            dateStyle: 'full',
                            timeStyle: 'short',
                          })
                        : '-'}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0 self-end sm:self-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.print()}
                className="bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 font-bold rounded-xl text-xs gap-2 shadow-xs cursor-pointer px-3.5 py-2 h-auto"
              >
                <Printer className="size-4" />
                <span>Cetak Detail</span>
              </Button>
            </div>
          </div>
        </div>

        {detailLoading ? (
          <div className="flex flex-col justify-center items-center py-24 space-y-3">
            <Loader2 className="size-10 animate-spin text-emerald-600" />
            <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
              Memuat rincian data respon...
            </span>
          </div>
        ) : (
          selectedResponse && (
            <div className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 bg-slate-50/60 dark:bg-gray-950">
              {/* Info Utama Responden Grid Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Layanan Dikunjungi
                    </span>
                    <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                      <Building2 className="size-4" />
                    </div>
                  </div>
                  <p className="font-extrabold text-sm text-slate-900 dark:text-white leading-snug">
                    {selectedResponse.service?.name ||
                      selectedResponse.services?.name ||
                      services.find(
                        (s) =>
                          s.id === selectedResponse.service_id ||
                          s.original_id === selectedResponse.service_id
                      )?.name ||
                      '-'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Periode Survei
                    </span>
                    <div className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                      <Calendar className="size-4" />
                    </div>
                  </div>
                  <p className="font-extrabold text-sm text-slate-900 dark:text-white leading-snug">
                    {selectedResponse.period?.label ||
                      selectedResponse.survey_periods?.label ||
                      periods.find(
                        (p) =>
                          p.id === selectedResponse.period_id ||
                          p.original_id === selectedResponse.period_id
                      )?.label ||
                      '-'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Identitas Responden
                    </span>
                    <div className="p-2 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
                      <User className="size-4" />
                    </div>
                  </div>
                  <div>
                    <p className="font-extrabold text-sm text-slate-900 dark:text-white leading-snug">
                      {selectedResponse.respondent_name || (
                        <span className="text-slate-400 italic">Anonim</span>
                      )}
                    </p>
                    {selectedResponse.respondent_contact && (
                      <p className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1.5">
                        <Phone className="size-3 text-slate-400" />
                        <span>{selectedResponse.respondent_contact}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Status Identitas
                    </span>
                    <div className="p-2 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                      <ShieldCheck className="size-4" />
                    </div>
                  </div>
                  <div>
                    {selectedResponse.is_anonymous &&
                    selectedResponse.respondent_name === 'Anonim' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        <UserX className="size-3.5 text-amber-600" />
                        <span>Responden Anonim</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <UserCheck className="size-3.5 text-emerald-600" />
                        <span>Teridentifikasi</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Data Demografi Responden */}
              {detailDemographics.length > 0 && (
                <div className="space-y-4 bg-white dark:bg-gray-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-gray-800 shadow-2xs">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-gray-800">
                    <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                      <FileText className="size-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                        Rincian Demografi Responden
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">
                        Informasi profil latar belakang demografi pengisi survei
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-3.5">
                    {detailDemographics.map((d) => (
                      <div
                        key={d.id}
                        className="flex flex-col justify-between p-3.5 rounded-xl border border-slate-200/70 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/40 space-y-1.5"
                      >
                        <span
                          className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wide leading-tight line-clamp-2"
                          title={d.demographic_fields?.label_id || d.field?.label_id || d.field_id}
                        >
                          {d.demographic_fields?.label_id || d.field?.label_id || d.field_id}
                        </span>
                        <span className="text-xs font-black text-slate-900 dark:text-white bg-white dark:bg-gray-900 px-3 py-2 rounded-lg border border-slate-200/80 dark:border-gray-700">
                          {d.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ringkasan Skor Indeks IPKP & IPAK */}
              {detailAnswers.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  {/* Card Ringkasan IPKP */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-white dark:from-emerald-950/40 dark:via-teal-950/20 dark:to-gray-900 border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Sparkles className="size-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs font-black text-emerald-950 dark:text-emerald-300 uppercase tracking-wider">
                          Kualitas Pelayanan (IPKP)
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {ipkpAnswers.length} Unsur Evaluasi Pelayanan
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-baseline gap-1 justify-end">
                        <span className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400">
                          {ipkpStats.avg > 0 ? ipkpStats.avg.toFixed(2) : '-'}
                        </span>
                        <span className="text-xs font-bold text-slate-400">/ 4.00</span>
                      </div>
                      {ipkpStats.avg > 0 && (
                        <span className="inline-block mt-0.5 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          IKM {ipkpStats.ikm.toFixed(1)} • {ipkpStats.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Ringkasan IPAK */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-white dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-gray-900 border border-indigo-200/80 dark:border-indigo-800/60 shadow-xs flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="size-4 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-xs font-black text-indigo-950 dark:text-indigo-300 uppercase tracking-wider">
                          Anti Korupsi (IPAK)
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {ipakAnswers.length} Unsur Integritas & Bebas Pungli
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-baseline gap-1 justify-end">
                        <span className="text-xl sm:text-2xl font-black text-indigo-700 dark:text-indigo-400">
                          {ipakStats.avg > 0 ? ipakStats.avg.toFixed(2) : '-'}
                        </span>
                        <span className="text-xs font-bold text-slate-400">/ 4.00</span>
                      </div>
                      {ipakStats.avg > 0 && (
                        <span className="inline-block mt-0.5 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          IPAK {ipakStats.ipak.toFixed(1)} • {ipakStats.label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Rincian Jawaban Penilaian Responden Terpisah (IPKP vs IPAK) */}
              {detailAnswers.length > 0 && (
                <div className="space-y-6 bg-white dark:bg-gray-900 p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-gray-800 shadow-2xs">
                  {/* Top Bar Navigation Tabs */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-gray-800">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-9 items-center justify-center rounded-xl bg-slate-900 dark:bg-emerald-950 text-emerald-400 font-bold shrink-0">
                        <ListTodo className="size-4.5" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                          Jawaban Penilaian Unsur Pelayanan
                        </h4>
                        <p className="text-xs text-slate-500 font-medium">
                          Hasil skor evaluasi dipisah berdasarkan kategori IPKP dan IPAK
                        </p>
                      </div>
                    </div>

                    {/* View Switcher Controls */}
                    <div className="inline-flex p-1 bg-slate-100 dark:bg-gray-800 rounded-xl gap-1 text-xs font-bold self-start sm:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => setActiveTab('all')}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                          activeTab === 'all'
                            ? 'bg-white dark:bg-gray-900 text-slate-900 dark:text-white shadow-xs font-black'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <Layers className="size-3.5" />
                        <span>Semua ({detailAnswers.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('ipkp')}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                          activeTab === 'ipkp'
                            ? 'bg-emerald-600 text-white shadow-xs font-black'
                            : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                        }`}
                      >
                        <span className="size-2 rounded-full bg-emerald-400" />
                        <span>IPKP ({ipkpAnswers.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('ipak')}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                          activeTab === 'ipak'
                            ? 'bg-indigo-600 text-white shadow-xs font-black'
                            : 'text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                        }`}
                      >
                        <span className="size-2 rounded-full bg-indigo-400" />
                        <span>IPAK ({ipakAnswers.length})</span>
                      </button>
                    </div>
                  </div>

                  {/* KELOMPOK 1: IPKP (Indeks Persepsi Kualitas Pelayanan) */}
                  {(activeTab === 'all' || activeTab === 'ipkp') && ipkpAnswers.length > 0 && (
                    <div className="space-y-4 pt-1">
                      <div className="flex items-center justify-between pb-2.5 border-b border-emerald-100 dark:border-emerald-950/80 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                            <Sparkles className="size-4" />
                          </div>
                          <div>
                            <h5 className="text-xs sm:text-sm font-black text-emerald-950 dark:text-emerald-200 uppercase tracking-wide">
                              1. Indeks Persepsi Kualitas Pelayanan (IPKP)
                            </h5>
                            <p className="text-[11px] text-slate-500 font-medium">
                              9 Unsur Pelayanan Publik KepmenPAN-RB (Kesesuaian, Prosedur, Waktu, Biaya, Sarana)
                            </p>
                          </div>
                        </div>

                        <Badge
                          variant="outline"
                          className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-extrabold px-2.5 py-1 rounded-lg text-xs border-emerald-200 dark:border-emerald-800"
                        >
                          {ipkpAnswers.length} Pertanyaan Pelayanan
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {ipkpAnswers.map((a, idx) => renderQuestionCard(a, idx, 'IPKP'))}
                      </div>
                    </div>
                  )}

                  {/* KELOMPOK 2: IPAK (Indeks Persepsi Anti Korupsi) */}
                  {(activeTab === 'all' || activeTab === 'ipak') && ipakAnswers.length > 0 && (
                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-gray-800">
                      <div className="flex items-center justify-between pb-2.5 border-b border-indigo-100 dark:border-indigo-950/80 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                            <ShieldCheck className="size-4" />
                          </div>
                          <div>
                            <h5 className="text-xs sm:text-sm font-black text-indigo-950 dark:text-indigo-200 uppercase tracking-wide">
                              2. Indeks Persepsi Anti Korupsi (IPAK)
                            </h5>
                            <p className="text-[11px] text-slate-500 font-medium">
                              5 Unsur Integritas, Ketiadaan Pungutan Liar, Percaloan & Gratifikasi
                            </p>
                          </div>
                        </div>

                        <Badge
                          variant="outline"
                          className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-extrabold px-2.5 py-1 rounded-lg text-xs border-indigo-200 dark:border-indigo-800"
                        >
                          {ipakAnswers.length} Pertanyaan Integritas
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {ipakAnswers.map((a, idx) => renderQuestionCard(a, idx, 'IPAK'))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Ulasan / Feedback Pesan & Saran Terpisah (IPKP vs IPAK) */}
              <div className="space-y-4 bg-white dark:bg-gray-900 p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-gray-800 shadow-2xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-gray-800 flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold shrink-0">
                      <MessageSquareText className="size-4.5" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                        Catatan Saran &amp; Masukan Responden
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">
                        Kritik, masukan, dan saran tertulis yang disampaikan responden secara terpisah
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Kolom 1: Saran Kualitas Pelayanan (IPKP) */}
                  <div className="flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-blue-50/50 via-white to-white dark:from-blue-950/20 dark:via-gray-900 dark:to-gray-900 border border-blue-200/70 dark:border-blue-900/60 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300 font-extrabold text-xs">
                        <Star className="size-4 text-blue-600 dark:text-blue-400 fill-blue-500/20" />
                        <span>Saran Kualitas Pelayanan (IPKP)</span>
                      </div>
                      {selectedResponse.ipkp_feedback?.trim() ? (
                        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 text-[10px] font-bold">
                          Ada Catatan
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-semibold italic">
                          Tidak ada catatan
                        </span>
                      )}
                    </div>

                    {selectedResponse.ipkp_feedback?.trim() ? (
                      <div className="relative p-4 rounded-xl bg-white dark:bg-gray-800/80 border border-blue-100 dark:border-blue-900/50 shadow-2xs">
                        <Quote className="size-6 text-blue-300/40 dark:text-blue-600/30 absolute top-2 right-2 pointer-events-none" />
                        <p className="text-xs sm:text-sm font-medium italic text-slate-800 dark:text-slate-100 leading-relaxed pr-6">
                          &ldquo;{selectedResponse.ipkp_feedback.trim()}&rdquo;
                        </p>
                      </div>
                    ) : (
                      <div className="py-6 px-4 rounded-xl bg-slate-50/60 dark:bg-gray-800/40 border border-dashed border-slate-200 dark:border-gray-800 text-center">
                        <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                          Responden tidak meninggalkan saran tertulis terkait kualitas pelayanan.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Kolom 2: Saran Persepsi Anti Korupsi (IPAK) */}
                  <div className="flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-amber-50/50 via-white to-white dark:from-amber-950/20 dark:via-gray-900 dark:to-gray-900 border border-amber-200/70 dark:border-amber-900/60 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-extrabold text-xs">
                        <ShieldCheck className="size-4 text-amber-600 dark:text-amber-400" />
                        <span>Saran Persepsi Anti Korupsi (IPAK)</span>
                      </div>
                      {selectedResponse.ipak_feedback?.trim() ? (
                        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 text-[10px] font-bold">
                          Ada Catatan
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-semibold italic">
                          Tidak ada catatan
                        </span>
                      )}
                    </div>

                    {selectedResponse.ipak_feedback?.trim() ? (
                      <div className="relative p-4 rounded-xl bg-white dark:bg-gray-800/80 border border-amber-100 dark:border-amber-900/50 shadow-2xs">
                        <Quote className="size-6 text-amber-300/40 dark:text-amber-600/30 absolute top-2 right-2 pointer-events-none" />
                        <p className="text-xs sm:text-sm font-medium italic text-slate-800 dark:text-slate-100 leading-relaxed pr-6">
                          &ldquo;{selectedResponse.ipak_feedback.trim()}&rdquo;
                        </p>
                      </div>
                    ) : (
                      <div className="py-6 px-4 rounded-xl bg-slate-50/60 dark:bg-gray-800/40 border border-dashed border-slate-200 dark:border-gray-800 text-center">
                        <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                          Responden tidak meninggalkan saran tertulis terkait integritas / anti korupsi.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        )}
      </DialogContent>
    </Dialog>
  )
}
