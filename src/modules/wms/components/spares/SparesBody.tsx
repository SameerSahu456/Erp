import { useState } from 'react'

import { WmsStatsCards } from '../shared/WmsStatsCards'
import { ConfirmDialog } from '@/components/common/dialogs/ConfirmDialog'
import { ListPageShell } from '@/components/page-shells'

import { useCancelSpareRequest } from '../../hooks/spares/useSpares'
import { useSparesList } from '../../hooks/spares/useSparesList'
import { FulfillSpareDialog, type FulfillSubject } from './FulfillSpareDialog'
import { ReturnSpareDialog, type ReturnSubject } from './ReturnSpareDialog'
import { SpareRequestsTable } from './SpareRequestsTable'
import { SparesInventorySection } from './SparesInventorySection'
import { SORT_FIELD_MAP } from './spares-body-helpers'
import { SPARES_STRINGS } from './spares.strings'

export function SparesBody() {
  const sl = useSparesList(SORT_FIELD_MAP)
  const { whId } = sl
  const cancelSpare = useCancelSpareRequest()
  const [fulfillReq, setFulfillReq] = useState<FulfillSubject | null>(null)
  const [returnReq, setReturnReq] = useState<ReturnSubject | null>(null)
  // ONE controlled cancel dialog, not one per row: rows are keyed by index, so a
  // per-row dialog re-binds to the next row after a cancel and cascade-cancels.
  const [cancelReqId, setCancelReqId] = useState<string | null>(null)

  return (
    <ListPageShell
      title={SPARES_STRINGS.bodyView.title}
      subtitle={SPARES_STRINGS.bodyView.subtitle}
    >
      <div className="space-y-6">
        <WmsStatsCards scope="spares" warehouseIds={sl.selectedWarehouseIds} />

      <SpareRequestsTable
        sl={sl}
        onFulfill={setFulfillReq}
        onReturn={setReturnReq}
        onCancel={setCancelReqId}
      />

      <SparesInventorySection
        query={sl.inventoryQuery}
        page={sl.invPage}
        onPageChange={sl.setInvPage}
      />

      <FulfillSpareDialog
        key={fulfillReq?.id ?? 'closed'}
        request={fulfillReq}
        warehouseId={whId ?? null}
        onClose={() => setFulfillReq(null)}
      />

      {/* Keyed per request so the unit selection, bins and reason reset between
          rows — one controlled dialog for the whole table, not one per row. */}
      <ReturnSpareDialog
        key={returnReq ? `ret-${returnReq.id}` : 'ret-closed'}
        request={returnReq}
        warehouseId={whId ?? null}
        onClose={() => setReturnReq(null)}
      />

      <ConfirmDialog
        open={cancelReqId !== null}
        onOpenChange={(o) => {
          if (!o) setCancelReqId(null)
        }}
        title={SPARES_STRINGS.bodyView.cancelDialog.title}
        description={SPARES_STRINGS.bodyView.cancelDialog.description}
        confirmLabel={SPARES_STRINGS.bodyView.cancelDialog.confirmLabel}
        variant="destructive"
        onConfirm={() => {
          if (cancelReqId) {
            cancelSpare.mutate({
              reqId: cancelReqId,
              body: { reason: SPARES_STRINGS.bodyView.cancelDialog.defaultReason },
            })
          }
          setCancelReqId(null)
        }}
        trigger={null}
      />
      </div>
    </ListPageShell>
  )
}