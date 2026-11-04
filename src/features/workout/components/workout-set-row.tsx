import { useId, useState } from 'react'
import { cn } from 'cn'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updateActiveWorkout } from '@/features/workout/active-workout-store'
import { editSet, type ActiveSet } from '@/features/workout/lib/active-workout'
import { setFieldError, type SetField } from '@/features/workout/lib/set-values'

type WorkoutSetRowProps = {
  exerciseId: string
  index: number
  set: ActiveSet
  // Last time's reps, as a suggestion. It does not count as a value.
  repsHint: string
  // Logs or unlogs the set. Returns the error when it refuses.
  onToggle: () => string | null
}

const FIELDS: SetField[] = ['weight', 'reps']

// One set: its number, weight, reps and ✓.
// A set without ✓ saves every key press. A logged set must stay valid, but typing
// passes through invalid values ("40" to "45" empties the field; "22," waits for
// the "5"), so what is typed lives in a draft: a valid value saves at once, an
// invalid one shows its error and the ✓ stays, and when the field loses focus the
// draft goes, leaving the last valid value.
export function WorkoutSetRow({ exerciseId, index, set, repsHint, onToggle }: WorkoutSetRowProps) {
  const [drafts, setDrafts] = useState<Partial<Record<SetField, string>>>({})
  const [refused, setRefused] = useState<{ field: SetField; message: string } | null>(null)
  const errorId = useId()
  const number = index + 1

  function change(field: SetField, value: string) {
    setRefused(null)
    if (set.done) setDrafts((current) => ({ ...current, [field]: value }))
    updateActiveWorkout((workout) => editSet(workout, exerciseId, index, field, value))
  }

  function toggle() {
    // On iOS tapping a button does not close the keyboard by itself.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    const message = onToggle()
    setRefused(message ? { field: setFieldError('weight', set.weight) ? 'weight' : 'reps', message } : null)
  }

  const draftField = FIELDS.find((field) => {
    const draft = drafts[field]
    return draft !== undefined && setFieldError(field, draft) !== null
  })
  const draftError = draftField && setFieldError(draftField, drafts[draftField] ?? '')
  const error = draftField && draftError ? { field: draftField, message: draftError } : refused

  function fieldProps(field: SetField) {
    const invalid = error?.field === field
    return {
      value: drafts[field] ?? set[field],
      onChange: (event: { target: { value: string } }) => change(field, event.target.value),
      onBlur: () => setDrafts((current) => ({ ...current, [field]: undefined })),
      autoComplete: 'off',
      className: 'h-11 min-w-0 flex-1 text-center tabular-nums',
      'aria-invalid': invalid ? true : undefined,
      'aria-describedby': invalid ? errorId : undefined,
    }
  }

  return (
    <li className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="w-5 shrink-0 text-center text-sm text-muted-foreground tabular-nums">{number}</span>
        <Input {...fieldProps('weight')} inputMode="decimal" aria-label={`Peso da série ${number}`} />
        <span className="shrink-0 text-sm text-muted-foreground">kg ×</span>
        <Input
          {...fieldProps('reps')}
          inputMode="numeric"
          placeholder={repsHint}
          aria-label={`Repetições da série ${number}`}
        />
        <Button
          variant={set.done ? 'default' : 'outline'}
          size="icon-lg"
          aria-label={`${set.done ? 'Desmarcar' : 'Registar'} série ${number}`}
          aria-pressed={set.done}
          className={cn(
            'size-11',
            set.done && 'bg-success text-success-foreground hover:bg-success/90',
          )}
          onClick={toggle}
        >
          <Check aria-hidden className="size-5" strokeWidth={2.25} />
        </Button>
      </div>
      {error && (
        <p id={errorId} role="alert" className="pl-7 text-sm text-destructive">
          {error.message}
        </p>
      )}
    </li>
  )
}
