import { TableRow, TableCell } from "@/components/ui/table";
import {
  CalendarDays,
  XCircle,
  Check,
  Pencil,
  Trash2,
} from "lucide-react";
import type { SurveyPeriod } from "@/types";
import {
  getTypeBadge,
  getPeriodStatusBadge,
  formatDateDisplay,
  formatDateDMY,
} from "./PeriodeBadges";

interface PeriodeTableRowProps {
  period: SurveyPeriod;
  activePeriod?: SurveyPeriod;
  settingActive: boolean;
  onToggleActive: (p: SurveyPeriod) => void;
  onEdit: (p: SurveyPeriod) => void;
  onDelete: (p: SurveyPeriod) => void;
}

export function PeriodeTableRow({
  period,
  activePeriod,
  settingActive,
  onToggleActive,
  onEdit,
  onDelete,
}: PeriodeTableRowProps) {
  return (
    <TableRow
      className={`group hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
        period.is_active ? "bg-emerald-50/60 dark:bg-emerald-950/20" : ""
      }`}
    >
      <TableCell className="pl-6 font-semibold text-slate-900 dark:text-white">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex size-8 items-center justify-center rounded-xl ${
              period.is_active
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            <CalendarDays className="size-4" />
          </div>
          <span className="text-sm font-bold text-slate-900 dark:text-white">
            {period.label}
          </span>
        </div>
      </TableCell>

      <TableCell>{getTypeBadge(period.period_type)}</TableCell>

      <TableCell className="text-xs font-semibold text-slate-700 dark:text-slate-200">
        <div className="flex flex-col items-start gap-0.5">
          <span className="font-bold text-slate-900 dark:text-white">
            {formatDateDisplay(period.start_date)}
          </span>
          <span className="font-mono text-[11px] text-slate-500 bg-slate-100 dark:bg-gray-800 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-gray-700">
            {formatDateDMY(period.start_date)}
          </span>
        </div>
      </TableCell>

      <TableCell className="text-xs font-semibold text-slate-700 dark:text-slate-200">
        <div className="flex flex-col items-start gap-0.5">
          <span className="font-bold text-slate-900 dark:text-white">
            {formatDateDisplay(period.end_date)}
          </span>
          <span className="font-mono text-[11px] text-slate-500 bg-slate-100 dark:bg-gray-800 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-gray-700">
            {formatDateDMY(period.end_date)}
          </span>
        </div>
      </TableCell>

      <TableCell>{getPeriodStatusBadge(period, activePeriod)}</TableCell>

      <TableCell className="text-right pr-6">
        <div className="flex justify-end items-center gap-1.5">
          {period.is_active ? (
            <button
              type="button"
              onClick={() => onToggleActive(period)}
              disabled={settingActive}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold text-xs transition-all cursor-pointer shadow-xs disabled:opacity-50"
              title="Nonaktifkan periode ini"
            >
              <XCircle className="size-3.5 text-rose-600" />
              <span>Nonaktifkan</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onToggleActive(period)}
              disabled={settingActive}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/80 font-bold text-xs transition-all cursor-pointer shadow-xs disabled:opacity-50"
              title="Aktifkan periode ini secara manual"
            >
              <Check className="size-3.5 text-emerald-600" />
              <span>Aktifkan</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onEdit(period)}
            className="flex size-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-all cursor-pointer"
            title="Edit Periode"
          >
            <Pencil className="size-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onDelete(period)}
            className="flex size-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100 transition-all cursor-pointer"
            title="Hapus Periode"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </TableCell>
    </TableRow>
  );
}
