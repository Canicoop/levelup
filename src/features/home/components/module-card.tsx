import { useId, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

type ModuleCardProps = {
  to: string
  title: string
  children: ReactNode
}

// One card per module on Home. The title links to the module; only the title,
// not the whole card, so the content can hold its own controls later.
// The section stretches in the grid and the card fills it, so cards in a row
// share the same height.
export function ModuleCard({ to, title, children }: ModuleCardProps) {
  const titleId = useId()

  return (
    <section aria-labelledby={titleId}>
      <Card className="h-full">
        <CardHeader>
          <h2 id={titleId}>
            {/* -mx-2 px-2 extends the hover fill without moving the text off
                the card's content edge. */}
            <Link
              to={to}
              className="-mx-2 -mt-2 flex min-h-11 touch-manipulation items-center justify-between gap-2 rounded-lg px-2 text-base font-medium outline-none select-none transition-[opacity,background-color] duration-150 ease-out hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring active:opacity-70 motion-reduce:transition-none"
            >
              {title}
              <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
            </Link>
          </h2>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </section>
  )
}
