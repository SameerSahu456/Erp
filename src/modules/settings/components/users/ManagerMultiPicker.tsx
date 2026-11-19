import * as React from "react"
import { CheckIcon, ChevronsUpDownIcon, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Typography } from "@/components/ui/typography"
import { useDebounce, useInfiniteDropdownLoader } from "@/shared/hooks"
import { UI } from "@/shared/constants"
import {
  getUserDisplayName,
  usePinnedUserRows,
  useUserOptions,
  type UserListItem,
} from "@modules/users"

import { USERS_STRINGS } from "./users.strings"

export interface ManagerOption {
  id: string
  label: string
}

interface ManagerMultiPickerProps {
  value: ManagerOption[]
  onValueChange: (next: ManagerOption[]) => void
  /** Edit-mode: hide the user being edited from the list. Backend would reject
   *  self-managing anyway; this just keeps the option out of sight. */
  excludeUserId?: string
  /** When set, the dropdown only lists users holding at least one of these
   *  role IDs (forwarded to `GET /users?role_ids=`). Derived from the subject
   *  role's `allowed_manager_role_ids` so the picker pre-filters to valid
   *  manager candidates. Omit / `undefined` → no role filter (all users shown). */
  allowedRoleIds?: number[]
  disabled?: boolean
  /** Backend caps `manager_ids` at 10 — see Fields_changes.md §3. */
  max?: number
  placeholder?: string
}

// 2026-05-19 multi-manager picker. Replaces the single-value ManagerPicker
// in the user form. Pattern mirrors AccountOwnersSelect:
//   • API-backed via useUserOptions (debounced search → server param,
//     IntersectionObserver infinite scroll, PAGINATION.DEFAULT_PAGE_SIZE).
//   • Selection stored as `{id, label}` so chips persist after rows scroll
//     out of the loaded page.
//   • All managers are equal — no primary indicator (spec §3).
export function ManagerMultiPicker({
  value,
  onValueChange,
  excludeUserId,
  allowedRoleIds,
  disabled,
  max = 10,
  placeholder = "Pick managers",
}: ManagerMultiPickerProps) {
  const [open, setOpen] = React.useState(false)
  const [rawSearch, setRawSearch] = React.useState("")
  const search = useDebounce(rawSearch.trim(), UI.DEBOUNCE_SEARCH_MS)

  const query = useUserOptions(
    search,
    { is_active: true, role_ids: allowedRoleIds },
    { enabled: open },
  )
  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = query

  const loadedItems = React.useMemo<UserListItem[]>(() => {
    const flat = (data?.pages ?? []).flatMap((p) => p.items)
    const filtered = excludeUserId
      ? flat.filter((u) => u.id !== excludeUserId)
      : flat
    // Dedupe by id — paginated pages can overlap, which would otherwise
    // produce duplicate React keys in the list below.
    const seen = new Set<string>()
    const out: UserListItem[] = []
    for (const u of filtered) {
      if (seen.has(u.id)) continue
      seen.add(u.id)
      out.push(u)
    }
    return out
  }, [data?.pages, excludeUserId])

  // Selected users first (as of open, not live), including ones on pages not
  // loaded yet; the paged list continues beneath them.
  const items = usePinnedUserRows({
    open,
    selectedIds: value.map((v) => v.id),
    loaded: loadedItems,
    search,
  })

  const [scrollerNode, setScrollerNode] = React.useState<HTMLDivElement | null>(null)
  const [sentinelNode, setSentinelNode] = React.useState<HTMLDivElement | null>(null)
  const { onScroll, onWheel } = useInfiniteDropdownLoader({
    open,
    scrollerNode,
    sentinelNode,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    loadedCount: items.length,
  })

  const selectedIds = React.useMemo(
    () => new Set(value.map((v) => v.id)),
    [value],
  )
  const atMax = value.length >= max

  function toggle(item: UserListItem) {
    const id = item.id
    if (selectedIds.has(id)) {
      onValueChange(value.filter((v) => v.id !== id))
      return
    }
    if (atMax) return
    onValueChange([...value, { id, label: getUserDisplayName(item) }])
  }

  function removeChip(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    onValueChange(value.filter((v) => v.id !== id))
  }

  const triggerLabel =
    value.length === 0
      ? placeholder
      : USERS_STRINGS.managerPicker.selectedCount(value.length)

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
        <PopoverTrigger
          disabled={disabled}
          data-slot="input"
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-[7px] border border-input bg-background px-[10px] text-[13.5px] shadow-xs",
            "cursor-pointer transition-colors",
            !value.length && "text-muted-foreground",
            disabled && "cursor-not-allowed opacity-60",
          )}
        >
          <span className="min-w-0 flex-1 truncate text-left">
            {triggerLabel}
          </span>
          <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent className="w-[var(--anchor-width)] p-0" align="start">
          <div className="border-b border-border p-2">
            <Input
              value={rawSearch}
              onChange={(e) => setRawSearch(e.target.value)}
              placeholder={USERS_STRINGS.managerPicker.searchPlaceholder}
              className="h-8 text-sm"
              autoFocus
            />
            {atMax && (
              <p className="mt-1 text-[10.5px] text-amber-700 dark:text-amber-400">
                {USERS_STRINGS.managerPicker.maxReached(max)}
              </p>
            )}
          </div>
          <div
            ref={setScrollerNode}
            onScroll={onScroll}
            onWheel={onWheel}
            className="max-h-64 overflow-y-auto p-1"
          >
            {isLoading && items.length === 0 ? (
              <Typography asChild variant="helper" align="center" className="px-2 py-6"><div>
                {USERS_STRINGS.managerPicker.loading}
              </div></Typography>
            ) : isError ? (
              <Typography asChild variant="helper" tone="danger" align="center" className="px-2 py-6"><div>
                {USERS_STRINGS.managerPicker.loadError}
              </div></Typography>
            ) : items.length === 0 ? (
              <Typography asChild variant="helper" align="center" className="px-2 py-6"><div>
                {rawSearch ? USERS_STRINGS.managerPicker.noMatches : USERS_STRINGS.managerPicker.noUsers}
              </div></Typography>
            ) : (
              <>
                {items.map((item) => {
                  const isSelected = selectedIds.has(item.id)
                  const display = getUserDisplayName(item)
                  const disabledRow = !isSelected && atMax
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggle(item)}
                      disabled={disabledRow}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
                        "hover:bg-accent",
                        disabledRow && "cursor-not-allowed opacity-50 hover:bg-transparent",
                      )}
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
                        <div className="truncate">{display}</div>
                        <div className="truncate text-[10.5px] text-muted-foreground">
                          {item.email}
                        </div>
                      </div>
                    </button>
                  )
                })}
                {hasNextPage && (
                  <Typography
                    asChild
                    variant="caption"
                    align="center"
                    className="px-2 py-2"
                  >
                    <div ref={setSentinelNode}>
                      {isFetchingNextPage ? USERS_STRINGS.managerPicker.loadingMore : USERS_STRINGS.managerPicker.scrollForMore}
                    </div>
                  </Typography>
                )}
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((opt) => (
            <li
              key={opt.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-2 py-1 text-[12px]"
            >
              <span className="max-w-[160px] truncate">{opt.label}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => removeChip(opt.id, e)}
                  className="rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  aria-label={USERS_STRINGS.managerPicker.removeChip(opt.label)}
                >
                  <X className="size-3" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
