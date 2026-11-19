import type { LucideIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

// The ONE segmented control on the insight board. Both pairs that sit in the
// toolbar — My / Team and Chart / List — render through this, so they cannot
// drift apart in height, padding, radius or active colour.
//
// They previously did drift: Chart/List mixed a bare <button> (inside a
// TooltipTrigger) with a <Button>, so the two halves resolved different heights
// and line-heights and the strip sat visibly uneven next to its neighbours.
// Every segment is now the same <Button>, disabled or not.

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  Icon: LucideIcon
  /** Renders the segment inert, with `hint` as its tooltip. Kept visible rather
   *  than hidden so the strip doesn't resize when the feature lands. */
  disabled?: boolean
  hint?: string
}

interface InsightSegmentedProps<T extends string> {
  options: SegmentedOption<T>[]
  value: T
  onChange?: (v: T) => void
  /** Names the group for screen readers — the control has no visible label. */
  ariaLabel: string
}

const SEGMENT = 'h-8 gap-1 rounded-none px-2.5 font-medium transition-colors'

export function InsightSegmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: InsightSegmentedProps<T>) {
  return (
    <TooltipProvider delay={150}>
      <div
        className="flex h-8 items-stretch overflow-hidden rounded-md border border-border"
        role="group"
        aria-label={ariaLabel}
      >
        {options.map(({ value: v, label, Icon, disabled, hint }) => {
          const active = v === value
          const segment = (
            <Button
              variant="ghost"
              disabled={disabled}
              onClick={disabled ? undefined : () => onChange?.(v)}
              aria-pressed={active}
              className={cn(
                SEGMENT,
                active
                  ? 'bg-primary text-primary-foreground hover:bg-primary'
                  : 'text-muted-foreground',
                disabled && 'cursor-not-allowed',
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </Button>
          )

          // A disabled button swallows pointer events, so the tooltip has to
          // wrap it rather than live on it.
          return hint ? (
            <Tooltip key={v}>
              <TooltipTrigger render={<span className="inline-flex" />}>{segment}</TooltipTrigger>
              <TooltipContent>{hint}</TooltipContent>
            </Tooltip>
          ) : (
            <span key={v} className="inline-flex">
              {segment}
            </span>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
