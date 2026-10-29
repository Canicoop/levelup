import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

type EmptyStateProps = {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}

// Shown when a list or summary has no data yet. Left-aligned so it sits
// naturally inside cards as well as on full pages.
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-start gap-3">
      {Icon && (
        <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon aria-hidden className="size-5" strokeWidth={1.75} />
        </div>
      )}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-balance">{title}</p>
        {description && (
          <p className="text-sm text-pretty text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}
