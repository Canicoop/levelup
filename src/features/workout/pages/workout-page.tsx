import { PageHeader } from '@/components/layout/page-header'
import { UpdateBanner } from '@/components/update-banner'
import { ActiveWorkoutCard } from '@/features/workout/components/active-workout-card'
import { ExercisesLink } from '@/features/workout/components/exercises-link'
import { NextWorkoutCard } from '@/features/workout/components/next-workout-card'
import { PendingWorkoutsLine } from '@/features/workout/components/pending-workouts-line'
import { RoutineList } from '@/features/workout/components/routine-list'
import { WorkoutHeatmap } from '@/features/workout/components/workout-heatmap'
import { WorkoutHistory } from '@/features/workout/components/workout-history'
import { useActiveWorkout } from '@/features/workout/hooks/use-active-workout'

export function WorkoutPage() {
  const workout = useActiveWorkout()

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Treino" />
      <UpdateBanner />
      <PendingWorkoutsLine />
      {workout ?<ActiveWorkoutCard workout={workout} /> : <NextWorkoutCard />}
      <WorkoutHeatmap />
      <RoutineList />
      <ExercisesLink />
      <WorkoutHistory />
    </div>
  )
}
