import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Users, Loader2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import type { DemographicField } from "@/types";

export const fieldSchema = z.object({
  field_key: z.string().min(1, "Field key wajib diisi"),
  label_id: z.string().min(1, "Label (ID) wajib diisi"),
  label_en: z.string().min(1, "Label (EN) wajib diisi"),
  field_type: z.enum(["select", "checkbox", "toggle", "text", "number"]),
  is_required: z.boolean(),
  sort_order: z.number().int().min(0),
  is_active: z.boolean(),
});

export type FieldFormData = z.infer<typeof fieldSchema>;

interface DemografiFieldModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: DemographicField | null;
  saving: boolean;
  onSubmit: (data: FieldFormData) => Promise<void>;
}

export function DemografiFieldModal({
  open,
  onOpenChange,
  editing,
  saving,
  onSubmit,
}: DemografiFieldModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<FieldFormData>({
    resolver: zodResolver(fieldSchema),
    defaultValues: {
      field_key: "",
      label_id: "",
      label_en: "",
      field_type: "select",
      is_required: true,
      sort_order: 1,
      is_active: true,
    },
  });

  const fieldType = useWatch({ control, name: "field_type" });
  const isRequired = useWatch({ control, name: "is_required" });
  const isActive = useWatch({ control, name: "is_active" });

  useEffect(() => {
    if (open) {
      if (editing) {
        reset({
          field_key: editing.field_key,
          label_id: editing.label_id,
          label_en: editing.label_en,
          field_type: editing.field_type,
          is_required: editing.is_required,
          sort_order: editing.sort_order,
          is_active: editing.is_active,
        });
      } else {
        reset({
          field_key: "",
          label_id: "",
          label_en: "",
          field_type: "select",
          is_required: true,
          sort_order: 1,
          is_active: true,
        });
      }
    }
  }, [open, editing, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-3xl p-0 overflow-hidden border border-slate-200 shadow-2xl">
        <div className="bg-gradient-to-r from-emerald-800 to-teal-700 p-6 text-white space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md text-white">
              <Users className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-extrabold text-white">
                {editing
                  ? "Ubah Field Demografi"
                  : "Tambah Field Demografi Baru"}
              </DialogTitle>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="p-6 space-y-4 bg-white dark:bg-gray-900"
        >
          <div className="space-y-1.5">
            <Label htmlFor="field_key" className="text-xs font-bold text-slate-700">
              Field Key (Identifier Database)
            </Label>
            <Input
              id="field_key"
              placeholder="Contoh: jenis_kelamin, pendidikan, pekerjaan"
              {...register("field_key")}
              className="rounded-xl font-mono text-xs"
            />
            {errors.field_key && (
              <p className="text-xs font-medium text-rose-500 mt-1">
                {errors.field_key.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="label_id" className="text-xs font-bold text-slate-700">
              Label Pertanyaan (Bahasa Indonesia)
            </Label>
            <Input
              id="label_id"
              placeholder="Contoh: Jenis Kelamin"
              {...register("label_id")}
              className="rounded-xl text-xs sm:text-sm"
            />
            {errors.label_id && (
              <p className="text-xs font-medium text-rose-500 mt-1">
                {errors.label_id.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="label_en" className="text-xs font-bold text-slate-700">
              Label Pertanyaan (Bahasa Inggris)
            </Label>
            <Input
              id="label_en"
              placeholder="Contoh: Gender"
              {...register("label_en")}
              className="rounded-xl text-xs sm:text-sm"
            />
            {errors.label_en && (
              <p className="text-xs font-medium text-rose-500 mt-1">
                {errors.label_en.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">
              Tipe Input Field
            </Label>
            <Select
              value={fieldType}
              onValueChange={(val) => {
                if (val) setValue("field_type", val as FieldFormData["field_type"]);
              }}
            >
              <SelectTrigger className="w-full rounded-xl border-slate-200 text-xs sm:text-sm font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                <SelectItem value="select">Dropdown (Pilihan Tunggal)</SelectItem>
                <SelectItem value="checkbox">Checkbox (Multi Pilihan)</SelectItem>
                <SelectItem value="toggle">Toggle (Ya/Tidak)</SelectItem>
                <SelectItem value="text">Teks Bebas</SelectItem>
                <SelectItem value="number">Angka</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sort_order" className="text-xs font-bold text-slate-700">
              Urutan Tampil
            </Label>
            <Input
              id="sort_order"
              type="number"
              {...register("sort_order", { valueAsNumber: true })}
              className="rounded-xl text-xs sm:text-sm"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <div>
              <Label htmlFor="is_required" className="text-xs font-bold text-slate-800 cursor-pointer">
                Wajib Diisi (Mandatory)
              </Label>
              <p className="text-[11px] text-slate-500">
                Responden tidak dapat mengirim survei jika field ini kosong.
              </p>
            </div>
            <Switch
              id="is_required"
              checked={isRequired}
              onCheckedChange={(val) => setValue("is_required", val)}
            />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100">
            <div>
              <Label htmlFor="is_active" className="text-xs font-bold text-emerald-900 cursor-pointer">
                Status Publikasi Field
              </Label>
              <p className="text-[11px] text-emerald-700">
                Tampilkan pertanyaan ini di formulir kuesioner publik.
              </p>
            </div>
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={(val) => setValue("is_active", val)}
            />
          </div>

          <DialogFooter className="pt-4 border-t border-slate-100 flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline" className="rounded-xl font-bold text-xs">
                Batal
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs px-5 shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              {saving ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
              {editing ? "Simpan Perubahan" : "Tambah Field"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
