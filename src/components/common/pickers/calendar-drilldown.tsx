import { type ReactNode } from "react"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// ---------------------------------------------------------------------------
// Shared drill-down calendar primitives — the year grid → month grid building
// blocks used by BOTH the single `DatePicker` and the `DateRangePicker`, so the
// year/month selection UX is identical across every date field in the app
// (12 years per page with ◀ ▶ paging — never a cramped native <select>).
// Years/months come from a window derived from today (see each picker's
// `minDate`/`maxDate`), so nothing is hardcoded.
// ---------------------------------------------------------------------------

export const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const

export const YEARS_PER_PAGE = 12

// Width of a single month pane, so swapping a pane between its day grid and its
// year/month grid never resizes (and reflows) the popover.
export const PANE_WIDTH = "w-[248px]"

export type StepView = "day" | "month" | "year"

export function clampMonth(date: Date, min: Date, max: Date): Date {
  if (date < min) return new Date(min.getFullYear(), min.getMonth(), 1)
  if (date > max) return new Date(max.getFullYear(), max.getMonth(), 1)
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

// Start of the 12-year page containing `year`, aligned to the `minYear` grid so
// the first page always begins at the earliest selectable year.
export function yearPageStart(year: number, minYear: number): number {
  const offset = Math.max(0, Math.floor((year - minYear) / YEARS_PER_PAGE))
  return minYear + offset * YEARS_PER_PAGE
}

export function GridHeader({
  label,
  onLabelClick,
  onPrev,
  onNext,
}: {
  label: string
  onLabelClick?: () => void
  onPrev?: () => void
  onNext?: () => void
}) {
  return (
    <div className="flex items-center justify-between">
      {onPrev ? (
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={onPrev}
          aria-label="Previous"
        >
          <ChevronLeftIcon className="size-4" />
        </Button>
      ) : (
        <span className="size-7" aria-hidden />
      )}
      {onLabelClick ? (
        <button
          type="button"
          onClick={onLabelClick}
          className="rounded-[6px] px-2 py-1 font-medium hover:bg-muted"
        >
          {label}
        </button>
      ) : (
        <span className="px-2 py-1 font-medium">{label}</span>
      )}
      {onNext ? (
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={onNext}
          aria-label="Next"
        >
          <ChevronRightIcon className="size-4" />
        </Button>
      ) : (
        <span className="size-7" aria-hidden />
      )}
    </div>
  )
}

export function GridCell({
  children,
  selected,
  today,
  disabled,
  onClick,
}: {
  children: ReactNode
  selected?: boolean
  today?: boolean
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <Button
      type="button"
      variant={selected ? "default" : "ghost"}
      size="sm"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "h-9 w-full font-normal",
        !selected && today && "border border-primary text-primary",
      )}
    >
      {children}
    </Button>
  )
}

// Turns a react-day-picker month caption ("June 2026") into a button that drills
// into the year grid. `children` is rdp's label for the displayed month.
export function CaptionDrillButton({
  children,
  onClick,
}: {
  children?: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center justify-center gap-1 rounded-[6px] px-2 py-1 font-medium hover:bg-muted"
    >
      {children}
      <ChevronDownIcon className="size-3.5 opacity-60" />
    </button>
  )
}

// ---- Year grid (12 per page, paged with ◀ ▶) -----------------------------
export function YearGridView({
  displayMonth,
  minYear,
  maxYear,
  yearPage,
  setYearPage,
  onPickYear,
}: {
  displayMonth: Date
  minYear: number
  maxYear: number
  yearPage: number
  setYearPage: (updater: (prev: number) => number) => void
  onPickYear: (year: number) => void
}) {
  const pageEnd = Math.min(yearPage + YEARS_PER_PAGE - 1, maxYear)
  const years: number[] = []
  for (let y = yearPage; y <= pageEnd; y++) years.push(y)
  // Paging arrows only render when there's an adjacent page to move to — with
  // the default 12-year window every year fits on one page, so no dead arrows.
  const canPrev = yearPage > minYear
  const canNext = pageEnd < maxYear
  const now = new Date()
  return (
    <div className={cn(PANE_WIDTH, "p-2")}>
      <GridHeader
        label={`${years[0]} – ${years[years.length - 1]}`}
        onPrev={canPrev ? () => setYearPage((p) => p - YEARS_PER_PAGE) : undefined}
        onNext={canNext ? () => setYearPage((p) => p + YEARS_PER_PAGE) : undefined}
      />
      <div className="mt-3 grid grid-cols-3 gap-2">
        {years.map((year) => (
          <GridCell
            key={year}
            selected={year === displayMonth.getFullYear()}
            today={year === now.getFullYear()}
            onClick={() => onPickYear(year)}
          >
            {year}
          </GridCell>
        ))}
      </div>
    </div>
  )
}

// ---- Month grid ----------------------------------------------------------
export function MonthGridView({
  displayMonth,
  minDate,
  maxDate,
  minYear,
  maxYear,
  onMonthChange,
  onPickMonth,
  openYears,
}: {
  displayMonth: Date
  minDate: Date
  maxDate: Date
  minYear: number
  maxYear: number
  onMonthChange: (next: Date) => void
  onPickMonth: (monthIndex: number) => void
  openYears: () => void
}) {
  const year = displayMonth.getFullYear()
  const now = new Date()
  const firstSelectable = new Date(minDate.getFullYear(), minDate.getMonth(), 1)
  const lastSelectable = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1)
  return (
    <div className={cn(PANE_WIDTH, "p-2")}>
      <GridHeader
        label={String(year)}
        onLabelClick={openYears}
        onPrev={year > minYear ? () => onMonthChange(new Date(year - 1, displayMonth.getMonth(), 1)) : undefined}
        onNext={year < maxYear ? () => onMonthChange(new Date(year + 1, displayMonth.getMonth(), 1)) : undefined}
      />
      <div className="mt-3 grid grid-cols-3 gap-2">
        {MONTHS.map((name, idx) => {
          const cell = new Date(year, idx, 1)
          return (
            <GridCell
              key={name}
              selected={idx === displayMonth.getMonth()}
              today={year === now.getFullYear() && idx === now.getMonth()}
              disabled={cell < firstSelectable || cell > lastSelectable}
              onClick={() => onPickMonth(idx)}
            >
              {name}
            </GridCell>
          )
        })}
      </div>
    </div>
  )
}
