import * as React from "react"

import { cn } from "@/lib/utils"
import { selectedFirst } from "@/shared/hooks"
import { Popover } from "@/components/ui/popover"
import { PopoverSelectTrigger } from "@/components/ui/popover-select-trigger"

import { useAccount, useAccountOptions } from "../../hooks/accounts/useAccounts"
import { InfiniteScrollPickerContent } from "../shared/InfiniteScrollPickerContent"
import { DEALS_STRINGS } from "./deals.strings"

interface DealAccountSelectProps {
  /** Account id, or null when no account is selected. */
  value: string | null
  onValueChange: (id: string | null) => void
  placeholder?: string
  disabled?: boolean
  /**
   * Known account name for the current `value` (e.g. the deal's server-resolved
   * `account_name`). Shown on the trigger while the by-id resolver loads — or if
   * it fails — so an already-selected account never reads as "Loading…".
   */
  fallbackLabel?: string
}

// Single-select async combobox over GET /accounts. Paginated +
// IntersectionObserver scroll-to-load-more + debounced search per §16.11.
// The component owns label resolution: it takes just an id and, when the
// saved selection isn't in the paginated dropdown results, fetches the
// account by id once and pins it into the option list.
export function DealAccountSelect({
  value,
  onValueChange,
  placeholder = DEALS_STRINGS.picker.accountPlaceholder,
  disabled,
  fallbackLabel,
}: DealAccountSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [rawSearch, setRawSearch] = React.useState("")

  const query = useAccountOptions(rawSearch, { enabled: open })
  const {
    data,
    isLoading,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = query

  const rawItems = React.useMemo(
    () => (data?.pages ?? []).flatMap((p) => p.items),
    [data?.pages],
  )

  // Resolve the selected account's name when it isn't in the loaded pages.
  // The dropdown only fetches when opened, so the trigger label needs its
  // own resolver in edit mode for first paint.
  const valueAlreadyInList = !!value && rawItems.some((i) => i.id === value)
  // This picker only ever drives create/edit forms (Deal, Sales Order, Quote
  // builder). Resolve the preset account's name even when the operator lacks
  // per-record access to it — otherwise the trigger label 403s and the form
  // can't show what was already linked. Bypass the access gate.
  const valueDetailQuery = useAccount(value && !valueAlreadyInList ? value : null, {
    bypassAccess: true,
  })

  // Pin the saved selection if not in the paginated results, with explicit
  // dedup so the pinned row can never appear twice if it shows up later.
  const items = React.useMemo(() => {
    const seen = new Set<string>()
    const out: typeof rawItems = []
    if (value && !valueAlreadyInList && valueDetailQuery.data) {
      // AccountResponse has `account_owner_ids` (legacy field name on the
      // detail endpoint); AccountListItem renamed it to `account_owners`
      // in the 2026-05-27 list enhancement. Same `{id, name}[]` shape.
      const detail = valueDetailQuery.data
      const pinned = {
        ...detail,
        account_owners: detail.account_owner_ids,
      } as (typeof rawItems)[number]
      out.push(pinned)
      seen.add(pinned.id)
    }
    for (const item of rawItems) {
      if (seen.has(item.id)) continue
      seen.add(item.id)
      out.push(item)
    }
    // Selected account first (a pinned detail row already is; this also lifts a
    // selection that sits on a loaded page).
    return value ? selectedFirst(out, (i) => i.id, new Set([value])) : out
  }, [value, valueAlreadyInList, valueDetailQuery.data, rawItems])

  const selectedItem = items.find((i) => i.id === value) ?? null
  // Resolved name wins; otherwise show the caller-supplied fallback (the deal's
  // own account_name) so a selected account never flashes "Loading…" while the
  // by-id resolver is in flight or after it errors. Loading text only shows when
  // a value is set with no fallback to lean on.
  const triggerLabel =
    selectedItem?.name ??
    (value ? fallbackLabel || DEALS_STRINGS.picker.loading : placeholder)

  function pick(id: string) {
    onValueChange(id)
    setOpen(false)
    setRawSearch("")
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation()
    onValueChange(null)
  }

  return (
    <Popover open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
      <PopoverSelectTrigger
        hasValue={!!value}
        onClear={clear}
        disabled={disabled}
        clearLabel={DEALS_STRINGS.picker.accountClear}
      >
        {triggerLabel}
      </PopoverSelectTrigger>
      <InfiniteScrollPickerContent
        search={{ value: rawSearch, onChange: setRawSearch, placeholder: DEALS_STRINGS.picker.accountSearch }}
        query={{ isLoading, isError, error, hasNextPage, isFetchingNextPage, fetchNextPage }}
        items={items}
        errorText={DEALS_STRINGS.picker.accountError}
        renderItem={(item) => (
          <button
            type="button"
            onClick={() => pick(item.id)}
            className={cn(
              "flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent",
              // Selection shown by a tinted background, not a check icon.
              value === item.id && "bg-accent font-medium text-accent-foreground",
            )}
          >
            <span className="min-w-0 flex-1 truncate">{item.name}</span>
          </button>
        )}
      />
    </Popover>
  )
}
