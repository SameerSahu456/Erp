import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { formatIST_date } from "@shared/lib/date"
import type { RentalReturnRequestWire } from "@modules/crm"

import {
  RENTAL_RETURN_REASON_LABEL,
  RENTAL_RETURN_STATUS_LABEL,
  RENTAL_RETURN_STATUS_VARIANT,
  type RentalReturnReason,
  type RentalReturnStatus,
} from "../../constants/rental-return-status"
import { Detail } from "../shared/Detail"
import { RENTAL_RETURN_REQUESTS_STRINGS as S } from "./rental-return-requests.strings"

const D = S.detail

function StatusCell({ rret }: { rret: RentalReturnRequestWire }) {
  const status = rret.status as RentalReturnStatus
  return (
    <div className="flex flex-wrap gap-1">
      <StatusBadge variant={RENTAL_RETURN_STATUS_VARIANT[status] ?? "neutral"}>
        {RENTAL_RETURN_STATUS_LABEL[status] ?? rret.status}
      </StatusBadge>
      {rret.origin === "unannounced" && (
        <StatusBadge variant="info">{D.badges.unannounced}</StatusBadge>
      )}
      {rret.over_received && (
        <StatusBadge variant="warning">{D.badges.overReceived}</StatusBadge>
      )}
    </div>
  )
}

/** The request's header facts. The order is the one the customer
 *  mentioned — reference only, since each unit settles on its own order. */
export function RentalReturnHeaderCard({ rret }: { rret: RentalReturnRequestWire }) {
  const dated = [
    [D.completedOn, rret.completed_at],
    [D.cancelledOn, rret.cancelled_at],
  ] as const
  return (
    <Card>
      <CardContent className="grid grid-cols-2 gap-4 pt-6 md:grid-cols-4">
        <Detail label={D.customer} value={rret.account_name ?? D.lines.unknown} />
        <Detail label={D.declaredOrder} value={rret.order_number ?? D.declaredOrderNone} />
        <Detail
          label={D.reason}
          value={RENTAL_RETURN_REASON_LABEL[rret.reason as RentalReturnReason] ?? rret.reason}
        />
        <Detail label={S.list.columns.status} value={<StatusCell rret={rret} />} />
        <Detail label={D.raisedOn} value={formatIST_date(rret.created_at)} />
        {dated.map(([label, at]) =>
          at ? <Detail key={label} label={label} value={formatIST_date(at)} /> : null,
        )}
        {rret.cancel_reason && <Detail label={D.cancelReason} value={rret.cancel_reason} />}
      </CardContent>
    </Card>
  )
}
