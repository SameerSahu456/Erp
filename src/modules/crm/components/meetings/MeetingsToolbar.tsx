import { Input } from "@/components/ui/input"
import { UI } from "@/shared/constants"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DateRangePicker,
  type DateRange,
} from "@/components/common/pickers/DateRangePicker"

import {
  MEETING_STATUS_LABELS,
  MEETING_STATUSES,
  MEETING_TYPE_LABELS,
  MEETING_TYPES,
} from "../../constants/meeting-labels"
import { MEETINGS_STRINGS } from "./meetings.strings"

interface MeetingsToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  statusFilter: string
  onStatusChange: (value: string) => void
  typeFilter: string
  onTypeChange: (value: string) => void
  dateRange: DateRange | undefined
  onDateRangeChange: (value: DateRange | undefined) => void
}

export function MeetingsToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  typeFilter,
  onTypeChange,
  dateRange,
  onDateRangeChange,
}: MeetingsToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        placeholder={MEETINGS_STRINGS.toolbar.searchPlaceholder}
        maxLength={UI.FILTER_SEARCH_MAX_LENGTH}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-64"
      />
      <Select value={statusFilter} onValueChange={(v) => v != null && onStatusChange(v)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder={MEETINGS_STRINGS.toolbar.statusPlaceholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{MEETINGS_STRINGS.toolbar.allStatus}</SelectItem>
          {MEETING_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {MEETING_STATUS_LABELS[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={typeFilter} onValueChange={(v) => v != null && onTypeChange(v)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder={MEETINGS_STRINGS.toolbar.typePlaceholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{MEETINGS_STRINGS.toolbar.allTypes}</SelectItem>
          {MEETING_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              {MEETING_TYPE_LABELS[type]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {/* Backend filters `meeting_date` (the scheduled date), not created_at —
          hence the "Meeting Date" label. */}
      <div className="w-[230px]">
        <DateRangePicker
          value={dateRange}
          onChange={onDateRangeChange}
          placeholder="Meeting Date"
        />
      </div>
    </div>
  )
}
