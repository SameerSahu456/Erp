import type { WmsStage } from '../../../permissions'

export interface StageAssigneeIds {
  inspection?: string | null
  qc?: string | null
  repair?: string | null
}

interface StageAccess {
  canStage: (stage: WmsStage, warehouseId: string | null | undefined) => boolean
  isStageAssignee: (assigneeId?: string | null) => boolean
}

/** Which stage button shows: the workflow status picks the stage, then the
 *  viewer must hold that stage here AND (for bench stages) be its assignee. */
export function visibleStageActions(
  wf: string,
  warehouseId: string,
  assigneeIds: StageAssigneeIds | undefined,
  access: StageAccess,
) {
  const { canStage, isStageAssignee } = access
  const canInspect = canStage('inspection', warehouseId) && isStageAssignee(assigneeIds?.inspection)
  const canRepair = canStage('repair', warehouseId) && isStageAssignee(assigneeIds?.repair)
  const canQc = canStage('qc', warehouseId) && isStageAssignee(assigneeIds?.qc)
  return {
    startInspection: wf === 'pending_inspection' && canInspect,
    completeInspection: wf === 'under_inspection' && canInspect,
    completeRepair: wf === 'in_repair' && canRepair,
    qc: (wf === 'pending_qc' || wf === 'under_qc') && canQc,
    rack: wf === 'awaiting_rack' && canStage('rack_assign', warehouseId),
  }
}
