import { Check, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WorkoutSetRow } from '@/features/workout/components/workout-set-row'
import {
  MAX_SETS_PER_EXERCISE,
  isExerciseDone,
  repsPlaceholder,
  type ActiveExercise,
} from '@/features/workout/lib/active-workout'
import { formatLastSets, formatSetProgress } from '@/features/workout/lib/labels'
import { formatTargets } from '@/features/workout/lib/targets'

type WorkoutExerciseProps = {
  exercise: ActiveExercise
  open: boolean
  // False when the workout started without network: there is no history to show.
  showLastSets: boolean
  rowRef: (row: HTMLElement | null) => void
  onHeaderTap: () => void
  onToggleSet: (index: number) => string | null
  onAddSet: () => void
}

// One exercise of the workout. Closed: its name and progress. Open: last time,
// the goal and the sets.
export function WorkoutExercise({
  exercise,
  open,
  showLastSets,
  rowRef,
  onHeaderTap,
  onToggleSet,
  onAddSet,
}: WorkoutExerciseProps) {
  const done = isExerciseDone(exercise)
  const goal = formatTargets({
    target_sets: exercise.targetSets,
    rep_min: exercise.repMin,
    rep_max: exercise.repMax,
  })

  return (
    // The margin keeps it clear of the notch when it slides to the top.
    <li ref={rowRef} className="scroll-mt-[calc(1rem+env(safe-area-inset-top))]">
      {/* The ring is inset: the card clips anything outside it. */}
      <button
        type="button"
        aria-expanded={open}
        onClick={onHeaderTap}
        className="flex min-h-14 w-full touch-manipulation items-center gap-3 px-4 py-2 text-left outline-none select-none transition-[opacity,background-color] duration-150 ease-out hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset active:opacity-70 motion-reduce:transition-none"
      >
        <span className="min-w-0 flex-1 text-base font-medium wrap-break-word">{exercise.name}</span>
        <span className="shrink-0 text-sm text-muted-foreground tabular-nums">{formatSetProgress(exercise.sets)}</span>
        {done && (
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground">
            <Check aria-label="Feito" className="size-4" strokeWidth={2.5} />
          </span>
        )}
      </button>

      {open && (
        <div className="flex flex-col gap-3 px-4 pb-4">
          <div className="flex flex-col gap-0.5 text-sm text-muted-foreground tabular-nums">
            <p>{goal}</p>
            {showLastSets && <p>{formatLastSets(exercise.lastSets)}</p>}
          </div>
          <ul className="flex flex-col gap-2">
            {exercise.sets.map((set, index) => (
              <WorkoutSetRow
                key={index}
                exerciseId={exercise.exerciseId}
                index={index}
                set={set}
                repsHint={repsPlaceholder(exercise, index)}
                onToggle={() => onToggleSet(index)}
              />
            ))}
          </ul>
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            disabled={exercise.sets.length >= MAX_SETS_PER_EXERCISE}
            onClick={onAddSet}
          >
            <Plus aria-hidden data-icon="inline-start" />
            Série
          </Button>
        </div>
      )}
    </li>
  )
}
