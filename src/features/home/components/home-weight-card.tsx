import { Link } from 'react-router'
import { buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ModuleCard } from '@/features/home/components/module-card'
import { useWeightEntries } from '@/features/weight/hooks/use-weight-entries'
import { homeWeightSummary } from '@/features/weight/lib/labels'
import { REGISTER_INTENT } from '@/features/weight/lib/register-intent'
import { useNow } from '@/hooks/use-now'
import { lisbonToday } from '@/lib/lisbon-day'
import { isWaitingForNetwork } from '@/lib/query-state'

// Home's Weight card: the latest weight, its day and its difference from the
// entry before it. Without an entry today, "Registar peso" opens the Weight
// page with its sheet open. It imports the Weight data layer and labels, never
// the chart, so Recharts stays in the Weight chunk.
export function HomeWeightCard() {
  const now = useNow()
  const today = lisbonToday(now)
  const query = useWeightEntries()
  const entries = query.data

  let content
  if (entries === undefined) {
    content = isWaitingForNetwork(query) ? (
      <Unavailable reason="Sem ligação." />
    ) : query.isError ? (
      <Unavailable reason="Não foi possível carregar." />
    ) : (
      <div aria-busy="true" className="flex flex-col gap-2 pt-1">
        <span className="sr-only">A carregar…</span>
        <Skeleton aria-hidden className="h-7 w-24" />
        <Skeleton aria-hidden className="h-4 w-16" />
      </div>
    )
  } else {
    const summary = homeWeightSummary(entries, today)
    content = summary ? (
      <div className="flex flex-col">
        <p className="text-2xl font-semibold tracking-tight tabular-nums">{summary.weight}</p>
        <p className="text-sm text-muted-foreground">{summary.day}</p>
        {summary.difference && <p className="text-sm text-muted-foreground tabular-nums">{summary.difference}</p>}
        {!summary.loggedToday && <RegisterLink />}
      </div>
    ) : (
      <div className="flex flex-col gap-1">
        {/* text-base on a phone, so it fits half of 320px on one line. */}
        <p className="text-base font-semibold tracking-tight sm:text-lg">Sem registos</p>
        <p className="text-sm text-pretty text-muted-foreground">O teu peso aparece aqui.</p>
        <RegisterLink />
      </div>
    )
  }

  return (
    <ModuleCard to="/peso" title="Peso">
      {content}
    </ModuleCard>
  )
}

// A secondary button, so it never competes with the week card's "Iniciar
// treino". A link, since it navigates.
function RegisterLink() {
  return (
    <Link
      to="/peso"
      state={REGISTER_INTENT}
      className={buttonVariants({ variant: 'outline', size: 'lg', className: 'mt-3 w-full' })}
    >
      Registar peso
    </Link>
  )
}

// No data to show: a still dash, not a skeleton that would pulse for good,
// and why. No retry button: Home reads again when the app comes back to the
// foreground or the network returns.
function Unavailable({ reason }: { reason: string }) {
  return (
    <div className="flex flex-col">
      <p aria-hidden className="text-2xl font-semibold tracking-tight text-muted-foreground">
        —
      </p>
      <p className="text-sm text-pretty text-muted-foreground">{reason}</p>
    </div>
  )
}
