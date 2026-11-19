import { useMemo, useState } from 'react'

import { usePermission } from '@shared/rbac'
import { useUsersByIds } from '@modules/users'

import { useWarehouseScope } from '../../context/warehouse-scope'
import { useScrapPendingPlacement } from '../devices/useDeviceScrap'
import { useVariantLabelMap } from '../material-issue/useVariantLabelMap'
import { toScrapQueueRow } from '../../components/scrap/scrap-placement-queue.columns'

const distinct = (values: readonly (string | null | undefined)[]) =>
  Array.from(new Set(values.filter((v): v is string => !!v)))

/**
 * Placement queue: condemned, unplaced units, server-paginated (§16.7) and scoped
 * to the navbar warehouses (empty = all assigned). Page resets on scope change.
 */
export function useScrapPlacementQueue() {
  const { pickerWarehouses, selectedWarehouseIds } = useWarehouseScope()
  const { can } = usePermission()

  const [page, setPage] = useState(1)
  const scopeKey = selectedWarehouseIds.join(',')
  const [prevScopeKey, setPrevScopeKey] = useState(scopeKey)
  if (scopeKey !== prevScopeKey) {
    setPrevScopeKey(scopeKey)
    setPage(1)
  }
  const query = useScrapPendingPlacement(selectedWarehouseIds, { page })
  const items = useMemo(() => query.data?.items ?? [], [query.data])

  // Warehouse names from the loaded picker list, variants batched per page (§11).
  const warehouseNameById = useMemo(
    () => new Map(pickerWarehouses.map((w) => [w.warehouse_id, w.name])),
    [pickerWarehouses],
  )
  const variantIds = useMemo(() => distinct(items.map((i) => i.part_variant_id)), [items])
  const variantLabelOf = useVariantLabelMap(variantIds)
  const canReadUsers = can('auth:users:read')
  const scrappedByIds = useMemo(() => distinct(items.map((i) => i.scrapped_by)), [items])
  const { displayNameById } = useUsersByIds(canReadUsers ? scrappedByIds : [])

  const rows = useMemo(
    () => items.map((i) => toScrapQueueRow(i, { variantLabelOf, warehouseNameById, displayNameById })),
    [items, variantLabelOf, warehouseNameById, displayNameById],
  )

  return { query, page, setPage, rows }
}
