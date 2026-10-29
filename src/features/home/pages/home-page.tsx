import { UserRound } from 'lucide-react'
import { Link } from 'react-router'
import { PageHeader } from '@/components/layout/page-header'
import { QuickActions } from '@/features/home/components/quick-actions'
import { getGreeting } from '@/features/home/lib/greeting'
import { useNow } from '@/hooks/use-now'
import { formatLongDate, toISODate } from '@/lib/format'

export function HomePage() {
  const now = useNow()

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={getGreeting(now)}
        documentTitle="Início"
        subtitle={<time dateTime={toISODate(now)}>{formatLongDate(now)}</time>}
      >
        {/* Settings and account live behind the avatar, not in a tab. */}
        <Link
          to="/definicoes"
          aria-label="Definições"
          className="flex size-11 shrink-0 touch-manipulation items-center justify-center rounded-full bg-muted text-muted-foreground outline-none select-none transition-transform duration-150 ease-out hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 motion-reduce:active:opacity-70"
        >
          <UserRound aria-hidden className="size-5" />
        </Link>
      </PageHeader>
      <QuickActions />
    </div>
  )
}
