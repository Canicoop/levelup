import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'

type PageHeaderProps = {
  title: string
  // Defaults to the title. Home uses it to keep "Início" in the tab while the
  // heading shows the greeting.
  documentTitle?: string
  subtitle?: ReactNode
  // A back arrow before the title, for screens below a tab (a routine inside
  // Treino). The label names the destination for screen readers.
  back?: { to: string; label: string }
  children?: ReactNode
}

// Page title and document title. React 19 hoists <title> into <head>.
// The title row is at least as tall as the Home avatar (44px), so the title
// sits at the same height on every page. The subtitle goes below that row.
export function PageHeader({ title, documentTitle = title, subtitle, back, children }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-1">
      <title>{`${documentTitle} · LevelUP`}</title>
      <div className="flex min-h-11 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-1">
          {back && (
            // -ml-2.5 lines the arrow up with the content edge.
            <Link
              to={back.to}
              aria-label={back.label}
              className="-ml-2.5 flex size-11 shrink-0 touch-manipulation items-center justify-center rounded-full text-muted-foreground outline-none select-none transition-[opacity,background-color] duration-150 ease-out hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring active:opacity-70 motion-reduce:transition-none"
            >
              <ArrowLeft aria-hidden className="size-6" strokeWidth={1.75} />
            </Link>
          )}
          <h1 className="min-w-0 text-3xl font-semibold tracking-tight text-balance wrap-break-word">{title}</h1>
        </div>
        {children}
      </div>
      {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
    </header>
  )
}
