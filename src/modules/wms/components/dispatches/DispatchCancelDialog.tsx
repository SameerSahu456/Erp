import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { DispatchCancelState } from "../../hooks/dispatches/useDispatchCancel";
import { DISPATCH_DETAIL_STRINGS as S } from "./dispatch-detail.strings";

/** Cancel / recall — an in-app dialog (replaces the browser prompt) that
 *  captures a mandatory reason before cancelling. */
export function DispatchCancelDialog({
  cancel,
  isVendorReturn,
}: {
  cancel: DispatchCancelState;
  isVendorReturn: boolean;
}) {
  // §0.9 — the cancel confirm is disabled until its required reason is filled;
  // name that fixable gate in a tooltip (pending is not a fixable gate).
  const cancelBlockReason = !cancel.cancelReason.trim()
    ? S.cancelDialog.blockedReason
    : null;
  return (
    <Dialog open={cancel.cancelOpen} onOpenChange={cancel.onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{S.cancelDialog.title}</DialogTitle>
          <DialogDescription>
            {isVendorReturn
              ? S.cancelDialog.vendorReturnDescription
              : S.cancelDialog.description}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 pt-1">
          <Label required>{S.cancelDialog.reasonLabel}</Label>
          <Textarea
            value={cancel.cancelReason}
            onChange={(e) => cancel.setCancelReason(e.target.value)}
            placeholder={S.cancelDialog.reasonPlaceholder}
            rows={3}
            className="max-h-40 resize-none"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={cancel.dismiss}>
            {S.cancelDialog.dismiss}
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex" />}>
                <Button
                  variant="destructive"
                  onClick={cancel.confirmCancel}
                  disabled={!cancel.cancelReason.trim() || cancel.isPending}
                >
                  {cancel.isPending && (
                    <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
                  )}
                  {cancel.isPending ? S.cancelling : S.cancelDialog.confirm}
                </Button>
              </TooltipTrigger>
              {cancelBlockReason && !cancel.isPending && (
                <TooltipContent>{cancelBlockReason}</TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
