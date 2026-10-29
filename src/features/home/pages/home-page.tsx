import { UserRound } from 'lucide-react'
import { Link } from 'react-router'
import { PageHeader } from '@/components/layout/page-header'

export function HomePage() {
  return (
    <PageHeader title="Início">
      {/* Settings and account live behind the avatar, not in a tab. */}
      <Link
        to="/definicoes"
        aria-label="Definições"
        className="flex size-11 shrink-0 touch-manipulation items-center justify-center rounded-full bg-muted text-muted-foreground outline-none select-none transition-transform duration-150 ease-out hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 motion-reduce:active:opacity-70"
      >
        <UserRound aria-hidden className="size-5" />
      </Link>
    </PageHeader>
  )
}
