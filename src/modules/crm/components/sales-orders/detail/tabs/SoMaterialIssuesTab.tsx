import { useMaterialIssue, useMaterialIssues } from "@modules/wms"
import type { MaterialIssueListRow, MaterialIssueLineResponse } from "@modules/wms"

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
import {
  SourceLineLabel,
  type DetailLineBrief,
} from "../../../shared/detail-docs/SourceLineLabel"

const MI_STATUS_VARIANT: Record<string, StatusBadgeVariant> = {
  issued: "success",
  draft: "warning",
  cancelled: "error",
}

const STAGE_VARIANT: Record<string, StatusBadgeVariant> = {
  ready_for_dispatch: "success",
  dispatched: "success",
  issued: "info",
  qc_failed: "error",
  returned: "warning",
  cancelled: "error",
  draft: "neutral",
}

const STAGE_LABEL: Record<string, string> = {
  issued: "Issued",
  ready_for_dispatch: "Ready for Dispatch",
}

// Resolve the ordered SO line a material-issue unit belongs to, so its name
// reads the same as the Dispatch tab. The MI line's own `part_variant_name`
// comes back empty for SO issues, so we key into the SO's line map (by ordered
// line id, then by immediate source line id) and only fall back to the line's
// own variant identity when neither resolves.
function miLineBrief(
  line: MaterialIssueLineResponse,
  lineById: Map<string, DetailLineBrief>,
): DetailLineBrief | undefined {
  const hit = lineById.get(line.source_line_id ?? "")
  if (hit) return hit
  const name = line.part_variant_name ?? line.part_variant_sku
  return name ? { name, description: null } : undefined
}

// Lazily-fetched line items for one Material Issue — mounted only when its
// accordion row is open. Shows which SO line (part) each unit belongs to +
// its current stage.
function MiLines({
  miId,
  lineById,
}: {
  miId: string
  lineById: Map<string, DetailLineBrief>
}) {
  const query = useMaterialIssue(miId)
  if (query.isLoading) {
    return (
      <Typography variant="helper" tone="muted">
        {S.detail.docTabs.linesLoading}
      </Typography>
    )
  }
  // Every issued unit on this MI — top-level lines only (drop BOM children).
  // Filtering by derived stage proved fragile (a sale unit lands on a stage the
  // narrow allow-list didn't cover, hiding the whole issue); the MI IS the
  // issued document, so each top-level line is an issued unit and carries its
  // own stage badge.
  const lines = (query.data?.line_items ?? []).filter(
    (l: MaterialIssueLineResponse) => l.parent_item_id == null,
  )
  if (lines.length === 0) {
    return (
      <Typography variant="helper" tone="muted">
        {S.detail.docTabs.noLines}
      </Typography>
    )
  }
  return (
    <DocLines>
      {lines.map((line: MaterialIssueLineResponse) => (
        <DocLineRow
          key={line.id}
          left={
            <>
              <SourceLineLabel line={miLineBrief(line, lineById)} />
              {line.serial ? (
                <Typography variant="caption" tone="muted">
                  {S.detail.docTabs.serialPrefix} {line.serial}
                </Typography>
              ) : null}
            </>
          }
          right={
            <span className="flex items-center gap-2">
              <ComponentCountBadge count={line.components?.length ?? 0} />
              <StatusBadge variant={STAGE_VARIANT[line.stage] ?? "neutral"}>
                {STAGE_LABEL[line.stage] ?? humanizeStatus(line.stage)}
              </StatusBadge>
            </span>
          }
        />
      ))}
    </DocLines>
  )
}

// Read-only list of this SO's Material Issues, expandable to line-item detail.
// For a demo-converted SO the MIs live under the demo, but a demo can fan out to
// several SOs — so we narrow to just THIS SO's units via their DRIs
// (`dispatchRequestItemIds`) rather than showing the whole demo's MIs.
export function SoMaterialIssuesTab({
  soId,
  lineById,
  dispatchRequestItemIds,
}: {
  soId: string
  lineById: Map<string, DetailLineBrief>
  dispatchRequestItemIds?: string[]
}) {
  const query = useMaterialIssues(
    dispatchRequestItemIds && dispatchRequestItemIds.length > 0
      ? { dispatch_request_item_ids: dispatchRequestItemIds }
      : { source_entity_type: "sales_orders", source_entity_id: soId },
  )

  const rows: DocRow[] = (query.data?.items ?? []).map((mi: MaterialIssueListRow) => ({
    id: mi.id,
    number: mi.mi_number,
    status: humanizeStatus(mi.status),
    statusVariant: MI_STATUS_VARIANT[mi.status] ?? "neutral",
    // `line_count` is the primary unit count — fitted BOM components never
    // inflate it; they surface as a per-unit "Components +N" pill inside the
    // expanded row (see MiLines).
    units: String(mi.line_count),
    date: formatIST_date(mi.created_at),
    href: `/wms/material-issue/${mi.id}`,
  }))

  return (
    <DocAccordion
      rows={rows}
      isLoading={query.isLoading}
      isError={query.isError}
      emptyText={S.detail.docTabs.noMaterialIssues}
      renderLines={(id) => <MiLines miId={id} lineById={lineById} />}
    />
  )
}
