import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import type { Response } from '@/types'

interface ResponDeleteDialogProps {
  deleteDialog: Response | null
  setDeleteDialog: (r: Response | null) => void
  confirmDelete: () => void
  deleting: boolean
}

export function ResponDeleteDialog({
  deleteDialog,
  setDeleteDialog,
  confirmDelete,
  deleting,
}: ResponDeleteDialogProps) {
  useEffect(() => {
    if (!deleteDialog) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        if (!deleting) {
          setDeleteDialog(null)
        }
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (!deleting) {
          confirmDelete()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [deleteDialog, deleting, confirmDelete, setDeleteDialog])

  return (
    <AlertDialog open={Boolean(deleteDialog)} onOpenChange={(open) => !open && !deleting && setDeleteDialog(null)}>
      <AlertDialogContent className="rounded-3xl border-slate-100 max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base font-extrabold text-slate-900">
            Hapus Data Respon Ini?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-slate-500 font-medium leading-relaxed">
            Data respon survei dari{' '}
            <strong className="text-slate-800">
              {deleteDialog?.respondent_name || 'Responden Anonim'}
            </strong>{' '}
            akan dihapus secara permanen beserta seluruh rincian jawaban penilaian. Tindakan ini tidak dapat dibatalkan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4 flex flex-row items-center justify-end gap-2">
          <AlertDialogCancel
            className="rounded-xl text-xs font-bold gap-1.5 cursor-pointer"
            disabled={deleting}
            onClick={() => setDeleteDialog(null)}
          >
            <span>Batal</span>
            <kbd className="hidden sm:inline-block text-[10px] bg-slate-100 dark:bg-gray-800 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 dark:border-gray-700 font-mono">
              Esc
            </kbd>
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              if (!deleting) {
                confirmDelete()
              }
            }}
            disabled={deleting}
            className="rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white gap-1.5 cursor-pointer shadow-md shadow-rose-600/20"
          >
            {deleting ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="size-3.5 animate-spin" />
                <span>Menghapus...</span>
              </span>
            ) : (
              <>
                <span>Ya, Hapus Data</span>
                <kbd className="hidden sm:inline-block text-[10px] bg-rose-700/70 text-rose-100 px-1.5 py-0.5 rounded border border-rose-400/30 font-mono">
                  ↵ Enter
                </kbd>
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

