import { Typography } from "@/components/ui/typography"
import { cn } from "@/lib/utils"

// The divider that opens a band of insight widgets: a short gradient tick, an
// uppercase micro-label, then a hairline fading across the remaining width.
//
// Reads as a SEPARATOR between bands rather than another card title competing
// with the tiles below it — small (11px) and uppercase, but DARK and heavy:
// it is still a heading, and a muted 10px label read as faded on the board.
// The `eyebrow` variant renders the `<h2>` itself.
//
// Extracted from `DashboardSectionView`, which owned this markup privately,
// once the account 360° tab needed the same rule above its widget grid. A
// second hand-rolled copy would have drifted on the first styling change —
// the tick gradient is not a value anyone would reproduce by eye.
export function InsightBandHeading({
  label,
  className,
}: {
  label: string
  /** Extra spacing for a caller that owns its own vertical rhythm. */
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-2.5 pt-2 pb-0.5", className)}>
      <span className="h-3.5 w-1 shrink-0 rounded-full bg-gradient-to-b from-primary to-primary/30" />
      <Typography variant="eyebrow">{label}</Typography>
      <div className="h-px flex-1 bg-gradient-to-r from-border/80 to-transparent" />
    </div>
  )
}
