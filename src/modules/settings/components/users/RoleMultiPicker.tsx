import { useMemo, useState } from 'react'
import { Check, ChevronsUpDownIcon, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Typography } from '@/components/ui/typography'
import { useInfiniteDropdownLoader } from '@/shared/hooks'
import { useRolesInfinite, type Role } from '@modules/users'

import { USERS_STRINGS } from './users.strings'

// Multi-select picker for role names. API-backed, scroll-to-load-more
// dropdown (Coding-guideline §16.11):
//   • opens → fetches first page via `useRolesInfinite` (page size =
//     `PAGINATION.DEFAULT_PAGE_SIZE`, set inside the hook)
//   • IntersectionObserver fires `fetchNextPage` when the sentinel scrolls
//     into view — more roles become available as the user scrolls
//   • Click toggles selection; selected roles render checkmarks
//   • Search is sent to the backend so the list stays API-driven
//   • Selected names that haven't been loaded yet are NOT silently dropped:
//     they always appear as chips in the trigger and as pinned rows at the
//     top of the dropdown, so re-opening the editor for a user with rare
//     roles never loses the selection

interface RoleMultiPickerProps {
  value: string[]
  onValueChange: (next: string[]) => void
  placeholder?: string
  disabled?: boolean
}

export function RoleMultiPicker({
  value,
  onValueChange,
  placeholder = USERS_STRINGS.roleMultiPicker.placeholder,
  disabled,
}: RoleMultiPickerProps) {
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

  const loadedRoles = useMemo<Role[]>(() => {
    // Dedupe by id — paginated pages can overlap, which would otherwise
    // produce duplicate React keys in the dropdown list.
    const flat = (data?.pages ?? []).flatMap((p) => p.items)
    const seen = new Set<number>()
    const out: Role[] = []
    for (const r of flat) {
      if (seen.has(r.id)) continue
      seen.add(r.id)
      out.push(r)
    }
    return out
  }, [data?.pages])

  // Selected names that don't appear in the loaded pages yet. We surface
  // them as synthetic top-of-list rows so the picker never appears to drop
  // a selection just because that page hasn't been fetched. Synthetic
  // rows use id=-1 — the toggle handler keys off `name`, not `id`.
  const loadedNames = useMemo(() => new Set(loadedRoles.map((r) => r.name)), [
    loadedRoles,
  ])
  const pinnedSelected = useMemo<Role[]>(
    () =>
      value.filter((name) => !loadedNames.has(name)).map((name) => ({
        id: -1,
        name,
        channel_tags: [],
        allowed_manager_role_ids: [],
      })),
    [value, loadedNames],
  )

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

  function toggle(name: string) {
    const next = value.includes(name)
      ? value.filter((n) => n !== name)
      : [...value, name]
    onValueChange(next)
  }

  function removeChip(name: string, e: React.MouseEvent) {
    e.stopPropagation()
    onValueChange(value.filter((n) => n !== name))
  }

  const empty = value.length === 0

  return (
    <Popover open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
      <div className="relative w-full">
        <PopoverTrigger
          disabled={disabled}
          data-slot="input"
          className={cn(
            'flex min-h-10 w-full items-center justify-between gap-2 rounded-[7px] border border-input bg-background px-3 py-1.5 text-sm shadow-xs',
            'cursor-pointer transition-colors',
            disabled && 'cursor-not-allowed opacity-60',
          )}
        >
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
            {empty ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              value.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 text-xs"
                >
                  {name}
                  {!disabled && (
                    // `span role="button"` — the chip sits inside the
                    // PopoverTrigger <button>, and a nested <button> is
                    // invalid HTML. `onPointerDown` stops the trigger from
                    // toggling the popover when the chip is removed.
                    <span
                      role="button"
                      aria-label={USERS_STRINGS.roleMultiPicker.removeChip(name)}
                      onPointerDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                      onClick={(e) => removeChip(name, e)}
                      className="inline-flex cursor-pointer rounded p-0.5 hover:bg-secondary-foreground/10"
                    >
                      <X className="size-3" />
                    </span>
                  )}
                </span>
              ))
            )}
          </div>
          <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
        </PopoverTrigger>
      </div>
      <PopoverContent className="w-[var(--anchor-width)] p-0" align="start">
        <div className="border-b border-border p-2">
          <Input
            value={rawSearch}
            onChange={(e) => setRawSearch(e.target.value)}
            placeholder={USERS_STRINGS.roleMultiPicker.searchPlaceholder}
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
              {USERS_STRINGS.roleMultiPicker.loading}
            </div></Typography>
          ) : isError ? (
            <Typography asChild variant="helper" tone="danger" align="center" className="px-2 py-6"><div>
              {USERS_STRINGS.roleMultiPicker.loadError}
            </div></Typography>
          ) : loadedRoles.length === 0 && pinnedSelected.length === 0 ? (
            <Typography asChild variant="helper" align="center" className="px-2 py-6"><div>
              {rawSearch ? USERS_STRINGS.roleMultiPicker.noMatches : USERS_STRINGS.roleMultiPicker.noRoles}
            </div></Typography>
          ) : (
            <>
              {pinnedSelected.map((role) => (
                <RoleRow
                  key={`pinned-${role.name}`}
                  role={role}
                  selected
                  onToggle={() => toggle(role.name)}
                />
              ))}
              {loadedRoles.map((role) => (
                <RoleRow
                  key={role.id}
                  role={role}
                  selected={value.includes(role.name)}
                  onToggle={() => toggle(role.name)}
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
                    {isFetchingNextPage ? USERS_STRINGS.roleMultiPicker.loadingMore : USERS_STRINGS.roleMultiPicker.scrollForMore}
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
  onToggle,
}: {
  role: Role
  selected: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm',
        'hover:bg-accent',
        selected && 'bg-accent/50',
      )}
    >
      <span
        className={cn(
          'flex size-4 shrink-0 items-center justify-center rounded border',
          selected
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-input',
        )}
      >
        {selected && <Check className="size-3" />}
      </span>
      <span className="min-w-0 flex-1 truncate">{role.name}</span>
    </button>
  )
}
