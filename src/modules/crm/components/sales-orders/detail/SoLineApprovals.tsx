/**
 * Per-line facts for a Sales Order that the shared LineItemsGrid has no column
 * for: fulfillment breakdown, configuration notes, serial number and demo
 * lineage. Approver and approval status are grid columns now (see
 * `SoDetailItemsGrid`), so they are NOT repeated here. Renders nothing when no
 * line carries any of these facts, so a fresh order reads exactly like its
 * quote.
 */
import { Typography } from "@/components/ui/typography"

import type { LineFulfillmentWire } from "../../../api"
import { issuedUmbrella } from "./soFulfillment"
import type { SalesOrderItemTreeNode } from "../../../lib/bomTree"
import { SALES_ORDERS_STRINGS as S } from "../sales-orders.strings"

const A = S.detail.items

function hasFulfillment(f: LineFulfillmentWire | undefined): boolean {
  return !!f && (issuedUmbrella(f) > 0 || f.dispatched > 0 || f.returned > 0)
}

// CRM-owned per-line returned counter (SO item `returned_qty`) — kept
// separate from the WMS fulfillment stream so a line with zero WMS
// fulfillment but non-zero SO returns still surfaces here.
function hasReturnedQty(node: SalesOrderItemTreeNode): boolean {
  return Number(node.returned_qty ?? 0) > 0
}

function hasLineFacts(
  node: SalesOrderItemTreeNode,
  fulfillment: LineFulfillmentWire | undefined,
): boolean {
  return (
    !!node.configuration_notes ||
    !!node.warranty_level ||
    !!node.source_dispatch_request_item_id ||
    !!node.source_serial_number ||
    hasFulfillment(fulfillment) ||
    hasReturnedQty(node)
  )
}

export function SoLineApprovals({
  tree,
  fulfillmentByLineId,
}: {
  tree: SalesOrderItemTreeNode[]
  fulfillmentByLineId?: Map<string, LineFulfillmentWire>
}) {
  const rows = tree
    .map((node, idx) => ({ node, idx, fulfillment: fulfillmentByLineId?.get(node.id) }))
    .filter(({ node, fulfillment }) => hasLineFacts(node, fulfillment))
  if (rows.length === 0) return null

  return (
    <div className="border-t border-border pt-4">
      <Typography variant="card-title" className="mb-3">
        {A.lineDetails}
      </Typography>
      <ul className="divide-y divide-border">
        {rows.map(({ node, idx, fulfillment }) => (
          <li key={node.id} className="flex flex-col gap-1.5 py-2.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Typography variant="helper" tone="muted" numeric className="shrink-0">
                #{idx + 1}
              </Typography>
              <Typography variant="body-strong" className="min-w-0 flex-1 truncate">
                {node.item_name}
              </Typography>
              {node.source_dispatch_request_item_id ? (
                <Typography variant="helper" tone="info">{A.soldViaDemo}</Typography>
              ) : null}
              {node.source_serial_number ? (
                <Typography variant="helper" tone="muted" numeric>
                  {A.serialPrefix} {node.source_serial_number}
                </Typography>
              ) : null}
            </div>
            <FulfillmentLine fulfillment={fulfillment} node={node} />
            {node.configuration_notes ? (
              <Typography variant="helper" tone="muted" className="italic">
                <span className="not-italic font-semibold text-foreground/70">{A.notesPrefix}</span>
                {node.configuration_notes}
              </Typography>
            ) : null}
            {node.warranty_level ? (
              <Typography variant="helper" tone="muted" className="italic">
                <span className="not-italic font-semibold text-foreground/70">{A.warrantyPrefix}</span>
                {node.warranty_level}
              </Typography>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

// Per-line fulfillment breakdown — only once the line has been issued /
// dispatched at all (a not-yet-fulfilled line stays clean). "Issued" is the
// custody umbrella (issued + ready + qc_failed). The Returned counter is
// sourced from the SO item (`node.returned_qty`) — CRM is the system of
// record for its own return counters post pro-ration fix — and falls back
// to the WMS stream when the SO value is zero so legacy data still shows.
function FulfillmentLine({
  fulfillment,
  node,
}: {
  fulfillment: LineFulfillmentWire | undefined
  node: SalesOrderItemTreeNode
}) {
  const soReturned = Number(node.returned_qty ?? 0)
  const wmsReturned = fulfillment?.returned ?? 0
  const returned = soReturned > 0 ? soReturned : wmsReturned
  if (!hasFulfillment(fulfillment) && returned <= 0) return null
  const F = S.detail.fulfillment
  return (
    <Typography variant="helper" tone="muted" className="flex flex-wrap gap-x-3">
      {fulfillment ? (
        <>
          <span>
            <span className="font-semibold text-foreground/70">{F.issued}</span> {issuedUmbrella(fulfillment)}
          </span>
          <span>
            <span className="font-semibold text-foreground/70">{F.ready}</span> {fulfillment.ready}
          </span>
          <span>
            <span className="font-semibold text-foreground/70">{F.dispatched}</span> {fulfillment.dispatched}
          </span>
          {fulfillment.qc_failed > 0 && (
            <span className="text-destructive">
              {F.qcFailed} {fulfillment.qc_failed}
            </span>
          )}
        </>
      ) : null}
      {returned > 0 && (
        <span className="text-warning">
          {F.returned} {returned}
        </span>
      )}
    </Typography>
  )
}
