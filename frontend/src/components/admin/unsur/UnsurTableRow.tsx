import { TableRow, TableCell } from "@/components/ui/table";
import {
  Activity,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ListChecks,
  Pencil,
  Trash2,
} from "lucide-react";
import type { Unsur } from "@/types";

interface UnsurTableRowProps {
  unsur: Unsur;
  index: number;
  onNavigateToPertanyaan: (unsurId: string) => void;
  onEdit: (unsur: Unsur) => void;
  onDelete: (unsur: Unsur) => void;
}

export function UnsurTableRow({
  unsur,
  index,
  onNavigateToPertanyaan,
  onEdit,
  onDelete,
}: UnsurTableRowProps) {
  return (
    <TableRow className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
      <TableCell className="text-center text-xs font-bold text-slate-400">
        {unsur.sort_order || index + 1}
      </TableCell>

      <TableCell className="font-semibold text-slate-900 dark:text-white">
        <div className="flex items-center gap-3">
          <div
            className={`flex size-9 shrink-0 items-center justify-center rounded-xl border ${
              unsur.index_type === "IPKP"
                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                : "bg-indigo-50 text-indigo-600 border-indigo-100"
            }`}
          >
            {unsur.index_type === "IPKP" ? (
              <Activity className="size-4" />
            ) : (
              <ShieldCheck className="size-4" />
            )}
          </div>
          <span className="text-sm font-bold tracking-tight">{unsur.name}</span>
        </div>
      </TableCell>

      <TableCell>
        {unsur.index_type === "IPKP" ? (
          <span className="inline-flex items-center gap-1 font-bold text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2.5 py-1 rounded-lg">
            <Activity className="size-3 text-emerald-600" />
            IPKP (Kualitas)
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 font-bold text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-2.5 py-1 rounded-lg">
            <ShieldCheck className="size-3 text-indigo-600" />
            IPAK (Anti Korupsi)
          </span>
        )}
      </TableCell>

      <TableCell className="max-w-xs text-xs text-slate-500 dark:text-slate-400 truncate">
        {unsur.description || (
          <span className="italic text-slate-400">Tidak ada deskripsi</span>
        )}
      </TableCell>

      <TableCell>
        {unsur.is_active ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <CheckCircle2 className="size-3.5 text-emerald-600" />
            Aktif
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200/80">
            <XCircle className="size-3.5 text-rose-600" />
            Nonaktif
          </span>
        )}
      </TableCell>

      <TableCell className="text-right">
        <div className="flex justify-end items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigateToPertanyaan(unsur.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold text-xs transition-all cursor-pointer shadow-2xs"
            title="Kelola Pertanyaan Unsur Ini"
          >
            <ListChecks className="size-3.5 text-emerald-600" />
            <span>Pertanyaan</span>
          </button>

          <button
            type="button"
            onClick={() => onEdit(unsur)}
            className="flex size-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 transition-all cursor-pointer"
            title="Edit Unsur"
          >
            <Pencil className="size-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onDelete(unsur)}
            className="flex size-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100 transition-all cursor-pointer"
            title="Hapus Unsur"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </TableCell>
    </TableRow>
  );
}
