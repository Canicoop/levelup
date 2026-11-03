import { useId, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ReorderButtons } from '@/features/workout/components/reorder-buttons'
import { TargetsSheet } from '@/features/workout/components/targets-sheet'
import { useMoveRoutineExercise } from '@/features/workout/hooks/use-routine-mutations'
import { getErrorMessage } from '@/features/workout/lib/errors'
import { formatTargets } from '@/features/workout/lib/targets'
import type { RoutineExercise } from '@/features/workout/lib/types'

type RoutineExerciseListProps = {
  routineId: string
  entries: RoutineExercise[]
}

// The "Exercícios" section of the routine editor. A tap opens the sets and reps
// panel; "Ordenar" swaps the chevrons for ▲▼, as in the routine list.
export function RoutineExerciseList({ routineId, entries }: RoutineExerciseListProps) {
  const [ordering, setOrdering] = useState(false)
  // The entry stays set while the sheet closes, so its content does not vanish
  // mid-animation; `open` alone controls the sheet.
  const [selected, setSelected] = useState<RoutineExercise | null>(null)
  const [open, setOpen] = useState(false)
  const move = useMoveRoutineExercise(routineId)
  const titleId = useId()

  const canOrder = entries.length >= 2
  const isOrdering = ordering && canOrder

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3">
      <div className="flex min-h-11 items-center justify-between gap-2">
        <h2 id={titleId} className="text-xl font-semibold tracking-tight">
          Exercícios
        </h2>
        {canOrder && (
          <Button variant="ghost" aria-pressed={isOrdering} onClick={() => setOrdering(!isOrdering)}>
            {isOrdering ? 'Concluído' : 'Ordenar'}
          </Button>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ainda não tem exercícios.</p>
      ) : (
        <Card className="gap-0 py-0">
          <ul className="divide-y divide-border">
            {entries.map((entry, index) => (
              <li key={entry.id}>
                {isOrdering ? (
                  <div className="flex min-h-14 items-center gap-2 py-1 pr-2 pl-4">
                    <EntryText entry={entry} />
                    <ReorderButtons
                      name={entry.exercise.name}
                      isFirst={index === 0}
                      isLast={index === entries.length - 1}
                      disabled={move.isPending}
                      onMove={(direction) => move.mutate({ entries, id: entry.id, direction })}
                    />
                  </div>
                ) : (
                  // The ring is inset: the card clips anything outside it.
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(entry)
                      setOpen(true)
                    }}
                    className="flex min-h-14 w-full touch-manipulation items-center gap-3 px-4 py-2 text-left outline-none select-none transition-[opacity,background-color] duration-150 ease-out hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset active:opacity-70 motion-reduce:transition-none"
                  >
                    <EntryText entry={entry} />
                    <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
      {move.error && (
        <p role="alert" className="text-sm text-destructive">
          {getErrorMessage(move.error)}
        </p>
      )}

      <TargetsSheet open={open} onOpenChange={setOpen} routineId={routineId} entry={selected} />
    </section>
  )
}

function EntryText({ entry }: { entry: RoutineExercise }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <span className="text-base font-medium wrap-break-word">{entry.exercise.name}</span>
      <span className="text-sm text-muted-foreground tabular-nums">{formatTargets(entry)}</span>
    </div>
  )
}
