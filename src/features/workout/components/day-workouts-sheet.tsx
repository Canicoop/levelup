import { BottomSheet } from '@/components/bottom-sheet'
import { Card } from '@/components/ui/card'
import { HistoryRow } from '@/features/workout/components/history-row'
import { formatDayLabel, type WorkoutRecord } from '@/features/workout/lib/history'

type DayWorkoutsSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Kept while the sheet closes, so its content does not vanish on the way out.
  day: string
  workouts: WorkoutRecord[]
  now: Date
}

// A heatmap day with two or more workouts (rule AV): its workouts, the most
// recent first, each opening its detail.
export function DayWorkoutsSheet({ open, onOpenChange, day, workouts, now }: DayWorkoutsSheetProps) {
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={formatDayLabel(day)}>
      <Card className="gap-0 py-0">
        <ul className="divide-y divide-border">
          {workouts.map((record) => (
            <li key={record.id}>
              <HistoryRow record={record} now={now} />
            </li>
          ))}
        </ul>
      </Card>
    </BottomSheet>
  )
}
