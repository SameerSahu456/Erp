/** Controller behind `WorkAssignmentIssueBody`: selection, GRN deep link, device selection (D21) and submit. */
import { useMemo } from 'react'

import { useNavigateBack } from '@/hooks/use-navigate-back'

import { type WorkSelection } from '../../components/work-assignments/IssueStepWork'
import { MAX_UNITS_PER_ISSUE } from '../../constants/assignment'
import {
  useCreateWorkAssignment,
  useEligibleDevices,
  useEligibleEngineers,
  useEligibleSummary,
} from './useWorkAssignments'
import { useWorkAssignmentIssueState } from './useWorkAssignmentIssueState'
import { useWorkAssignmentIssueSubmit } from './useWorkAssignmentIssueSubmit'
import { canSubmitIssue, issueDeviceParams, issueScope } from './work-assignment-issue-helpers'

export function useWorkAssignmentIssue() {
  // §10 — Cancel / back returns to ORIGIN (the list, or the GRN a deep link came
  // from), restoring its state; only falls back to the list root on a fresh load.
  const navigateBack = useNavigateBack('/wms/work-assignments')
  const st = useWorkAssignmentIssueState()
  const { linkedGrnBatchId, warehouseId, stage, work, engineerId, quantity, categoryId } = st
  const { selectedOpIds, manualSelection, deviceSearch } = st

  const scope = issueScope(stage, warehouseId, categoryId)
  const summaryQuery = useEligibleSummary(scope)
  const engineersQuery = useEligibleEngineers(scope)
  const summaryGroups = useMemo(() => summaryQuery.data ?? [], [summaryQuery.data])
  // Derived, not set in an effect: a user choice wins via `work ?? deepLinkedWork`.
  const deepLinkedWork = useMemo<WorkSelection | null>(() => {
    if (!linkedGrnBatchId) return null
    const group = summaryGroups.find((g) => g.grn_batch_id === linkedGrnBatchId)
    if (!group) return null
    return {
      grnBatchId: group.grn_batch_id ?? null,
      partVariantId: null,
      available: group.pending_count,
    }
  }, [linkedGrnBatchId, summaryGroups])
  const effectiveWork = work ?? deepLinkedWork

  // Only the chosen line's devices are fetched, and only once a line is picked.
  const devicesQuery = useEligibleDevices(issueDeviceParams(scope, effectiveWork, deviceSearch))
  const create = useCreateWorkAssignment()

  // Memoised: a fresh [] each render would re-run every dependent useMemo.
  const engineers = useMemo(() => engineersQuery.data ?? [], [engineersQuery.data])
  const devices = useMemo(() => devicesQuery.data?.items ?? [], [devicesQuery.data])
  const available = Math.min(effectiveWork?.available ?? 0, MAX_UNITS_PER_ISSUE)
  // Defaults to everything waiting; the operator narrows it.
  const effectiveQuantity = quantity ?? available
  const takeCount = Math.min(effectiveQuantity, devices.length, MAX_UNITS_PER_ISSUE)

  // D21: manual mode submits the ticked set (empty = zero); count mode takes the first `takeCount` rows.
  // Search narrows what is shown, not what is selected; the server rejects devices taken meanwhile (409).
  const issuedOperationIds = useMemo(() => {
    if (manualSelection) return selectedOpIds
    return devices.slice(0, takeCount).map((device) => device.operation_id)
  }, [manualSelection, selectedOpIds, devices, takeCount])

  // In manual mode the field shows the ticked count, so it always agrees with the checkboxes.
  const displayedQuantity = manualSelection ? selectedOpIds.length : effectiveQuantity

  const canSubmit = canSubmitIssue({
    warehouseId,
    stage,
    effectiveWork,
    engineerId,
    issuedCount: issuedOperationIds.length,
    isPending: create.isPending,
  })

  // §3: dirty once work, engineer or quantity is picked (warehouse/stage alone are trivial to redo).
  const dirty =
    work !== null || engineerId !== null || quantity !== null || selectedOpIds.length > 0
  const { guard, handleSubmit } = useWorkAssignmentIssueSubmit(create, {
    warehouseId,
    stage,
    engineerId,
    issuedOperationIds,
    dirty,
  })

  return {
    navigateBack,
    activeWarehouses: st.activeWarehouses,
    warehouseId,
    stage,
    categoryId,
    changeWarehouse: st.changeWarehouse,
    changeStage: st.changeStage,
    changeCategory: st.changeCategory,
    selectWork: st.selectWork,
    summaryQuery,
    summaryGroups,
    effectiveWork,
    engineers,
    engineersQuery,
    engineerId,
    setEngineerId: st.setEngineerId,
    displayedQuantity,
    handleQuantityChange: st.handleQuantityChange,
    available,
    devices,
    devicesQuery,
    selectedOpIds,
    handleSelectionChange: st.handleSelectionChange,
    manualSelection,
    takeCount,
    deviceSearch,
    setDeviceSearch: st.setDeviceSearch,
    canSubmit,
    create,
    guard,
    handleSubmit,
  }
}
