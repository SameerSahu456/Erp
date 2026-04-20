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
  default: "bg-muted-foreground/80",
  success: "bg-status-success-text",
  error: "bg-status-error-text",
  warning: "bg-status-warning-text",
}

function Timeline({ entries, className }: TimelineProps) {
  return (
    <div className={cn("relative space-y-5 pl-7", className)}>
      {/* Vertical line */}
      <div className="absolute top-1 bottom-1 left-[8px] w-px bg-border" />

      {entries.map((entry) => {
        const variant = entry.variant ?? "default"
        const Icon = entry.icon

        return (
          <div key={entry.id} className="relative flex gap-3 group">
            {/* Circle */}
            <div
              className={cn(
                "absolute -left-7 top-0.5 flex size-[17px] items-center justify-center rounded-full ring-[3px] ring-card",
                variantCircleStyles[variant]
              )}
            >
              {Icon && <Icon className="size-2.5 text-white" />}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-foreground leading-snug">{entry.title}</p>
              {entry.description && (
                <p className="mt-1 text-[13px] text-muted-foreground leading-relaxed">
                  {entry.description}
                </p>
              )}
              <div className="mt-1.5 flex items-center gap-2 text-[12px] text-muted-foreground/80">
                {entry.user && <span className="font-medium">{entry.user}</span>}
                {entry.user && <span className="opacity-40">·</span>}
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
