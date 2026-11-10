import { describe, expect, it } from 'vitest'
import { lastSetsFromCopy, mergeLastSetsCopy, type LastSetsCopy } from '@/features/workout/lib/last-sets-copy'

const bench = [{ weightKg: 80, reps: 8 }]
const squat = [{ weightKg: 100, reps: 5 }]
// "c" was asked for and has no history.
const copy: LastSetsCopy = { exerciseIds: ['a', 'b', 'c'], lastSets: { a: bench, b: squat } }

describe('lastSetsFromCopy', () => {
  it('gives the sets of exercises the copy covers', () => {
    expect(lastSetsFromCopy(copy, ['a', 'b'])).toEqual({ a: bench, b: squat })
  })

  it('treats a covered exercise with no entry as a first time', () => {
    expect(lastSetsFromCopy(copy, ['a', 'c'])).toEqual({ a: bench })
  })

  it('is null when an exercise was never asked for', () => {
    expect(lastSetsFromCopy(copy, ['a', 'd'])).toBeNull()
  })

  it('is null without a copy', () => {
    expect(lastSetsFromCopy(undefined, ['a'])).toBeNull()
  })

  it('is an empty record for no exercises', () => {
    expect(lastSetsFromCopy(copy, [])).toEqual({})
  })
})

describe('mergeLastSetsCopy', () => {
  it('starts a copy from a first read', () => {
    expect(mergeLastSetsCopy(undefined, ['a', 'c'], { a: bench })).toEqual({
      exerciseIds: ['a', 'c'],
      lastSets: { a: bench },
    })
  })

  it('replaces what it read and keeps the rest', () => {
    const newer = [{ weightKg: 85, reps: 6 }]
    expect(mergeLastSetsCopy(copy, ['a', 'd'], { a: newer, d: squat })).toEqual({
      exerciseIds: ['a', 'b', 'c', 'd'],
      lastSets: { a: newer, b: squat, d: squat },
    })
  })

  it('removes an entry the fresh read no longer has', () => {
    expect(mergeLastSetsCopy(copy, ['b'], {}).lastSets).toEqual({ a: bench })
  })
})
