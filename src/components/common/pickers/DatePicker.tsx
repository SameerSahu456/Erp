import { useMemo, useState, type ReactNode } from "react"
import { CalendarIcon, XIcon } from "lucide-react"
import type { Matcher } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { formatDateLabel, toDateParam } from "@/shared/lib/date"
import {
  CaptionDrillButton,
  clampMonth,
  MonthGridView,
  PANE_WIDTH,
  type StepView,
  YearGridView,
  yearPageStart,
} from "./calendar-drilldown"

export interface DatePickerProps {
  /** Selected day as a `YYYY-MM-DD` string. `""` means nothing picked — the
   *  same value contract the native `<input type="date">` used, so existing
   *  string-based validation (e.g. `date < today`) keeps working unchanged. */
  value: string
  /** Fires with the new `YYYY-MM-DD` string, or `""` when cleared. */
  onChange: (value: string) => void
  /** Earliest selectable day (`YYYY-MM-DD`) — mirrors the native `min` attr. */
  min?: string
  /** Latest selectable day (`YYYY-MM-DD`) — mirrors the native `max` attr. */
  max?: string
  placeholder?: string
  /** Show the inline clear "X" once a value is set. */
  clearable?: boolean
  disabled?: boolean
  id?: string
  className?: string
  tabIndex?: number
  "aria-invalid"?: boolean
  "aria-describedby"?: string
}

// Parse a `YYYY-MM-DD` string into a LOCAL-calendar Date (midnight). Local on
// purpose — the value is a day the user picked, not a UTC instant, matching
// `toDateParam`'s local-components serialization (see shared/lib/date).
function parseYmd(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return undefined
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(d.getTime()) ? undefined : d
}

// Single-date picker: the standard form date field across the app. Composes the
// shadcn `ui/calendar` (single mode, month+year dropdowns) inside a `ui/popover`,
// with the trigger geometry matching DateRangePicker / AsyncSelect token-for-
// token (h-10, rounded-[7px], border-input, bg-card, shadow-xs) so every date
// field reads as the same family. All colors come from semantic tokens.
export function DatePicker({
  value,
  onChange,
  min,
  max,
  placeholder = "Select date",
  clearable = true,
  disabled,
  id,
  className,
  tabIndex,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedby,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)

  const selected = useMemo(() => parseYmd(value), [value])
  const minDate = useMemo(() => parseYmd(min), [min])
  const maxDate = useMemo(() => parseYmd(max), [max])

  // Navigation window: min/max when given, else 50 years back → 20 forward from
  // today, so the year grid never renders a hardcoded list (the bounds shift
  // with the calendar year — they're offsets from today, not fixed years).
  const [navStart, navEnd] = useMemo(() => {
    const year = new Date().getFullYear()
    return [
      minDate ?? new Date(year - 50, 0, 1),
      maxDate ?? new Date(year + 20, 11, 31),
    ] as const
  }, [minDate, maxDate])

  // Block days outside [min, max] so the picker enforces the same bounds the
  // native `min`/`max` attributes did.
  const disabledMatcher = useMemo<Matcher[] | undefined>(() => {
    const rules: Matcher[] = []
    if (minDate) rules.push({ before: minDate })
    if (maxDate) rules.push({ after: maxDate })
    return rules.length ? rules : undefined
  }, [minDate, maxDate])

  const hasValue = Boolean(selected)
  const label = selected ? formatDateLabel(selected) : placeholder

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        if (disabled) return
        setOpen(o)
      }}
    >
      <PopoverTrigger
        id={id}
        data-slot="date-picker-trigger"
        disabled={disabled}
        tabIndex={tabIndex}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedby}
        className={cn(
          "group/date-picker-trigger flex h-10 w-full items-center justify-between rounded-[7px] border border-input bg-card px-[10px] text-[13.5px] shadow-xs",
          "transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
          !disabled && "cursor-pointer",
          !hasValue && "text-muted-foreground",
          open && "border-primary",
          className,
        )}
        title={label}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <CalendarIcon className="size-4 shrink-0 opacity-60" />
          <span className="min-w-0 flex-1 truncate">{label}</span>
        </span>
        {clearable && hasValue && !disabled && (
          <span
            role="button"
            aria-label="Clear date"
            className="ml-2 shrink-0 rounded p-0.5 opacity-50 hover:bg-muted hover:opacity-100"
            // Base UI's Popover.Trigger opens on pointerdown, so stop the
            // pointer/mouse events too — clearing must not reopen the popover.
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
              onChange("")
            }}
          >
            <XIcon className="size-3.5" />
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent align="start" className="w-auto p-0">
        <StepSingleCalendar
          selected={selected}
          onSelect={(day) => {
            onChange(day ? toDateParam(day) : "")
            if (day) setOpen(false)
          }}
          minDate={navStart}
          maxDate={navEnd}
          disabledMatcher={disabledMatcher}
        />
      </PopoverContent>
    </Popover>
  )
}

// Single-date drill-down calendar: day grid → click the caption → year grid →
// pick a year → month grid → pick a month → back to the day grid. Mirrors the
// DateRangePicker's year/month drill-down (same shared primitives) so every
// date field across the app picks years the same way.
function StepSingleCalendar({
  selected,
  onSelect,
  minDate,
  maxDate,
  disabledMatcher,
}: {
  selected: Date | undefined
  onSelect: (day: Date | undefined) => void
  minDate: Date
  maxDate: Date
  disabledMatcher: Matcher[] | undefined
}) {
  const minYear = minDate.getFullYear()
  const maxYear = maxDate.getFullYear()

  const [month, setMonth] = useState<Date>(() =>
    clampMonth(selected ?? new Date(), minDate, maxDate),
  )
  const [view, setView] = useState<StepView>("day")
  const [yearPage, setYearPage] = useState<number>(() =>
    yearPageStart(month.getFullYear(), minYear),
  )

  const handleMonthChange = (next: Date) =>
    setMonth(clampMonth(next, minDate, maxDate))

  const openYears = () => {
    setYearPage(yearPageStart(month.getFullYear(), minYear))
    setView("year")
  }

  const pickYear = (year: number) => {
    handleMonthChange(new Date(year, month.getMonth(), 1))
    setView("month")
  }

  const pickMonth = (m: number) => {
    handleMonthChange(new Date(month.getFullYear(), m, 1))
    setView("day")
  }

  if (view === "year") {
    return (
      <div className="p-3">
        <YearGridView
          displayMonth={month}
          minYear={minYear}
          maxYear={maxYear}
          yearPage={yearPage}
          setYearPage={setYearPage}
          onPickYear={pickYear}
        />
      </div>
    )
  }

  if (view === "month") {
    return (
      <div className="p-3">
        <MonthGridView
          displayMonth={month}
          minDate={minDate}
          maxDate={maxDate}
          minYear={minYear}
          maxYear={maxYear}
          onMonthChange={handleMonthChange}
          onPickMonth={pickMonth}
          openYears={openYears}
        />
      </div>
    )
  }

  return (
    <Calendar
      mode="single"
      selected={selected}
      onSelect={onSelect}
      month={month}
      onMonthChange={handleMonthChange}
      startMonth={minDate}
      endMonth={maxDate}
      disabled={disabledMatcher}
      // Only the days that belong to the month on screen. The leading and
      // trailing cells from the neighbouring months read as selectable
      // when they are not the month you are looking at, and on a picker
      // that also DISABLES days (a rate that may only start at a tenure
      // boundary, say) two greyed-out reasons in one grid are one too
      // many. Blank is unambiguous.
      showOutsideDays={false}
      numberOfMonths={1}
      // No autofocus on open, same as DateRangePicker — otherwise
      // react-day-picker focuses the selected day (or today) and paints a
      // focus ring that reads as a stray border, so a single date field and
      // a range field opened side by side looked different. The ring still
      // shows on real keyboard interaction.
      className={cn(PANE_WIDTH, "p-3")}
      components={{
        CaptionLabel: ({ children }: { children?: ReactNode }) => (
          <CaptionDrillButton onClick={openYears}>{children}</CaptionDrillButton>
        ),
      }}
    />
  )
}
