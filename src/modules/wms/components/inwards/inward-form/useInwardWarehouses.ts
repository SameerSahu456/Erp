import { useMemo } from 'react'

import { makeStaticAsyncOptions } from '@/components/ui/async-select'
import { PAGINATION } from '@/shared/constants'

import {
  useWarehousesPaged,
  useWarehouseFilterOptions,
} from '../../../hooks/warehouses/useWarehouses'
import { useWarehouseScope } from '../../../context/warehouse-scope'

type WarehousePick = { id: string; name: string }

/** The return destination: the operator's pick, else the only warehouse in
 *  scope when `applies` (a transfer's warehouse comes from the transfer). */
export function effectiveReturnWarehouse(
  picked: { returnWarehouseId: string; returnWarehouseName: string },
  only: WarehousePick | null,
  applies: boolean,
) {
  const auto = applies ? only : null
  return {
    id: picked.returnWarehouseId || auto?.id || '',
    name: picked.returnWarehouseName || auto?.name || '',
    /** Picked by the form itself, so on its own not an unsaved change. */
    autoId: auto?.id ?? '',
  }
}

/** Warehouse name lookup + the navbar-scoped return-destination options. */
export function useInwardWarehouses() {
  const { selectedWarehouseIds, pickerWarehouses, isFullAccess } = useWarehouseScope()

  // Return flows pick a destination; the PO flow's comes on the PO row.
  const warehousesPage = useWarehousesPaged({
    page: 1,
    page_size: PAGINATION.MAX_PAGE_SIZE,
    is_active: true,
  })
  const warehouses = useMemo(() => warehousesPage.data?.items ?? [], [warehousesPage.data])
  const warehouseName = (id: string) => warehouses.find((w) => w.id === id)?.name ?? '—'

  // Return destinations follow the navbar warehouse filter. The admin "all" case is
  // infinite, so ReturnSourcePicker remounts via `warehouseOptionsKey` to keep hook order.
  const warehouseFilterOptions = useWarehouseFilterOptions()
  const hasWarehouseScope = selectedWarehouseIds.length > 0
  const useScopedWarehouseOptions = useMemo(() => {
    if (!isFullAccess) {
      const src = hasWarehouseScope
        ? pickerWarehouses.filter((w) => selectedWarehouseIds.includes(w.warehouse_id))
        : pickerWarehouses
      return makeStaticAsyncOptions(
        src.map((w) => ({ id: w.warehouse_id, label: w.name })),
        (o) => o.label,
      )
    }
    if (hasWarehouseScope) {
      return makeStaticAsyncOptions(
        warehouses
          .filter((w) => selectedWarehouseIds.includes(w.id))
          .map((w) => ({ id: w.id, label: w.name })),
        (o) => o.label,
      )
    }
    return warehouseFilterOptions
  }, [
    isFullAccess,
    hasWarehouseScope,
    selectedWarehouseIds,
    pickerWarehouses,
    warehouses,
    warehouseFilterOptions,
  ])
  // Flips only across the static↔infinite boundary, so ReturnSourcePicker can key
  // its remount there and keep AsyncSelect's internal hook order stable.
  const warehouseOptionsKey = isFullAccess && !hasWarehouseScope ? 'all' : 'scoped'

  // The destination when the scoped list holds exactly one warehouse — the form
  // starts with it picked. The admin "all" list is open-ended, so never there.
  const scopedList = isFullAccess
    ? warehouses
        .filter((w) => selectedWarehouseIds.includes(w.id))
        .map((w) => ({ id: w.id, name: w.name }))
    : pickerWarehouses
        .filter((w) => !hasWarehouseScope || selectedWarehouseIds.includes(w.warehouse_id))
        .map((w) => ({ id: w.warehouse_id, name: w.name }))
  const onlyWarehouse =
    (!isFullAccess || hasWarehouseScope) && scopedList.length === 1 ? scopedList[0] : null

  return { warehouses, warehouseName, useScopedWarehouseOptions, warehouseOptionsKey, onlyWarehouse }
}
