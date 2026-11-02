import { describe, expect, it } from 'vitest'
import { formatTargets, validateTargets } from '@/features/workout/lib/targets'

describe('validateTargets', () => {
  it('accepts sets from 1 to 20', () => {
    expect(validateTargets({ targetSets: 1, repMin: '', repMax: '' }).ok).toBe(true)
    expect(validateTargets({ targetSets: 20, repMin: '', repMax: '' }).ok).toBe(true)
  })

  it.each([0, 21, 2.5])('refuses %s sets', (targetSets) => {
    expect(validateTargets({ targetSets, repMin: '', repMax: '' })).toEqual({
      ok: false,
      error: 'As séries vão de 1 a 20.',
    })
  })

  it('keeps both reps empty as no rep range', () => {
    expect(validateTargets({ targetSets: 3, repMin: '', repMax: ' ' })).toEqual({
      ok: true,
      value: { target_sets: 3, rep_min: null, rep_max: null },
    })
  })

  it('stores a range as min and max', () => {
    expect(validateTargets({ targetSets: 3, repMin: '8', repMax: '12' })).toEqual({
      ok: true,
      value: { target_sets: 3, rep_min: 8, rep_max: 12 },
    })
  })

  it.each([
    ['only the minimum', '10', ''],
    ['only the maximum', '', '10'],
  ])('treats %s as min = max', (_label, repMin, repMax) => {
    expect(validateTargets({ targetSets: 3, repMin, repMax })).toEqual({
      ok: true,
      value: { target_sets: 3, rep_min: 10, rep_max: 10 },
    })
  })

  it('refuses a minimum above the maximum', () => {
    expect(validateTargets({ targetSets: 3, repMin: '12', repMax: '8' })).toEqual({
      ok: false,
      error: 'O mínimo não pode ser maior do que o máximo.',
    })
  })

  it.each([
    ['0', ''],
    ['', '101'],
    ['-3', '8'],
  ])('refuses reps outside 1 to 100 (%j, %j)', (repMin, repMax) => {
    expect(validateTargets({ targetSets: 3, repMin, repMax })).toEqual({
      ok: false,
      error: 'As repetições vão de 1 a 100.',
    })
  })

  it.each([
    ['8.5', ''],
    ['abc', '10'],
  ])('refuses reps that are not whole numbers (%j, %j)', (repMin, repMax) => {
    expect(validateTargets({ targetSets: 3, repMin, repMax })).toEqual({
      ok: false,
      error: 'Usa números inteiros.',
    })
  })
})

describe('formatTargets', () => {
  it.each([
    [{ target_sets: 3, rep_min: 8, rep_max: 12 }, '3 × 8–12'],
    [{ target_sets: 3, rep_min: 10, rep_max: 10 }, '3 × 10'],
    [{ target_sets: 3, rep_min: null, rep_max: null }, '3 séries'],
    [{ target_sets: 1, rep_min: null, rep_max: null }, '1 série'],
    [{ target_sets: 1, rep_min: 5, rep_max: 5 }, '1 × 5'],
  ])('formats %j as %j', (targets, expected) => {
    expect(formatTargets(targets)).toBe(expected)
  })
})
