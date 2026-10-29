import { useId } from 'react'
import { Dumbbell, Scale, Wallet } from 'lucide-react'
import { Link } from 'react-router'
import type { NavItem } from '@/components/layout/nav-items'

// Same icons as the navigation, so each action is recognisable at a glance.
// For now they open the module; they will open the action itself once the
// modules have forms.
const quickActions: NavItem[] = [
  { to: '/treino', label: 'Iniciar treino', icon: Dumbbell },
  { to: '/peso', label: 'Registar peso', icon: Scale },
  { to: '/financas', label: 'Adicionar despesa', icon: Wallet },
]

// Three equal tiles: icon above the label on phones, beside it from 640px.
// Neutral surface only; the accent colour is reserved for data.
export function QuickActions() {
  const titleId = useId()

  return (
    <section aria-labelledby={titleId}>
      <h2 id={titleId} className="sr-only">
        Atalhos
      </h2>
      <ul className="grid grid-cols-3 gap-3">
        {quickActions.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex">
            <Link
              to={to}
              className="flex min-h-22 w-full touch-manipulation flex-col items-center justify-center gap-2 rounded-xl bg-card px-2 py-3 text-center text-sm font-medium ring-1 ring-border outline-none select-none transition-[transform,background-color] duration-150 ease-out hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 motion-reduce:active:opacity-70 sm:min-h-14 sm:flex-row sm:justify-start sm:gap-3 sm:px-4 sm:text-left"
            >
              <Icon aria-hidden className="size-6 shrink-0 text-muted-foreground" strokeWidth={1.75} />
              <span className="text-balance">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
