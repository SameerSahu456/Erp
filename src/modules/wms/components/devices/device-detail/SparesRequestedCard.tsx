import { useState, type ReactNode } from 'react'
import { PackageSearch, Plus } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { Skeleton } from '@/components/ui/skeleton'
import { ReasonDialog } from '@/components/common/dialogs/ReasonDialog'
import { PAGINATION } from '@shared/constants/pagination'
import { usePermission } from '@shared/rbac'
import { cn } from '@/lib/utils'

import { useSpareRequests, useCancelSpareRequest } from '../../../hooks/spares/useSpares'
import { useWmsStageAccess } from '../../../hooks/operations/useStageAccess'
import { wmsPermissions } from '../../../permissions'
import { FulfillSpareDialog, type FulfillSubject } from '../../spares/FulfillSpareDialog'
import { isDeviceAway } from '../../../constants/component-check-state'
import { FitSpareDialog, type FitSubject } from '../../spares/FitSpareDialog'
import { ReturnSpareDialog, type ReturnSubject } from '../../spares/ReturnSpareDialog'
import { RaiseSparesDialog } from '../../operations/RaiseSparesDialog'
import { SPARES_STRINGS } from '../../spares/spares.strings'
import { SPARES_REQUESTED_CARD_STRINGS as S } from './spares-requested-card.strings'
import { SpareRequestItem } from './SpareRequestItem'

/** Past this many requests the card body scrolls internally. */
const SCROLL_AFTER = 5

/** Spare-part requests raised for this device. Each request is a self-contained
 *  row (matching the Inspection & QC card) — the stage icon leads, the component
 *  name is the hero, a quiet meta line names who raised it and when, and the
 *  fulfilled count is the emphasised data point.
 *
 *  Actions mirror the Spares queue (same cell + modals): a manager fulfils or
 *  returns per the request's status; anyone with the spares stage on this device
 *  (incl. the assigned engineer) may cancel. The backend's device-stage gate is
 *  the real authority — these buttons are the on-device shortcut. */
export function SparesRequestedCard({
  deviceId,
  deviceStatus,
  warehouseId,
  stageByOp,
  canRaise = false,
  canCancel = false,
  raiseStage = 'repair',
}: {
  deviceId: string
  /** Fitting a spare into a device that is away is refused, so it is not offered. */
  deviceStatus?: string | null
  /** The device's warehouse — scopes the spares stage-access check and the
   *  fulfil/return dialogs' stock lookups. */
  warehouseId: string | null
  /** op-id → stage. Lifted to DeviceDetailBody so the device's checklist-runs
   *  are fetched once for the whole page, not per card. */
  stageByOp: Map<string, string>
  /** Offer the "Raise request" button (gated by the parent: inspection or
   *  repair, by that stage's assignee). */
  canRaise?: boolean
  /** Allow Cancel on a request. Gated by the parent to a manager/admin or the
   *  engineer who CURRENTLY holds the device (its active-stage assignee) —
   *  mirrors the backend `device_holder_only` gate. A past raiser who has
   *  handed the device off keeps seeing the request but cannot cancel it. */
  canCancel?: boolean
  /** Which op the raise dialog sources its source_operation_id from. */
  raiseStage?: 'inspection' | 'repair' | 'qc'
}) {
  // The endpoint requires `wms:spares_read`; a member without it 403s — gate the
  // fetch on the permission and hide the card entirely rather than empty-shell it.
  const { can, isSuperuser } = usePermission()
  const canReadSpares = can(wmsPermissions.SPARES_READ)

  // Action access — the SAME grants the Spares queue uses, so the device card
  // and the queue agree on who can fulfil / return / cancel. canFulfill/Return
  // are manager-tier; a stage-holding engineer gets neither, so the shared cell
  // leaves them only the Cancel button.
  const { canStage, isManager, canReturnSpare } = useWmsStageAccess()
  const canManageSpares = canStage('spares', warehouseId)
  const spareAccess = {
    canManageSpares,
    canFulfill: isManager,
    canReturn: canReturnSpare(warehouseId),
    canFit: canFitSpares(canManageSpares, deviceStatus),
  }
  const canCancelSpare = canCancel || isSuperuser
  const cancelSpare = useCancelSpareRequest()
  const [fulfillReq, setFulfillReq] = useState<FulfillSubject | null>(null)
  const [returnReq, setReturnReq] = useState<ReturnSubject | null>(null)
  const [fitReq, setFitReq] = useState<FitSubject | null>(null)
  // One controlled cancel-confirm dialog for the whole card (not one per row) —
  // the row list re-renders on cancel, so a per-row dialog would re-bind.
  const [cancelReqId, setCancelReqId] = useState<string | null>(null)
  const [raiseOpen, setRaiseOpen] = useState(false)

  const spareRequestsQuery = useSpareRequests(
    { stock_item_id: deviceId, page_size: PAGINATION.MAX_PAGE_SIZE },
    { enabled: canReadSpares },
  )
  const deviceSpares = spareRequestsQuery.data?.items ?? []
  if (!canReadSpares) return null
  // The card renders whenever its context enables spares (inspection / repair /
  // qc — gated by the parent), the same way the vendor-service card always
  // shows in those stages. An empty list reads as a quiet empty-state so the
  // section (and its Raise button, where offered) is where the operator expects.

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle className="inline-flex items-center gap-2">
            <PackageSearch className="size-4" />
            {S.cardTitle}
          </CardTitle>
          {canRaise && (
            <Button size="sm" onClick={() => setRaiseOpen(true)}>
              <Plus className="size-4" data-icon="inline-start" />
              {S.raise}
            </Button>
          )}
        </CardHeader>
        <SparesCardContent
          isLoading={spareRequestsQuery.isLoading}
          isError={spareRequestsQuery.isError}
          isSuccess={spareRequestsQuery.isSuccess}
          count={deviceSpares.length}
        >
          {deviceSpares.map((s) => (
            <SpareRequestItem
              key={s.id}
              spare={s}
              stage={s.source_operation_id ? stageByOp.get(s.source_operation_id) : undefined}
              access={spareAccess}
              canCancel={canCancelSpare}
              onFulfill={setFulfillReq}
              onReturn={setReturnReq}
              onCancel={setCancelReqId}
              onFit={setFitReq}
            />
          ))}
        </SparesCardContent>
      </Card>

      <FulfillSpareDialog
        key={fulfillReq?.id ?? 'closed'}
        request={fulfillReq}
        warehouseId={warehouseId}
        onClose={() => setFulfillReq(null)}
      />
      <FitSpareDialog
        request={fitReq}
        onClose={() => setFitReq(null)}
      />
      <ReturnSpareDialog
        key={returnReq ? `ret-${returnReq.id}` : 'ret-closed'}
        request={returnReq}
        warehouseId={warehouseId}
        onClose={() => setReturnReq(null)}
      />
      {cancelReqId !== null && (
        // A reason is mandatory here (ReasonDialog disables Confirm until it is
        // typed); it's recorded against the request so the raiser sees why.
        <ReasonDialog
          copy={{
            title: SPARES_STRINGS.bodyView.cancelDialog.title,
            body: SPARES_STRINGS.bodyView.cancelDialog.description,
            reasonLabel: SPARES_STRINGS.bodyView.cancelDialog.reasonLabel,
            reasonPlaceholder: SPARES_STRINGS.bodyView.cancelDialog.reasonPlaceholder,
            confirm: SPARES_STRINGS.bodyView.cancelDialog.confirmLabel,
            dismiss: SPARES_STRINGS.bodyView.cancelDialog.dismiss,
          }}
          pending={cancelSpare.isPending}
          onConfirm={(reason) =>
            cancelSpare.mutateAsync({ reqId: cancelReqId, body: { reason } }).then(() => {})
          }
          onClose={() => setCancelReqId(null)}
        />
      )}
      <RaiseSparesDialog
        deviceId={raiseOpen ? deviceId : null}
        stage={raiseStage}
        onClose={() => setRaiseOpen(false)}
      />
    </>
  )
}

/** Loading / error / empty states around the request list (`children`). */
function SparesCardContent({
  isLoading,
  isError,
  isSuccess,
  count,
  children,
}: {
  isLoading: boolean
  isError: boolean
  isSuccess: boolean
  count: number
  children: ReactNode
}) {
  return (
    <CardContent className={cn('p-0', count > SCROLL_AFTER && 'max-h-[26rem] overflow-y-auto')}>
      {isLoading && (
        <div className="space-y-2 px-5 pb-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}
      {isError && (
        <Typography variant="helper" tone="danger" asChild>
          <p className="px-5 pb-4">{S.loadError}</p>
        </Typography>
      )}
      {isSuccess && count === 0 && (
        <Typography variant="helper" tone="muted" asChild>
          <p className="px-5 pb-4">{S.empty}</p>
        </Typography>
      )}
      {count > 0 && <ul className="divide-y divide-border px-5">{children}</ul>}
    </CardContent>
  )
}

/** A fulfilled spare can be recorded inside the device only while it is with us. */
function canFitSpares(canManageSpares: boolean, deviceStatus?: string | null): boolean {
  return canManageSpares && !isDeviceAway(deviceStatus)
}
