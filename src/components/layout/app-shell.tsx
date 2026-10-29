import { Outlet, ScrollRestoration } from 'react-router'
import { BottomNav } from '@/components/layout/bottom-nav'
import { SidebarNav } from '@/components/layout/sidebar-nav'

// Content is padded away from the notch and, in landscape, the rounded corners.
// On mobile the bottom padding also clears the fixed tab bar (3.5rem) and the
// home indicator.
export function AppShell() {
  return (
    <div className="min-h-dvh lg:pl-60">
      <SidebarNav />
      <main className="mx-auto w-full max-w-2xl pt-[calc(1.5rem+env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-[calc(3.5rem+1.5rem+env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] lg:pb-6">
        <Outlet />
      </main>
      <BottomNav />
      {/* New pages open at the top; back and forward restore the position. */}
      <ScrollRestoration />
    </div>
  )
}
