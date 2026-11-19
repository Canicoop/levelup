import { describe, expect, it } from 'vitest'
import {
  AlreadyInRoutineError,
  DuplicateExerciseError,
  RoutineNotFoundError,
  workoutErrorMessage,
} from '@/features/workout/lib/errors'

describe('workoutErrorMessage', () => {
  it('reports a missing routine', () => {
    expect(workoutErrorMessage(new RoutineNotFoundError())).toBe('Rotina não encontrada.')
  })

  it('reports a duplicate exercise when creating and when renaming', () => {
    expect(workoutErrorMessage(new DuplicateExerciseError('create'))).toBe('Já existe um exercício com esse nome.')
    expect(workoutErrorMessage(new DuplicateExerciseError('rename'))).toBe(
      'Já existe um exercício com esse nome. Se estiver arquivado, reativa-o em Arquivados.',
    )
  })

  it('reports an exercise that is already in the routine', () => {
    expect(workoutErrorMessage(new AlreadyInRoutineError())).toBe('Este exercício já está na rotina.')
  })

  it('falls back to the shared messages, passing on a specific duplicate message', () => {
    expect(workoutErrorMessage(new TypeError('Failed to fetch'))).toBe(
      'Sem ligação. Tenta outra vez quando voltares a estar online.',
    )
    expect(workoutErrorMessage({ code: '23505', message: '' }, { duplicate: 'Este exercício já está na rotina.' })).toBe(
      'Este exercício já está na rotina.',
    )
  })
})
