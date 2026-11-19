import { useNavigate } from "react-router-dom";
import { PackageCheck, Pencil, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/dialogs/ConfirmDialog";

import type { MaterialIssueResponse } from "../../api";
import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";
import { ReturnModeButton } from "./MaterialIssueReturnWorkspace";
import { dispatchCreateHref } from "./material-issue-detail-helpers";

interface Props {
  mi: MaterialIssueResponse;
  onIssue: () => void;
  onCancel: () => void;
}

/** Header actions for a Material Issue (callers gate on OUTWARD_MANAGE). */
export function MaterialIssueDetailActions({ mi, onIssue, onCancel }: Props) {
  const navigate = useNavigate();
  const lines = mi.line_items ?? [];
  const isDraft = mi.status === "draft";
  // The header stays `issued` even after every unit ships or comes back, so
  // gate "Return units" on a returnable unit (line status still `issued`).
  const hasReturnableLines =
    mi.status === "issued" && lines.some((l) => l.role === "primary" && l.status === "issued");
  // Offer "Send to Dispatch" only for ready units NOT already on a live
  // dispatch — a fully-committed MI hides it, a partial one keeps it.
  const hasReadyForDispatch = lines.some(
    (l) => l.role === "primary" && l.stage === "ready_for_dispatch" && !l.on_live_dispatch,
  );

  const goDispatch = () =>
    navigate(
      dispatchCreateHref({
        sourceEntityType: mi.source_entity_type,
        sourceEntityId: mi.source_entity_id,
        sourceLabel: mi.source_document_label,
      }),
    );

  return (
    <div className="flex flex-wrap gap-2">
      {hasReadyForDispatch && (
        <Button variant="outline" onClick={goDispatch}>
          <Truck className="size-4" data-icon="inline-start" />
          {S.detail.actions.sendToDispatch}
        </Button>
      )}
      {isDraft && (
        <>
          <Button variant="outline" onClick={() => navigate(`/wms/material-issue/${mi.id}/edit`)}>
            <Pencil className="size-4" data-icon="inline-start" />
            {S.detail.actions.edit}
          </Button>
          <ConfirmDialog
            title={S.cancelDialog.title}
            description={S.cancelDialog.body}
            confirmLabel={S.cancelDialog.confirm}
            cancelLabel={S.cancelDialog.cancel}
            variant="destructive"
            onConfirm={onCancel}
            trigger={<Button variant="destructive">{S.detail.actions.cancel}</Button>}
          />
          <ConfirmDialog
            title={S.issueDialog.title}
            description={S.issueDialog.body}
            confirmLabel={S.issueDialog.confirm}
            cancelLabel={S.issueDialog.cancel}
            onConfirm={onIssue}
            trigger={
              <Button>
                <PackageCheck className="size-4" data-icon="inline-start" />
                {S.detail.actions.issue}
              </Button>
            }
          />
        </>
      )}
      {hasReturnableLines && <ReturnModeButton />}
    </div>
  );
}
