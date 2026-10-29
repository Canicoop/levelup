import { Dumbbell, Scale, UserRound, Wallet } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/layout/page-header'
import { ModuleCard } from '@/features/home/components/module-card'
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
      {/* gap-3 matches the quick actions, so the columns line up on desktop. */}
      <div className="grid gap-3 lg:grid-cols-3">
        <ModuleCard to="/treino" title="Treino">
          <EmptyState
            icon={Dumbbell}
            title="Ainda não registaste nenhum treino"
            description="Aqui vais ver o teu último treino e os dias em que treinaste."
          />
        </ModuleCard>
        <ModuleCard to="/peso" title="Peso">
          <EmptyState
            icon={Scale}
            title="Ainda não registaste o teu peso"
            description="Aqui vais ver o teu peso mais recente e a evolução."
          />
        </ModuleCard>
        <ModuleCard to="/financas" title="Finanças">
          <EmptyState
            icon={Wallet}
            title="Ainda não adicionaste nenhuma despesa"
            description="Aqui vais ver quanto gastaste este mês e quanto resta do orçamento."
          />
        </ModuleCard>
      </div>
    </div>
  )
}
