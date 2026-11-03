import { useNavigate } from 'react-router'
import { BottomSheet } from '@/components/bottom-sheet'
import { useSheetBusy } from '@/components/sheet-busy'
import { Button } from '@/components/ui/button'
import { useSetRoutineArchived } from '@/features/workout/hooks/use-routine-mutations'
import { getErrorMessage } from '@/features/workout/lib/errors'
import type { Routine } from '@/features/workout/lib/types'

type ArchiveRoutineSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  routine: Routine
}

// Confirms archiving, then goes back to the Workout tab.
export function ArchiveRoutineSheet({ open, onOpenChange, routine }: ArchiveRoutineSheetProps) {
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={`Arquivar “${routine.name}”?`}>
      <ArchiveRoutineConfirm routine={routine} onCancel={() => onOpenChange(false)} />
    </BottomSheet>
  )
}

function ArchiveRoutineConfirm({ routine, onCancel }: { routine: Routine; onCancel: () => void }) {
  const navigate = useNavigate()
  const archive = useSetRoutineArchived()
  useSheetBusy(archive.isPending)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-center text-sm text-pretty text-muted-foreground">Podes reativá-la em Arquivadas.</p>
      {archive.error && (
        <p role="alert" className="text-center text-sm text-destructive">
          {getErrorMessage(archive.error)}
        </p>
      )}
      <div className="flex flex-col gap-2">
        <Button
          size="lg"
          className="w-full"
          disabled={archive.isPending}
          // Archiving ignores the list; it is only used when reactivating.
          onClick={() =>
            archive.mutate({ id: routine.id, archived: true, routines: [] }, { onSuccess: () => navigate('/treino') })
          }
        >
          {archive.isPending ? 'A arquivar…' : 'Arquivar'}
        </Button>
        <Button variant="outline" size="lg" className="w-full" disabled={archive.isPending} onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
