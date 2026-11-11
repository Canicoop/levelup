import { Link } from 'react-router'
import { PageHeader } from '@/components/layout/page-header'
import { UpdateBanner } from '@/components/update-banner'
import { UserAvatar } from '@/features/auth/components/user-avatar'
import { useCurrentUser } from '@/features/auth/hooks/use-current-user'
import { ModuleCard } from '@/features/home/components/module-card'
import { getGreeting } from '@/features/home/lib/greeting'
import { HomeWeekCard } from '@/features/workout/components/home-week-card'
import { LastWorkoutRow } from '@/features/workout/components/last-workout-row'
import { PendingWorkoutsLine } from '@/features/workout/components/pending-workouts-line'
import { useNow } from '@/hooks/use-now'
import { formatLongDate, formatMonth, toISODate } from '@/lib/format'

// Home, as in the "Graphite" mockup: the week and the way into a workout first,
// then Weight and Finance side by side, then the last workout.
export function HomePage() {
  const now = useNow()
  const user = useCurrentUser()
  const greeting = getGreeting(now)
  const month = formatMonth(now)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        // Without a name (session loading or unavailable offline) the greeting
        // stands on its own.
        title={user.firstName ? `${greeting}, ${user.firstName}` : greeting}
        documentTitle="Início"
        subtitle={<time dateTime={toISODate(now)}>{formatLongDate(now)}</time>}
      >
        {/* Settings and account live behind the avatar, not in a tab. */}
        <Link
          to="/definicoes"
          aria-label="Definições"
          className="flex size-11 shrink-0 touch-manipulation items-center justify-center rounded-full bg-muted text-muted-foreground outline-none select-none transition-transform duration-150 ease-out hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 motion-reduce:active:opacity-70"
        >
          <UserAvatar avatarUrl={user.avatarUrl} initial={user.initial} className="size-full text-base" />
        </Link>
      </PageHeader>

      <div className="flex flex-col gap-3">
        <UpdateBanner />
        <PendingWorkoutsLine />
        <HomeWeekCard />
        {/* Two columns on every width, as in the mockup. Until Phases 6 and 7
            they hold a short empty state that fits half of 320px. */}
        <div className="grid grid-cols-2 gap-3">
          <ModuleCard to="/peso" title="Peso">
            <EmptyModule title="Sem registos" description="O teu peso aparece aqui." />
          </ModuleCard>
          <ModuleCard to="/financas" title={capitalize(month)} label={`Finanças de ${month}`}>
            <EmptyModule title="Sem despesas" description="Os gastos do mês aparecem aqui." />
          </ModuleCard>
        </div>
        <LastWorkoutRow />
      </div>
    </div>
  )
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// Where the number goes once the module has data ("78,4 kg", "412 € de 600 €").
function EmptyModule({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-1">
      {/* text-base on a phone, so "Sem despesas" fits half of 320px on one line. */}
      <p className="text-base font-semibold tracking-tight sm:text-lg">{title}</p>
      <p className="text-sm text-pretty text-muted-foreground">{description}</p>
    </div>
  )
}
