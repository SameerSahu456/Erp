import { useDispatchLineItems, useDispatchRequestsList } from "@modules/wms"
import type { DispatchLineItem, DispatchRequestListItem } from "@modules/wms"

import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { Typography } from "@/components/ui/typography"
import { formatIST_date } from "@shared/lib/date"

import { DETAIL_DOCS_STRINGS as D } from "../shared/detail-docs/detail-docs.strings"
import { DocAccordion } from "../shared/detail-docs/DocAccordion"
import type { DocRow } from "../shared/detail-docs/DocList"
import { SourceLineLabel, type DetailLineBrief } from "../shared/detail-docs/SourceLineLabel"
import { DEMO_REQUESTS_STRINGS as S } from "./demo-requests.strings"

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

// Lazily-fetched line items for one Dispatch Request — mounted only when open.
// Shows which demo line each dispatched unit is for, its serial, and unit status.
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
        {D.linesLoading}
      </Typography>
    )
  }
  const lines = (query.data ?? []).filter(
    (l: DispatchLineItem) => l.parent_dispatch_item_id == null,
  )
  if (lines.length === 0) {
    return (
      <Typography variant="helper" tone="muted">
        {D.noLines}
      </Typography>
    )
  }
  return (
    <ul className="space-y-2">
      {lines.map((line: DispatchLineItem) => (
        <li key={line.id} className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <SourceLineLabel line={lineById.get(line.source_id ?? "")} />
            {line.serial_number ? (
              <Typography variant="caption" tone="muted">
                {D.serialPrefix} {line.serial_number}
              </Typography>
            ) : null}
          </div>
          <StatusBadge variant={DRI_STATUS_VARIANT[line.status] ?? "neutral"}>
            {line.status}
          </StatusBadge>
        </li>
      ))}
    </ul>
  )
}

// Read-only list of this demo's Dispatch Requests, expandable to line-item detail.
export function DemoDispatchRequestsTab({
  demoId,
  lineById,
}: {
  demoId: string
  lineById: Map<string, DetailLineBrief>
}) {
  const query = useDispatchRequestsList({
    source_entity_type: "demo_requests",
    source_entity_id: demoId,
  })

  const rows: DocRow[] = (query.data?.items ?? []).map((dr: DispatchRequestListItem) => ({
    id: dr.id,
    number: dr.dispatch_number,
    status: dr.status,
    statusVariant: DR_STATUS_VARIANT[dr.status] ?? "neutral",
    units: "",
    date: formatIST_date(dr.dispatched_at ?? dr.created_at),
    href: `/wms/dispatches/${dr.id}`,
  }))

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
