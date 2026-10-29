import { cn } from "cn"

// Filled with the border colour: the neutral fill (bg-muted) is barely visible
// on the dark-theme surface. The pulse stops when reduced motion is on.
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-border motion-reduce:animate-none", className)}
      {...props}
    />
  )
}

export { Skeleton }
