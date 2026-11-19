import { type ReactNode } from 'react'
import { Ban } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'

import { type DeviceAssignableUser } from '../../api'
import { type QueueStage } from '../../hooks/operations/useStageQueue'
import { EngineerAssignSelect } from '../devices/EngineerAssignSelect'

/** The em-dash shown when a row has no action — §0.9: a role-gated action is
 *  HIDDEN, not labelled "No access"; the row stays clickable. */
export function QueueDash() {
  return (
    <Typography variant="helper" tone="muted" asChild>
      <span>—</span>
    </Typography>
  )
}

interface QueueAssignCellProps {
  deviceId: string
  stage: QueueStage
  pool: DeviceAssignableUser[]
  assigneeId: string | null
  assigneeName: string | null
  mayAssign: boolean
  /** Pin the row height to the h-10 picker even when read-only. */
  fixedHeight?: boolean
}

/** Per-row engineer assignment (read-only name when `mayAssign` is false). */
export function QueueAssignCell({
  deviceId,
  stage,
  pool,
  assigneeId,
  assigneeName,
  mayAssign,
  fixedHeight = false,
}: QueueAssignCellProps) {
  return (
    <div
      className={fixedHeight ? 'flex min-h-10 items-center' : undefined}
      onClick={(e) => e.stopPropagation()}
    >
      <EngineerAssignSelect
        deviceId={deviceId}
        stage={stage}
        pool={pool}
        currentUserId={assigneeId ?? undefined}
        currentName={assigneeName ?? undefined}
        mayAssign={mayAssign}
      />
    </div>
  )
}

interface QueueRowActionsProps {
  icon: ReactNode
  label: string
  disabled: boolean
  onAction: () => void
  scrapLabel: string
  /** Omit to hide Scrap (status or rights don't allow it). */
  onScrap?: () => void
}

/** The stage's primary row action plus an optional Scrap. */
export function QueueRowActions({
  icon,
  label,
  disabled,
  onAction,
  scrapLabel,
  onScrap,
}: QueueRowActionsProps) {
  return (
    <div className="inline-flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <Button size="sm" disabled={disabled} onClick={onAction}>
        {icon}
        {label}
      </Button>
      {onScrap && (
        <Button size="sm" variant="outline" onClick={onScrap}>
          <Ban className="size-3.5" data-icon="inline-start" />
          {scrapLabel}
        </Button>
      )}
    </div>
  )
}
