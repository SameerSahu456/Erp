import { useState } from "react"
import { Link, useParams } from "react-router-dom"

import { ConfirmDialog } from "@/components/common/dialogs/ConfirmDialog"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { DetailPageShell } from "@/components/page-shells"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Typography } from "@/components/ui/typography"
import { formatINR } from "@/lib/currency"
import { EMPTY_VALUE } from "@/shared/constants"
import { formatIST_date } from "@shared/lib/date"
import { asUuid } from "@shared/lib/validation"
import { usePermission } from "@shared/rbac"

import type { RentalBillingAdjustment } from "../../api/swaps"
import { adjustmentStatusLabel, adjustmentStatusVariant } from "../../constants/swaps"
import {
  useBillingAdjustment,
  useCancelBillingAdjustment,
} from "../../hooks/billing-adjustments/useBillingAdjustments"
import { rentalsCan } from "../../permissions"
import { RecordDetailFallback } from "../shared/RecordDetailFallback"
import { BILLING_ADJUSTMENT_STRINGS as S } from "./billing-adjustments.strings"
import { IssueAdjustmentDialog } from "./IssueAdjustmentDialog"

const LIST = "/rentals/billing-adjustments"

type Line = RentalBillingAdjustment["lines"][number]

function linePeriod(l: Line): string {
  return l.period_from && l.period_to ? S.period(formatIST_date(l.period_from), formatIST_date(l.period_to)) : EMPTY_VALUE
}

function AdjustmentLines({ lines }: { lines: Line[] }) {
  return (
    <ul className="divide-y rounded-md border">
      {lines.map((l) => (
        <li key={l.id} className="flex min-w-0 items-center gap-3 p-3">
          <div className="min-w-0 flex-1">
            <Typography variant="body" truncate className="min-w-0">
              {S.line(l.invoice_number ?? EMPTY_VALUE, l.serial_number ?? EMPTY_VALUE)}
            </Typography>
            <Typography variant="caption" tone="muted">
              {linePeriod(l)}
            </Typography>
          </div>
          <Typography variant="body-strong" numeric className="shrink-0">
            {formatINR(Number(l.credit_amount))}
          </Typography>
        </li>
      ))}
    </ul>
  )
}

function AdjustmentDetail({ row }: { row: RentalBillingAdjustment }) {
  const cancel = useCancelBillingAdjustment()
  const { can } = usePermission()
  const [open, setOpen] = useState<"issue" | "cancel" | null>(null)
  const canIssue = row.status === "pending_accounts" && can([...rentalsCan.issueAdjustment])
  return (
    <DetailPageShell
      title={S.detailTitle}
      backHref={LIST}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link to={`/rentals/swaps/${row.rental_unit_swap_id}`} />}>
            {S.swap}
          </Button>
          {canIssue && <Button onClick={() => setOpen("issue")}>{S.issue}</Button>}
          {canIssue && (
            <Button variant="outline" onClick={() => setOpen("cancel")}>
              {S.cancel}
            </Button>
          )}
        </div>
      }
    >
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <CardTitle>{formatINR(Number(row.total))}</CardTitle>
          <StatusBadge variant={adjustmentStatusVariant(row.status)}>{adjustmentStatusLabel(row.status)}</StatusBadge>
        </CardHeader>
        <CardContent>
          <AdjustmentLines lines={row.lines} />
        </CardContent>
      </Card>
      {open === "issue" && <IssueAdjustmentDialog adjustmentId={row.id} onClose={() => setOpen(null)} />}
      <ConfirmDialog
        open={open === "cancel"}
        onOpenChange={(o) => setOpen(o ? "cancel" : null)}
        title={S.cancelTitle}
        description={S.cancelBody}
        confirmLabel={S.confirmCancel}
        variant="destructive"
        onConfirm={() => cancel.mutate(row.id, { onSuccess: () => setOpen(null) })}
      />
    </DetailPageShell>
  )
}

/** Credit due from an approved swap; accounts issue it (R11). The route id is
 *  validated first: a malformed one renders not-found without fetching. */
export function AdjustmentDetailBody() {
  const { id } = useParams<{ id: string }>()
  const query = useBillingAdjustment(asUuid(id) ?? undefined)
  if (!query.data) {
    return <RecordDetailFallback query={query} title={S.detailTitle} backHref={LIST} loadError={S.detailLoadError} />
  }
  return <AdjustmentDetail row={query.data} />
}
