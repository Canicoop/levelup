import { PageHeader } from '@/components/layout/page-header'
import { RoutineList } from '@/features/workout/components/routine-list'

export function WorkoutPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Treino" />
      <RoutineList />
    </div>
  )
}
