import { NavLink } from 'react-router'
import { cn } from 'cn'
import { navItems } from '@/components/layout/nav-items'

// Desktop navigation, shown from 1024px in place of the bottom tab bar.
export function SidebarNav() {
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col gap-8 border-r border-sidebar-border bg-sidebar px-3 py-6 text-sidebar-foreground lg:flex">
      <p className="px-3 text-lg font-semibold tracking-tight">LevelUP</p>
      <nav aria-label="Navegação principal">
        <ul className="flex flex-col gap-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium outline-none transition-transform duration-150 ease-out focus-visible:ring-3 focus-visible:ring-ring pointer-coarse:h-11 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 motion-reduce:active:opacity-70',
                    isActive
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon aria-hidden className="size-5" strokeWidth={isActive ? 2.25 : 1.75} />
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
