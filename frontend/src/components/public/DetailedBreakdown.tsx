
import { useMemo, useState } from 'react'
import { Star, StarHalf } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useI18n } from '@/components/shared/I18nProvider'
import { NILAI_MUTU } from '@/lib/constants'
import type { IndexSummary, IndexByService, UnsurSummary, DemographicSummary } from '@/types'

interface DetailedBreakdownProps {
  indexType: 'IPKP' | 'IPAK'
  serviceFilter: string
  periodTitle?: string
  summary: IndexSummary[]
  byService: IndexByService[]
  unsurSummary: UnsurSummary[]
  demoSummary: DemographicSummary[]
}

const getUnsurRatingLabel = (score: number) => {
  if (score >= 3.53) return 'Sangat Baik'
  if (score >= 3.06) return 'Baik'
  if (score >= 2.60) return 'Kurang Baik'
  return 'Tidak Baik'
}

function StarRatingItem({ score }: { score: number }) {
  const [showClickScore, setShowClickScore] = useState(false)
  const label = getUnsurRatingLabel(score)

  const stars = []
  for (let i = 1; i <= 4; i++) {
    if (score >= i) {
      stars.push(<Star key={i} className="size-3.5 fill-amber-400 text-amber-400 inline-block" />)
    } else if (score >= i - 0.5) {
      stars.push(<StarHalf key={i} className="size-3.5 fill-amber-400 text-amber-400 inline-block" />)
    } else {
      stars.push(<Star key={i} className="size-3.5 text-slate-300 dark:text-slate-600 inline-block" />)
    }
  }

  return (
    <TooltipProvider delay={0}>
      <Tooltip>
        <TooltipTrigger
          onClick={() => setShowClickScore(!showClickScore)}
          className="inline-flex items-center justify-center gap-2.5 px-3 py-1 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/60 transition-all cursor-pointer group select-none"
          title={`Skor: ${score.toFixed(2)} / 4.00 (${label})`}
        >
          <div className="flex items-center gap-1 group-hover:scale-110 transition-transform duration-200">{stars}</div>
          <span className="text-[11px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800/80 px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm group-hover:border-amber-300 transition-colors">
            {showClickScore ? `${score.toFixed(2)} (${label})` : label}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-slate-900 text-white font-extrabold text-xs py-1.5 px-3 rounded-xl shadow-xl">
          Skor: <span className="text-amber-300 text-sm ml-1">{score.toFixed(2)}</span> / 4.00 ({label})
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

const getPendidikanRank = (val: string): number => {
  const v = val.toUpperCase().trim()
  if (v.includes('SD') || v.includes('PRIMARY')) return 1
  if (v.includes('SMP') || v.includes('SLTP') || v.includes('JUNIOR')) return 2
  if (v.includes('SMA') || v.includes('SMK') || v.includes('SLTA') || v.includes('MA') || v.includes('SENIOR')) return 3
  if (v.includes('D1') || v.includes('D2') || v.includes('D3') || v.includes('DIPLOMA')) return 4
  if (v.includes('D4') || v.includes('S1') || v.includes('SARJANA')) return 5
  if (v.includes('S2') || v.includes('MAGISTER') || v.includes('PASCASARJANA')) return 6
  if (v.includes('S3') || v.includes('DOKTOR')) return 7
  return 99
}

export function DetailedBreakdown({ indexType, serviceFilter, periodTitle, summary, byService, unsurSummary, demoSummary }: DetailedBreakdownProps) {
  const { locale } = useI18n()

  // 1. Calculate Score Data
  const scoreData = useMemo(() => {
    let konversi = 0
    let mutu = 'A'
    let nilaiIndex = 0

    if (serviceFilter === 'all') {
      const s = summary.find(s => s.index_type === indexType)
      if (s) {
        konversi = Number(s.nilai_konversi) || Number(s.score) || 0
        nilaiIndex = s.nilai_index !== undefined ? Number(s.nilai_index) : (konversi / 25)
        mutu = s.kategori_mutu || s.mutu || (konversi >= 88.31 ? 'A' : konversi >= 76.61 ? 'B' : konversi >= 65.00 ? 'C' : 'D')
        return { konversi, mutu, nilai_index: nilaiIndex }
      }
    } else {
      const s = byService.find(s => s.index_type === indexType && s.service_name === serviceFilter)
      if (s) {
        konversi = Number(s.nilai_konversi) || Number(s.score) || 0
        nilaiIndex = s.nilai_index !== undefined ? Number(s.nilai_index) : (konversi / 25)
        mutu = s.kategori_mutu || s.mutu || (konversi >= 88.31 ? 'A' : konversi >= 76.61 ? 'B' : konversi >= 65.00 ? 'C' : 'D')
        return { konversi, mutu, nilai_index: nilaiIndex }
      }
    }

    // Fallback: Compute directly from unsurSummary if index_summary/byService is empty
    const filteredUnsur = unsurSummary.filter(u => u.index_type === indexType && (serviceFilter === 'all' || u.service_name === serviceFilter))
    if (filteredUnsur.length > 0) {
      const totalScore = filteredUnsur.reduce((acc, curr) => acc + (Number(curr.nilai_konversi) || Number(curr.nrr_unsur ? curr.nrr_unsur * 25 : 0) || 0), 0)
      konversi = Math.round((totalScore / filteredUnsur.length) * 100) / 100
      nilaiIndex = Math.round((konversi / 25) * 100) / 100
      mutu = konversi >= 88.31 ? 'A' : konversi >= 76.61 ? 'B' : konversi >= 65.00 ? 'C' : 'D'
      return { konversi, mutu, nilai_index: nilaiIndex }
    }

    return null
  }, [indexType, serviceFilter, summary, byService, unsurSummary])

  // 2. Aggregate Unsur Data
  const unsurData = useMemo(() => {
    let filtered = unsurSummary.filter(u => u.index_type === indexType)
    if (serviceFilter !== 'all') {
      filtered = filtered.filter(u => u.service_name === serviceFilter)
    }

    // Group by unsur_id
    const grouped = new Map<string, { unsur_name: string, jumlah_pertanyaan: number, total_nilai: number, jumlah_responden: number }>()
    for (const item of filtered) {
      if (!grouped.has(item.unsur_id)) {
        grouped.set(item.unsur_id, {
          unsur_name: item.unsur_name,
          jumlah_pertanyaan: item.jumlah_pertanyaan || 1,
          total_nilai: 0,
          jumlah_responden: 0
        })
      }
      const g = grouped.get(item.unsur_id)!
      g.total_nilai += Number(item.total_nilai) || 0
      g.jumlah_responden += Number(item.jumlah_responden) || 0
    }

    const result = Array.from(grouped.values()).map(g => {
      const rataRata = g.jumlah_responden > 0 ? g.total_nilai / g.jumlah_responden : 0
      const tertimbang = rataRata / grouped.size // assuming grouped.size is the total unsur count for this index
      return {
        ...g,
        rataRata,
        tertimbang
      }
    })
    
    return result.sort((a, b) => a.unsur_name.localeCompare(b.unsur_name))
  }, [indexType, serviceFilter, unsurSummary])

  // 3. Aggregate Demographic Data
  const demoData = useMemo(() => {
    let filtered = demoSummary
    if (serviceFilter !== 'all') {
      filtered = filtered.filter(d => d.service_name === serviceFilter)
    }

    const grouped = new Map<string, { label: string, options: { value: string, count: number }[] }>()
    for (const item of filtered) {
      if (!grouped.has(item.field_key)) {
        grouped.set(item.field_key, { label: item.field_key, options: [] })
      }
      const g = grouped.get(item.field_key)!
      const opt = g.options.find(o => o.value === item.demographic_value)
      if (opt) {
        opt.count += Number(item.count) || 0
      } else {
        g.options.push({ value: item.demographic_value, count: Number(item.count) || 0 })
      }
    }

    // Sort fields according to common order (Jenis Kelamin, Pendidikan, Pekerjaan, Usia)
    const fieldOrder = ['jenis_kelamin', 'pendidikan', 'pekerjaan', 'usia']
    const result = Array.from(grouped.values()).sort((a, b) => {
      return fieldOrder.indexOf(a.label.toLowerCase()) - fieldOrder.indexOf(b.label.toLowerCase())
    })

    result.forEach((group) => {
      if (group.label.toLowerCase() === 'pendidikan') {
        group.options.sort((a, b) => getPendidikanRank(a.value) - getPendidikanRank(b.value))
      }
    })

    return result
  }, [serviceFilter, demoSummary])

  if (!scoreData) return <div className="p-8 text-center text-gray-500">Belum ada data survei untuk filter ini.</div>

  const totalRespondents = unsurData.length > 0 ? unsurData[0].jumlah_responden : 0

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Table 1: Rincian Nilai Per Unsur */}
      <Card className="border border-slate-200/80 dark:border-gray-800 shadow-xl shadow-slate-200/40 dark:shadow-black/20 bg-white dark:bg-gray-900 rounded-3xl overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Rekapitulasi Nilai Per Unsur</span>
            </CardTitle>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Tabel rincian kalkulasi indikator {indexType === 'IPKP' ? 'IPKP (9 Unsur)' : 'IPAK (5 Unsur)'}
            </p>
          </div>
          {periodTitle && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200/80 shadow-xs shrink-0 self-start sm:self-auto">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              Periode: {periodTitle}
            </span>
          )}
        </CardHeader>
        <div className="overflow-x-auto w-full">
          <Table className="min-w-[640px] sm:min-w-full">
            <TableHeader className="bg-slate-50/80 dark:bg-gray-800/60 text-[11px] sm:text-xs">
              <TableRow>
                <TableHead className="w-12 text-center font-extrabold text-slate-700 dark:text-slate-300">No</TableHead>
                <TableHead className="min-w-[180px] font-extrabold text-slate-700 dark:text-slate-300">Unsur Pelayanan</TableHead>
                <TableHead className="text-center font-extrabold text-slate-700 dark:text-slate-300 whitespace-nowrap">Jml Soal</TableHead>
                <TableHead className="text-center font-extrabold text-slate-700 dark:text-slate-300 whitespace-nowrap">Total Nilai</TableHead>
                <TableHead className="text-center font-extrabold text-slate-700 dark:text-slate-300 whitespace-nowrap border-x border-slate-100 dark:border-gray-800">Rata-Rata</TableHead>
                <TableHead className="text-center font-extrabold text-slate-700 dark:text-slate-300 whitespace-nowrap border-x border-slate-100 dark:border-gray-800 min-w-[200px] px-4">Rating Bintang</TableHead>
                <TableHead className="text-center font-extrabold text-slate-700 dark:text-slate-300 whitespace-nowrap border-x border-slate-100 dark:border-gray-800">Rata-Rata Tertimbang</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unsurData.map((u, i) => (
                <TableRow key={i} className="hover:bg-slate-50/80 dark:hover:bg-gray-800/50 transition-colors text-xs">
                  <TableCell className="text-center font-bold text-slate-400 py-2.5 sm:py-3">{i + 1}</TableCell>
                  <TableCell className="font-bold text-slate-800 dark:text-slate-200 py-2.5 sm:py-3">{u.unsur_name}</TableCell>
                  <TableCell className="text-center font-bold text-slate-700 dark:text-slate-300 py-2.5 sm:py-3">{u.jumlah_pertanyaan}</TableCell>
                  <TableCell className="text-center font-bold text-slate-700 dark:text-slate-300 py-2.5 sm:py-3">{u.total_nilai}</TableCell>
                  <TableCell className="text-center font-bold text-slate-700 dark:text-slate-300 py-2.5 sm:py-3">{u.rataRata.toFixed(2)}</TableCell>
                  <TableCell className="text-center py-2.5 sm:py-3"><StarRatingItem score={u.rataRata} /></TableCell>
                  <TableCell className="text-center font-bold text-emerald-700 dark:text-emerald-400 py-2.5 sm:py-3">{u.tertimbang.toFixed(2)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-slate-50/90 dark:bg-gray-800/70 font-extrabold text-xs border-t-2 border-slate-200 dark:border-gray-700">
                <TableCell colSpan={6} className="text-right text-slate-700 dark:text-slate-300 py-2.5 sm:py-3">
                  Indeks Survei ({indexType})
                </TableCell>
                <TableCell className="text-center text-emerald-700 dark:text-emerald-400 py-2.5 sm:py-3 whitespace-nowrap">
                  {scoreData.nilai_index.toFixed(2)} ({locale === 'id' ? NILAI_MUTU[scoreData.mutu]?.label_id : NILAI_MUTU[scoreData.mutu]?.label_en})
                </TableCell>
              </TableRow>
              <TableRow className="bg-slate-50/90 dark:bg-gray-800/70 font-extrabold text-xs">
                <TableCell colSpan={6} className="text-right text-slate-700 dark:text-slate-300 py-2.5 sm:py-3">
                  Nilai Konversi
                </TableCell>
                <TableCell className="text-center text-emerald-700 dark:text-emerald-400 py-2.5 sm:py-3 whitespace-nowrap">
                  {scoreData.konversi.toFixed(2)}
                </TableCell>
              </TableRow>
              <TableRow className="bg-slate-50/90 dark:bg-gray-800/70 font-extrabold text-xs">
                <TableCell colSpan={6} className="text-right text-slate-700 dark:text-slate-300 py-2.5 sm:py-3">
                  Mutu Pelayanan
                </TableCell>
                <TableCell className="text-center text-emerald-700 dark:text-emerald-400 py-2.5 sm:py-3 whitespace-nowrap">
                  {scoreData.mutu} ({locale === 'id' ? NILAI_MUTU[scoreData.mutu]?.label_id : NILAI_MUTU[scoreData.mutu]?.label_en})
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Unified Score and Demographics Card */}
      <Card className="border border-slate-200/80 dark:border-gray-800 shadow-xl shadow-slate-200/40 dark:shadow-black/20 bg-white dark:bg-gray-900 rounded-3xl overflow-hidden">
        <div className="text-center py-6 px-4 bg-slate-50/50 dark:bg-gray-800/40 border-b border-slate-100 dark:border-gray-800 flex flex-col items-center">
          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white uppercase leading-relaxed">
            Survei {indexType === 'IPKP' ? 'Indeks Persepsi Kualitas Pelayanan (IPKP)' : 'Indeks Persepsi Anti Korupsi (IPAK)'}<br/>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-extrabold">KANTOR KEMENTERIAN AGAMA KABUPATEN BARITO UTARA</span>
          </h2>
          {periodTitle && (
            <div className="mt-2.5 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-black text-xs tracking-wide shadow-xs">
              <span className="size-2 rounded-full bg-emerald-600 animate-pulse" />
              <span>PERIODE: {periodTitle.toUpperCase()}</span>
            </div>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row w-full bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white font-extrabold text-xs sm:text-sm">
          <div className="w-full sm:w-1/2 text-center py-3 px-4 border-b sm:border-b-0 sm:border-r border-white/20 uppercase tracking-wide">
            Nilai Survei {indexType === 'IPKP' ? 'Indeks Persepsi Kualitas Pelayanan (IPKP)' : 'Indeks Persepsi Anti Korupsi (IPAK)'} {periodTitle ? `(${periodTitle})` : ''}
          </div>
          <div className="w-full sm:w-1/2 text-center py-3 px-4 uppercase tracking-wide">
            {serviceFilter === 'all' ? 'Semua Pelayanan' : serviceFilter}
          </div>
        </div>

        <div className="flex flex-col md:flex-row">
          <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-100 dark:border-gray-800">
            <h3 className="text-6xl md:text-7xl font-black text-slate-900 dark:text-white mb-4 tracking-tighter leading-none">{scoreData.konversi.toFixed(2)}</h3>
            <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm sm:text-base font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
              {scoreData.mutu} ({locale === 'id' ? NILAI_MUTU[scoreData.mutu]?.label_id : NILAI_MUTU[scoreData.mutu]?.label_en})
            </span>
          </div>
          <div className="w-full md:w-1/2 bg-slate-50/50 dark:bg-gray-800/20">
            <Table>
              <TableBody>
                <TableRow className="bg-slate-100/60 dark:bg-gray-800/50">
                  <TableCell className="font-extrabold w-1/3 text-slate-800 dark:text-slate-200 text-xs">Responden</TableCell>
                  <TableCell></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-xs font-bold text-slate-600 dark:text-slate-400">Jumlah Responden</TableCell>
                  <TableCell className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">{totalRespondents} Orang</TableCell>
                </TableRow>
                {demoData.filter(d => ['jenis_kelamin', 'pendidikan'].includes(d.label.toLowerCase())).map((d, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-xs font-bold text-slate-600 dark:text-slate-400 capitalize">
                      {d.label.replace(/_/g, ' ')}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {d.options.map((opt) => (
                        <div key={opt.value} className="mb-1 last:mb-0">
                          {opt.value} : <span className="font-bold text-emerald-600 dark:text-emerald-400">{opt.count} Orang</span>
                        </div>
                      ))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="border-t border-slate-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/20 overflow-x-auto">
          <Table>
            <TableBody>
              {demoData.filter(d => ['pekerjaan', 'usia'].includes(d.label.toLowerCase())).map((d, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-extrabold text-slate-800 dark:text-slate-200 bg-slate-100/80 dark:bg-gray-800/60 w-[150px] capitalize text-xs">
                    {d.label.replace(/_/g, ' ')}
                  </TableCell>
                  {d.options.map(opt => (
                    <TableCell key={opt.value} className="text-center align-top min-w-[120px]">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">{opt.value}</div>
                      <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{opt.count} Orang</div>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
