import React from "react";
import {
  Sparkles,
  Download,
  FileImage,
  Copy,
  Check,
  Printer,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface BarcodePreviewCardProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  selectedServiceName: string;
  copiedImage: boolean;
  onDownload: (transparent?: boolean) => void;
  onCopyImage: () => void;
  onPrint: () => void;
}

export function BarcodePreviewCard({
  canvasRef,
  selectedServiceName,
  copiedImage,
  onDownload,
  onCopyImage,
  onPrint,
}: BarcodePreviewCardProps) {
  return (
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
              onClick={() => onDownload(false)}
              className="rounded-2xl py-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 cursor-pointer gap-2"
            >
              <Download className="size-4" />
              <span>Unduh PNG (HD)</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => onDownload(true)}
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
              onClick={onCopyImage}
              className="rounded-2xl py-5 border-slate-200 dark:border-gray-700 font-bold text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-gray-800 cursor-pointer gap-2"
            >
              {copiedImage ? (
                <Check className="size-4 text-emerald-600" />
              ) : (
                <Copy className="size-4 text-slate-500" />
              )}
              <span>{copiedImage ? "Gambar Tersalin!" : "Salin Gambar"}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={onPrint}
              className="rounded-2xl py-5 border-slate-200 dark:border-gray-700 font-bold text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-gray-800 cursor-pointer gap-2"
            >
              <Printer className="size-4 text-emerald-600" />
              <span>Cetak Lembar QR</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
