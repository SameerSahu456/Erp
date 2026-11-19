import type { ReactNode } from "react"
import { Search, X } from "lucide-react"

import { DateRangePicker, type DateRange } from "@/components/common/pickers/DateRangePicker"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UI } from "@/shared/constants"
import { useMirroredValue } from "@/shared/hooks"

import { ChipTooltip } from "./ChipTooltip"
import { CrmClearAllButton } from "./CrmClearAllButton"
import { CrmFiltersButton } from "./CrmFiltersButton"
import { CRM_SHARED_STRINGS } from "./crm-shared.strings"
import { EnumMultiSelect } from "./EnumMultiSelect"

const S = CRM_SHARED_STRINGS.embeddedToolbar

// One search-and-filter bar for every embedded list tab on a detail page — the
// Deals tab (Account) and the Quotes / Sales Orders tabs (Account, Lead, Deal).
// Each tab keeps its own filter STATE (and sends it to its own endpoint); this
// component is only the shared chrome: a search box capped at the same
// `UI.FILTER_SEARCH_MAX_LENGTH` as every other filter search, the filter chips
// passed as `children`, and a "Clear filters" button while anything is applied.
interface EmbeddedListToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  searchPlaceholder: string
  /** Sidebar toggle — pass all three to show the "Filters (n)" button right after the
   *  search box (the sidebar itself comes from `EmbeddedFilterLayout`). */
  asideOpen?: boolean
  onToggleAside?: () => void
  asideActiveCount?: number
  /** Clears every sidebar filter; shown after the last filter chip while any is active. */
  onClearAside?: () => void
  /** Right-aligned actions on the toolbar row (e.g. "Create Quote"). */
  actions?: ReactNode
  /** The filter chips — use the `Embedded*Filter` helpers below. */
  children?: ReactNode
}

export function EmbeddedListToolbar({
  search,
  onSearchChange,
  searchPlaceholder,
  asideOpen = false,
  onToggleAside,
  asideActiveCount = 0,
  onClearAside,
  actions,
  children,
}: EmbeddedListToolbarProps) {
  // Caret-safe typing: the box runs on local state and pushes changes up, so a
  // controlled-from-parent value never bounces the caret mid-string.
  const [searchText, onSearchType] = useMirroredValue(search, onSearchChange)
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[220px] max-w-sm flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/70" />
        <Input
          autoComplete="off"
          placeholder={searchPlaceholder}
          maxLength={UI.FILTER_SEARCH_MAX_LENGTH}
          value={searchText}
          onChange={(e) => onSearchType(e.target.value)}
          className="crm-list-search h-9 pl-9 pr-8 text-[13px] shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.04)]"
        />
        {searchText && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            onClick={() => onSearchType("")}
            aria-label={S.clearSearch}
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      {onToggleAside && (
        <CrmFiltersButton open={asideOpen} onToggle={onToggleAside} activeFilterCount={asideActiveCount} />
      )}
      {children}
      {onClearAside && asideActiveCount > 0 && <CrmClearAllButton onClick={onClearAside} />}
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </div>
  )
}

// ── Filter chips ────────────────────────────────────────────────────────────
// All chips share one width and the toolbar's h-9 height so the row lines up.

export function EmbeddedDateRangeFilter({
  label,
  value,
  onChange,
}: {
  label: string
  value: DateRange | undefined
  onChange: (next: DateRange | undefined) => void
}) {
  return (
    <div className="w-[190px]">
      <DateRangePicker value={value} onChange={onChange} placeholder={label} className="h-9" />
    </div>
  )
}

export function EmbeddedEnumMultiFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string[]
  options: { value: string; label: string }[]
  onChange: (next: string[]) => void
}) {
  return (
    <div className="w-[170px]">
      <EnumMultiSelect label={label} value={value} options={options} onChange={onChange} className="h-9" />
    </div>
  )
}

const ALL = "__all__"

/** Single-select chip (e.g. Deal stage). `value` is "" when nothing is chosen. */
export function EmbeddedSelectFilter({
  label,
  allLabel,
  value,
  options,
  onChange,
}: {
  label: string
  allLabel: string
  value: string
  options: { value: string; label: string }[]
  onChange: (next: string) => void
}) {
  const selected = options.find((o) => o.value === value)
  return (
    <div className="w-[170px]">
      <ChipTooltip label={label} value={selected?.label}>
      <Select
        value={value || ALL}
        onValueChange={(next) => next && onChange(next === ALL ? "" : next)}
      >
        <SelectTrigger
          className="h-9 w-full data-[size=default]:h-9"
          clearable={!!value}
          onClear={() => onChange("")}
        >
          <SelectValue>{selected ? selected.label : label}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      </ChipTooltip>
    </div>
  )
}
