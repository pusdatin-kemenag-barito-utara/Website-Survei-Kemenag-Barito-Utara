import { useEffect, useState, useMemo } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  HelpCircle,
  Sparkles,
  Loader2,
  Smile,
  FileText,
  Layers,
  Check,
  CheckCircle2,
  Globe2,
  Target,
  X,
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
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { Question, Unsur, Service } from "@/types";

export const questionSchema = z.object({
  unsur_id: z.string().min(1, "Unsur penilaian wajib dipilih"),
  service_id: z.string().nullable().optional(),
  question_text_id: z.string().min(1, "Teks pertanyaan (Bahasa Indonesia) wajib diisi"),
  question_text_en: z.string().min(1, "Teks pertanyaan (Bahasa Inggris) wajib diisi"),
  input_type: z.string(),
  label_4: z.string().min(1, "Label skor 4 wajib diisi"),
  label_3: z.string().min(1, "Label skor 3 wajib diisi"),
  label_2: z.string().min(1, "Label skor 2 wajib diisi"),
  label_1: z.string().min(1, "Label skor 1 wajib diisi"),
  is_active: z.boolean(),
  sort_order: z.number().int().min(0, "Urutan harus berupa angka positif"),
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
      service_id: null,
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

  const label4 = useWatch({ control, name: "label_4" }) || "Sangat Puas";
  const label3 = useWatch({ control, name: "label_3" }) || "Puas";
  const label2 = useWatch({ control, name: "label_2" }) || "Kurang Puas";
  const label1 = useWatch({ control, name: "label_1" }) || "Tidak Puas";

  // Group unsur list into IPKP and IPAK
  const { ipkpUnsur, ipakUnsur } = useMemo(() => {
    return {
      ipkpUnsur: unsurList.filter((u) => u.index_type === "IPKP").sort((a, b) => a.sort_order - b.sort_order),
      ipakUnsur: unsurList.filter((u) => u.index_type === "IPAK").sort((a, b) => a.sort_order - b.sort_order),
    };
  }, [unsurList]);

  // Selected Service metadata
  const selectedService = useMemo(() => {
    if (!serviceId || serviceId === "ALL") return null;
    return services.find((s) => s.id === serviceId) || null;
  }, [serviceId, services]);

  // Selected Unsur metadata
  const selectedUnsur = useMemo(() => {
    const cleanId = extractCleanId(unsurId);
    return (
      unsurList.find(
        (u) => u.id === cleanId || (u as { original_id?: string }).original_id === cleanId
      ) || null
    );
  }, [unsurId, unsurList]);

  useEffect(() => {
    if (open) {
      if (editing) {
        let labels: Record<string, string> = {};
        if (typeof editing.rating_labels === "string") {
          try {
            labels = JSON.parse(editing.rating_labels);
          } catch {}
        } else if (editing.rating_labels && typeof editing.rating_labels === "object") {
          labels = editing.rating_labels as Record<string, string>;
        }

        const rawCleanUnsur =
          extractCleanId(editing.unsur_id) ||
          extractCleanId(editing.unsur?.id) ||
          (unsurList[0]?.id || "");

        const initialServiceId =
          editing.service_id && editing.service_id !== "ALL" ? editing.service_id : null;

        reset({
          unsur_id: rawCleanUnsur,
          service_id: initialServiceId,
          question_text_id: editing.question_text_id || "",
          question_text_en: editing.question_text_en || "",
          input_type: "star_rating",
          label_4: editing.label_4 || labels["4"] || "Sangat Puas",
          label_3: editing.label_3 || labels["3"] || "Puas",
          label_2: editing.label_2 || labels["2"] || "Kurang Puas",
          label_1: editing.label_1 || labels["1"] || "Tidak Puas",
          is_active: editing.is_active !== undefined ? editing.is_active : true,
          sort_order: Number(editing.sort_order) || 1,
        });
      } else {
        reset({
          unsur_id: unsurList[0]?.id || "",
          service_id: null,
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

  const onInvalidSubmit = (formErrors: typeof errors) => {
    console.error("Form validation errors:", formErrors);
    const firstKey = Object.keys(formErrors)[0] as keyof typeof formErrors;
    const msg = formErrors[firstKey]?.message;
    toast.error(msg ? String(msg) : "Mohon periksa kembali isian formulir pertanyaan.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl sm:max-w-5xl w-[94vw] max-h-[92vh] my-auto rounded-3xl p-0 overflow-hidden border border-slate-200/90 dark:border-gray-800 shadow-2xl flex flex-col bg-white dark:bg-gray-900">
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-950 p-5 sm:p-6 text-white shrink-0 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 size-32 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md text-white shadow-inner border border-white/20">
              <HelpCircle className="size-6 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg sm:text-xl font-black text-white tracking-tight">
                  {editing ? "Ubah Pertanyaan Evaluasi" : "Tambah Pertanyaan Evaluasi Baru"}
                </DialogTitle>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-600/60 border border-emerald-400/40 text-emerald-100">
                  {editing ? "Edit Mode" : "New Question"}
                </span>
              </div>
              <p className="text-xs text-emerald-200/90 font-medium mt-0.5">
                Konfigurasi butir kuesioner, indikator unsur target, cakupan layanan, dan skala emote publik.
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit(onSubmit, onInvalidSubmit)}
          className="p-5 sm:p-8 space-y-6 bg-white dark:bg-gray-900 overflow-y-auto max-h-[calc(92vh-140px)]"
        >
          {/* Hidden input to ensure input_type is registered */}
          <input type="hidden" {...register("input_type")} value="star_rating" />

          {/* Teks Pertanyaan Grid (ID & EN) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Teks Pertanyaan (Indonesia) */}
            <div className="space-y-2">
              <Label
                htmlFor="question_text_id"
                className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between"
              >
                <span>
                  Teks Pertanyaan (Bahasa Indonesia) <span className="text-rose-500">*</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Wajib diisi</span>
              </Label>
              <Textarea
                id="question_text_id"
                rows={3}
                placeholder="Contoh: Bagaimana pendapat Saudara tentang kewajaran biaya untuk mendapatkan pelayanan..."
                {...register("question_text_id")}
                className="rounded-2xl border-slate-200 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-emerald-500/20 leading-relaxed resize-none transition-all shadow-xs"
              />
              {errors.question_text_id && (
                <p className="text-xs font-semibold text-rose-500">
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
                  Teks Pertanyaan (Bahasa Inggris) <span className="text-rose-500">*</span>
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAutoTranslate}
                  disabled={translating}
                  className="h-7 px-2.5 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border border-emerald-200/60"
                >
                  {translating ? (
                    <Loader2 className="size-3 animate-spin text-emerald-600" />
                  ) : (
                    <Sparkles className="size-3 text-emerald-600" />
                  )}
                  <span>{translating ? "Menerjemahkan..." : "Terjemahkan Otomatis"}</span>
                </Button>
              </div>
              <Textarea
                id="question_text_en"
                rows={3}
                placeholder="English translation will auto-generate or can be customized manually..."
                {...register("question_text_en")}
                className="rounded-2xl border-slate-200 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-emerald-500/20 leading-relaxed resize-none transition-all shadow-xs"
              />
              {errors.question_text_en && (
                <p className="text-xs font-semibold text-rose-500">
                  {errors.question_text_en.message}
                </p>
              )}
            </div>
          </div>

          {/* Sasaran & Klasifikasi (Unsur & Layanan Target) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Unsur Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Target className="size-3.5 text-emerald-600" />
                  <span>
                    Unsur Penilaian Target <span className="text-rose-500">*</span>
                  </span>
                </Label>
                {selectedUnsur && (
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                      selectedUnsur.index_type === "IPKP"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                    }`}
                  >
                    {selectedUnsur.index_type} (U{selectedUnsur.sort_order})
                  </span>
                )}
              </div>
              <Controller
                control={control}
                name="unsur_id"
                render={({ field }) => {
                  const currentCleanId = extractCleanId(field.value);
                  return (
                    <Select
                      value={currentCleanId}
                      onValueChange={(v) => {
                        if (v) field.onChange(v);
                      }}
                    >
                      <SelectTrigger className="w-full rounded-2xl border-slate-200 text-xs font-semibold py-5 shadow-xs">
                        <SelectValue placeholder="Pilih Unsur Penilaian">
                          {(val) => {
                            const activeVal = val || currentCleanId;
                            const u =
                              unsurList.find(
                                (item) =>
                                  item.id === activeVal ||
                                  (item as { original_id?: string }).original_id === activeVal
                              ) || selectedUnsur;
                            if (!u) return <span>Pilih Unsur Penilaian</span>;
                            return (
                              <div className="flex items-center gap-2 truncate">
                                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-slate-900 text-white shrink-0">
                                  U{u.sort_order}
                                </span>
                                <span
                                  className={`text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 ${
                                    u.index_type === "IPKP"
                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                      : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                                  }`}
                                >
                                  {u.index_type}
                                </span>
                                <span className="font-bold text-xs truncate">{u.name}</span>
                              </div>
                            );
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent align="start" className="rounded-2xl max-h-72 shadow-xl">
                        {/* Group IPKP */}
                        {ipkpUnsur.length > 0 && (
                          <SelectGroup>
                            <SelectLabel className="px-2.5 py-1.5 text-[11px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                              <span className="size-2 rounded-full bg-emerald-500" />
                              Indeks Kualitas Pelayanan (IPKP - 9 Unsur)
                            </SelectLabel>
                            {ipkpUnsur.map((u) => (
                              <SelectItem
                                key={u.id}
                                value={u.id}
                                className="rounded-xl text-xs font-medium cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-slate-800 text-white shrink-0">
                                    U{u.sort_order}
                                  </span>
                                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
                                    IPKP
                                  </span>
                                  <span className="font-bold text-xs">{u.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )}

                        {/* Group IPAK */}
                        {ipakUnsur.length > 0 && (
                          <SelectGroup>
                            <SelectLabel className="px-2.5 py-1.5 text-[11px] font-black text-indigo-800 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5 mt-1 border-t border-slate-100 dark:border-gray-800 pt-2">
                              <span className="size-2 rounded-full bg-indigo-500" />
                              Indeks Persepsi Anti Korupsi (IPAK - Integritas)
                            </SelectLabel>
                            {ipakUnsur.map((u) => (
                              <SelectItem
                                key={u.id}
                                value={u.id}
                                className="rounded-xl text-xs font-medium cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-indigo-900 text-white shrink-0">
                                    U{u.sort_order}
                                  </span>
                                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 shrink-0">
                                    IPAK
                                  </span>
                                  <span className="font-bold text-xs">{u.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                      </SelectContent>
                    </Select>
                  );
                }}
              />
              {errors.unsur_id && (
                <p className="text-xs font-semibold text-rose-500">
                  {errors.unsur_id.message}
                </p>
              )}
            </div>

            {/* Target Layanan */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Layers className="size-3.5 text-teal-600" />
                  <span>Layanan Target (Opsional)</span>
                </Label>
                {selectedService ? (
                  <button
                    type="button"
                    onClick={() => setValue("service_id", null, { shouldValidate: true })}
                    className="text-[10px] font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1 cursor-pointer hover:underline"
                  >
                    <X className="size-3" />
                    Reset ke Semua Layanan
                  </button>
                ) : (
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-md border border-emerald-200/60">
                    Semua Layanan (Umum)
                  </span>
                )}
              </div>
              <Controller
                control={control}
                name="service_id"
                render={({ field }) => {
                  const currentVal = field.value || "ALL";
                  return (
                    <Select
                      value={currentVal}
                      onValueChange={(v) => {
                        field.onChange(!v || v === "ALL" ? null : v);
                      }}
                    >
                      <SelectTrigger className="w-full rounded-2xl border-slate-200 text-xs font-semibold py-5 shadow-xs">
                        <SelectValue placeholder="Semua Layanan (Umum)">
                          {(val) => {
                            const activeVal = val || currentVal;
                            if (!activeVal || activeVal === "ALL") {
                              return (
                                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-bold">
                                  <Globe2 className="size-3.5 text-emerald-600 shrink-0" />
                                  <span>Semua Layanan (Umum)</span>
                                </div>
                              );
                            }
                            const s = services.find((item) => item.id === activeVal) || selectedService;
                            return (
                              <div className="flex items-center gap-2 text-teal-800 dark:text-teal-300 font-bold truncate">
                                <FileText className="size-3.5 text-teal-600 shrink-0" />
                                <span className="truncate">{s?.name || "Layanan Terpilih"}</span>
                              </div>
                            );
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent align="start" className="rounded-2xl max-h-64 shadow-xl">
                        <SelectItem value="ALL" className="rounded-xl text-xs font-bold cursor-pointer">
                          <div className="flex items-center gap-2 truncate">
                            <Globe2 className="size-3.5 text-emerald-600 shrink-0" />
                            <span>Semua Layanan (Umum)</span>
                          </div>
                        </SelectItem>
                        {services.map((s, idx) => (
                          <SelectItem
                            key={s.id}
                            value={s.id}
                            className="rounded-xl text-xs font-medium cursor-pointer"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="size-5 flex items-center justify-center rounded-md bg-teal-50 text-teal-800 text-[10px] font-bold shrink-0">
                                {idx + 1}
                              </span>
                              <FileText className="size-3.5 text-teal-600 shrink-0" />
                              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{s.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                }}
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {selectedService
                  ? `Pertanyaan ini HANYA akan ditampilkan untuk responden yang memilih "${selectedService.name}".`
                  : "Pertanyaan ini berlaku umum dan akan muncul untuk SEMUA responden kuesioner publik."}
              </p>
            </div>
          </div>

          {/* Rating Emote Custom Labels Configuration */}
          <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-gray-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <Label className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Smile className="size-4 text-emerald-600" />
                <span>Kustomisasi Teks Label Penilaian (4 Skala Emote)</span>
              </Label>
              <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                Sesuaikan teks label untuk masing-masing opsi respon kuesioner
              </span>
            </div>

            {/* 4 Score Input Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 p-4 rounded-3xl bg-slate-50/80 dark:bg-gray-800/60 border border-slate-200/80 dark:border-gray-700">
              {/* Score 4 */}
              <div className="space-y-1.5 p-3 rounded-2xl bg-white dark:bg-gray-900 border border-teal-200/80 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-teal-700 dark:text-teal-400 uppercase tracking-wider">
                    Skor 4
                  </span>
                  <span className="text-xl" title="Sangat Baik">😍</span>
                </div>
                <Input
                  id="label_4"
                  {...register("label_4")}
                  placeholder="Sangat Puas"
                  className="rounded-xl bg-teal-50/30 text-xs font-bold text-teal-950 dark:text-teal-200 border-teal-200 focus:ring-teal-500/20"
                />
                {errors.label_4 && (
                  <p className="text-[10px] font-semibold text-rose-500">
                    {errors.label_4.message}
                  </p>
                )}
              </div>

              {/* Score 3 */}
              <div className="space-y-1.5 p-3 rounded-2xl bg-white dark:bg-gray-900 border border-cyan-200/80 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-cyan-700 dark:text-cyan-400 uppercase tracking-wider">
                    Skor 3
                  </span>
                  <span className="text-xl" title="Baik">😊</span>
                </div>
                <Input
                  id="label_3"
                  {...register("label_3")}
                  placeholder="Puas"
                  className="rounded-xl bg-cyan-50/30 text-xs font-bold text-cyan-950 dark:text-cyan-200 border-cyan-200 focus:ring-cyan-500/20"
                />
                {errors.label_3 && (
                  <p className="text-[10px] font-semibold text-rose-500">
                    {errors.label_3.message}
                  </p>
                )}
              </div>

              {/* Score 2 */}
              <div className="space-y-1.5 p-3 rounded-2xl bg-white dark:bg-gray-900 border border-amber-200/80 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                    Skor 2
                  </span>
                  <span className="text-xl" title="Kurang Baik">🙁</span>
                </div>
                <Input
                  id="label_2"
                  {...register("label_2")}
                  placeholder="Kurang Puas"
                  className="rounded-xl bg-amber-50/30 text-xs font-bold text-amber-950 dark:text-amber-200 border-amber-200 focus:ring-amber-500/20"
                />
                {errors.label_2 && (
                  <p className="text-[10px] font-semibold text-rose-500">
                    {errors.label_2.message}
                  </p>
                )}
              </div>

              {/* Score 1 */}
              <div className="space-y-1.5 p-3 rounded-2xl bg-white dark:bg-gray-900 border border-rose-200/80 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                    Skor 1
                  </span>
                  <span className="text-xl" title="Tidak Baik">😡</span>
                </div>
                <Input
                  id="label_1"
                  {...register("label_1")}
                  placeholder="Tidak Puas"
                  className="rounded-xl bg-rose-50/30 text-xs font-bold text-rose-950 dark:text-rose-200 border-rose-200 focus:ring-rose-500/20"
                />
                {errors.label_1 && (
                  <p className="text-[10px] font-semibold text-rose-500">
                    {errors.label_1.message}
                  </p>
                )}
              </div>
            </div>

            {/* Interactive Live Preview Box */}
            <div className="p-4 rounded-3xl bg-gradient-to-br from-slate-50 to-emerald-50/40 dark:from-gray-800/60 dark:to-emerald-950/20 border border-emerald-100/80 dark:border-gray-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles className="size-3.5 text-emerald-600 animate-pulse" />
                  Pratinjau Tampilan Skala Emote di Kuesioner Publik
                </span>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
                  Real-time Sync
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* 4 */}
                <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-gray-900 border-2 border-teal-500/70 shadow-sm text-center">
                  <span className="text-2xl mb-1">😍</span>
                  <span className="text-[11px] font-extrabold text-teal-900 dark:text-teal-200 line-clamp-2">
                    {label4}
                  </span>
                  <span className="text-[9px] font-bold text-teal-600 mt-0.5">Nilai 4 (Sangat Baik)</span>
                </div>
                {/* 3 */}
                <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-gray-900 border border-cyan-400 shadow-sm text-center">
                  <span className="text-2xl mb-1">😊</span>
                  <span className="text-[11px] font-extrabold text-cyan-900 dark:text-cyan-200 line-clamp-2">
                    {label3}
                  </span>
                  <span className="text-[9px] font-bold text-cyan-600 mt-0.5">Nilai 3 (Baik)</span>
                </div>
                {/* 2 */}
                <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-gray-900 border border-amber-400 shadow-sm text-center">
                  <span className="text-2xl mb-1">🙁</span>
                  <span className="text-[11px] font-extrabold text-amber-900 dark:text-amber-200 line-clamp-2">
                    {label2}
                  </span>
                  <span className="text-[9px] font-bold text-amber-600 mt-0.5">Nilai 2 (Kurang Baik)</span>
                </div>
                {/* 1 */}
                <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-gray-900 border border-rose-400 shadow-sm text-center">
                  <span className="text-2xl mb-1">😡</span>
                  <span className="text-[11px] font-extrabold text-rose-900 dark:text-rose-200 line-clamp-2">
                    {label1}
                  </span>
                  <span className="text-[9px] font-bold text-rose-600 mt-0.5">Nilai 1 (Tidak Baik)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Urutan & Status Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
            <div className="space-y-1.5">
              <Label
                htmlFor="sort_order"
                className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between"
              >
                <span>Urutan Tampil Pertanyaan</span>
                <span className="text-[10px] text-slate-400 font-normal">Nomor urut kuesioner</span>
              </Label>
              <Input
                id="sort_order"
                type="number"
                min={0}
                {...register("sort_order", { valueAsNumber: true })}
                className="rounded-2xl border-slate-200 text-xs font-bold py-5 shadow-xs"
              />
              {errors.sort_order && (
                <p className="text-xs font-semibold text-rose-500">
                  {errors.sort_order.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900">
              <div className="space-y-0.5">
                <Label
                  htmlFor="is_active"
                  className="text-xs font-extrabold text-emerald-950 dark:text-emerald-200 cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <span>Status Aktif Pertanyaan</span>
                </Label>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  Pertanyaan ini akan langsung muncul pada formulir kuesioner publik bila aktif.
                </p>
              </div>
              <Switch
                id="is_active"
                checked={isActive}
                onCheckedChange={(v) => setValue("is_active", v, { shouldValidate: true })}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <DialogFooter className="pt-4 border-t border-slate-100 dark:border-gray-800 flex justify-end gap-3">
            <DialogClose asChild>
              <Button
                variant="outline"
                className="rounded-2xl font-bold text-xs py-5 px-6 border-slate-200 cursor-pointer"
              >
                Batal
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl text-xs px-7 py-5 shadow-lg shadow-emerald-600/20 cursor-pointer flex items-center gap-2"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4 stroke-[3]" />
              )}
              <span>{editing ? "Simpan Perubahan" : "Tambah Pertanyaan"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
