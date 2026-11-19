import { StatusBadge } from '@/components/common/display/StatusBadge'
import { TruncatedSerial } from '@/components/common/display/TruncatedSerial'
import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'

import type { WarehouseLocationTreeNode } from '../../../api'
import { ASSIGN_RACK_DIALOG_STRINGS as S } from '../assign-rack-dialog.strings'
import { occText, occupancyMeter } from './assign-rack-helpers'

/** One labeled field in the device header: small muted label over a mono value. */
export function HeaderField({ label, value }: { label: string; value?: string }) {
  return (
    <div className="min-w-0">
      <Typography variant="caption" tone="muted" asChild>
        <span className="block">{label}</span>
      </Typography>
      <Typography variant="body-strong" truncate asChild>
        <span className="block min-w-0 font-mono">
          <TruncatedSerial value={value} className="max-w-full" mono={false} />
        </span>
      </Typography>
    </div>
  )
}

/** A rack / bin dropdown row: name, occupancy, and a "Full" tag. Full slots
 *  are disabled in the picker — the backend rejects them anyway. */
export function SlotOptionRow({ name, occupancy, full }: { name: string; occupancy: string; full: boolean }) {
  return (
    <span className="flex w-full min-w-0 items-center gap-2">
      <Typography variant="body-strong" truncate asChild>
        <span className="min-w-0 flex-1">{name}</span>
      </Typography>
      <Typography variant="caption" tone="muted" numeric asChild>
        <span className="shrink-0">{occupancy}</span>
      </Typography>
      {full && (
        <StatusBadge variant="error" showDot={false}>
          {S.full}
        </StatusBadge>
      )}
    </span>
  )
}

/** Small occupancy meter — token colours only; width is a layout value. */
function OccupancyBar({ node }: { node: WarehouseLocationTreeNode }) {
  const meter = occupancyMeter(node)
  if (!meter) return null
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn('h-full rounded-full', meter.tone)} style={{ width: `${meter.pct}%` }} />
    </div>
  )
}

interface SelectedSlotPreviewProps {
  rackName: string | undefined
  binName: string | undefined
  targetNode: WarehouseLocationTreeNode | undefined
  needsBin: boolean
}

/** The slot the device will land in, with its live occupancy. */
export function SelectedSlotPreview({ rackName, binName, targetNode, needsBin }: SelectedSlotPreviewProps) {
  return (
    <div className="rounded-md border border-border bg-muted/40 px-3 py-2.5">
      <Typography variant="caption" tone="muted" asChild>
        <span>{S.selectedLocation}</span>
      </Typography>
      {targetNode ? (
        <div className="mt-1 space-y-1.5">
          <div className="flex min-w-0 items-baseline justify-between gap-2">
            <Typography variant="body-strong" truncate asChild>
              <span className="min-w-0">
                {rackName}
                {binName ? ` › ${binName}` : ''}
              </span>
            </Typography>
            <Typography variant="caption" tone="muted" numeric asChild>
              <span className="shrink-0">{S.occupancyUsed(occText(targetNode))}</span>
            </Typography>
          </div>
          <OccupancyBar node={targetNode} />
        </div>
      ) : (
        <Typography variant="body" tone="muted" asChild>
          <p className="mt-1">{needsBin ? S.pickBin : S.pickRack}</p>
        </Typography>
      )}
    </div>
  )
}
