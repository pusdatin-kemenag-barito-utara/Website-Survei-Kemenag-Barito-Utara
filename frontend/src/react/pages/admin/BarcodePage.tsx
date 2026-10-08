import { useEffect, useRef, useState, useCallback } from "react";
import QRCode from "qrcode";
import { Download, QrCode, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchCachedServices, getCachedServicesSync } from "@/lib/data-cache";
import type { Service } from "@/types";
import { toast } from "sonner";
import { BarcodeSettingsCard } from "@/components/admin/barcode/BarcodeSettingsCard";
import { BarcodePreviewCard } from "@/components/admin/barcode/BarcodePreviewCard";

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
      ? ((window as { __ENV__?: { PUBLIC_APP_URL?: string } }).__ENV__
          ?.PUBLIC_APP_URL || window.location.origin)
      : import.meta.env.PUBLIC_APP_URL || "";
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

                ctx.strokeStyle = "#e2e8f0";
                ctx.lineWidth = 1.5;
                ctx.stroke();

                ctx.drawImage(img, x, y, logoSize, logoSize);
                resolve();
              };
              img.onerror = () => resolve();
            } else {
              resolve();
            }
          }
        );
      });
    },
    [targetUrl, centerLogo, qrColor]
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
        : services.find((s) => s.id === selectedServiceId)?.slug || "Layanan";

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
        const item = new ClipboardItem({ "image/png": blob });
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
            {copiedLink ? (
              <Check className="size-4 text-emerald-600" />
            ) : (
              <Copy className="size-4 text-slate-500" />
            )}
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
        {/* Left Column: Konfigurasi QR Code */}
        <div className="lg:col-span-6 space-y-6 print:hidden">
          <BarcodeSettingsCard
            services={services}
            selectedServiceId={selectedServiceId}
            onSelectServiceId={setSelectedServiceId}
            centerLogo={centerLogo}
            onSelectCenterLogo={setCenterLogo}
            qrColor={qrColor}
            onSelectQrColor={setQrColor}
            targetUrl={targetUrl}
            copiedLink={copiedLink}
            onCopyLink={handleCopyLink}
          />
        </div>

        {/* Right Column: Live QR Preview */}
        <div className="lg:col-span-6 space-y-6">
          <BarcodePreviewCard
            canvasRef={canvasRef}
            selectedServiceName={selectedServiceName}
            copiedImage={copiedImage}
            onDownload={handleDownload}
            onCopyImage={handleCopyImage}
            onPrint={handlePrint}
          />
        </div>
      </div>
    </div>
  );
}
