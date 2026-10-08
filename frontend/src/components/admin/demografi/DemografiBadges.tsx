import { ListFilter, CheckSquare, ToggleLeft, Type, Hash } from "lucide-react";

export const getTypeBadge = (type: string) => {
  switch (type) {
    case "select":
      return (
        <span className="inline-flex items-center gap-1 font-bold text-[11px] bg-blue-50 text-blue-700 border border-blue-200/80 px-2.5 py-1 rounded-lg">
          <ListFilter className="size-3 text-blue-600" />
          Dropdown (Pilihan)
        </span>
      );
    case "checkbox":
      return (
        <span className="inline-flex items-center gap-1 font-bold text-[11px] bg-purple-50 text-purple-700 border border-purple-200/80 px-2.5 py-1 rounded-lg">
          <CheckSquare className="size-3 text-purple-600" />
          Checkbox (Multi Pilihan)
        </span>
      );
    case "toggle":
      return (
        <span className="inline-flex items-center gap-1 font-bold text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2.5 py-1 rounded-lg">
          <ToggleLeft className="size-3 text-emerald-600" />
          Toggle (Ya/Tidak)
        </span>
      );
    case "text":
      return (
        <span className="inline-flex items-center gap-1 font-bold text-[11px] bg-amber-50 text-amber-700 border border-amber-200/80 px-2.5 py-1 rounded-lg">
          <Type className="size-3 text-amber-600" />
          Teks Bebas
        </span>
      );
    case "number":
      return (
        <span className="inline-flex items-center gap-1 font-bold text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-2.5 py-1 rounded-lg">
          <Hash className="size-3 text-indigo-600" />
          Angka
        </span>
      );
    default:
      return type;
  }
};
