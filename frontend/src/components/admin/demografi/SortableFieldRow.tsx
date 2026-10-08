import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Key,
  ListFilter,
  CheckCircle2,
  XCircle,
  Pencil,
  Trash2,
} from "lucide-react";
import { TableRow, TableCell } from "@/components/ui/table";
import type { DemographicField } from "@/types";
import { getTypeBadge } from "./DemografiBadges";

interface SortableFieldRowProps {
  f: DemographicField;
  onEdit: (field: DemographicField) => void;
  onDeleteDialog: (field: DemographicField) => void;
  onOpenOptionsModal: (field: DemographicField) => void;
}

export function SortableFieldRow({
  f,
  onEdit,
  onDeleteDialog,
  onOpenOptionsModal,
}: SortableFieldRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: f.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 0,
    position: "relative" as const,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={`group transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50 ${
        isDragging
          ? "bg-blue-50/80 dark:bg-blue-900/30 shadow-xl ring-2 ring-blue-500/30 rounded-xl"
          : ""
      }`}
    >
      <TableCell className="w-12 text-center pl-6">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors touch-none inline-flex items-center justify-center"
          title="Geser untuk mengatur urutan"
        >
          <GripVertical className="size-4" />
        </button>
      </TableCell>

      <TableCell className="text-center text-xs font-bold text-slate-400">
        {f.sort_order}
      </TableCell>

      <TableCell>
        <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg border border-slate-200/80">
          <Key className="size-3 text-slate-400" />
          {f.field_key}
        </span>
      </TableCell>

      <TableCell className="font-semibold text-slate-900 dark:text-white">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-slate-900 dark:text-white">
            {f.label_id}
          </span>
          <span className="text-[11px] text-slate-400 italic">
            {f.label_en}
          </span>
        </div>
      </TableCell>

      <TableCell>{getTypeBadge(f.field_type)}</TableCell>

      <TableCell>
        {f.is_required ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
            WAJIB
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            OPSIONAL
          </span>
        )}
      </TableCell>

      <TableCell>
        {f.is_active ? (
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

      <TableCell className="text-right pr-6">
        <div className="flex justify-end items-center gap-1.5">
          {(f.field_type === "select" ||
            f.field_type === "checkbox" ||
            f.field_type === "toggle") && (
            <button
              type="button"
              onClick={() => onOpenOptionsModal(f)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-bold text-xs transition-all cursor-pointer shadow-xs"
              title="Kelola Pilihan Opsi"
            >
              <ListFilter className="size-3.5" />
              <span>Opsi</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onEdit(f)}
            className="flex size-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-all cursor-pointer"
            title="Edit Field"
          >
            <Pencil className="size-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onDeleteDialog(f)}
            className="flex size-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100 transition-all cursor-pointer"
            title="Hapus Field"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </TableCell>
    </TableRow>
  );
}
