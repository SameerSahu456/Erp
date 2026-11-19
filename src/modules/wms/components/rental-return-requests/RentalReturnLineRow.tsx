import { Button } from "@/components/ui/button"
import { formatINR } from "@/lib/currency"
import { Checkbox } from "@/components/ui/checkbox"
import { Typography } from "@/components/ui/typography"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import type { RentalReturnRequestItemWire } from "@modules/crm"

import {
  RENTAL_RETURN_APPROVAL_LABEL,
  RENTAL_RETURN_APPROVAL_VARIANT,
  RENTAL_RETURN_LINE_ORIGIN_LABEL,
  RENTAL_RETURN_LINE_ORIGIN_VARIANT,
  RENTAL_RETURN_RECEIPT_LABEL,
  RENTAL_RETURN_RECEIPT_VARIANT,
  type RentalReturnLineApproval,
  type RentalReturnLineOrigin,
  type RentalReturnLineReceipt,
} from "../../constants/rental-return-status"
import { modelLabel, outstandingOf } from "./rental-return-request-detail-helpers"
import { RENTAL_RETURN_REQUESTS_STRINGS as S } from "./rental-return-requests.strings"
import type { RentalReturnDetailState } from "../../hooks/rental-return-requests/useRentalReturnDetail"

const L = S.detail.lines

type Props = Pick<
  RentalReturnDetailState,
  "canDecide" | "selectedIds" | "toggle" | "canCloseLine" | "setCloseTarget"
> & { item: RentalReturnRequestItemWire }

function Badges({ item }: { item: RentalReturnRequestItemWire }) {
  const approval = item.approval_status as RentalReturnLineApproval
  const receipt = item.receipt_status as RentalReturnLineReceipt
  const origin = item.line_origin as RentalReturnLineOrigin
  return (
    <div className="flex flex-wrap gap-1">
      {origin !== "declared" && (
        <StatusBadge variant={RENTAL_RETURN_LINE_ORIGIN_VARIANT[origin] ?? "neutral"}>
          {RENTAL_RETURN_LINE_ORIGIN_LABEL[origin] ?? item.line_origin}
        </StatusBadge>
      )}
      <StatusBadge variant={RENTAL_RETURN_APPROVAL_VARIANT[approval] ?? "neutral"}>
        {RENTAL_RETURN_APPROVAL_LABEL[approval] ?? item.approval_status}
      </StatusBadge>
      <StatusBadge variant={RENTAL_RETURN_RECEIPT_VARIANT[receipt] ?? "neutral"}>
        {RENTAL_RETURN_RECEIPT_LABEL[receipt] ?? item.receipt_status}
      </StatusBadge>
    </div>
  )
}

/** Received / outstanding, and why a closed line stopped expecting. */
function Progress({ item }: { item: RentalReturnRequestItemWire }) {
  const left = outstandingOf(item)
  const closedNote = item.auto_closed ? S.detail.closeShort.autoClosed : item.close_reason
  return (
    <div className="min-w-0">
      <Typography variant="caption" numeric>
        {L.quantity(item.received_quantity, item.quantity)}
        {left > 0 ? ` · ${L.outstanding(left)}` : ""}
      </Typography>
      {item.closed_short_at && closedNote && (
        <Typography variant="caption" tone="muted" className="min-w-0 truncate">
          {L.closedReason(closedNote)}
        </Typography>
      )}
    </div>
  )
}

export function RentalReturnLineRow(props: Props) {
  const { item, canDecide, selectedIds, toggle, canCloseLine, setCloseTarget } = props
  const decidable = canDecide(item)
  const assignedElsewhere = item.approval_status === "pending" && !decidable
  return (
    <li className="flex min-w-0 flex-col gap-3 p-4 md:flex-row md:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Checkbox
          className="mt-0.5 shrink-0"
          checked={selectedIds.has(item.id)}
          disabled={!decidable}
          onCheckedChange={() => toggle(item.id)}
        />
        <div className="min-w-0 flex-1 space-y-1">
          <Typography variant="body-strong" className="min-w-0 truncate">
            {modelLabel(item, L.unknown)}
          </Typography>
          {/* A line raised for one ticked unit names it. */}
          {(item.pinned_internal_serial ?? item.pinned_manufacturer_serial) && (
            <Typography variant="caption" tone="muted" className="min-w-0 truncate">
              {L.serial}: {item.pinned_internal_serial ?? item.pinned_manufacturer_serial}
            </Typography>
          )}
          <Progress item={item} />
          {item.approval_status === "pending" && item.early_exit_estimate != null && (
            <Typography variant="caption" tone="warning" className="min-w-0 truncate">
              {S.detail.approval.earlyCharge(formatINR(Number(item.early_exit_estimate)))}
            </Typography>
          )}
          <Typography variant="caption" tone="muted" className="min-w-0 truncate">
            {assignedElsewhere
              ? S.detail.approval.notYours
              : (item.approval_notes ?? item.product_manager_name ?? L.unassigned)}
          </Typography>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Badges item={item} />
        {canCloseLine(item) && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setCloseTarget({ kind: "line", item })}
          >
            {S.detail.closeShort.lineAction}
          </Button>
        )}
      </div>
    </li>
  )
}
