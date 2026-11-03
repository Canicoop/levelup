import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useExercises } from '@/features/workout/hooks/use-workout-queries'
import { formatExerciseCount } from '@/features/workout/lib/labels'

// The way into the Exercises screen from the Workout tab, with how many active
// exercises there are. Without data (loading or offline) the count is left out.
export function ExercisesLink() {
  const exercises = useExercises()
  const activeCount = exercises.data?.filter((exercise) => !exercise.archived_at).length

  return (
    <Card className="gap-0 py-0">
      {/* The ring is inset: the card clips anything outside it. */}
      <Link
        to="/treino/exercicios"
        className="flex min-h-14 touch-manipulation items-center gap-3 px-4 py-2 outline-none select-none transition-[opacity,background-color] duration-150 ease-out hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset active:opacity-70 motion-reduce:transition-none"
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-base font-medium">Exercícios</span>
          {activeCount !== undefined ? (
            <span className="text-sm text-muted-foreground">{formatExerciseCount(activeCount)}</span>
          ) : (
            exercises.isPending && <Skeleton aria-hidden className="mt-1.5 h-3.5 w-20" />
          )}
        </div>
        <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
      </Link>
    </Card>
  )
}
