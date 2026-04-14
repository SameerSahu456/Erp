import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type TimelineVariant = "default" | "success" | "error" | "warning"

interface TimelineEntry {
  id: string
  icon?: LucideIcon
  title: string
  description?: string
  user?: string
  timestamp: string
  variant?: TimelineVariant
}

interface TimelineProps {
  entries: TimelineEntry[]
  className?: string
}

const variantCircleStyles: Record<TimelineVariant, string> = {
  default: "bg-muted-foreground",
  success: "bg-status-success-text",
  error: "bg-status-error-text",
  warning: "bg-status-warning-text",
}

function Timeline({ entries, className }: TimelineProps) {
  return (
    <div className={cn("relative space-y-6 pl-6", className)}>
      {/* Vertical line */}
      <div className="absolute top-0 bottom-0 left-[7px] w-px bg-border" />

      {entries.map((entry) => {
        const variant = entry.variant ?? "default"
        const Icon = entry.icon

        return (
          <div key={entry.id} className="relative flex gap-3">
            {/* Circle */}
            <div
              className={cn(
                "absolute -left-6 top-1 flex size-4 items-center justify-center rounded-full",
                variantCircleStyles[variant]
              )}
            >
              {Icon && <Icon className="size-2.5 text-white" />}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{entry.title}</p>
              {entry.description && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {entry.description}
                </p>
              )}
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                {entry.user && <span>{entry.user}</span>}
                {entry.user && <span>·</span>}
                <span>{entry.timestamp}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export { Timeline, type TimelineProps, type TimelineEntry, type TimelineVariant }
