import { DateRangePicker, type DateRange } from "@/components/common/pickers/DateRangePicker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { ChipTooltip } from "./ChipTooltip"
import { AsyncUserMultiSelect } from "./AsyncUserMultiSelect"

const ALL = "__all__"

interface CrmBoardToolbarFiltersProps {
  createdOn: {
    label: string
    value: DateRange | undefined
    onChange: (next: DateRange | undefined) => void
  }
  orderType: {
    label: string
    allLabel: string
    /** `"__all__"` = no filter (mirrors the URL sentinel). */
    value: string
    options: readonly string[]
    onChange: (next: string) => void
  }
  assignee: {
    label: string
    placeholder: string
    value: string[]
    onChange: (next: string[]) => void
    disabled?: boolean
  }
}

// The three primary Leads / Deals narrowings that sit on the main toolbar
// beside the search box + Filters button: Created On, Order Type and
// Assigned To / Owner. Everything else lives in the Filters aside.
export function CrmBoardToolbarFilters({ createdOn, orderType, assignee }: CrmBoardToolbarFiltersProps) {
  return (
    <>
      <div className="w-[190px]">
        <DateRangePicker
          value={createdOn.value}
          onChange={createdOn.onChange}
          placeholder={createdOn.label}
          className="h-9"
        />
      </div>
      <div className="w-[140px]">
      <ChipTooltip label={orderType.label} value={orderType.value === ALL ? undefined : orderType.value}>
      <Select value={orderType.value} onValueChange={(v) => v && orderType.onChange(v)}>
        <SelectTrigger
          className="h-9 data-[size=default]:h-9 w-full"
          clearable={orderType.value !== ALL}
          onClear={() => orderType.onChange(ALL)}
        >
          <SelectValue>{orderType.value === ALL ? orderType.label : orderType.value}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{orderType.allLabel}</SelectItem>
          {orderType.options.map((tag) => (
            <SelectItem key={tag} value={tag}>
              {tag}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      </ChipTooltip>
      </div>
      <div className="w-[150px]">
        <AsyncUserMultiSelect
          value={assignee.value}
          onValueChange={assignee.onChange}
          label={assignee.label}
          placeholder={assignee.placeholder}
          className="h-9"
          disabled={assignee.disabled}
        />
      </div>
    </>
  )
}
