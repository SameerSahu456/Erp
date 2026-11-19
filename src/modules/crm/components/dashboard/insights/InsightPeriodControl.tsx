// Restore alongside the commented-out Chart/List toggle at the bottom:
// import { BarChart3, Table2 } from 'lucide-react'

import { useState } from 'react'

import { format, isValid, parseISO } from 'date-fns'
import { ChevronDown } from 'lucide-react'
import type { DateRange } from 'react-day-picker'

import { DateRangePicker } from '@/components/common/pickers/DateRangePicker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'

import {
  fyBounds,
  fyLabel,
  fyStartYearOfIso,
  recentFinancialYears,
} from '../../../data/insights/financial-year'
import type { Period } from '../../../data/insights/records'
// import { InsightSegmented, type SegmentedOption } from './InsightSegmented'
import { INSIGHTS_STRINGS } from './insights.strings'

// The period selector. Shared by the dashboard and the insight detail page so
// both read identically. (The Chart/List toggle that used to sit here is
// commented out at the bottom — only the list exists today.)
//
// CUSTOM = a real date range. `from`/`to` are ISO `yyyy-MM-dd` strings carried
// in the URL; the shared `DateRangePicker` (same control as every CRM list
// page's created-date filter) edits them. The old month-name pair ('Feb') is
// still understood by `insight-query-params` for legacy URLs, but this control
// only ever writes ISO dates.

/** ISO `yyyy-MM-dd` → Date for the picker; undefined for anything else (the
 *  legacy month-name defaults simply show the placeholder). */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
function isoToDate(s: string): Date | undefined {
  if (!ISO_DATE_RE.test(s)) return undefined
  const d = parseISO(s)
  return isValid(d) ? d : undefined
}

// Weekly and Custom are COMMENTED OUT of the dropdown (2026-10-08). In their
// place the dropdown carries a "Financial year" row that expands, accordion
// style, into the last FY_OPTION_COUNT financial years (current first).
// Picking one puts the board on that FY's date range — the `custom` state
// under the hood — and shows the date picker BOUNDED to that FY, so the user
// can pick any start / end inside it and nothing outside it. `PERIOD_LABEL`
// keeps every `Period` member so the trigger can still name a state an old
// URL is in.
const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  // { value: 'weekly', label: INSIGHTS_STRINGS.periods.weekly },
  { value: 'monthly', label: INSIGHTS_STRINGS.periods.monthly },
  { value: 'quarterly', label: INSIGHTS_STRINGS.periods.quarterly },
  { value: 'yearly', label: INSIGHTS_STRINGS.periods.yearly },
  // { value: 'custom', label: INSIGHTS_STRINGS.periods.custom },
]

/** How many financial years the dropdown offers: the current FY and the ones
 *  before it. */
const FY_OPTION_COUNT = 5

/** Dropdown value for an FY entry — `fy:2026` is FY 2026-27. Namespaced so it
 *  can never collide with a `Period` member. */
const FY_PREFIX = 'fy:'
const fyValue = (fyStartYear: number) => `${FY_PREFIX}${fyStartYear}`
const fyFromValue = (v: string) => (v.startsWith(FY_PREFIX) ? Number(v.slice(FY_PREFIX.length)) : undefined)

const PERIOD_LABEL: Record<Period, string> = {
  weekly: INSIGHTS_STRINGS.periods.weekly,
  monthly: INSIGHTS_STRINGS.periods.monthly,
  quarterly: INSIGHTS_STRINGS.periods.quarterly,
  yearly: INSIGHTS_STRINGS.periods.yearly,
  custom: INSIGHTS_STRINGS.periods.custom,
}

interface InsightPeriodControlProps {
  period: Period
  onPeriodChange: (p: Period) => void
  from: string
  to: string
  /** Commits BOTH ends atomically — one URL update. Two separate from/to
   *  setters raced (second overwrote the first) and dropped `from`. */
  onRangeChange: (from: string, to: string) => void
  /** Puts the board on `custom` with this range in ONE write — what an FY
   *  entry calls. URL-backed callers (dashboard, detail page) MUST provide it:
   *  `onPeriodChange('custom')` + `onRangeChange(...)` are two URL patches that
   *  race and lose the first. Local-state callers (the account 360° tab) may
   *  omit it and the control falls back to the two calls. */
  onCustomRange?: (from: string, to: string) => void
}

export function InsightPeriodControl({
  period,
  onPeriodChange,
  from,
  to,
  onRangeChange,
  onCustomRange,
}: InsightPeriodControlProps) {
  // The FY the board is on: derived from the committed `from` date whenever
  // the period is custom, so narrowing the picker inside the FY keeps the
  // dropdown on that FY. Read per render so a tab left open across 1 April
  // offers the new FY.
  const fyOptions = recentFinancialYears(FY_OPTION_COUNT)
  const selectedFy = period === 'custom' ? fyStartYearOfIso(from) : undefined
  const onFy = selectedFy !== undefined && fyOptions.includes(selectedFy)
  // What the dropdown holds and what the trigger prints. A custom range that
  // is not inside an offered FY (an old bookmark) still reads "Custom".
  const selectValue = onFy ? fyValue(selectedFy) : period
  const triggerLabel = onFy ? fyLabel(selectedFy) : PERIOD_LABEL[period]

  // The accordion. Closed by default; forced open while an FY is selected so
  // the highlighted year is visible the moment the menu opens.
  const [fyExpanded, setFyExpanded] = useState(false)
  const fyListOpen = fyExpanded || onFy

  // The picker's bounds once an FY is chosen: navigation starts at 1 Apr of
  // that FY. A PAST FY also ends at 31 Mar (an explicit `endMonth`); the
  // RUNNING FY keeps `disableFuture` as its day-level cap instead — an explicit
  // `endMonth` would switch that cap off and leave the rest of this month
  // clickable (see `DateRangePicker`).
  const fyStartMonth = onFy ? new Date(selectedFy, 3, 1) : undefined
  const fyIsRunning = onFy && selectedFy === fyOptions[0]
  const fyEndMonth = onFy && !fyIsRunning ? new Date(selectedFy + 1, 2, 31) : undefined

  const selectFinancialYear = (fyStartYear: number) => {
    // The FY's bounds (end clamped to today for the running FY). The date
    // picker then shows the range for the user to narrow to any start / end.
    const { from: fyFrom, to: fyTo } = fyBounds(fyStartYear)
    if (onCustomRange) {
      onCustomRange(fyFrom, fyTo)
    } else {
      onPeriodChange('custom')
      onRangeChange(fyFrom, fyTo)
    }
  }

  // The IN-PROGRESS range while the user is mid-pick. Range selection is a
  // two-click flow: the first click emits a partial `{ from }` and the second
  // completes it. Feeding the committed URL `to` back into the calendar during
  // that window makes every click read as a fresh range-start — the end date
  // can never land (the "July doesn't work" bug: the default range already
  // ended 31 Jul, so any July pick kept restarting). Hold the partial state
  // here; commit to the URL only when BOTH ends exist.
  const [draft, setDraft] = useState<DateRange | undefined>(undefined)

  return (
    // `flex-nowrap`: the period select and the custom date range are ONE unit.
    // Wrapping let the range drop under the select on Custom; the facet group
    // beside it (min-w-0, wraps) is what gives up space instead.
    <div className="flex flex-nowrap items-center gap-2">
      <Select
        value={selectValue}
        onValueChange={(v) => {
          if (!v) return
          const fy = fyFromValue(v)
          if (fy !== undefined) selectFinancialYear(fy)
          else onPeriodChange(v as Period)
        }}
      >
        <SelectTrigger
          size="sm"
          // The board is ALWAYS on some period — there is no "no period" state
          // to clear to. Without this the trigger grows a × that calls
          // `onValueChange(null)`, which the guard above drops on the floor: a
          // control that visibly does nothing. It also crowded the row enough
          // to wrap the facets onto a second line.
          clearable={false}
          // Wide enough for "FY 2026-27" plus the chevron without clipping.
          className="w-[140px]"
          aria-label={INSIGHTS_STRINGS.toolbar.period}
        >
          <SelectValue>{triggerLabel}</SelectValue>
        </SelectTrigger>
        {/* Decoupled from the trigger width (the default `w-(--anchor-width)`
            would be 140px): the FY rows carry an indent AND the check column,
            so at trigger width "FY 2026-27" had no room. Inner padding so the
            hover highlight never touches the popup edge. */}
        <SelectContent className="w-[208px] p-1">
          {PERIOD_OPTIONS.map((p) => (
            <SelectItem key={p.value} value={p.value} className="py-1.5">
              {p.label}
            </SelectItem>
          ))}

          <SelectSeparator />

          {/* "Financial year" accordion header. NOT a SelectItem: clicking it
              toggles the list below without selecting or closing the menu.
              `onMouseDown` is swallowed so Base UI's pointer handling never
              reads the click as a selection or a dismiss. Same geometry and
              type size as the rows above; the chevron sits in the column the
              items reserve for their check mark, so both edges line up. */}
          <button
            type="button"
            aria-expanded={fyListOpen}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setFyExpanded((open) => !open)}
            className={cn(
              'flex w-full cursor-default items-center gap-1.5 rounded-md py-1.5 pr-2 pl-1.5 outline-hidden select-none',
              'hover:bg-accent hover:text-accent-foreground',
              fyListOpen && 'text-foreground',
            )}
          >
            <Typography
              variant="body-strong"
              tone="inherit"
              className="min-w-0 flex-1 text-left whitespace-nowrap"
            >
              {INSIGHTS_STRINGS.toolbar.financialYear}
            </Typography>
            <ChevronDown
              aria-hidden="true"
              className={cn(
                'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
                fyListOpen && 'rotate-180',
              )}
            />
          </button>

          {/* The years — current first, then the previous ones. Indented one
              step under the header so they read as its children. */}
          {fyListOpen &&
            fyOptions.map((fy) => (
              <SelectItem key={fy} value={fyValue(fy)} className="py-1.5 pl-6">
                {fyLabel(fy)}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>

      {period === 'custom' && (
        <DateRangePicker
          value={draft ?? { from: isoToDate(from), to: isoToDate(to) }}
          onChange={(range: DateRange | undefined) => {
            if (range?.from && range?.to) {
              // Both ends picked — commit to the URL and drop the draft. A
              // half-open range is never committed (the API 422s on one).
              onRangeChange(format(range.from, 'yyyy-MM-dd'), format(range.to, 'yyyy-MM-dd'))
              setDraft(undefined)
            } else {
              // First click of the two-click flow (or a re-anchor) — show it
              // in the calendar without touching the committed range yet.
              setDraft(range)
            }
          }}
          clearable={false}
          // Once an FY is chosen the calendar cannot leave it — see the bounds
          // above. Without an FY (an old `?period=custom` bookmark) the full
          // history is navigable.
          startMonth={fyStartMonth}
          endMonth={fyEndMonth}
          // The board reports what HAS happened. A window ending in the future
          // can only ever add empty buckets to every cell on the page, so
          // tomorrow onward is not selectable — the cap is today, re-derived on
          // each open, never a pinned date.
          disableFuture
          placeholder={INSIGHTS_STRINGS.toolbar.customRange}
          // Compact to match the h-8 period select beside it; wide enough for
          // "dd MMM yyyy – dd MMM yyyy" without truncating.
          className="h-8 w-[248px]"
        />
      )}

      {/* <InsightViewToggle /> — see below. */}
    </div>
  )
}

// Chart / List segmented control — COMMENTED OUT.
//
// Only the list exists today, so a two-way toggle with one permanently-disabled
// half is a control that can't do anything: it reads as a broken affordance
// rather than a promise. Restore this (and its render site above) when a chart
// view actually lands.
//
// Chrome comes from `InsightSegmented`, shared with the My/Team pair, so both
// strips are the same height and sit level beside each other.
//
// const VIEW_OPTIONS: SegmentedOption<'chart' | 'list'>[] = [
//   {
//     value: 'chart',
//     label: INSIGHTS_STRINGS.toolbar.chart,
//     Icon: BarChart3,
//     disabled: true,
//     hint: INSIGHTS_STRINGS.toolbar.chartDisabled,
//   },
//   { value: 'list', label: INSIGHTS_STRINGS.toolbar.list, Icon: Table2 },
// ]
//
// export function InsightViewToggle() {
//   return (
//     <InsightSegmented
//       options={VIEW_OPTIONS}
//       value="list"
//       ariaLabel={INSIGHTS_STRINGS.toolbar.viewLabel}
//     />
//   )
// }
