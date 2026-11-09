import { Check, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WorkoutSetRow } from '@/features/workout/components/workout-set-row'
import {
  MAX_SETS_PER_EXERCISE,
  MAX_WORKOUT_EXERCISES,
  canSkipExercise,
  isExerciseDone,
  repsPlaceholder,
  type ActiveExercise,
} from '@/features/workout/lib/active-workout'
import { formatLastSets, formatSetProgress } from '@/features/workout/lib/labels'
import { formatTargets } from '@/features/workout/lib/targets'

export const SETS_LIMIT_MESSAGE = `Um exercício pode ter até ${MAX_SETS_PER_EXERCISE} séries.`
export const WORKOUT_LIMIT_MESSAGE = `Um treino pode ter até ${MAX_WORKOUT_EXERCISES} exercícios.`

type WorkoutExerciseProps = {
  exercise: ActiveExercise
  open: boolean
  // False when the whole workout started without network: the screen says so
  // once, at the top, and no exercise shows a line.
  showLastSets: boolean
  // False when swapping would add an exercise to a full workout.
  canSwap: boolean
  rowRef: (row: HTMLElement | null) => void
  onHeaderTap: () => void
  onToggleSet: (index: number) => string | null
  onAddSet: () => void
  onSwap: () => void
  onSkip: () => void
  onResume: () => void
}

// One exercise of the workout. Closed: its name and progress, or "Saltado".
// Open: the goal, last time, and its sets with "+ Série", "Trocar" and "Saltar";
// a skipped one offers "Retomar exercício" instead.
export function WorkoutExercise({
  exercise,
  open,
  showLastSets,
  canSwap,
  rowRef,
  onHeaderTap,
  onToggleSet,
  onAddSet,
  onSwap,
  onSkip,
  onResume,
}: WorkoutExerciseProps) {
  const done = isExerciseDone(exercise)
  const setsFull = exercise.sets.length >= MAX_SETS_PER_EXERCISE
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
        <span
          className={`min-w-0 flex-1 text-base font-medium wrap-break-word ${exercise.skipped ? 'text-muted-foreground' : ''}`}
        >
          {exercise.name}
        </span>
        {exercise.skipped ? (
          <span className="shrink-0 text-sm text-muted-foreground">Saltado</span>
        ) : (
          <>
            <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
              {formatSetProgress(exercise.sets)}
            </span>
            {done && (
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground">
                <Check aria-label="Feito" className="size-4" strokeWidth={2.5} />
              </span>
            )}
          </>
        )}
      </button>

      {open && (
        <div className="flex flex-col gap-3 px-4 pb-4">
          <div className="flex flex-col gap-0.5 text-sm text-muted-foreground tabular-nums">
            <p>{goal}</p>
            {showLastSets && (
              <p>
                {exercise.lastSetsUnavailable
                  ? 'Sem ligação: a última vez não está disponível.'
                  : formatLastSets(exercise.lastSets)}
              </p>
            )}
          </div>

          {exercise.skipped ? (
            <Button variant="outline" size="lg" className="w-full" onClick={onResume}>
              Retomar exercício
            </Button>
          ) : (
            <>
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
              <div className="flex flex-col gap-1">
                <div className="flex gap-2">
                  <Button variant="outline" size="lg" className="flex-1" disabled={setsFull} onClick={onAddSet}>
                    <Plus aria-hidden data-icon="inline-start" />
                    Série
                  </Button>
                  <Button variant="outline" size="lg" className="flex-1" disabled={!canSwap} onClick={onSwap}>
                    Trocar
                  </Button>
                  {/* Only without logged sets, so skipping never hides work done. */}
                  {canSkipExercise(exercise) && (
                    <Button variant="outline" size="lg" className="flex-1" onClick={onSkip}>
                      Saltar
                    </Button>
                  )}
                </div>
                {setsFull && <p className="text-sm text-muted-foreground">{SETS_LIMIT_MESSAGE}</p>}
                {!canSwap && <p className="text-sm text-muted-foreground">{WORKOUT_LIMIT_MESSAGE}</p>}
              </div>
            </>
          )}
        </div>
      )}
    </li>
  )
}
