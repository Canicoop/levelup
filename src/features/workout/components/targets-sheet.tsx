import { useId, useRef, useState, type FormEvent, type RefObject } from 'react'
import { Minus, Plus } from 'lucide-react'
import { BottomSheet } from '@/components/bottom-sheet'
import { useSheetBusy } from '@/components/sheet-busy'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  useRemoveRoutineExercise,
  useUpdateRoutineExercise,
} from '@/features/workout/hooks/use-routine-mutations'
import { getErrorMessage } from '@/features/workout/lib/errors'
import { validateTargets } from '@/features/workout/lib/targets'
import type { RoutineExercise } from '@/features/workout/lib/types'

const MIN_SETS = 1
const MAX_SETS = 20

type TargetsSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  routineId: string
  // Kept by the caller while the sheet closes, so the content does not vanish
  // mid-animation.
  entry: RoutineExercise | null
}

// Sets and rep range of one exercise in a routine, and removing it.
export function TargetsSheet({ open, onOpenChange, routineId, entry }: TargetsSheetProps) {
  // Focus starts on "−", not on a field, so the iPhone keyboard does not open by itself.
  const firstRef = useRef<HTMLButtonElement>(null)

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={entry?.exercise.name ?? ''}
      initialFocus={firstRef}
    >
      {entry && (
        <TargetsForm
          // A new entry starts a new form, with its own values.
          key={entry.id}
          firstRef={firstRef}
          routineId={routineId}
          entry={entry}
          onDone={() => onOpenChange(false)}
        />
      )}
    </BottomSheet>
  )
}

function TargetsForm({
  firstRef,
  routineId,
  entry,
  onDone,
}: {
  firstRef: RefObject<HTMLButtonElement | null>
  routineId: string
  entry: RoutineExercise
  onDone: () => void
}) {
  const update = useUpdateRoutineExercise(routineId)
  const remove = useRemoveRoutineExercise(routineId)
  const [sets, setSets] = useState(entry.target_sets)
  const [repMin, setRepMin] = useState(entry.rep_min?.toString() ?? '')
  const [repMax, setRepMax] = useState(entry.rep_max?.toString() ?? '')
  const [invalid, setInvalid] = useState<string | null>(null)
  const ids = { sets: useId(), hint: useId(), error: useId(), removeError: useId() }

  // One action at a time: while either saves, both are disabled and the sheet stays open.
  const busy = update.isPending || remove.isPending
  useSheetBusy(busy)

  const error = invalid ?? (update.error ? getErrorMessage(update.error) : null)

  function edit() {
    setInvalid(null)
    update.reset()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const result = validateTargets({ targetSets: sets, repMin, repMax })
    if (!result.ok) {
      setInvalid(result.error)
      return
    }
    update.mutate({ id: entry.id, targets: result.value }, { onSuccess: onDone })
  }

  const repsDescribedBy = [ids.hint, error ? ids.error : null].filter(Boolean).join(' ')

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4">
          <span id={ids.sets} className="text-sm font-medium">
            Séries
          </span>
          <div role="group" aria-labelledby={ids.sets} className="flex items-center gap-2">
            <Button
              ref={firstRef}
              type="button"
              variant="outline"
              size="icon-lg"
              aria-label="Menos uma série"
              disabled={sets <= MIN_SETS || busy}
              onClick={() => {
                setSets((value) => value - 1)
                edit()
              }}
            >
              <Minus aria-hidden className="size-5" strokeWidth={1.75} />
            </Button>
            {/* Announced when it changes, so the − and + have spoken feedback. */}
            <output aria-live="polite" className="w-8 text-center text-lg font-semibold tabular-nums">
              {sets}
            </output>
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              aria-label="Mais uma série"
              disabled={sets >= MAX_SETS || busy}
              onClick={() => {
                setSets((value) => value + 1)
                edit()
              }}
            >
              <Plus aria-hidden className="size-5" strokeWidth={1.75} />
            </Button>
          </div>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">
            Repetições
          </legend>
          <div className="flex items-center gap-3">
            <Input
              value={repMin}
              onChange={(event) => {
                setRepMin(event.target.value)
                edit()
              }}
              inputMode="numeric"
              autoComplete="off"
              placeholder="mín."
              aria-label="Mínimo de repetições"
              aria-invalid={error ? true : undefined}
              aria-describedby={repsDescribedBy}
              className="text-center tabular-nums"
            />
            <span className="text-sm text-muted-foreground">a</span>
            <Input
              value={repMax}
              onChange={(event) => {
                setRepMax(event.target.value)
                edit()
              }}
              inputMode="numeric"
              autoComplete="off"
              placeholder="máx."
              aria-label="Máximo de repetições"
              aria-invalid={error ? true : undefined}
              aria-describedby={repsDescribedBy}
              className="text-center tabular-nums"
            />
          </div>
          <p id={ids.hint} className="text-sm text-muted-foreground">
            Deixa vazio se não tiveres um objetivo.
          </p>
        </fieldset>

        <div className="flex flex-col gap-2">
          {error && (
            <p id={ids.error} role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {update.isPending ? 'A guardar…' : 'Guardar'}
          </Button>
        </div>
      </form>

      <div className="flex flex-col items-center gap-2">
        <Button
          variant="ghost"
          size="lg"
          className="w-full text-destructive hover:text-destructive"
          disabled={busy}
          aria-describedby={remove.error ? ids.removeError : undefined}
          onClick={() => remove.mutate(entry.id, { onSuccess: onDone })}
        >
          {remove.isPending ? 'A retirar…' : 'Retirar da rotina'}
        </Button>
        {remove.error && (
          <p id={ids.removeError} role="alert" className="text-sm text-destructive">
            {getErrorMessage(remove.error)}
          </p>
        )}
      </div>
    </div>
  )
}
