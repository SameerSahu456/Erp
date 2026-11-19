import { useNavigate } from 'react-router-dom'

import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'

import {
  useCreateGrnBatch,
  useUpdateGrnBatchDraft,
} from '../../../hooks/inwards/useInwards'
import type { GrnBatchResponse, InwardSourceRow } from '../../../api'
import { RETURN_CFG } from './config'
import { emptyReturnState } from '../return-line-items-helpers'
import { useFlaggedSerials } from './useFlaggedSerials'
import { useInwardFormFields } from './useInwardFormFields'
import { useInwardSourceSelection } from './useInwardSourceSelection'
import { effectiveReturnWarehouse, useInwardWarehouses } from './useInwardWarehouses'
import { useInwardLineSeeding } from './useInwardLineSeeding'
import { useInwardFormStatus } from './useInwardFormStatus'
import { useInwardSubmit } from './useInwardSubmit'

export type { PoOption, ReturnOption } from './useInwardSourceSelection'

/** All state and handlers for the Inward wizard; the component is a thin shell (§14 #9). */
export function useInwardForm({ editBatch }: { editBatch?: GrnBatchResponse } = {}) {
  const navigate = useNavigate()
  const flaggedSerials = useFlaggedSerials()
  const f = useInwardFormFields(editBatch)
  const { isEdit, inwardType, step } = f

  // Everything that isn't a PO is received as a "return" — dispatched units
  // coming back — and shares the ReturnLineItems editor + buildReturnLines.
  const isReturn = inwardType !== 'purchase_order'
  const isSaleReturn = inwardType === 'sale_return'
  const isStaffReturn = inwardType === 'staff_return'
  const isTransferInward = inwardType === 'warehouse_transfer_inward'
  const isInternalTransfer = isStaffReturn || isTransferInward
  // Staff return + transfer inward are DOCUMENT-based (product decision
  // 2026-07-06): they are received against a real staff_requests /
  // warehouse_transfers source via the same picker as the other returns.
  // The earlier "on-call, sourceless" manual-capture path sent an empty
  // source_entity_id and always failed backend validation — it is retired
  // (isManual is permanently false; the manual-only state/helpers below are
  // now unreachable and slated for removal once the picker path is
  // seed-verified end-to-end). For transfers the destination warehouse is
  // taken from the picked row (RETURN_CFG.warehouseFromRow).
  const isManual = false
  const cfg = RETURN_CFG[inwardType]

  const createBatch = useCreateGrnBatch()
  const updateDraft = useUpdateGrnBatchDraft()

  const src = useInwardSourceSelection({ ...f, isReturn })
  const wh = useInwardWarehouses()
  // One warehouse in scope is the only answer, so return flows start with it.
  const rw = effectiveReturnWarehouse(f, wh.onlyWarehouse, isReturn && !cfg?.warehouseFromRow)
  const editBaseline = useInwardLineSeeding({
    ...f,
    isReturn,
    isManual,
    detailLoading: src.detailQuery.isLoading,
    receivableLines: src.receivableLines,
    returnLines: src.returnLines,
  })
  const status = useInwardFormStatus({
    ...f,
    returnWarehouseId: rw.id,
    autoWarehouseId: rw.autoId,
    editBatch,
    editBaseline,
    isReturn,
    isManual,
    isStaffReturn,
    selectedPo: src.selectedPo,
    selectedReturn: src.selectedReturn,
    isCreating: createBatch.isPending,
  })
  const guard = useUnsavedChangesGuard({ isDirty: status.isDirty })
  const { handleCreate, handleSave } = useInwardSubmit({
    ...f,
    returnWarehouseId: rw.id,
    editBatch,
    isReturn,
    isManual,
    isStaffReturn,
    cfg,
    selectedSource: src.selectedSource,
    selectedPo: src.selectedPo,
    hasUnitsToScan: src.returnLines.length > 0,
    createBatch,
    updateDraft,
    guard,
  })

  // Pick a return source: stage the warehouse for transfer inward (fixed to the
  // dispatch destination); other return types let the operator pick it.
  function pickReturnSource(v: string) {
    f.setPoId(v)
    f.setReturnState(emptyReturnState())
    f.setPartLines([])
    // Transfer inward must be received at the transfer's destination — take it
    // from the picked row (warehouseFromRow) and lock it. Other return types
    // let the operator choose, so clear it.
    if (cfg?.warehouseFromRow) {
      const row = src.sources.find((s) => s.source_entity_id === v) as
        | InwardSourceRow
        | undefined
      const id = row?.to_warehouse_id ?? ''
      f.setReturnWarehouse(id, id ? wh.warehouseName(id) : '')
    } else {
      f.setReturnWarehouse('', '')
    }
  }

  function reachable(index: number) {
    // In edit both tabs are reachable so the operator can flip back to review
    // Inward Details — that step renders read-only there (source + header are
    // locked); see the fieldset wrapper below.
    if (isEdit) return true
    return index <= step || (index === 1 && status.canContinue)
  }

  // Where Cancel / Back-link returns to: the batch devices page in edit, else
  // the Inward list.
  const backHref = isEdit ? `/wms/inward/${editBatch?.id}/devices` : '/wms/inward'
  const goCancel = () => guard.attempt(() => navigate(backHref, { replace: true }))

  return {
    // identity / mode
    isEdit,
    editBatch,
    backHref,
    goCancel,
    guard,
    // step
    step,
    setStep: f.setStep,
    reachable,
    // type + sub-type
    inwardType,
    setInwardType: f.setInwardType,
    resetForType: f.resetForType,
    isReturn,
    isSaleReturn,
    isStaffReturn,
    isInternalTransfer,
    isManual,
    cfg,
    origin: f.origin,
    setOrigin: f.pickOrigin,
    // sources / pickers
    sourcesQuery: src.sourcesQuery,
    sources: src.sources,
    selectedPo: src.selectedPo,
    selectedReturn: src.selectedReturn,
    returnSources: src.returnSources,
    usePoOptions: src.usePoOptions,
    useReturnOptions: src.useReturnOptions,
    pickReturnSource,
    setPoId: f.setPoId,
    detailQuery: src.detailQuery,
    receivableLines: src.receivableLines,
    returnLines: src.returnLines,
    legacyUnits: src.legacyUnits,
    expectedParts: src.expectedParts,
    // warehouses
    warehouses: wh.warehouses,
    warehouseName: wh.warehouseName,
    returnWarehouseId: rw.id,
    setReturnWarehouseId: f.setReturnWarehouseId,
    returnWarehouseName: rw.name,
    setReturnWarehouse: f.setReturnWarehouse,
    useScopedWarehouseOptions: wh.useScopedWarehouseOptions,
    warehouseOptionsKey: wh.warehouseOptionsKey,
    transferFromId: f.transferFromId,
    setTransferFromId: f.setTransferFromId,
    // manual capture
    staffDept: f.staffDept,
    setStaffDept: f.setStaffDept,
    staffEmpName: f.staffEmpName,
    setStaffEmpName: f.setStaffEmpName,
    staffEmpId: f.staffEmpId,
    setStaffEmpId: f.setStaffEmpId,
    manualState: f.manualState,
    setManualState: f.setManualState,
    // line state
    lines: f.lines,
    setLines: f.setLines,
    returnState: f.returnState,
    setReturnState: f.setReturnState,
    partLines: f.partLines,
    setPartLines: f.setPartLines,
    stagedCount: status.stagedCount,
    bomIncomplete: status.bomIncomplete,
    serialIncomplete: status.serialIncomplete,
    hasDuplicateSerials: status.hasDuplicateSerials,
    flaggedSerials,
    // documents
    challanFiles: f.challanFiles,
    setChallanFiles: f.setChallanFiles,
    markDocsTouched: f.markDocsTouched,
    notes: f.notes,
    setNotes: f.setNotes,
    // submit
    canContinue: status.canContinue,
    canSubmit: status.canSubmit,
    handleCreate,
    handleSave,
    createBatch,
    updateDraft,
  }
}

export type InwardForm = ReturnType<typeof useInwardForm>
