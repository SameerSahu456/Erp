import { CalendarRange } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Typography } from '@/components/ui/typography'

import { DATE_PRESETS, type DatePreset, type DateRange } from '../utils/date-presets'
import { formatValue } from '../utils/report-format'
import { REPORT_BUILDER_STRINGS as S } from './report-builder.strings'

interface ReportToolbarProps {
  preset: DatePreset
  range: DateRange
  onPresetChange: (p: DatePreset) => void
  onRangeChange: (r: DateRange) => void
}

/** Period picker. Every preset is a visible one-click chip (no dropdown to
 *  open), and the dates it resolves to are always spelled out on the right.
 *  The From / To inputs only appear for a custom range. */
export function ReportToolbar({
  preset,
  range,
  onPresetChange,
  onRangeChange,
}: ReportToolbarProps) {
  const rangeText =
    range.from && range.to
      ? range.from === range.to
        ? formatValue(range.from, 'date')
        : `${formatValue(range.from, 'date')} – ${formatValue(range.to, 'date')}`
      : null

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 print:hidden">
      <div
        role="group"
        aria-label={S.filters.period}
        className="flex min-w-0 flex-wrap items-center gap-0.5 rounded-lg bg-muted p-0.5"
      >
        {DATE_PRESETS.map((p) => {
          const active = p === preset
          return (
            <Button
              key={p}
              type="button"
              size="sm"
              variant={active ? 'outline' : 'ghost'}
              aria-pressed={active}
              onClick={() => onPresetChange(p)}
              className={
                active
                  ? 'border-border shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.08)] hover:bg-card'
                  : 'text-muted-foreground hover:bg-transparent hover:text-foreground'
              }
            >
              {S.filters.presets[p]}
            </Button>
          )
        })}
      </div>

      {preset === 'custom' ? (
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor="report-from" className="text-muted-foreground">
            {S.filters.from}
          </Label>
          <Input
            id="report-from"
            type="date"
            value={range.from}
            max={range.to || undefined}
            onChange={(e) => onRangeChange({ from: e.target.value, to: range.to })}
            className="w-38"
          />
          <Label htmlFor="report-to" className="text-muted-foreground">
            {S.filters.to}
          </Label>
          <Input
            id="report-to"
            type="date"
            value={range.to}
            min={range.from || undefined}
            onChange={(e) => onRangeChange({ from: range.from, to: e.target.value })}
            className="w-38"
          />
        </div>
      ) : (
        rangeText && (
          <div
            className="flex items-center gap-1.5 text-muted-foreground"
            title={S.filters.showing}
          >
            <CalendarRange className="size-3.5 shrink-0" />
            <Typography asChild variant="helper" tone="default" numeric className="font-medium">
              <span>{rangeText}</span>
            </Typography>
          </div>
        )
      )}
    </div>
  )
}
