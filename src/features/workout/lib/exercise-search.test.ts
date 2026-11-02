import { describe, expect, it } from 'vitest'
import { findExerciseByName, resolveNewExercise } from '@/features/workout/lib/exercise-search'
import type { Exercise } from '@/features/workout/lib/types'

const bench: Exercise = { id: '1', name: 'Supino', archived_at: null }
const row: Exercise = { id: '2', name: 'Remada curvada', archived_at: '2026-11-01T10:00:00Z' }
const exercises = [bench, row]

describe('findExerciseByName', () => {
  it.each(['Supino', 'supino', 'SUPINO', '  Supino '])('finds %j ignoring case and spaces', (name) => {
    expect(findExerciseByName(exercises, name)).toBe(bench)
  })

  it('treats repeated inner spaces as one', () => {
    expect(findExerciseByName(exercises, 'remada   CURVADA')).toBe(row)
  })

  it('returns undefined for a new name', () => {
    expect(findExerciseByName(exercises, 'Agachamento')).toBeUndefined()
  })
})

describe('resolveNewExercise', () => {
  it('creates a new name', () => {
    expect(resolveNewExercise(exercises, 'Agachamento')).toEqual({ action: 'create' })
  })

  it('reactivates an archived exercise with the same name', () => {
    expect(resolveNewExercise(exercises, 'remada curvada')).toEqual({ action: 'reactivate', exercise: row })
  })

  it('refuses the name of an active exercise', () => {
    expect(resolveNewExercise(exercises, 'SUPINO')).toEqual({ action: 'duplicate' })
  })
})
