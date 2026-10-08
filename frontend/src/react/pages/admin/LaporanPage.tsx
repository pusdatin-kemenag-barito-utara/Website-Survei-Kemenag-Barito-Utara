import { useState, useEffect, useCallback, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import {
  fetchCachedPublicResults,
  fetchCachedArchiveResults,
  fetchCachedServices,
  fetchCachedAdminPeriods,
  getCachedPublicResultsSync,
  getCachedServicesSync,
  getCachedAdminPeriodsSync,
} from "@/lib/data-cache";
import type {
  IndexSummary,
  IndexByService,
  UnsurSummary,
  DemographicSummary,
  Service,
  SurveyPeriod,
} from "@/types";
import { exportToPdf, exportToExcel } from "@/lib/export";
import { toast } from "sonner";

import { LaporanControlPanel } from "@/components/admin/laporan/LaporanControlPanel";
import { LaporanPrintDocument } from "@/components/admin/laporan/LaporanPrintDocument";

export default function LaporanPage() {
  const cachedPub = getCachedPublicResultsSync();
  const cachedSvc = getCachedServicesSync();
  const cachedPeriods = getCachedAdminPeriodsSync();

  const [loading, setLoading] = useState(true);
  const [periods, setPeriods] = useState<SurveyPeriod[]>(() => cachedPeriods || []);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [period, setPeriod] = useState("Memuat periode...");
  const [indexType, setIndexType] = useState<"IPKP" | "IPAK">("IPKP");
  const [serviceFilter, setServiceFilter] = useState("all");

  const [kepalaName, setKepalaName] = useState("H. Abdul Majid, S.Ag., M.Pd.");
  const [kepalaNip, setKepalaNip] = useState("19750512 200003 1 002");
  const [ketuaName, setKetuaName] = useState("Drs. H. M. Yamin, M.H.");
  const [ketuaNip, setKetuaNip] = useState("19800815 200501 1 005");
  const [reportDate, setReportDate] = useState("");

  const [totalResponses, setTotalResponses] = useState<number>(() => cachedPub?.total_responses ?? 0);
  const [summary, setSummary] = useState<IndexSummary[]>(() => cachedPub?.index_summary || []);
  const [byService, setByService] = useState<IndexByService[]>(() => cachedPub?.by_service || []);
  const [unsurSummary, setUnsurSummary] = useState<UnsurSummary[]>(() => cachedPub?.unsur_summary || []);
  const [demoSummary, setDemoSummary] = useState<DemographicSummary[]>(() => cachedPub?.demographics || []);
  const [services, setServices] = useState<Service[]>(() => cachedSvc || []);

  const loadDataForPeriod = useCallback(
    async (periodId: string, periodList: SurveyPeriod[]) => {
      setLoading(true);
      try {
        if (periodId === "all") {
          const pubResults = await fetchCachedPublicResults(true);
          if (pubResults) {
            setSummary(pubResults.index_summary || []);
            setUnsurSummary(pubResults.unsur_summary || []);
            setByService(pubResults.by_service || []);
            setDemoSummary(pubResults.demographics || []);
            setTotalResponses(pubResults.total_responses ?? 0);
          }
          setPeriod("Seluruh Data Survei (Semua Periode)");
          const now = new Date();
          setReportDate(
            now.toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          );
        } else {
          const targetPeriod = periodList.find((p) => p.id === periodId);
          if (targetPeriod) {
            const archiveData = await fetchCachedArchiveResults(
              targetPeriod.start_date,
              targetPeriod.end_date
            );
            if (archiveData) {
              setSummary(archiveData.index_summary || []);
              setUnsurSummary(archiveData.unsur_summary || []);
              setByService(archiveData.by_service || []);
              setDemoSummary(archiveData.demographics || []);
              setTotalResponses(archiveData.total_responses ?? 0);
            }
            setPeriod(targetPeriod.label);
            const d = new Date(targetPeriod.end_date);
            const formattedDate = !isNaN(d.getTime())
              ? d.toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : targetPeriod.end_date;
            setReportDate(formattedDate);
          }
        }
      } catch (err) {
        console.error("Error loading report period data:", err);
        toast.error("Gagal memuat data periode");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    async function initPage() {
      try {
        const [svcData, periodsData, settingsData] = await Promise.all([
          fetchCachedServices(),
          fetchCachedAdminPeriods(),
          apiFetch<Record<string, string>>("/settings").catch(() => ({})),
        ]);

        if (svcData) setServices(Array.isArray(svcData) ? svcData : []);
        const pList = Array.isArray(periodsData) ? periodsData : [];
        setPeriods(pList);

        const st = (settingsData || {}) as Record<string, string>;
        if (st["kepala_nama"]) setKepalaName(st["kepala_nama"]);
        if (st["kepala_nip"]) setKepalaNip(st["kepala_nip"]);
        if (st["ketua_nama"]) setKetuaName(st["ketua_nama"]);
        if (st["ketua_nip"]) setKetuaNip(st["ketua_nip"]);

        const activeP = pList.find((p) => p.is_active) || pList[0];
        const initialId = activeP ? activeP.id : "all";
        setSelectedPeriodId(initialId);
        await loadDataForPeriod(initialId, pList);
      } catch (err) {
        console.error("Init laporan error:", err);
      }
    }
    initPage();
  }, [loadDataForPeriod]);

  // Filtered by service
  const filteredByService = useMemo(() => {
    return serviceFilter === "all"
      ? byService.filter((b) => b.index_type === indexType)
      : byService.filter(
          (b) => b.index_type === indexType && b.service_name === serviceFilter
        );
  }, [byService, indexType, serviceFilter]);

  // Active total respondents count
  const activeTotalResponses = useMemo(() => {
    if (serviceFilter === "all") {
      return totalResponses;
    }
    const found = filteredByService.find((b) => b.service_name === serviceFilter);
    return found?.jumlah_responden ?? 0;
  }, [serviceFilter, totalResponses, filteredByService]);

  // Score summary
  const currentSummary = useMemo(() => {
    return (
      summary.find((s) => s.index_type === indexType) || {
        index_type: indexType,
        score: 0,
        nilai_konversi: 0,
        kategori_mutu: "Belum Terisi",
        mutu_pelayanan: "Belum Terisi",
        total_responden: 0,
      }
    );
  }, [summary, indexType]);

  const effectiveSummary = useMemo<IndexSummary>(() => {
    const hasData = activeTotalResponses > 0;
    const serviceStat =
      serviceFilter !== "all"
        ? filteredByService.find((b) => b.service_name === serviceFilter)
        : null;

    if (serviceStat) {
      return {
        index_type: indexType,
        score: hasData ? serviceStat.nilai_konversi : 0,
        nilai_konversi: hasData ? serviceStat.nilai_konversi : 0,
        kategori_mutu: hasData ? serviceStat.mutu : "-",
        mutu_pelayanan: hasData
          ? serviceStat.kategori_mutu ||
            (serviceStat.mutu === "A"
              ? "Sangat Baik"
              : serviceStat.mutu === "B"
              ? "Baik"
              : serviceStat.mutu === "C"
              ? "Kurang Baik"
              : "Tidak Baik")
          : "Belum Ada Responden",
        total_responden: activeTotalResponses,
      };
    }

    return {
      index_type: indexType,
      score: hasData ? (currentSummary?.nilai_konversi ?? currentSummary?.score ?? 0) : 0,
      nilai_konversi: hasData ? (currentSummary?.nilai_konversi ?? currentSummary?.score ?? 0) : 0,
      kategori_mutu: hasData ? (currentSummary?.kategori_mutu || currentSummary?.mutu || "A") : "-",
      mutu_pelayanan: hasData
        ? (currentSummary?.mutu_pelayanan || currentSummary?.kinerja || "Sangat Baik")
        : "Belum Ada Responden",
      total_responden: activeTotalResponses,
    };
  }, [activeTotalResponses, serviceFilter, filteredByService, indexType, currentSummary]);

  // Unsur breakdown
  const filteredUnsur = useMemo(() => {
    return unsurSummary.filter((u) => u.index_type === indexType);
  }, [unsurSummary, indexType]);

  const unsurList = useMemo(() => {
    return filteredUnsur.map((u) => {
      const avg =
        u.nrr_unsur ||
        (u.nilai_konversi
          ? u.nilai_konversi / 25
          : u.nilai_rata_rata_unsur || 0);
      const konversi = u.nilai_konversi || avg * 25;
      return {
        unsur_name: u.unsur_name,
        avg,
        konversi,
        mutu:
          u.kategori_mutu === "A"
            ? "A (Sangat Baik)"
            : u.kategori_mutu === "B"
            ? "B (Baik)"
            : u.kategori_mutu === "C"
            ? "C (Kurang Baik)"
            : "D (Tidak Baik)",
      };
    });
  }, [filteredUnsur]);

  const lowestUnsur = useMemo(() => {
    return unsurList.length > 0
      ? [...unsurList].sort((a, b) => a.konversi - b.konversi)[0]
      : null;
  }, [unsurList]);

  function handlePrint() {
    window.print();
  }

  const reportOptions = useMemo(() => ({
    unsurList,
    lowestUnsur,
    kepalaName,
    kepalaNip,
    ketuaName,
    ketuaNip,
    reportDate,
    indexType,
  }), [unsurList, lowestUnsur, kepalaName, kepalaNip, ketuaName, ketuaNip, reportDate, indexType]);

  async function handleExportPdf() {
    try {
      await exportToPdf(
        [effectiveSummary],
        filteredByService,
        activeTotalResponses,
        period,
        demoSummary,
        reportOptions
      );
      toast.success("Berhasil mengekspor Laporan PDF PermenPAN-RB");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("Gagal mengekspor PDF");
    }
  }

  async function handleExportExcel() {
    try {
      await exportToExcel(
        [effectiveSummary],
        filteredByService,
        activeTotalResponses,
        period,
        demoSummary,
        reportOptions
      );
      toast.success("Berhasil mengekspor Laporan Excel PermenPAN-RB");
    } catch (err) {
      console.error("Excel export error:", err);
      toast.error("Gagal mengekspor Excel");
    }
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Control Panel (Hidden when printing) */}
      <LaporanControlPanel
        periods={periods}
        selectedPeriodId={selectedPeriodId}
        onPeriodChange={(v) => {
          setSelectedPeriodId(v);
          loadDataForPeriod(v, periods);
        }}
        indexType={indexType}
        onIndexTypeChange={setIndexType}
        serviceFilter={serviceFilter}
        onServiceFilterChange={setServiceFilter}
        services={services}
        reportDate={reportDate}
        onReportDateChange={setReportDate}
        kepalaName={kepalaName}
        onKepalaNameChange={setKepalaName}
        kepalaNip={kepalaNip}
        onKepalaNipChange={setKepalaNip}
        ketuaName={ketuaName}
        onKetuaNameChange={setKetuaName}
        ketuaNip={ketuaNip}
        onKetuaNipChange={setKetuaNip}
        onExportExcel={handleExportExcel}
        onExportPdf={handleExportPdf}
        onPrint={handlePrint}
      />

      {/* Official Printed Document Preview Sheet (A4 Styled) */}
      <LaporanPrintDocument
        indexType={indexType}
        period={period}
        currentSummary={effectiveSummary}
        activeTotalResponses={activeTotalResponses}
        unsurList={unsurList}
        lowestUnsur={lowestUnsur}
        demoSummary={demoSummary}
        serviceFilter={serviceFilter}
        loading={loading}
        reportDate={reportDate}
        kepalaName={kepalaName}
        kepalaNip={kepalaNip}
        ketuaName={ketuaName}
        ketuaNip={ketuaNip}
      />
    </div>
  );
}
