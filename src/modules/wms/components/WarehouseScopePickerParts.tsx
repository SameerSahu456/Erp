import type { RefObject } from 'react'
import { Loader2, Search, Warehouse, X } from 'lucide-react'

import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Typography } from '@/components/ui/typography'
import { DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu'
import { TruncatedText } from '@/components/common/display/TruncatedText'

import { WAREHOUSE_SCOPE_PICKER_STRINGS } from './warehouse-scope-picker.strings'

interface PickerWarehouse {
  warehouse_id: string
  name: string
}

/** Static label for a scoped user with exactly one assignment. */
export function WarehouseScopeSingleChip({ only }: { only: PickerWarehouse | undefined }) {
  const chip = (
    <div className="flex h-9 items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3">
      <Warehouse className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <Typography variant="helper" truncate asChild>
        <span className="max-w-[min(40vw,360px)] font-medium">{only?.name ?? '—'}</span>
      </Typography>
    </div>
  )
  // The name can truncate, so surface the full value in a styled tooltip
  // (§0.14) — only when there is a name to show.
  return only?.name ? (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>{chip}</TooltipTrigger>
        <TooltipContent>{only.name}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : (
    chip
  )
}

interface WarehouseScopeSearchProps {
  search: string
  onSearchChange: (value: string) => void
}

export function WarehouseScopeSearch({ search, onSearchChange }: WarehouseScopeSearchProps) {
  return (
    <div className="relative p-1">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      {/* stopPropagation so the menu's typeahead doesn't swallow keys. */}
      <Input
        autoFocus
        type="text"
        autoComplete="off"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
        placeholder={WAREHOUSE_SCOPE_PICKER_STRINGS.search.placeholder}
        aria-label={WAREHOUSE_SCOPE_PICKER_STRINGS.search.ariaLabel}
        className="h-8 pl-8 pr-8"
      />
      {search && (
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
          aria-label={WAREHOUSE_SCOPE_PICKER_STRINGS.search.clearAriaLabel}
          // Keep focus in the search box so the operator can keep typing after
          // clearing; onClick still fires to reset.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onSearchChange('')}
        >
          <X className="size-3.5" aria-hidden />
        </button>
      )}
    </div>
  )
}

interface WarehouseScopeListContentProps {
  isFullAccess: boolean
  isLoading: boolean
  isFetchingNextPage: boolean
  list: PickerWarehouse[]
  emptyMsg: string
  isChecked: (id: string) => boolean
  onToggle: (id: string) => void
}

interface WarehouseScopeListProps extends WarehouseScopeListContentProps {
  scrollRef: RefObject<HTMLDivElement | null>
  sentinelRef: RefObject<HTMLDivElement | null>
}

/** Capped (~5 rows) scroll box of warehouses; full-access pages load as it scrolls. */
export function WarehouseScopeList({ scrollRef, sentinelRef, ...rest }: WarehouseScopeListProps) {
  return (
    <div ref={scrollRef} className="max-h-[150px] overflow-y-auto">
      <WarehouseScopeListContent {...rest} sentinelRef={sentinelRef} />
    </div>
  )
}

function WarehouseScopeListContent({
  sentinelRef,
  ...p
}: WarehouseScopeListContentProps & { sentinelRef: RefObject<HTMLDivElement | null> }) {
  if (p.isFullAccess && p.isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
      </div>
    )
  }
  if (p.list.length === 0) {
    return (
      <div className="px-2 py-3">
        <Typography variant="helper" tone="muted">
          {p.emptyMsg}
        </Typography>
      </div>
    )
  }
  return (
    <>
      {p.list.map((w) => (
        <DropdownMenuCheckboxItem
          key={w.warehouse_id}
          checked={p.isChecked(w.warehouse_id)}
          onCheckedChange={() => p.onToggle(w.warehouse_id)}
          closeOnClick={false}
        >
          <TruncatedText value={w.name} className="min-w-0 max-w-full" />
        </DropdownMenuCheckboxItem>
      ))}
      {/* Bottom sentinel — its entry triggers the next page. */}
      {p.isFullAccess && (
        <div ref={sentinelRef} className="flex items-center justify-center py-2">
          {p.isFetchingNextPage ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
          ) : null}
        </div>
      )}
    </>
  )
}
