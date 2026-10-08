import { useState, useEffect } from "react";
import {
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { invalidateClientCache } from "@/lib/data-cache";
import type { DemographicField, DemographicOption } from "@/types";

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
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableOptionItem({
  opt,
  onEditOption,
  onDeleteOption,
}: {
  opt: DemographicOption;
  onEditOption: (opt: DemographicOption) => void;
  onDeleteOption: (optionId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: opt.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 0,
    position: "relative" as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/60 p-3 text-xs hover:bg-slate-100/80 transition-colors ${
        isDragging
          ? "bg-blue-100 border-blue-300 shadow-lg ring-2 ring-blue-500/30"
          : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing transition-colors inline-flex items-center justify-center"
          title="Geser untuk mengatur urutan"
        >
          <GripVertical className="size-4" />
        </button>
        <span className="font-mono text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
          #{opt.sort_order}
        </span>
        <div>
          <p className="font-bold text-slate-900">{opt.label_id}</p>
          <p className="text-[11px] text-slate-400 italic">
            {opt.label_en || opt.value}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onEditOption(opt)}
          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
          title="Edit Opsi"
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onDeleteOption(opt.id)}
          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
          title="Hapus Opsi"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

interface DemografiOptionsModalProps {
  field: DemographicField | null;
  onClose: () => void;
  onRefreshFields: () => void;
}

export function DemografiOptionsModal({
  field,
  onClose,
  onRefreshFields,
}: DemografiOptionsModalProps) {
  const [options, setOptions] = useState<DemographicOption[]>([]);
  const [editingOption, setEditingOption] = useState<DemographicOption | null>(null);
  const [addingOpt, setAddingOpt] = useState(false);
  const [newOptValue, setNewOptValue] = useState("");
  const [newOptLabelId, setNewOptLabelId] = useState("");
  const [newOptLabelEn, setNewOptLabelEn] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (field) {
      setEditingOption(null);
      setNewOptValue("");
      setNewOptLabelId("");
      setNewOptLabelEn("");
      apiFetch<DemographicOption[]>(`/admin/demographics/${field.id}/options`)
        .then((data) => setOptions(Array.isArray(data) ? data : []))
        .catch(() => setOptions([]));
    }
  }, [field]);

  function openEditOption(opt: DemographicOption) {
    setEditingOption(opt);
    setNewOptValue(opt.value);
    setNewOptLabelId(opt.label_id);
    setNewOptLabelEn(opt.label_en);
  }

  function cancelEditOption() {
    setEditingOption(null);
    setNewOptValue("");
    setNewOptLabelId("");
    setNewOptLabelEn("");
  }

  async function handleAddOptionSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!field) return;
    if (!newOptValue || !newOptLabelId) {
      toast.error("Nilai & Label Indonesia wajib diisi");
      return;
    }
    setAddingOpt(true);

    try {
      if (editingOption) {
        await apiFetch(`/admin/demographics/options/${editingOption.id}`, {
          method: "PUT",
          body: JSON.stringify({
            value: newOptValue,
            label_id: newOptLabelId,
            label_en: newOptLabelEn || newOptLabelId,
            sort_order: editingOption.sort_order,
          }),
        });
        toast.success("Opsi berhasil diperbarui");
        setEditingOption(null);
      } else {
        await apiFetch("/admin/demographics/options", {
          method: "POST",
          body: JSON.stringify({
            field_id: field.id,
            value: newOptValue,
            label_id: newOptLabelId,
            label_en: newOptLabelEn || newOptLabelId,
            sort_order: options.length,
          }),
        });
        toast.success("Opsi berhasil ditambahkan");
      }

      setNewOptValue("");
      setNewOptLabelId("");
      setNewOptLabelEn("");

      const data = await apiFetch<DemographicOption[]>(
        `/admin/demographics/${field.id}/options`
      );
      setOptions(Array.isArray(data) ? data : []);
      onRefreshFields();
    } catch {
      toast.error("Gagal menyimpan opsi");
    } finally {
      setAddingOpt(false);
    }
  }

  async function deleteOption(optionId: string) {
    if (!field) return;
    const prevOptions = [...options];
    setOptions((prev) => prev.filter((o) => o.id !== optionId));
    try {
      await apiFetch(`/admin/demographics/options/${optionId}`, {
        method: "DELETE",
      });
      toast.success("Opsi berhasil dihapus");
      if (editingOption?.id === optionId) {
        cancelEditOption();
      }
      invalidateClientCache();
      const data = await apiFetch<DemographicOption[]>(
        `/admin/demographics/${field.id}/options`
      );
      setOptions(Array.isArray(data) ? data : []);
      onRefreshFields();
    } catch {
      setOptions(prevOptions);
      toast.error("Gagal menghapus opsi");
    }
  }

  async function handleOptionDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = options.findIndex((o) => o.id === active.id);
      const newIndex = options.findIndex((o) => o.id === over.id);
      const reordered = arrayMove(options, oldIndex, newIndex);
      setOptions(reordered);
      toast.success("Urutan opsi diperbarui");
    }
  }

  return (
    <Dialog open={!!field} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl rounded-3xl p-0 overflow-hidden border border-slate-200 shadow-2xl">
        <div className="bg-gradient-to-r from-blue-800 to-indigo-700 p-6 text-white space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md text-white">
              <Sparkles className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-extrabold text-white">
                Kelola Opsi Pilihan
              </DialogTitle>
              <p className="text-xs text-blue-100 font-medium">
                Field: &ldquo;<strong className="text-white">{field?.label_id}</strong>&rdquo; ({field?.field_type})
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5 bg-white dark:bg-gray-900">
          <form
            onSubmit={handleAddOptionSubmit}
            className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80"
          >
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {editingOption ? "Edit Opsi Pilihan" : "Tambah Opsi Baru"}
              </h5>
              {editingOption && (
                <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md font-bold">
                  Mode Edit: {editingOption.value}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-600">
                  Value (Data)
                </Label>
                <Input
                  placeholder="Contoh: L / Ya / S1"
                  value={newOptValue}
                  onChange={(e) => setNewOptValue(e.target.value)}
                  className="rounded-xl text-xs bg-white"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-600">
                  Label (Indonesia)
                </Label>
                <Input
                  placeholder="Contoh: Laki-laki / S1"
                  value={newOptLabelId}
                  onChange={(e) => setNewOptLabelId(e.target.value)}
                  className="rounded-xl text-xs bg-white"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-600">
                  Label (English)
                </Label>
                <Input
                  placeholder="Contoh: Male / Bachelor"
                  value={newOptLabelEn}
                  onChange={(e) => setNewOptLabelEn(e.target.value)}
                  className="rounded-xl text-xs bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              {editingOption && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={cancelEditOption}
                  className="rounded-xl text-xs font-bold h-9 px-3"
                >
                  Batal Edit
                </Button>
              )}
              <Button
                type="submit"
                disabled={addingOpt}
                className={`${
                  editingOption
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                } text-white font-bold rounded-xl text-xs h-9 px-4 cursor-pointer shadow-xs`}
              >
                {addingOpt ? (
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                ) : editingOption ? (
                  <Pencil className="size-3.5 mr-1.5" />
                ) : (
                  <Plus className="size-3.5 mr-1.5" />
                )}
                {editingOption ? "Simpan Edit Opsi" : "Tambah Opsi"}
              </Button>
            </div>
          </form>

          <div className="space-y-2">
            <h5 className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Daftar Opsi Tersedia ({options.length})</span>
              <span className="text-[10px] text-slate-400 font-normal">
                Geser ikon titik-titik untuk mengubah urutan
              </span>
            </h5>

            {options.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                Belum ada opsi pilihan ditambahkan.
              </p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleOptionDragEnd}
              >
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  <SortableContext
                    items={options.map((o) => o.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {options.map((opt) => (
                      <SortableOptionItem
                        key={opt.id}
                        opt={opt}
                        onEditOption={openEditOption}
                        onDeleteOption={deleteOption}
                      />
                    ))}
                  </SortableContext>
                </div>
              </DndContext>
            )}
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100">
            <DialogClose asChild>
              <Button variant="outline" className="rounded-xl font-bold text-xs">
                Selesai
              </Button>
            </DialogClose>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
