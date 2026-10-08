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
import type { Question } from "@/types";

interface PertanyaanDeleteDialogProps {
  question: Question | null;
  deleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function PertanyaanDeleteDialog({
  question,
  deleting,
  onOpenChange,
  onConfirm,
}: PertanyaanDeleteDialogProps) {
  return (
    <AlertDialog open={!!question} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-3xl p-6 border border-slate-200 shadow-2xl">
        <AlertDialogHeader className="space-y-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 mx-auto sm:mx-0">
            <AlertTriangle className="size-6" />
          </div>
          <AlertDialogTitle className="text-lg font-extrabold text-slate-900">
            Hapus Pertanyaan Evaluasi?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-slate-500 leading-relaxed">
            Apakah Anda yakin ingin menghapus pertanyaan ini? Tindakan ini tidak dapat dibatalkan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4 flex gap-2">
          <AlertDialogCancel className="rounded-xl text-xs font-bold">
            Batal
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={deleting}
            className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold px-4 cursor-pointer"
          >
            {deleting ? (
              <Loader2 className="size-4 animate-spin mr-1" />
            ) : null}
            Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
