import { PageHeader } from '@/components/layout/page-header'
import { ActiveWorkoutCard } from '@/features/workout/components/active-workout-card'
import { ExercisesLink } from '@/features/workout/components/exercises-link'
import { NextWorkoutCard } from '@/features/workout/components/next-workout-card'
import { RoutineList } from '@/features/workout/components/routine-list'
import { useActiveWorkout } from '@/features/workout/hooks/use-active-workout'

export function WorkoutPage() {
  const workout = useActiveWorkout()

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Treino" />
      {workout ? <ActiveWorkoutCard workout={workout} /> : <NextWorkoutCard />}
      <RoutineList />
      <ExercisesLink />
    </div>
  )
}
