import { describe, expect, it } from 'vitest'
import { nextRoutine } from '@/features/workout/lib/next-routine'

const active = (id: string) => ({ id, archived_at: null })
const archived = (id: string) => ({ id, archived_at: '2026-11-01T10:00:00Z' })

describe('nextRoutine', () => {
  const routines = [active('a'), active('b'), active('c')]

  it('is the first routine without a last workout', () => {
    expect(nextRoutine(routines, null)?.id).toBe('a')
  })

  it('is the routine after the last one', () => {
    expect(nextRoutine(routines, 'a')?.id).toBe('b')
  })

  it('wraps around to the first', () => {
    expect(nextRoutine(routines, 'c')?.id).toBe('a')
  })

  it('skips archived routines', () => {
    expect(nextRoutine([active('a'), archived('b'), active('c')], 'a')?.id).toBe('c')
  })

  it('skips archived routines when wrapping around', () => {
    expect(nextRoutine([archived('a'), active('b'), active('c')], 'c')?.id).toBe('b')
  })

  it('continues after the last routine when it has been archived', () => {
    expect(nextRoutine([active('a'), archived('b'), active('c')], 'b')?.id).toBe('c')
  })

  it('wraps around when the archived last routine is at the end', () => {
    expect(nextRoutine([active('a'), active('b'), archived('c')], 'c')?.id).toBe('a')
  })

  it('returns the same routine when it is the only active one', () => {
    expect(nextRoutine([active('a'), archived('b')], 'a')?.id).toBe('a')
  })

  it('is the first active routine when the last one is not in the list', () => {
    expect(nextRoutine([archived('a'), active('b')], 'gone')?.id).toBe('b')
  })

  it('is the first active routine when the first is archived and there is no last workout', () => {
    expect(nextRoutine([archived('a'), active('b')], null)?.id).toBe('b')
  })

  it('is null with no active routine', () => {
    expect(nextRoutine([archived('a')], 'a')).toBeNull()
    expect(nextRoutine([archived('a')], null)).toBeNull()
    expect(nextRoutine([], null)).toBeNull()
  })
})
