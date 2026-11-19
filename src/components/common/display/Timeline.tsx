import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
import { TruncatedText } from "@/components/common/display/TruncatedText"

type TimelineVariant = "default" | "success" | "error" | "warning"

const DEFAULT_VARIANT: TimelineVariant = "default"

interface TimelineEntry {
  id: string
  icon?: LucideIcon
  title: string
  /** Detail line under the title. A node (not just a string) so identifiers can
   *  render inline as clickable <EntityRef> chips. */
  description?: ReactNode
  /** A secondary detail line shown under the description, truncated to one line
   *  with the full text revealed on hover (for long free text like a reason). */
  note?: string
  user?: string
  timestamp: string
  variant?: TimelineVariant
  /** Optional inline action (e.g. "View checklist") rendered under the entry. */
  action?: { label: string; onClick: () => void }
  /** A fully-rendered inline action node (e.g. an <EntityRef> identifier chip),
   *  shown in the same slot as `action`. Takes precedence when both are set. */
  actionNode?: ReactNode
}

interface TimelineProps {
  entries: TimelineEntry[]
  className?: string
}

const variantCircleStyles: Record<TimelineVariant, string> = {
  default: "bg-muted-foreground/80",
  success: "bg-status-success-text",
  error: "bg-status-error-text",
  warning: "bg-status-warning-text",
}

function Timeline({ entries, className }: TimelineProps) {
  return (
    <div className={cn("relative space-y-4 pl-7", className)}>
      {/* Vertical rail — inset so it starts/ends under the first/last dot. */}
      <div className="absolute top-1.5 bottom-1.5 left-[8px] w-px bg-border" />

      {entries.map((entry) => {
        const variant = entry.variant ?? DEFAULT_VARIANT
        const Icon = entry.icon

        return (
          <div key={entry.id} className="relative flex gap-3">
            {/* Status dot — carries the situation colour; the ring lifts it off
                the rail. Icon uses a heavier stroke to stay crisp at this size. */}
            <div
              className={cn(
                "absolute -left-7 top-0.5 flex size-[18px] items-center justify-center rounded-full ring-[3px] ring-card",
                variantCircleStyles[variant]
              )}
            >
              {Icon && <Icon className="size-[11px] text-white" strokeWidth={2.75} />}
            </div>

            {/* Content — three tiers: title, detail, then actor · time. */}
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-foreground leading-snug">{entry.title}</p>
              {entry.description && (
                <p className="mt-0.5 text-[12.5px] text-muted-foreground leading-relaxed">
                  {entry.description}
                </p>
              )}
              {entry.note && (
                <TruncatedText
                  value={entry.note}
                  className="mt-0.5 max-w-full text-[12.5px] leading-relaxed text-muted-foreground"
                />
              )}
              <div className="mt-1 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                {entry.user && <span className="font-medium text-foreground/75">{entry.user}</span>}
                {entry.user && <span className="text-border">·</span>}
                <span className="tabular-nums">{entry.timestamp}</span>
              </div>
              {entry.actionNode ? (
                <div className="mt-1.5 text-[11.5px] font-medium">
                  {entry.actionNode}
                </div>
              ) : entry.action ? (
                <button
                  type="button"
                  onClick={entry.action.onClick}
                  className="mt-1.5 text-[11.5px] font-medium text-primary hover:underline"
                >
                  {entry.action.label}
                </button>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export { Timeline, type TimelineProps, type TimelineEntry, type TimelineVariant }
