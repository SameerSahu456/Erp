import { useMemo } from 'react'

import type { GrnBatchResponse, InwardSourceRow, POInwardSourceRow } from '../../../api'
import { buildPoLines } from './buildPoLines'
import {
  collectManualLineSerials,
  duplicateSerialSet,
  lineUnitCount,
  lineMissingSerial,
  componentIncomplete,
} from '../inward-lines/model'
import { returnUnitCount } from '../return-line-items-helpers'
import { buildReturnPayload } from './inward-form-helpers'
import { manualUnitCount } from '../manual-receive-lines-helpers'
import type { InwardFormFields } from './useInwardFormFields'

type StatusArgs = Pick<
  InwardFormFields,
  | 'isEdit'
  | 'poId'
  | 'lines'
  | 'returnState'
  | 'partLines'
  | 'manualState'
  | 'notes'
  | 'challanFiles'
  | 'returnWarehouseId'
  | 'staffDept'
  | 'staffEmpName'
  | 'staffEmpId'
  | 'transferFromId'
  | 'editDocsTouched'
> & {
  editBatch: GrnBatchResponse | undefined
  editBaseline: string | null
  isReturn: boolean
  isManual: boolean
  isStaffReturn: boolean
  selectedPo: POInwardSourceRow | undefined
  selectedReturn: InwardSourceRow | undefined
  isCreating: boolean
  /** The warehouse the form picked by itself; on its own it isn't an unsaved change. */
  autoWarehouseId: string
}

const poUnitCount = (lines: StatusArgs['lines']) =>
  lines.reduce((sum, l) => sum + lineUnitCount(l), 0)

/** Units entered so far (drives the create-mode dirty check). */
function enteredUnitCount(a: StatusArgs): number {
  if (!a.isReturn) return poUnitCount(a.lines)
  return a.isManual
    ? manualUnitCount(a.manualState)
    : returnUnitCount(a.returnState) + a.partLines.length
}

/** Units staged so far, by capture mode. */
function stagedUnitCount({
  isManual,
  isReturn,
  manualState,
  returnState,
  partLines,
  lines,
}: Pick<
  StatusArgs,
  'isManual' | 'isReturn' | 'manualState' | 'returnState' | 'partLines' | 'lines'
>): number {
  if (isManual) return manualUnitCount(manualState)
  return isReturn ? returnUnitCount(returnState) + partLines.length : poUnitCount(lines)
}

/** Pick the value for the active capture mode: manual (on-call) → return → PO. */
function pickByMode<T>(isManual: boolean, isReturn: boolean, v: { manual: T; ret: T; po: T }): T {
  if (isManual) return v.manual
  return isReturn ? v.ret : v.po
}

// Edit locks the header, so only lines, notes or documents can make it dirty.
function editIsDirty(a: StatusArgs): boolean {
  const editLinesDirty =
    a.editBaseline !== null &&
    JSON.stringify(
      a.isReturn ? buildReturnPayload(a.returnState, a.partLines) : buildPoLines(a.lines),
    ) !==
      a.editBaseline
  const editNotesDirty = a.notes.trim() !== (a.editBatch?.notes ?? '').trim()
  return editLinesDirty || editNotesDirty || a.editDocsTouched
}

const createIsDirty = (a: StatusArgs): boolean =>
  a.poId !== '' ||
  enteredUnitCount(a) > 0 ||
  a.notes.trim() !== '' ||
  a.challanFiles.length > 0 ||
  (a.returnWarehouseId !== '' && a.returnWarehouseId !== a.autoWarehouseId) ||
  [a.staffDept, a.staffEmpName, a.staffEmpId, a.transferFromId].some((v) => v !== '')

/** Manual (on-call) capture is complete when the who/where is filled in. */
const isManualReady = (a: StatusArgs): boolean =>
  a.isStaffReturn
    ? !!a.staffDept.trim() && !!a.staffEmpName.trim() && !!a.returnWarehouseId
    : !!a.transferFromId && !!a.returnWarehouseId

/** Derived wizard status: unsaved-changes dirtiness, staged unit count, and the
 *  continue / submit gates (with the BOM, tracked-serial and duplicate guards). */
export function useInwardFormStatus(a: StatusArgs) {
  const { isEdit, isReturn, isManual, lines, returnState, manualState } = a

  // Unsaved-changes guard: dirty once anything worth losing has been entered.
  const isDirty = isEdit ? editIsDirty(a) : createIsDirty(a)

  // Units staged so far.
  const stagedCount = useMemo(
    () =>
      stagedUnitCount({ isManual, isReturn, manualState, returnState, partLines: a.partLines, lines }),
    [isManual, manualState, isReturn, returnState, a.partLines, lines],
  )
  const manualReady = isManualReady(a)
  const returnReady = !!a.selectedReturn && !!a.returnWarehouseId
  const canContinue = pickByMode(isManual, isReturn, {
    manual: manualReady,
    ret: returnReady,
    po: !!a.selectedPo,
  })
  // Guard 2 (PO BOM): every ADDED component row must name its part. Serials
  // are optional — a label inside a device is often unreadable (D10).
  const bomIncomplete = useMemo(
    () => lines.some((l) => l.components.some(componentIncomplete)),
    [lines],
  )
  // Guard 3: a tracked line with a part picked must have a serial.
  const serialIncomplete = useMemo(() => lines.some(lineMissingSerial), [lines])
  // Guard 4: no serial twice in one batch (it would collide on finalize).
  // The backend still checks against existing stock.
  const hasDuplicateSerials = useMemo(
    () => duplicateSerialSet(collectManualLineSerials(lines)).size > 0,
    [lines],
  )
  const canSubmit =
    !a.isCreating &&
    pickByMode(isManual, isReturn, {
      manual: manualReady && stagedCount > 0,
      ret: returnReady,
      // An empty PO batch is allowed (opens "needs items"); only a PO needed.
      po: !!a.selectedPo && !bomIncomplete && !serialIncomplete && !hasDuplicateSerials,
    })

  return {
    isDirty,
    stagedCount,
    canContinue,
    canSubmit,
    bomIncomplete,
    serialIncomplete,
    hasDuplicateSerials,
  }
}
