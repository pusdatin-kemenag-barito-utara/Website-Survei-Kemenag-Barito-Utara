import { Loader2, FileCheck2 } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import type { DemographicSummary } from "@/types";

export interface UnsurReportItem {
  unsur_name: string;
  avg: number;
  konversi: number;
  mutu: string;
}

export interface SummaryReportItem {
  index_type: string;
  score?: number;
  nilai_konversi?: number;
  kategori_mutu?: string;
  mutu_pelayanan?: string;
  mutu?: string;
  kinerja?: string;
  total_responden?: number;
}

interface LaporanPrintDocumentProps {
  indexType: "IPKP" | "IPAK";
  period: string;
  currentSummary: SummaryReportItem;
  activeTotalResponses: number;
  unsurList: UnsurReportItem[];
  lowestUnsur: UnsurReportItem | null;
  demoSummary: DemographicSummary[];
  serviceFilter: string;
  loading: boolean;
  reportDate: string;
  kepalaName: string;
  kepalaNip: string;
  ketuaName: string;
  ketuaNip: string;
}

export function LaporanPrintDocument({
  indexType,
  period,
  currentSummary,
  activeTotalResponses,
  unsurList,
  lowestUnsur,
  demoSummary,
  serviceFilter,
  loading,
  reportDate,
  kepalaName,
  kepalaNip,
  ketuaName,
  ketuaNip,
}: LaporanPrintDocumentProps) {
  const hasData = activeTotalResponses > 0;
  const scoreVal = hasData
    ? (currentSummary?.nilai_konversi ?? currentSummary?.score ?? 0)
    : 0;
  const displayScore = hasData ? scoreVal.toFixed(2) : "0.00";
  const displayMutu = hasData
    ? (currentSummary?.kategori_mutu || currentSummary?.mutu || "-")
    : "-";
  const displayKinerja = hasData
    ? (currentSummary?.mutu_pelayanan || currentSummary?.kinerja || "-")
    : "Belum Ada Responden";

  return (
    <div className="space-y-4">
      {/* PRATINJAU BAR (Hidden in print) */}
      <div className="max-w-[900px] mx-auto flex items-center justify-between px-2 text-xs text-slate-500 dark:text-slate-400 print:hidden">
        <div className="flex items-center gap-2">
          <FileCheck2 className="size-4 text-emerald-600" />
          <span className="font-bold text-slate-700 dark:text-slate-200">
            Pratinjau Dokumen Cetak Standar A4
          </span>
          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-gray-800 text-[10px] font-semibold">
            210 × 297 mm
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span>Format: PermenPAN-RB No. 14/2017</span>
        </div>
      </div>

      {/* LEMBAR DOKUMEN CETAK A4 */}
      <div className="bg-white text-slate-900 p-8 sm:p-12 md:p-16 rounded-3xl shadow-2xl border border-slate-200/90 print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none max-w-[900px] mx-auto space-y-8 font-sans leading-relaxed text-xs sm:text-sm">
        {/* KOP SURAT RESMI */}
        <div className="text-center border-b-4 border-double border-slate-900 pb-4 relative">
          <div className="flex items-center justify-center gap-4 mb-2">
            <img
              src="/kemenag.svg"
              alt="Logo Kemenag"
              width={68}
              height={68}
              className="object-contain shrink-0"
            />
            <div className="text-center uppercase">
              <h2 className="text-xs sm:text-sm font-bold tracking-wider text-slate-800">
                KEMENTERIAN AGAMA REPUBLIK INDONESIA
              </h2>
              <h1 className="text-sm sm:text-lg font-black tracking-widest text-slate-950">
                KANTOR KEMENTERIAN AGAMA KABUPATEN BARITO UTARA
              </h1>
              <p className="text-[11px] font-medium capitalize tracking-normal text-slate-600 font-serif">
                Jalan Ahmad Yani No. 88, Muara Teweh, Kabupaten Barito Utara, Kalimantan Tengah 73812
              </p>
              <p className="text-[10px] font-medium tracking-normal text-slate-500">
                Laman: baritoutara.kemenag.go.id | Pos-el: baritoutara@kemenag.go.id
              </p>
            </div>
          </div>
        </div>

        {/* JUDUL LAPORAN */}
        <div className="text-center space-y-1 my-6">
          <h3 className="text-base sm:text-lg font-black uppercase tracking-wide text-slate-900 underline decoration-2 underline-offset-4">
            LAPORAN HASIL SURVEI KEPUASAN MASYARAKAT (SKM)
          </h3>
          <p className="text-xs font-black uppercase text-emerald-800">
            {indexType === "IPKP"
              ? "INDEKS PERSEPSI KUALITAS PELAYANAN (IPKP)"
              : "INDEKS PERSEPSI ANTI KORUPSI (IPAK)"}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-3 text-xs font-bold text-slate-600">
            <span>PERIODE: {period.toUpperCase()}</span>
            {serviceFilter !== "all" && (
              <>
                <span>•</span>
                <span className="text-emerald-900">LAYANAN: {serviceFilter.toUpperCase()}</span>
              </>
            )}
          </div>
        </div>

        {/* BAB I: RINGKASAN HASIL */}
        <div className="space-y-3">
          <h4 className="font-black text-xs uppercase bg-slate-100 p-2 border-l-4 border-emerald-600 text-slate-900 tracking-wider">
            I. RINGKASAN EKSEKUTIF INDEKS
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center my-4">
            {/* Skor Konversi */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
              <span className="text-[11px] font-bold text-emerald-800 uppercase block mb-1">
                Nilai Konversi Indeks
              </span>
              <span className="text-3xl font-black text-emerald-950 block">
                {displayScore}
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 block mt-1">
                Skala 0 - 100
              </span>
            </div>

            {/* Mutu Pelayanan */}
            <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200">
              <span className="text-[11px] font-bold text-teal-800 uppercase block mb-1">
                Mutu Pelayanan
              </span>
              <span className="text-2xl font-black text-teal-950 block">
                {displayMutu}
              </span>
              <span className="text-[11px] font-semibold text-teal-700 block mt-1">
                {displayKinerja}
              </span>
            </div>

            {/* Total Responden */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                Total Responden
              </span>
              <span className="text-3xl font-black text-slate-900 block">
                {activeTotalResponses}
              </span>
              <span className="text-[11px] font-semibold text-slate-600 block mt-1">
                Masyarakat Pemohon
              </span>
            </div>
          </div>
        </div>

        {/* BAB II: RINCIAN PER UNSUR */}
        <div className="space-y-3">
          <h4 className="font-black text-xs uppercase bg-slate-100 p-2 border-l-4 border-emerald-600 text-slate-900 tracking-wider">
            II. REKAPITULASI NILAI PER UNSUR INDIKATOR
          </h4>

          <div className="border rounded-2xl overflow-hidden border-slate-200">
            <Table>
              <TableHeader className="bg-slate-100">
                <TableRow>
                  <TableHead className="w-12 font-bold text-slate-900 text-center text-xs">
                    NO
                  </TableHead>
                  <TableHead className="font-bold text-slate-900 text-xs">
                    UNSUR INDIKATOR
                  </TableHead>
                  <TableHead className="text-center font-bold text-slate-900 text-xs">
                    NRR UNSUR
                  </TableHead>
                  <TableHead className="text-center font-bold text-slate-900 text-xs">
                    KONVERSI (NRR × 25)
                  </TableHead>
                  <TableHead className="text-center font-bold text-slate-900 text-xs">
                    KATEGORI MUTU
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unsurList.length === 0 || !hasData ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-slate-500 font-medium text-xs">
                      Belum ada data responden untuk periode dan cakupan layanan ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  unsurList.map((u, idx) => (
                    <TableRow key={idx} className="border-b border-slate-100 text-xs">
                      <TableCell className="text-center font-bold text-slate-700">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-800">
                        {u.unsur_name}
                      </TableCell>
                      <TableCell className="text-center font-bold">
                        {u.avg.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center font-black text-emerald-800">
                        {u.konversi.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center font-bold">
                        {u.mutu}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* BAB III: PROFIL DEMOGRAFI RESPONDEN */}
        <div className="space-y-3">
          <h4 className="font-black text-xs uppercase bg-slate-100 p-2 border-l-4 border-emerald-600 text-slate-900 tracking-wider">
            III. PROFIL & SEBARAN DEMOGRAFI RESPONDEN
          </h4>

          {loading ? (
            <div className="flex items-center justify-center p-6 text-slate-400 gap-2">
              <Loader2 className="size-4 animate-spin text-emerald-600" />
              <span>Memuat data demografi...</span>
            </div>
          ) : !hasData ? (
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-center text-xs text-slate-500 font-medium">
              Belum ada data demografi responden untuk periode ini.
            </div>
          ) : (
            <div className="border rounded-2xl overflow-hidden border-slate-200">
              <Table>
                <TableHeader className="bg-slate-100">
                  <TableRow>
                    <TableHead className="font-bold text-slate-900 text-xs w-1/3">
                      KATEGORI DEMOGRAFI
                    </TableHead>
                    <TableHead className="font-bold text-slate-900 text-xs">
                      RINCIAN SEBARAN RESPONDEN
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from(new Set(demoSummary.map((d) => d.field_key))).map((key) => {
                    const items = demoSummary.filter(
                      (d) =>
                        d.field_key === key &&
                        (serviceFilter === "all" || d.service_name === serviceFilter)
                    );
                    return (
                      <TableRow key={key} className="border-b border-slate-100 text-xs">
                        <TableCell className="font-bold text-slate-800 capitalize">
                          {key.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell className="font-medium text-slate-700">
                          {items.length > 0 ? (
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                              {items.map((it, i) => (
                                <span key={i}>
                                  {it.demographic_value}:{" "}
                                  <strong className="text-emerald-800 font-bold">
                                    {it.count} orang
                                  </strong>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400">Tidak ada rincian data</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* BAB IV: RENCANA TINDAK LANJUT (RTL) */}
        <div className="space-y-3">
          <h4 className="font-black text-xs uppercase bg-slate-100 p-2 border-l-4 border-emerald-600 text-slate-900 tracking-wider">
            IV. RENCANA TINDAK LANJUT (RTL) REKOMENDASI PERBAIKAN
          </h4>

          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2 text-xs">
            {!hasData ? (
              <p className="text-slate-600">
                Rencana tindak lanjut belum dapat dirumuskan karena belum ada respon masyarakat pada periode yang dipilih.
              </p>
            ) : lowestUnsur ? (
              <>
                <p className="font-bold text-amber-950">
                  📌 Unsur dengan nilai konversi terendah:{" "}
                  <span className="underline">{lowestUnsur.unsur_name}</span>{" "}
                  (Skor: {lowestUnsur.konversi.toFixed(2)} - {lowestUnsur.mutu})
                </p>
                <p className="text-slate-700 leading-relaxed font-serif">
                  Rekomendasi Tindak Lanjut: Memperkuat koordinasi tim petugas PTSP,
                  menyederhanakan petunjuk teknis persyaratan permohonan, serta
                  meningkatkan transparansi kepastian waktu penyelesaian layanan
                  kepada masyarakat.
                </p>
              </>
            ) : (
              <p className="text-slate-600">
                Seluruh unsur indikator pelayanan telah memenuhi kriteria kinerja Sangat Baik.
              </p>
            )}
          </div>
        </div>

        {/* LEMBAR PENGESAHAN */}
        <div className="pt-8 space-y-12 page-break-inside-avoid">
          <div className="flex justify-end text-xs font-semibold">
            <p>Muara Teweh, {reportDate}</p>
          </div>

          <div className="grid grid-cols-2 gap-8 text-center text-xs">
            {/* Ketua Tim */}
            <div className="space-y-16">
              <p className="font-bold">Ketua Tim Pelaksana Survei,</p>
              <div className="space-y-0.5">
                <p className="font-bold underline uppercase tracking-wide">{ketuaName}</p>
                <p className="text-[11px] text-slate-600">NIP. {ketuaNip}</p>
              </div>
            </div>

            {/* Kepala Kantor */}
            <div className="space-y-16">
              <p className="font-bold leading-relaxed">
                Mengetahui,
                <br />
                Kepala Kantor Kementerian Agama Kab. Barito Utara
              </p>
              <div className="space-y-0.5">
                <p className="font-bold underline uppercase tracking-wide">{kepalaName}</p>
                <p className="text-[11px] text-slate-600">NIP. {kepalaNip}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
