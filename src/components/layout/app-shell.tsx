import { Outlet } from 'react-router'

// Content is padded away from the notch and, in landscape, the rounded corners.
export function AppShell() {
  return (
    <div className="min-h-dvh">
      <main className="mx-auto w-full max-w-2xl pt-[calc(1.5rem+env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-6 pl-[max(1rem,env(safe-area-inset-left))]">
        <Outlet />
      </main>
    </div>
  )
}
