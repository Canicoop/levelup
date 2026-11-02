import type { PositionChange } from '@/features/workout/lib/types'

type Positioned = { id: string; position: number }

// Moves one item up or down in a list given in the order it is shown, then
// numbers the whole list 0..n-1 and returns only the rows whose position
// changed. Positions are not unique in the database, so rows sharing a
// position still end up apart. At either end, nothing changes.
export function moveItem(items: Positioned[], id: string, direction: 'up' | 'down'): PositionChange[] {
  const from = items.findIndex((item) => item.id === id)
  const to = direction === 'up' ? from - 1 : from + 1
  if (from === -1 || to < 0 || to >= items.length) return []

  const reordered = [...items]
  const [moved] = reordered.splice(from, 1)
  reordered.splice(to, 0, moved)

  return reordered.flatMap((item, index) => (item.position === index ? [] : [{ id: item.id, position: index }]))
}

// The position for a new item at the end of the list.
export function nextPosition(items: { position: number }[]) {
  return items.reduce((next, item) => Math.max(next, item.position + 1), 0)
}
