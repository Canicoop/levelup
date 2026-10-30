import { createBrowserRouter } from 'react-router'
import { AppLoading } from '@/components/app-loading'
import { RouteError } from '@/components/errors/route-error'
import { NotFoundPage } from '@/components/errors/not-found-page'
import { AppShell } from '@/components/layout/app-shell'
import { redirectIfSignedIn, requireSession } from '@/features/auth/loaders'
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
    // Shown on the first load while the loaders read the session, so /entrar
    // never flashes for someone who is already signed in.
    HydrateFallback: AppLoading,
    children: [
      // Full screen, without navigation. With a session it goes into the app.
      { path: 'entrar', loader: redirectIfSignedIn, Component: SignInPage },
      {
        // Screens with navigation, all behind a session. Full-screen screens
        // (the active workout, Phase 4) are siblings of this route, so they
        // render without it.
        loader: requireSession,
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
