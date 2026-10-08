import { useEffect, useState } from "react";
import { Plus, Loader2, Users, Search } from "lucide-react";
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
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import {
  fetchCachedAdminDemographics,
  getCachedAdminDemographicsSync,
  invalidateClientCache,
} from "@/lib/data-cache";
import type { DemographicField } from "@/types";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { SortableFieldRow } from "@/components/admin/demografi/SortableFieldRow";
import { DemografiDeleteDialog } from "@/components/admin/demografi/DemografiDeleteDialog";
import {
  DemografiFieldModal,
  type FieldFormData,
} from "@/components/admin/demografi/DemografiFieldModal";
import { DemografiOptionsModal } from "@/components/admin/demografi/DemografiOptionsModal";

export default function AdminDemografiPage() {
  const cachedInitial = getCachedAdminDemographicsSync();
  const [fields, setFields] = useState<DemographicField[]>(() => cachedInitial || []);
  const [loading, setLoading] = useState(() => !cachedInitial || cachedInitial.length === 0);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DemographicField | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<DemographicField | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [optionsModalField, setOptionsModalField] = useState<DemographicField | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  async function fetchFields(force = false) {
    if (!force && fields.length === 0) setLoading(true);
    try {
      const data = await fetchCachedAdminDemographics(force);
      if (Array.isArray(data)) {
        setFields(data);
      }
    } catch {
      toast.error("Gagal memuat field demografi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFields();
  }, []);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(f: DemographicField) {
    setEditing(f);
    setDialogOpen(true);
  }

  async function onSubmit(data: FieldFormData) {
    setSaving(true);
    try {
      if (editing) {
        await apiFetch(`/admin/demographics/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        });
        toast.success("Field demografi berhasil diperbarui");
      } else {
        await apiFetch("/admin/demographics", {
          method: "POST",
          body: JSON.stringify(data),
        });
        toast.success("Field demografi baru berhasil ditambahkan");
      }
      setDialogOpen(false);
      invalidateClientCache();
      fetchFields(true);
    } catch {
      toast.error("Gagal menyimpan field demografi");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteDialog) return;
    const target = deleteDialog;
    setDeleting(true);
    setFields((prev) => prev.filter((f) => f.id !== target.id));
    setDeleteDialog(null);
    try {
      await apiFetch(`/admin/demographics/${target.id}`, { method: "DELETE" });
      toast.success("Field demografi berhasil dihapus");
      invalidateClientCache();
      fetchFields(true);
    } catch {
      setFields((prev) => [...prev, target]);
      toast.error("Gagal menghapus field demografi");
    } finally {
      setDeleting(false);
    }
  }

  async function handleFieldDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((f) => f.id === active.id);
      const newIndex = fields.findIndex((f) => f.id === over.id);
      const reordered = arrayMove(fields, oldIndex, newIndex);
      setFields(reordered);
      toast.success("Urutan field demografi diperbarui");
    }
  }

  const filteredFields = (Array.isArray(fields) ? fields : []).filter(
    (f) =>
      (f.label_id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.field_key || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
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
          <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/20">
            <Users className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Field Demografi Responden
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium mt-0.5">
              Kelola pertanyaan identitas responden survei (Dropdown, Ceklis, Toggle Ya/Tidak, Teks, & Angka).
            </p>
          </div>
        </div>

        <Button
          onClick={openCreate}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl px-5 py-6 shadow-md shadow-emerald-600/20 transition-all cursor-pointer w-full md:w-auto"
        >
          <Plus className="size-5" />
          <span>Tambah Field Demografi</span>
        </Button>
      </div>

      {/* Main Table Card */}
      <Card className="border border-slate-200/80 dark:border-gray-800 shadow-xl shadow-slate-200/40 dark:shadow-black/20 bg-white dark:bg-gray-900 rounded-3xl overflow-hidden">
        <CardHeader className="bg-slate-50/50 dark:bg-gray-800/40 border-b border-slate-100 dark:border-gray-800 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                Daftar Pertanyaan Demografi
              </CardTitle>
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-bold px-2.5 py-0.5 rounded-full text-xs">
                {fields.length} Field
              </Badge>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                placeholder="Cari field demografi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-xl bg-white dark:bg-gray-900 border-slate-200 dark:border-gray-700 text-xs focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleFieldDragEnd}
          >
            <Table>
              <TableHeader className="bg-slate-50/80 dark:bg-gray-800/60">
                <TableRow className="border-b border-slate-100 dark:border-gray-800">
                  <TableHead className="w-12 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Geser
                  </TableHead>
                  <TableHead className="w-12 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Urutan
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Field Key
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Label Pertanyaan
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Tipe Field
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Wajib
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="w-48 text-right text-xs font-bold text-slate-700 uppercase tracking-wider pr-6">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <SortableContext
                  items={filteredFields.map((f) => f.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {filteredFields.map((f) => (
                    <SortableFieldRow
                      key={f.id}
                      f={f}
                      onOpenOptionsModal={setOptionsModalField}
                      onEdit={openEdit}
                      onDeleteDialog={setDeleteDialog}
                    />
                  ))}
                </SortableContext>

                {filteredFields.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-slate-400">
                      <Users className="size-10 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm font-medium">
                        Tidak ada field demografi ditemukan
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DndContext>
        </CardContent>
      </Card>

      {/* Modular Field Modal */}
      <DemografiFieldModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        saving={saving}
        onSubmit={onSubmit}
      />

      {/* Modular Options Modal */}
      <DemografiOptionsModal
        field={optionsModalField}
        onClose={() => setOptionsModalField(null)}
        onRefreshFields={() => fetchFields(true)}
      />

      {/* Modular Delete Dialog */}
      <DemografiDeleteDialog
        field={deleteDialog}
        deleting={deleting}
        onOpenChange={(open) => {
          if (!open) setDeleteDialog(null);
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
