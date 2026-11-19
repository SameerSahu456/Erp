import { useMemo, useState } from "react"

import { Checkbox } from "@/components/ui/checkbox"
import { Popover } from "@/components/ui/popover"
import { PopoverSelectTrigger } from "@/components/ui/popover-select-trigger"
import { cn } from "@/lib/utils"
import { UI } from "@/shared/constants"
import { useDebounce } from "@/shared/hooks"

import { getUserDisplayName, usePinnedUserRows, useUserOptionsByRoles, type UserListItem } from "@modules/users"

import { CRM_PM_FILTER_ROLE_NAMES } from "../../crm-roles"
import { InfiniteScrollPickerContent } from "./InfiniteScrollPickerContent"
import { CRM_SHARED_STRINGS } from "./crm-shared.strings"

export interface PmFilterSelectProps {
  /** Selected PM user ids (empty array = no filter). */
  value: string[]
  /** Fires with the updated id list when the user toggles a PM. */
  onChange: (next: string[]) => void
  /** Field name shown with a count when PMs are selected, e.g. "Product Manager (1)". */
  label: string
  /** Empty-state text when nothing is selected, e.g. "All Product Managers". */
  placeholder: string
  searchPlaceholder: string
  className?: string
}

/**
 * Multi-select \"Filter by Product Manager\" dropdown for the Leads & Deals
 * list pages.
 *
 * API-backed via `useUserOptionsByRoles` (infinite scroll + debounced search,
 * §16.11). Selecting a row toggles its id in `value` without closing the
 * popover. The trigger shows \"<label> (N)\" when PMs are selected.
 *
 * The backend resolves the chosen PMs' combined category scope and narrows
 * the list by category overlap (OR semantics — a row passes when any selected
 * PM would see it).
 */
export function PmFilterSelect({
  value,
  onChange,
  label,
  placeholder,
  searchPlaceholder,
  className,
}: PmFilterSelectProps) {
  const [open, setOpen] = useState(false)
  const [rawSearch, setRawSearch] = useState("")
  const debouncedSearch = useDebounce(rawSearch.trim(), UI.DEBOUNCE_SEARCH_MS)

  // Only fetch while the popover is open; active PM users only.
  const { data, isLoading, isError, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useUserOptionsByRoles(CRM_PM_FILTER_ROLE_NAMES, {
      enabled: open,
      search: debouncedSearch,
    })

  const loadedItems = useMemo<UserListItem[]>(
    () => (data?.pages ?? []).flatMap((p) => p.items),
    [data?.pages],
  )
  // Selected users first (as of open, not live), including ones on pages not
  // loaded yet; the paged list continues beneath them.
  const items = usePinnedUserRows({
    open,
    selectedIds: value,
    loaded: loadedItems,
    search: debouncedSearch,
  })
  const selectedSet = useMemo(() => new Set(value), [value])

  function toggle(id: string) {
    onChange(
      selectedSet.has(id) ? value.filter((v) => v !== id) : [...value, id],
    )
  }

  function clearAll(e: React.MouseEvent) {
    e.stopPropagation()
    onChange([])
  }

  const summary = value.length > 0 ? `${label} (${value.length})` : placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverSelectTrigger
        dimWhenEmpty={false}
        hasValue={value.length > 0}
        onClear={clearAll}
        clearLabel={`Clear ${label.toLowerCase()}`}
        title={value.length > 0 ? `${label}: ${value.length} selected` : label}
        className={className}
      >
        {summary}
      </PopoverSelectTrigger>
      <InfiniteScrollPickerContent
        search={{ value: rawSearch, onChange: setRawSearch, placeholder: searchPlaceholder }}
        query={{ isLoading, isError, error, hasNextPage, isFetchingNextPage, fetchNextPage }}
        items={items}
        errorText={CRM_SHARED_STRINGS.userMultiSelect.loadError}
        emptyText={rawSearch ? CRM_SHARED_STRINGS.userMultiSelect.noMatches : CRM_SHARED_STRINGS.userMultiSelect.noUsers}
        renderItem={(item) => {
          const checked = selectedSet.has(item.id)
          return (
            <button
              type="button"
              onClick={() => toggle(item.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
                "hover:bg-accent",
                checked && "bg-accent/50",
              )}
            >
              <Checkbox checked={checked} className="pointer-events-none shrink-0" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate">{getUserDisplayName(item)}</span>
                {item.email && (
                  <span className="truncate text-[10px] text-muted-foreground">
                    {item.email}
                  </span>
                )}
              </span>
            </button>
          )
        }}
      />
    </Popover>
  )
}
