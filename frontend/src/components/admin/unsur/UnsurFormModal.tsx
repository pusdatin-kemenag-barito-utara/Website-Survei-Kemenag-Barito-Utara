import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Layers,
  Activity,
  AlignLeft,
  Hash,
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import type { Unsur } from "@/types";

export const unsurSchema = z.object({
  name: z.string().min(1, "Nama unsur wajib diisi"),
  index_type: z.enum(["IPKP", "IPAK"]),
  description: z.string().optional(),
  is_active: z.boolean(),
  sort_order: z.number().int().min(0),
});

export type UnsurFormData = z.infer<typeof unsurSchema>;

interface UnsurFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Unsur | null;
  saving: boolean;
  onSubmit: (data: UnsurFormData) => Promise<void>;
}

export function UnsurFormModal({
  open,
  onOpenChange,
  editing,
  saving,
  onSubmit,
}: UnsurFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<UnsurFormData>({
    resolver: zodResolver(unsurSchema),
    defaultValues: {
      name: "",
      index_type: "IPKP",
      description: "",
      is_active: true,
      sort_order: 0,
    },
  });

  const indexType = useWatch({ control, name: "index_type" });
  const isActive = useWatch({ control, name: "is_active" });

  useEffect(() => {
    if (open) {
      if (editing) {
        reset({
          name: editing.name,
          index_type: editing.index_type,
          description: editing.description || "",
          is_active: editing.is_active,
          sort_order: editing.sort_order,
        });
      } else {
        reset({
          name: "",
          index_type: "IPKP",
          description: "",
          is_active: true,
          sort_order: 0,
        });
      }
    }
  }, [open, editing, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-3xl p-0 overflow-hidden border border-slate-200/90 shadow-2xl">
        <div className="bg-gradient-to-r from-emerald-800 to-teal-700 p-6 text-white space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md text-white">
              <Layers className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-extrabold text-white">
                {editing ? "Ubah Unsur Penilaian" : "Tambah Unsur Penilaian Baru"}
              </DialogTitle>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="p-6 space-y-5 bg-white dark:bg-gray-900"
        >
          {/* Nama Unsur */}
          <div className="space-y-1.5">
            <Label
              htmlFor="name"
              className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
            >
              <Layers className="size-3.5 text-emerald-600" />
              Nama Unsur
            </Label>
            <Input
              id="name"
              placeholder="Contoh: Persyaratan Layanan"
              {...register("name")}
              className="rounded-xl border-slate-200 focus:ring-2 focus:ring-emerald-500/20 text-xs sm:text-sm font-medium"
            />
            {errors.name && (
              <p className="text-xs font-medium text-rose-500 mt-1">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Tipe Index */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <Activity className="size-3.5 text-emerald-600" />
              Tipe Indeks Evaluasi
            </Label>
            <Select
              value={indexType}
              onValueChange={(v) =>
                v && setValue("index_type", v as "IPKP" | "IPAK")
              }
            >
              <SelectTrigger className="w-full rounded-xl border-slate-200 text-xs sm:text-sm font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl p-1.5">
                <SelectItem value="IPKP" className="rounded-xl cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-700">IPKP</span>
                    <span className="text-slate-400 text-xs">
                      - Indeks Kualitas Pelayanan
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="IPAK" className="rounded-xl cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-indigo-700">IPAK</span>
                    <span className="text-slate-400 text-xs">
                      - Indeks Anti Korupsi
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Deskripsi */}
          <div className="space-y-1.5">
            <Label
              htmlFor="description"
              className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
            >
              <AlignLeft className="size-3.5 text-emerald-600" />
              Deskripsi Unsur
            </Label>
            <Textarea
              id="description"
              rows={3}
              placeholder="Penjelasan indikator unsur ini..."
              {...register("description")}
              className="rounded-xl border-slate-200 focus:ring-2 focus:ring-emerald-500/20 text-xs sm:text-sm"
            />
          </div>

          {/* Row: Status & Urutan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100">
              <div className="space-y-0.5">
                <Label
                  htmlFor="is_active"
                  className="text-xs font-bold text-emerald-900 cursor-pointer"
                >
                  Status Aktif
                </Label>
                <p className="text-[10px] text-emerald-700">
                  Tampil di kuesioner
                </p>
              </div>
              <Switch
                id="is_active"
                checked={isActive}
                onCheckedChange={(v) => setValue("is_active", v)}
              />
            </div>

            <div className="space-y-1 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <Label
                htmlFor="sort_order"
                className="text-xs font-bold text-slate-700 flex items-center gap-1"
              >
                <Hash className="size-3 text-slate-400" />
                Urutan Tampil
              </Label>
              <Input
                id="sort_order"
                type="number"
                {...register("sort_order", { valueAsNumber: true })}
                className="rounded-xl border-slate-200 text-xs font-bold"
              />
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-slate-100 flex justify-end gap-2">
            <DialogClose asChild>
              <Button
                variant="outline"
                className="rounded-xl font-bold text-xs"
              >
                Batal
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs px-5 shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin mr-1.5" />
              ) : null}
              {editing ? "Simpan Perubahan" : "Tambah Unsur"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
