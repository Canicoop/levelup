import { useLayoutEffect, useRef } from 'react'

// `top` is null for an exercise that is not on screen yet (swapped in or added):
// there is nothing to keep in place, only somewhere to slide to.
type Anchor = { exerciseId: string; top: number | null; slide: boolean }

// Keeps an exercise where it is on screen when the open exercise changes: the
// one closing can sit above it, and the list gets shorter at once. The position
// is read before the change and corrected after it, before the browser paints,
// so nothing jumps. With `slide` (an exercise opening by itself) it then slides
// to the top of the screen; with reduced motion it jumps there.
export function useExerciseAnchor(openExerciseId: string | null) {
  const rows = useRef(new Map<string, HTMLElement>())
  const anchor = useRef<Anchor | null>(null)

  useLayoutEffect(() => {
    const current = anchor.current
    anchor.current = null
    const row = current && rows.current.get(current.exerciseId)
    if (!current || !row) return

    if (current.top !== null) window.scrollBy(0, row.getBoundingClientRect().top - current.top)
    if (current.slide) {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      row.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
    }
  }, [openExerciseId])

  return {
    setRow(exerciseId: string, row: HTMLElement | null) {
      if (row) rows.current.set(exerciseId, row)
      else rows.current.delete(exerciseId)
    },
    // Called just before the open exercise changes.
    hold(exerciseId: string, { slide }: { slide: boolean }) {
      const row = rows.current.get(exerciseId)
      anchor.current = { exerciseId, top: row ? row.getBoundingClientRect().top : null, slide }
    },
  }
}
