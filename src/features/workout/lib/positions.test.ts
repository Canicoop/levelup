import { describe, expect, it } from 'vitest'
import { moveItem, nextPosition } from '@/features/workout/lib/positions'

const list = [
  { id: 'a', position: 0 },
  { id: 'b', position: 1 },
  { id: 'c', position: 2 },
]

describe('moveItem', () => {
  it('moves an item up and sends only the two rows that changed', () => {
    expect(moveItem(list, 'c', 'up')).toEqual([
      { id: 'c', position: 1 },
      { id: 'b', position: 2 },
    ])
  })

  it('moves an item down', () => {
    expect(moveItem(list, 'a', 'down')).toEqual([
      { id: 'b', position: 0 },
      { id: 'a', position: 1 },
    ])
  })

  it('does nothing at either end', () => {
    expect(moveItem(list, 'a', 'up')).toEqual([])
    expect(moveItem(list, 'c', 'down')).toEqual([])
  })

  it('does nothing for an unknown id or a single item', () => {
    expect(moveItem(list, 'x', 'up')).toEqual([])
    expect(moveItem([{ id: 'a', position: 0 }], 'a', 'down')).toEqual([])
  })

  it('separates rows that share a position', () => {
    const tied = [
      { id: 'a', position: 0 },
      { id: 'b', position: 0 },
      { id: 'c', position: 0 },
    ]
    // Shown order a, b, c; moving c up gives a, c, b, numbered 0, 1, 2.
    expect(moveItem(tied, 'c', 'up')).toEqual([
      { id: 'c', position: 1 },
      { id: 'b', position: 2 },
    ])
  })

  it('also renumbers gaps in the rest of the list', () => {
    const gaps = [
      { id: 'a', position: 0 },
      { id: 'b', position: 5 },
      { id: 'c', position: 9 },
    ]
    expect(moveItem(gaps, 'a', 'down')).toEqual([
      { id: 'b', position: 0 },
      { id: 'a', position: 1 },
      { id: 'c', position: 2 },
    ])
  })
})

describe('nextPosition', () => {
  it('is 0 for an empty list', () => {
    expect(nextPosition([])).toBe(0)
  })

  it('is one after the highest position, whatever the order', () => {
    expect(nextPosition([{ position: 3 }, { position: 7 }, { position: 1 }])).toBe(8)
  })
})
