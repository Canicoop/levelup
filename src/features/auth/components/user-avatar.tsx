import { useState } from 'react'
import { UserRound } from 'lucide-react'
import { cn } from 'cn'

type UserAvatarProps = {
  avatarUrl: string | null
  initial: string | null
  // Size and font size come from the caller; the text colour is inherited.
  className?: string
}

// A neutral circle with the user's photo, or their initial when there is no
// photo or it fails to load, or a person icon when there is no name either.
// Google photos are requested without a referrer, which they can refuse.
export function UserAvatar({ avatarUrl, initial, className }: UserAvatarProps) {
  // Remembering which URL failed (rather than a flag) retries a new photo.
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const showPhoto = avatarUrl !== null && avatarUrl !== failedUrl

  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted',
        className,
      )}
    >
      {showPhoto ? (
        <img
          src={avatarUrl}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailedUrl(avatarUrl)}
          className="size-full object-cover"
        />
      ) : initial ? (
        <span aria-hidden className="font-medium">
          {initial}
        </span>
      ) : (
        <UserRound aria-hidden className="size-5" />
      )}
    </span>
  )
}
