import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'

import { INSIGHTS_STRINGS } from './insights.strings'

// `21/34` — closed over total, the Sales Team card's ratio.
//
// ONE component for both places the pattern appears: the two roll-up tiles
// (`326/525` across the whole team) and the LEAD / DEAL cells in the table
// beneath them. Written twice they would drift the first time someone restyled
// one of them.
//
// The numerator is what the reader is here for, so it carries the emphasis —
// `tone="success"` (the green in the reference), with the denominator muted
// behind it. Both tokens, never a hex (§8.5).

const S = INSIGHTS_STRINGS.ratio

interface RatioProps {
  /** The achieved figure — leads/deals CLOSED in the window. */
  count: number
  /** The pool it came out of — leads/deals OWNED in the window.
   *
   *  Typed optional on purpose even though the wire type marks the field
   *  required: a backend one build behind the schema simply omits it, and
   *  `21/undefined` on screen is worse than `21`. Absent → the numerator
   *  renders alone. */
  total?: number
  /** Lower-case plural for the screen-reader label: "21 of 34 leads". */
  unit: string
  /** Role of the pair — sets its size via the dashboard Typography roles:
   *  `table` in the Sales Team table (13px cell), `kpi-dense` in the Sales Team
   *  roll-up tiles (15px, 4 across), `kpi` in the Summary strip (18px). */
  size?: 'table' | 'kpi-dense' | 'kpi'
  /** Thousands separators (`706/1,500`). OFF by default: the Sales Team table's
   *  ratio columns are ~19% wide and `1,234/2,345` wraps them, while a Summary
   *  tile is wide enough that an ungrouped `1500` reads as a serial number. */
  grouped?: boolean
  className?: string
}

const SIZE_VARIANT = {
  table: 'table-cell',
  'kpi-dense': 'kpi-value-xs',
  kpi: 'kpi-value-sm',
} as const

// Deliberately NOT clickable per half. Drill-down is a property of the TILE /
// ROW that holds this pair, not of the digits — the whole card is the target,
// so this stays a pure display component and the surface around it owns the
// link. (It also keeps the markup legal: a link inside the tile's link is
// invalid HTML that browsers silently un-nest.)

export function Ratio({
  count,
  total,
  unit,
  size = 'table',
  grouped = false,
  className,
}: RatioProps) {
  const variant = SIZE_VARIANT[size]
  const fmt = (n: number) => (grouped ? n.toLocaleString('en-IN') : String(n))

  return (
    <span className={cn('whitespace-nowrap tabular-nums', className)}>
      {/* The digits are hidden from the a11y tree and a spoken label rendered
          beside them: read verbatim, "21/34" comes out as a date or a fraction
          depending on the screen reader. */}
      <span aria-hidden>
        <Typography variant={variant} tone="success" asChild>
          <span>{fmt(count)}</span>
        </Typography>
        {/* A `total` of 0 renders as `0/0`, deliberately: no leads owned in
            this window is a real answer. An em-dash would read as "unknown".
            `count > total` is also legitimate and is shown as-is — `count` is
            the filtered figure while `total` is raw ownership, which is why
            this is a ratio and not a percentage.
            `undefined` is the ONE case that drops the denominator: the field
            is missing from the response, so there is no second figure to show. */}
        {total !== undefined && (
          <Typography variant={variant} tone="muted" asChild>
            <span>{S.ratioTotal(fmt(total))}</span>
          </Typography>
        )}
      </span>
      <span className="sr-only">
        {total === undefined ? S.countOnlyAria(count, unit) : S.ratioAria(count, total, unit)}
      </span>
    </span>
  )
}
