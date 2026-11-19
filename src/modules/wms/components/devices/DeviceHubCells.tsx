import { StatusBadge } from '@/components/common/display/StatusBadge'
import { Typography } from '@/components/ui/typography'

import { type DeviceAssignableUser } from '../../api'
import { DEVICE_STATUS_LABELS, DEVICE_STATUS_VARIANT, workflowStageBadge } from './deviceLabels'
import { DEVICES_STRINGS as DS } from './devices.strings'
import { NOT_READY_TEXT, type HubEngineerStage } from './devices-assignment-helpers'
import { EngineerAssignSelect } from './EngineerAssignSelect'

interface DeviceStageBadgeProps {
  workflow: string
  stockStatus: string
  vendorPrior: string
  vendorSections: readonly string[]
  /** A component still waits to be checked (inward-verification D8). */
  componentsUnchecked?: boolean
}

/** Stage badge; once the device has left the pipeline (no workflow stage) its
 *  stock status shows instead of a bare dash — mirrors the detail header. */
export function DeviceStageBadge({ componentsUnchecked, ...rest }: DeviceStageBadgeProps) {
  if (!componentsUnchecked) return <StageOrStatusBadge {...rest} />
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <StageOrStatusBadge {...rest} />
      <StatusBadge variant="warning">{DS.componentsUnchecked}</StatusBadge>
    </span>
  )
}

function StageOrStatusBadge({
  workflow,
  stockStatus,
  vendorPrior,
  vendorSections,
}: Omit<DeviceStageBadgeProps, 'componentsUnchecked'>) {
  if (workflow) {
    const badge = workflowStageBadge(workflow, vendorPrior, vendorSections)
    return <StatusBadge variant={badge.variant}>{badge.label}</StatusBadge>
  }
  if (stockStatus) {
    return (
      <StatusBadge variant={DEVICE_STATUS_VARIANT[stockStatus] ?? 'neutral'}>
        {DEVICE_STATUS_LABELS[stockStatus] ?? stockStatus}
      </StatusBadge>
    )
  }
  return (
    <Typography variant="helper" tone="muted" asChild>
      <span>—</span>
    </Typography>
  )
}

interface DeviceEngineerCellProps {
  deviceId: string
  stage: HubEngineerStage
  pool: DeviceAssignableUser[]
  assigneeId: string
  assigneeName: string | undefined
  mayAssign: boolean
  stageActive: boolean
}

/** One stage's engineer picker; EngineerAssignSelect owns the edge states. */
export function DeviceEngineerCell({
  deviceId,
  stage,
  pool,
  assigneeId,
  assigneeName,
  mayAssign,
  stageActive,
}: DeviceEngineerCellProps) {
  return (
    <div className="w-40 max-w-full" onClick={(e) => e.stopPropagation()}>
      <EngineerAssignSelect
        deviceId={deviceId}
        stage={stage}
        pool={pool}
        currentUserId={assigneeId || null}
        currentName={assigneeName ?? null}
        mayAssign={mayAssign}
        assignable={stageActive}
        placeholder={DS.list.assignEngineerPlaceholder}
        notReadyText={NOT_READY_TEXT[stage]}
      />
    </div>
  )
}
