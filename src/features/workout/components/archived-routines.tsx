import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useSetRoutineArchived } from '@/features/workout/hooks/use-routine-mutations'
import { getErrorMessage } from '@/features/workout/lib/errors'
import { formatExerciseCount } from '@/features/workout/lib/labels'
import type { Routine, RoutineSummary } from '@/features/workout/lib/types'

type ArchivedRoutinesProps = {
  archived: RoutineSummary[]
  // Every routine: reactivating needs the active ones to find the end of the list.
  routines: Routine[]
}

// Collapsed by default: archived routines are rarely needed.
export function ArchivedRoutines({ archived, routines }: ArchivedRoutinesProps) {
  const [expanded, setExpanded] = useState(false)
  const listId = useId()

  if (archived.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={listId}
        onClick={() => setExpanded((value) => !value)}
        className="-mx-2 flex min-h-11 touch-manipulation items-center gap-1 self-start rounded-lg px-2 text-sm font-medium text-muted-foreground outline-none select-none transition-[opacity,background-color] duration-150 ease-out hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring active:opacity-70 motion-reduce:transition-none"
      >
        Arquivadas ({archived.length})
        <ChevronDown
          aria-hidden
          strokeWidth={1.75}
          className={`size-4 transition-transform duration-150 ease-out motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      {expanded && (
        <Card id={listId} className="gap-0 py-0">
          <ul className="divide-y divide-border">
            {archived.map((routine) => (
              <ArchivedRoutineRow key={routine.id} routine={routine} routines={routines} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

// Each row has its own mutation, so only the routine being reactivated is
// disabled, and its error shows next to it.
function ArchivedRoutineRow({ routine, routines }: { routine: RoutineSummary; routines: Routine[] }) {
  const reactivate = useSetRoutineArchived()

  return (
    <li className="flex flex-col gap-1 px-4 py-2">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-base font-medium">{routine.name}</span>
          <span className="text-sm text-muted-foreground">{formatExerciseCount(routine.exercise_count)}</span>
        </div>
        <Button
          variant="outline"
          aria-label={`Reativar: ${routine.name}`}
          disabled={reactivate.isPending}
          onClick={() => reactivate.mutate({ id: routine.id, archived: false, routines })}
        >
          {reactivate.isPending ? 'A reativar…' : 'Reativar'}
        </Button>
      </div>
      {reactivate.error && (
        <p role="alert" className="text-sm text-destructive">
          {getErrorMessage(reactivate.error)}
        </p>
      )}
    </li>
  )
}
