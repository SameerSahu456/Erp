import { Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { OperationDialog } from "../shared/OperationDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Typography } from "@/components/ui/typography";

import { useMaterialIssueQc } from "../../hooks/material-issue/useMaterialIssueQc";
import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";
import { MaterialIssueQcFields } from "./MaterialIssueQcFields";

type QcController = ReturnType<typeof useMaterialIssueQc>;

interface Props {
  materialIssueId: string;
  /** The line to QC, or null while no line is selected (dialog stays closed).
   *  Only the id is needed — this dialog starts an op against the line's unit,
   *  so both the detail line tree AND the flat worklist row can drive it. */
  lineId: string | null;
  /** A human label for the line (part/variant) — resolved by the caller, which
   *  already has the variant lookup. */
  lineLabel?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Per-line outward QC (spec §6, D20/D21). Opening starts a fresh op (a new cycle
// every time, e.g. "Re-run QC"). The checklist is binding only with a verdict
// item; otherwise a Pass/Fail result is required — never defaulted.
export function MaterialIssueQcDialog({
  materialIssueId,
  lineId,
  open,
  onOpenChange,
}: Props) {
  const qc = useMaterialIssueQc({ materialIssueId, lineId, open, onOpenChange });

  return (
    <OperationDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) qc.close();
      }}
      title={qc.starting ? S.qc.startTitle : S.qc.completeTitle}
      bodyClassName="min-w-0 space-y-4"
      isDirty={qc.dirty}
      footer={({ requestClose }) => (
        <QcDialogFooter qc={qc} requestClose={requestClose} />
      )}
    >
      {qc.starting ? (
        <Typography variant="body" tone="muted" asChild>
          <p>{S.qc.starting}</p>
        </Typography>
      ) : (
        <MaterialIssueQcFields qc={qc} />
      )}

      {qc.errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>
            <Typography variant="body">{qc.errorMessage}</Typography>
          </AlertDescription>
        </Alert>
      )}
    </OperationDialog>
  );
}

function QcDialogFooter({
  qc,
  requestClose,
}: {
  qc: QcController;
  requestClose: () => void;
}) {
  const showReason =
    qc.blockReason && !qc.submitting && !qc.starting && !qc.checklistLoading;
  return (
    <>
      <Button variant="outline" onClick={requestClose}>
        {S.qc.cancel}
      </Button>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex" />}>
            <Button onClick={qc.submit} disabled={!qc.canSubmit}>
              {qc.submitting && (
                <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
              )}
              {S.qc.submit}
            </Button>
          </TooltipTrigger>
          {showReason && <TooltipContent>{qc.blockReason}</TooltipContent>}
        </Tooltip>
      </TooltipProvider>
    </>
  );
}
