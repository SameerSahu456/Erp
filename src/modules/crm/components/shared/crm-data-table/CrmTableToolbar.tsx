import * as React from "react"
import { UI } from "@/shared/constants"
import { Search, X } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { ChipTooltip } from "../ChipTooltip"
import { CRM_SHARED_STRINGS } from "../crm-shared.strings"
import { useMirroredValue } from "@/shared/hooks"

import {
  CrmToolbarDateRange,
  CrmToolbarFilterSelect,
  FilterChipDropdown,
} from "./toolbarFilterControls"
import type { CrmDataTableController } from "./useCrmDataTable"
import type { CrmDataTableProps, ToolbarFilter } from "./types"

interface CrmTableToolbarProps {
  controller: CrmDataTableController
  searchable: boolean
  renderFilter: CrmDataTableProps["renderFilter"]
  useAsyncFilterDropdowns: boolean
  toolbarFilters: ToolbarFilter[] | undefined
  onToolbarFilterChange: CrmDataTableProps["onToolbarFilterChange"]
  onToolbarDateRangeChange: CrmDataTableProps["onToolbarDateRangeChange"]
  extraFilters: CrmDataTableProps["extraFilters"]
  trailingFilters: CrmDataTableProps["trailingFilters"]
  leadingFilters: CrmDataTableProps["leadingFilters"]
  dateRangePlacement: NonNullable<CrmDataTableProps["dateRangePlacement"]>
}

/** Toolbar row: free-text search + per-column filter dropdowns + column-
 *  independent toolbar filter chips. Pure presenter — all state/handlers come
 *  from the controller. */
export function CrmTableToolbar({
  controller,
  searchable,
  renderFilter,
  useAsyncFilterDropdowns,
  toolbarFilters,
  onToolbarFilterChange,
  onToolbarDateRangeChange,
  extraFilters,
  trailingFilters,
  leadingFilters,
  dateRangePlacement,
}: CrmTableToolbarProps) {
  const {
    effectiveSearch,
    handleSearchInput,
    filterableColumns,
    filterOptions,
    effectiveColumnFilters,
    handleFilterChange,
    searchableFilterKeys,
  } = controller

  // Caret-safe search: the box runs on local state (updated synchronously on
  // each keystroke) so editing mid-string never bounces the caret to the end,
  // even though the value is owned upstream (often a URL param). Changes still
  // flow up via `handleSearchInput`; external resets are adopted.
  const [searchText, onSearchType] = useMirroredValue(effectiveSearch, handleSearchInput)

  return (
    <div className="cpt-table-toolbar">
      {searchable && (
        <div className="cpt-search-field focus-within:!shadow-none">
          {/* CRM fork: the focus glow ring is dropped here (the
              comprint.css `.cpt-search-field:focus-within` box-shadow);
              the border tint stays as a subtle, accessible focus cue. */}
          <Search className="size-[14px] opacity-60" />
          <input
            placeholder={CRM_SHARED_STRINGS.tableToolbar.searchPlaceholder}
            maxLength={UI.FILTER_SEARCH_MAX_LENGTH}
            value={searchText}
            onChange={(e) => onSearchType(e.target.value)}
          />
          {searchText && (
            <button
              type="button"
              onClick={() => onSearchType("")}
              className="opacity-40 transition-opacity hover:opacity-70"
              aria-label={CRM_SHARED_STRINGS.tableToolbar.clearSearch}
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      )}

      {leadingFilters}

      {dateRangePlacement === "start" &&
        (toolbarFilters ?? []).map((tf) =>
          tf.kind === "daterange" ? (
            <CrmToolbarDateRange key={tf.key} filter={tf} onChange={onToolbarDateRangeChange} />
          ) : null,
        )}

      {/* Column filter dropdowns */}
      {filterableColumns.map((col) => {
        const options = filterOptions[col.key] ?? []
        const customFilter = renderFilter?.({
          column: col,
          value: effectiveColumnFilters[col.key],
          onChange: (next) => handleFilterChange(col.key, next),
          options,
        })
        if (customFilter != null) {
          return <React.Fragment key={col.key}>{customFilter}</React.Fragment>
        }
        if (options.length === 0) return null
        if (useAsyncFilterDropdowns || searchableFilterKeys.has(col.key)) {
          return (
            <FilterChipDropdown
              key={col.key}
              label={col.label}
              options={options}
              value={effectiveColumnFilters[col.key]}
              onChange={(value) => handleFilterChange(col.key, value)}
              searchable={searchableFilterKeys.has(col.key)}
            />
          )
        }
        const v = effectiveColumnFilters[col.key]
        const hasValue = v != null && v !== "__all__" && v !== ""
        return (
          // 30ch, not a px width: these filters carry account and owner
          // names ("MANGAL COMPUSOLUTION LIMITED-GOREGAON" is 37
          // characters), so the box is sized in the unit the content is
          // actually measured in.
          <div key={col.key} className="w-[30ch]">
          <ChipTooltip label={col.label} value={hasValue ? v : undefined}>
          <Select
            value={v ?? "__all__"}
            onValueChange={(next) => handleFilterChange(col.key, next ?? "__all__")}
          >
            <SelectTrigger
              size="sm"
              className="w-full"
              clearable={hasValue}
              onClear={() => handleFilterChange(col.key, "__all__")}
            >
              <SelectValue>
                {hasValue ? v : CRM_SHARED_STRINGS.dataTable.allColumn(col.label)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">
                {CRM_SHARED_STRINGS.dataTable.allColumn(col.label)}
              </SelectItem>
              {options.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          </ChipTooltip>
          </div>
        )
      })}

      {/* Column-independent SELECT toolbar filters — server-backed filters with
          no matching visible table column. Date-range filters are rendered
          after `extraFilters` (below) so the date filter always sits at the
          right end of the row, with the async pickers to its left. */}
      {(toolbarFilters ?? []).map((tf) => {
        if (tf.kind === "daterange") return null
        // Select filter — hide entirely when it has no options to offer.
        if (tf.options.length === 0) return null
        return <CrmToolbarFilterSelect key={tf.key} filter={tf} onChange={onToolbarFilterChange} />
      })}

      {/* Custom filter control(s) the static toolbarFilters contract can't
          express (e.g. an async "Created By" user picker) — sits to the LEFT
          of the date filter. */}
      {extraFilters}

      {/* Date-range toolbar filter(s) render after the inline filter chips so
          the date picker sits at the end of the chip row. */}
      {dateRangePlacement === "end" &&
        (toolbarFilters ?? []).map((tf) =>
          tf.kind === "daterange" ? (
            <CrmToolbarDateRange key={tf.key} filter={tf} onChange={onToolbarDateRangeChange} />
          ) : null,
        )}

      {/* Right-anchored controls — e.g. a "Filters" aside toggle button that
          should sit AFTER the date picker. Opt-in per caller; the previous
          end-of-row control was the date picker itself. */}
      {trailingFilters}

      <div style={{ marginLeft: "auto" }} />
    </div>
  )
}
