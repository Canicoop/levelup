import { PageHeader } from '@/components/layout/page-header'
import { ExercisesLink } from '@/features/workout/components/exercises-link'
import { RoutineList } from '@/features/workout/components/routine-list'

export function WorkoutPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Treino" />
      <RoutineList />
      <ExercisesLink />
    </div>
  )
}
