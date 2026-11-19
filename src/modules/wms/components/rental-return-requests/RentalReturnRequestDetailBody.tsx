import { useState } from "react"

import { Button } from "@/components/ui/button"
import { DetailPageShell } from "@/components/page-shells"

import { RentalReturnDetailDialogs, type DetailDialog } from "./RentalReturnDetailDialogs"
import { RentalReturnDetailFallback } from "./RentalReturnDetailFallback"
import { RentalReturnHeaderCard } from "./RentalReturnHeaderCard"
import { RentalReturnLinesCard } from "./RentalReturnLinesCard"
import { RentalReturnLogisticsSummary } from "./RentalReturnLogisticsSummary"
import { RentalReturnVarianceCard } from "./RentalReturnVarianceCard"
import { LIST_ROUTE } from "./rental-return-request-detail-helpers"
import { RENTAL_RETURN_REQUESTS_STRINGS as S } from "./rental-return-requests.strings"
import { useRentalReturnDetail, type RentalReturnDetailState } from "../../hooks/rental-return-requests/useRentalReturnDetail"

function HeaderActions({
  state,
  setOpen,
}: {
  state: RentalReturnDetailState
  setOpen: (next: DetailDialog) => void
}) {
  if (!state.canCloseShort && !state.canCancel) return null
  return (
    <div className="flex flex-wrap gap-2">
      {state.canCloseShort && (
        <Button variant="outline" onClick={() => state.setCloseTarget({ kind: "request" })}>
          {S.detail.closeShort.requestAction}
        </Button>
      )}
      {state.canCancel && (
        <Button variant="outline" onClick={() => setOpen("cancel")}>
          {S.detail.cancel.action}
        </Button>
      )}
    </div>
  )
}

export function RentalReturnRequestDetailBody() {
  const state = useRentalReturnDetail()
  const [open, setOpen] = useState<DetailDialog>(null)
  const { detailQuery, rret } = state

  if (!rret) return <RentalReturnDetailFallback query={detailQuery} />

  return (
    <DetailPageShell
      title={rret.request_number}
      backHref={LIST_ROUTE}
      actions={<HeaderActions state={state} setOpen={setOpen} />}
    >
      <div className="space-y-6">
        <RentalReturnHeaderCard rret={rret} />
        <RentalReturnVarianceCard items={state.items} />
        <RentalReturnLinesCard
          state={state}
          onApprove={() => setOpen("approve")}
          onReject={() => setOpen("reject")}
        />
        <RentalReturnLogisticsSummary rret={rret} canEdit={state.canEditLogistics} />
      </div>
      <RentalReturnDetailDialogs state={state} open={open} setOpen={setOpen} />
    </DetailPageShell>
  )
}
