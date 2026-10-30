import iconUrl from '../../assets/icons/icon.svg'

// Shown while the first route loaders run, which read the session. That is
// usually instant, so only the background shows at first; the icon appears
// after 400ms, when loading takes longer (a token refresh on a slow network).
// With reduced motion it appears at the same moment, without the fade.
export function AppLoading() {
  return (
    <div aria-busy="true" className="flex min-h-dvh items-center justify-center">
      <span className="sr-only">A carregar…</span>
      <img
        src={iconUrl}
        alt=""
        width={56}
        height={56}
        className="size-14 animate-app-loading-in motion-reduce:[animation-duration:0s]"
      />
    </div>
  )
}
