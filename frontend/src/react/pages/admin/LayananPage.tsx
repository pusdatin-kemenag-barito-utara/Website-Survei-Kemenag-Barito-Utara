import { useEffect, useState } from "react";
import { Plus, Loader2, FileText, Search, ChevronDown } from "lucide-react";
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
  fetchCachedAdminServices,
  getCachedAdminServicesSync,
  invalidateClientCache,
} from "@/lib/data-cache";
import type { Service, ServiceCategory } from "@/types";

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

import { SortableServiceRow } from "@/components/admin/layanan/SortableServiceRow";
import { ServiceDeleteDialog } from "@/components/admin/layanan/ServiceDeleteDialog";
import {
  ServiceFormModal,
  sluggify,
  type ServiceFormData,
} from "@/components/admin/layanan/ServiceFormModal";

export default function AdminLayananPage() {
  const cachedInitial = getCachedAdminServicesSync();
  const [services, setServices] = useState<Service[]>(() => cachedInitial || []);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(() => !cachedInitial);
  const [searchQuery, setSearchQuery] = useState("");
  const [displayCount, setDisplayCount] = useState(15);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<Service | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch Services
  async function fetchServices(force = false) {
    try {
      const data = await fetchCachedAdminServices(force);
      setServices(data || []);
    } catch (err) {
      console.error("Fetch services error:", err);
    } finally {
      setLoading(false);
    }
  }

  // Fetch Service Categories from API with fallback
  async function fetchCategories() {
    try {
      const data = await apiFetch<ServiceCategory[]>("/admin/service-categories");
      if (Array.isArray(data) && data.length > 0) {
        setCategories(data);
        return;
      }
    } catch {
      try {
        const res = await apiFetch<{ categories?: ServiceCategory[] }>("/survey/services");
        if (res?.categories && Array.isArray(res.categories)) {
          setCategories(res.categories);
        }
      } catch (err) {
        console.warn("Fetch categories fallback error:", err);
      }
    }
  }

  // Save category to backend
  async function saveCategoryToBackend(catName: string) {
    const trimmed = catName.trim();
    if (!trimmed) return;
    try {
      const created = await apiFetch<ServiceCategory>("/admin/service-categories", {
        method: "POST",
        body: JSON.stringify({ name: trimmed }),
      });
      if (created?.id) {
        setCategories((prev) => [...prev, created]);
      }
    } catch {
      // Handled silently
    }
  }

  useEffect(() => {
    fetchServices();
    fetchCategories();
  }, []);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = services.findIndex((s) => s.id === active.id);
      const newIndex = services.findIndex((s) => s.id === over.id);
      const reordered = arrayMove(services, oldIndex, newIndex);
      setServices(reordered);
      toast.success("Urutan layanan diperbarui");
    }
  }

  function openCreate() {
    setEditing(null);
    fetchCategories();
    setDialogOpen(true);
  }

  function openEdit(s: Service) {
    setEditing(s);
    fetchCategories();
    setDialogOpen(true);
  }

  async function onSubmit(data: ServiceFormData) {
    const cleanSlug = sluggify(data.slug);
    if (!cleanSlug) {
      toast.error("URL Slug wajib diisi");
      return;
    }

    const dup = services.find(
      (s) =>
        s.id !== editing?.id &&
        s.slug.trim().toLowerCase() === cleanSlug.toLowerCase()
    );
    if (dup) {
      toast.error(
        `Slug "${cleanSlug}" sudah dipakai oleh layanan "${dup.name}". Mohon gunakan slug yang unik.`
      );
      return;
    }

    setSaving(true);
    try {
      const desc = data.description?.trim() || null;
      const payload = {
        name: data.name.trim(),
        slug: cleanSlug,
        description: desc,
        is_active: data.is_active,
      };

      if (editing) {
        await apiFetch(`/admin/services/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success("Layanan berhasil diperbarui");
      } else {
        await apiFetch("/admin/services", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Layanan baru berhasil ditambahkan");
      }

      if (desc) {
        const exists = categories.some(
          (c) => c.name.toLowerCase() === desc.toLowerCase()
        );
        if (!exists) {
          saveCategoryToBackend(desc);
        }
      }

      invalidateClientCache();
      setDialogOpen(false);
      await fetchServices(true);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Gagal menyimpan layanan";
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteDialog) return;
    const target = deleteDialog;
    setDeleting(true);
    setServices((prev) => prev.filter((s) => s.id !== target.id));
    setDeleteDialog(null);
    try {
      await apiFetch(`/admin/services/${target.id}`, {
        method: "DELETE",
      });
      toast.success("Layanan berhasil dihapus");
      invalidateClientCache();
      fetchServices(true);
    } catch (err: unknown) {
      setServices((prev) => [...prev, target]);
      const errorMsg = err instanceof Error ? err.message : "Error server";
      toast.error("Gagal menghapus layanan: " + errorMsg);
    } finally {
      setDeleting(false);
    }
  }

  const filteredServices = services.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description &&
        s.description.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const visibleServices = filteredServices.slice(0, displayCount);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header Banner Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-slate-200/80 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
            <FileText className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Kelola Layanan PTSP
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium mt-0.5">
              Kelola daftar layanan publik yang dapat dinilai oleh responden pada survei.
            </p>
          </div>
        </div>

        <Button
          onClick={openCreate}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl px-5 py-6 shadow-md shadow-emerald-600/20 transition-all cursor-pointer w-full md:w-auto"
        >
          <Plus className="size-5" />
          <span>Tambah Layanan</span>
        </Button>
      </div>

      {/* Main Table Card */}
      <Card className="border border-slate-200/80 dark:border-gray-800 shadow-xl shadow-slate-200/40 dark:shadow-black/20 bg-white dark:bg-gray-900 rounded-3xl overflow-hidden">
        <CardHeader className="bg-slate-50/50 dark:bg-gray-800/40 border-b border-slate-100 dark:border-gray-800 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                Daftar Layanan
              </CardTitle>
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-bold px-2.5 py-0.5 rounded-full text-xs">
                {services.length} Layanan
              </Badge>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                placeholder="Cari layanan..."
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
            onDragEnd={handleDragEnd}
          >
            <Table>
              <TableHeader className="bg-slate-50/80 dark:bg-gray-800/60">
                <TableRow className="border-b border-slate-100 dark:border-gray-800">
                  <TableHead className="w-12 text-center"></TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Nama Layanan
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    URL Slug
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Bidang / Deskripsi
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="w-24 text-right text-xs font-bold text-slate-700 uppercase tracking-wider pr-6">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <SortableContext
                  items={visibleServices.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {visibleServices.map((service) => (
                    <SortableServiceRow
                      key={service.id}
                      service={service}
                      onEdit={openEdit}
                      onDeleteDialog={setDeleteDialog}
                    />
                  ))}
                </SortableContext>

                {filteredServices.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-12 text-center text-slate-400"
                    >
                      <FileText className="size-10 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm font-medium">
                        Tidak ada layanan ditemukan
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DndContext>

          {/* Load More Button */}
          {visibleServices.length < filteredServices.length && (
            <div className="flex flex-col items-center justify-center p-5 border-t border-slate-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/30 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDisplayCount((prev) => prev + 10)}
                className="rounded-2xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/50 font-bold text-xs px-6 py-2.5 shadow-xs cursor-pointer flex items-center gap-2 transition-all"
              >
                <ChevronDown className="size-4 text-emerald-600 animate-bounce" />
                <span>
                  Muat Lebih Banyak ({filteredServices.length - visibleServices.length} Layanan Tersisa)
                </span>
              </Button>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Menampilkan{" "}
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {visibleServices.length}
                </span>{" "}
                dari total{" "}
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {filteredServices.length}
                </span>{" "}
                layanan
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modular Form Modal */}
      <ServiceFormModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        services={services}
        categories={categories}
        saving={saving}
        onSubmit={onSubmit}
      />

      {/* Modular Delete Dialog */}
      <ServiceDeleteDialog
        service={deleteDialog}
        deleting={deleting}
        onOpenChange={(open) => {
          if (!open) setDeleteDialog(null);
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
