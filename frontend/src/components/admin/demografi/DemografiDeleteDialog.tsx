import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Loader2 } from "lucide-react";
import type { DemographicField } from "@/types";

interface DemografiDeleteDialogProps {
  field: DemographicField | null;
  deleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function DemografiDeleteDialog({
  field,
  deleting,
  onOpenChange,
  onConfirm,
}: DemografiDeleteDialogProps) {
  return (
    <AlertDialog open={!!field} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-3xl p-6 border border-slate-200 shadow-2xl">
        <AlertDialogHeader className="space-y-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 mx-auto sm:mx-0">
            <AlertTriangle className="size-6" />
          </div>
          <AlertDialogTitle className="text-lg font-extrabold text-slate-900">
            Hapus Field Demografi?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-slate-500 leading-relaxed">
            Apakah Anda yakin ingin menghapus field &ldquo;
            <strong className="text-slate-800">{field?.label_id}</strong>
            &rdquo;? Semua opsi yang berkaitan juga akan terhapus.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4 flex gap-2">
          <AlertDialogCancel className="rounded-xl text-xs font-bold">
            Batal
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs px-5 cursor-pointer shadow-md shadow-rose-600/20"
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="size-4 animate-spin mr-1.5" />
            ) : null}
            Ya, Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
