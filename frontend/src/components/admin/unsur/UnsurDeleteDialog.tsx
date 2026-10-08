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
import type { Unsur } from "@/types";

interface UnsurDeleteDialogProps {
  unsur: Unsur | null;
  deleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function UnsurDeleteDialog({
  unsur,
  deleting,
  onOpenChange,
  onConfirm,
}: UnsurDeleteDialogProps) {
  return (
    <AlertDialog open={!!unsur} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-3xl p-6 border border-slate-200 shadow-2xl">
        <AlertDialogHeader className="space-y-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 mx-auto sm:mx-0">
            <AlertTriangle className="size-6" />
          </div>
          <AlertDialogTitle className="text-lg font-extrabold text-slate-900">
            Hapus Unsur Penilaian?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-slate-500 leading-relaxed">
            Apakah Anda yakin ingin menghapus unsur &ldquo;
            <strong className="text-slate-800">{unsur?.name}</strong>
            &rdquo;? Seluruh butir pertanyaan kuesioner terkait juga akan terhapus.
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
