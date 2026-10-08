import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, FileText, Hash, CheckCircle2, XCircle, Pencil, Trash2 } from "lucide-react";
import { TableRow, TableCell } from "@/components/ui/table";
import type { Service } from "@/types";

interface SortableServiceRowProps {
  service: Service;
  onEdit: (s: Service) => void;
  onDeleteDialog: (s: Service) => void;
}

export function SortableServiceRow({
  service,
  onEdit,
  onDeleteDialog,
}: SortableServiceRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: service.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    position: "relative" as const,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={`group transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50 ${
        isDragging
          ? "bg-emerald-50/80 dark:bg-emerald-900/30 shadow-xl ring-2 ring-emerald-500/30 rounded-xl"
          : ""
      }`}
    >
      <TableCell className="w-12 text-center">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors touch-none"
          {...attributes}
          {...listeners}
          title="Geser untuk mengatur urutan"
        >
          <GripVertical className="size-4" />
        </button>
      </TableCell>

      <TableCell className="font-semibold text-slate-900 dark:text-white">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/80 dark:bg-emerald-950/40 dark:border-emerald-900/40">
            <FileText className="size-4" />
          </div>
          <span className="text-sm font-bold tracking-tight">
            {service.name}
          </span>
        </div>
      </TableCell>

      <TableCell>
        <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-slate-700">
          <Hash className="size-3 text-slate-400" />
          {service.slug}
        </span>
      </TableCell>

      <TableCell className="max-w-xs text-xs text-slate-500 dark:text-slate-400 truncate">
        {service.description ? (
          <span className="font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-900 px-2 py-0.5 rounded-md">
            {service.description}
          </span>
        ) : (
          <span className="italic text-slate-400">Tidak ada bidang</span>
        )}
      </TableCell>

      <TableCell>
        {service.is_active ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900/50">
            <CheckCircle2 className="size-3.5 text-emerald-600" />
            Aktif
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900/50">
            <XCircle className="size-3.5 text-rose-600" />
            Nonaktif
          </span>
        )}
      </TableCell>

      <TableCell className="text-right">
        <div className="flex justify-end items-center gap-1.5">
          <button
            type="button"
            onClick={() => onEdit(service)}
            className="flex size-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 border border-blue-100 transition-all cursor-pointer"
            title="Edit Layanan"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDeleteDialog(service)}
            className="flex size-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 border border-rose-100 transition-all cursor-pointer"
            title="Hapus Layanan"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </TableCell>
    </TableRow>
  );
}
