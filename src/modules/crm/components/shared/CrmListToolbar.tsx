import type { ReactNode } from "react"
import { UI } from "@/shared/constants"
import { Search, X } from "lucide-react"

import { Input } from "@/components/ui/input"
import { useMirroredValue } from "@/shared/hooks"

import { CrmClearAllButton } from "./CrmClearAllButton"
import { CrmFiltersButton } from "./CrmFiltersButton"
import { CRM_SHARED_STRINGS } from "./crm-shared.strings"

interface CrmListToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  filtersOpen: boolean
  onToggleFilters: () => void
  activeFilterCount: number
  searchPlaceholder: string
  /** Extra filter chips rendered right after the Filters button. */
  filters?: ReactNode
  /** Clear-all handler; shown after the last filter chip once a filter is active. */
  onClearAll?: () => void
}

// erp-demo style: search input + standalone Filters button in the toolbar slot.
// Shared across CRM list pages that pair a search box with a collapsible
// CrmFilterAside (leads, deals, rejected-leads, …).
export function CrmListToolbar({
  search,
  onSearchChange,
  filtersOpen,
  onToggleFilters,
  activeFilterCount,
  searchPlaceholder,
  filters,
  onClearAll,
}: CrmListToolbarProps) {
  // Caret-safe search: the box runs on local state (updated synchronously on
  // each keystroke) so editing mid-string never bounces the caret to the end,
  // even though `search` is owned upstream (often a URL param). Changes still
  // flow up via `onSearchChange`; external resets are adopted.
  const [searchText, onSearchType] = useMirroredValue(search, onSearchChange)
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative max-w-md flex-1 min-w-[240px]">
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
            aria-label={CRM_SHARED_STRINGS.listToolbar.clearSearch}
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      <CrmFiltersButton
        open={filtersOpen}
        onToggle={onToggleFilters}
        activeFilterCount={activeFilterCount}
      />
      {filters}
      {onClearAll && activeFilterCount > 0 && <CrmClearAllButton onClick={onClearAll} />}
    </div>
  )
}
