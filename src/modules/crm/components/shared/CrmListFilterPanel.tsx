
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Typography } from "@/components/ui/typography"
import {
  DateRangePicker,
  type DateRange,
} from "@/components/common/pickers/DateRangePicker"
import { ValueRangeInput, type ValueRange } from "@/components/common/pickers/ValueRangeInput"

import { AsyncUserMultiSelect } from "./AsyncUserMultiSelect"
import { CategoryFilterSelect, OemFilterSelect } from "./CategoryOemFilterSelects"
import { EnumMultiSelect } from "./EnumMultiSelect"
import { CRM_SHARED_STRINGS } from "./crm-shared.strings"

const ALL = "__all__"

export interface CrmListFilterSelect {
  key: string
  label: string
  allLabel: string
  /** "" = nothing selected. */
  value: string
  options: { value: string; label: string }[]
  onChange: (next: string) => void
}

/** A single on/off narrowing ("Has access", …) rendered as a labelled
 *  checkbox. Unchecked = no filter. */
export interface CrmListFilterCheckbox {
  key: string
  label: string
  checked: boolean
  onChange: (next: boolean) => void
}

export interface CrmListFilterCreatedBy {
  label: string
  value: string[]
  onChange: (next: string[]) => void
}

/** Multi-select user filter rendered in the aside (API-backed infinite scroll).
 *  Same shape as `createdBy` — the aside can host several of these. Pass one
 *  per narrowing (Created By, Submitted By, Approver, …). */
export interface CrmListFilterUserMultiSelect {
  key: string
  label: string
  value: string[]
  onChange: (next: string[]) => void
}

/** Multi-select enum/options filter — ticks a known allow-list (channel,
 *  priority, …). The aside stacks a checkbox list; selecting toggles the
 *  value in / out of the array. */
export interface CrmListFilterEnumMultiSelect {
  key: string
  label: string
  value: string[]
  options: { value: string; label: string }[]
  onChange: (next: string[]) => void
}

/** Date-range filter rendered in the aside (vs. the toolbar). Used for ranges
 *  that aren't the primary "Created Date" chip — e.g. Submitted Date. */
export interface CrmListFilterDateRange {
  key: string
  label: string
  value: DateRange | undefined
  onChange: (next: DateRange | undefined) => void
}

/** Category + OEM multi-selects (IMS ids). For lists whose rows carry LINE
 *  ITEMS (quotes, sales orders): a row matches when a line item has the picked
 *  category and/or OEM. */
export interface CrmListFilterCategoryOem {
  categories: string[]
  onCategoriesChange: (next: string[]) => void
  oems: string[]
  onOemsChange: (next: string[]) => void
}

/** Min / Max money range (e.g. a quote's or order's grand total). */
export interface CrmListFilterValueRange {
  label: string
  value: ValueRange | undefined
  onChange: (next: ValueRange | undefined) => void
}

interface CrmListFilterPanelProps {
  selects: CrmListFilterSelect[]
  /** Omit when the list has no "created by" narrowing (e.g. Accounts). */
  createdBy?: CrmListFilterCreatedBy
  /** Render Created By above the single-selects instead of below them. */
  createdByFirst?: boolean
  activeFilterCount: number
  onResetAll: () => void
  /** Additional user multi-selects stacked below Created By (same visual). */
  userMultiSelects?: CrmListFilterUserMultiSelect[]
  /** Enum / allow-list multi-selects rendered as a checkbox list. */
  enumMultiSelects?: CrmListFilterEnumMultiSelect[]
  /** Secondary date-range filters (primary Created Date stays in the toolbar). */
  dateRanges?: CrmListFilterDateRange[]
  /** Category + OEM line-item filters, rendered after the enum multi-selects. */
  categoryOem?: CrmListFilterCategoryOem
  /** Total range, rendered after the date ranges. */
  valueRange?: CrmListFilterValueRange
  /** On/off narrowings, rendered last as a stack of checkboxes. */
  checkboxes?: CrmListFilterCheckbox[]
}

// Generic side-panel body for table-based CRM lists (quotes, sales orders) —
// same field layout as LeadsFilterPanel: a bold label over a full-width
// control, then a "Clear all" button once anything is active. The Created Date
// range is NOT here; it stays in the table toolbar.
export function CrmListFilterPanel({
  selects,
  createdBy,
  createdByFirst,
  activeFilterCount,
  onResetAll,
  userMultiSelects,
  enumMultiSelects,
  dateRanges,
  categoryOem,
  valueRange,
  checkboxes,
}: CrmListFilterPanelProps) {
  const createdByField = createdBy && (
    <div>
      <Typography variant="body-strong" className="mb-1.5 block" asChild>
        <label>{createdBy.label}</label>
      </Typography>
      <AsyncUserMultiSelect
        value={createdBy.value}
        onValueChange={createdBy.onChange}
        label={createdBy.label}
        placeholder={createdBy.label}
        className="w-full"
      />
    </div>
  )

  return (
    <div className="space-y-4">
      {createdByFirst && createdByField}
      {selects.map((f) => {
        const selected = f.options.find((o) => o.value === f.value)
        return (
          <div key={f.key}>
            <Typography variant="body-strong" className="mb-1.5 block" asChild>
              <label>{f.label}</label>
            </Typography>
            <Select value={f.value || ALL} onValueChange={(v) => f.onChange(!v || v === ALL ? "" : v)}>
              <SelectTrigger
                className="w-full"
                clearable={Boolean(f.value)}
                onClear={() => f.onChange("")}
              >
                <SelectValue>{selected ? selected.label : f.allLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{f.allLabel}</SelectItem>
                {f.options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
      })}

      {!createdByFirst && createdByField}

      {(userMultiSelects ?? []).map((f) => (
        <div key={f.key}>
          <Typography variant="body-strong" className="mb-1.5 block" asChild>
            <label>{f.label}</label>
          </Typography>
          <AsyncUserMultiSelect
            value={f.value}
            onValueChange={f.onChange}
            label={f.label}
            placeholder={f.label}
            className="w-full"
          />
        </div>
      ))}

      {(enumMultiSelects ?? []).map((f) => (
        <EnumMultiSelectField key={f.key} filter={f} />
      ))}

      {categoryOem && (
        <>
          <div>
            <Typography variant="body-strong" className="mb-1.5 block" asChild>
              <label>{CRM_SHARED_STRINGS.filterAside.category}</label>
            </Typography>
            <CategoryFilterSelect
              value={categoryOem.categories}
              onChange={categoryOem.onCategoriesChange}
              label={CRM_SHARED_STRINGS.filterAside.category}
              placeholder={CRM_SHARED_STRINGS.filterAside.allCategories}
            />
          </div>
          <div>
            <Typography variant="body-strong" className="mb-1.5 block" asChild>
              <label>{CRM_SHARED_STRINGS.filterAside.oem}</label>
            </Typography>
            <OemFilterSelect
              value={categoryOem.oems}
              onChange={categoryOem.onOemsChange}
              label={CRM_SHARED_STRINGS.filterAside.oem}
              placeholder={CRM_SHARED_STRINGS.filterAside.allOems}
            />
          </div>
        </>
      )}

      {(dateRanges ?? []).map((f) => (
        <div key={f.key}>
          <Typography variant="body-strong" className="mb-1.5 block" asChild>
            <label>{f.label}</label>
          </Typography>
          <DateRangePicker
            value={f.value}
            onChange={f.onChange}
            placeholder={f.label}
            className="w-full"
          />
        </div>
      ))}

      {valueRange && (
        <div>
          <Typography variant="body-strong" className="mb-1.5 block" asChild>
            <label>{valueRange.label}</label>
          </Typography>
          <ValueRangeInput
            value={valueRange.value}
            onChange={valueRange.onChange}
            minPlaceholder={CRM_SHARED_STRINGS.filterAside.totalMin}
            maxPlaceholder={CRM_SHARED_STRINGS.filterAside.totalMax}
            prefix={CRM_SHARED_STRINGS.filterAside.totalPrefix}
            decimals={2}
            maxDigits={14}
            ariaLabel={valueRange.label}
            invalidRangeMessage={CRM_SHARED_STRINGS.filterAside.totalRangeError}
          />
        </div>
      )}

      {checkboxes && checkboxes.length > 0 && (
        <div className="space-y-2">
          {checkboxes.map((c) => (
            <label key={c.key} className="flex cursor-pointer select-none items-center gap-2">
              <Checkbox
                checked={c.checked}
                onCheckedChange={(checked) => c.onChange(checked === true)}
              />
              <Typography variant="body">{c.label}</Typography>
            </label>
          ))}
        </div>
      )}

      {/* Clear all moved beside the Filters button in the toolbar (CrmFiltersButton).
      {activeFilterCount > 0 && (
        <CrmFilterAsideClearAll onClick={onResetAll}>{CRM_SHARED_STRINGS.filterAside.clearAll}</CrmFilterAsideClearAll>
      )}
      */}
    </div>
  )
}

// Static-enum multi-select field: label above the shared EnumMultiSelect.
function EnumMultiSelectField({ filter }: { filter: CrmListFilterEnumMultiSelect }) {
  return (
    <div>
      <Typography variant="body-strong" className="mb-1.5 block" asChild>
        <label>{filter.label}</label>
      </Typography>
      <EnumMultiSelect
        label={filter.label}
        value={filter.value}
        options={filter.options}
        onChange={filter.onChange}
        className="w-full"
      />
    </div>
  )
}
