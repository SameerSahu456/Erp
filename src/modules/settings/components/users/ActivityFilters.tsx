import { Button } from "@/components/ui/button"
import {
  DateRangePicker,
  type DateRange,
} from "@/components/common/pickers/DateRangePicker"

import { USER_ACTIVITY_STRINGS as S } from "./user-activity.strings"
import { FILTER_CONFIG } from "./user-activity.config"
import { type FilterKey } from "./user-activity.types"

interface ActivityFiltersProps {
  activeFilter: FilterKey
  onFilterChange: (next: FilterKey) => void
  dateRange: DateRange | undefined
  onDateChange: (next: DateRange | undefined) => void
  /** Stack date field above the tab chips (narrow sidebar sheet). */
  stackFilters?: boolean
}

/**
 * Timeline filter row: the backend-honest tab chips and a compact created-date
 * range picker. Sidebar (`stackFilters`) puts the date on its own row above the
 * chips; the detail page keeps chips left with the date pushed to the right.
 */
export function ActivityFilters({
  activeFilter,
  onFilterChange,
  dateRange,
  onDateChange,
  stackFilters = false,
}: ActivityFiltersProps) {
  const tabChips = (
    <div className="flex flex-wrap items-center gap-2">
      {(Object.keys(FILTER_CONFIG) as FilterKey[]).map((key) => (
        <Button
          key={key}
          variant={activeFilter === key ? "default" : "secondary"}
          size="sm"
          // Reset to page 1 on filter change (pager mode); scroll mode
          // refetches from page 1 automatically via the tab queryKey.
          onClick={() => onFilterChange(key)}
        >
          {FILTER_CONFIG[key].label}
        </Button>
      ))}
    </div>
  )

  // Compact toolbar-style date range — mirrors the CRM accounts table
  // (h-9/text-[13px]) so it reads as a small input, not a full-size field.
  const dateField = (
    <DateRangePicker
      value={dateRange}
      // New date window → always restart at page 1 (pager mode); scroll mode
      // refetches from page 1 via the from/to queryKey.
      onChange={onDateChange}
      placeholder={S.dateFilter.placeholder}
      className="h-9 text-[13px]"
    />
  )

  if (stackFilters) {
    return (
      <div className="space-y-2">
        {dateField}
        {tabChips}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tabChips}
      <div className="ml-auto w-[230px]">{dateField}</div>
    </div>
  )
}
