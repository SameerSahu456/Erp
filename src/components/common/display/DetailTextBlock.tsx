import type { LucideIcon } from "lucide-react"

import { Typography } from "@/components/ui/typography"
import { cn } from "@/lib/utils"
import { ExpandableClampText } from "./ExpandableClampText"

interface DetailTextBlockProps {
  icon?: LucideIcon
  label: string
  text: string
  className?: string
  lines?: 2 | 3 | 4
}

export function DetailTextBlock({
  icon: Icon,
  label,
  text,
  className,
  lines = 3,
}: DetailTextBlockProps) {
  return (
    <section
      className={cn(
        "min-w-0 self-start rounded-md border border-border bg-muted/30 p-3.5",
        className,
      )}
    >
      <div className="mb-2 flex min-w-0 items-center gap-2">
        {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" />}
        <Typography variant="caption" tone="muted" className="font-medium">
          {label}
        </Typography>
      </div>
      <ExpandableClampText
        text={text}
        lines={lines}
        variant="body"
        className="min-w-0"
        showMoreLabel="... Show more"
        showLessLabel="Show less"
      />
    </section>
  )
}
