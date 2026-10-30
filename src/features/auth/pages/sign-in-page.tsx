import { useEffect, useState } from 'react'
import { CircleAlert } from 'lucide-react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import iconUrl from '../../../../assets/icons/icon.svg'
import { signInWithGoogle } from '@/features/auth/api/sign-in-with-google'
import { GoogleIcon } from '@/features/auth/components/google-icon'
import { useSession } from '@/features/auth/hooks/use-session'
import { readRedirectResult } from '@/features/auth/lib/sign-in-error'

// Full-screen sign-in, outside the app shell. Google returns here: with a code
// the client creates the session, with an error the page explains it.
export function SignInPage() {
  const auth = useSession()
  const location = useLocation()
  const navigate = useNavigate()
  // Read once on arrival: the URL is cleaned right after, so a reload does not
  // show the message again.
  const [redirect] = useState(() => readRedirectResult(location.search, location.hash))
  const [pending, setPending] = useState(false)
  const [startFailed, setStartFailed] = useState(false)

  const exchangeFailed = redirect.hasCode && auth.status === 'signed-out'
  const error = startFailed || exchangeFailed ? 'failed' : redirect.error
  const creatingSession = redirect.hasCode && auth.status === 'loading'

  // Once the outcome is known, drop ?code / ?error from the address.
  useEffect(() => {
    const hasParams = location.search !== '' || location.hash !== ''
    if (!hasParams || auth.status !== 'signed-out') return
    // Cancelling is not an error; only failures are logged.
    if (redirect.error === 'failed' || redirect.hasCode) {
      console.error('Google sign-in did not complete:', redirect.description ?? 'code exchange failed')
    }
    navigate('/entrar', { replace: true })
  }, [auth.status, location.hash, location.search, navigate, redirect])

  // Going back from Google can restore this page from the back/forward cache
  // with the button still pending.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setPending(false)
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  async function handleSignIn() {
    setPending(true)
    setStartFailed(false)
    const { error: startError } = await signInWithGoogle()
    if (startError) {
      console.error('Google sign-in could not start:', startError.message)
      setPending(false)
      setStartFailed(true)
    }
  }

  // Step 3.4.3 moves this into the route loader, with the return path.
  if (auth.status === 'signed-in') return <Navigate to="/" replace />

  return (
    // The extra bottom padding lifts the block slightly above the centre,
    // which reads as centred.
    <main className="flex min-h-dvh flex-col items-center justify-center pt-[env(safe-area-inset-top)] pr-[max(1rem,env(safe-area-inset-right))] pb-[calc(4rem+env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))]">
      <title>Iniciar sessão · LevelUP</title>
      <div className="flex w-full max-w-sm flex-col items-center gap-10 text-center">
        <div className="flex flex-col items-center gap-5">
          <img src={iconUrl} alt="" width={72} height={72} className="size-18" />
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">LevelUP</h1>
            <p className="text-pretty text-muted-foreground">
              O teu painel pessoal de treino, peso e finanças.
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-4">
          {error === 'cancelled' && (
            <p role="status" className="text-sm text-muted-foreground">
              O início de sessão foi cancelado.
            </p>
          )}
          {error === 'failed' && (
            <p role="alert" className="flex items-center justify-center gap-2 text-sm">
              <CircleAlert aria-hidden className="size-5 shrink-0 text-destructive" strokeWidth={1.75} />
              Não foi possível iniciar sessão. Tenta outra vez.
            </p>
          )}

          {creatingSession ? (
            <p role="status" className="flex h-12 items-center justify-center text-muted-foreground">
              A iniciar sessão…
            </p>
          ) : (
            <button
              type="button"
              onClick={handleSignIn}
              disabled={pending}
              aria-busy={pending}
              className="flex h-12 w-full touch-manipulation items-center justify-center gap-3 rounded-lg border border-border bg-card px-4 font-medium outline-none select-none transition-[transform,background-color] duration-150 ease-out hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60 motion-reduce:transition-none motion-reduce:active:scale-100 motion-reduce:active:opacity-70"
            >
              <GoogleIcon className="size-5 shrink-0" />
              {pending ? 'A abrir o Google…' : 'Iniciar sessão com o Google'}
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
