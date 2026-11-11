import { useId, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { Card } from '@/components/ui/card'

type ModuleCardProps = {
  to: string
  // The small label at the top ("Peso", "Novembro").
  title: string
  // The link's name for screen readers, when the label alone does not say
  // which module it opens ("Finanças de novembro").
  label?: string
  children: ReactNode
}

// A half-width card on Home (Weight, Finance), as in the "Graphite" mockup: a
// small label, then the content. The label links to the module; only the label,
// not the whole card, so the content can hold its own controls later. It looks
// small, with a small arrow so it reads as a link on a phone, but its touch area
// is 44px tall. The section stretches in the grid and the card fills it, so the
// two cards share the same height.
export function ModuleCard({ to, title, label, children }: ModuleCardProps) {
  const titleId = useId()

  return (
    <section aria-labelledby={titleId}>
      <Card size="sm" className="h-full gap-1">
        <h2 id={titleId} className="px-3">
          {/* -mx-2 px-2 and -my-2 extend the touch area and the hover fill
              without moving the label off the card's content edge. */}
          <Link
            to={to}
            aria-label={label}
            className="-mx-2 -my-2 flex min-h-11 w-fit touch-manipulation items-center gap-0.5 rounded-lg px-2 text-sm text-muted-foreground outline-none select-none transition-[opacity,background-color,color] duration-150 ease-out hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring active:opacity-70 motion-reduce:transition-none"
          >
            {title}
            <ChevronRight aria-hidden className="size-3.5 shrink-0" strokeWidth={2} />
          </Link>
        </h2>
        <div className="px-3">{children}</div>
      </Card>
    </section>
  )
}
