import { useRef, useState, type PointerEvent, type RefObject } from 'react'
import { Check, Plus } from 'lucide-react'
import { BottomSheet } from '@/components/bottom-sheet'
import { ErrorState } from '@/components/error-state'
import { useSheetBusy } from '@/components/sheet-busy'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useAddRoutineExercise, type ExerciseChoice } from '@/features/workout/hooks/use-routine-mutations'
import { useExercises } from '@/features/workout/hooks/use-workout-queries'
import { getErrorMessage } from '@/features/workout/lib/errors'
import { canCreateExercise, filterExercises } from '@/features/workout/lib/exercise-search'
import { cleanName } from '@/features/workout/lib/names'
import { ROUTINE_FULL_MESSAGE, isRoutineFull } from '@/features/workout/lib/routine-limits'
import type { Exercise, RoutineExercise } from '@/features/workout/lib/types'

type AddExerciseSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  routineId: string
  // The routine's current exercises: marked "✓ Na rotina", and counted for the limit.
  entries: RoutineExercise[]
}

// Search, create or reactivate exercises and add them to the routine. The
// sheet stays open after each addition, so several can be added in a row.
export function AddExerciseSheet({ open, onOpenChange, routineId, entries }: AddExerciseSheetProps) {
  // Here the keyboard should open: searching is the first thing to do.
  const searchRef = useRef<HTMLInputElement>(null)

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="Adicionar exercício" initialFocus={searchRef}>
      <ExercisePicker
        searchRef={searchRef}
        routineId={routineId}
        entries={entries}
        onDone={() => onOpenChange(false)}
      />
    </BottomSheet>
  )
}

// Tapping a row must not take the focus from the search field: on the iPhone
// that closes the keyboard, and iOS does not reopen it with a focus() called
// after the save finishes (only a user gesture can). Preventing the pointer's
// default keeps the focus where it is; the click still fires, and the rows
// still work from the keyboard (Tab, then Enter or Space).
const keepSearchFocus = (event: PointerEvent<HTMLButtonElement>) => event.preventDefault()

const rowClass =
  'flex min-h-12 w-full touch-manipulation items-center gap-3 px-4 py-2 text-left outline-none select-none transition-[opacity,background-color] duration-150 ease-out hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset active:opacity-70 disabled:pointer-events-none motion-reduce:transition-none'

function ExercisePicker({
  searchRef,
  routineId,
  entries,
  onDone,
}: {
  searchRef: RefObject<HTMLInputElement | null>
  routineId: string
  entries: RoutineExercise[]
  onDone: () => void
}) {
  const exercises = useExercises()
  const add = useAddRoutineExercise(routineId)
  const [query, setQuery] = useState('')
  useSheetBusy(add.isPending)

  const all = exercises.data ?? []
  const inRoutine = new Set(entries.map((entry) => entry.exercise_id))
  const results = filterExercises(all, query)
  const offerCreate = exercises.data !== undefined && canCreateExercise(all, query)
  const full = isRoutineFull(entries.length)
  // While one addition saves, every row waits.
  const locked = full || add.isPending

  function pick(choice: ExerciseChoice) {
    add.mutate(
      { choice, entries, exercises: all },
      {
        // The mutation ends after the refetch, so the row already shows "✓ Na rotina".
        // After a tap the field never lost the focus (see keepSearchFocus);
        // focus() covers the keyboard case, where Enter was pressed on a row.
        onSuccess: () => {
          setQuery('')
          searchRef.current?.focus()
        },
      },
    )
  }

  // The row being saved, to label it "A adicionar…".
  const pendingChoice = add.isPending ? add.variables.choice : null
  const isPendingRow = (exercise: Exercise) =>
    pendingChoice?.kind === 'existing' && pendingChoice.exercise.id === exercise.id

  return (
    <div className="flex flex-col gap-3">
      <Input
        ref={searchRef}
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          add.reset()
        }}
        placeholder="Pesquisar ou criar"
        aria-label="Pesquisar exercícios"
        autoComplete="off"
        enterKeyHint="search"
      />

      {full && (
        <p role="status" className="text-sm text-muted-foreground">
          {ROUTINE_FULL_MESSAGE}
        </p>
      )}
      {add.error && (
        <p role="alert" className="text-sm text-destructive">
          {getErrorMessage(add.error)}
        </p>
      )}

      {exercises.isPending && (
        <div aria-busy="true" className="flex flex-col gap-3 py-2">
          <span className="sr-only">A carregar…</span>
          <Skeleton aria-hidden className="h-4 w-40" />
          <Skeleton aria-hidden className="h-4 w-32" />
        </div>
      )}
      {!exercises.data && exercises.isError && <ErrorState onRetry={() => void exercises.refetch()} />}

      {exercises.data && (
        // Its own scroll, so the search field and "Concluído" stay in view.
        <ul className="-mx-4 max-h-[45dvh] divide-y divide-border overflow-y-auto overscroll-contain border-y border-border">
          {offerCreate && (
            <li>
              <button
                type="button"
                className={rowClass}
                disabled={locked}
                onPointerDown={keepSearchFocus}
                onClick={() => pick({ kind: 'new', name: query })}
              >
                <Plus aria-hidden className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                <span className="min-w-0 flex-1 font-medium wrap-break-word">
                  {pendingChoice?.kind === 'new' ? 'A criar…' : `Criar “${cleanName(query)}”`}
                </span>
              </button>
            </li>
          )}
          {results.map((exercise) => {
            const added = inRoutine.has(exercise.id)
            return (
              <li key={exercise.id}>
                <button
                  type="button"
                  className={rowClass}
                  disabled={added || locked}
                  onPointerDown={keepSearchFocus}
                  onClick={() => pick({ kind: 'existing', exercise })}
                >
                  <span
                    className={`min-w-0 flex-1 text-base wrap-break-word ${added ? 'text-muted-foreground' : ''}`}
                  >
                    {exercise.name}
                  </span>
                  {isPendingRow(exercise) ? (
                    <span className="shrink-0 text-sm text-muted-foreground">A adicionar…</span>
                  ) : added ? (
                    <span className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
                      <Check aria-hidden className="size-4" strokeWidth={2} />
                      Na rotina
                    </span>
                  ) : exercise.archived_at ? (
                    <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      Arquivado
                    </span>
                  ) : (
                    <Plus aria-hidden className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                  )}
                </button>
              </li>
            )
          })}
          {!offerCreate && results.length === 0 && (
            <li className="px-4 py-3 text-sm text-muted-foreground">
              {all.length === 0 ? 'Ainda não tens exercícios. Escreve um nome para criar.' : 'Nenhum exercício encontrado.'}
            </li>
          )}
        </ul>
      )}

      <Button variant="outline" size="lg" className="w-full" disabled={add.isPending} onClick={onDone}>
        Concluído
      </Button>
    </div>
  )
}
