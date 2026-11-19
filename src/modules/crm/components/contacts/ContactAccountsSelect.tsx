import * as React from "react"
import { CheckIcon, Star, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Popover } from "@/components/ui/popover"
import { PopoverSelectTrigger } from "@/components/ui/popover-select-trigger"

import { InfiniteScrollPickerContent } from "../shared/InfiniteScrollPickerContent"

import { CONTACTS_STRINGS } from "./contacts.strings"
import { useAccountOptions } from "../../hooks/accounts/useAccounts"

export interface ContactAccountOption {
  id: string
  label: string
}

interface ContactAccountsSelectProps {
  value: ContactAccountOption[]
  onValueChange: (next: ContactAccountOption[]) => void
  primaryAccountId: string | null
  onPrimaryAccountChange: (id: string | null) => void
  placeholder?: string
  // Accounts to hide from the dropdown — typically the IDs already linked to
  // the contact, so a "Link account" picker can't offer them for re-linking.
  excludeIds?: string[]
  // Accounts the user can't unlink — chips render without an X and the
  // dropdown row can't toggle them off. Used when a contact is created from
  // an Account detail page: the originating account is pre-linked and
  // must stay linked.
  lockedIds?: string[]
}

// Multi-select async dropdown over GET /accounts with a "primary" indicator.
// Same shape as AccountOwnersSelect but the source is accounts (via
// useAccountOptions) instead of users.
//
// Backend semantics this matches:
//   - account_ids: list[uuid]      → this component's `value`
//   - primary_account_id: uuid     → the starred chip
//   - invariant: primary ∈ account_ids when both set
//
// Selection stored as `{id, label}` so chips render even after a row scrolls
// out of the loaded page (per Coding-guideline §16.11 #5).
export function ContactAccountsSelect({
  value,
  onValueChange,
  primaryAccountId,
  onPrimaryAccountChange,
  placeholder = CONTACTS_STRINGS.select.placeholder,
  excludeIds,
  lockedIds,
}: ContactAccountsSelectProps) {
  const locked = React.useMemo(
    () => new Set(lockedIds ?? []),
    [lockedIds],
  )
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

  const excluded = React.useMemo(
    () => new Set(excludeIds ?? []),
    [excludeIds],
  )
  const items = React.useMemo(() => {
    const flat = (data?.pages ?? []).flatMap((p) => p.items)
    return excluded.size > 0 ? flat.filter((a) => !excluded.has(a.id)) : flat
  }, [data?.pages, excluded])

  const selectedIds = React.useMemo(() => new Set(value.map((v) => v.id)), [value])

  function toggle(id: string, label: string) {
    if (selectedIds.has(id)) {
      // Locked rows can't be unlinked from either the dropdown or the chip.
      if (locked.has(id)) return
      onValueChange(value.filter((v) => v.id !== id))
      if (primaryAccountId === id) onPrimaryAccountChange(null)
    } else {
      onValueChange([...value, { id, label }])
    }
  }

  function setPrimary(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    onPrimaryAccountChange(id === primaryAccountId ? null : id)
  }

  function removeChip(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    onValueChange(value.filter((v) => v.id !== id))
    if (primaryAccountId === id) onPrimaryAccountChange(null)
  }

  const triggerLabel =
    value.length === 0
      ? placeholder
      : CONTACTS_STRINGS.select.triggerLabel(value.length)

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverSelectTrigger hasValue={value.length > 0}>
          {triggerLabel}
        </PopoverSelectTrigger>
        <InfiniteScrollPickerContent
          search={{ value: rawSearch, onChange: setRawSearch, placeholder: CONTACTS_STRINGS.select.searchPlaceholder }}
          query={{ isLoading, isError, error, hasNextPage, isFetchingNextPage, fetchNextPage }}
          items={items}
          errorText={CONTACTS_STRINGS.select.loadError}
          renderItem={(item) => {
            const isSelected = selectedIds.has(item.id)
            const isLocked = locked.has(item.id)
            return (
              <button
                type="button"
                onClick={() => toggle(item.id, item.name)}
                disabled={isLocked}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
                  "hover:bg-accent",
                  isLocked && "cursor-not-allowed opacity-70 hover:bg-transparent",
                )}
                title={isLocked ? CONTACTS_STRINGS.select.lockedRowTitle : undefined}
              >
                <div
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-sm border",
                    isSelected
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-muted-foreground/40",
                  )}
                >
                  {isSelected && <CheckIcon className="size-3" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate">{item.name}</div>
                  <div className="truncate text-[10.5px] text-muted-foreground">
                    {item.code}
                  </div>
                </div>
              </button>
            )
          }}
        />
      </Popover>

      {/* Selected chips with primary toggle */}
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((opt) => {
            const isPrimary = opt.id === primaryAccountId
            const isLocked = locked.has(opt.id)
            return (
              <li
                key={opt.id}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[12px]",
                  isPrimary
                    ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-600/40 dark:bg-amber-950/30 dark:text-amber-100"
                    : "border-border bg-secondary/60",
                )}
                title={isLocked ? CONTACTS_STRINGS.select.lockedChipTitle : undefined}
              >
                <button
                  type="button"
                  onClick={(e) => setPrimary(opt.id, e)}
                  className="rounded p-0.5 hover:bg-amber-200/40 dark:hover:bg-amber-900/40"
                  aria-label={isPrimary ? CONTACTS_STRINGS.select.unsetPrimary : CONTACTS_STRINGS.select.makePrimary}
                  title={isPrimary ? CONTACTS_STRINGS.select.primaryAccount : CONTACTS_STRINGS.select.makePrimary}
                >
                  <Star
                    className={cn("size-3", isPrimary && "fill-amber-500 text-amber-500")}
                  />
                </button>
                <span className="max-w-[180px] truncate">{opt.label}</span>
                {!isLocked && (
                  <button
                    type="button"
                    onClick={(e) => removeChip(opt.id, e)}
                    className="rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    aria-label={CONTACTS_STRINGS.select.removeLink}
                  >
                    <X className="size-3" />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
