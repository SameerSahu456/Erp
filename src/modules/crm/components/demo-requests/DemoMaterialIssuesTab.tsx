import { useMaterialIssue, useMaterialIssues } from "@modules/wms"
import type { MaterialIssueListRow, MaterialIssueLineResponse } from "@modules/wms"

import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { Typography } from "@/components/ui/typography"
import { formatIST_date } from "@shared/lib/date"

import { DETAIL_DOCS_STRINGS as D } from "../shared/detail-docs/detail-docs.strings"
import { DocAccordion } from "../shared/detail-docs/DocAccordion"
import { ComponentCountBadge, type DocRow } from "../shared/detail-docs/DocList"
import { SourceLineLabel, type DetailLineBrief } from "../shared/detail-docs/SourceLineLabel"
import { DEMO_REQUESTS_STRINGS as S } from "./demo-requests.strings"

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

// Lazily-fetched line items for one Material Issue — mounted only when its
// accordion row is open. Shows which demo line (part) each unit belongs to +
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
        {D.linesLoading}
      </Typography>
    )
  }
  const lines = (query.data?.line_items ?? []).filter(
    (l: MaterialIssueLineResponse) => l.role === "primary",
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
      {lines.map((line: MaterialIssueLineResponse) => (
        <li key={line.id} className="flex items-start justify-between gap-3">
          <SourceLineLabel line={lineById.get(line.source_line_id ?? "")} />
          <span className="flex items-center gap-2">
            <ComponentCountBadge count={line.components?.length ?? 0} />
            <StatusBadge variant={STAGE_VARIANT[line.stage] ?? "neutral"}>
              {line.stage}
            </StatusBadge>
          </span>
        </li>
      ))}
    </ul>
  )
}

// Read-only list of this demo's Material Issues, expandable to line-item detail.
export function DemoMaterialIssuesTab({
  demoId,
  lineById,
}: {
  demoId: string
  lineById: Map<string, DetailLineBrief>
}) {
  const query = useMaterialIssues({
    source_entity_type: "demo_requests",
    source_entity_id: demoId,
  })

  const rows: DocRow[] = (query.data?.items ?? []).map((mi: MaterialIssueListRow) => ({
    id: mi.id,
    number: mi.mi_number,
    status: mi.status,
    statusVariant: MI_STATUS_VARIANT[mi.status] ?? "neutral",
    // `line_count` is the primary unit count — fitted BOM components never
    // inflate it; they surface as a per-unit "Components +N" pill inside the
    // expanded row (see MiLines).
    units: `${mi.line_count} ${S.detail.docTabs.units}`,
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
