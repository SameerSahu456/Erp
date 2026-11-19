import { useNavigate } from 'react-router-dom'

import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
import { useUploadAttachment } from '@modules/attachments'

import {
  useCreateGrnBatch,
  useUpdateGrnBatchDraft,
} from '../../../hooks/inwards/useInwards'
import type {
  GrnBatchCreate,
  GrnBatchResponse,
  GrnBatchUpdate,
  InwardSourceRow,
  InwardType,
  POInwardSourceRow,
} from '../../../api'
import type { RETURN_CFG } from './config'
import { buildPoLines } from './buildPoLines'
import { buildManualLines } from '../manual-receive-lines-helpers'
import {
  buildDescLabels,
  buildOffpoLabels,
  buildReturnPayload,
} from './inward-form-helpers'
import type { InwardFormFields } from './useInwardFormFields'

type SubmitArgs = Pick<
  InwardFormFields,
  | 'inwardType'
  | 'origin'
  | 'lines'
  | 'returnState'
  | 'partLines'
  | 'manualState'
  | 'returnWarehouseId'
  | 'staffDept'
  | 'staffEmpName'
  | 'staffEmpId'
  | 'transferFromId'
  | 'notes'
  | 'challanFiles'
> & {
  editBatch: GrnBatchResponse | undefined
  isReturn: boolean
  isManual: boolean
  isStaffReturn: boolean
  cfg: (typeof RETURN_CFG)[InwardType]
  selectedSource: POInwardSourceRow | InwardSourceRow | undefined
  selectedPo: POInwardSourceRow | undefined
  /** Rental return: the request still owes units that went out on a dispatch. */
  hasUnitsToScan: boolean
  createBatch: ReturnType<typeof useCreateGrnBatch>
  updateDraft: ReturnType<typeof useUpdateGrnBatchDraft>
  guard: ReturnType<typeof useUnsavedChangesGuard>
}

/** Build the create body for the chosen flow (on-call manual / return / PO),
 *  or null when the flow's required source isn't picked. */
function buildCreateBody(a: SubmitArgs): GrnBatchCreate | null {
  const { inwardType, cfg, lines } = a
  let body: GrnBatchCreate
  if (a.isManual) {
    // On-call inward: no source doc, so source_entity_id is empty; context goes in metadata.
    if (!cfg) return null
    body = {
      inward_type: inwardType,
      source_entity_type: cfg.sourceEntityType,
      source_entity_id: '',
      to_warehouse_id: a.returnWarehouseId,
      lines: buildManualLines(a.manualState),
    }
    body.metadata = a.isStaffReturn
      ? {
          staff_capture: {
            department: a.staffDept.trim(),
            employee_name: a.staffEmpName.trim(),
            employee_id: a.staffEmpId.trim(),
          },
        }
      : { transfer_capture: { from_warehouse_id: a.transferFromId } }
  } else if (a.isReturn) {
    if (!a.selectedSource) return null
    // source_entity_type must match inward_type (see RETURN_CFG).
    if (!cfg) return null
    body = {
      inward_type: inwardType,
      source_entity_type: cfg.sourceEntityType,
      source_entity_id: a.selectedSource.source_entity_id,
      to_warehouse_id: a.returnWarehouseId,
      lines: buildReturnPayload(a.returnState, a.partLines),
    }
  } else {
    if (!a.selectedSource) return null
    if (!a.selectedPo) return null
    body = {
      inward_type: 'purchase_order',
      source_entity_type: 'purchase_orders',
      source_entity_id: a.selectedPo.source_entity_id,
      to_warehouse_id: a.selectedPo.warehouse_id,
      origin: a.origin,
      lines: buildPoLines(lines),
    }
    // Off-PO items carry only a part_variant_id in the atomic line, so stash
    // their display labels on the batch metadata for the finalize page.
    const offpoLabels = buildOffpoLabels(lines)
    const descLabels = buildDescLabels(lines)
    const meta: Record<string, unknown> = {}
    if (Object.keys(offpoLabels).length > 0) meta.offpo_labels = offpoLabels
    if (Object.keys(descLabels).length > 0) meta.desc_labels = descLabels
    if (Object.keys(meta).length > 0) body.metadata = meta as GrnBatchCreate['metadata']
  }
  if (a.notes.trim()) body.notes = a.notes.trim()
  return body
}

/** The staged lines for an edit PATCH, by capture mode. */
function editLinesFor(a: SubmitArgs) {
  if (a.isManual) return buildManualLines(a.manualState)
  if (a.isReturn) return buildReturnPayload(a.returnState, a.partLines)
  return buildPoLines(a.lines)
}

/** Build the edit-mode PATCH body (staged lines + preserved metadata + notes). */
function buildSaveBody(a: SubmitArgs, editBatch: GrnBatchResponse): GrnBatchUpdate {
  const { lines } = a
  const nextLines = editLinesFor(a)
  const body: GrnBatchUpdate = { lines: nextLines }
  // PATCH replaces metadata (keeps only `_` keys), so echo the keys we want to keep.
  const existingMeta = (editBatch.metadata ?? {}) as Record<string, unknown>
  const preserved: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(existingMeta)) {
    if (!k.startsWith('_')) preserved[k] = v
  }
  if (!a.isReturn && !a.isManual) {
    const offpoLabels = buildOffpoLabels(lines)
    // Recompute off-PO labels from the current lines (drop when none remain).
    if (Object.keys(offpoLabels).length > 0) preserved.offpo_labels = offpoLabels
    else delete preserved.offpo_labels
    // Same for the description-line part labels (see buildDescLabels).
    const descLabels = buildDescLabels(lines)
    if (Object.keys(descLabels).length > 0) preserved.desc_labels = descLabels
    else delete preserved.desc_labels
  }
  if (Object.keys(preserved).length > 0) {
    body.metadata = preserved as GrnBatchUpdate['metadata']
  }
  // Notes stay editable in edit mode — always send the current value so an
  // added / changed / cleared note persists (null clears it).
  body.notes = a.notes.trim() || null
  return body
}

/** Create (new batch) and Save (edit draft) handlers for the Inward wizard. */
export function useInwardSubmit(a: SubmitArgs) {
  const navigate = useNavigate()
  const uploadChallan = useUploadAttachment()
  const { createBatch, updateDraft, guard, editBatch } = a

  async function handleCreate() {
    const body = buildCreateBody(a)
    if (!body) return
    try {
      const batch = await createBatch.mutateAsync(body)
      // Best-effort challan upload; `silent` skips the success toast, errors still toast.
      for (const file of a.challanFiles) {
        await uploadChallan
          .mutateAsync({
            file,
            document_type: 'delivery_challan',
            entity_type: 'grn_batches',
            entity_id: batch.id,
            silent: true,
          })
          .catch(() => {})
      }
      // Land on the new batch's detail (devices) page so the operator can go
      // straight to receiving — not back to the Inward list.
      guard.bypassOnce()
      // Pop the guard sentinel first so Back from the devices page skips the form.
      await guard.popSentinelIfPresent()
      // A rental return's dispatched units are scanned box by box next; one
      // owing only migrated units (ticked on the form) goes straight to review.
      const next = a.inwardType === 'rental_return' && a.hasUnitsToScan ? 'rental-scan' : 'devices'
      navigate(`/wms/inward/${batch.id}/${next}`, { replace: true })
    } catch {
      /* createBatch.onError toasts */
    }
  }

  // Edit mode: PATCH the draft's staged line items only (the source/header is
  // fixed). Re-stage the rebuilt lines; preserve off-PO labels for the PO flow.
  async function handleSave() {
    if (!editBatch) return
    const body = buildSaveBody(a, editBatch)
    try {
      await updateDraft.mutateAsync({ id: editBatch.id, body })
      // Saving is a clean exit — drop the guard and pop its sentinel before the
      // programmatic navigation, so Back from the devices page doesn't prompt.
      guard.bypassOnce()
      await guard.popSentinelIfPresent()
      navigate(`/wms/inward/${editBatch.id}/devices`, { replace: true })
    } catch {
      /* updateDraft.onError toasts */
    }
  }

  return { handleCreate, handleSave }
}
