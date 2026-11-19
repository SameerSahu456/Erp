import { type ReactNode } from "react"
import { SlidersHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Typography } from "@/components/ui/typography"

import { FILTERS_POPOVER_STRINGS as S } from "./filters-popover.strings"

export interface FiltersPopoverProps {
  /** How many filters are currently applied — shown as a count badge on the
   *  trigger, and gates the "Clear all" action. */
  activeCount: number
  /** The filter controls. Laid out in a responsive 2-column grid; each child
   *  should be a `flex flex-col gap-1.5` label+control block. */
  children: ReactNode
  /** Resets every filter. Shown as "Clear all" in the header when any filter
   *  is active. */
  onClear?: () => void
  title?: string
  triggerLabel?: string
  className?: string
}

/**
 * A single "Filters (N)" button that opens a popover holding all of a list's
 * filter controls — the app-standard way to keep many server-backed filters
 * out of the toolbar while sitting right beside the search box (drop it into a
 * `BusinessMetricsTable` `toolbarFilters` entry's `render`). The applied
 * filters still surface as removable chips wherever the page shows them; this
 * is only the editing surface.
 */
export function FiltersPopover({
  activeCount,
  children,
  onClear,
  title = S.title,
  triggerLabel = S.trigger,
  className,
}: FiltersPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger
        render={<Button variant="outline" className={cn("gap-2", className)} />}
      >
        <SlidersHorizontal className="size-4" data-icon="inline-start" />
        {triggerLabel}
        {activeCount > 0 && (
          <span
            className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5"
            aria-label={S.activeCountAria(activeCount)}
          >
            <Typography variant="caption" tone="inherit" asChild>
              <span className="text-primary-foreground">{activeCount}</span>
            </Typography>
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,34rem)] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <Typography variant="card-title">{title}</Typography>
          {activeCount > 0 && onClear && (
            <Button variant="ghost" size="sm" onClick={onClear}>
              {S.clearAll}
            </Button>
          )}
        </div>
        <div className="grid max-h-[70vh] gap-4 overflow-y-auto p-4 sm:grid-cols-2">
          {children}
        </div>
      </PopoverContent>
    </Popover>
  )
}
