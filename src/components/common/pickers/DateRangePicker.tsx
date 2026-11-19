import { useMemo, useState, type ReactNode } from "react"
import { CalendarIcon, XIcon } from "lucide-react"
import type { DateRange, Matcher } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatDateLabel } from "@/shared/lib/date"
import {
  CaptionDrillButton,
  clampMonth,
  MonthGridView,
  PANE_WIDTH,
  type StepView,
  YearGridView,
  yearPageStart,
} from "./calendar-drilldown"

export type { DateRange }

/** Open-end word in a partial range label ("12 Oct 2026 – Today"). */
const TODAY_LABEL = "Today"

/** Toolbar width for a date-range filter chip — wide enough to show a full
 *  "DD Mon YYYY – DD Mon YYYY" range plus the clear button without truncating.
 *  Shared by the BusinessMetricsTable and CRM toolbar date filters so both
 *  families render the same. */
export const DATE_RANGE_TOOLBAR_WIDTH = "w-[248px]"

/** What the trigger reads. `pendingFrom` is the start held mid-pick under
 *  `commitOnComplete` — closing then applies start – today, so it says so.
 *  Otherwise an em-dash on an open side reads "from X onward" / "up to Y". */
function rangeLabel(
  value: DateRange | undefined,
  placeholder: string,
  pendingFrom: Date | null,
  commitOnComplete: boolean,
): string {
  if (pendingFrom) return `${formatDateLabel(pendingFrom)} – ${TODAY_LABEL}`
  if (!value?.from && !value?.to) return placeholder
  if (value?.from && value?.to)
    return `${formatDateLabel(value.from)} – ${formatDateLabel(value.to)}`
  if (value?.from)
    return commitOnComplete
      ? `${formatDateLabel(value.from)} – ${TODAY_LABEL}`
      : `${formatDateLabel(value.from)} –`
  return `– ${formatDateLabel(value.to as Date)}`
}

export interface DateRangePickerProps {
  /** Selected range. `undefined` (or an all-empty object) means nothing picked. */
  value: DateRange | undefined
  /** Fires on every range edit — including the partial `{ from }` state while
   *  the user is still picking the end of the range, and `undefined` on clear. */
  onChange: (next: DateRange | undefined) => void
  placeholder?: string
  /** Show the inline clear "X" once a value is set. */
  clearable?: boolean
  disabled?: boolean
  id?: string
  className?: string
  /** Earliest month the picker may navigate to. Defaults to Jan of
   *  (current year − 50), recomputed from today — never a static year. */
  startMonth?: Date
  /** Latest month the picker may navigate to. Defaults to Dec of
   *  (current year + 20), recomputed from today. */
  endMonth?: Date
  /** Cap the picker at today — no future dates navigable or selectable.
   *
   *  OPT-IN, not the default. Most callers filter on a created date, where a
   *  future day selects an empty set; but some pick genuinely forward-looking
   *  ranges (the meetings toolbar), and capping those unconditionally would
   *  make a future meeting unreachable.
   *
   *  Caps BOTH the navigable month window and the individual day cells — the
   *  day-grid matcher is derived from the same `maxDate`, so the current month
   *  still opens while its future days stay disabled. Ignored when an explicit
   *  `endMonth` is passed: that is the caller being more specific. */
  disableFuture?: boolean
  /** OPT-IN. When true, picking a START date does NOT emit yet:
   *  the range is applied only once the END is chosen. If the user closes the
   *  popover having picked only a start, the end is auto-filled as TODAY
   *  ({from: start, to: today}). Default false keeps the legacy "emit on every
   *  edit" behaviour that CRM's date filters rely on. */
  commitOnComplete?: boolean
  /** OPT-IN. Use the browser's native `title` hover instead of the styled
   *  tooltip (and skip its wrapper element). For toolbars that keep the
   *  original plain-hover look, e.g. PM Approvals. */
  nativeTitle?: boolean
}

// Created-date range filter shared across every CRM list page. Composes the
// `ui/calendar` (range mode) inside a `ui/popover`. The trigger mirrors the
// AsyncSelect / CategoryPicker geometry token-for-token (h-10, rounded-[7px],
// border-input, bg-card, shadow-xs) so it reads as the same field family in a
// filter aside or toolbar. All colors come from semantic tokens — no hex.
export function DateRangePicker({
  value,
  onChange,
  placeholder = "Any date",
  clearable = true,
  disabled,
  id,
  className,
  startMonth,
  endMonth,
  disableFuture = false,
  commitOnComplete = false,
  nativeTitle = false,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  // The not-yet-committed start date while the user is mid-pick
  // (only used when `commitOnComplete`). Held HERE, not inside DualDateCalendar,
  // so it survives to the popover-close handler that auto-fills the end.
  const [pendingFrom, setPendingFrom] = useState<Date | null>(null)

  // Dynamic navigation window, derived from the current date so the year grid
  // never renders a hardcoded list of years and the ◀ ▶ year-page arrows always
  // have room to move: 50 years back through 20 years forward, or through TODAY
  // when the caller opts into `disableFuture`.
  //
  // The forward bound is conditional rather than always-today: a created-date
  // filter has no use for future days, but the meetings toolbar picks
  // forward-looking ranges, and a hard cap here would make those unreachable.
  //
  // `maxDate` serves double duty — the month-level navigation bound AND the
  // source of the day-grid's `{ after: maxDate }` matcher below — so the day
  // cells and the navigable months can never disagree about where the window
  // ends.
  const [minDate, maxDate] = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const today = new Date(year, now.getMonth(), now.getDate())
    return [
      startMonth ?? new Date(year - 50, 0, 1),
      endMonth ?? (disableFuture ? today : new Date(year + 20, 11, 31)),
    ] as const
  }, [startMonth, endMonth, disableFuture])

  // Either endpoint counts as "set" — the From and To pickers are independent,
  // so a user may fill in just one side.
  const hasValue = Boolean(value?.from || value?.to)
  // `pendingFrom` is only ever set under `commitOnComplete`.
  const label = rangeLabel(value, placeholder, pendingFrom, commitOnComplete)
  const labelIsValue = hasValue || pendingFrom != null

  const picker = (
    <Popover
      open={open}
      onOpenChange={(o) => {
        if (disabled) return
        if (commitOnComplete) {
          // Closing with only a start date → auto-fill the end as today and
          // apply {from: start, to: today}. (Re)opening → start a
          // fresh pending selection.
          if (!o && pendingFrom) {
            const now = new Date()
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            onChange({ from: pendingFrom, to: today })
          }
          setPendingFrom(null)
        }
        setOpen(o)
      }}
    >
      <PopoverTrigger
        id={id}
        data-slot="date-range-picker-trigger"
        disabled={disabled}
        className={cn(
          // 13px + foreground text so the trigger matches the other filter
          // fields — the empty placeholder is NOT muted, so "Select
          // date range" reads dark like a chosen value beside it.
          "group/date-range-trigger flex h-10 w-full items-center justify-between rounded-[7px] border border-input bg-card px-[10px] text-[13px] text-foreground shadow-xs",
          "transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          !disabled && "cursor-pointer",
          open && "border-primary",
          className,
        )}
        title={nativeTitle ? label : undefined}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <CalendarIcon className="size-4 shrink-0 opacity-60" />
          {labelIsValue ? (
            // Styled tooltip (never a native `title`) so a range truncated in
            // a narrow trigger can still be read in full on hover.
            <TooltipProvider delay={150}>
              <Tooltip>
                <TooltipTrigger
                  render={<span className="min-w-0 flex-1 truncate">{label}</span>}
                />
                <TooltipContent>{label}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <span className="min-w-0 flex-1 truncate">{label}</span>
          )}
        </span>
        {clearable && hasValue && !disabled && (
          <span
            role="button"
            aria-label="Clear date range"
            className="ml-2 shrink-0 rounded p-0.5 opacity-50 hover:bg-muted hover:opacity-100"
            // Base UI's Popover.Trigger opens on pointerdown, so a click-only
            // handler fires after the popover is already opening. Stop the
            // pointer + mouse events too so clearing never reopens the popover.
            onPointerDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setPendingFrom(null)
              onChange(undefined)
            }}
          >
            <XIcon className="size-3.5" />
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent align="start" className="w-auto p-0">
        <DualDateCalendar
          value={value}
          onChange={onChange}
          minDate={minDate}
          maxDate={maxDate}
          commitOnComplete={commitOnComplete}
          pendingFrom={pendingFrom}
          setPendingFrom={setPendingFrom}
        />
      </PopoverContent>
    </Popover>
  )

  if (nativeTitle) return picker
  return (
    <DateRangeTooltip
      text={hasValue ? `${placeholder}: ${label}` : String(placeholder)}
      suppress={open}
    >
      {picker}
    </DateRangeTooltip>
  )
}

// ---------------------------------------------------------------------------
// Two side-by-side month panes that share ONE range selection (so the range
// highlight spans both calendars and the days between `from` and `to` light
// up), but navigate INDEPENDENTLY: each pane drills into its own day → year →
// month picker and keeps its own displayed month, so changing the year/month
// in one pane never moves the other. Clicks in either pane edit the shared
// range via `value`/`onChange`; the completed range is auto-ordered so the
// earlier date is `from` and the later is `to`. Years/months come from a window
// derived from today (`minDate`/`maxDate`) — nothing is hardcoded. The year
// and month grids, the caption button and the pane width come from
// `calendar-drilldown`, the same primitives DatePicker uses, so a single date
// field and a range field drill down identically.
// ---------------------------------------------------------------------------

interface DualDateCalendarProps {
  value: DateRange | undefined
  onChange: (next: DateRange | undefined) => void
  minDate: Date
  maxDate: Date
  /** See DateRangePickerProps.commitOnComplete. */
  commitOnComplete?: boolean
  pendingFrom?: Date | null
  setPendingFrom?: (d: Date | null) => void
}

// The two panes open on consecutive months (From = `from`'s month, To = the
// month after) and NEVER show the same month/year: they navigate independently,
// but if the user moves one pane onto the other's month, the other shifts one
// month away (keeping the earlier month on the left). See resolveLeft/Right.
function nextMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1)
}
function prevMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() - 1, 1)
}
const sameMonth = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()

// Keep the two displayed months distinct. `resolveLeft`: the user just moved the
// LEFT pane; if it now lands on the right's month, push the right forward to
// left+1 (or, when the right is pinned at the max month, pull the left back one
// instead). `resolveRight` mirrors it for a right-pane move. A move that doesn't
// collide passes through unchanged.
function resolveLeft(left: Date, right: Date, min: Date, max: Date): { left: Date; right: Date } {
  if (!sameMonth(left, right)) return { left, right }
  const pushed = clampMonth(nextMonth(left), min, max)
  if (!sameMonth(pushed, left)) return { left, right: pushed }
  return { left: clampMonth(prevMonth(left), min, max), right }
}
function resolveRight(left: Date, right: Date, min: Date, max: Date): { left: Date; right: Date } {
  if (!sameMonth(left, right)) return { left, right }
  const pulled = clampMonth(prevMonth(right), min, max)
  if (!sameMonth(pulled, right)) return { left: pulled, right }
  return { left, right: clampMonth(nextMonth(right), min, max) }
}

// Two side-by-side panes sharing one range selection but navigating
// independently. Both render the SAME `value` in `mode="range"` (so the range
// highlight spans both), and both write through the SAME `onChange`.
function DualDateCalendar({
  value,
  onChange,
  minDate,
  maxDate,
  commitOnComplete = false,
  pendingFrom = null,
  setPendingFrom,
}: DualDateCalendarProps) {
  const today = new Date()
  // Both panes select into ONE shared range — there is no per-pane From/To
  // restriction anymore. The only limit is the no-future cap (this is a
  // created-date filter). Matchers are arrays so react-day-picker ORs them.
  // Both ends. `startMonth` used to bound only month NAVIGATION, so a day
  // before it stayed selectable whenever it fell in a reachable month —
  // which let a caller that clamps to a window (the SO line's billing
  // period) still pick outside it.
  const dayDisabled: Matcher[] = [{ before: minDate }, { after: maxDate }]

  // While a start date is held but not yet committed, `value` hasn't
  // changed — highlight the held start from local state so the calendar still
  // shows the user's first pick while they choose the end.
  const displayValue: DateRange | undefined =
    commitOnComplete && pendingFrom ? { from: pendingFrom, to: undefined } : value

  // The two panes are CONTROLLED here so they coordinate: they never show the
  // same month/year. Open on the range's months, made adjacent; each arrow /
  // month / year navigation routes through changeLeft / changeRight below.
  const [months, setMonths] = useState<{ left: Date; right: Date }>(() =>
    resolveLeft(
      clampMonth(value?.from ?? today, minDate, maxDate),
      clampMonth(value?.to ?? nextMonth(value?.from ?? today), minDate, maxDate),
      minDate,
      maxDate,
    ),
  )
  const changeLeft = (m: Date) =>
    setMonths((cur) => resolveLeft(clampMonth(m, minDate, maxDate), cur.right, minDate, maxDate))
  const changeRight = (m: Date) =>
    setMonths((cur) => resolveRight(cur.left, clampMonth(m, minDate, maxDate), minDate, maxDate))

  // Natural range selection from a click in EITHER pane. The program infers
  // start vs end from click order + chronology, so the user never has to aim a
  // specific pane:
  //   - no range yet (or a complete range already picked) → this click starts a
  //     fresh range at `day`;
  //   - a start is set but no end → this click completes the range, auto-ordered
  //     so the earlier date is `from` and the later is `to` (clicking before the
  //     start simply swaps them).
  const pickDay = (day: Date) => {
    if (commitOnComplete && setPendingFrom) {
      // Do NOT emit on the first (start) click — hold it. Emit only
      // once the end is chosen; a lone start is auto-completed to `today` on
      // popover close (handled by the trigger's onOpenChange).
      if (pendingFrom == null) {
        setPendingFrom(day)
        return
      }
      const from = pendingFrom
      setPendingFrom(null)
      onChange(
        day.getTime() < from.getTime() ? { from: day, to: from } : { from, to: day },
      )
      return
    }
    if (!value?.from || (value.from && value.to)) {
      onChange({ from: day, to: undefined })
      return
    }
    const from = value.from
    onChange(
      day.getTime() < from.getTime()
        ? { from: day, to: from }
        : { from, to: day },
    )
  }

  return (
    <div className="flex flex-col gap-3 p-3 sm:flex-row sm:gap-4">
      <MonthPane
        value={displayValue}
        onPick={pickDay}
        month={months.left}
        onMonthChange={changeLeft}
        minDate={minDate}
        maxDate={maxDate}
        disabled={dayDisabled}
      />
      <div className="hidden w-px self-stretch bg-border sm:block" aria-hidden />
      <MonthPane
        value={displayValue}
        onPick={pickDay}
        month={months.right}
        onMonthChange={changeRight}
        minDate={minDate}
        maxDate={maxDate}
        disabled={dayDisabled}
      />
    </div>
  )
}

// One pane: a range-mode day grid that drills into its own year → month picker
// and keeps its OWN displayed month (independent navigation). It renders and
// edits the SHARED range — clicking a day here updates the same `from`/`to`
// the other pane shows.
function MonthPane({
  value,
  onPick,
  month,
  onMonthChange,
  minDate,
  maxDate,
  disabled,
}: {
  /** The shared range (rendered in both panes for a spanning highlight). */
  value: DateRange | undefined
  /** Sets THIS pane's endpoint only (From pane → `from`, To pane → `to`). */
  onPick: (day: Date) => void
  /** Displayed month — CONTROLLED by the parent so the two panes coordinate and
   *  never show the same month/year. */
  month: Date
  onMonthChange: (m: Date) => void
  minDate: Date
  maxDate: Date
  /** Days this pane can't select — the From/To cross-limit plus the no-future
   *  cap (see DualDateCalendar). */
  disabled: Matcher[]
}) {
  const minYear = minDate.getFullYear()
  const maxYear = maxDate.getFullYear()

  const [view, setView] = useState<StepView>("day")
  const [yearPage, setYearPage] = useState<number>(() =>
    yearPageStart(month.getFullYear(), minYear),
  )

  const openYears = () => {
    setYearPage(yearPageStart(month.getFullYear(), minYear))
    setView("year")
  }

  const pickYear = (year: number) => {
    onMonthChange(clampMonth(new Date(year, month.getMonth(), 1), minDate, maxDate))
    setView("month")
  }

  const pickMonth = (m: number) => {
    onMonthChange(clampMonth(new Date(month.getFullYear(), m, 1), minDate, maxDate))
    setView("day")
  }

  if (view === "year") {
    return (
      <YearGridView
        displayMonth={month}
        minYear={minYear}
        maxYear={maxYear}
        yearPage={yearPage}
        setYearPage={setYearPage}
        onPickYear={pickYear}
      />
    )
  }

  if (view === "month") {
    return (
      <MonthGridView
        displayMonth={month}
        minDate={minDate}
        maxDate={maxDate}
        minYear={minYear}
        maxYear={maxYear}
        onMonthChange={onMonthChange}
        onPickMonth={pickMonth}
        openYears={openYears}
      />
    )
  }

  // ---- Day grid (shared range selection; highlight spans both panes) -----
  // react-day-picker keeps its OWN "focused day" internally and paints a ring
  // on it — clearing the range via `onChange(undefined)` doesn't reset that, so
  // the last-clicked day would keep a stray border after a clear. Remounting the
  // grid when the selection empties resets that internal focus. `month` is owned
  // by this pane (passed as a prop), so the remount keeps the displayed month.
  const selectionKey = value?.from || value?.to ? "range-set" : "range-empty"
  return (
    <Calendar
      key={selectionKey}
      mode="range"
      selected={value}
      // The span highlight is driven by the shared `value`; selection itself is
      // handled per-endpoint via onDayClick (so a click in this pane sets only
      // its own From/To), hence the no-op onSelect.
      onSelect={() => {}}
      onDayClick={(day) => onPick(day)}
      month={month}
      onMonthChange={onMonthChange}
      startMonth={minDate}
      endMonth={maxDate}
      // Cross-pane From/To limit + no-future cap (computed per pane above).
      disabled={disabled}
      numberOfMonths={1}
      // Only render days that belong to the displayed month — no leading/
      // trailing days from the previous/next month filling the grid.
      showOutsideDays={false}
      // No autofocus on open — otherwise react-day-picker focuses the
      // previously-selected day and paints a focus ring around it, which reads
      // as an unwanted "border" on that date. The ring still shows on real
      // keyboard interaction.
      className={cn(PANE_WIDTH)}
      components={{
        // Turn this pane's "June 2026" caption into a button that drills into
        // its own year grid. `children` is react-day-picker's label for the
        // pane's displayed month.
        CaptionLabel: ({ children }: { children?: ReactNode }) => (
          <CaptionDrillButton onClick={openYears}>{children}</CaptionDrillButton>
        ),
      }}
    />
  )
}

// Styled hover tooltip with the full selected range (the trigger truncates it).
// Hidden while the calendar popover is open.
function DateRangeTooltip({
  text,
  suppress,
  children,
}: {
  text: string
  suppress: boolean
  children: ReactNode
}) {
  return (
    <TooltipProvider delay={150}>
      <Tooltip disabled={suppress}>
        <TooltipTrigger render={<span className="block w-full" />}>{children}</TooltipTrigger>
        <TooltipContent>{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
