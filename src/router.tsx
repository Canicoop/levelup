import { createBrowserRouter } from 'react-router'
import { RouteError } from '@/components/errors/route-error'
import { NotFoundPage } from '@/components/errors/not-found-page'
import { AppShell } from '@/components/layout/app-shell'
import { SignInPage } from '@/features/auth/pages/sign-in-page'
import { FinancePage } from '@/features/finance/pages/finance-page'
import { HomePage } from '@/features/home/pages/home-page'
import { SettingsPage } from '@/features/settings/pages/settings-page'
import { WeightPage } from '@/features/weight/pages/weight-page'
import { WorkoutPage } from '@/features/workout/pages/workout-page'

// Pages are imported eagerly for now. Each one moves to `lazy` once its
// module has real code.
export const router = createBrowserRouter([
  {
    ErrorBoundary: RouteError,
    children: [
      // Full screen, without navigation.
      { path: 'entrar', Component: SignInPage },
      {
        // Screens with navigation. Full-screen screens (the active workout,
        // Phase 4) are siblings of this route, so they render without it.
        Component: AppShell,
        children: [
          { index: true, Component: HomePage },
          { path: 'treino', Component: WorkoutPage },
          { path: 'peso', Component: WeightPage },
          { path: 'financas', Component: FinancePage },
          { path: 'definicoes', Component: SettingsPage },
          // Development-only preview of shared states. The branch is removed
          // from production builds, so the page and its chunk are never emitted.
          ...(import.meta.env.DEV
            ? [
                {
                  path: 'dev/componentes',
                  lazy: () =>
                    import('@/features/dev/pages/components-page').then(
                      ({ ComponentsPage }) => ({ Component: ComponentsPage }),
                    ),
                },
              ]
            : []),
          { path: '*', Component: NotFoundPage },
        ],
      },
    ],
  },
])
