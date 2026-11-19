import { Link } from "react-router-dom"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"
import { rentalsPermissions } from "@modules/rentals"
import { formatIST_date } from "@shared/lib/date"
import { usePermission } from "@shared/rbac"

import {
  useRentalReturnEligibleUnits,
  useRentalReturnRequests,
} from "../../../../hooks/rental-return-requests/useRentalReturnRequests"
import type { RentalReturnRequestWire } from "../../../../api"
import { crmPermissions } from "../../../../permissions"
import { SALES_ORDERS_STRINGS as S } from "../../sales-orders.strings"
import { DocList, type DocRow } from "../../../shared/detail-docs/DocList"

// Mirrors the replacement tab's status palette — the two documents share a
// per-line approval rollup, so the same status word must read the same way
// on both or an operator learns two vocabularies for one idea.
const RRET_STATUS_VARIANT: Record<string, StatusBadgeVariant> = {
  completed: "success",
  approved: "success",
  partially_approved: "info",
  pending_approval: "warning",
  rejected: "error",
  cancelled: "error",
}

/**
 * Read-only list of this order's Rental Return Requests, plus a Create
 * action.
 *
 * A return needs a unit still at the customer's, so Create is gated on the
 * form's own eligible-units list, as the sales-return tab does. Not the
 * dispatched count: an imported (legacy) unit went out with no dispatch
 * record and still has to come back, also after a termination (2026-11-15).
 * Offering the action with nothing out leads to an empty unit picker.
 *
 * The caller renders this tab only for `rental_sales` orders. A plain sale
 * returns through the Sales Return Request instead, which is a different
 * document with different reasons and no device to settle.
 */
export function SoRentalReturnRequestsTab({ soId }: { soId: string }) {
  const query = useRentalReturnRequests({
    entity_type: "sales_orders",
    entity_id: soId,
  })
  // The return form's own route gate; without it the button is not drawn.
  const canRaiseReturn = usePermission().can([
    crmPermissions.MANAGE,
    rentalsPermissions.RETURN,
  ])
  const units = useRentalReturnEligibleUnits(soId, { enabled: canRaiseReturn })
  const canCreate = (units.data?.length ?? 0) > 0

  const rows: DocRow[] = (query.data?.items ?? []).map(
    (rr: RentalReturnRequestWire) => ({
      id: rr.id,
      number: rr.request_number,
      status: rr.status,
      statusVariant: RRET_STATUS_VARIANT[rr.status] ?? "neutral",
      // Lines carry a count (return by count) — sum it, do not count lines.
      units: rr.items.length ? String(rr.items.reduce((n, i) => n + i.quantity, 0)) : "",
      date: formatIST_date(rr.created_at),
      href: `/wms/rental-returns/${rr.id}`,
    }),
  )

  return (
    <div className="space-y-4">
      {canRaiseReturn ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {!canCreate && (
            <Typography variant="helper" tone="muted">
              {S.detail.docTabs.createRentalReturnDisabled}
            </Typography>
          )}
          <Button
            size="sm"
            disabled={!canCreate}
            render={
              canCreate ? (
                <Link to={`/wms/rental-returns/new?sales_order_id=${soId}`} />
              ) : undefined
            }
          >
            <Plus className="size-4" data-icon="inline-start" />
            {S.detail.docTabs.createRentalReturn}
          </Button>
        </div>
      ) : null}

      <DocList
        rows={rows}
        isLoading={query.isLoading}
        isError={query.isError}
        emptyText={S.detail.docTabs.noRentalReturnRequests}
      />
    </div>
  )
}
