import { Link } from "react-router-dom"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"
import { formatIST_date } from "@shared/lib/date"
import { usePermission } from "@shared/rbac"
import { EMPTY_VALUE } from "@/shared/constants"
import { wmsCan } from "@modules/wms"
import { crmPermissions } from "../../../../permissions"

import { StatusBadge } from "@/components/common/display/StatusBadge"
import {
  useReplacementRequest,
  useReplacementRequests,
  useSalesOrderReplacementRollup,
} from "../../../../hooks/replacement-requests/useReplacementRequests"
import type {
  ReplacementRequestListItemWire,
  ReplacementRequestItemWire,
} from "../../../../api"
import { useSalesOrderFulfillment } from "../../../../hooks/sales-orders/useSalesOrders"
import { SALES_ORDERS_STRINGS as S } from "../../sales-orders.strings"
import { DocAccordion } from "../../../shared/detail-docs/DocAccordion"
import {
  DocLineRow,
  DocLines,
  type DocRow,
} from "../../../shared/detail-docs/DocList"
import { humanizeStatus } from "../../../shared/detail-docs/status"

const RR_STATUS_VARIANT: Record<string, StatusBadgeVariant> = {
  completed: "success",
  approved: "success",
  partially_approved: "info",
  in_progress: "info",
  pending_approval: "warning",
  rejected: "error",
  cancelled: "error",
}

// Only requests the salesperson can act on: approved onward. A pending request
// isn't yet a commitment and a rejected/cancelled one never happened, so
// neither belongs on the SO. A completed request reads as its outcome —
// "Replaced" (see S.detail.docTabs.rrStatus).
const RR_VISIBLE_STATUSES = new Set([
  "approved",
  "partially_approved",
  "in_progress",
  "completed",
])

const RR_ITEM_APPROVAL_VARIANT: Record<string, StatusBadgeVariant> = {
  approved: "success",
  pending: "warning",
  rejected: "error",
}

// Lazily-fetched line items for one Replacement Request — mounted only when its
// accordion row is open. Shows the original part/variant each replaced unit is
// for and that line's approval decision.
function RrLines({ rrId }: { rrId: string }) {
  const query = useReplacementRequest(rrId)
  if (query.isLoading) {
    return (
      <Typography variant="helper" tone="muted">
        {S.detail.docTabs.linesLoading}
      </Typography>
    )
  }
  const lines = query.data?.items ?? []
  if (lines.length === 0) {
    return (
      <Typography variant="helper" tone="muted">
        {S.detail.docTabs.noLines}
      </Typography>
    )
  }
  return (
    <DocLines>
      {lines.map((line: ReplacementRequestItemWire) => {
        // A line always names something: its model, else (a migrated unit
        // with no model) the serial — never the "no lines" message.
        const label =
          [line.original_part_name, line.original_variant_name]
            .filter(Boolean)
            .join(" · ") ||
          line.original_internal_serial ||
          line.original_manufacturer_serial ||
          EMPTY_VALUE
        return (
          <DocLineRow
            key={line.id}
            left={
              <Typography variant="body" truncate className="min-w-0">
                {label}
              </Typography>
            }
            right={
              <StatusBadge
                variant={
                  RR_ITEM_APPROVAL_VARIANT[line.approval_status] ?? "neutral"
                }
              >
                {humanizeStatus(line.approval_status)}
              </StatusBadge>
            }
          />
        )
      })}
    </DocLines>
  )
}

// Read-only list of this SO's Replacement Requests, plus a convenience Create
// action for sales. Replacements require a dispatched unit, so Create is gated
// on the SO having ≥1 dispatched unit (from the fulfillment rollup). The button
// deep-links into the existing RR create flow with the SO in the query string.
export function SoReplacementRequestsTab({
  soId,
  soNumber,
}: {
  soId: string
  /** The SO's document number — passed to the create form so the picker shows
   *  a readable label for the auto-selected order, not the raw id. */
  soNumber?: string
}) {
  const query = useReplacementRequests({
    entity_type: "sales_orders",
    entity_id: soId,
  })
  const fulfillment = useSalesOrderFulfillment(soId)
  const rollup = useSalesOrderReplacementRollup(soId)
  const canCreate = (fulfillment.data?.rollup.dispatched ?? 0) > 0
  // Only offer the create action to a user who can actually open the
  // replacement-request form — same OR-gate as its route
  // (`crm:manage` OR `wms:returns_manage`). Others don't get a button that
  // would just bounce them off a NoAccess page (§0.9 — hide, don't disable).
  const { canAny } = usePermission()
  const hasFormAccess = canAny([crmPermissions.MANAGE, ...wmsCan.returnsManage])

  const rows: DocRow[] = (query.data?.items ?? [])
    .filter((rr: ReplacementRequestListItemWire) =>
      RR_VISIBLE_STATUSES.has(rr.status),
    )
    .map((rr: ReplacementRequestListItemWire) => ({
      id: rr.id,
      number: rr.request_number,
      status: S.detail.docTabs.rrStatus[rr.status] ?? humanizeStatus(rr.status),
      statusVariant: RR_STATUS_VARIANT[rr.status] ?? "neutral",
      units: rr.counts?.items_count ? String(rr.counts.items_count) : "",
      date: formatIST_date(rr.created_at),
      href: `/wms/replacements/${rr.id}`,
    }))

  // Aggregate the per-line rollup into one compact summary, so it rides on the
  // same row as the Create button instead of a boxed panel that wastes the
  // strip above the table. replaced_qty counts UNITS (a unit swapped three
  // times is still 1), so pairing it with the request count is what surfaces
  // repeat failure; max_generation >= 2 means a replacement was itself replaced.
  const rollupLines = rollup.data ?? []
  const totalReplaced = rollupLines.reduce(
    (n, line) => n + Number(line.replaced_qty),
    0,
  )
  const totalRequests = rollupLines.reduce(
    (n, line) => n + line.replacement_count,
    0,
  )
  const hasRepeat = rollupLines.some((line) => line.max_generation >= 2)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          {totalReplaced > 0 && (
            <>
              <Typography variant="body-strong" className="min-w-0 truncate">
                {S.detail.docTabs.rollupUnits(totalReplaced)}
              </Typography>
              <Typography variant="helper" tone="muted" className="shrink-0">
                {S.detail.docTabs.rollupRequests(totalRequests)}
              </Typography>
              {hasRepeat && (
                <Typography variant="helper" tone="warning" className="shrink-0">
                  {S.detail.docTabs.rollupRepeat}
                </Typography>
              )}
            </>
          )}
        </div>
        {hasFormAccess && (
          <div className="flex shrink-0 items-center gap-2">
            {!canCreate && (
              <Typography variant="helper" tone="muted">
                {S.detail.docTabs.createReplacementDisabled}
              </Typography>
            )}
            <Button
              size="sm"
              disabled={!canCreate}
              render={
                canCreate ? (
                  <Link
                    to={`/wms/replacements/new?sales_order_id=${soId}${
                      soNumber ? `&so_number=${encodeURIComponent(soNumber)}` : ""
                    }`}
                  />
                ) : undefined
              }
            >
              <Plus className="size-4" data-icon="inline-start" />
              {S.detail.docTabs.createReplacement}
            </Button>
          </div>
        )}
      </div>

      <DocAccordion
        rows={rows}
        isLoading={query.isLoading}
        isError={query.isError}
        emptyText={S.detail.docTabs.noReplacementRequests}
        renderLines={(id) => <RrLines rrId={id} />}
      />
    </div>
  )
}
