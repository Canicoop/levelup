type RoutineInOrder = { id: string; archived_at: string | null }

// The routine "Iniciar treino" suggests: the first active one after the routine
// of the last finished workout, wrapping around to the start.
// `routines` is every routine, archived included, in list order: an archived
// routine keeps its position, so the one after it can still be found. Without a
// last workout (or if its routine is not in the list) it is the first active
// routine; with no active routine, null.
export function nextRoutine<T extends RoutineInOrder>(routines: T[], lastRoutineId: string | null): T | null {
  const last = routines.findIndex((routine) => routine.id === lastRoutineId)
  if (last === -1) return routines.find((routine) => !routine.archived_at) ?? null

  // Up to a full turn, so the same routine comes back if it is the only active one.
  for (let step = 1; step <= routines.length; step++) {
    const routine = routines[(last + step) % routines.length]
    if (!routine.archived_at) return routine
  }
  return null
}
