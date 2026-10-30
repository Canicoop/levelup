import { useId, useState } from 'react'
import { CircleAlert, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { signOut } from '@/features/auth/api/sign-out'
import { UserAvatar } from '@/features/auth/components/user-avatar'
import { useCurrentUser } from '@/features/auth/hooks/use-current-user'

// The signed-in account and the sign-out button. Inside the app the session can
// still be loading, or unavailable offline with an expired token; both show a
// neutral state, and signing out stays available.
export function AccountSection() {
  const user = useCurrentUser()
  const navigate = useNavigate()
  const titleId = useId()
  const [pending, setPending] = useState(false)
  const [offline, setOffline] = useState(false)

  async function handleSignOut() {
    setPending(true)
    setOffline(false)
    const { signedOut, error } = await signOut()
    if (error) console.error('Sign-out did not complete on the server:', error.message)
    if (signedOut) {
      // The SIGNED_OUT handler (main.tsx) also clears the cache and revalidates.
      navigate('/entrar', { replace: true })
      return
    }
    // The session is still stored: offline with an expired token.
    setPending(false)
    setOffline(true)
  }

  return (
    <section aria-labelledby={titleId} className="flex max-w-xl flex-col gap-3">
      <h2 id={titleId} className="text-sm font-medium text-muted-foreground">
        Conta
      </h2>
      <Card className="gap-0 py-0">
        <div className="flex min-h-20 items-center gap-4 p-4">
          {user.status === 'loading' ? (
            <div aria-busy="true" className="flex items-center gap-4">
              <span className="sr-only">A carregar…</span>
              <Skeleton aria-hidden className="size-12 rounded-full" />
              <div aria-hidden className="flex flex-col gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          ) : (
            <>
              <UserAvatar
                avatarUrl={user.avatarUrl}
                initial={user.initial}
                className="size-12 text-lg text-muted-foreground"
              />
              {user.status === 'signed-in' ? (
                <div className="flex min-w-0 flex-col">
                  <p className="truncate font-medium">{user.name ?? user.email}</p>
                  {user.name && user.email && (
                    <p title={user.email} className="truncate text-sm text-muted-foreground">
                      {user.email}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex min-w-0 flex-col">
                  <p className="font-medium">Conta indisponível</p>
                  <p className="text-sm text-pretty text-muted-foreground">
                    Os dados da conta aparecem quando voltares a estar online.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="border-t border-border">
          {offline && (
            <p role="alert" className="flex items-start gap-2 px-4 pt-3 text-sm">
              <CircleAlert aria-hidden className="size-5 shrink-0 text-destructive" strokeWidth={1.75} />
              Sem ligação. Tenta terminar a sessão quando voltares a estar online.
            </p>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            disabled={pending}
            aria-busy={pending}
            className="flex min-h-12 w-full touch-manipulation items-center gap-3 rounded-b-xl px-4 text-left font-medium outline-none select-none transition-[background-color,opacity] duration-150 ease-out hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset active:opacity-70 disabled:pointer-events-none disabled:opacity-60 motion-reduce:transition-none"
          >
            <LogOut aria-hidden className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
            {pending ? 'A terminar sessão…' : 'Terminar sessão'}
          </button>
        </div>
      </Card>
    </section>
  )
}
