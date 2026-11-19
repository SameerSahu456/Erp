import * as React from "react"

import { Badge } from "@/components/ui/badge"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { cn } from "@/lib/utils"
import { Typography } from "@/components/ui/typography"

type BadgeVariant = React.ComponentProps<typeof Badge>["variant"]
type BadgeSize = React.ComponentProps<typeof Badge>["size"]

export type OverflowPillColumn<T> = {
  key: string
  header: string
  render: (item: T, index: number) => React.ReactNode
  align?: "left" | "center" | "right"
  className?: string
}

export interface OverflowPillListProps<T> {
  items: readonly T[]
  getItemLabel: (item: T) => string
  getItemKey?: (item: T, index: number) => React.Key
  columns?: OverflowPillColumn<T>[]
  maxVisible?: number
  emptyLabel?: React.ReactNode
  summaryLabel?: string
  hoverTitle?: string
  itemVariant?: BadgeVariant | ((item: T, index: number) => BadgeVariant)
  size?: BadgeSize
  className?: string
  enableHoverCard?: boolean
  /** Replaces the default pill summary (the hover card is kept). */
  renderSummary?: (ctx: { visibleItems: readonly T[]; hiddenCount: number }) => React.ReactElement
}

function defaultColumns<T>(
  getItemLabel: (item: T) => string,
): OverflowPillColumn<T>[] {
  return [
    {
      key: "index",
      header: "SR No",
      render: (_item, index) => index + 1,
      className: "w-14 whitespace-nowrap text-muted-foreground",
    },
    {
      key: "label",
      header: "Item",
      render: (item) => getItemLabel(item),
    },
  ]
}

function alignClassName(align?: "left" | "center" | "right") {
  if (align === "center") return "text-center"
  if (align === "right") return "text-right"
  return "text-left"
}

export function OverflowPillList<T>({
  items,
  getItemLabel,
  getItemKey,
  columns,
  maxVisible = 1,
  emptyLabel = "—",
  itemVariant = "primary-soft",
  size = "sm",
  className,
  enableHoverCard = true,
  renderSummary,
}: OverflowPillListProps<T>) {
  if (items.length === 0) {
    return <Typography variant="body" tone="muted" asChild><span>{emptyLabel}</span></Typography>
  }

  const visibleItems = items.slice(0, Math.max(1, maxVisible))
  const hiddenCount = Math.max(0, items.length - visibleItems.length)
  const tableColumns = columns ?? defaultColumns(getItemLabel)

  const summary = renderSummary ? (
    renderSummary({ visibleItems, hiddenCount })
  ) : (
    // `flex min-w-0 max-w-full` so the row respects its cell width instead of
    // sizing to content and spilling into the next column; a long pill then
    // truncates within the cell rather than being clipped at the column edge.
    <div className={cn("flex min-w-0 max-w-full items-center gap-1.5", className)}>
      {visibleItems.map((item, index) => {
        const label = getItemLabel(item)
        const variant =
          typeof itemVariant === "function" ? itemVariant(item, index) : itemVariant

        return (
          <Badge
            key={getItemKey ? getItemKey(item, index) : `${label}-${index}`}
            variant={variant}
            size={size}
            // `justify-start` overrides the Badge's default `justify-center`:
            // centering a too-long label clips BOTH ends and shows the middle
            // with no ellipsis (the label is an anonymous flex item, so the
            // Badge's own `truncate` never applies to it). Left-aligned, the
            // inner span below owns the truncation.
            // `shrink` overrides the Badge's base `shrink-0`: without it the
            // pill refuses to shrink, holds its full `max-w-[180px]`, and pushes
            // the shrink-0 "+N" badge past the fixed-width column edge where the
            // cell's `overflow-hidden` clips it. With `shrink` + `min-w-0` the
            // pill yields space (truncating) so "+N" always stays visible
            // ("truncate if no space") — capped at 180px, never wider than the
            // cell.
            className="min-w-0 shrink max-w-[180px] justify-start h-5 rounded-md px-1 border border-border/60 bg-muted text-foreground shadow-none dark:border-white/10 dark:bg-white/10 dark:text-white/90"
          >
            {/* The span, not the Badge, is the truncating box: `min-w-0` so it
                can shrink inside the flex Badge, then `truncate` ellipsizes from
                the END so the label reads from its FIRST letter. */}
            <span className="min-w-0 truncate">{label}</span>
          </Badge>
        )
      })}
      {hiddenCount > 0 && (
        <Badge
          variant={
            typeof itemVariant === "function"
              ? itemVariant(visibleItems[visibleItems.length - 1] as T, visibleItems.length - 1)
              : itemVariant
          }
          size={size}
          // shrink-0 so the "+N" marker is never squeezed out by a long pill.
          className="shrink-0 h-5 rounded-md px-1 border border-border/60 bg-muted text-muted-foreground shadow-none dark:border-white/10 dark:bg-white/10 dark:text-white/80"
        >
          +{hiddenCount}
        </Badge>
      )}
    </div>
  )

  if (!enableHoverCard) {
    return summary
  }

  return (
    <HoverCard>
      {/* Base UI's PreviewCard.Trigger is polymorphic via `render`, NOT
          `asChild` (asChild leaks to the DOM and React warns). `render`
          forwards the trigger onto the inner inline-flex div so the pills
          stay the trigger — without it Base UI would wrap them in its own
          element with baseline-aligned default styling, leaving a gap
          between the row and the popover. */}
      <HoverCardTrigger render={summary} />
      <HoverCardContent
        align="start"
        sideOffset={2}
        className="w-auto min-w-[220px] max-w-[min(90vw,28rem)] overflow-hidden rounded-xl border border-border/70 bg-popover/98 p-0 shadow-[0_14px_40px_rgb(var(--shadow-rgb)/0.24)] backdrop-blur-sm"
      >
        {/* No top padding on the scroll container — the sticky header
            pins to `top: 0` OF this div, so any padding above it would
            leave a translucent strip where the scrolling rows show
            through (the 'gap above the header' the user reported). The
            inner cell padding compensates for the missing outer
            padding on the sides. */}
        <div className="max-h-[260px] overflow-x-auto overflow-y-auto">
          <table className="w-max min-w-full text-sm">
            <thead className="sticky top-0 z-10 bg-popover">
              <tr className="border-b border-border">
                {tableColumns.map((column) => (
                  <th
                    key={column.key}
                    className={cn(
                      "px-2.5 py-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] whitespace-nowrap text-muted-foreground",
                      alignClassName(column.align),
                      column.className,
                    )}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr
                  key={getItemKey ? getItemKey(item, index) : `${getItemLabel(item)}-${index}`}
                  className="border-b border-border/50 last:border-b-0"
                >
                  {tableColumns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        "px-2.5 py-2.5 align-top text-[13px] text-foreground",
                        alignClassName(column.align),
                        column.className,
                      )}
                    >
                      {column.render(item, index)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
