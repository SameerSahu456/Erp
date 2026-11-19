import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { OperationDialog } from "../shared/OperationDialog";
import { WAREHOUSE_TEAM_STRINGS as S } from "./warehouse-team.strings";

const D = S.removeDialog;
const REASON_ROWS = 3;

interface Props {
  memberName: string | undefined;
  open: boolean;
  onClose: () => void;
  reason: string;
  onReasonChange: (v: string) => void;
  pending: boolean;
  onConfirm: () => void;
}

/** Remove-from-team confirm — a reason is mandatory (BR-6). */
export function RemoveTeamMemberDialog({
  memberName = "",
  open,
  onClose,
  reason,
  onReasonChange,
  pending,
  onConfirm,
}: Props) {
  // §0.9 — the confirm is disabled until the required reason is filled; name
  // that fixable gate in a tooltip (pending is not a fixable gate).
  const blockReason = reason.trim() ? null : D.blockedReason;

  return (
    <OperationDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={D.title(memberName)}
      description={D.description}
      isDirty={!!reason.trim()}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose} disabled={pending}>
            {D.cancel}
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex" />}>
                <Button variant="destructive" onClick={onConfirm} disabled={blockReason != null || pending}>
                  {pending ? D.removing : D.remove}
                </Button>
              </TooltipTrigger>
              {blockReason && !pending && <TooltipContent>{blockReason}</TooltipContent>}
            </Tooltip>
          </TooltipProvider>
        </>
      )}
    >
      <div className="flex flex-col gap-4">
        <Alert variant="destructive" className="border-destructive/20 bg-destructive/10">
          <AlertCircle />
          <AlertTitle>{D.openWorkTitle}</AlertTitle>
          <AlertDescription>{D.openWork(memberName)}</AlertDescription>
        </Alert>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="remove-reason" required>
            {D.reasonLabel}
          </Label>
          {/* A reason is a paragraph → Textarea, not a single-line Input (§3.1). */}
          <Textarea
            id="remove-reason"
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder={D.reasonPlaceholder}
            rows={REASON_ROWS}
            autoFocus
          />
        </div>
      </div>
    </OperationDialog>
  );
}
