import type { QueryClient } from '@tanstack/react-query'
import { getAccountId } from '@/features/auth/account'
import { fetchExercises } from '@/features/workout/api/exercises'
import { firstWorkoutMonthOptions, historyOptions, monthWorkoutsOptions } from '@/features/workout/api/history'
import { workoutKeys } from '@/features/workout/api/query-keys'
import { fetchActiveRoutinesWithExercises, fetchRoutines } from '@/features/workout/api/routines'
import { fetchLastRoutineId, fetchLastSets, saveLastSetsCopy } from '@/features/workout/api/workouts'
import { addMonths, monthOf } from '@/features/workout/lib/history'

// Prepares, in the background, what a workout started without network needs:
// the routine list, every active routine with its exercises (one request), the
// exercise list, the routine of the last workout, "Última vez" of all those
// exercises (one request to last_exercise_sets), and the finished workouts of
// this month and the one before, and the history's first page. They all live under
// workoutKeys.all, so they are kept on the device (see QueryProvider), and
// starting, "Trocar" and "+ Adicionar exercício" find them there.
// Failures are ignored: this only adds to what is already there.
//
// The reads below are written into the cache by hand after an await, so each
// write first checks that the account is still the one that asked: one that
// changed meanwhile (the cache was cleared for it) must not get another
// account's routines or sets. The prefetches need no check: clearing the cache
// removes their queries, so a late answer reaches no one.
export async function prepareWorkoutOffline(queryClient: QueryClient) {
  const accountId = getAccountId()
  const sameAccount = () => accountId !== null && getAccountId() === accountId
  void queryClient.prefetchQuery({ queryKey: workoutKeys.routines(), queryFn: fetchRoutines })
  void queryClient.prefetchQuery({ queryKey: workoutKeys.exercises(), queryFn: fetchExercises })
  void queryClient.prefetchQuery({ queryKey: workoutKeys.lastRoutineId(), queryFn: fetchLastRoutineId })
  // This month and the one before (the calendar, and this week when it starts
  // in the month before), the first workout's month (where ‹ stops) and the
  // history's first page, so they work offline.
  const month = monthOf(new Date())
  void queryClient.prefetchQuery(monthWorkoutsOptions(month))
  void queryClient.prefetchQuery(monthWorkoutsOptions(addMonths(month, -1)))
  void queryClient.prefetchQuery(firstWorkoutMonthOptions())
  void queryClient.prefetchInfiniteQuery(historyOptions())

  try {
    const routines = await fetchActiveRoutinesWithExercises()
    if (!sameAccount()) return
    for (const routine of routines) queryClient.setQueryData(workoutKeys.routine(routine.id), routine)

    const exerciseIds = [...new Set(routines.flatMap((routine) => routine.exercises.map((e) => e.exercise_id)))]
    if (exerciseIds.length === 0) return
    const lastSets = await fetchLastSets(exerciseIds)
    if (sameAccount()) saveLastSetsCopy(queryClient, exerciseIds, lastSets)
  } catch {
    // Offline or failing: what was kept from the last time stays.
  }
}
