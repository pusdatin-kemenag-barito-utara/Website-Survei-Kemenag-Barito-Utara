import { TableRow, TableCell } from "@/components/ui/table";
import { FileText, CheckCircle2, XCircle, Pencil, Trash2 } from "lucide-react";
import type { Question, Unsur, Service } from "@/types";

interface PertanyaanTableRowProps {
  question: Question;
  unsurInfo?: Unsur;
  serviceInfo?: Service;
  onEdit: (q: Question) => void;
  onDelete: (q: Question) => void;
}

export function PertanyaanTableRow({
  question,
  unsurInfo,
  serviceInfo,
  onEdit,
  onDelete,
}: PertanyaanTableRowProps) {
  return (
    <TableRow className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
      {/* Unsur */}
      <TableCell className="pl-6 align-top py-4">
        {unsurInfo ? (
          <div className="flex flex-wrap items-center gap-1.5 max-w-[200px]">
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-slate-900 text-white shrink-0">
              U{unsurInfo.sort_order}
            </span>
            <span
              className={`text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 ${
                unsurInfo.index_type === "IPKP"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
              }`}
            >
              {unsurInfo.index_type}
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs leading-normal">
              {unsurInfo.name}
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-400 font-medium">Umum</span>
        )}
      </TableCell>

      {/* Teks Pertanyaan */}
      <TableCell className="py-4 pr-8 whitespace-normal break-words">
        <div className="space-y-1.5 whitespace-normal break-words">
          <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-relaxed whitespace-normal break-words">
            {question.question_text_id}
          </p>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 italic leading-snug whitespace-normal break-words">
            EN: {question.question_text_en}
          </p>
        </div>
      </TableCell>

      {/* Target Layanan */}
      <TableCell className="whitespace-nowrap align-top py-4">
        {question.service_id ? (
          <span className="inline-flex items-center gap-1 font-bold text-[11px] bg-teal-50 text-teal-800 border border-teal-200/80 px-2.5 py-1 rounded-lg">
            <FileText className="size-3 text-teal-600 shrink-0" />
            <span className="truncate max-w-[140px]">
              {serviceInfo?.name || "Spesifik Layanan"}
            </span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 font-bold text-[11px] bg-slate-100 text-slate-700 border border-slate-200/80 px-2.5 py-1 rounded-lg">
            Semua Layanan (Umum)
          </span>
        )}
      </TableCell>

      {/* Status */}
      <TableCell className="whitespace-nowrap align-top py-4">
        {question.is_active ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
            Aktif
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200/80">
            <XCircle className="size-3.5 text-rose-600 shrink-0" />
            Nonaktif
          </span>
        )}
      </TableCell>

      {/* Aksi */}
      <TableCell className="text-right pr-6 align-top py-4">
        <div className="flex justify-end items-center gap-1.5">
          <button
            type="button"
            onClick={() => onEdit(question)}
            className="flex size-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 transition-all cursor-pointer"
            title="Edit Pertanyaan"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(question)}
            className="flex size-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100 transition-all cursor-pointer"
            title="Hapus Pertanyaan"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </TableCell>
    </TableRow>
  );
}
