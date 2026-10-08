import {
  FileText, Calendar, Printer, Loader2, Building2, User, Phone, ShieldCheck,
  UserCheck, UserX, ListTodo, Star, MessageSquareText,
  Laugh, Smile, Frown, Angry
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
  const getRatingBadge = (rating: number) => {
    switch (rating) {
      case 4:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-extrabold text-xs border border-teal-200 shrink-0">
            <Laugh className="size-4 text-teal-600 dark:text-teal-400" />
            <span>4 - Sangat Puas</span>
          </span>
        )
      case 3:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 font-extrabold text-xs border border-cyan-200 shrink-0">
            <Smile className="size-4 text-cyan-600 dark:text-cyan-400" />
            <span>3 - Puas</span>
          </span>
        )
      case 2:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-pink-100 dark:bg-pink-950 text-pink-800 dark:text-pink-300 font-extrabold text-xs border border-pink-200 shrink-0">
            <Frown className="size-4 text-pink-600 dark:text-pink-400" />
            <span>2 - Kurang Puas</span>
          </span>
        )
      case 1:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-extrabold text-xs border border-rose-200 shrink-0">
            <Angry className="size-4 text-rose-600 dark:text-rose-400" />
            <span>1 - Tidak Puas</span>
          </span>
        )
      default:
        return <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs">{rating}</span>
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[85vw] !max-w-[85vw] max-h-[90vh] overflow-y-auto rounded-3xl p-0 border border-slate-200/80 dark:border-gray-800 shadow-2xl bg-white dark:bg-gray-900">
        {/* Header Banner */}
        <div className="bg-slate-900 dark:bg-gray-950 border-b border-slate-800 p-6 sm:p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center justify-between flex-wrap gap-4 relative z-10">
            <div className="flex items-center gap-4">
              <div className="flex size-12 sm:size-14 items-center justify-center rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-inner shrink-0">
                <FileText className="size-6 sm:size-7 text-emerald-400" />
              </div>
              <div>
                <DialogTitle className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-3">
                  <span>Detail Rincian Respon Survei</span>
                </DialogTitle>
                <div className="text-xs sm:text-sm text-slate-400 font-medium mt-1.5 flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <span className="text-slate-500">ID:</span>
                    <span className="text-emerald-300 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60 text-xs">{selectedResponse?.id}</span>
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="flex items-center gap-1 text-slate-300">
                    <Calendar className="size-3.5 text-slate-400" />
                    <span>{selectedResponse ? new Date(selectedResponse.submitted_at).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'medium' }) : '-'}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.print()}
                className="bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 font-bold rounded-xl text-xs gap-2 shadow-xs cursor-pointer"
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
            <span className="text-sm font-bold text-slate-600 dark:text-slate-400">Memuat rincian data respon...</span>
          </div>
        ) : selectedResponse && (
          <div className="p-6 sm:p-8 space-y-8 bg-slate-50/60 dark:bg-gray-950">
            {/* Info Utama Responden Grid Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Layanan Dikunjungi</span>
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                    <Building2 className="size-4" />
                  </div>
                </div>
                <p className="font-extrabold text-sm text-slate-900 dark:text-white leading-snug">
                  {selectedResponse.service?.name || selectedResponse.services?.name || services.find((s) => s.id === selectedResponse.service_id || s.original_id === selectedResponse.service_id)?.name || '-'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Periode Survei</span>
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                    <Calendar className="size-4" />
                  </div>
                </div>
                <p className="font-extrabold text-sm text-slate-900 dark:text-white leading-snug">
                  {selectedResponse.period?.label || selectedResponse.survey_periods?.label || periods.find((p) => p.id === selectedResponse.period_id || p.original_id === selectedResponse.period_id)?.label || '-'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Identitas Responden</span>
                  <div className="p-2 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
                    <User className="size-4" />
                  </div>
                </div>
                <div>
                  <p className="font-extrabold text-sm text-slate-900 dark:text-white leading-snug">
                    {selectedResponse.respondent_name || <span className="text-slate-400 italic">Anonim</span>}
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
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status Identitas</span>
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                    <ShieldCheck className="size-4" />
                  </div>
                </div>
                <div>
                  {selectedResponse.is_anonymous && selectedResponse.respondent_name === 'Anonim' ? (
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
              <div className="space-y-4 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-slate-200/80 dark:border-gray-800 shadow-2xs">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-gray-800">
                  <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                    <FileText className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Rincian Demografi Responden
                    </h4>
                    <p className="text-xs text-slate-500 font-medium">Informasi latar belakang demografi pengisi survei</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                  {detailDemographics.map((d) => (
                    <div key={d.id} className="flex flex-col justify-between p-3.5 rounded-xl border border-slate-200/70 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/40 space-y-1.5">
                      <span className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
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
            
            {/* Jawaban Penilaian Kualitas */}
            {detailAnswers.length > 0 && (
              <div className="space-y-4 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-slate-200/80 dark:border-gray-800 shadow-2xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-gray-800">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                      <ListTodo className="size-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                        Jawaban Penilaian Unsur Pelayanan
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">Hasil skor nilai rating yang diberikan responden</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-extrabold px-3 py-1 rounded-lg text-xs border-emerald-200 dark:border-emerald-800">
                    {detailAnswers.length} Pertanyaan Evaluasi
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {detailAnswers.map((a, idx) => (
                    <div key={a.id} className="flex flex-col justify-between gap-3 p-4 rounded-xl border border-slate-200/70 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/40 hover:border-emerald-300 transition-colors">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="flex size-5 items-center justify-center rounded bg-emerald-600 text-white text-[10px] font-black">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                            Pertanyaan #{idx + 1}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                          {a.questions?.question_text_id || a.question?.question_text_id || a.question_id}
                        </p>
                      </div>
                      <div className="pt-2 border-t border-slate-200/60 dark:border-gray-700 flex justify-end">
                        {getRatingBadge(a.rating_value)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ulasan / Feedback Pesan & Saran */}
            <div className="space-y-4 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-slate-200/80 dark:border-gray-800 shadow-2xs">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-gray-800">
                <div className="flex size-8 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold">
                  <MessageSquareText className="size-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Catatan Saran &amp; Masukan Responden
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">Kritik dan saran tertulis yang disampaikan oleh responden</p>
                </div>
              </div>

              {selectedResponse.ipkp_feedback || selectedResponse.ipak_feedback ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedResponse.ipkp_feedback && (
                    <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/60 space-y-2">
                      <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200 font-extrabold text-xs">
                        <Star className="size-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Saran Kualitas Pelayanan (IPKP)</span>
                      </div>
                      <p className="text-xs font-medium italic text-slate-800 dark:text-slate-200 leading-relaxed bg-white dark:bg-gray-900 p-3.5 rounded-lg border border-blue-100 dark:border-blue-900/60">
                        &ldquo;{selectedResponse.ipkp_feedback}&rdquo;
                      </p>
                    </div>
                  )}

                  {selectedResponse.ipak_feedback && (
                    <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/60 space-y-2">
                      <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-extrabold text-xs">
                        <Star className="size-3.5 text-amber-600 dark:text-amber-400" />
                        <span>Saran Persepsi Anti Korupsi (IPAK)</span>
                      </div>
                      <p className="text-xs font-medium italic text-slate-800 dark:text-slate-200 leading-relaxed bg-white dark:bg-gray-900 p-3.5 rounded-lg border border-amber-100 dark:border-amber-900/60">
                        &ldquo;{selectedResponse.ipak_feedback}&rdquo;
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 bg-slate-50/50 dark:bg-gray-800/40 rounded-xl border border-slate-200/60 dark:border-gray-800">
                  <p className="text-xs font-medium italic">Responden tidak meninggalkan catatan saran tertulis.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
