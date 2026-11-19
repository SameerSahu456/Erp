import * as React from "react"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { selectedFirst } from "@/shared/hooks"
import { Popover } from "@/components/ui/popover"
import { PopoverSelectTrigger } from "@/components/ui/popover-select-trigger"

import type { AccountTypeWire } from "../../api"
import { useAccount, useAccountOptions } from "../../hooks/accounts/useAccounts"
import { InfiniteScrollPickerContent } from "../shared/InfiniteScrollPickerContent"

interface ParentAccountSelectProps {
  /** Account id, or null when no parent is selected. */
  value: string | null
  onValueChange: (id: string | null) => void
  /** Hide this id from results — used in edit mode so an account can't pick itself. */
  excludeId?: string
  /**
   * Cycle-safe parent filter (edit mode). When set, the options query lists
   * only valid parents for this account id — the server drops the account AND
   * its entire subtree (recursive CTE), so the picker can never offer a choice
   * that would trip the backend's ACCOUNT_HIERARCHY_CYCLE guard. This is the
   * SAME server filter the detail page's Set-parent dialog uses
   * (`LinkParentAccountDialog` → `useAccountOptions({ eligibleParentFor })`).
   * Takes precedence over `excludeId`.
   */
  eligibleParentFor?: string
  /**
   * Exact-match account-type filter. When set, the picker lists only accounts
   * of this type — so a parent can only be one of the same type as the account
   * being edited. Passed straight to `useAccountOptions({ accountType })`.
   */
  accountType?: AccountTypeWire
  placeholder?: string
  /**
   * Locked mode: the parent is fixed (e.g. a child account created from a
   * parent's "Create new account"). The trigger is disabled, the clear button
   * is hidden, and the popover can't open — the user can't change or remove it.
   */
  locked?: boolean
}

// Single-select async dropdown over GET /crm/accounts.
// Mirrors AsyncMultiSelect (search + IntersectionObserver sentinel) but in
// single-select shape, with an explicit "None" option to clear the parent.
//
// The component owns label resolution: it takes just an account id, and if
// that id isn't in the paginated dropdown results (e.g. the saved parent is
// on a later page), it fetches the single account by id and pins it into
// the option list so the user can always see and re-select what's currently
// chosen.
export function ParentAccountSelect({
  value,
  onValueChange,
  excludeId,
  eligibleParentFor,
  accountType,
  placeholder = "Select parent account (optional)",
  locked = false,
}: ParentAccountSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [rawSearch, setRawSearch] = React.useState("")

  // Prefer the cycle-safe server filter (`eligibleParentFor`) when an account
  // id is known — same path the detail page uses. Fall back to the plain
  // self-exclusion only when there's no account yet (create mode).
  const query = useAccountOptions(rawSearch, {
    eligibleParentFor,
    excludeId: eligibleParentFor ? undefined : excludeId,
    accountType,
    enabled: open && !locked,
  })
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

  // Resolve the selected value's name. Fires only when `value` is set AND
  // it isn't already in the dropdown's paginated results — saves a round
  // trip in the common case where the saved parent is on page 1.
  const valueAlreadyInList = !!value && rawItems.some((i) => i.id === value)
  const valueDetailQuery = useAccount(value && !valueAlreadyInList ? value : null)

  // Pin the selected account into the option list so it always renders as
  // the active choice — even when it lives on a later page or doesn't match
  // the current search. Use a Set keyed by id for an explicit dedup pass so
  // the pinned row can never appear twice if the same id later shows up in
  // the paginated results.
  const items = React.useMemo(() => {
    const seen = new Set<string>()
    const out: typeof rawItems = []
    if (value && !valueAlreadyInList && valueDetailQuery.data) {
      const pinned = {
        id: valueDetailQuery.data.id,
        code: valueDetailQuery.data.code,
        name: valueDetailQuery.data.name,
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
  const triggerLabel = selectedItem?.name ?? (value ? "Loading…" : null)

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
    <Popover open={locked ? false : open} onOpenChange={locked ? undefined : setOpen}>
      <PopoverSelectTrigger
        hasValue={!!value}
        onClear={locked ? undefined : clear}
        disabled={locked}
        title={triggerLabel || placeholder}
        clearLabel="Clear parent account"
      >
        {value ? triggerLabel : placeholder}
      </PopoverSelectTrigger>
      <InfiniteScrollPickerContent
        search={{ value: rawSearch, onChange: setRawSearch, placeholder: "Search accounts..." }}
        query={{ isLoading, isError, error, hasNextPage, isFetchingNextPage, fetchNextPage }}
        items={items}
        errorText="Failed to load accounts"
        beforeList={
          <button
            type="button"
            onClick={() => {
              onValueChange(null)
              setOpen(false)
            }}
            className={cn(
              "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent",
              !value && "font-medium",
            )}
          >
            <span className="flex size-4 shrink-0 items-center justify-center">
              {!value && <CheckIcon className="size-3" />}
            </span>
            <span className="text-muted-foreground italic">None</span>
          </button>
        }
        renderItem={(item) => {
          const isSelected = value === item.id
          return (
            <button
              type="button"
              onClick={() => pick(item.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent",
                isSelected && "font-medium",
              )}
            >
              <span className="flex size-4 shrink-0 items-center justify-center">
                {isSelected && <CheckIcon className="size-3" />}
              </span>
              <span className="min-w-0 flex-1 truncate">{item.name}</span>
            </button>
          )
        }}
      />
    </Popover>
  )
}
