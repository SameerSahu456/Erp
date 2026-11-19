import { useDispatchLineItems, useDispatchRequestsList } from "@modules/wms"
import type { DispatchLineItem, DispatchRequestListItem } from "@modules/wms"

import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { Typography } from "@/components/ui/typography"
import { formatIST_date } from "@shared/lib/date"

import { SALES_ORDERS_STRINGS as S } from "../../sales-orders.strings"
import { DocAccordion } from "../../../shared/detail-docs/DocAccordion"
import {
  ComponentCountBadge,
  DocLineRow,
  DocLines,
  type DocRow,
} from "../../../shared/detail-docs/DocList"
import { humanizeStatus } from "../../../shared/detail-docs/status"
import { SourceLineLabel, type DetailLineBrief } from "../../../shared/detail-docs/SourceLineLabel"

const DR_STATUS_VARIANT: Record<string, StatusBadgeVariant> = {
  dispatched: "success",
  delivered: "success",
  closed: "success",
  draft: "warning",
  cancelled: "error",
}

const DRI_STATUS_VARIANT: Record<string, StatusBadgeVariant> = {
  dispatched: "success",
  sold: "success",
  pending: "warning",
  returned: "warning",
  cancelled: "error",
}

const DRI_STATUS_LABEL: Record<string, string> = {
  dispatched: "Dispatched",
}

// Lazily-fetched line items for one Dispatch Request — mounted only when open.
// Shows which SO line (name + description) each dispatched unit is for, its
// serial, and unit status.
function DispatchLines({
  dispatchId,
  lineById,
}: {
  dispatchId: string
  lineById: Map<string, DetailLineBrief>
}) {
  const query = useDispatchLineItems(dispatchId)
  if (query.isLoading) {
    return (
      <Typography variant="helper" tone="muted">
        {S.detail.docTabs.linesLoading}
      </Typography>
    )
  }
  // Top-level lines only (drop BOM children). Show every unit this DR actually
  // sent out — dispatched now, or since returned / sold — each with its own
  // status badge, so a returned unit's line stays visible here instead of the
  // accordion reading "No line items" (CP-453). Only never-sent (pending) and
  // cancelled lines are hidden.
  const all = query.data ?? []
  const lines = all.filter(
    (l: DispatchLineItem) =>
      l.parent_dispatch_item_id == null &&
      l.status !== "cancelled" &&
      l.status !== "pending",
  )
  // Components fitted onto a dispatched unit (its child DRIs) — shown as a
  // per-unit "Components +N" pill, never inflating the unit count.
  const componentCountFor = (parentId: string) =>
    all.filter(
      (l: DispatchLineItem) =>
        l.parent_dispatch_item_id === parentId && l.status !== "cancelled",
    ).length
  if (lines.length === 0) {
    return (
      <Typography variant="helper" tone="muted">
        {S.detail.docTabs.noLines}
      </Typography>
    )
  }
  return (
    <DocLines>
      {lines.map((line: DispatchLineItem) => (
        <DocLineRow
          key={line.id}
          left={
            <>
              <SourceLineLabel line={lineById.get(line.source_id ?? "")} />
              {line.serial_number ? (
                <Typography variant="caption" tone="muted">
                  {S.detail.docTabs.serialPrefix} {line.serial_number}
                </Typography>
              ) : null}
            </>
          }
          right={
            <span className="flex items-center gap-2">
              <ComponentCountBadge count={componentCountFor(line.id)} />
              <StatusBadge variant={DRI_STATUS_VARIANT[line.status] ?? "neutral"}>
                {DRI_STATUS_LABEL[line.status] ?? humanizeStatus(line.status)}
              </StatusBadge>
            </span>
          }
        />
      ))}
    </DocLines>
  )
}

// Read-only list of this SO's Dispatch Requests, expandable to line-item detail.
export function SoDispatchRequestsTab({
  soId,
  lineById,
  dispatchRequestItemIds,
}: {
  soId: string
  lineById: Map<string, DetailLineBrief>
  dispatchRequestItemIds?: string[]
}) {
  const query = useDispatchRequestsList(
    dispatchRequestItemIds && dispatchRequestItemIds.length > 0
      ? { dispatch_request_item_ids: dispatchRequestItemIds }
      : { source_entity_type: "sales_orders", source_entity_id: soId },
  )

  const rows: DocRow[] = (query.data?.items ?? []).map((dr: DispatchRequestListItem) => {
    // `unit_count` is the dispatched primary units — fitted components never
    // inflate it; they surface as a per-unit "Components +N" pill inside the
    // expanded row (see DispatchLines).
    const d = dr as DispatchRequestListItem & { unit_count?: number }
    return {
      id: dr.id,
      number: dr.dispatch_number,
      status: humanizeStatus(dr.status),
      statusVariant: DR_STATUS_VARIANT[dr.status] ?? "neutral",
      units: d.unit_count != null ? String(d.unit_count) : "",
      date: formatIST_date(dr.dispatched_at ?? dr.created_at),
      href: `/wms/dispatches/${dr.id}`,
    }
  })

  return (
    <DocAccordion
      rows={rows}
      isLoading={query.isLoading}
      isError={query.isError}
      emptyText={S.detail.docTabs.noDispatchRequests}
      renderLines={(id) => <DispatchLines dispatchId={id} lineById={lineById} />}
    />
  )
}
