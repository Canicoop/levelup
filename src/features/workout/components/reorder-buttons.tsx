import { ArrowDown, ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ReorderButtonsProps = {
  // Read by screen readers: "Mover para cima: Push".
  name: string
  isFirst: boolean
  isLast: boolean
  // True while a move saves: every arrow waits, so two moves never compute
  // their positions from the same stale list.
  disabled: boolean
  onMove: (direction: 'up' | 'down') => void
}

// The ▲▼ pair shown on each row in "Ordenar" mode. The arrows at the ends are disabled.
export function ReorderButtons({ name, isFirst, isLast, disabled, onMove }: ReorderButtonsProps) {
  return (
    <>
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label={`Mover para cima: ${name}`}
        disabled={isFirst || disabled}
        onClick={() => onMove('up')}
      >
        <ArrowUp aria-hidden className="size-5" strokeWidth={1.75} />
      </Button>
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label={`Mover para baixo: ${name}`}
        disabled={isLast || disabled}
        onClick={() => onMove('down')}
      >
        <ArrowDown aria-hidden className="size-5" strokeWidth={1.75} />
      </Button>
    </>
  )
}
