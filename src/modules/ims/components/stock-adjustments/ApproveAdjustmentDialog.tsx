import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

import { STOCK_ADJUSTMENTS_STRINGS as S } from "./stock-adjustments.strings";

const A = S.actions;

/** The Pending Approval confirm: Approve, Reject (hands off to the reason
 *  dialog), or back out. ConfirmDialog's shape plus the Reject choice. */
export function ApproveAdjustmentDialog({
  open,
  onOpenChange,
  selfApproval,
  canReject,
  onApprove,
  onReject,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selfApproval: boolean;
  canReject: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{A.approveTitle}</AlertDialogTitle>
          <AlertDialogDescription className="break-words">
            {A.approveDescription(selfApproval)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{A.approveDismiss}</AlertDialogCancel>
          {canReject ? (
            <Button variant="destructive" onClick={onReject}>
              {A.reject}
            </Button>
          ) : null}
          <AlertDialogAction onClick={onApprove}>{A.approveConfirm}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
