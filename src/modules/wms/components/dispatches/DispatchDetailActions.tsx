import { FileText, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DispatchCancelState } from "../../hooks/dispatches/useDispatchCancel";
import { DispatchAttachmentsSection } from "./DispatchAttachmentsSection";
import { DISPATCH_DETAIL_STRINGS as S } from "./dispatch-detail.strings";

interface DispatchHeaderActionsProps {
  status: string;
  canManage: boolean;
  finalising: boolean;
  onFinalise: () => void;
  cancel: DispatchCancelState;
}

/** Finalise (draft only) + Recall (draft / dispatched), both OUTWARD_MANAGE-gated. */
export function DispatchHeaderActions({
  status,
  canManage,
  finalising,
  onFinalise,
  cancel,
}: DispatchHeaderActionsProps) {
  const canRecall = status === "draft" || status === "dispatched";
  return (
    <div className="flex items-center gap-2">
      {status === "draft" && canManage && (
        <Button onClick={onFinalise} disabled={finalising}>
          {finalising && <Loader2 className="size-4 animate-spin" data-icon="inline-start" />}
          {finalising ? S.finalising : S.finalise}
        </Button>
      )}
      {canRecall && canManage && (
        <Button variant="destructive" onClick={cancel.open} disabled={cancel.isPending}>
          {cancel.isPending ? S.cancelling : S.recall}
        </Button>
      )}
    </div>
  );
}

/** Documents are add/remove-able only while the dispatch is a DRAFT (UI rule;
 *  the backend attachment policy has no status gate). */
export function DispatchDocumentsCard({ dispatchId, isDraft }: { dispatchId: string; isDraft: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="size-4 text-primary" />
          {S.documentsHeading}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <DispatchAttachmentsSection dispatchId={dispatchId} editable={isDraft} />
      </CardContent>
    </Card>
  );
}
