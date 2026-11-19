import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent } from '@/components/ui/popover'
import { PopoverSelectTrigger } from '@/components/ui/popover-select-trigger'
import { Typography } from '@/components/ui/typography'
import { HoverTip } from '@/components/common/display/HoverTip'
import { useInfiniteDropdownLoader } from '@/shared/hooks'
import { useRolesInfinite, type Role } from '@modules/users'

import { USERS_STRINGS } from './users.strings'

// Single-select role picker — used for the "Filter by role" dropdown on the
// User Management page. API-backed and lazy (Coding-guideline §16.11):
//
//   • Nothing fetched on page mount; opening the popover triggers the first
//     page via `useRolesInfinite({ enabled: open })`
//   • Page size = `PAGINATION.DEFAULT_PAGE_SIZE` (set inside the hook)
//   • IntersectionObserver fires `fetchNextPage` when the sentinel
//     intersects the popover's own scroller
//   • Search is sent to the backend so the picker stays API-driven.
//   • A selected-but-unloaded role name is pinned at the top of the list
//     and shown in the trigger, so the chosen value survives a page reload
//     even if it sits past the first loaded page.
//
// `value === null` means "no filter" (the consumer treats this as "All
// Roles"). The clear button (✕ in the trigger) sets value to null.

interface RolePickerProps {
  value: string | null
  onValueChange: (next: string | null) => void
  placeholder?: string
  allLabel?: string
  disabled?: boolean
}

export function RolePicker({
  value,
  onValueChange,
  placeholder = USERS_STRINGS.rolePicker.placeholder,
  allLabel = USERS_STRINGS.rolePicker.allLabel,
  disabled,
}: RolePickerProps) {
  const [open, setOpen] = useState(false)
  const [rawSearch, setRawSearch] = useState('')

  const query = useRolesInfinite({ enabled: open, search: rawSearch })
  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = query

  const loadedRoles = useMemo<Role[]>(
    () => (data?.pages ?? []).flatMap((p) => p.items),
    [data?.pages],
  )

  // If the chosen role name hasn't been loaded yet (rare after the first
  // page or two, but possible), render a synthetic pinned row so the user
  // can re-pick or clear it without scrolling through every page.
  const loadedNames = useMemo(
    () => new Set(loadedRoles.map((r) => r.name)),
    [loadedRoles],
  )
  // The roles list is already filtered server-side; the pinned selection is the
  // one synthetic row, so it must follow the search too. There is deliberately
  // NO "All Roles" row in the list — that is a reset, not a role. The trigger
  // shows it as its placeholder and the ✕ clears the filter.
  const term = rawSearch.trim().toLowerCase()
  const matchesTerm = (text: string) => !term || text.toLowerCase().includes(term)
  const pinned: Role | null =
    value && !loadedNames.has(value) && matchesTerm(value)
      ? { id: -1, name: value, channel_tags: [], allowed_manager_role_ids: [] }
      : null

  const [scrollerNode, setScrollerNode] = useState<HTMLDivElement | null>(null)
  const [sentinelNode, setSentinelNode] = useState<HTMLDivElement | null>(null)
  const { onScroll, onWheel } = useInfiniteDropdownLoader({
    open,
    scrollerNode,
    sentinelNode,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    loadedCount: loadedRoles.length,
  })

  function pick(name: string) {
    onValueChange(name)
    setOpen(false)
    setRawSearch('')
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation()
    onValueChange(null)
  }

  return (
    <Popover open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
      {/* Same trigger frame as the Status select next to it (shared
          PopoverSelectTrigger mirrors ui/select): one chevron, a clear ✕ only
          while a role is chosen, and the hover tooltip built in. */}
      <PopoverSelectTrigger
        hasValue={value !== null}
        onClear={disabled ? undefined : clear}
        disabled={disabled}
        dimWhenEmpty={false}
        className="h-9"
        clearLabel={USERS_STRINGS.rolePicker.clearAriaLabel}
        title={USERS_STRINGS.filters.filterTip(USERS_STRINGS.rolePicker.filterLabel, value ?? allLabel)}
      >
        {value ?? placeholder}
      </PopoverSelectTrigger>
      {/* At least as wide as the trigger, but never narrower than 18rem — the
          trigger sits in a compact toolbar and role names ("Business
          Development Manager") were being cut off in the list. */}
      <PopoverContent className="w-[max(var(--anchor-width),18rem)] p-0" align="start">
        <div className="border-b border-border p-2">
          <Input
            value={rawSearch}
            onChange={(e) => setRawSearch(e.target.value)}
            placeholder={USERS_STRINGS.rolePicker.searchPlaceholder}
            className="h-8 text-sm"
            autoFocus
          />
        </div>
        <div
          ref={setScrollerNode}
          onScroll={onScroll}
          onWheel={onWheel}
          className="max-h-64 overflow-y-auto p-1"
        >

          {isLoading && loadedRoles.length === 0 ? (
            <Typography asChild variant="helper" align="center" className="px-2 py-6"><div>
              {USERS_STRINGS.rolePicker.loading}
            </div></Typography>
          ) : isError ? (
            <Typography asChild variant="helper" tone="danger" align="center" className="px-2 py-6"><div>
              {USERS_STRINGS.rolePicker.loadError}
            </div></Typography>
          ) : loadedRoles.length === 0 && !pinned ? (
            <Typography asChild variant="helper" align="center" className="px-2 py-6"><div>
              {rawSearch ? USERS_STRINGS.rolePicker.noMatches : USERS_STRINGS.rolePicker.noRoles}
            </div></Typography>
          ) : (
            <>
              {pinned && (
                <RoleRow
                  key={`pinned-${pinned.name}`}
                  role={pinned}
                  selected
                  onPick={() => pick(pinned.name)}
                />
              )}
              {loadedRoles.map((role) => (
                <RoleRow
                  key={role.id}
                  role={role}
                  selected={value === role.name}
                  onPick={() => pick(role.name)}
                />
              ))}
              {hasNextPage && (
                <Typography
                  asChild
                  variant="caption"
                  align="center"
                  className="px-2 py-2"
                >
                  <div ref={setSentinelNode}>
                    {isFetchingNextPage ? USERS_STRINGS.rolePicker.loadingMore : USERS_STRINGS.rolePicker.scrollForMore}
                  </div>
                </Typography>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function RoleRow({
  role,
  selected,
  onPick,
}: {
  role: Role
  selected: boolean
  onPick: () => void
}) {
  return (
    <HoverTip text={role.name}>
      <button
        type="button"
        onClick={onPick}
        className={cn(
          'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm',
          'hover:bg-accent',
          selected && 'bg-accent/50',
        )}
      >
        <span className="min-w-0 flex-1 truncate">{role.name}</span>
      </button>
    </HoverTip>
  )
}
