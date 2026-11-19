import { type ReactNode } from "react"
import { Calendar } from "lucide-react"

import { Typography } from "@/components/ui/typography"
import { TruncatedText } from "@/components/common/display/TruncatedText"

/** One fact cell in the header panel — a subtle inline icon + label over the
 *  value. Borderless: the cells sit inside a single bordered panel (below),
 *  separated by the grid gap, so the facts read as one strip rather than a row
 *  of repeated boxes. */
export function InfoCard({
  icon: Icon,
  label,
  value,
  secondary,
}: {
  icon: typeof Calendar
  label: string
  value: string
  secondary?: ReactNode
}) {
  return (
    <div className="min-w-0 rounded-lg px-3 py-2.5">
      <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3.5 shrink-0" />
        <Typography variant="caption" tone="muted" truncate>
          {label}
        </Typography>
      </div>
      {/* Truncate the fact and reveal the full value on hover, so a long term /
          name / date can't blow the cell wide (see TruncatedText). */}
      <Typography variant="body-strong" truncate asChild>
        <TruncatedText value={value} className="max-w-full" />
      </Typography>
      {secondary !== undefined && (
        <Typography variant="caption" tone="muted" className="mt-0.5 line-clamp-2 break-words">
          {secondary}
        </Typography>
      )}
    </div>
  )
}
