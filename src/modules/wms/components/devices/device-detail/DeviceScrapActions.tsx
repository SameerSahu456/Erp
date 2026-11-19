import { useState } from 'react'
import { Ban, RotateCcw, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { usePermission } from '@shared/rbac'

import { useWmsStageAccess } from '../../../hooks/operations/useStageAccess'
import { wmsPermissions } from '../../../permissions'
import { DisposeDeviceDialog } from '../DisposeDeviceDialog'
import { ScrapDeviceDialog } from '../ScrapDeviceDialog'
import { UnscrapDeviceDialog } from '../UnscrapDeviceDialog'
import { canScrapStatus, SCRAP_BLOCKED_WORKFLOW } from '../scrap-helpers'
import { DEVICE_HEADER_ACTIONS_STRINGS as S } from './device-header-actions.strings'

interface DeviceScrapActionsProps {
  deviceId: string
  internalSerial: string
  deviceStatus: string
  /** The pipeline stage — scrap is refused while the unit is at a vendor. */
  workflowStatus: string
  hasLocation: boolean
  scrapPriorStatus?: string | null
  warehouseId: string
}

/** Scrap / un-scrap / dispose (device-scrap D5, D9, D2). */
export function DeviceScrapActions({
  deviceId,
  internalSerial,
  deviceStatus,
  workflowStatus,
  hasLocation,
  scrapPriorStatus,
  warehouseId,
}: DeviceScrapActionsProps) {
  const { canStage, canManageScrap } = useWmsStageAccess()
  const { can } = usePermission()
  const [scrapOpen, setScrapOpen] = useState(false)
  const [unscrapOpen, setUnscrapOpen] = useState(false)
  const [disposeOpen, setDisposeOpen] = useState(false)

  // Scrap: ANY assigned ops worker (canStage mirrors the backend's
  // devices_scrap grant), hidden on a status the backend rejects.
  const canScrap = canScrapStatus(deviceStatus) && canStage('devices_scrap', warehouseId)
  // At a vendor the backend refuses scrap, so say why up front instead of
  // failing after a reason is typed.
  const scrapBlocked = SCRAP_BLOCKED_WORKFLOW.has(workflowStatus)
  const isScrapped = deviceStatus === 'scrapped'
  // Un-scrap is store-or-warehouse-manager-only (narrower than isManager).
  const canUnscrap = isScrapped && canManageScrap(warehouseId)
  // Dispose is gated on the GLOBAL wms:stock_dispose permission code, not a
  // warehouse assignment — the backend route uses require_permission here.
  const canDispose = isScrapped && can(wmsPermissions.STOCK_DISPOSE)

  return (
    <>
      {/* Scrap — the engineer's write-off, from ANY stage (device-scrap D5). */}
      {canScrap &&
        (scrapBlocked ? (
          // A styled why-tooltip, never a native `title=`; the span trigger
          // lets the disabled button still surface the reason.
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex cursor-not-allowed" />}>
                <Button variant="outline" disabled>
                  <Ban className="size-4" data-icon="inline-start" />
                  {S.actions.scrap}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{S.scrapAtVendor}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Button variant="outline" onClick={() => setScrapOpen(true)}>
            <Ban className="size-4" data-icon="inline-start" />
            {S.actions.scrap}
          </Button>
        ))}
      <ScrapDeviceDialog
        deviceId={scrapOpen ? deviceId : null}
        internalSerial={internalSerial}
        onClose={() => setScrapOpen(false)}
      />

      {/* Un-scrap / Dispose — manager-only, shown only on a scrapped unit. */}
      {canUnscrap && (
        <Button variant="outline" onClick={() => setUnscrapOpen(true)}>
          <RotateCcw className="size-4" data-icon="inline-start" />
          {S.actions.unscrap}
        </Button>
      )}
      <UnscrapDeviceDialog
        deviceId={unscrapOpen ? deviceId : null}
        internalSerial={internalSerial}
        // The snapshot taken when this unit was condemned decides which restore
        // targets are legal (D9); null routes to the "no recorded state" fallback.
        scrapPriorStatus={scrapPriorStatus}
        hasLocation={hasLocation}
        hasWarehouse={!!warehouseId}
        onClose={() => setUnscrapOpen(false)}
      />

      {canDispose && (
        <Button variant="destructive" onClick={() => setDisposeOpen(true)}>
          <Trash2 className="size-4" data-icon="inline-start" />
          {S.actions.dispose}
        </Button>
      )}
      <DisposeDeviceDialog
        deviceId={disposeOpen ? deviceId : null}
        internalSerial={internalSerial}
        onClose={() => setDisposeOpen(false)}
      />
    </>
  )
}
