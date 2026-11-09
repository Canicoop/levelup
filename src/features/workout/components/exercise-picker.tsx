import { useState, type PointerEvent, type RefObject } from 'react'
import { Check, Plus } from 'lucide-react'
import { ErrorState } from '@/components/error-state'
import { OfflineState } from '@/components/offline-state'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useExercises } from '@/features/workout/hooks/use-workout-queries'
import { getErrorMessage } from '@/features/workout/lib/errors'
import { canCreateExercise, filterExercises } from '@/features/workout/lib/exercise-search'
import { cleanName } from '@/features/workout/lib/names'
import type { Exercise, ExerciseChoice } from '@/features/workout/lib/types'
import { isWaitingForNetwork } from '@/lib/query-state'

type ExercisePickerProps = {
  searchRef: RefObject<HTMLInputElement | null>
  // Exercises that cannot be picked again, shown as "✓ Na rotina" or "✓ No treino".
  takenIds: Set<string>
  takenLabel: string
  // Set when nothing more can be added; it shows and every row is disabled.
  limitMessage: string | null
  // The choice being saved, if any: its row says so and every row waits.
  pending: ExerciseChoice | null
  pendingLabel: string
  error: Error | null
  // `clear` empties the search and puts the focus back in it, for pickers that
  // stay open after a choice.
  onPick: (choice: ExerciseChoice, exercises: Exercise[], clear: () => void) => void
  // Called on every edit of the search, to clear the previous error.
  onEdit: () => void
}

// Tapping a row must not take the focus from the search field: on the iPhone
// that closes the keyboard, and iOS does not reopen it with a focus() called
// after the save finishes (only a user gesture can). Preventing the pointer's
// default keeps the focus where it is; the click still fires, and the rows
// still work from the keyboard (Tab, then Enter or Space).
const keepSearchFocus = (event: PointerEvent<HTMLButtonElement>) => event.preventDefault()

const rowClass =
  'flex min-h-12 w-full touch-manipulation items-center gap-3 px-4 py-2 text-left outline-none select-none transition-[opacity,background-color] duration-150 ease-out hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset active:opacity-70 disabled:pointer-events-none motion-reduce:transition-none'

// The exercise search shared by the routine editor and the workout: it ignores
// case and accents, offers "Criar “…”" for a new name, and marks what is taken.
export function ExercisePicker({
  searchRef,
  takenIds,
  takenLabel,
  limitMessage,
  pending,
  pendingLabel,
  error,
  onPick,
  onEdit,
}: ExercisePickerProps) {
  const exercises = useExercises()
  const [query, setQuery] = useState('')

  const all = exercises.data ?? []
  const results = filterExercises(all, query)
  const offerCreate = exercises.data !== undefined && canCreateExercise(all, query)
  const locked = limitMessage !== null || pending !== null

  function pick(choice: ExerciseChoice) {
    onPick(choice, all, () => {
      setQuery('')
      // After a tap the field never lost the focus (see keepSearchFocus);
      // focus() covers the keyboard case, where Enter was pressed on a row.
      searchRef.current?.focus()
    })
  }

  const isPendingRow = (exercise: Exercise) => pending?.kind === 'existing' && pending.exercise.id === exercise.id

  return (
    <div className="flex flex-col gap-3">
      <Input
        ref={searchRef}
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          onEdit()
        }}
        placeholder="Pesquisar ou criar"
        aria-label="Pesquisar exercícios"
        autoComplete="off"
        enterKeyHint="search"
      />

      {limitMessage && (
        <p role="status" className="text-sm text-muted-foreground">
          {limitMessage}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {getErrorMessage(error)}
        </p>
      )}

      {isWaitingForNetwork(exercises) ? (
        <OfflineState />
      ) : (
        exercises.isPending && (
          <div aria-busy="true" className="flex flex-col gap-3 py-2">
            <span className="sr-only">A carregar…</span>
            <Skeleton aria-hidden className="h-4 w-40" />
            <Skeleton aria-hidden className="h-4 w-32" />
          </div>
        )
      )}
      {!exercises.data && exercises.isError && <ErrorState onRetry={() => void exercises.refetch()} />}

      {exercises.data && (
        // Its own scroll, so the search field and the buttons below stay in view.
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
                  {pending?.kind === 'new' ? 'A criar…' : `Criar “${cleanName(query)}”`}
                </span>
              </button>
            </li>
          )}
          {results.map((exercise) => {
            const taken = takenIds.has(exercise.id)
            return (
              <li key={exercise.id}>
                <button
                  type="button"
                  className={rowClass}
                  disabled={taken || locked}
                  onPointerDown={keepSearchFocus}
                  onClick={() => pick({ kind: 'existing', exercise })}
                >
                  <span
                    className={`min-w-0 flex-1 text-base wrap-break-word ${taken ? 'text-muted-foreground' : ''}`}
                  >
                    {exercise.name}
                  </span>
                  {isPendingRow(exercise) ? (
                    <span className="shrink-0 text-sm text-muted-foreground">{pendingLabel}</span>
                  ) : taken ? (
                    <span className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
                      <Check aria-hidden className="size-4" strokeWidth={2} />
                      {takenLabel}
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
    </div>
  )
}
