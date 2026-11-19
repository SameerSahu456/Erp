import { DeviceIdentityActions } from './DeviceIdentityActions'
import { DeviceScrapActions } from './DeviceScrapActions'
import { DeviceStageActions, type StageAssigneeIds } from './DeviceStageActions'

interface DeviceHeaderActionsProps {
  deviceId: string
  /** Shown in the scrap / un-scrap dialog titles. */
  internalSerial: string
  /** `stock_items.status` — the availability fact Scrap/Un-scrap/Dispose act
   *  on. Distinct from `workflowStatus`, the pipeline stage. */
  deviceStatus: string
  /** Whether the unit currently holds a `warehouse_location_id` — Un-scrap's
   *  "Available" target additionally requires one (D9). */
  hasLocation: boolean
  /** `stock_items.scrap_prior_status` — what the unit was before it was
   *  condemned. Gates the un-scrap targets (D9). */
  scrapPriorStatus?: string | null
  workflowStatus: string
  warehouseId: string
  /** The device's inward batch — the source of the PO lines it may move
   *  between. Null for a device with no inward batch (legacy / manual stock),
   *  which has no line to re-link and so gets no button. */
  grnBatchId: string | null
  currentPoItemId?: string | null
  /** The engineer assigned to each per-device stage (CP-193 #5). */
  assigneeIds?: StageAssigneeIds
  onOpenInspectionForm: () => void
  onOpenRepairForm: () => void
  onOpenQcForm: () => void
  onOpenRack: () => void
}

/** Header actions for the device's current stage, gated by stage access (useWmsStageAccess).
 *  No own flex wrapper: they render into PageHeader's actions slot. */
export function DeviceHeaderActions(props: DeviceHeaderActionsProps) {
  const { deviceId, workflowStatus, warehouseId } = props
  return (
    <>
      <DeviceStageActions
        deviceId={deviceId}
        workflowStatus={workflowStatus}
        warehouseId={warehouseId}
        assigneeIds={props.assigneeIds}
        onOpenInspectionForm={props.onOpenInspectionForm}
        onOpenRepairForm={props.onOpenRepairForm}
        onOpenQcForm={props.onOpenQcForm}
        onOpenRack={props.onOpenRack}
      />
      <DeviceIdentityActions
        deviceId={deviceId}
        workflowStatus={workflowStatus}
        warehouseId={warehouseId}
        grnBatchId={props.grnBatchId}
        currentPoItemId={props.currentPoItemId}
      />
      <DeviceScrapActions
        deviceId={deviceId}
        internalSerial={props.internalSerial}
        deviceStatus={props.deviceStatus}
        workflowStatus={workflowStatus}
        hasLocation={props.hasLocation}
        scrapPriorStatus={props.scrapPriorStatus}
        warehouseId={warehouseId}
      />
    </>
  )
}
