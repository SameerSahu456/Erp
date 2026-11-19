import { useMemo, useState } from 'react'
import { Check, ChevronsUpDownIcon, Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'
import { useInfiniteDropdownLoader } from '@/shared/hooks'
import { usePermissionsInfinite, type PermissionItem } from '@modules/users'

import { ROLES_STRINGS } from './roles.strings'

function PermissionState({
  message,
  destructive,
}: {
  message: string
  destructive?: boolean
}) {
  return (
    <div
      className={cn(
        'px-2 py-6 text-center text-sm',
        destructive ? 'text-destructive' : 'text-muted-foreground',
      )}
    >
      {message}
    </div>
  )
}

export function PermissionCodeMultiSelect({
  value,
  onValueChange,
  disabled,
  placeholder = ROLES_STRINGS.permissionSelect.defaultPlaceholder,
}: {
  value: string[]
  onValueChange: (next: string[]) => void
  disabled: boolean
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [scrollerNode, setScrollerNode] = useState<HTMLDivElement | null>(null)
  const [sentinelNode, setSentinelNode] = useState<HTMLDivElement | null>(null)

  const query = usePermissionsInfinite({
    enabled: open && !disabled,
    search,
  })

  const loadedPermissions = useMemo<PermissionItem[]>(
    () => (query.data?.pages ?? []).flatMap((page) => page.items),
    [query.data?.pages],
  )
  const loadedCodes = useMemo(
    () => new Set(loadedPermissions.map((item) => item.code)),
    [loadedPermissions],
  )
  // Pin already-selected permission codes that haven't surfaced in the
  // current page of API results — keeps the user from "losing" their
  // selection while scrolling. Strict search: when the user has typed a
  // term, only pin selections whose code itself contains the term, so
  // a search for "amishtet" stays empty instead of revealing every
  // currently-assigned permission.
  const pinnedSelected = useMemo<PermissionItem[]>(() => {
    const term = search.trim().toLowerCase()
    return value
      .filter((code) => !loadedCodes.has(code))
      .filter((code) => term === "" || code.toLowerCase().includes(term))
      .map((code) => ({ id: -1, code, description: null }))
  }, [value, loadedCodes, search])

  function toggle(code: string) {
    onValueChange(
      value.includes(code) ? value.filter((item) => item !== code) : [...value, code],
    )
  }

  const { onScroll, onWheel } = useInfiniteDropdownLoader({
    open,
    scrollerNode,
    sentinelNode,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
    loadedCount: loadedPermissions.length,
  })

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (disabled) return
        setOpen(next)
        if (!next) setSearch('')
      }}
    >
      <div className="space-y-2">
        <PopoverTrigger
          disabled={disabled}
          data-slot="input"
          className={cn(
            'flex min-h-10 w-full items-center justify-between gap-2 rounded-[7px] border border-input bg-background px-3 py-1.5 text-sm shadow-xs',
            'cursor-pointer transition-colors',
            disabled && 'cursor-not-allowed opacity-60',
          )}
        >
          <div className="min-w-0 flex-1 text-left">
            {value.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              <span>{ROLES_STRINGS.permissionSelect.selectedCount(value.length)}</span>
            )}
          </div>
          <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
        </PopoverTrigger>

        <PopoverContent className="w-[var(--anchor-width)] p-0" align="start">
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={ROLES_STRINGS.permissionSelect.searchPlaceholder}
                className="h-8 pl-9 text-sm"
                autoFocus
              />
            </div>
          </div>
          <div
            ref={setScrollerNode}
            onScroll={onScroll}
            onWheel={onWheel}
            className="max-h-64 overflow-y-auto p-1"
          >
            {query.isLoading && loadedPermissions.length === 0 ? (
              <PermissionState message={ROLES_STRINGS.permissionSelect.loading} />
            ) : query.isError ? (
              <PermissionState
                message={
                  query.error instanceof Error
                    ? query.error.message
                    : ROLES_STRINGS.permissionSelect.loadError
                }
                destructive
              />
            ) : loadedPermissions.length === 0 && pinnedSelected.length === 0 ? (
              <PermissionState
                message={
                  search.trim()
                    ? ROLES_STRINGS.permissionSelect.noMatchSearch
                    : ROLES_STRINGS.permissionSelect.noPermissions
                }
              />
            ) : (
              <>
                {pinnedSelected.map((permission) => (
                  <PermissionOption
                    key={`pinned-${permission.code}`}
                    permission={permission}
                    selected
                    onToggle={() => toggle(permission.code)}
                  />
                ))}
                {loadedPermissions.map((permission) => (
                  <PermissionOption
                    key={permission.id}
                    permission={permission}
                    selected={value.includes(permission.code)}
                    onToggle={() => toggle(permission.code)}
                  />
                ))}
                {query.hasNextPage && (
                  <Typography
                    asChild
                    variant="caption"
                    align="center"
                    className="px-2 py-2"
                  >
                    <div ref={setSentinelNode}>
                      {query.isFetchingNextPage
                        ? ROLES_STRINGS.permissionSelect.loadingMore
                        : ROLES_STRINGS.permissionSelect.scrollForMore}
                    </div>
                  </Typography>
                )}
              </>
            )}
          </div>
        </PopoverContent>
      </div>
    </Popover>
  )
}

function PermissionOption({
  permission,
  selected,
  onToggle,
}: {
  permission: PermissionItem
  selected: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm',
        'hover:bg-accent',
        selected && 'bg-accent/50',
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border',
          selected ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
        )}
      >
        {selected && <Check className="size-3" />}
      </span>
      <span className="min-w-0">
        <span className="block break-all font-medium">{permission.code}</span>
        {permission.description ? (
          <Typography variant="helper" className="block">{permission.description}</Typography>
        ) : null}
      </span>
    </button>
  )
}
