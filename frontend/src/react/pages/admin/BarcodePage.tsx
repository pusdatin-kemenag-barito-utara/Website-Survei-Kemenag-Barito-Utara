
import { useEffect, useRef, useState, useCallback } from "react";
import QRCode from "qrcode";
import {
  Download,
  QrCode,
  Copy,
  Check,
  Printer,
  Sparkles,
  Building2,
  ExternalLink,
  Palette,
  FileImage,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { fetchCachedServices, getCachedServicesSync } from "@/lib/data-cache";
import type { Service } from "@/types";
import { toast } from "sonner";
import Image from "next/image";

const QR_COLORS = [
  { id: "#047857", name: "Hijau Kemenag", hex: "#047857", bgClass: "bg-emerald-700" },
  { id: "#064e3b", name: "Deep Forest", hex: "#064e3b", bgClass: "bg-emerald-950" },
  { id: "#0f172a", name: "Slate Hitam", hex: "#0f172a", bgClass: "bg-slate-900" },
  { id: "#1e3a8a", name: "Royal Navy", hex: "#1e3a8a", bgClass: "bg-blue-900" },
];

export default function AdminBarcodePage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const cachedSvc = getCachedServicesSync();
  const [services, setServices] = useState<Service[]>(() => cachedSvc || []);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("all");
  const [centerLogo, setCenterLogo] = useState<string>("/arus.webp");
  const [qrColor, setQrColor] = useState<string>("#047857");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : (import.meta.env.PUBLIC_APP_URL || "");
  const selectedSlug =
    selectedServiceId !== "all"
      ? services.find((s) => s.id === selectedServiceId)?.slug
      : null;
  const targetUrl = selectedSlug
    ? `${origin}/survei?service=${selectedSlug}`
    : `${origin}/survei`;

  const selectedServiceName =
    selectedServiceId === "all"
      ? "Semua Layanan (Kuesioner Umum)"
      : services.find((s) => s.id === selectedServiceId)?.name || "Layanan Publik";

  useEffect(() => {
    async function loadServices() {
      try {
        const list = await fetchCachedServices();
        if (list) setServices(list);
      } catch (err) {
        console.error("Fetch services error:", err);
      }
    }
    loadServices();
  }, []);

  const drawQR = useCallback(
    (canvas: HTMLCanvasElement, size = 600, transparent = false): Promise<void> => {
      return new Promise((resolve) => {
        QRCode.toCanvas(
          canvas,
          targetUrl,
          {
            width: size,
            margin: 2,
            errorCorrectionLevel: "H",
            color: {
              dark: qrColor,
              light: transparent ? "#00000000" : "#ffffff",
            },
          },
          (error) => {
            if (error) {
              console.error("QR Code Generation Error:", error);
              resolve();
              return;
            }

            if (centerLogo && centerLogo !== "none") {
              const ctx = canvas.getContext("2d");
              if (!ctx) {
                resolve();
                return;
              }

              const img = new window.Image();
              img.crossOrigin = "anonymous";
              img.src = centerLogo;
              img.onload = () => {
                const logoSize = canvas.width * 0.18;
                const x = (canvas.width - logoSize) / 2;
                const y = (canvas.height - logoSize) / 2;

                // White container background with rounded border and subtle shadow
                ctx.fillStyle = "#ffffff";
                ctx.shadowColor = "rgba(0, 0, 0, 0.12)";
                ctx.shadowBlur = 6;
                ctx.beginPath();
                if (typeof ctx.roundRect === "function") {
                  ctx.roundRect(x - 6, y - 6, logoSize + 12, logoSize + 12, 14);
                } else {
                  ctx.rect(x - 6, y - 6, logoSize + 12, logoSize + 12);
                }
                ctx.fill();
                ctx.shadowBlur = 0;

                // Border ring around logo
                ctx.strokeStyle = "#e2e8f0";
                ctx.lineWidth = 1.5;
                ctx.stroke();

                // Draw Center Logo
                ctx.drawImage(img, x, y, logoSize, logoSize);
                resolve();
              };
              img.onerror = () => resolve();
            } else {
              resolve();
            }
          },
        );
      });
    },
    [targetUrl, centerLogo, qrColor],
  );

  useEffect(() => {
    if (canvasRef.current) {
      drawQR(canvasRef.current, 600, false);
    }
  }, [drawQR]);

  async function handleDownload(transparent = false) {
    const tempCanvas = document.createElement("canvas");
    await drawQR(tempCanvas, 1200, transparent);

    const image = tempCanvas.toDataURL("image/png");
    const slugName =
      selectedServiceId === "all"
        ? "Umum"
        : (services.find((s) => s.id === selectedServiceId)?.slug || "Layanan");
    
    const suffix = transparent ? "Transparent" : "HD";
    const link = document.createElement("a");
    link.href = image;
    link.download = `QR-Code-Survei-SI-ARUS-${slugName}-${suffix}.png`;
    link.click();
    toast.success(`QR Code (${suffix}) berhasil diunduh!`);
  }

  function handleCopyLink() {
    if (!targetUrl) return;
    navigator.clipboard.writeText(targetUrl);
    setCopiedLink(true);
    toast.success("Tautan survei berhasil disalin ke clipboard!");
    setTimeout(() => setCopiedLink(false), 2500);
  }

  async function handleCopyImage() {
    if (!canvasRef.current) return;
    try {
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const item = new (window as any).ClipboardItem({ "image/png": blob });
        await navigator.clipboard.write([item]);
        setCopiedImage(true);
        toast.success("Gambar QR Code berhasil disalin ke clipboard!");
        setTimeout(() => setCopiedImage(false), 2500);
      });
    } catch {
      toast.error("Browser tidak mendukung salin gambar langsung.");
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="w-full space-y-6 pb-16">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-slate-200/80 dark:border-gray-800 print:hidden">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
            <QrCode className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Generator QR Code Survei
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium mt-0.5">
              Buat dan unduh media QR Code resolusi tinggi berlogo resmi untuk kebutuhan media promosi, cetak banner, atau stiker survei.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCopyLink}
            className="rounded-2xl border-slate-200 dark:border-gray-700 font-bold text-xs gap-1.5 h-11 px-4 cursor-pointer"
          >
            {copiedLink ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4 text-slate-500" />}
            <span>{copiedLink ? "Tersalin" : "Salin Link"}</span>
          </Button>

          <Button
            type="button"
            onClick={() => handleDownload(false)}
            className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 h-11 px-5 shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            <Download className="size-4" />
            <span>Unduh QR (HD)</span>
          </Button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Konfigurasi QR Code (6 Cols) */}
        <div className="lg:col-span-6 space-y-6 print:hidden">
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
                  onValueChange={(v) => v !== null && setSelectedServiceId(v)}
                >
                  <SelectTrigger className="w-full rounded-2xl border-slate-200 dark:border-gray-800 h-12 text-xs sm:text-sm font-semibold shadow-xs">
                    <SelectValue>
                      {selectedServiceId === "all"
                        ? "🌐 Semua Layanan (Kuesioner Umum)"
                        : services.find((s) => s.id === selectedServiceId)?.name || "Pilih Layanan Target"}
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
                        onClick={() => setCenterLogo(item.id)}
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
                        onClick={() => setQrColor(c.id)}
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
                    onClick={handleCopyLink}
                    variant="ghost"
                    className="rounded-xl h-8 text-xs font-bold gap-1 cursor-pointer shrink-0"
                  >
                    {copiedLink ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                    <span>{copiedLink ? "Tersalin" : "Salin"}</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live QR Code Preview & Download Center (6 Cols) */}
        <div className="lg:col-span-6 space-y-6">
          <Card className="border border-slate-200/80 dark:border-gray-800 shadow-xl shadow-slate-200/40 dark:shadow-black/20 bg-white dark:bg-gray-900 rounded-3xl overflow-hidden text-center">
            <CardHeader className="bg-slate-50/50 dark:bg-gray-800/40 border-b border-slate-100 dark:border-gray-800 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="size-5 text-emerald-600" />
                  <span>Pratinjau QR Code</span>
                </CardTitle>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-black border border-emerald-200 dark:border-emerald-800 max-w-[220px] truncate shadow-2xs">
                  <span className="truncate">{selectedServiceName}</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 sm:p-8 flex flex-col items-center justify-center space-y-6">
              {/* Elevated Canvas Box */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white border-2 border-emerald-500/20 shadow-2xl shadow-emerald-500/10 inline-block">
                <canvas
                  ref={canvasRef}
                  className="rounded-2xl max-w-full h-auto block"
                  style={{ width: "260px", height: "260px" }}
                />
              </div>

              {/* Target Description */}
              <div className="space-y-1.5 max-w-sm text-center">
                <p className="text-xs sm:text-sm font-black text-slate-800 dark:text-white">
                  QR Code Siap Dipindai (Scan)
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Gunakan kamera smartphone atau pemindai QR untuk langsung membuka formulir survei masyarakat.
                </p>
              </div>

              {/* Action Buttons Grid */}
              <div className="w-full pt-4 border-t border-slate-100 dark:border-gray-800 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    type="button"
                    onClick={() => handleDownload(false)}
                    className="rounded-2xl py-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 cursor-pointer gap-2"
                  >
                    <Download className="size-4" />
                    <span>Unduh PNG (HD)</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDownload(true)}
                    className="rounded-2xl py-6 border-slate-200 dark:border-gray-700 font-bold text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-gray-800 cursor-pointer gap-2"
                  >
                    <FileImage className="size-4 text-emerald-600" />
                    <span>Unduh Transparan</span>
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopyImage}
                    className="rounded-2xl py-5 border-slate-200 dark:border-gray-700 font-bold text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-gray-800 cursor-pointer gap-2"
                  >
                    {copiedImage ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4 text-slate-500" />}
                    <span>{copiedImage ? "Gambar Tersalin!" : "Salin Gambar"}</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrint}
                    className="rounded-2xl py-5 border-slate-200 dark:border-gray-700 font-bold text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-gray-800 cursor-pointer gap-2"
                  >
                    <Printer className="size-4 text-emerald-600" />
                    <span>Cetak Lembar QR</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
