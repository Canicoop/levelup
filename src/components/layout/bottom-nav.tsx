import { NavLink } from 'react-router'
import { cn } from 'cn'
import { navItems } from '@/components/layout/nav-items'

// Mobile tab bar, hidden from 1024px. The bottom padding clears the home indicator.
export function BottomNav() {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] lg:hidden"
    >
      <ul className="grid grid-cols-4">
        {navItems.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex h-14 flex-col items-center justify-center gap-1 rounded-lg text-xs font-medium outline-none transition-transform duration-150 ease-out focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 motion-reduce:active:opacity-70',
                  isActive
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {/* A heavier stroke marks the active tab without relying on colour alone. */}
                  <Icon aria-hidden className="size-6" strokeWidth={isActive ? 2.25 : 1.75} />
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
