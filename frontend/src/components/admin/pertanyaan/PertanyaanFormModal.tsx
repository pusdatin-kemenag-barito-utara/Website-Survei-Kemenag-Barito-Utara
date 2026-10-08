import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  HelpCircle,
  Sparkles,
  Loader2,
  Smile,
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
import { toast } from "sonner";
import type { Question, Unsur, Service } from "@/types";

export const questionSchema = z.object({
  unsur_id: z.string().min(1, "Unsur wajib dipilih"),
  service_id: z.string().optional(),
  question_text_id: z.string().min(1, "Teks pertanyaan (ID) wajib diisi"),
  question_text_en: z.string().min(1, "Teks pertanyaan (EN) wajib diisi"),
  input_type: z.enum(["star_rating"]),
  label_4: z.string().min(1, "Label nilai 4 wajib diisi"),
  label_3: z.string().min(1, "Label nilai 3 wajib diisi"),
  label_2: z.string().min(1, "Label nilai 2 wajib diisi"),
  label_1: z.string().min(1, "Label nilai 1 wajib diisi"),
  is_active: z.boolean(),
  sort_order: z.number().int().min(0),
});

export type QuestionFormData = z.infer<typeof questionSchema>;

export function extractCleanId(val: unknown): string {
  if (!val) return "";
  if (typeof val === "string") {
    if (val.startsWith("{")) {
      try {
        const parsed = JSON.parse(val);
        return String(parsed.id || parsed.original_id || "");
      } catch {
        // Fallback
      }
    }
    return val;
  }
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    return String(obj.id || obj.original_id || "");
  }
  return String(val);
}

interface PertanyaanFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Question | null;
  unsurList: Unsur[];
  services: Service[];
  saving: boolean;
  onSubmit: (data: QuestionFormData) => Promise<void>;
}

export function PertanyaanFormModal({
  open,
  onOpenChange,
  editing,
  unsurList,
  services,
  saving,
  onSubmit,
}: PertanyaanFormModalProps) {
  const [translating, setTranslating] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<QuestionFormData>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      unsur_id: "",
      service_id: undefined,
      question_text_id: "",
      question_text_en: "",
      input_type: "star_rating",
      label_4: "Sangat Puas",
      label_3: "Puas",
      label_2: "Kurang Puas",
      label_1: "Tidak Puas",
      is_active: true,
      sort_order: 1,
    },
  });

  const unsurId = useWatch({ control, name: "unsur_id" });
  const isActive = useWatch({ control, name: "is_active" });
  const serviceId = useWatch({ control, name: "service_id" });
  const questionTextId = useWatch({ control, name: "question_text_id" });

  useEffect(() => {
    if (open) {
      if (editing) {
        reset({
          unsur_id: extractCleanId(editing.unsur_id) || extractCleanId(editing.unsur?.id),
          service_id: editing.service_id || undefined,
          question_text_id: editing.question_text_id,
          question_text_en: editing.question_text_en,
          input_type: "star_rating",
          label_4: editing.label_4 || editing.rating_labels?.["4"] || "Sangat Puas",
          label_3: editing.label_3 || editing.rating_labels?.["3"] || "Puas",
          label_2: editing.label_2 || editing.rating_labels?.["2"] || "Kurang Puas",
          label_1: editing.label_1 || editing.rating_labels?.["1"] || "Tidak Puas",
          is_active: editing.is_active,
          sort_order: editing.sort_order,
        });
      } else {
        reset({
          unsur_id: unsurList[0]?.id || "",
          service_id: undefined,
          question_text_id: "",
          question_text_en: "",
          input_type: "star_rating",
          label_4: "Sangat Puas",
          label_3: "Puas",
          label_2: "Kurang Puas",
          label_1: "Tidak Puas",
          is_active: true,
          sort_order: 1,
        });
      }
    }
  }, [open, editing, reset, unsurList]);

  const handleAutoTranslate = async () => {
    if (!questionTextId || questionTextId.trim().length === 0) {
      toast.error("Silakan isi Teks Pertanyaan (Bahasa Indonesia) terlebih dahulu.");
      return;
    }
    setTranslating(true);
    try {
      const res = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=id&tl=en&dt=t&q=${encodeURIComponent(
          questionTextId.trim()
        )}`
      );
      const data = await res.json();
      if (data && Array.isArray(data[0])) {
        const translated = data[0].map((item: unknown[]) => item[0]).join("");
        setValue("question_text_en", translated, { shouldValidate: true });
        toast.success("Berhasil diterjemahkan ke Bahasa Inggris!");
      }
    } catch {
      toast.error("Gagal menerjemahkan teks secara otomatis.");
    } finally {
      setTranslating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl sm:max-w-5xl w-[90vw] max-h-[88vh] my-auto rounded-3xl p-0 overflow-hidden border border-slate-200/90 dark:border-gray-800 shadow-2xl flex flex-col">
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 p-5 sm:p-6 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md text-white shadow-inner">
              <HelpCircle className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-extrabold text-white">
                {editing
                  ? "Ubah Pertanyaan Evaluasi"
                  : "Tambah Pertanyaan Evaluasi Baru"}
              </DialogTitle>
              <p className="text-xs text-emerald-200/90 font-medium mt-0.5">
                Konfigurasi teks kuesioner, indikator unsur target, spesifikasi layanan, dan skala label emote.
              </p>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="p-6 sm:p-8 space-y-6 bg-white dark:bg-gray-900 overflow-y-auto max-h-[calc(88vh-130px)]"
        >
          {/* Teks Pertanyaan Grid (ID & EN) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Teks Pertanyaan (Indonesia) */}
            <div className="space-y-2">
              <Label
                htmlFor="question_text_id"
                className="text-xs font-bold text-slate-700 dark:text-slate-200"
              >
                Teks Pertanyaan (Bahasa Indonesia){" "}
                <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                id="question_text_id"
                rows={3}
                placeholder="Bagaimana pendapat Saudara/i tentang kesesuaian persyaratan..."
                {...register("question_text_id")}
                className="rounded-2xl border-slate-200 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-emerald-500/20 leading-relaxed"
              />
              {errors.question_text_id && (
                <p className="text-xs font-medium text-rose-500">
                  {errors.question_text_id.message}
                </p>
              )}
            </div>

            {/* Teks Pertanyaan (English) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label
                  htmlFor="question_text_en"
                  className="text-xs font-bold text-slate-700 dark:text-slate-200"
                >
                  Teks Pertanyaan (Bahasa Inggris){" "}
                  <span className="text-rose-500">*</span>
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAutoTranslate}
                  disabled={translating}
                  className="h-7 px-2.5 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {translating ? (
                    <Loader2 className="size-3 animate-spin text-emerald-600" />
                  ) : (
                    <Sparkles className="size-3 text-emerald-600" />
                  )}
                  <span>
                    {translating ? "Menerjemahkan..." : "Terjemahkan Otomatis"}
                  </span>
                </Button>
              </div>
              <Textarea
                id="question_text_en"
                rows={3}
                placeholder="Terjemahan Bahasa Inggris akan terisi otomatis atau dapat diisi manual..."
                {...register("question_text_en")}
                className="rounded-2xl border-slate-200 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-emerald-500/20 leading-relaxed"
              />
              {errors.question_text_en && (
                <p className="text-xs font-medium text-rose-500">
                  {errors.question_text_en.message}
                </p>
              )}
            </div>
          </div>

          {/* Target Selectors Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Unsur Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Unsur Penilaian Target <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={extractCleanId(unsurId)}
                onValueChange={(v) => {
                  if (v) setValue("unsur_id", v);
                }}
              >
                <SelectTrigger className="w-full rounded-2xl border-slate-200 text-xs font-semibold py-5">
                  <SelectValue placeholder="Pilih Unsur Penilaian">
                    {(() => {
                      const cleanId = extractCleanId(unsurId);
                      const found = unsurList.find(
                        (u) =>
                          u.id === cleanId ||
                          (u as { original_id?: string }).original_id === cleanId
                      );
                      return found
                        ? `U${found.sort_order} - ${found.name} (${found.index_type})`
                        : undefined;
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-2xl max-h-64">
                  {unsurList.map((u) => (
                    <SelectItem
                      key={u.id}
                      value={u.id}
                      className="rounded-xl text-xs font-medium cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-slate-800 text-white shrink-0">
                          U{u.sort_order}
                        </span>
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.5 rounded-md shrink-0 ${
                            u.index_type === "IPKP"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                          }`}
                        >
                          {u.index_type}
                        </span>
                        <span className="font-bold text-xs">{u.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.unsur_id && (
                <p className="text-xs font-medium text-rose-500">
                  {errors.unsur_id.message}
                </p>
              )}
            </div>

            {/* Target Layanan */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Layanan Target (Opsional)
              </Label>
              <Select
                value={serviceId || "ALL"}
                onValueChange={(v) =>
                  setValue("service_id", !v || v === "ALL" ? undefined : v)
                }
              >
                <SelectTrigger className="w-full rounded-2xl border-slate-200 text-xs font-semibold py-5">
                  <SelectValue placeholder="Semua Layanan (Umum)" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl max-h-56">
                  <SelectItem
                    value="ALL"
                    className="rounded-xl text-xs font-bold"
                  >
                    Semua Layanan (Umum)
                  </SelectItem>
                  {services.map((s) => (
                    <SelectItem
                      key={s.id}
                      value={s.id}
                      className="rounded-xl text-xs font-medium"
                    >
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Rating Emote Custom Labels Configuration */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-gray-800">
            <Label className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Smile className="size-4 text-emerald-600" />
              <span>Kustomisasi Teks Label Penilaian (4 Level Emote)</span>
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 p-4 rounded-2xl bg-slate-50 dark:bg-gray-800/60 border border-slate-200/80 dark:border-gray-700">
              <div className="space-y-1.5">
                <Label
                  htmlFor="label_4"
                  className="text-[11px] font-bold text-teal-700 dark:text-teal-400"
                >
                  Score 4 (Emote 😍 / 😃)
                </Label>
                <Input
                  id="label_4"
                  {...register("label_4")}
                  placeholder="Sangat Puas"
                  className="rounded-xl bg-white dark:bg-gray-900 text-xs font-bold text-teal-900 border-teal-200"
                />
                {errors.label_4 && (
                  <p className="text-[10px] font-semibold text-rose-500">
                    {errors.label_4.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="label_3"
                  className="text-[11px] font-bold text-cyan-700 dark:text-cyan-400"
                >
                  Score 3 (Emote 😊)
                </Label>
                <Input
                  id="label_3"
                  {...register("label_3")}
                  placeholder="Puas"
                  className="rounded-xl bg-white dark:bg-gray-900 text-xs font-bold text-cyan-900 border-cyan-200"
                />
                {errors.label_3 && (
                  <p className="text-[10px] font-semibold text-rose-500">
                    {errors.label_3.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="label_2"
                  className="text-[11px] font-bold text-pink-700 dark:text-pink-400"
                >
                  Score 2 (Emote 🙁)
                </Label>
                <Input
                  id="label_2"
                  {...register("label_2")}
                  placeholder="Kurang Puas"
                  className="rounded-xl bg-white dark:bg-gray-900 text-xs font-bold text-pink-900 border-pink-200"
                />
                {errors.label_2 && (
                  <p className="text-[10px] font-semibold text-rose-500">
                    {errors.label_2.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="label_1"
                  className="text-[11px] font-bold text-rose-700 dark:text-rose-400"
                >
                  Score 1 (Emote 😡)
                </Label>
                <Input
                  id="label_1"
                  {...register("label_1")}
                  placeholder="Tidak Puas"
                  className="rounded-xl bg-white dark:bg-gray-900 text-xs font-bold text-rose-900 border-rose-200"
                />
                {errors.label_1 && (
                  <p className="text-[10px] font-semibold text-rose-500">
                    {errors.label_1.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Urutan & Status Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
            <div className="space-y-1.5">
              <Label
                htmlFor="sort_order"
                className="text-xs font-bold text-slate-700 dark:text-slate-200"
              >
                Urutan Tampil
              </Label>
              <Input
                id="sort_order"
                type="number"
                {...register("sort_order", { valueAsNumber: true })}
                className="rounded-2xl border-slate-200 text-xs font-bold py-5"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900">
              <div className="space-y-0.5">
                <Label
                  htmlFor="is_active"
                  className="text-xs font-extrabold text-emerald-950 dark:text-emerald-200 cursor-pointer"
                >
                  Status Aktif Pertanyaan
                </Label>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  Aktifkan untuk menampilkan butir pertanyaan pada formulir kuesioner publik.
                </p>
              </div>
              <Switch
                id="is_active"
                checked={isActive}
                onCheckedChange={(v) => setValue("is_active", v)}
              />
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-slate-100 dark:border-gray-800 flex justify-end gap-3">
            <DialogClose asChild>
              <Button
                variant="outline"
                className="rounded-2xl font-bold text-xs py-5 px-6"
              >
                Batal
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl text-xs px-7 py-5 shadow-lg shadow-emerald-600/20 cursor-pointer"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin mr-1.5" />
              ) : null}
              {editing ? "Simpan Perubahan" : "Tambah Pertanyaan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
