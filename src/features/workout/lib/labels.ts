// "Sem exercícios", "1 exercício", "6 exercícios".
export function formatExerciseCount(count: number) {
  if (count === 0) return 'Sem exercícios'
  return count === 1 ? '1 exercício' : `${count} exercícios`
}
