import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { usePermission } from "@shared/rbac";
import { asUuid } from "@shared/lib/validation";

import { wmsPermissions } from "../../permissions";
import type { MaterialIssueLineResponse } from "../../api";
import { useMaterialIssue, useMaterialIssuePullOuts } from "./useMaterialIssues";
import { useIssueMaterialIssue, useCancelMaterialIssue } from "./useMaterialIssueMutations";
import { useLocationsTree } from "../warehouses/useWarehouseLocations";
import { useWmsStageAccess } from "../operations/useStageAccess";
import {
  buildLineLabels,
  buildLocationResolver,
  sourceDocLink,
} from "../../components/material-issue/material-issue-detail-helpers";

/** State + data owner for the Material Issue detail page (§17). */
export function useMaterialIssueDetail() {
  // §11.1 — the route `:id` is untrusted. A malformed id keeps the queries
  // disabled and lands on the not-found guard, never a 422.
  const { id: rawId } = useParams<{ id: string }>();
  const id = asUuid(rawId) ?? undefined;
  const [qcLine, setQcLine] = useState<MaterialIssueLineResponse | null>(null);

  // A non-manager QC engineer only runs outward QC here (mirrors the worklist's `qcOnly`).
  const { isManager, canSeeStage } = useWmsStageAccess();
  const qcOnly = !isManager && canSeeStage("qc");
  // The outward route admits [OUTWARD_READ, OUTWARD_MANAGE]; every header
  // action mutates, so gate them all on OUTWARD_MANAGE (§0.9).
  const canManage = usePermission().can(wmsPermissions.OUTWARD_MANAGE);

  const detailQuery = useMaterialIssue(id);
  const mi = detailQuery.data;

  const issueMutation = useIssueMaterialIssue();
  const cancelMutation = useCancelMaterialIssue();

  // Parts pulled out of this MI's units (D26) — the trace-back panel.
  const pullOutsQuery = useMaterialIssuePullOuts(id);
  const pullOuts = useMemo(() => pullOutsQuery.data?.items ?? [], [pullOutsQuery.data]);

  const locationsTree = useLocationsTree(mi?.warehouse_id ?? "", !!mi);
  const resolveLocation = useMemo(
    () => buildLocationResolver(locationsTree.data),
    [locationsTree.data],
  );
  const labels = useMemo(
    () => buildLineLabels(mi?.line_items ?? [], pullOuts),
    [mi, pullOuts],
  );
  // Header labels (warehouse / user names / source-document number) come
  // denormalized on the MI response — no per-name fetch.
  const sourceDoc = mi ? sourceDocLink(mi) : null;

  return {
    detailQuery,
    mi,
    qcOnly,
    canManage,
    issueMutation,
    cancelMutation,
    pullOuts,
    resolveLocation,
    labels,
    sourceDoc,
    qcLine,
    setQcLine,
  };
}
