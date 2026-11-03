import { describe, expect, it } from 'vitest'
import {
  canCreateExercise,
  filterExercises,
  findExerciseByName,
  isExerciseNameTaken,
  resolveNewExercise,
  searchKey,
} from '@/features/workout/lib/exercise-search'
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

  it.each(['Supinó', 'SÚPINO'])('finds %j ignoring accents', (name) => {
    expect(findExerciseByName(exercises, name)).toBe(bench)
  })

  it('returns undefined for a new name', () => {
    expect(findExerciseByName(exercises, 'Agachamento')).toBeUndefined()
  })
})

describe('isExerciseNameTaken', () => {
  it('refuses a name another exercise has, even if only the accents differ', () => {
    expect(isExerciseNameTaken(exercises, 'Supinó', row.id)).toBe(true)
    expect(isExerciseNameTaken(exercises, 'Rémada curvada', bench.id)).toBe(true)
  })

  it('lets an exercise keep its name or change only its accents or case', () => {
    expect(isExerciseNameTaken(exercises, 'Supino', bench.id)).toBe(false)
    expect(isExerciseNameTaken(exercises, 'SUPINÓ', bench.id)).toBe(false)
  })

  it('accepts a new name', () => {
    expect(isExerciseNameTaken(exercises, 'Agachamento', bench.id)).toBe(false)
  })
})

describe('resolveNewExercise', () => {
  it('creates a new name', () => {
    expect(resolveNewExercise(exercises, 'Agachamento')).toEqual({ action: 'create' })
  })

  it('reactivates an archived exercise with the same name, accents ignored', () => {
    expect(resolveNewExercise(exercises, 'remada curvada')).toEqual({ action: 'reactivate', exercise: row })
    expect(resolveNewExercise(exercises, 'Rémada curvada')).toEqual({ action: 'reactivate', exercise: row })
  })

  it('refuses the name of an active exercise, accents ignored', () => {
    expect(resolveNewExercise(exercises, 'SUPINO')).toEqual({ action: 'duplicate' })
    expect(resolveNewExercise(exercises, 'Supinó')).toEqual({ action: 'duplicate' })
  })
})

describe('searchKey', () => {
  it.each([
    ['Elevação lateral', 'elevacao lateral'],
    ['  PRÉ-exaustão ', 'pre-exaustao'],
    ['Peck   deck', 'peck deck'],
  ])('turns %j into %j', (text, expected) => {
    expect(searchKey(text)).toBe(expected)
  })
})

describe('filterExercises', () => {
  const lateral: Exercise = { id: '3', name: 'Elevação lateral', archived_at: null }
  const list = [bench, row, lateral]

  it('ignores case and accents', () => {
    expect(filterExercises(list, 'elevacao')).toEqual([lateral])
    expect(filterExercises(list, 'ELEVAÇÃO')).toEqual([lateral])
  })

  it('finds the text anywhere in the name', () => {
    expect(filterExercises(list, 'curv')).toEqual([row])
    expect(filterExercises(list, 'a')).toEqual([row, lateral])
  })

  it('keeps every exercise, in order, for an empty or blank query', () => {
    expect(filterExercises(list, '')).toEqual(list)
    expect(filterExercises(list, '   ')).toEqual(list)
  })

  it('returns nothing when no name matches', () => {
    expect(filterExercises(list, 'agachamento')).toEqual([])
  })
})

describe('canCreateExercise', () => {
  it('offers a new valid name', () => {
    expect(canCreateExercise(exercises, 'Agachamento')).toBe(true)
  })

  it('does not offer the name of an active or archived exercise, ignoring case and spaces', () => {
    expect(canCreateExercise(exercises, ' supino ')).toBe(false)
    expect(canCreateExercise(exercises, 'REMADA  curvada')).toBe(false)
  })

  it('ignores accents, stricter than the database', () => {
    // lower(name) would accept "Supinó" next to "Supino"; the app does not.
    expect(canCreateExercise(exercises, 'Supinó')).toBe(false)
  })

  it('does not offer "elevacao" when an exercise is named "Elevação"', () => {
    const lateral: Exercise = { id: '3', name: 'Elevação', archived_at: null }
    expect(canCreateExercise([lateral], 'elevacao')).toBe(false)
  })

  it('does not offer an empty name or one over 80 characters', () => {
    expect(canCreateExercise(exercises, '   ')).toBe(false)
    expect(canCreateExercise(exercises, 'x'.repeat(81))).toBe(false)
  })
})
