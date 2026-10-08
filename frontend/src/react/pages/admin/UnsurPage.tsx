import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Layers, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import {
  fetchCachedAdminUnsur,
  getCachedAdminUnsurSync,
  invalidateClientCache,
} from "@/lib/data-cache";
import type { Unsur } from "@/types";

import { UnsurTableRow } from "@/components/admin/unsur/UnsurTableRow";
import { UnsurDeleteDialog } from "@/components/admin/unsur/UnsurDeleteDialog";
import {
  UnsurFormModal,
  type UnsurFormData,
} from "@/components/admin/unsur/UnsurFormModal";

export default function AdminUnsurPage() {
  const router = useRouter();
  const cachedInitial = getCachedAdminUnsurSync();
  const [unsurList, setUnsurList] = useState<Unsur[]>(() => cachedInitial || []);
  const [loading, setLoading] = useState(() => !cachedInitial);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("Semua");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Unsur | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<Unsur | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUnsur = useCallback(async (force = false) => {
    if (!cachedInitial || force) setLoading(true);
    try {
      const data = await fetchCachedAdminUnsur(force);
      setUnsurList(data || []);
    } catch {
      toast.error("Gagal memuat unsur penilaian");
    } finally {
      setLoading(false);
    }
  }, [cachedInitial]);

  useEffect(() => {
    fetchUnsur();
  }, [fetchUnsur]);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(u: Unsur) {
    setEditing(u);
    setDialogOpen(true);
  }

  async function onSubmit(data: UnsurFormData) {
    setSaving(true);
    try {
      if (editing) {
        await apiFetch(`/admin/unsur/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        });
        toast.success("Unsur penilaian berhasil diperbarui");
      } else {
        await apiFetch("/admin/unsur", {
          method: "POST",
          body: JSON.stringify(data),
        });
        toast.success("Unsur penilaian baru berhasil ditambahkan");
      }
      setDialogOpen(false);
      invalidateClientCache();
      fetchUnsur(true);
    } catch {
      toast.error("Gagal menyimpan unsur penilaian");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteDialog) return;
    const target = deleteDialog;
    setDeleting(true);
    setUnsurList((prev) => prev.filter((u) => u.id !== target.id));
    setDeleteDialog(null);
    try {
      await apiFetch(`/admin/unsur/${target.id}`, { method: "DELETE" });
      toast.success("Unsur penilaian berhasil dihapus");
      invalidateClientCache();
      fetchUnsur(true);
    } catch {
      setUnsurList((prev) => [...prev, target]);
      toast.error("Gagal menghapus unsur");
    } finally {
      setDeleting(false);
    }
  }

  const filteredList = unsurList.filter((u) => {
    const matchesFilter =
      filter === "Semua" ? true : u.index_type === filter;
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.description &&
        u.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  if (loading && unsurList.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-slate-200/80 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
            <Layers className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Unsur Penilaian Kuesioner
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium mt-0.5">
              Kelola unsur SKM berdasarkan Permenpan RB No. 14 Tahun 2017 (IPKP) dan IPAK.
            </p>
          </div>
        </div>

        <Button
          onClick={openCreate}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl px-5 py-6 shadow-md shadow-emerald-600/20 transition-all cursor-pointer w-full md:w-auto"
        >
          <Plus className="size-5" />
          <span>Tambah Unsur</span>
        </Button>
      </div>

      {/* Main Table Card */}
      <Card className="border border-slate-200/80 dark:border-gray-800 shadow-xl shadow-slate-200/40 dark:shadow-black/20 bg-white dark:bg-gray-900 rounded-3xl overflow-hidden">
        <CardHeader className="bg-slate-50/50 dark:bg-gray-800/40 border-b border-slate-100 dark:border-gray-800 p-4 sm:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <Tabs
              value={filter}
              onValueChange={setFilter}
              className="w-full md:w-auto"
            >
              <TabsList className="bg-slate-100 dark:bg-gray-800 p-1 rounded-2xl">
                <TabsTrigger
                  value="Semua"
                  className="rounded-xl px-4 text-xs font-bold transition-all data-active:bg-white dark:data-active:bg-gray-900 data-active:text-emerald-700 data-active:shadow-xs cursor-pointer"
                >
                  Semua ({unsurList.length})
                </TabsTrigger>
                <TabsTrigger
                  value="IPKP"
                  className="rounded-xl px-4 text-xs font-bold transition-all data-active:bg-white dark:data-active:bg-gray-900 data-active:text-emerald-700 data-active:shadow-xs cursor-pointer"
                >
                  IPKP ({unsurList.filter((u) => u.index_type === "IPKP").length})
                </TabsTrigger>
                <TabsTrigger
                  value="IPAK"
                  className="rounded-xl px-4 text-xs font-bold transition-all data-active:bg-white dark:data-active:bg-gray-900 data-active:text-emerald-700 data-active:shadow-xs cursor-pointer"
                >
                  IPAK ({unsurList.filter((u) => u.index_type === "IPAK").length})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative w-full md:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                placeholder="Cari unsur penilaian..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-xl bg-white dark:bg-gray-900 border-slate-200 dark:border-gray-700 text-xs focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/80 dark:bg-gray-800/60">
              <TableRow className="border-b border-slate-100 dark:border-gray-800">
                <TableHead className="w-16 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">
                  No
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Nama Unsur Penilaian
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Tipe Indeks
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Deskripsi
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Status
                </TableHead>
                <TableHead className="w-56 text-right text-xs font-bold text-slate-700 uppercase tracking-wider pr-6">
                  Aksi
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredList.map((u, idx) => (
                <UnsurTableRow
                  key={u.id}
                  unsur={u}
                  index={idx}
                  onNavigateToPertanyaan={(unsurId) =>
                    router.push(`/admin/pertanyaan?unsur_id=${unsurId}`)
                  }
                  onEdit={openEdit}
                  onDelete={setDeleteDialog}
                />
              ))}

              {filteredList.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-12 text-center text-slate-400"
                  >
                    <Layers className="size-10 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-medium">
                      Tidak ada unsur penilaian ditemukan
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modular Form Modal */}
      <UnsurFormModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        saving={saving}
        onSubmit={onSubmit}
      />

      {/* Modular Delete Dialog */}
      <UnsurDeleteDialog
        unsur={deleteDialog}
        deleting={deleting}
        onOpenChange={(open) => {
          if (!open) setDeleteDialog(null);
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
