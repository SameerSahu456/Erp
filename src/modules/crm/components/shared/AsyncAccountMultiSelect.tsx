import { useMemo, useState } from "react"

import { Checkbox } from "@/components/ui/checkbox"
import { Popover } from "@/components/ui/popover"
import { PopoverSelectTrigger } from "@/components/ui/popover-select-trigger"
import { cn } from "@/lib/utils"
import { UI } from "@/shared/constants"
import { pinSelected, useDebounce, useOpenSnapshot } from "@/shared/hooks"

import type { AccountApprovalStatus, AccountListItem } from "../../api"
import { useAccountOptions, useAccountsByIds } from "../../hooks/accounts/useAccounts"

import { InfiniteScrollPickerContent } from "./InfiniteScrollPickerContent"
import { CRM_SHARED_STRINGS } from "./crm-shared.strings"

interface AsyncAccountMultiSelectProps {
  /** Selected account ids. */
  value: string[]
  onValueChange: (ids: string[]) => void
  /** Shown in the trigger; the count is appended when accounts are selected. */
  label: string
  /** Optional placeholder when nothing is selected (defaults to `label`). */
  placeholder?: string
  className?: string
  disabled?: boolean
}

// Every KYC state — see the note on the component below.
const ALL_APPROVAL_STATUSES: AccountApprovalStatus[] = ["Approved", "Rejected", "Pending"]

/**
 * Toolbar-style multi-select account filter. API-backed via `useAccountOptions`
 * (infinite scroll + debounced search, §16.11). Mirrors `AsyncUserMultiSelect`
 * so the two filter chips feel identical.
 *
 * Unlike the assignment pickers, this is a FILTER over existing records: a
 * quote / sales order can belong to an account that was later rejected (or went
 * inactive), so it lists accounts of every status and every KYC approval state
 * instead of the Active + Approved-only picker default.
 */
export function AsyncAccountMultiSelect({
  value,
  onValueChange,
  label,
  placeholder,
  className,
  disabled = false,
}: AsyncAccountMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [rawSearch, setRawSearch] = useState("")
  const debouncedSearch = useDebounce(rawSearch.trim(), UI.DEBOUNCE_SEARCH_MS)

  const { data, isLoading, isError, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useAccountOptions(debouncedSearch, {
      enabled: open,
      status: null,
      approvalStatuses: ALL_APPROVAL_STATUSES,
    })

  const loadedItems = useMemo<AccountListItem[]>(
    () => (data?.pages ?? []).flatMap((p) => p.items),
    [data?.pages],
  )
  // Selected accounts first (as of open, not live), including ones on pages not
  // loaded yet; the paged list continues beneath them.
  const pinnedKey = useOpenSnapshot(open, value.join(","))
  const pinnedIds = pinnedKey ? pinnedKey.split(",") : []
  const loadedIdSet = new Set(loadedItems.map((a) => a.id))
  const missingIds = pinnedIds.filter((id) => !loadedIdSet.has(id))
  const accountsById = useAccountsByIds(open ? missingIds : [])
  const needle = debouncedSearch.toLowerCase()
  const items = pinSelected(
    loadedItems,
    pinnedIds,
    (id) => accountsById[id] as unknown as AccountListItem | undefined,
    (a) =>
      !needle ||
      a.name.toLowerCase().includes(needle) ||
      (a.code ?? "").toLowerCase().includes(needle),
  )
  const selectedSet = useMemo(() => new Set(value), [value])

  function toggle(id: string) {
    onValueChange(
      selectedSet.has(id) ? value.filter((v) => v !== id) : [...value, id],
    )
  }

  function clearAll(e: React.MouseEvent) {
    e.stopPropagation()
    onValueChange([])
  }

  const summary = value.length > 0 ? `${label} (${value.length})` : (placeholder ?? label)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverSelectTrigger
        dimWhenEmpty={false}
        hasValue={value.length > 0}
        onClear={clearAll}
        clearLabel={`Clear ${label.toLowerCase()}`}
        title={value.length > 0 ? `${label}: ${value.length} selected` : label}
        className={className}
        disabled={disabled}
      >
        {summary}
      </PopoverSelectTrigger>
      <InfiniteScrollPickerContent
        // Trigger is a narrow toolbar chip; widen the panel past the anchor so
        // account names + codes read in full, capped at the viewport (§8.7).
        contentClassName="w-[min(22rem,calc(100vw-2rem))] min-w-(--anchor-width)"
        search={{
          value: rawSearch,
          onChange: setRawSearch,
          placeholder: CRM_SHARED_STRINGS.accountMultiSelect.searchPlaceholder,
        }}
        query={{ isLoading, isError, error, hasNextPage, isFetchingNextPage, fetchNextPage }}
        items={items}
        errorText={CRM_SHARED_STRINGS.accountMultiSelect.loadError}
        emptyText={
          rawSearch
            ? CRM_SHARED_STRINGS.accountMultiSelect.noMatches
            : CRM_SHARED_STRINGS.accountMultiSelect.noAccounts
        }
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
              {/* Name over code (stacked), both truncate — never push the row
                  wide / cause horizontal scroll (§8.7). */}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate">{item.name}</span>
                {item.code && (
                  <span className="truncate text-[10px] text-muted-foreground">
                    {item.code}
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
