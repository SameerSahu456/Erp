import { useState } from "react"
import { Link, useParams } from "react-router-dom"

import { DetailPageShell } from "@/components/page-shells"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Typography } from "@/components/ui/typography"
import { formatINR } from "@/lib/currency"
import { EMPTY_VALUE } from "@/shared/constants"
import { formatIST_date } from "@shared/lib/date"
import { asUuid } from "@shared/lib/validation"
import { usePermission } from "@shared/rbac"

import type { RentalUnitSwap } from "../../api/swaps"
import { swapStatusLabel, swapStatusVariant } from "../../constants/swaps"
import { useSwap } from "../../hooks/swaps/useSwaps"
import { rentalsCan } from "../../permissions"
import { RecordDetailFallback } from "../shared/RecordDetailFallback"
import { RENTALS_COMMON_STRINGS as C } from "../shared/common.strings"
import { DecideSwapDialog } from "./DecideSwapDialog"
import { SWAPS_STRINGS } from "./swaps.strings"

const S = SWAPS_STRINGS.detail
const LIST = "/rentals/swaps"

function Pairs({ pairs }: { pairs: RentalUnitSwap["pairs"] }) {
  return (
    <ul className="divide-y rounded-md border">
      {pairs.map((p) => (
        <li key={p.id} className="min-w-0 space-y-1 p-3">
          <Typography variant="body" truncate className="min-w-0">
            {S.returnedWas(p.returned_serial_before ?? EMPTY_VALUE)}
          </Typography>
          <Typography variant="body" truncate className="min-w-0">
            {S.stayingWas(p.staying_serial_before ?? EMPTY_VALUE)}
          </Typography>
          <Typography variant="caption" tone="muted">
            {S.pairMeta(
              p.monthly_rate_difference ? formatINR(Number(p.monthly_rate_difference)) : null,
              p.settled_on ? formatIST_date(p.settled_on) : null,
            )}
          </Typography>
        </li>
      ))}
    </ul>
  )
}

function SwapDetail({ swap }: { swap: RentalUnitSwap }) {
  const { can } = usePermission()
  const [deciding, setDeciding] = useState<boolean | null>(null)
  const canDecide = swap.status === "pending" && can([...rentalsCan.approveSwap])
  return (
    <DetailPageShell
      // A swap has no number; its reason is how the queue names it.
      title={swap.reason}
      titleCopyable={false}
      subtitle={S.timeline(formatIST_date(swap.created_at), swap.decided_at ? formatIST_date(swap.decided_at) : null)}
      status={{ label: swapStatusLabel(swap.status), variant: swapStatusVariant(swap.status) }}
      backHref={LIST}
      actions={
        <div className="flex flex-wrap gap-2">
          {swap.billing_adjustment_id && (
            <Button variant="outline" render={<Link to={`/rentals/billing-adjustments/${swap.billing_adjustment_id}`} />}>
              {S.adjustment}
            </Button>
          )}
          {canDecide && <Button onClick={() => setDeciding(true)}>{C.approve}</Button>}
          {canDecide && (
            <Button variant="outline" onClick={() => setDeciding(false)}>
              {C.reject}
            </Button>
          )}
        </div>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>{S.pairsHeading}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {swap.decision_notes && (
            <div className="space-y-1">
              <Typography variant="caption" tone="muted">
                {S.decisionNotes}
              </Typography>
              <Typography variant="body">{swap.decision_notes}</Typography>
            </div>
          )}
          <Pairs pairs={swap.pairs} />
        </CardContent>
      </Card>
      {deciding !== null && <DecideSwapDialog swapId={swap.id} approve={deciding} onClose={() => setDeciding(null)} />}
    </DetailPageShell>
  )
}

/** One swap: its pairs, and the approve / reject decision (R10). The route id
 *  is validated first: a malformed one renders not-found without fetching. */
export function SwapDetailBody() {
  const { id } = useParams<{ id: string }>()
  const query = useSwap(asUuid(id) ?? undefined)
  if (!query.data) return <RecordDetailFallback query={query} title={S.title} backHref={LIST} loadError={S.loadError} />
  return <SwapDetail swap={query.data} />
}
