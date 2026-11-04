import type { LastSet } from '@/features/workout/lib/active-workout'
import { formatWeight } from '@/features/workout/lib/set-values'

// "Sem exercícios", "1 exercício", "6 exercícios".
export function formatExerciseCount(count: number) {
  if (count === 0) return 'Sem exercícios'
  return count === 1 ? '1 exercício' : `${count} exercícios`
}

// "Última vez: 40 × 12 · 22,5 × 10", or "Primeira vez" with no history.
export function formatLastSets(lastSets: LastSet[]) {
  if (lastSets.length === 0) return 'Primeira vez'
  const sets = lastSets.map((set) => `${formatWeight(set.weightKg)} × ${set.reps}`)
  return `Última vez: ${sets.join(' · ')}`
}

// "Nenhuma série registada", "1 série registada", "7 séries registadas".
export function formatLoggedSets(count: number) {
  if (count === 0) return 'Nenhuma série registada'
  return count === 1 ? '1 série registada' : `${count} séries registadas`
}

// The warning before discarding a workout with logged sets.
export function formatDiscardWarning(count: number) {
  return count === 1 ? 'A série registada perde-se.' : `As ${count} séries registadas perdem-se.`
}
