import * as React from "react"

import {
  AsyncSelect,
  makeStaticAsyncOptions,
  type AsyncSelectOption,
} from "@/components/ui/async-select"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DATE_RANGE_TOOLBAR_WIDTH,
  DateRangePicker,
  type DateRange,
} from "@/components/common/pickers/DateRangePicker"

import { ChipTooltip } from "../ChipTooltip"
import type { ToolbarDateRangeFilter, ToolbarSelectFilter } from "./types"

/** Column-independent toolbar filter dropdown (server-backed filters with no
 *  1:1 visible column). Plain `<Select>` — no search. */
export function CrmToolbarFilterSelect({
  filter,
  onChange,
}: {
  filter: ToolbarSelectFilter
  onChange?: (key: string, value: string) => void
}) {
  const allText = filter.allLabel ?? `All ${filter.label}`
  const hasValue = !!filter.value && filter.value !== "__all__" && filter.value !== ""
  const selected = filter.options.find((option) => option.value === filter.value)

  return (
    <div className="w-[170px]">
    <ChipTooltip label={filter.label} value={hasValue ? (selected?.label ?? filter.value) : undefined}>
    <Select
      value={filter.value || "__all__"}
      onValueChange={(next) => onChange?.(filter.key, next && next !== "__all__" ? next : "")}
    >
      <SelectTrigger
        size="sm"
        // Fixed width keeps every toolbar chip the same size so the filter row
        // never overflows (a growing trigger pushes the row past the card =
        // horizontal scroll). A long selected value truncates with "…" inside
        // the trigger (see SelectValue min-w-0); the full text is still
        // readable in the open dropdown, which widens to fit (SelectContent).
        className="w-full"
        clearable={hasValue}
        onClear={() => onChange?.(filter.key, "")}
      >
        <SelectValue>
          {/* Wrapped in a truncating span: the value element is display:flex
              (icon+label support), which kills the trigger's line-clamp, so a
              long label hard-cuts. A flex-child span with `truncate` + min-w-0
              restores the "…" ellipsis. */}
          <span
            className="min-w-0 flex-1 truncate"
          >
            {hasValue ? (selected?.label ?? filter.value) : allText}
          </span>
        </SelectValue>
      </SelectTrigger>
      {/* w-fit lets the popup widen to its longest option (vs. the trigger's
          fixed anchor width). hideIndicator drops the check icon — selection
          is shown by the row highlight, and the check otherwise overlaps the
          last characters of long labels like "Cloud / Data Center". */}
      <SelectContent className="w-fit min-w-(--anchor-width)">
        <SelectItem value="__all__" hideIndicator>
          {allText}
        </SelectItem>
        {filter.options.map((option) => (
          <SelectItem key={option.value} value={option.value} hideIndicator>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    </ChipTooltip>
    </div>
  )
}

/** Column-independent date-range toolbar chip — renders the shared
 *  DateRangePicker at a fixed toolbar width so the filter row never overflows
 *  (§8.7). Emits the picked range (or `undefined` on clear) via `onChange`. */
export function CrmToolbarDateRange({
  filter,
  onChange,
}: {
  filter: ToolbarDateRangeFilter
  onChange?: (key: string, range: DateRange | undefined) => void
}) {
  return (
    // Shared toolbar date-chip width (same as the BusinessMetricsTable date
    // filter) — wide enough to show a full "from – to" range; the calendar
    // popover is w-auto regardless.
    <div className={DATE_RANGE_TOOLBAR_WIDTH}>
      <DateRangePicker
        value={filter.value}
        onChange={(range) => onChange?.(filter.key, range)}
        placeholder={filter.placeholder ?? `All ${filter.label}`}
        disableFuture={filter.disableFuture}
        // Same commit rule as the BusinessMetricsTable date filter: the range
        // applies once the end is picked, and closing with only a start
        // applies "start – today" (the trigger says so).
        commitOnComplete
        // Match the size="sm" select-chip trigger geometry (h-8 / rounded-[5px])
        // so the toolbar row stays aligned across every CRM list page.
        className="h-8 rounded-[5px] text-[13px]"
      />
    </div>
  )
}

/** Searchable / async-styled column filter chip — used for API-backed option
 *  lists or when `useAsyncFilterDropdowns` is set. */
export function FilterChipDropdown({
  label,
  options,
  value,
  onChange,
  searchable,
}: {
  label: string
  options: string[]
  value?: string
  onChange: (next: string) => void
  searchable: boolean
}) {
  const normalized = React.useMemo(() => options.map((opt) => ({ id: opt, name: opt })), [options])
  const useOptions = React.useMemo(
    () => makeStaticAsyncOptions(normalized, (o) => o.name),
    [normalized],
  )
  const selected: AsyncSelectOption | null = value ? { id: value, label: value } : null

  return (
    <div className="w-[190px]">
      <ChipTooltip label={label} value={value}>
      <AsyncSelect
        value={selected}
        onValueChange={(next) => onChange(next?.id ?? "__all__")}
        useOptions={useOptions}
        toLabel={(o) => o.name}
        placeholder={`All ${label}`}
        allOption={`All ${label}`}
        searchPlaceholder={`Search ${label}...`}
        searchable={searchable}
        className="h-9 rounded-[7px] border-input bg-card px-[10px] text-[13px] text-foreground shadow-xs"
        // X clear when a value is picked. Resets to "__all__" so the parent's
        // onChange treats it as no filter.
        clearable
        chevron="down"
      />
      </ChipTooltip>
    </div>
  )
}
