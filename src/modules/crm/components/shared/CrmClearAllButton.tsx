import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { CRM_SHARED_STRINGS } from "./crm-shared.strings"

interface CrmClearAllButtonProps {
  onClick: () => void
  /** Tighter height for use inside the data-table toolbar (matches its `sm` chips). */
  compact?: boolean
  className?: string
}

// "× Clear all" outlined button. Sits after the last filter chip and shows only
// while a filter is active.
export function CrmClearAllButton({ onClick, compact = false, className }: CrmClearAllButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={cn(
        compact ? "h-8" : "h-9",
        "shrink-0 gap-1 border border-input bg-muted text-[13px] text-foreground/80 shadow-xs hover:bg-muted/70 hover:text-foreground",
        className,
      )}
      onClick={onClick}
    >
      <X className="size-3.5" />
      {CRM_SHARED_STRINGS.filterAside.clearAll}
    </Button>
  )
}
