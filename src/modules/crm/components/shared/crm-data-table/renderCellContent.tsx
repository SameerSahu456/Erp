import type * as React from "react"

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { BarcodeText } from "@/components/common/display/BarcodeText"

import { isTooltipPrimitive } from "./types"

/** Renders one cell's content: optional barcode wrapper + a hover tooltip that
 *  surfaces the raw value, unless a custom formatter has taken over the cell. */
export function renderCellContent(
  value: unknown,
  rendered: React.ReactNode,
  isBarcodeCol: boolean,
  model?: string,
  serial?: string,
) {
  const display = isBarcodeCol ? (
    <BarcodeText model={model} serial={serial}>
      {rendered}
    </BarcodeText>
  ) : (
    rendered
  )

  // When a cellFormatter returns a custom React node (i.e. `rendered` is not
  // the same primitive as `value`), the page is in control of what operators
  // see and the raw `value` should not leak via tooltip. This prevents the
  // "actions" cell from showing the row's UUID on hover — pages routinely set
  // `actions: row.id` so the formatter can navigate / mutate by id.
  const rendererTookOver = isTooltipPrimitive(value) && !isTooltipPrimitive(rendered)
  const tooltipText = rendererTookOver
    ? null
    : isTooltipPrimitive(value)
      ? String(value)
      : isTooltipPrimitive(rendered)
        ? String(rendered)
        : null

  if (!tooltipText) return display

  return (
    <TooltipProvider delay={150}>
      <Tooltip>
        <TooltipTrigger
          render={
            // Tooltip still useful when the wrapped value is a long sentence —
            // operator can hover for the unwrapped form. The cell wraps
            // naturally inside its 200px max width.
            <div className="min-w-0 break-words">{display}</div>
          }
        />
        <TooltipContent>{tooltipText}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
