import { Check, MapPin, Microscope, ScanLine } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useAuth } from '@shared/auth/use-auth'

import { useStartInspection } from '../../../hooks/inspection/useInspection'
import { useWmsStageAccess } from '../../../hooks/operations/useStageAccess'
import { useStartQc } from '../../../hooks/qc/useQc'
import { useStartRepair } from '../../../hooks/repair/useRepair'
import { DEVICE_HEADER_ACTIONS_STRINGS as S } from './device-header-actions.strings'
import { visibleStageActions, type StageAssigneeIds } from './device-stage-actions-helpers'

export type { StageAssigneeIds }

interface DeviceStageActionsProps {
  deviceId: string
  workflowStatus: string
  warehouseId: string
  assigneeIds?: StageAssigneeIds
  onOpenInspectionForm: () => void
  onOpenRepairForm: () => void
  onOpenQcForm: () => void
  onOpenRack: () => void
}

/** The current stage's action, shown only to the stage assignee or a manager (CP-193 #5),
 *  so engineers never see a button the API rejects. */
export function DeviceStageActions({
  deviceId,
  workflowStatus: wf,
  warehouseId,
  assigneeIds,
  onOpenInspectionForm,
  onOpenRepairForm,
  onOpenQcForm,
  onOpenRack,
}: DeviceStageActionsProps) {
  const { canStage, isManager, isAdmin } = useWmsStageAccess()
  const { user } = useAuth()
  const isStageAssignee = (assigneeId?: string | null): boolean =>
    isManager || isAdmin || (!!user?.id && !!assigneeId && user.id === assigneeId)
  const startInspection = useStartInspection()
  const startRepair = useStartRepair()
  const startQc = useStartQc()
  const busy = startInspection.isPending || startRepair.isPending || startQc.isPending

  const show = visibleStageActions(wf, warehouseId, assigneeIds, { canStage, isStageAssignee })

  const openQc = () => {
    if (wf === 'pending_qc') {
      startQc.mutate({ id: deviceId, body: {} }, { onSuccess: onOpenQcForm })
    } else {
      onOpenQcForm()
    }
  }

  return (
    <>
      {show.startInspection && (
        <Button
          disabled={busy}
          onClick={() =>
            startInspection.mutate({ id: deviceId, body: {} }, { onSuccess: onOpenInspectionForm })
          }
        >
          <ScanLine className="size-4" data-icon="inline-start" />
          {S.actions.startInspection}
        </Button>
      )}

      {show.completeInspection && (
        <Button disabled={busy} onClick={onOpenInspectionForm}>
          <Check className="size-4" data-icon="inline-start" />
          {S.actions.completeInspection}
        </Button>
      )}

      {/* In repair → the only next step is repair (QC is a LATER stage). The
          spares blocker is surfaced inside RepairCompleteDialog. */}
      {show.completeRepair && (
        <Button
          disabled={busy}
          onClick={() => startRepair.mutate({ id: deviceId, body: {} }, { onSuccess: onOpenRepairForm })}
        >
          <Check className="size-4" data-icon="inline-start" />
          {S.actions.completeRepair}
        </Button>
      )}

      {show.qc && (
        <Button disabled={busy} onClick={openQc}>
          <Microscope className="size-4" data-icon="inline-start" />
          {S.actions.startInwardQc}
        </Button>
      )}

      {show.rack && (
        <Button onClick={onOpenRack}>
          <MapPin className="size-4" data-icon="inline-start" />
          {S.actions.assignToRack}
        </Button>
      )}
    </>
  )
}
