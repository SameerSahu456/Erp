import { ChevronDown, Warehouse } from 'lucide-react'

import { Typography } from '@/components/ui/typography'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { useWarehouseScopePicker } from '../hooks/warehouses/useWarehouseScopePicker'
import {
  WarehouseScopeList,
  WarehouseScopeSearch,
  WarehouseScopeSingleChip,
} from './WarehouseScopePickerParts'
import { WAREHOUSE_SCOPE_PICKER_STRINGS } from './warehouse-scope-picker.strings'

// A scoped user's assignment list is small and already loaded, so it only grows
// a search box past this many rows. A full-access user always searches (server `q`).
const SEARCH_THRESHOLD = 4

/**
 * Navbar warehouse switcher — a MULTI-select. Shown to any WMS user with at
 * least one pickable warehouse: a scoped WM/SM picks from their assignments; a
 * full-access admin / superuser picks from EVERY active warehouse, streamed in
 * 10-at-a-time on scroll (§16.11 — no fetch-all). Checking several warehouses
 * scopes every WMS view to the UNION of them; checking none ("All …") is
 * un-scoped. One assignment renders a static label (nothing to switch to).
 */
export function WarehouseScopePicker() {
  const {
    pickerWarehouses,
    selectedWarehouseIds,
    setSelectedWarehouseIds,
    isFullAccess,
    isSingle,
    isLoading,
    open,
    setOpen,
    search,
    setSearch,
    infiniteIsLoading,
    infiniteItems,
    isFetchingNextPage,
    scopedFiltered,
    scrollRef,
    sentinelRef,
  } = useWarehouseScopePicker()

  if (isLoading) return null
  // Nothing to pick — a non-admin with no assignment.
  if (!isFullAccess && pickerWarehouses.length === 0) return null

  const allLabel = WAREHOUSE_SCOPE_PICKER_STRINGS.allWarehouses

  // A scoped user with exactly one assignment has nothing to switch to — show a
  // static label. Full-access users always get the dropdown.
  if (isSingle && !isFullAccess) {
    return <WarehouseScopeSingleChip only={pickerWarehouses[0]} />
  }

  const selectedSet = new Set(selectedWarehouseIds)
  const count = selectedWarehouseIds.length
  // The selected name resolves from the full RBAC set, so the label stays
  // correct even for a warehouse never scrolled to in the paged list.
  const single =
    count === 1 ? pickerWarehouses.find((w) => w.warehouse_id === selectedWarehouseIds[0]) : undefined
  const showSearch = isFullAccess || pickerWarehouses.length > SEARCH_THRESHOLD
  // 0 = un-scoped ("All …"); 1 = that warehouse (name only); N = "N warehouses".
  const label =
    count === 0
      ? allLabel
      : count === 1
        ? (single?.name ?? WAREHOUSE_SCOPE_PICKER_STRINGS.oneWarehouse)
        : WAREHOUSE_SCOPE_PICKER_STRINGS.warehouseCount(count)

  const list = isFullAccess ? infiniteItems : scopedFiltered
  const emptyMsg = search.trim()
    ? WAREHOUSE_SCOPE_PICKER_STRINGS.empty.match
    : WAREHOUSE_SCOPE_PICKER_STRINGS.empty.none

  const toggle = (id: string) => {
    setSelectedWarehouseIds(
      selectedSet.has(id)
        ? selectedWarehouseIds.filter((x) => x !== id)
        : [...selectedWarehouseIds, id],
    )
  }

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) setSearch('')
      }}
    >
      <DropdownMenuTrigger
        // Canonical dropdown-trigger frame (matches ui/select + PopoverSelectTrigger).
        className="flex h-10 w-[240px] items-center gap-2 rounded-[7px] border border-input bg-card px-[10px] shadow-xs outline-none transition-colors focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring"
        aria-label={WAREHOUSE_SCOPE_PICKER_STRINGS.triggerAriaLabel}
      >
        <Warehouse className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <Typography variant="body-strong" truncate asChild>
          <span className="block min-w-0 flex-1 text-left">{label}</span>
        </Typography>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      {/* Checkbox items keep the menu open (closeOnClick=false) so several can
          be picked in one go. */}
      <DropdownMenuContent align="end" className="w-[260px]">
        {showSearch && (
          <>
            <WarehouseScopeSearch search={search} onSearchChange={setSearch} />
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuCheckboxItem
          checked={count === 0}
          onCheckedChange={() => setSelectedWarehouseIds([])}
          closeOnClick={false}
        >
          <Typography variant="body-strong" asChild>
            <span>{allLabel}</span>
          </Typography>
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <WarehouseScopeList
          scrollRef={scrollRef}
          sentinelRef={sentinelRef}
          isFullAccess={isFullAccess}
          isLoading={infiniteIsLoading}
          isFetchingNextPage={isFetchingNextPage}
          list={list}
          emptyMsg={emptyMsg}
          isChecked={(id) => selectedSet.has(id)}
          onToggle={toggle}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
