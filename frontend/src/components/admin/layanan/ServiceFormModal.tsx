import { useEffect, useState, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  FileText,
  X,
  Link2,
  RefreshCw,
  Hash,
  AlertTriangle,
  AlignLeft,
  ChevronDown,
  Pencil,
  Tag,
  Search,
  Check,
  Plus,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type { Service, ServiceCategory } from "@/types";

export const serviceSchema = z.object({
  name: z.string().min(1, "Nama layanan wajib diisi"),
  slug: z.string().min(1, "URL Slug wajib diisi"),
  description: z.string().nullable().optional(),
  is_active: z.boolean(),
});

export type ServiceFormData = z.infer<typeof serviceSchema>;

export function sluggify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface ServiceFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Service | null;
  services: Service[];
  categories: ServiceCategory[];
  saving: boolean;
  onSubmit: (data: ServiceFormData) => Promise<void>;
}

const defaultStandardCategories = [
  "Layanan Tata Usaha",
  "Layanan Bimbingan Masyarakat Islam",
  "Layanan Pendidikan Madrasah",
  "Layanan Pendidikan Diniyah dan Pondok Pesantren",
  "Layanan Pendidikan Agama Islam",
  "Layanan Bimbingan Masyarakat Kristen",
  "Layanan Penyelenggara Zakat dan Wakaf",
  "Layanan Penyelenggara Hindu",
];

export function ServiceFormModal({
  open,
  onOpenChange,
  editing,
  services,
  categories,
  saving,
  onSubmit,
}: ServiceFormModalProps) {
  const [isCustomSlug, setIsCustomSlug] = useState(false);
  const [manualCategoryMode, setManualCategoryMode] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  const {
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: { name: "", slug: "", description: "", is_active: true },
  });

  const nameValue = useWatch({ control, name: "name" }) || "";
  const currentSlug = useWatch({ control, name: "slug" }) || "";
  const descriptionValue = useWatch({ control, name: "description" }) || "";
  const isActiveValue = useWatch({ control, name: "is_active" });

  useEffect(() => {
    if (open) {
      if (editing) {
        setIsCustomSlug(true);
        setManualCategoryMode(false);
        setCategoryDropdownOpen(false);
        setCategorySearch("");
        reset({
          name: editing.name,
          slug: editing.slug,
          description: editing.description || "",
          is_active: editing.is_active,
        });
      } else {
        setIsCustomSlug(false);
        setManualCategoryMode(false);
        setCategoryDropdownOpen(false);
        setCategorySearch("");
        reset({ name: "", slug: "", description: "", is_active: true });
      }
    }
  }, [open, editing, reset]);

  // Close category dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(event.target as Node)
      ) {
        setCategoryDropdownOpen(false);
      }
    }
    if (categoryDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [categoryDropdownOpen]);

  // Slug handlers
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue("name", val, { shouldValidate: true });
    if (!isCustomSlug && !editing) {
      setValue("slug", sluggify(val), { shouldValidate: true });
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsCustomSlug(true);
    setValue("slug", sluggify(e.target.value), { shouldValidate: true });
  };

  const handleSyncSlug = () => {
    const generated = sluggify(nameValue);
    setValue("slug", generated, { shouldValidate: true });
    setIsCustomSlug(false);
    toast.info("Slug disinkronkan dengan nama layanan");
  };

  // Check duplicate slug in real-time
  const duplicateService = services.find(
    (s) =>
      s.id !== editing?.id &&
      s.slug.trim().toLowerCase() === currentSlug.trim().toLowerCase() &&
      currentSlug.trim().length > 0
  );

  // Combined unique category list
  const allCategoryNames = Array.from(
    new Set([
      ...defaultStandardCategories,
      ...categories.map((c) => c.name),
      ...services
        .map((s) => s.description)
        .filter((d): d is string => Boolean(d && d.trim())),
    ].map((s) => s.replace(/\s+/g, " ").trim()))
  ).filter(Boolean);

  const filteredCategoryNames = allCategoryNames.filter((cat) =>
    cat.toLowerCase().includes(categorySearch.toLowerCase().trim())
  );

  const hasExactCategoryMatch = allCategoryNames.some(
    (cat) => cat.toLowerCase() === categorySearch.toLowerCase().trim()
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="rounded-3xl max-w-xl sm:max-w-2xl w-full p-0 border border-slate-200/90 dark:border-gray-800 shadow-2xl overflow-hidden flex flex-col min-h-[580px] md:min-h-[640px] max-h-[92vh] bg-white dark:bg-gray-900"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-gray-800 bg-slate-50/60 dark:bg-gray-850 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
              <FileText className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                {editing ? "Ubah Informasi Layanan" : "Tambah Layanan Baru"}
              </DialogTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {editing
                  ? "Perbarui rincian nama, slug, bidang, atau status layanan."
                  : "Tambahkan layanan publik baru ke sistem survei PTSP."}
              </p>
            </div>
          </div>
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="size-4" />
              <span className="sr-only">Tutup</span>
            </Button>
          </DialogClose>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          {/* Scrollable Form Body */}
          <div className="p-6 overflow-y-auto space-y-5 flex-1 pr-4">
            {/* Nama Layanan */}
            <div className="space-y-1.5">
              <Label
                htmlFor="name"
                className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1"
              >
                <span>Nama Layanan</span>
                <span className="text-rose-500 font-bold">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Contoh: Permohonan Data dan Informasi"
                value={nameValue}
                onChange={handleNameChange}
                className="rounded-xl border-slate-200 dark:border-gray-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs sm:text-sm font-semibold"
              />
              {errors.name && (
                <p className="text-xs font-semibold text-rose-500 mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* URL Slug */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="slug"
                  className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
                >
                  <Link2 className="size-3.5 text-emerald-600" />
                  <span>URL Slug</span>
                  <span className="text-rose-500 font-bold">*</span>
                </Label>
                {nameValue.trim() && (
                  <button
                    type="button"
                    onClick={handleSyncSlug}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200 cursor-pointer transition-colors"
                    title="Sinkronkan slug dengan nama layanan"
                  >
                    <RefreshCw className="size-3 text-emerald-600" />
                    <span>Sinkronkan ke Nama</span>
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  id="slug"
                  placeholder="permohonan-data-dan-informasi"
                  value={currentSlug}
                  onChange={handleSlugChange}
                  className={`rounded-xl text-xs sm:text-sm font-mono pr-9 border-slate-200 dark:border-gray-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 ${
                    duplicateService
                      ? "border-rose-400 ring-2 ring-rose-500/20 dark:border-rose-600"
                      : ""
                  }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <Hash className="size-4" />
                </div>
              </div>

              {duplicateService ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 p-2.5 rounded-xl mt-1">
                  <AlertTriangle className="size-4 shrink-0 text-rose-500" />
                  <span>
                    Slug ini sudah digunakan oleh layanan &ldquo;
                    <strong>{duplicateService.name}</strong>&rdquo;. Silakan
                    ubah agar unik.
                  </span>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">
                  {isCustomSlug
                    ? "✏️ Mode kustom aktif: slug tidak akan ditimpa saat mengubah nama."
                    : "⚡ Otomatis dihasilkan dari nama layanan."}
                </p>
              )}

              {errors.slug && (
                <p className="text-xs font-semibold text-rose-500 mt-1">
                  {errors.slug.message}
                </p>
              )}
            </div>

            {/* Bidang / Deskripsi Layanan */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <AlignLeft className="size-3.5 text-emerald-600" />
                  <span>Bidang / Deskripsi Layanan</span>
                </Label>
                <button
                  type="button"
                  onClick={() => setManualCategoryMode(!manualCategoryMode)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-200/80 transition-all cursor-pointer shadow-2xs"
                >
                  {manualCategoryMode ? (
                    <>
                      <ChevronDown className="size-3 text-emerald-600" />
                      <span>Pilih dari Daftar</span>
                    </>
                  ) : (
                    <>
                      <Pencil className="size-3 text-emerald-600" />
                      <span>+ Ketik Manual</span>
                    </>
                  )}
                </button>
              </div>

              {manualCategoryMode ? (
                <div className="space-y-1">
                  <Input
                    placeholder="Ketik nama bidang / seksi layanan baru..."
                    value={descriptionValue}
                    onChange={(e) => setValue("description", e.target.value)}
                    className="rounded-xl border-slate-200 dark:border-gray-700 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    autoFocus
                  />
                  <p className="text-[11px] text-slate-400">
                    Mode ketik manual: Masukkan nama bidang kustom secara
                    langsung.
                  </p>
                </div>
              ) : (
                <div className="relative" ref={categoryDropdownRef}>
                  <button
                    type="button"
                    onClick={() =>
                      setCategoryDropdownOpen(!categoryDropdownOpen)
                    }
                    className="w-full flex items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2.5 px-3.5 text-xs sm:text-sm font-semibold transition-all hover:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer shadow-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Tag className="size-4 text-emerald-600 shrink-0" />
                      {descriptionValue ? (
                        <span className="text-slate-800 dark:text-white truncate">
                          {descriptionValue}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">
                          -- Pilih Bidang / Deskripsi Layanan --
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {descriptionValue && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            setValue("description", "");
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Hapus pilihan bidang (Tanpa Bidang)"
                        >
                          <X className="size-3.5" />
                        </span>
                      )}
                      <ChevronDown
                        className={`size-4 text-slate-400 transition-transform duration-200 ${
                          categoryDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {/* Category Dropdown List */}
                  {categoryDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 shadow-2xl overflow-hidden ring-1 ring-black/5 animate-in fade-in-0 zoom-in-95 duration-150">
                      <div className="p-2.5 border-b border-slate-100 dark:border-gray-700/80 bg-slate-50/80 dark:bg-gray-800/90 sticky top-0 z-10 backdrop-blur-xs">
                        <div className="relative">
                          <Search className="size-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Cari bidang atau seksi layanan..."
                            value={categorySearch}
                            onChange={(e) =>
                              setCategorySearch(e.target.value)
                            }
                            className="w-full pl-9 pr-3.5 py-2 rounded-xl text-xs sm:text-sm bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-800 dark:text-slate-200"
                            autoFocus
                          />
                        </div>
                      </div>

                      <div className="max-h-72 sm:max-h-80 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-gray-700">
                        <button
                          type="button"
                          onClick={() => {
                            setValue("description", "");
                            setCategoryDropdownOpen(false);
                            setCategorySearch("");
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer text-left ${
                            !descriptionValue
                              ? "bg-emerald-50 text-emerald-800 font-bold dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80"
                              : "text-slate-500 hover:bg-slate-50 dark:hover:bg-gray-700/60"
                          }`}
                        >
                          <span className="italic">-- Tanpa Bidang (Umum) --</span>
                          {!descriptionValue && (
                            <Check className="size-4 text-emerald-600 shrink-0" />
                          )}
                        </button>

                        {filteredCategoryNames.map((catName) => {
                          const isSelected = descriptionValue === catName;
                          return (
                            <button
                              key={catName}
                              type="button"
                              onClick={() => {
                                setValue("description", catName);
                                setCategoryDropdownOpen(false);
                                setCategorySearch("");
                              }}
                              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm transition-colors cursor-pointer text-left ${
                                isSelected
                                  ? "bg-emerald-50 text-emerald-800 font-bold dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80"
                                  : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-gray-700/60 font-medium"
                              }`}
                            >
                              <span className="truncate">{catName}</span>
                              {isSelected && (
                                <Check className="size-4 text-emerald-600 shrink-0" />
                              )}
                            </button>
                          );
                        })}

                        {categorySearch.trim() && !hasExactCategoryMatch && (
                          <button
                            type="button"
                            onClick={() => {
                              const trimmed = categorySearch.trim();
                              setValue("description", trimmed);
                              setCategoryDropdownOpen(false);
                              setCategorySearch("");
                              toast.success(
                                `Bidang "${trimmed}" dipilih untuk layanan ini`
                              );
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer border border-dashed border-emerald-300 dark:border-emerald-700 mt-1"
                          >
                            <Plus className="size-3.5 text-emerald-600 shrink-0" />
                            <span className="truncate">
                              Gunakan &ldquo;{categorySearch.trim()}&rdquo;
                              sebagai bidang baru
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Status Switch Box */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900/40">
              <div className="space-y-0.5">
                <Label
                  htmlFor="is_active"
                  className="text-xs font-bold text-emerald-900 dark:text-emerald-300 cursor-pointer"
                >
                  Status Publikasi Layanan
                </Label>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  {isActiveValue
                    ? "Layanan aktif & akan tampil di formulir survei publik"
                    : "Layanan nonaktif (tersembunyi dari publik)"}
                </p>
              </div>
              <Switch
                id="is_active"
                checked={Boolean(isActiveValue)}
                onCheckedChange={(v) => setValue("is_active", v)}
              />
            </div>
          </div>

          {/* Sticky Modal Footer */}
          <div className="px-6 py-4 border-t border-slate-100 dark:border-gray-800 bg-slate-50/70 dark:bg-gray-850 flex items-center justify-end gap-2.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl font-bold text-xs px-4"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={saving || Boolean(duplicateService)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs px-5 shadow-md shadow-emerald-600/20 cursor-pointer transition-all"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin mr-1.5" />
              ) : null}
              {editing ? "Simpan Perubahan" : "Tambah Layanan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
