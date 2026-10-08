import Image from "next/image";
import {
  QrCode,
  Building2,
  Sparkles,
  Palette,
  ExternalLink,
  Check,
  Copy,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Service } from "@/types";

export const QR_COLORS = [
  { id: "#047857", name: "Hijau Kemenag", hex: "#047857", bgClass: "bg-emerald-700" },
  { id: "#064e3b", name: "Deep Forest", hex: "#064e3b", bgClass: "bg-emerald-950" },
  { id: "#0f172a", name: "Slate Hitam", hex: "#0f172a", bgClass: "bg-slate-900" },
  { id: "#1e3a8a", name: "Royal Navy", hex: "#1e3a8a", bgClass: "bg-blue-900" },
];

interface BarcodeSettingsCardProps {
  services: Service[];
  selectedServiceId: string;
  onSelectServiceId: (id: string) => void;
  centerLogo: string;
  onSelectCenterLogo: (logo: string) => void;
  qrColor: string;
  onSelectQrColor: (color: string) => void;
  targetUrl: string;
  copiedLink: boolean;
  onCopyLink: () => void;
}

export function BarcodeSettingsCard({
  services,
  selectedServiceId,
  onSelectServiceId,
  centerLogo,
  onSelectCenterLogo,
  qrColor,
  onSelectQrColor,
  targetUrl,
  copiedLink,
  onCopyLink,
}: BarcodeSettingsCardProps) {
  return (
    <Card className="border border-slate-200/80 dark:border-gray-800 shadow-xl shadow-slate-200/40 dark:shadow-black/20 bg-white dark:bg-gray-900 rounded-3xl overflow-hidden">
      <CardHeader className="bg-slate-50/50 dark:bg-gray-800/40 border-b border-slate-100 dark:border-gray-800 p-5 sm:p-6">
        <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <QrCode className="size-5 text-emerald-600" />
          <span>Pengaturan &amp; Kustomisasi QR Code</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 space-y-6">
        {/* Target Layanan */}
        <div className="space-y-2">
          <Label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
            <Building2 className="size-4 text-emerald-600" />
            <span>Target Layanan Publik</span>
          </Label>
          <Select
            value={selectedServiceId}
            onValueChange={(v) => v !== null && onSelectServiceId(v)}
          >
            <SelectTrigger className="w-full rounded-2xl border-slate-200 dark:border-gray-800 h-12 text-xs sm:text-sm font-semibold shadow-xs">
              <SelectValue>
                {selectedServiceId === "all"
                  ? "🌐 Semua Layanan (Kuesioner Umum)"
                  : services.find((s) => s.id === selectedServiceId)?.name ||
                    "Pilih Layanan Target"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="rounded-2xl p-1.5 shadow-xl max-h-72">
              <SelectItem
                value="all"
                className="rounded-xl py-2.5 font-bold text-xs sm:text-sm cursor-pointer"
              >
                🌐 Semua Layanan (Kuesioner Umum)
              </SelectItem>
              {services.map((s) => (
                <SelectItem
                  key={s.id}
                  value={s.id}
                  className="rounded-xl py-2 text-xs sm:text-sm font-medium cursor-pointer"
                >
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-slate-400">
            {selectedServiceId === "all"
              ? "Responden dapat memilih sendiri layanan yang dinilai pada kuesioner survei."
              : "Kuesioner akan langsung terkunci pada layanan ini saat responden memindai QR."}
          </p>
        </div>

        {/* Logo Pusat QR */}
        <div className="space-y-2.5">
          <Label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
            <Sparkles className="size-4 text-emerald-600" />
            <span>Logo Tengah QR Code</span>
          </Label>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { id: "/arus.webp", label: "SI-ARUS", sub: "Aplikasi SKM", img: "/arus.webp" },
              { id: "/kemenag.svg", label: "Kemenag RI", sub: "Resmi Kantor", img: "/kemenag.svg" },
              { id: "/hapakat.webp", label: "HAPAKAT", sub: "Motto Layanan", img: "/hapakat.webp" },
              { id: "none", label: "Polos", sub: "Tanpa Logo", img: null },
            ].map((item) => {
              const isSelected = centerLogo === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectCenterLogo(item.id)}
                  className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? "bg-emerald-50/80 dark:bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs"
                      : "bg-slate-50/50 dark:bg-gray-800/40 border-slate-200/80 dark:border-gray-700 hover:bg-slate-100 dark:hover:bg-gray-800"
                  }`}
                >
                  <div className="size-9 shrink-0 flex items-center justify-center rounded-xl bg-white dark:bg-gray-900 border border-slate-200/60 shadow-2xs p-1">
                    {item.img ? (
                      <Image
                        src={item.img}
                        alt={item.label}
                        width={28}
                        height={28}
                        className="object-contain size-7"
                      />
                    ) : (
                      <span className="font-bold text-xs text-slate-400">∅</span>
                    )}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {item.label}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      {item.sub}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Warna Pola QR */}
        <div className="space-y-2.5">
          <Label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
            <Palette className="size-4 text-emerald-600" />
            <span>Warna Pola QR Code</span>
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {QR_COLORS.map((c) => {
              const isSelected = qrColor === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelectQrColor(c.id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-slate-100 dark:bg-gray-800 border-slate-400 dark:border-gray-600 ring-2 ring-emerald-500/30 text-slate-900 dark:text-white"
                      : "bg-white dark:bg-gray-900 border-slate-200 dark:border-gray-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span className={`size-4 rounded-full shrink-0 ${c.bgClass}`} />
                  <span>{c.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tautan Target Survei */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Tautan Target Survei
            </Label>
            <a
              href={targetUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700"
            >
              <span>Uji Coba Tautan</span>
              <ExternalLink className="size-3" />
            </a>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-slate-50 dark:bg-gray-800 border border-slate-200/80 dark:border-gray-700">
            <input
              type="text"
              readOnly
              value={targetUrl}
              className="flex-1 bg-transparent text-xs font-mono font-medium text-slate-700 dark:text-slate-300 outline-none truncate px-1"
            />
            <Button
              type="button"
              size="sm"
              onClick={onCopyLink}
              variant="ghost"
              className="rounded-xl h-8 text-xs font-bold gap-1 cursor-pointer shrink-0"
            >
              {copiedLink ? (
                <Check className="size-3.5 text-emerald-600" />
              ) : (
                <Copy className="size-3.5" />
              )}
              <span>{copiedLink ? "Tersalin" : "Salin"}</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
