import { useMemo } from 'react'
import { UsersRound } from 'lucide-react'

import { Typography } from '@/components/ui/typography'
import { Label } from '@/components/ui/label'

import { useAssignPoolsByWarehouse } from '../../../hooks/devices/useAssignPools'
import { useWmsStageAccess } from '../../../hooks/operations/useStageAccess'
import { EngineerAssignSelect } from '../EngineerAssignSelect'
import { stageForWorkflow, type DetailContext } from './helpers'
import { ENGINEER_ASSIGNMENTS_STRINGS } from './engineer-assignments.strings'

type AssignStage = 'inspection' | 'repair' | 'qc'
type Slot = {
  stage: AssignStage
  label: string
  placeholder: string
  levels: string[] | null
  // Whether the device's live op IS this stage (so the backend assign won't 404).
  assignable: boolean
  notReady?: string
}

// ALL THREE stages, in every context. The device carries an assignee per stage
// and the dossier serves all three, so hiding one is a choice the data never
// asked for — and it hid the wrong one: repair appeared ONLY when you arrived
// from the repair queue, so opening the same device from inspection made the
// repair engineer invisible.
//
// A slot is editable when its stage is the device's LIVE stage (the backend
// assign 404s otherwise, since there is no active op of that type); the rest
// render read-only, which is what the QC slot already did. Under dynamic
// assignment every slot offers ANY engineer level (levels: null), with the
// level shown as a badge in the dropdown.
function slotsFor(_ctx: DetailContext): Slot[] {
  return [
    {
      stage: 'inspection',
      label: ENGINEER_ASSIGNMENTS_STRINGS.labels.inspection,
      placeholder: ENGINEER_ASSIGNMENTS_STRINGS.placeholders.inspection,
      levels: null,
      assignable: false,
      notReady: ENGINEER_ASSIGNMENTS_STRINGS.notReady.notRecorded,
    },
    {
      stage: 'repair',
      label: ENGINEER_ASSIGNMENTS_STRINGS.labels.repair,
      placeholder: ENGINEER_ASSIGNMENTS_STRINGS.placeholders.repair,
      levels: null,
      assignable: false,
      notReady: ENGINEER_ASSIGNMENTS_STRINGS.notReady.repairStage,
    },
    {
      stage: 'qc',
      label: ENGINEER_ASSIGNMENTS_STRINGS.labels.qc,
      placeholder: ENGINEER_ASSIGNMENTS_STRINGS.placeholders.qc,
      levels: null,
      assignable: false,
      notReady: ENGINEER_ASSIGNMENTS_STRINGS.notReady.qcStage,
    },
  ]
}

type StageAssignee = { id?: string | null; name?: string | null }

/** Engineer Assignments sub-section in Device Information. Reflects the current
 *  per-stage assignee (id + name) carried on the device summary — the SAME source
 *  the Devices hub, the stage queues, and the inward page read — so the assigned
 *  engineer's name shows here identically, for every stage, even when a stage
 *  isn't the device's live one and even before the warehouse pool has loaded.
 *  Each dropdown owns its warehouse pool + assign mutation (see EngineerAssignSelect). */
export function EngineerAssignments({
  deviceId,
  warehouseId,
  ctx,
  workflowStatus,
  assignees,
}: {
  deviceId: string
  warehouseId: string
  ctx: DetailContext
  /** The device's workflow_status — used to enable a slot whose stage is the
   *  device's LIVE stage even when viewed from another context (e.g. the QC
   *  slot on the `?from=inspection` page once the device has moved to QC). */
  workflowStatus: string
  /** Current assignee (id + name) per stage, from the device summary's
   *  `<stage>_assignee_id` / `<stage>_assignee_name` fields. */
  assignees: { inspection: StageAssignee; qc: StageAssignee; repair: StageAssignee }
}) {
  const slots = slotsFor(ctx)
  const show = slots.length > 0
  // The device's live stage (the one with an active op). A slot for THIS stage
  // is assignable even when it's a preview slot in another context — so QC can
  // be assigned from the completed-inspection page once the device reaches QC.
  const liveStage = stageForWorkflow(workflowStatus)
  const { canAssign } = useWmsStageAccess()
  const mayAssign = canAssign(warehouseId)

  // All three stage pools derive from the device's warehouse TEAM — one roster
  // answers every stage, so opening a device costs one request instead of three
  // (and usually zero: the worklist you arrived from already cached this exact
  // warehouse's team). The assignee NAMES come from the device summary
  // (`assignees` prop), so a non-assigning viewer needs no pool at all — hence
  // the `mayAssign` gate, which also keeps engineers off the team endpoint they
  // hold no `wms:team_read` for.
  // Gated on the LIVE stage, not the arrival context: all three slots now
  // render, but only the live one is editable (the backend assign 404s without
  // an active op of that type), so exactly one pool is ever needed. Fetching
  // per-context instead would have left the two read-only dropdowns waiting on
  // a roster they never use.
  const poolWarehouseIds = useMemo(() => [warehouseId], [warehouseId])
  const poolsEnabled = show && mayAssign
  const inspectionPools = useAssignPoolsByWarehouse(poolWarehouseIds, 'inspection', {
    enabled: poolsEnabled && liveStage === 'inspection',
  })
  const qcPools = useAssignPoolsByWarehouse(poolWarehouseIds, 'qc', {
    enabled: poolsEnabled && liveStage === 'qc',
  })
  const repairPools = useAssignPoolsByWarehouse(poolWarehouseIds, 'repair', {
    enabled: poolsEnabled && liveStage === 'repair',
  })

  if (!show) return null
  const poolFor = (stage: AssignStage) => {
    if (stage === 'inspection') return inspectionPools[warehouseId] ?? []
    if (stage === 'qc') return qcPools[warehouseId] ?? []
    return repairPools[warehouseId] ?? []
  }

  // The current assignee (id + name) shown in a slot's dropdown. Slots are no
  // longer level-scoped under dynamic assignment (levels: null), so this returns
  // the stage's assignee directly; the `slot.levels` guard is kept only as a
  // defensive no-op should a future slot re-introduce level scoping.
  const currentFor = (slot: Slot): StageAssignee => {
    const a = assignees[slot.stage]
    if (!a.id) return {}
    if (slot.levels) {
      const lvl = poolFor(slot.stage).find((u) => u.user_id === a.id)?.level
      if (lvl && !slot.levels.includes(lvl)) return {}
    }
    return a
  }

  return (
    <div className="space-y-4 border-t pt-5">
      {/* A real section heading, not a muted caption (CP-193 #4): the same
          icon + title grammar the app's SectionHeader uses, one notch below the
          card's own "Device Information" title. */}
      <div className="flex items-center gap-2">
        <UsersRound className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <Typography variant="card-title">
          {ENGINEER_ASSIGNMENTS_STRINGS.sectionTitle}
        </Typography>
      </div>
      {slots.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {slots.map((slot) => {
            const current = currentFor(slot)
            return (
              <div key={slot.label} className="space-y-1.5">
                <Label>{slot.label}</Label>
                <EngineerAssignSelect
                  deviceId={deviceId}
                  stage={slot.stage}
                  pool={poolFor(slot.stage)}
                  currentUserId={current.id ?? undefined}
                  currentName={current.name ?? undefined}
                  mayAssign={mayAssign}
                  assignable={slot.assignable || slot.stage === liveStage}
                  levels={slot.levels}
                  placeholder={slot.placeholder}
                  notReadyText={slot.notReady ?? ENGINEER_ASSIGNMENTS_STRINGS.notReady.fallback}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
