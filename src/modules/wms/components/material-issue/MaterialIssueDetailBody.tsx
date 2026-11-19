import { useState, type ReactNode } from "react";
import { ChevronsDownUp, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { DetailPageShell } from "@/components/page-shells";
import { EmptyState } from "@/components/common/feedback/EmptyState";
import { FormCardSkeleton } from "@/components/common/feedback/FormCardSkeleton";
import { NoAccess } from "@/shared/components/feedback/NoAccess";
import { isForbidden, isNotFound } from "@shared/api/envelope";
import { LoadErrorState } from "@shared/components/feedback/LoadErrorState";
import { useRecordLabel, recordNotFoundTitle } from "@shared/routing/record-label";

import type { MaterialIssueStatus } from "../../api";
import { useMaterialIssueDetail } from "../../hooks/material-issue/useMaterialIssueDetail";
import { WMS_ACCESS_STRINGS } from "../access/access.strings";
import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";
import { MaterialIssueReturnProvider } from "./MaterialIssueReturnWorkspace";
import { ReturnSubmitButton } from "./ReturnSubmitButton";
import { MaterialIssueQcDialog } from "./MaterialIssueQcDialog";
import { MaterialIssueDetailActions } from "./MaterialIssueDetailActions";
import { MaterialIssueOverviewCard } from "./MaterialIssueOverviewCard";
import { LineCard } from "./LineCard";
import { materialIssueHeaderBadge } from "./material-issue-detail-helpers";

const LIST_PATH = "/wms/material-issue";

function StateShell({ children }: { children: ReactNode }) {
  return (
    <DetailPageShell title={S.detail.breadcrumbs.materialIssue} backHref={LIST_PATH}>
      {children}
    </DetailPageShell>
  );
}

type MaterialIssueDetailState = ReturnType<typeof useMaterialIssueDetail>;

function LineQcDialog({ d, materialIssueId }: { d: MaterialIssueDetailState; materialIssueId: string }) {
  return (
    <MaterialIssueQcDialog
      materialIssueId={materialIssueId}
      lineId={d.qcLine?.id ?? null}
      lineLabel={d.qcLine ? d.labels.variant(d.qcLine.part_variant_id) : undefined}
      open={d.qcLine !== null}
      onOpenChange={(open) => {
        if (!open) d.setQcLine(null);
      }}
    />
  );
}

/** Opens or closes every line card at once. */
function ExpandAllButtons({ onSet }: { onSet: (open: boolean) => void }) {
  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => onSet(true)}>
        <ChevronsUpDown className="size-3.5" />
        {S.detail.showAll}
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => onSet(false)}>
        <ChevronsDownUp className="size-3.5" />
        {S.detail.collapseAll}
      </Button>
    </>
  );
}

export function MaterialIssueDetailBody() {
  const label = useRecordLabel();
  const d = useMaterialIssueDetail();
  // A fresh object per click, so every line card re-syncs even on a repeat click.
  const [openAll, setOpenAll] = useState<{ open: boolean } | null>(null);
  const { detailQuery, mi } = d;

  // §0.6 — skeleton, not a bare "Loading…" line.
  if (detailQuery.isLoading) {
    return (
      <StateShell>
        <FormCardSkeleton />
      </StateShell>
    );
  }
  // A 403 is a permission boundary (not on this issue's warehouse team) — a
  // "not found" would read as a bug rather than an access gap (§2).
  if (isForbidden(detailQuery.error)) {
    return (
      <StateShell>
        <NoAccess
          title={WMS_ACCESS_STRINGS.materialIssueForbiddenTitle}
          description={WMS_ACCESS_STRINGS.materialIssueForbidden}
        />
      </StateShell>
    );
  }
  // A network / 5xx failure is not a missing record (§12) — show the reason.
  if (detailQuery.isError && !isNotFound(detailQuery.error)) {
    return (
      <StateShell>
        <LoadErrorState error={detailQuery.error} fallback={S.form.editLoadFailed} />
      </StateShell>
    );
  }
  if (!mi) {
    return (
      <StateShell>
        <EmptyState title={recordNotFoundTitle(label, S.detail.notFound)} />
      </StateShell>
    );
  }

  const isDraft = mi.status === "draft";
  const primaryLines = (mi.line_items ?? []).filter((l) => l.role === "primary");
  const headerBadge = materialIssueHeaderBadge(mi.status as MaterialIssueStatus, primaryLines);
  const showActions = !d.qcOnly && d.canManage;

  return (
    <MaterialIssueReturnProvider materialIssue={mi}>
      <DetailPageShell
        title={mi.mi_number}
        backHref={LIST_PATH}
        status={headerBadge}
        actions={
          showActions ? (
            <MaterialIssueDetailActions
              mi={mi}
              onIssue={() => d.issueMutation.mutate(mi.id)}
              onCancel={() => d.cancelMutation.mutate(mi.id)}
            />
          ) : undefined
        }
      >
        <div className="space-y-6">
          <MaterialIssueOverviewCard mi={mi} source={d.sourceDoc} />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle>{S.detail.sections.lines}</CardTitle>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {primaryLines.length > 1 && <ExpandAllButtons onSet={(open) => setOpenAll({ open })} />}
                {!d.qcOnly && <ReturnSubmitButton />}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {primaryLines.length === 0 ? (
                <Typography variant="body" tone="muted">
                  {S.detail.empty.lines}
                </Typography>
              ) : (
                primaryLines.map((line, idx) => (
                  <LineCard
                    key={line.id}
                    line={line}
                    labels={d.labels}
                    onQc={d.setQcLine}
                    materialIssueId={mi.id}
                    warehouseId={mi.warehouse_id}
                    pullOuts={d.pullOuts}
                    resolveLocation={d.resolveLocation}
                    defaultOpen={idx === 0}
                    openAll={openAll}
                    isDraft={isDraft}
                    qcOnly={d.qcOnly}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <LineQcDialog d={d} materialIssueId={mi.id} />
      </DetailPageShell>
    </MaterialIssueReturnProvider>
  );
}
