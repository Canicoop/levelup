// Shown instead of a skeleton when a read has no data and is paused without
// network (see isWaitingForNetwork). It has no retry button: the read resumes by
// itself when the network is back.
export function OfflineState() {
  return (
    <p role="status" className="text-sm text-pretty text-muted-foreground">
      Sem ligação. Os dados aparecem quando voltares a estar online.
    </p>
  )
}
