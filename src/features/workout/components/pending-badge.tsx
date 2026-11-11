// "Por enviar": a finished workout still waiting on the device (rule AY). Quiet,
// like the queue line: it is sent by itself.
export function PendingBadge() {
  return (
    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      Por enviar
    </span>
  )
}
