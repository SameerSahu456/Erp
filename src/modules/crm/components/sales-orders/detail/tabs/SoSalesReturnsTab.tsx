import { Link } from "react-router-dom"
import { Plus } from "lucide-react"

import { StatusBadge } from "@/components/common/display/StatusBadge"
import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"
import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import { formatIST_date } from "@shared/lib/date"
import { usePermission } from "@shared/rbac"
import { wmsCan } from "@modules/wms"
import { crmPermissions } from "../../../../permissions"

import {
  useSalesReturnEligibleUnits,
  useSalesReturnRequests,
} from "../../../../hooks/sales-return-requests/useSalesReturnRequests"
import type {
  SalesReturnRequestItemWire,
  SalesReturnRequestWire,
} from "../../../../api/sales-return-requests"
import { SALES_ORDERS_STRINGS as S } from "../../sales-orders.strings"
import { DocAccordion } from "../../../shared/detail-docs/DocAccordion"
import {
  DocLineRow,
  DocLines,
  type DocRow,
} from "../../../shared/detail-docs/DocList"
import { humanizeStatus } from "../../../shared/detail-docs/status"

const SRET_STATUS_VARIANT: Record<string, StatusBadgeVariant> = {
  completed: "success",
  approved: "success",
  partially_approved: "info",
  pending_approval: "warning",
  rejected: "error",
  cancelled: "error",
}

const APPROVAL_VARIANT: Record<string, StatusBadgeVariant> = {
  approved: "success",
  pending: "warning",
  rejected: "error",
}

const RECEIPT_VARIANT: Record<string, StatusBadgeVariant> = {
  received: "success",
  pending: "warning",
}

// Only returns the salesperson can act on: approved onward. A return awaiting
// approval isn't a commitment and a rejected/cancelled one never happened, so
// neither belongs on the SO. A completed return reads as "Returned"
// (S.detail.docTabs.sretStatus).
const SRET_VISIBLE_STATUSES = new Set([
  "approved",
  "partially_approved",
  "completed",
])

// Units actually being returned = the items the PM approved (one saved line =
// one physical unit). A partially-approved return counts only its approved
// lines; pending/rejected lines are not returned units.
function approvedUnitCount(items: SalesReturnRequestItemWire[]): number {
  return items.filter((i) => i.approval_status === "approved").length
}

// The returned units on one sales return — part/variant with its approval and
// receipt status. Data is already inline on the list payload, so no per-return
// fetch is needed.
function SretLines({ items }: { items: SalesReturnRequestItemWire[] }) {
  if (items.length === 0) {
    return (
      <Typography variant="helper" tone="muted">
        {S.detail.docTabs.noLines}
      </Typography>
    )
  }
  return (
    <DocLines>
      {items.map((line) => {
        const label =
          [line.part_name, line.variant_name].filter(Boolean).join(" · ") ||
          S.detail.docTabs.noLines
        return (
          <DocLineRow
            key={line.id}
            left={
              <Typography variant="body" truncate className="min-w-0">
                {label}
              </Typography>
            }
            right={
              <span className="flex items-center gap-2">
                <StatusBadge
                  variant={APPROVAL_VARIANT[line.approval_status] ?? "neutral"}
                >
                  {humanizeStatus(line.approval_status)}
                </StatusBadge>
                <StatusBadge
                  variant={RECEIPT_VARIANT[line.receipt_status] ?? "neutral"}
                >
                  {humanizeStatus(line.receipt_status)}
                </StatusBadge>
              </span>
            }
          />
        )
      })}
    </DocLines>
  )
}

// Create Sales Return Request — shown only to users who can open the form
// (same OR-gate as its route: `crm:manage` OR `wms:returns_manage`, §0.9), and
// enabled only while the order has a unit free to return (the same set the
// form's unit checklist offers). Deep-links with the SO prefilled.
function CreateSalesReturnAction({
  soId,
  soNumber,
}: {
  soId: string
  soNumber?: string
}) {
  const { canAny } = usePermission()
  const hasFormAccess = canAny([crmPermissions.MANAGE, ...wmsCan.returnsManage])
  const units = useSalesReturnEligibleUnits(soId, { enabled: hasFormAccess })
  if (!hasFormAccess) return null
  const canCreate = (units.data?.length ?? 0) > 0
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {units.isSuccess && !canCreate && (
        <Typography variant="helper" tone="muted">
          {S.detail.docTabs.createSalesReturnDisabled}
        </Typography>
      )}
      <Button
        size="sm"
        disabled={!canCreate}
        render={
          canCreate ? (
            <Link
              to={`/wms/sales-returns/new?sales_order_id=${soId}${
                soNumber ? `&so_number=${encodeURIComponent(soNumber)}` : ""
              }`}
            />
          ) : undefined
        }
      >
        <Plus className="size-4" data-icon="inline-start" />
        {S.detail.docTabs.createSalesReturn}
      </Button>
    </div>
  )
}

// Read-only list of this SO's sales returns, expandable to its returned units,
// plus a convenience Create action for sales.
// The Units column shows the returned-unit count (one saved line = one unit).
export function SoSalesReturnsTab({
  soId,
  soNumber,
}: {
  soId: string
  /** The SO's document number — passed to the create form so the picker shows
   *  a readable label for the prefilled order, not the raw id. */
  soNumber?: string
}) {
  const query = useSalesReturnRequests({
    entity_type: "sales_orders",
    entity_id: soId,
  })
  const returns = query.data?.items ?? []
  const itemsById = new Map(returns.map((r) => [r.id, r.items ?? []]))

  const rows: DocRow[] = returns
    .filter((sret: SalesReturnRequestWire) =>
      SRET_VISIBLE_STATUSES.has(sret.status),
    )
    .map((sret: SalesReturnRequestWire) => ({
      id: sret.id,
      number: sret.request_number,
      status:
        S.detail.docTabs.sretStatus[sret.status] ??
        humanizeStatus(sret.status),
      statusVariant: SRET_STATUS_VARIANT[sret.status] ?? "neutral",
      units: String(approvedUnitCount(sret.items ?? [])),
      date: formatIST_date(sret.created_at),
      href: `/wms/sales-returns/${sret.id}`,
    }))

  return (
    <div className="space-y-3">
      <CreateSalesReturnAction soId={soId} soNumber={soNumber} />
      <DocAccordion
        rows={rows}
        isLoading={query.isLoading}
        isError={query.isError}
        emptyText={S.detail.docTabs.noSalesReturns}
        renderLines={(id) => <SretLines items={itemsById.get(id) ?? []} />}
      />
    </div>
  )
}
