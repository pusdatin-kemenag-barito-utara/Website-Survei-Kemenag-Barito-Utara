import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  Loader2,
  HelpCircle,
  Search,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import {
  fetchCachedAdminQuestions,
  fetchCachedAdminUnsur,
  fetchCachedAdminServices,
  getCachedAdminQuestionsSync,
  getCachedAdminUnsurSync,
  getCachedAdminServicesSync,
  invalidateClientCache,
} from "@/lib/data-cache";
import type { Question, Unsur, Service } from "@/types";

import { PertanyaanTableRow } from "@/components/admin/pertanyaan/PertanyaanTableRow";
import { PertanyaanDeleteDialog } from "@/components/admin/pertanyaan/PertanyaanDeleteDialog";
import {
  PertanyaanFormModal,
  extractCleanId,
  type QuestionFormData,
} from "@/components/admin/pertanyaan/PertanyaanFormModal";

function matchUnsur(q: Question, targetId: string): boolean {
  if (!targetId || targetId === "all") return true;
  const cleanTarget = extractCleanId(targetId);
  const qUnsurId =
    extractCleanId(q.unsur_id) ||
    extractCleanId(q.unsur?.id) ||
    extractCleanId((q as { unsur?: unknown }).unsur);
  if (qUnsurId === cleanTarget) return true;
  if (
    q.unsur?.id === cleanTarget ||
    (q.unsur as { original_id?: string })?.original_id === cleanTarget
  ) {
    return true;
  }
  return false;
}

export default function AdminPertanyaanPage() {
  const searchParams = useSearchParams();
  const urlUnsurId = searchParams.get("unsur_id") || "";

  const cachedUnsur = getCachedAdminUnsurSync();
  const cachedServices = getCachedAdminServicesSync();
  const cachedQuestions = getCachedAdminQuestionsSync();

  const initialSortedUnsur = useMemo(() => {
    return cachedUnsur
      ? [...cachedUnsur].sort((a, b) => {
          if (a.index_type !== b.index_type) {
            return a.index_type === "IPKP" ? -1 : 1;
          }
          return a.sort_order - b.sort_order;
        })
      : [];
  }, [cachedUnsur]);

  const [unsurList, setUnsurList] = useState<Unsur[]>(() => initialSortedUnsur);
  const [services, setServices] = useState<Service[]>(() => cachedServices || []);
  const [allQuestions, setAllQuestions] = useState<Question[]>(() => cachedQuestions || []);
  const [loading, setLoading] = useState(() => !cachedQuestions || !cachedUnsur);

  const [filterUnsur, setFilterUnsur] = useState<string>(urlUnsurId || "all");
  const [searchQuery, setSearchQuery] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<Question | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async (force = false) => {
    if (!cachedQuestions || force) setLoading(true);
    try {
      const [unsurData, servData, qData] = await Promise.all([
        fetchCachedAdminUnsur(force),
        fetchCachedAdminServices(force),
        fetchCachedAdminQuestions(force),
      ]);

      const sortedUnsur = [...unsurData].sort((a, b) => {
        if (a.index_type !== b.index_type) {
          return a.index_type === "IPKP" ? -1 : 1;
        }
        return a.sort_order - b.sort_order;
      });

      setUnsurList(sortedUnsur);
      setServices(servData);
      setAllQuestions(qData);
    } catch {
      toast.error("Gagal memuat data pertanyaan & unsur.");
    } finally {
      setLoading(false);
    }
  }, [cachedQuestions]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(q: Question) {
    setEditing(q);
    setDialogOpen(true);
  }

  async function onSubmit(data: QuestionFormData) {
    setSaving(true);
    try {
      const payload = {
        ...data,
        unsur_id: data.unsur_id,
        service_id: data.service_id || null,
      };

      if (editing) {
        await apiFetch(`/admin/questions/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success("Pertanyaan berhasil diperbarui");
      } else {
        await apiFetch("/admin/questions", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Pertanyaan baru berhasil ditambahkan");
      }
      setDialogOpen(false);
      invalidateClientCache();
      loadData(true);
    } catch {
      toast.error("Gagal menyimpan butir pertanyaan");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteDialog) return;
    const target = deleteDialog;
    setDeleting(true);
    setAllQuestions((prev) => prev.filter((q) => q.id !== target.id));
    setDeleteDialog(null);

    try {
      await apiFetch(`/admin/questions/${target.id}`, { method: "DELETE" });
      toast.success("Pertanyaan berhasil dihapus");
      invalidateClientCache();
      loadData(true);
    } catch {
      setAllQuestions((prev) => [...prev, target]);
      toast.error("Gagal menghapus pertanyaan");
    } finally {
      setDeleting(false);
    }
  }

  const displayedQuestions = useMemo(() => {
    return allQuestions
      .filter((q) => {
        if (filterUnsur === "ipkp_all") {
          const unsur = unsurList.find((u) => matchUnsur(q, u.id));
          return unsur?.index_type === "IPKP";
        }
        if (filterUnsur === "ipak_all") {
          const unsur = unsurList.find((u) => matchUnsur(q, u.id));
          return unsur?.index_type === "IPAK";
        }
        return matchUnsur(q, filterUnsur);
      })
      .filter((q) => {
        if (!searchQuery) return true;
        const qLower = searchQuery.toLowerCase();
        return (
          q.question_text_id.toLowerCase().includes(qLower) ||
          q.question_text_en.toLowerCase().includes(qLower)
        );
      });
  }, [allQuestions, filterUnsur, searchQuery, unsurList]);

  return (
    <div className="w-full space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-slate-200/80 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
            <HelpCircle className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Butir Pertanyaan Kuesioner
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium mt-0.5">
              Kelola teks butir pertanyaan survei, label emote 4 level, dan pemetaan unsur SKM.
            </p>
          </div>
        </div>

        <Button
          onClick={openCreate}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl px-5 py-6 shadow-md shadow-emerald-600/20 transition-all cursor-pointer w-full md:w-auto"
        >
          <Plus className="size-5" />
          <span>Tambah Pertanyaan</span>
        </Button>
      </div>

      {/* Main Table Card */}
      <Card className="border border-slate-200/80 dark:border-gray-800 shadow-xl shadow-slate-200/40 dark:shadow-black/20 bg-white dark:bg-gray-900 rounded-3xl overflow-hidden">
        <CardHeader className="bg-slate-50/50 dark:bg-gray-800/40 border-b border-slate-100 dark:border-gray-800 p-4 sm:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Filter by Unsur */}
            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <Filter className="size-4 text-emerald-600 shrink-0" />
              <Select value={filterUnsur} onValueChange={(val) => setFilterUnsur(val || "all")}>
                <SelectTrigger className="w-full md:w-[320px] rounded-xl border-slate-200 text-xs font-semibold">
                  <SelectValue placeholder="Pilih Filter Unsur" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl max-h-72">
                  <SelectItem value="all" className="font-bold text-xs">
                    Semua Unsur ({allQuestions.length} Pertanyaan)
                  </SelectItem>
                  <SelectItem value="ipkp_all" className="font-semibold text-xs text-emerald-700">
                    Semua Unsur IPKP (Kepuasan Pelayanan)
                  </SelectItem>
                  <SelectItem value="ipak_all" className="font-semibold text-xs text-indigo-700">
                    Semua Unsur IPAK (Anti Korupsi)
                  </SelectItem>
                  {unsurList.map((u) => (
                    <SelectItem key={u.id} value={u.id} className="text-xs">
                      U{u.sort_order} - {u.name} ({u.index_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                placeholder="Cari teks pertanyaan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-xl bg-white dark:bg-gray-900 border-slate-200 text-xs"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading && allQuestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="size-8 animate-spin text-emerald-600" />
              <p className="text-xs font-semibold text-slate-500">Memuat butir pertanyaan...</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/80 dark:bg-gray-800/60">
                <TableRow className="border-b border-slate-100 dark:border-gray-800">
                  <TableHead className="w-48 text-xs font-bold text-slate-700 uppercase tracking-wider pl-6">
                    Unsur
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Teks Pertanyaan
                  </TableHead>
                  <TableHead className="w-44 text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Layanan Target
                  </TableHead>
                  <TableHead className="w-28 text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="w-28 text-right text-xs font-bold text-slate-700 uppercase tracking-wider pr-6">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedQuestions.map((q) => {
                  const cleanQUnsurId =
                    extractCleanId(q.unsur_id) ||
                    extractCleanId(q.unsur?.id) ||
                    extractCleanId((q as { unsur?: unknown }).unsur);
                  const unsurInfo = unsurList.find(
                    (u) =>
                      u.id === cleanQUnsurId ||
                      (u as { original_id?: string }).original_id === cleanQUnsurId
                  );
                  const serviceInfo = services.find((s) => s.id === q.service_id);

                  return (
                    <PertanyaanTableRow
                      key={q.id}
                      question={q}
                      unsurInfo={unsurInfo}
                      serviceInfo={serviceInfo}
                      onEdit={openEdit}
                      onDelete={setDeleteDialog}
                    />
                  );
                })}

                {displayedQuestions.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-16 text-center text-slate-400">
                      <HelpCircle className="size-12 mx-auto mb-3 text-slate-300" />
                      <p className="text-base font-bold text-slate-700 dark:text-slate-300">
                        Belum ada butir pertanyaan yang sesuai dengan filter
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Silakan pilih unsur lain atau klik &ldquo;Tambah Pertanyaan&rdquo; untuk membuat butir kuesioner baru.
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modular Form Modal */}
      <PertanyaanFormModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        unsurList={unsurList}
        services={services}
        saving={saving}
        onSubmit={onSubmit}
      />

      {/* Modular Delete Dialog */}
      <PertanyaanDeleteDialog
        question={deleteDialog}
        deleting={deleting}
        onOpenChange={(open) => {
          if (!open) setDeleteDialog(null);
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
