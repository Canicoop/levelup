import type { ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  // Defaults to the title. Home uses it to keep "Início" in the tab while the
  // heading shows the greeting.
  documentTitle?: string
  subtitle?: ReactNode
  children?: ReactNode
}

// Page title and document title. React 19 hoists <title> into <head>.
// The title row is at least as tall as the Home avatar (44px), so the title
// sits at the same height on every page. The subtitle goes below that row.
export function PageHeader({ title, documentTitle = title, subtitle, children }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-1">
      <title>{`${documentTitle} · LevelUP`}</title>
      <div className="flex min-h-11 items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {children}
      </div>
      {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
    </header>
  )
}
