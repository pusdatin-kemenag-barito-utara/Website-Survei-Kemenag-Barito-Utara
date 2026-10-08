import { useEffect, useState } from "react";
import {
  Plus,
  Loader2,
  Calendar,
  Search,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import {
  fetchCachedAdminPeriods,
  getCachedAdminPeriodsSync,
  invalidateClientCache,
} from "@/lib/data-cache";
import type { SurveyPeriod } from "@/types";

import { PeriodeTableRow } from "@/components/admin/periode/PeriodeTableRow";
import { PeriodeDeleteDialog } from "@/components/admin/periode/PeriodeDeleteDialog";
import {
  PeriodeFormModal,
  type PeriodFormData,
} from "@/components/admin/periode/PeriodeFormModal";

export default function AdminPeriodePage() {
  const cachedInitial = getCachedAdminPeriodsSync();
  const [periods, setPeriods] = useState<SurveyPeriod[]>(() => cachedInitial || []);
  const [loading, setLoading] = useState(() => !cachedInitial || cachedInitial.length === 0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"triwulan" | "semester" | "tahunan">("triwulan");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SurveyPeriod | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<SurveyPeriod | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [settingActive, setSettingActive] = useState(false);

  async function fetchPeriods(force = false) {
    if (force) {
      setIsRefreshing(true);
    } else if (periods.length === 0) {
      setLoading(true);
    }

    try {
      const data = await fetchCachedAdminPeriods(force);
      if (Array.isArray(data)) {
        setPeriods(data);
      }
    } catch (err) {
      console.error("Fetch periods error:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    fetchPeriods();
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 2000);
    return () => clearTimeout(safetyTimer);
  }, []);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(p: SurveyPeriod) {
    setEditing(p);
    setDialogOpen(true);
  }

  async function onSubmit(data: PeriodFormData) {
    setSaving(true);
    const cleanStartDate = data.start_date ? data.start_date.split("T")[0] : "";
    const cleanEndDate = data.end_date ? data.end_date.split("T")[0] : "";

    try {
      const payload = {
        period_type: data.period_type,
        label: data.label,
        start_date: cleanStartDate,
        end_date: cleanEndDate,
        is_active: data.is_active,
      };

      if (editing) {
        await apiFetch(`/admin/periods/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/admin/periods", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      toast.success(
        editing
          ? "Periode survei berhasil diperbarui"
          : "Periode survei berhasil ditambah"
      );
      setDialogOpen(false);
      invalidateClientCache();
      fetchPeriods(true);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Gagal menyimpan periode";
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteDialog) return;
    const target = deleteDialog;
    setDeleting(true);
    setPeriods((prev) => prev.filter((p) => p.id !== target.id));
    setDeleteDialog(null);
    try {
      await apiFetch(`/admin/periods/${target.id}`, { method: "DELETE" });
      toast.success("Periode survei berhasil dihapus");
      invalidateClientCache();
      fetchPeriods(true);
    } catch (err: unknown) {
      setPeriods((prev) => [...prev, target]);
      const errorMsg = err instanceof Error ? err.message : "Error server";
      toast.error("Gagal menghapus: " + errorMsg);
    } finally {
      setDeleting(false);
    }
  }

  async function toggleActiveStatus(p: SurveyPeriod) {
    setSettingActive(true);
    const newActive = !p.is_active;
    const cleanStartDate = p.start_date ? p.start_date.split("T")[0] : "";
    const cleanEndDate = p.end_date ? p.end_date.split("T")[0] : "";

    setPeriods((prev) =>
      prev.map((item) => {
        if (item.id === p.id) return { ...item, is_active: newActive };
        if (newActive) return { ...item, is_active: false };
        return item;
      })
    );

    try {
      if (newActive) {
        await apiFetch(`/admin/periods/${p.id}/active`, { method: "PATCH" });
      } else {
        await apiFetch(`/admin/periods/${p.id}`, {
          method: "PUT",
          body: JSON.stringify({
            period_type: p.period_type,
            label: p.label,
            start_date: cleanStartDate,
            end_date: cleanEndDate,
            is_active: false,
          }),
        });
      }
      toast.success(`Status periode "${p.label}" berhasil diperbarui`);
      invalidateClientCache();
      fetchPeriods(true);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Gagal mengubah status periode";
      toast.error(errorMsg);
      fetchPeriods(true);
    } finally {
      setSettingActive(false);
    }
  }

  const activePeriod = periods.find((p) => p.is_active);

  const filteredPeriods = periods.filter((p) => {
    const matchesTab = p.period_type === activeTab;
    const matchesSearch =
      p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.start_date.includes(searchQuery) ||
      p.end_date.includes(searchQuery);
    return matchesTab && matchesSearch;
  });

  return (
    <div className="w-full space-y-6">
      {/* Header Banner Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-slate-200/80 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
            <Calendar className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Kelola Periode Survei
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium mt-0.5">
              Atur siklus evaluasi survei (Triwulan, Semester, dan Tahunan) serta tentukan periode aktif utama.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={() => fetchPeriods(true)}
            disabled={isRefreshing}
            className="gap-2 rounded-2xl border-slate-200 font-bold text-xs h-12 px-4 cursor-pointer"
          >
            <RotateCcw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Segarkan</span>
          </Button>

          <Button
            onClick={openCreate}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl px-5 h-12 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Plus className="size-5" />
            <span>Tambah Periode</span>
          </Button>
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="border border-slate-200/80 dark:border-gray-800 shadow-xl shadow-slate-200/40 dark:shadow-black/20 bg-white dark:bg-gray-900 rounded-3xl overflow-hidden">
        <CardHeader className="bg-slate-50/50 dark:bg-gray-800/40 border-b border-slate-100 dark:border-gray-800 p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                Daftar Periode
              </CardTitle>
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-bold px-2.5 py-0.5 rounded-full text-xs">
                {periods.length} Periode
              </Badge>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                placeholder="Cari label atau tanggal..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-xl bg-white dark:bg-gray-900 border-slate-200 dark:border-gray-700 text-xs focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {/* Filter Tabs (Triwulan, Semester, Tahunan) */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as typeof activeTab)}
            className="w-full"
          >
            <TabsList className="bg-slate-100 dark:bg-gray-800 p-1 rounded-2xl grid grid-cols-3 max-w-sm">
              <TabsTrigger
                value="triwulan"
                className="h-9 rounded-xl px-3 text-xs font-bold transition-all data-active:bg-white dark:data-active:bg-gray-900 data-active:text-blue-700 data-active:shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Triwulan</span>
                <span className="px-1.5 py-0.5 rounded-full bg-slate-200/80 dark:bg-gray-700 text-[10px] font-extrabold text-slate-700 dark:text-slate-200">
                  {periods.filter((p) => p.period_type === "triwulan").length}
                </span>
              </TabsTrigger>

              <TabsTrigger
                value="semester"
                className="h-9 rounded-xl px-3 text-xs font-bold transition-all data-active:bg-white dark:data-active:bg-gray-900 data-active:text-purple-700 data-active:shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Semester</span>
                <span className="px-1.5 py-0.5 rounded-full bg-slate-200/80 dark:bg-gray-700 text-[10px] font-extrabold text-slate-700 dark:text-slate-200">
                  {periods.filter((p) => p.period_type === "semester").length}
                </span>
              </TabsTrigger>

              <TabsTrigger
                value="tahunan"
                className="h-9 rounded-xl px-3 text-xs font-bold transition-all data-active:bg-white dark:data-active:bg-gray-900 data-active:text-amber-700 data-active:shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Tahunan</span>
                <span className="px-1.5 py-0.5 rounded-full bg-slate-200/80 dark:bg-gray-700 text-[10px] font-extrabold text-slate-700 dark:text-slate-200">
                  {periods.filter((p) => p.period_type === "tahunan").length}
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/80 dark:bg-gray-800/60">
              <TableRow className="border-b border-slate-100 dark:border-gray-800">
                <TableHead className="text-xs font-bold text-slate-700 uppercase tracking-wider pl-6">
                  Label Periode
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Tipe
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Tanggal Mulai
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Tanggal Selesai
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Status
                </TableHead>
                <TableHead className="w-52 text-right text-xs font-bold text-slate-700 uppercase tracking-wider pr-6">
                  Aksi
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPeriods.map((p) => (
                <PeriodeTableRow
                  key={p.id}
                  period={p}
                  activePeriod={activePeriod}
                  settingActive={settingActive}
                  onToggleActive={toggleActiveStatus}
                  onEdit={openEdit}
                  onDelete={setDeleteDialog}
                />
              ))}

              {loading && periods.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="size-8 animate-spin text-emerald-600" />
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Memuat data periode survei...
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {!loading && filteredPeriods.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-slate-400">
                    <Calendar className="size-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm font-medium">
                      Tidak ada periode survei ditemukan
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modular Form Modal */}
      <PeriodeFormModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        saving={saving}
        onSubmit={onSubmit}
      />

      {/* Modular Delete Dialog */}
      <PeriodeDeleteDialog
        period={deleteDialog}
        deleting={deleting}
        onOpenChange={(open) => {
          if (!open) setDeleteDialog(null);
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
