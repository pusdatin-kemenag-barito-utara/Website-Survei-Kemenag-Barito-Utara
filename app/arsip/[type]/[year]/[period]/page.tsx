'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, PieChart, Pie, Cell, LabelList, AreaChart, Area,
} from 'recharts'
import { FileSpreadsheet, FileText, Filter, Users, GraduationCap, UserCheck, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useI18n } from '@/components/shared/I18nProvider'
import { PublicNavbar } from '@/components/shared/PublicNavbar'
import { Footer } from '@/components/shared/Footer'
import { DetailedBreakdown } from '@/components/shared/DetailedBreakdown'
import { createClient } from '@/lib/supabase/client'
import { exportToExcel, exportToPdf } from '@/lib/export'
import type { IndexSummary, IndexByService, IndexTrend, UnsurSummary, DemographicSummary } from '@/types'
import { toast } from 'sonner'

export default function ArsipPage() {
  const params = useParams()
  const type = (params?.type as string) || 'ipkp'
  const yearStr = (params?.year as string) || new Date().getFullYear().toString()
  const period = (params?.period as string) || 'tahunan'
  
  const indexType = type.toUpperCase() === 'IPAK' ? 'IPAK' : 'IPKP'
  
  const { t, locale } = useI18n()
  const isEn = locale === 'en'

  let periodName = ''
  switch (period) {
    case 'q1': periodName = isEn ? 'Quarter 1' : 'Triwulan I'; break;
    case 'q2': periodName = isEn ? 'Quarter 2' : 'Triwulan II'; break;
    case 'q3': periodName = isEn ? 'Quarter 3' : 'Triwulan III'; break;
    case 'q4': periodName = isEn ? 'Quarter 4' : 'Triwulan IV'; break;
    case 'sem1':
    case 's1':
      periodName = isEn ? 'Semester 1' : 'Semester I'; break;
    case 'sem2':
    case 's2':
      periodName = isEn ? 'Semester 2' : 'Semester II'; break;
    case 'tahunan': periodName = isEn ? 'Annual' : 'Tahunan'; break;
  }
  
  const pageTitle = `${indexType === 'IPAK' ? 'Indeks Persepsi Anti Korupsi (IPAK)' : 'Indeks Persepsi Kualitas Pelayanan (IPKP)'}`
  const tableTitle = `${indexType === 'IPAK' ? 'Indeks Persepsi Anti Korupsi (IPAK)' : 'Indeks Persepsi Kualitas Pelayanan (IPKP)'}`
  const [summary, setSummary] = useState<IndexSummary[]>([])
  const [byService, setByService] = useState<IndexByService[]>([])
  const [trend, setTrend] = useState<IndexTrend[]>([])
  const [unsurSummary, setUnsurSummary] = useState<UnsurSummary[]>([])
  const [demoSummary, setDemoSummary] = useState<DemographicSummary[]>([])
  const [allServices, setAllServices] = useState<{ id: string, name: string }[]>([])
  const [totalResponses, setTotalResponses] = useState(0)
  const [loading, setLoading] = useState(true)
  const [serviceFilter, setServiceFilter] = useState('all')

  const getDates = (y: string, p: string) => {
    let startDate = `${y}-01-01`
    let endDate = `${y}-12-31`
    
    if (p === 'q1') {
      startDate = `${y}-01-01`
      endDate = `${y}-03-31`
    } else if (p === 'q2') {
      startDate = `${y}-04-01`
      endDate = `${y}-06-30`
    } else if (p === 'q3') {
      startDate = `${y}-07-01`
      endDate = `${y}-09-30`
    } else if (p === 'q4') {
      startDate = `${y}-10-01`
      endDate = `${y}-12-31`
    } else if (p === 'sem1' || p === 's1') {
      // Semester I: Triwulan I + Triwulan II (1 Januari - 30 Juni)
      startDate = `${y}-01-01`
      endDate = `${y}-06-30`
    } else if (p === 'sem2' || p === 's2') {
      // Semester II: Triwulan III + Triwulan IV (1 Juli - 31 Desember)
      startDate = `${y}-07-01`
      endDate = `${y}-12-31`
    }
    
    return {
      start: `${startDate}T00:00:00`,
      end: `${endDate}T23:59:59`,
      rawStart: startDate,
      rawEnd: endDate
    }
  }

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      const dates = getDates(yearStr, period)

      const [summaryRes, byServiceRes, trendRes, countRes, unsurRes, demoRes, servicesRes] = await Promise.all([
        supabase.rpc('fn_index_summary', { p_start_date: dates.start, p_end_date: dates.end }),
        supabase.rpc('fn_index_summary_by_service', { p_start_date: dates.start, p_end_date: dates.end }),
        supabase.rpc('fn_index_trend', { p_start_date: dates.start, p_end_date: dates.end }),
        supabase.rpc('get_response_count', { p_start_date: dates.start, p_end_date: dates.end }),
        supabase.rpc('fn_unsur_summary', { p_start_date: dates.start, p_end_date: dates.end }),
        supabase.rpc('fn_demographic_summary', { p_start_date: dates.start, p_end_date: dates.end }),
        supabase.from('services').select('*').eq('is_active', true).order('name', { ascending: true }),
      ])

      let summaryData = (summaryRes.data || []) as IndexSummary[]
      let byServiceData = (byServiceRes.data || []) as IndexByService[]
      const trendData = (trendRes.data || []) as IndexTrend[]
      let unsurData = (unsurRes.data || []) as UnsurSummary[]
      const demoData = (demoRes.data || []) as DemographicSummary[]
      let responseCount = typeof countRes.data === 'number' ? countRes.data : 0

      console.log('Archive RPC Result:', {
        byServiceLen: byServiceData.length,
        byServiceResErr: byServiceRes.error,
        byServiceData,
        countRes: countRes.data,
        dates
      })

      // If stored procedure RPC byService returns empty or 0 respondents, force client calculation from raw responses
      const hasValidByService = byServiceData.length > 0 && byServiceData.some(b => (b.jumlah_responden || 0) > 0)

      if (!hasValidByService) {
        const { data: respData } = await supabase
          .from('responses')
          .select(`
            id,
            service_id,
            submitted_at,
            services (id, name),
            response_answers (
              rating_value,
              unsur (id, index_type, name, is_active)
            )
          `)
          .gte('submitted_at', dates.start)
          .lte('submitted_at', dates.end)

        if (respData && respData.length > 0) {
          responseCount = respData.length

          // Group by service and index_type
          const serviceMap = new Map<string, {
            service_id: string,
            service_name: string,
            index_type: 'IPKP' | 'IPAK',
            ratings: { [unsur_id: string]: number[] }
          }>()

          type ResponseItem = {
            id: string
            service_id: string
            services: { id: string; name: string } | null
            response_answers: Array<{
              rating_value: number
              unsur: { id: string; index_type: string; name: string; is_active: boolean } | null
            }>
          }

          ;(respData as unknown as ResponseItem[]).forEach((r) => {
            const sName = r.services?.name || 'Unknown'
            const sId = r.service_id
            
            r.response_answers?.forEach((ans) => {
              if (ans.unsur && ans.unsur.is_active) {
                const iType = ans.unsur.index_type as 'IPKP' | 'IPAK'
                const key = `${sId}_${iType}`
                
                if (!serviceMap.has(key)) {
                  serviceMap.set(key, {
                    service_id: sId,
                    service_name: sName,
                    index_type: iType,
                    ratings: {}
                  })
                }

                const entry = serviceMap.get(key)!
                if (!entry.ratings[ans.unsur.id]) {
                  entry.ratings[ans.unsur.id] = []
                }
                entry.ratings[ans.unsur.id].push(Number(ans.rating_value) || 0)
              }
            })
          })

          const calculatedByService: IndexByService[] = []
          serviceMap.forEach((val) => {
            const unsurIds = Object.keys(val.ratings)
            const totalUnsurCount = val.index_type === 'IPKP' ? 9 : 5
            
            let sumWeighted = 0
            let totalRespondenForIndex = 0

            unsurIds.forEach((uId) => {
              const arr = val.ratings[uId]
              totalRespondenForIndex = Math.max(totalRespondenForIndex, arr.length)
              const avg = arr.reduce((a, b) => a + b, 0) / arr.length
              sumWeighted += (avg / totalUnsurCount)
            })

            const nilaiIndex = Number(sumWeighted.toFixed(4))
            const nilaiKonversi = Number((sumWeighted * 25).toFixed(2))

            let mutu: 'A' | 'B' | 'C' | 'D' = 'D'
            if (nilaiKonversi >= 88.31) mutu = 'A'
            else if (nilaiKonversi >= 76.61) mutu = 'B'
            else if (nilaiKonversi >= 65.00) mutu = 'C'

            calculatedByService.push({
              service_id: val.service_id,
              service_name: val.service_name,
              index_type: val.index_type,
              nilai_index: nilaiIndex,
              nilai_konversi: nilaiKonversi,
              mutu,
              jumlah_responden: totalRespondenForIndex
            })
          })

          byServiceData = calculatedByService

          // 1. Calculate Unsur Summary for Breakdown
          const unsurMap = new Map<string, {
            unsur_id: string
            unsur_name: string
            index_type: 'IPKP' | 'IPAK'
            service_name: string
            jumlah_pertanyaan: number
            total_nilai: number
            jumlah_responden: number
          }>()

          ;(respData as unknown as Array<{
            service_id: string
            services: { name: string } | null
            response_answers: Array<{
              rating_value: number
              unsur: { id: string; index_type: string; name: string; is_active: boolean } | null
            }>
            respondents?: {
              jenis_kelamin?: string
              pendidikan?: string
              pekerjaan?: string
              usia?: number
            }
          }>).forEach((r) => {
            const sName = r.services?.name || 'Unknown'

            r.response_answers?.forEach((ans) => {
              if (ans.unsur && ans.unsur.is_active) {
                const uId = ans.unsur.id
                const uName = ans.unsur.name
                const iType = ans.unsur.index_type as 'IPKP' | 'IPAK'
                const key = `${sName}_${uId}`

                if (!unsurMap.has(key)) {
                  unsurMap.set(key, {
                    unsur_id: uId,
                    unsur_name: uName,
                    index_type: iType,
                    service_name: sName,
                    jumlah_pertanyaan: 1,
                    total_nilai: 0,
                    jumlah_responden: 0
                  })
                }
                const uEntry = unsurMap.get(key)!
                uEntry.total_nilai += Number(ans.rating_value) || 0
                uEntry.jumlah_responden += 1
              }
            })
          })

          unsurData = Array.from(unsurMap.values()).map((u) => {
            const avg = u.jumlah_responden > 0 ? Number((u.total_nilai / u.jumlah_responden).toFixed(2)) : 0
            const totalUnsur = u.index_type === 'IPKP' ? 9 : 5
            return {
              service_id: '',
              service_name: u.service_name,
              unsur_id: u.unsur_id,
              unsur_name: u.unsur_name,
              index_type: u.index_type,
              jumlah_pertanyaan: u.jumlah_pertanyaan,
              total_nilai: u.total_nilai,
              jumlah_responden: u.jumlah_responden,
              nilai_rata_rata_unsur: avg,
              nilai_rata_rata_tertimbang: Number((avg / totalUnsur).toFixed(4))
            }
          })

          // Summary per Index (IPKP & IPAK overall)
          const types: ('IPKP' | 'IPAK')[] = ['IPKP', 'IPAK']
          summaryData = types.map((iType) => {
            const items = calculatedByService.filter(b => b.index_type === iType)
            if (items.length === 0) {
              return {
                index_type: iType,
                nilai_index: 0,
                nilai_konversi: 0,
                mutu: 'D' as const,
                total_responden: 0,
                kinerja: 'Sangat Baik',
                calculated_at: new Date().toISOString()
              }
            }
            const avgKonversi = items.reduce((acc, curr) => acc + curr.nilai_konversi, 0) / items.length
            const avgIndex = avgKonversi / 25
            let mutu: 'A' | 'B' | 'C' | 'D' = 'D'
            if (avgKonversi >= 88.31) mutu = 'A'
            else if (avgKonversi >= 76.61) mutu = 'B'
            else if (avgKonversi >= 65.00) mutu = 'C'
            
            return {
              index_type: iType,
              nilai_index: Number(avgIndex.toFixed(4)),
              nilai_konversi: Number(avgKonversi.toFixed(2)),
              mutu,
              total_responden: responseCount,
              kinerja: 'Sangat Baik',
              calculated_at: new Date().toISOString()
            }
          })
        }
      }

      setSummary(summaryData)
      setByService(byServiceData)
      setTrend(trendData)
      setUnsurSummary(unsurData)
      setDemoSummary(demoData)
      if (servicesRes.data) setAllServices(servicesRes.data)
      setTotalResponses(responseCount)

      setLoading(false)
    }
    fetchData()
  }, [yearStr, period])

  const uniqueServices = Array.from(new Set(byService.map((s) => s.service_name))).sort()

  const parseBarData = () => {
    const ipkpByService = byService.filter((b) => b.index_type === 'IPKP')
    const ipakByService = byService.filter((b) => b.index_type === 'IPAK')
    
    let allNames = [...new Set([...ipkpByService.map((b) => b.service_name), ...ipakByService.map((b) => b.service_name)])]
    
    if (serviceFilter !== 'all') {
      allNames = allNames.filter((name) => name === serviceFilter)
    }

    return allNames.map((name) => {
      const ipkpEntry = ipkpByService.find((b) => b.service_name === name)
      const ipakEntry = ipakByService.find((b) => b.service_name === name)
      return {
        name,
        IPKP: ipkpEntry?.nilai_konversi || 0,
        IPAK: ipakEntry?.nilai_konversi || 0,
      }
    })
  }

  const parseDemoFieldData = (fieldKey: string) => {
    let filtered = demoSummary.filter((d) => d.field_key.toLowerCase() === fieldKey.toLowerCase())
    if (serviceFilter !== 'all') {
      filtered = filtered.filter((d) => d.service_name === serviceFilter)
    }

    const map = new Map<string, number>()
    for (const item of filtered) {
      const val = item.demographic_value || 'Lainnya'
      map.set(val, (map.get(val) || 0) + Number(item.count || 0))
    }

    if (map.size === 0) {
      if (fieldKey === 'jenis_kelamin') {
        return [
          { name: 'Laki-laki', value: totalResponses > 0 ? totalResponses : 0 },
          { name: 'Perempuan', value: 0 },
        ]
      }
      return []
    }

    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }

  const getMutuDescription = (mutu: string) => {
    if (!mutu || mutu === '-') return 'Belum Terisi Survey'
    switch (mutu) {
      case 'A': return 'Sangat Baik'
      case 'B': return 'Baik'
      case 'C': return 'Kurang Baik'
      case 'D': return 'Tidak Baik'
      default: return 'Belum Terisi Survey'
    }
  }

  async function handleExportExcel() {
    try {
      const fullPeriodLabel = `${periodName} Tahun ${yearStr}`
      await exportToExcel(summary, byService, totalResponses, fullPeriodLabel, demoSummary)
      toast.success('Berhasil mengekspor ke Excel')
    } catch {
      toast.error('Gagal mengekspor Excel')
    }
  }

  async function handleExportPdf() {
    try {
      const fullPeriodLabel = `${periodName} Tahun ${yearStr}`
      await exportToPdf(summary, byService, totalResponses, fullPeriodLabel, demoSummary)
      toast.success('Berhasil mengekspor ke PDF')
    } catch {
      toast.error('Gagal mengekspor PDF')
    }
  }

  return (
    <>
      <PublicNavbar />
      <main className="flex-1 bg-gray-50/50">
        <div className="mx-auto w-full px-6 sm:px-10 lg:px-16 xl:px-20 pt-8 pb-16">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                {isEn ? `Archive: ${pageTitle}` : `Arsip ${pageTitle}`}
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-0.5 text-sm font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                  {periodName} {yearStr}
                </span>
                <p className="text-sm text-gray-500">{t('home.total_responses')}: <span className="font-semibold text-emerald-600">{totalResponses.toLocaleString()} {isEn ? 'Respondents' : 'Responden'}</span></p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              {/* Filter Layanan */}
              <div className="flex items-center w-full sm:w-[350px]">
                <div className="bg-emerald-50 border border-emerald-100 rounded-l-md px-3 py-2 flex items-center justify-center border-r-0 h-10">
                  <Filter className="size-4 text-emerald-600" />
                </div>
                <Select value={serviceFilter} onValueChange={(v) => v !== null && setServiceFilter(v)}>
                  <SelectTrigger className="w-full bg-white border-gray-200 rounded-l-none h-10">
                    <SelectValue placeholder={t('results.filter_service')}>
                      {serviceFilter === 'all' ? t('results.all_services') : serviceFilter}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('results.all_services')}</SelectItem>
                    {uniqueServices.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button variant="outline" size="sm" onClick={handleExportExcel} className="h-10 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 flex-1 sm:flex-auto">
                  <FileSpreadsheet className="mr-2 size-4" />
                  {t('results.export_excel')}
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportPdf} className="h-10 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 flex-1 sm:flex-auto">
                  <FileText className="mr-2 size-4" />
                  {t('results.export_pdf')}
                </Button>
              </div>
            </div>
          </div>

          <Card className="mb-12 shadow-lg border-0 bg-white overflow-hidden">
            <CardHeader className="border-b bg-gray-50/50 py-4">
              <CardTitle className="text-center text-base md:text-lg text-gray-800 font-medium uppercase leading-snug">
                Rekapitulasi Data Survei {tableTitle} Per Layanan<br/>
                KANTOR KEMENTERIAN AGAMA KABUPATEN BARITO UTARA {periodName.toUpperCase()} {yearStr}
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="w-[60px] font-bold text-gray-900 text-center">NO</TableHead>
                    <TableHead className="font-bold text-gray-900">Nama Layanan</TableHead>
                    <TableHead className="text-center font-bold text-gray-900 whitespace-nowrap">Nilai Indeks Pelayanan</TableHead>
                    <TableHead className="text-center font-bold text-gray-900">Konversi</TableHead>
                    <TableHead className="text-center font-bold text-gray-900 whitespace-nowrap">Mutu Pelayanan</TableHead>
                    <TableHead className="text-center font-bold text-gray-900 whitespace-nowrap">Jumlah Responden</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                        Memuat data...
                      </TableCell>
                    </TableRow>
                  ) : allServices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                        Belum ada layanan aktif
                      </TableCell>
                    </TableRow>
                  ) : (
                    allServices
                      .map((service, i) => {
                        const item = byService.find(b => (b.service_id === service.id || b.service_name === service.name) && b.index_type === indexType)
                        const hasData = item && item.jumlah_responden > 0
                        return (
                          <TableRow key={service.id} className="hover:bg-gray-50/50">
                            <TableCell className="text-center">{i + 1}</TableCell>
                            <TableCell className="font-medium text-gray-700 min-w-[250px]">
                              {service.name}
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {hasData ? `${item.nilai_index.toFixed(2)} (${getMutuDescription(item.mutu)})` : '0.00 (Belum Terisi Survey)'}
                            </TableCell>
                            <TableCell className="text-center">
                              {hasData ? item.nilai_konversi.toFixed(2) : '0.00'}
                            </TableCell>
                            <TableCell className="text-center font-bold">
                              {hasData ? `${item.mutu} (${getMutuDescription(item.mutu)})` : 'Belum Terisi Survey'}
                            </TableCell>
                            <TableCell className="text-center">
                              {item ? item.jumlah_responden : 0} {item && item.jumlah_responden > 0 ? 'Orang' : ''}
                            </TableCell>
                          </TableRow>
                        )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          <div className="mb-12 space-y-12">
            <DetailedBreakdown 
              indexType={indexType} 
              serviceFilter={serviceFilter} 
              summary={summary} 
              byService={byService} 
              unsurSummary={unsurSummary} 
              demoSummary={demoSummary} 
            />
          </div>

          {/* TOP: 4 Demographic Charts (Jenis Kelamin, Pendidikan, Usia, Pekerjaan) */}
          <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 1. Jenis Kelamin */}
            <Card className="border border-slate-200/80 dark:border-gray-800 shadow-xl shadow-slate-200/40 dark:shadow-black/20 bg-white dark:bg-gray-900 rounded-3xl overflow-hidden flex flex-col">
              <CardHeader className="border-b border-slate-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/40 p-4">
                <CardTitle className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white flex items-center justify-center gap-2">
                  <Users className="size-4 text-cyan-500" />
                  <span>Jenis Kelamin <span className="text-slate-400 font-normal">Responden</span></span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 flex-1 flex flex-col items-center justify-center">
                {loading ? (
                  <div className="h-48 animate-pulse rounded-2xl bg-slate-100 dark:bg-gray-800 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={parseDemoFieldData('jenis_kelamin')}
                        cx="50%"
                        cy="45%"
                        innerRadius={40}
                        outerRadius={68}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                        labelLine={true}
                      >
                        {parseDemoFieldData('jenis_kelamin').map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#06b6d4', '#ec4899', '#f59e0b', '#10b981'][index % 4]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '14px', fontWeight: 600, fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* 2. Pendidikan */}
            <Card className="border border-slate-200/80 dark:border-gray-800 shadow-xl shadow-slate-200/40 dark:shadow-black/20 bg-white dark:bg-gray-900 rounded-3xl overflow-hidden flex flex-col">
              <CardHeader className="border-b border-slate-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/40 p-4">
                <CardTitle className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white flex items-center justify-center gap-2">
                  <GraduationCap className="size-4 text-amber-500" />
                  <span>Pendidikan <span className="text-slate-400 font-normal">Responden</span></span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 flex-1 flex flex-col items-center justify-center">
                {loading ? (
                  <div className="h-48 animate-pulse rounded-2xl bg-slate-100 dark:bg-gray-800 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={parseDemoFieldData('pendidikan')} margin={{ top: 20, right: 4, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700 }} interval={0} angle={-35} textAnchor="end" height={55} />
                      <YAxis tick={{ fontSize: 10, fontWeight: 600 }} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: '14px', fontWeight: 600, fontSize: '11px' }} />
                      <Bar dataKey="value" name="Jumlah" radius={[6, 6, 0, 0]}>
                        {parseDemoFieldData('pendidikan').map((_, index) => (
                          <Cell key={`cell-${index}`} fill={['#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444', '#64748b'][index % 8]} />
                        ))}
                        <LabelList dataKey="value" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#475569' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* 3. Usia */}
            <Card className="border border-slate-200/80 dark:border-gray-800 shadow-xl shadow-slate-200/40 dark:shadow-black/20 bg-white dark:bg-gray-900 rounded-3xl overflow-hidden flex flex-col">
              <CardHeader className="border-b border-slate-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/40 p-4">
                <CardTitle className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white flex items-center justify-center gap-2">
                  <UserCheck className="size-4 text-rose-500" />
                  <span>Usia <span className="text-slate-400 font-normal">Responden</span></span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 flex-1 flex flex-col items-center justify-center">
                {loading ? (
                  <div className="h-48 animate-pulse rounded-2xl bg-slate-100 dark:bg-gray-800 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={parseDemoFieldData('usia')} margin={{ top: 20, right: 4, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700 }} interval={0} angle={-35} textAnchor="end" height={55} />
                      <YAxis tick={{ fontSize: 10, fontWeight: 600 }} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: '14px', fontWeight: 600, fontSize: '11px' }} />
                      <Bar dataKey="value" name="Jumlah" radius={[6, 6, 0, 0]}>
                        {parseDemoFieldData('usia').map((_, index) => (
                          <Cell key={`cell-${index}`} fill={['#f43f5e', '#ec4899', '#f59e0b', '#eab308', '#84cc16'][index % 5]} />
                        ))}
                        <LabelList dataKey="value" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#475569' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* 4. Pekerjaan */}
            <Card className="border border-slate-200/80 dark:border-gray-800 shadow-xl shadow-slate-200/40 dark:shadow-black/20 bg-white dark:bg-gray-900 rounded-3xl overflow-hidden flex flex-col">
              <CardHeader className="border-b border-slate-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/40 p-4">
                <CardTitle className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white flex items-center justify-center gap-2">
                  <Briefcase className="size-4 text-teal-500" />
                  <span>Pekerjaan <span className="text-slate-400 font-normal">Responden</span></span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 flex-1 flex flex-col items-center justify-center">
                {loading ? (
                  <div className="h-48 animate-pulse rounded-2xl bg-slate-100 dark:bg-gray-800 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={parseDemoFieldData('pekerjaan')} margin={{ top: 20, right: 4, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700 }} interval={0} angle={-35} textAnchor="end" height={55} />
                      <YAxis tick={{ fontSize: 10, fontWeight: 600 }} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: '14px', fontWeight: 600, fontSize: '11px' }} />
                      <Bar dataKey="value" name="Jumlah" radius={[6, 6, 0, 0]}>
                        {parseDemoFieldData('pekerjaan').map((_, index) => (
                          <Cell key={`cell-${index}`} fill={['#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6'][index % 6]} />
                        ))}
                        <LabelList dataKey="value" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#475569' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* BOTTOM: 1 Baris dengan 2 Chart (Rincian Nilai Konversi Per Unsur & Tren Nilai) */}
          <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border border-slate-200/80 dark:border-gray-800 shadow-xl shadow-slate-200/40 dark:shadow-black/20 bg-white dark:bg-gray-900 rounded-3xl overflow-hidden">
              <CardHeader className="border-b border-slate-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/40 p-5">
                <CardTitle className="text-sm font-extrabold text-slate-900 dark:text-white">{t('results.breakdown')}</CardTitle>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Rincian perbandingan nilai konversi per layanan</p>
              </CardHeader>
              <CardContent className="p-5">
                {loading ? (
                  <div className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-gray-800" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={parseBarData()} margin={{ top: 12, right: 10, left: -10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis 
                        dataKey="name" 
                        tick={({ x, y, payload }) => {
                          const val = String(payload.value || '')
                          const truncated = val.length > 18 ? val.slice(0, 16) + '...' : val
                          return (
                            <g transform={`translate(${x},${y})`}>
                              <text x={0} y={0} dy={12} dx={-4} textAnchor="end" fill="#64748b" fontSize={9} fontWeight={600} transform="rotate(-40)">
                                {truncated}
                              </text>
                            </g>
                          )
                        }}
                        interval={0} 
                        height={85} 
                      />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fontWeight: 600 }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', fontWeight: 600, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} 
                        formatter={(value) => [typeof value === 'number' ? value.toFixed(2) : String(value ?? ''), 'Nilai Konversi']}
                      />
                      <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', fontWeight: 700 }} />
                      <Bar dataKey="IPKP" name="Indeks IPKP" fill="#10b981" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="IPAK" name="Indeks IPAK" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border border-slate-200/80 dark:border-gray-800 shadow-xl shadow-slate-200/40 dark:shadow-black/20 bg-white dark:bg-gray-900 rounded-3xl overflow-hidden">
              <CardHeader className="border-b border-slate-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/40 p-5">
                <CardTitle className="text-sm font-extrabold text-slate-900 dark:text-white">{t('results.trend')}</CardTitle>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Tren {periodName} {yearStr}</p>
              </CardHeader>
              <CardContent className="p-5">
                {loading ? (
                  <div className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-gray-800" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={trend} margin={{ top: 12, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorTrendArsip" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis 
                        dataKey="bulan" 
                        tick={({ x, y, payload }) => {
                          const raw = String(payload.value || '')
                          let formatted = raw
                          if (raw.includes('-') || raw.includes('T')) {
                            const d = new Date(raw)
                            if (!isNaN(d.getTime())) {
                              formatted = d.toLocaleDateString(locale === 'en' ? 'en-US' : 'id-ID', { month: 'short', year: 'numeric' })
                            }
                          }
                          return (
                            <g transform={`translate(${x},${y})`}>
                              <text x={0} y={0} dy={12} textAnchor="middle" fill="#64748b" fontSize={10} fontWeight={700}>
                                {formatted}
                              </text>
                            </g>
                          )
                        }}
                        tickLine={false}
                      />
                      <YAxis domain={['auto', 100]} tick={{ fontSize: 10, fontWeight: 600 }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', fontWeight: 600, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                        formatter={(val: unknown) => [typeof val === 'number' ? val.toFixed(2) : String(val ?? ''), 'Nilai Konversi']}
                        labelFormatter={(labelStr: unknown) => {
                          const raw = String(labelStr || '')
                          if (raw.includes('-') || raw.includes('T')) {
                            const d = new Date(raw)
                            if (!isNaN(d.getTime())) {
                              return d.toLocaleDateString(locale === 'en' ? 'en-US' : 'id-ID', { month: 'long', year: 'numeric' })
                            }
                          }
                          return raw
                        }}
                      />
                      <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', fontWeight: 700 }} />
                      <Area 
                        type="monotone" 
                        dataKey="nilai_konversi" 
                        name="Nilai Konversi" 
                        stroke="#0d9488" 
                        strokeWidth={3} 
                        fillOpacity={1} 
                        fill="url(#colorTrendArsip)" 
                        activeDot={{ r: 7, strokeWidth: 3, stroke: '#ffffff', fill: '#0d9488' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
