import {
  FileText,
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Building2,
  CalendarDays,
  User,
  ShieldCheck,
  SlidersHorizontal,
  FileSignature,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Service, SurveyPeriod } from "@/types";

interface LaporanControlPanelProps {
  periods: SurveyPeriod[];
  selectedPeriodId: string;
  onPeriodChange: (periodId: string) => void;
  indexType: "IPKP" | "IPAK";
  onIndexTypeChange: (type: "IPKP" | "IPAK") => void;
  serviceFilter: string;
  onServiceFilterChange: (svc: string) => void;
  services: Service[];
  reportDate: string;
  onReportDateChange: (date: string) => void;
  kepalaName: string;
  onKepalaNameChange: (name: string) => void;
  kepalaNip: string;
  onKepalaNipChange: (nip: string) => void;
  ketuaName: string;
  onKetuaNameChange: (name: string) => void;
  ketuaNip: string;
  onKetuaNipChange: (nip: string) => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
  onPrint: () => void;
}

export function LaporanControlPanel({
  periods,
  selectedPeriodId,
  onPeriodChange,
  indexType,
  onIndexTypeChange,
  serviceFilter,
  onServiceFilterChange,
  services,
  reportDate,
  onReportDateChange,
  kepalaName,
  onKepalaNameChange,
  kepalaNip,
  onKepalaNipChange,
  ketuaName,
  onKetuaNameChange,
  ketuaNip,
  onKetuaNipChange,
  onExportExcel,
  onExportPdf,
  onPrint,
}: LaporanControlPanelProps) {
  const selectedPeriodObj = periods.find((p) => p.id === selectedPeriodId);
  const selectedPeriodLabel =
    selectedPeriodId === "all"
      ? "🌐 Semua Data Kumulatif (Semua Periode)"
      : selectedPeriodObj
      ? `${selectedPeriodObj.label}${selectedPeriodObj.is_active ? " ✨ (Sedang Aktif)" : ""}`
      : "Pilih Periode Survei...";

  return (
    <Card className="border border-slate-200/90 dark:border-gray-800 shadow-xl shadow-slate-200/50 dark:shadow-black/20 bg-white dark:bg-gray-900 rounded-3xl overflow-hidden print:hidden transition-all">
      {/* HEADER & ACTION TOOLBAR */}
      <CardHeader className="bg-gradient-to-r from-slate-50 via-emerald-50/30 to-teal-50/20 dark:from-gray-800/60 dark:to-gray-850 border-b border-slate-100 dark:border-gray-800 p-6 md:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100/80 text-emerald-800 border border-emerald-200">
                <Sparkles className="size-3 text-emerald-600" />
                PermenPAN-RB No. 14 / 2017
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                Laporan Hasil Pemantauan & Evaluasi Pelayanan
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
              <span className="p-2 bg-emerald-600 text-white rounded-xl shadow-sm inline-flex">
                <FileText className="size-5" />
              </span>
              Generator & Cetak Dokumen Laporan (LHP)
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
              Sesuaikan periode laporan, cakupan layanan, serta data pejabat penandatangan sebelum mencetak dokumen resmi standar A4.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 sm:self-end lg:self-center">
            <Button
              type="button"
              variant="outline"
              onClick={onExportExcel}
              className="rounded-2xl h-11 px-4 border-emerald-200 bg-white dark:bg-gray-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 hover:border-emerald-300 font-bold shadow-sm cursor-pointer gap-2 transition-all active:scale-95"
            >
              <FileSpreadsheet className="size-4 text-emerald-600" />
              <span>Unduh Excel</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onExportPdf}
              className="rounded-2xl h-11 px-4 border-slate-200 bg-white dark:bg-gray-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 hover:border-slate-300 font-bold shadow-sm cursor-pointer gap-2 transition-all active:scale-95"
            >
              <Download className="size-4 text-slate-600" />
              <span>Unduh PDF</span>
            </Button>
            <Button
              type="button"
              onClick={onPrint}
              className="rounded-2xl h-11 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black shadow-md shadow-emerald-600/20 cursor-pointer gap-2.5 transition-all active:scale-95"
            >
              <Printer className="size-4.5" />
              <span>Cetak Laporan (A4)</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 md:p-8 space-y-8">
        {/* SECTION 1: PARAMETER & FILTER LAPORAN */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400 pb-1 border-b border-slate-100 dark:border-gray-800">
            <SlidersHorizontal className="size-4 text-emerald-600" />
            <span>1. Parameter & Filter Data Laporan</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1.1 Periode Survei */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar className="size-3.5 text-emerald-600" />
                <span>Periode Survei</span>
              </Label>
              <Select value={selectedPeriodId} onValueChange={(v) => v && onPeriodChange(v)}>
                <SelectTrigger className="w-full rounded-xl text-xs font-bold border-slate-200 hover:border-emerald-500 bg-white dark:bg-gray-800 h-11 transition-colors">
                  <SelectValue placeholder="Pilih Periode...">
                    {selectedPeriodLabel}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-2xl max-h-72">
                  <SelectItem value="all" className="font-bold text-xs text-emerald-800 dark:text-emerald-300">
                    🌐 Semua Data Kumulatif (Semua Periode)
                  </SelectItem>
                  {periods.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="font-semibold text-xs">
                      {p.label} {p.is_active ? "✨ (Sedang Aktif)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 1.2 Jenis Indeks */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileText className="size-3.5 text-emerald-600" />
                <span>Jenis Indeks</span>
              </Label>
              <Select
                value={indexType}
                onValueChange={(v) => v && onIndexTypeChange(v as "IPKP" | "IPAK")}
              >
                <SelectTrigger className="w-full rounded-xl text-xs font-bold border-slate-200 hover:border-emerald-500 bg-white dark:bg-gray-800 h-11 transition-colors">
                  <SelectValue>
                    {indexType === "IPKP"
                      ? "IPKP (Kualitas Pelayanan)"
                      : "IPAK (Persepsi Anti Korupsi)"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="IPKP" className="font-bold text-xs">
                    IPKP (Persepsi Kualitas Pelayanan)
                  </SelectItem>
                  <SelectItem value="IPAK" className="font-bold text-xs">
                    IPAK (Persepsi Anti Korupsi)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 1.3 Filter Layanan */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Building2 className="size-3.5 text-emerald-600" />
                <span>Cakupan Layanan</span>
              </Label>
              <Select value={serviceFilter} onValueChange={(v) => v && onServiceFilterChange(v)}>
                <SelectTrigger className="w-full rounded-xl text-xs font-bold border-slate-200 hover:border-emerald-500 bg-white dark:bg-gray-800 h-11 transition-colors">
                  <SelectValue placeholder="Semua Layanan">
                    {serviceFilter === "all" ? "Semua Layanan (Kumulatif)" : serviceFilter}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-2xl max-h-64">
                  <SelectItem value="all" className="font-bold text-xs text-emerald-800 dark:text-emerald-300">
                    Semua Layanan (Kumulatif)
                  </SelectItem>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.name} className="text-xs font-medium">
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 1.4 Tanggal Pengesahan */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <CalendarDays className="size-3.5 text-emerald-600" />
                <span>Tanggal Pengesahan</span>
              </Label>
              <Input
                value={reportDate}
                onChange={(e) => onReportDateChange(e.target.value)}
                placeholder="Contoh: 31 Desember 2026"
                className="rounded-xl text-xs font-bold border-slate-200 bg-white dark:bg-gray-800 h-11"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: PEJABAT PENANDATANGAN DOKUMEN */}
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1 border-b border-slate-100 dark:border-gray-800">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
              <FileSignature className="size-4 text-emerald-600" />
              <span>2. Pejabat Penandatangan (Lembar Pengesahan)</span>
            </div>
            <span className="text-[11px] font-medium text-slate-500">
              Otomatis tercetak pada halaman tanda tangan dokumen resmi
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Box 1: Ketua Tim Pelaksana */}
            <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/40 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <User className="size-4 text-emerald-600" />
                  Ketua Tim Pelaksana Survei
                </span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-gray-700 text-slate-700 dark:text-slate-300">
                  Penyusun Laporan
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    Nama Lengkap & Gelar
                  </Label>
                  <Input
                    value={ketuaName}
                    onChange={(e) => onKetuaNameChange(e.target.value)}
                    placeholder="Nama Ketua Tim"
                    className="rounded-xl text-xs font-semibold bg-white dark:bg-gray-900 h-10"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    Nomor Induk Pegawai (NIP)
                  </Label>
                  <Input
                    value={ketuaNip}
                    onChange={(e) => onKetuaNipChange(e.target.value)}
                    placeholder="NIP Ketua Tim"
                    className="rounded-xl text-xs font-semibold bg-white dark:bg-gray-900 h-10"
                  />
                </div>
              </div>
            </div>

            {/* Box 2: Kepala Kantor Kemenag */}
            <div className="p-4 sm:p-5 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="size-4 text-emerald-600" />
                  Kepala Kantor Kemenag Barito Utara
                </span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                  Mengetahui / Mengesahkan
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    Nama Lengkap & Gelar
                  </Label>
                  <Input
                    value={kepalaName}
                    onChange={(e) => onKepalaNameChange(e.target.value)}
                    placeholder="Nama Kepala Kantor"
                    className="rounded-xl text-xs font-semibold bg-white dark:bg-gray-900 h-10"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    Nomor Induk Pegawai (NIP)
                  </Label>
                  <Input
                    value={kepalaNip}
                    onChange={(e) => onKepalaNipChange(e.target.value)}
                    placeholder="NIP Kepala Kantor"
                    className="rounded-xl text-xs font-semibold bg-white dark:bg-gray-900 h-10"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
