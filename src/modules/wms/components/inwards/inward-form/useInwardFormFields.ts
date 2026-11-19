import { useMemo, useState } from 'react'

import type { GrnBatchResponse, GrnDraftLine, InwardType } from '../../../api'
import type { ManualLine } from '../inward-lines/model'
import { emptyReturnState, type ReturnState } from '../return-line-items-helpers'
import {
  emptyManualState,
  type ManualReceiveState,
} from '../manual-receive-lines-helpers'
import { isReplacementPartLine, type InwardEditMeta } from './inward-form-helpers'

/** Initial field values — prefilled from the batch in edit mode. */
function initialFields(editBatch: GrnBatchResponse | undefined, editMeta: InwardEditMeta | null) {
  const isEdit = !!editBatch
  return {
    step: isEdit ? 1 : 0,
    inwardType: (editBatch?.inward_type as InwardType) ?? 'purchase_order',
    poId: editBatch?.source_entity_id ?? '',
    origin: editMeta?.origin ?? 'new',
    returnWarehouseId: isEdit ? (editBatch?.to_warehouse_id ?? '') : '',
    notes: isEdit ? (editBatch?.notes ?? '') : '',
  }
}

/** Raw field state of the Inward wizard plus setters that reset related fields together. */
export function useInwardFormFields(editBatch: GrnBatchResponse | undefined) {
  // Edit mode (draft re-open): the source/header (Step 1) is fixed — only the
  // line items (Step 2) are editable. Prefill everything from the batch.
  const isEdit = !!editBatch
  const editMeta = (editBatch?.metadata ?? null) as InwardEditMeta | null
  // Faulty-part lines have their own editor (the owed-parts list), so keep
  // them apart from the returning-unit lines.
  const editAtomic = useMemo(
    () => (editMeta?._atomic_lines ?? []).filter((l) => !isReplacementPartLine(l)),
    [editMeta],
  )

  const init = initialFields(editBatch, editMeta)
  const [step, setStep] = useState(init.step)
  const [inwardType, setInwardType] = useState<InwardType>(init.inwardType)
  const [poId, setPoId] = useState(init.poId) // source id (PO/return)
  const [origin, setOrigin] = useState<'new' | 'refurbished'>(init.origin)
  // Changing origin re-filters the PO picker, so clear any picked PO to avoid a stale selection.
  const pickOrigin = (next: 'new' | 'refurbished') => {
    if (next === origin) return
    setOrigin(next)
    setPoId('')
    setLines([])
  }
  // PO flow: user-added receive lines (see InwardLineItems).
  const [lines, setLines] = useState<ManualLine[]>([])
  // Return flow: which dispatched units are coming back (see ReturnLineItems).
  const [returnState, setReturnState] = useState<ReturnState>(emptyReturnState)
  // Replacement return: faulty parts coming back on their own (spec D10, D15).
  const [partLines, setPartLines] = useState<GrnDraftLine[]>(() =>
    (editMeta?._atomic_lines ?? []).filter(isReplacementPartLine),
  )
  // Return flow needs an explicit destination warehouse (no single PO warehouse).
  const [returnWarehouseId, setReturnWarehouseId] = useState(init.returnWarehouseId)
  // Keep the picked destination's name so the details step never shows the raw id.
  const [returnWarehouseName, setReturnWarehouseName] = useState('')
  // Edit-mode only: set when a challan is uploaded or deleted.
  const [editDocsTouched, setEditDocsTouched] = useState(false)
  // Staff return / transfer inward have no source doc; the operator enters details by hand.
  const [staffDept, setStaffDept] = useState('')
  const [staffEmpName, setStaffEmpName] = useState('')
  const [staffEmpId, setStaffEmpId] = useState('')
  const [transferFromId, setTransferFromId] = useState('') // transfer: source warehouse
  const [manualState, setManualState] = useState<ManualReceiveState>(emptyManualState)
  // Seed from the batch in edit mode so existing notes show (and stay editable).
  const [notes, setNotes] = useState(init.notes)
  const [challanFiles, setChallanFiles] = useState<File[]>([])

  // Reset all source/line state when the chosen inward type changes.
  const resetForType = () => {
    setPoId('')
    setLines([])
    setReturnState(emptyReturnState())
    setPartLines([])
    setReturnWarehouseId('')
    setReturnWarehouseName('')
    setStaffDept('')
    setStaffEmpName('')
    setStaffEmpId('')
    setTransferFromId('')
    setManualState(emptyManualState())
  }

  // Store the name with the id so the details step never shows the raw id.
  const setReturnWarehouse = (id: string, name: string) => {
    setReturnWarehouseId(id)
    setReturnWarehouseName(name)
  }

  // Flip edit-mode dirtiness when a live challan doc is added/removed — edit
  // uploads hit the backend immediately, so the form isn't otherwise notified.
  const markDocsTouched = () => setEditDocsTouched(true)

  return {
    isEdit,
    editMeta,
    editAtomic,
    step,
    setStep,
    inwardType,
    setInwardType,
    poId,
    setPoId,
    origin,
    pickOrigin,
    lines,
    setLines,
    returnState,
    setReturnState,
    partLines,
    setPartLines,
    returnWarehouseId,
    setReturnWarehouseId,
    returnWarehouseName,
    setReturnWarehouse,
    editDocsTouched,
    markDocsTouched,
    staffDept,
    setStaffDept,
    staffEmpName,
    setStaffEmpName,
    staffEmpId,
    setStaffEmpId,
    transferFromId,
    setTransferFromId,
    manualState,
    setManualState,
    notes,
    setNotes,
    challanFiles,
    setChallanFiles,
    resetForType,
  }
}

export type InwardFormFields = ReturnType<typeof useInwardFormFields>
