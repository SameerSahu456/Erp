/** Form state + reset rules for the issue-work wizard (composed by `useWorkAssignmentIssue`). */
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { asUuid } from '@shared/lib/validation'

import type { WorkAssignmentStage } from '../../api/work-assignments'
import { type WorkSelection } from '../../components/work-assignments/IssueStepWork'
import { MAX_UNITS_PER_ISSUE } from '../../constants/assignment'
import { useWarehouseScope } from '../../context/warehouse-scope'

export function useWorkAssignmentIssueState() {
  const { selectedWarehouseId, selectedWarehouseIds, warehouses } = useWarehouseScope()
  // §11.1: GRN deep-link params are untrusted — malformed ids are dropped, valid ones are only a hint.
  const [searchParams] = useSearchParams()
  const linkedWarehouseId = asUuid(searchParams.get('warehouse_id'))
  const linkedGrnBatchId = asUuid(searchParams.get('grn_batch_id'))
  // Only active warehouses can take a new lot, narrowed to the navbar pick (none = all);
  // a GRN deep link's warehouse stays pickable. Filter a copy (the RBAC list keeps inactive ones).
  const activeWarehouses = useMemo(
    () =>
      warehouses
        .filter(
          (w) =>
            w.is_active &&
            (!selectedWarehouseIds.length ||
              selectedWarehouseIds.includes(w.warehouse_id) ||
              w.warehouse_id === linkedWarehouseId),
        )
        .map((w) => ({ warehouse_id: w.warehouse_id, code: w.code, name: w.name })),
    [warehouses, selectedWarehouseIds, linkedWarehouseId],
  )

  const [warehouseId, setWarehouseId] = useState<string | null>(
    linkedWarehouseId ?? selectedWarehouseId,
  )
  // No default stage, except `inspection` when arriving from a GRN deep link (fresh units).
  const [stage, setStage] = useState<WorkAssignmentStage | ''>(
    linkedGrnBatchId ? 'inspection' : '',
  )
  const [work, setWork] = useState<WorkSelection | null>(null)
  const [engineerId, setEngineerId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState<number | null>(null)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  // Explicitly ticked devices, honoured verbatim in manual mode.
  const [selectedOpIds, setSelectedOpIds] = useState<string[]>([])
  // D21: false = quantity box (first N rows), true = checkboxes (exact ticked set). Explicit, never inferred.
  const [manualSelection, setManualSelection] = useState(false)
  // Settled (debounced) search term; the search box owns keystrokes so the wizard doesn't re-render.
  const [deviceSearch, setDeviceSearch] = useState('')

  // A checkbox change switches to manual mode; an empty array is a real zero.
  const handleSelectionChange = (operationIds: string[]) => {
    setManualSelection(true)
    setSelectedOpIds(operationIds)
  }

  // Editing "How many" hands control back to the count: leave manual mode and
  // drop the ticks so the first N rows are taken again.
  const handleQuantityChange = (next: number) => {
    setManualSelection(false)
    setSelectedOpIds([])
    setQuantity(next)
  }

  // Warehouse or stage changes invalidate the work, engineer, and quantity.
  const resetDownstream = () => {
    setWork(null)
    setEngineerId(null)
    setQuantity(null)
    setCategoryId(null)
    setSelectedOpIds([])
    setManualSelection(false)
    setDeviceSearch('')
  }

  /** Clear everything chosen under the previous work / category scope. */
  const resetSelection = () => {
    setQuantity(null)
    setSelectedOpIds([])
    setManualSelection(false)
    setDeviceSearch('')
  }

  const changeWarehouse = (next: string | null) => {
    setWarehouseId(next)
    resetDownstream()
  }
  const changeStage = (next: WorkAssignmentStage | '') => {
    setStage(next)
    resetDownstream()
  }
  // The work selection was made inside the previous category — its part may
  // not exist in the new one, so clearing it is the honest reset.
  const changeCategory = (id: string | null) => {
    setCategoryId(id)
    setWork(null)
    resetSelection()
  }
  // New GRN/part = a different device list; drop stale ticks + search and fall
  // back to the count, defaulted to everything waiting.
  const selectWork = (next: WorkSelection) => {
    setWork(next)
    resetSelection()
    setQuantity(Math.min(next.available, MAX_UNITS_PER_ISSUE))
  }

  return {
    activeWarehouses,
    linkedGrnBatchId,
    warehouseId,
    stage,
    work,
    engineerId,
    setEngineerId,
    quantity,
    categoryId,
    selectedOpIds,
    manualSelection,
    deviceSearch,
    setDeviceSearch,
    handleSelectionChange,
    handleQuantityChange,
    changeWarehouse,
    changeStage,
    changeCategory,
    selectWork,
  }
}
