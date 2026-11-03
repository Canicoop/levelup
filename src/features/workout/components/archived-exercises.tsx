import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useSetExerciseArchived } from '@/features/workout/hooks/use-exercise-mutations'
import { getErrorMessage } from '@/features/workout/lib/errors'
import type { Exercise } from '@/features/workout/lib/types'

// Collapsed by default, like the archived routines (see ArchivedRoutines).
export function ArchivedExercises({ archived }: { archived: Exercise[] }) {
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
        Arquivados ({archived.length})
        <ChevronDown
          aria-hidden
          strokeWidth={1.75}
          className={`size-4 transition-transform duration-150 ease-out motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      {expanded && (
        <Card id={listId} className="gap-0 py-0">
          <ul className="divide-y divide-border">
            {archived.map((exercise) => (
              <ArchivedExerciseRow key={exercise.id} exercise={exercise} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

// Its own mutation per row: only the exercise being reactivated is disabled.
function ArchivedExerciseRow({ exercise }: { exercise: Exercise }) {
  const reactivate = useSetExerciseArchived()

  return (
    <li className="flex flex-col gap-1 px-4 py-2">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <span className="min-w-0 truncate text-base font-medium">{exercise.name}</span>
        <Button
          variant="outline"
          aria-label={`Reativar: ${exercise.name}`}
          disabled={reactivate.isPending}
          onClick={() => reactivate.mutate({ id: exercise.id, archived: false })}
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
