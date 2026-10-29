import type { ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  children?: ReactNode
}

// Page title and document title. React 19 hoists <title> into <head>.
// The row is at least as tall as the Home avatar (44px), so the title sits
// at the same height on every page.
export function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <header className="flex min-h-11 items-center justify-between gap-4">
      <title>{`${title} · LevelUP`}</title>
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      {children}
    </header>
  )
}
