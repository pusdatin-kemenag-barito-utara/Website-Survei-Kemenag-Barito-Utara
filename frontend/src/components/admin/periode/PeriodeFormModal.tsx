import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Calendar,
  CheckCircle2,
  Sparkles,
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { SurveyPeriod } from "@/types";

export const periodSchema = z.object({
  period_type: z.enum(["triwulan", "semester", "tahunan"]),
  label: z.string().min(1, "Label wajib diisi"),
  start_date: z.string().min(1, "Tanggal mulai wajib diisi"),
  end_date: z.string().min(1, "Tanggal selesai wajib diisi"),
  is_active: z.boolean(),
});

export type PeriodFormData = z.infer<typeof periodSchema>;

interface PeriodeFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: SurveyPeriod | null;
  saving: boolean;
  onSubmit: (data: PeriodFormData) => Promise<void>;
}

export function PeriodeFormModal({
  open,
  onOpenChange,
  editing,
  saving,
  onSubmit,
}: PeriodeFormModalProps) {
  const [autoYear, setAutoYear] = useState<number>(new Date().getFullYear());
  const [autoPart, setAutoPart] = useState<string>("1");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<PeriodFormData>({
    resolver: zodResolver(periodSchema),
    defaultValues: {
      period_type: "triwulan",
      label: "",
      start_date: "",
      end_date: "",
      is_active: false,
    },
  });

  const pt = useWatch({ control, name: "period_type" });
  const isActiveForm = useWatch({ control, name: "is_active" });
  const startDateForm = useWatch({ control, name: "start_date" });
  const endDateForm = useWatch({ control, name: "end_date" });

  useEffect(() => {
    if (open) {
      if (editing) {
        reset({
          period_type: editing.period_type,
          label: editing.label,
          start_date: editing.start_date ? editing.start_date.split("T")[0] : "",
          end_date: editing.end_date ? editing.end_date.split("T")[0] : "",
          is_active: editing.is_active || false,
        });
      } else {
        reset({
          period_type: "triwulan",
          label: "",
          start_date: "",
          end_date: "",
          is_active: false,
        });
      }
    }
  }, [open, editing, reset]);

  function handleAutoGenerate() {
    const year = autoYear;
    const part = parseInt(autoPart, 10);

    let label = "";
    let start = "";
    let end = "";

    if (pt === "triwulan") {
      const romans = ["I", "II", "III", "IV"];
      label = `Triwulan ${romans[part - 1]} Tahun ${year}`;
      if (part === 1) {
        start = `${year}-01-01`;
        end = `${year}-03-31`;
      }
      if (part === 2) {
        start = `${year}-04-01`;
        end = `${year}-06-30`;
      }
      if (part === 3) {
        start = `${year}-07-01`;
        end = `${year}-09-30`;
      }
      if (part === 4) {
        start = `${year}-10-01`;
        end = `${year}-12-31`;
      }
    } else if (pt === "semester") {
      const romans = ["I", "II"];
      label = `Semester ${romans[part - 1]} Tahun ${year}`;
      if (part === 1) {
        start = `${year}-01-01`;
        end = `${year}-06-30`;
      }
      if (part === 2) {
        start = `${year}-07-01`;
        end = `${year}-12-31`;
      }
    } else if (pt === "tahunan") {
      label = `Tahun ${year}`;
      start = `${year}-01-01`;
      end = `${year}-12-31`;
    }

    setValue("label", label);
    setValue("start_date", start);
    setValue("end_date", end);
    toast.success("Form terisi otomatis");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-3xl p-0 overflow-hidden border border-slate-200 shadow-2xl">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-700 p-6 text-white space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md text-white">
              <Calendar className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-extrabold text-white">
                {editing ? "Ubah Periode Survei" : "Tambah Periode Survei Baru"}
              </DialogTitle>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="p-6 space-y-4 bg-white dark:bg-gray-900"
        >
          {/* Status Switch Box */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80">
            <div>
              <Label
                htmlFor="is_active"
                className="text-xs font-bold text-emerald-950 dark:text-emerald-200 cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="size-4 text-emerald-600" />
                <span>Tetapkan Sebagai Periode Aktif Utama</span>
              </Label>
              <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
                Mengaktifkan periode ini akan menonaktifkan periode lain secara otomatis.
              </p>
            </div>
            <Switch
              id="is_active"
              checked={isActiveForm}
              onCheckedChange={(val) => setValue("is_active", val)}
            />
          </div>

          {/* Tipe Periode */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Tipe Periode
            </Label>
            <Select
              value={pt}
              onValueChange={(v) => {
                if (v) {
                  setValue("period_type", v as "triwulan" | "semester" | "tahunan");
                  setAutoPart("1");
                }
              }}
            >
              <SelectTrigger className="w-full rounded-xl border-slate-200 text-xs sm:text-sm font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                <SelectItem value="triwulan" className="rounded-xl">
                  Triwulan (3 Bulanan)
                </SelectItem>
                <SelectItem value="semester" className="rounded-xl">
                  Semester (6 Bulanan)
                </SelectItem>
                <SelectItem value="tahunan" className="rounded-xl">
                  Tahunan (1 Tahun)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Auto Generator Box */}
          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-3">
            <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
              <Sparkles className="size-4 text-blue-600" />
              <span>Pengisi Otomatis (Auto Generator)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-600">
                  Tahun
                </Label>
                <Input
                  type="number"
                  value={autoYear}
                  onChange={(e) =>
                    setAutoYear(
                      parseInt(e.target.value, 10) || new Date().getFullYear()
                    )
                  }
                  className="rounded-xl bg-white text-xs font-bold h-9"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[11px] font-bold text-slate-600">
                  Pilihan{" "}
                  {pt === "triwulan"
                    ? "Triwulan"
                    : pt === "semester"
                    ? "Semester"
                    : "Tahun"}
                </Label>
                <div className="flex gap-2">
                  <Select
                    value={autoPart}
                    onValueChange={(v) => v && setAutoPart(v)}
                  >
                    <SelectTrigger className="flex-1 rounded-xl bg-white text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {pt === "triwulan" && (
                        <>
                          <SelectItem value="1">
                            Triwulan I (Jan - Mar)
                          </SelectItem>
                          <SelectItem value="2">
                            Triwulan II (Apr - Jun)
                          </SelectItem>
                          <SelectItem value="3">
                            Triwulan III (Jul - Sep)
                          </SelectItem>
                          <SelectItem value="4">
                            Triwulan IV (Okt - Des)
                          </SelectItem>
                        </>
                      )}
                      {pt === "semester" && (
                        <>
                          <SelectItem value="1">
                            Semester I (Jan - Jun)
                          </SelectItem>
                          <SelectItem value="2">
                            Semester II (Jul - Des)
                          </SelectItem>
                        </>
                      )}
                      {pt === "tahunan" && (
                        <SelectItem value="1">Satu Tahun Penuh</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    onClick={handleAutoGenerate}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-9 px-3 shrink-0 cursor-pointer shadow-xs"
                  >
                    Generate
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Label Input */}
          <div className="space-y-1.5">
            <Label htmlFor="label" className="text-xs font-bold text-slate-700">
              Label Periode
            </Label>
            <Input
              id="label"
              placeholder="Contoh: Triwulan III Tahun 2026"
              {...register("label")}
              className="rounded-xl text-xs sm:text-sm border-slate-200"
            />
            {errors.label && (
              <p className="text-xs font-medium text-rose-500 mt-1">
                {errors.label.message}
              </p>
            )}
          </div>

          {/* Date Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="start_date"
                className="text-xs font-bold text-slate-700 dark:text-slate-200"
              >
                Tanggal Mulai
              </Label>
              <Input
                id="start_date"
                type="date"
                value={startDateForm || ""}
                onChange={(e) =>
                  setValue("start_date", e.target.value, {
                    shouldValidate: true,
                  })
                }
                className="rounded-xl text-xs sm:text-sm font-semibold border-slate-200 bg-slate-50/50 dark:bg-gray-800"
              />
              {errors.start_date && (
                <p className="text-xs font-medium text-rose-500 mt-1">
                  {errors.start_date.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="end_date"
                className="text-xs font-bold text-slate-700 dark:text-slate-200"
              >
                Tanggal Selesai
              </Label>
              <Input
                id="end_date"
                type="date"
                value={endDateForm || ""}
                onChange={(e) =>
                  setValue("end_date", e.target.value, {
                    shouldValidate: true,
                  })
                }
                className="rounded-xl text-xs sm:text-sm font-semibold border-slate-200 bg-slate-50/50 dark:bg-gray-800"
              />
              {errors.end_date && (
                <p className="text-xs font-medium text-rose-500 mt-1">
                  {errors.end_date.message}
                </p>
              )}
            </div>
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
              {saving ? (
                <Loader2 className="size-4 animate-spin mr-1.5" />
              ) : null}
              {editing ? "Simpan Perubahan" : "Tambah Periode"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
