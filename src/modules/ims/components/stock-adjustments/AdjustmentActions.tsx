import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Check, Loader2, MoreHorizontal, Pencil, Printer, Send, Undo2, X } from "lucide-react";

import { ConfirmDialog } from "@/components/common/dialogs/ConfirmDialog";
import { ReasonDialog } from "@/components/common/dialogs/ReasonDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { StockAdjustmentActions } from "../../hooks/stock-adjustments/useStockAdjustmentActions";
import type { AdjustmentActionFlags } from "../../lib/stock-adjustment-actions";
import { ApproveAdjustmentDialog } from "./ApproveAdjustmentDialog";
import { STOCK_ADJUSTMENTS_STRINGS as S } from "./stock-adjustments.strings";

const A = S.actions;
type Dialog = "cancel" | "approve" | "reject" | null;

/** The action's own icon, or a spinner while that action runs. */
function ActionIcon({ pending, children }: { pending: boolean; children: ReactNode }) {
  return pending ? <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden /> : children;
}

/** Cancel / Reject live behind "⋯", away from the forward actions. */
function DestructiveMenu({
  flags,
  busy,
  onPick,
}: {
  flags: AdjustmentActionFlags;
  busy: boolean;
  onPick: (dialog: Exclude<Dialog, "approve" | null>) => void;
}) {
  if (!flags.cancel && !flags.reject) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="icon" aria-label={A.more} disabled={busy}>
            <MoreHorizontal className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {flags.cancel ? (
          <DropdownMenuItem variant="destructive" onClick={() => onPick("cancel")}>
            <X className="size-4" />
            {A.cancel}
          </DropdownMenuItem>
        ) : null}
        {flags.reject ? (
          <DropdownMenuItem variant="destructive" onClick={() => onPick("reject")}>
            <X className="size-4" />
            {A.reject}
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ForwardActions({
  id,
  flags,
  actions,
  onApprove,
  onPrintLabels,
  printing,
}: {
  id: string;
  flags: AdjustmentActionFlags;
  actions: StockAdjustmentActions;
  onApprove: () => void;
  onPrintLabels: () => void;
  printing: boolean;
}) {
  const busy = actions.isPending;
  return (
    <>
      {flags.edit ? (
        <Button variant="outline" render={<Link to={`/ims/stock-adjustments/${id}/edit`} />}>
          <Pencil className="mr-1.5 size-4" />
          {A.edit}
        </Button>
      ) : null}
      {flags.returnToDraft ? (
        <Button variant="outline" onClick={() => actions.returnToDraft.mutate()} disabled={busy}>
          <ActionIcon pending={actions.returnToDraft.isPending}><Undo2 className="mr-1.5 size-4" /></ActionIcon>
          {A.returnToDraft}
        </Button>
      ) : null}
      {flags.printLabels ? (
        <Button variant="outline" onClick={onPrintLabels} disabled={printing}>
          <ActionIcon pending={printing}><Printer className="mr-1.5 size-4" /></ActionIcon>
          {A.printLabels}
        </Button>
      ) : null}
      {flags.submit ? (
        <Button onClick={() => actions.submit.mutate()} disabled={busy}>
          <ActionIcon pending={actions.submit.isPending}><Send className="mr-1.5 size-4" /></ActionIcon>
          {A.submit}
        </Button>
      ) : null}
      {flags.approve ? (
        <Button onClick={onApprove} disabled={busy}>
          <ActionIcon pending={actions.approve.isPending}><Check className="mr-1.5 size-4" /></ActionIcon>
          {A.approve}
        </Button>
      ) : null}
    </>
  );
}

/** State-dependent actions of the detail header (spec D9). */
export function AdjustmentActions({
  id,
  flags,
  actions,
  onPrintLabels,
  printing,
}: {
  id: string;
  flags: AdjustmentActionFlags;
  actions: StockAdjustmentActions;
  onPrintLabels: () => void;
  printing: boolean;
}) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const closeOn = (open: boolean) => !open && setDialog(null);
  // The shared confirm button does not close the dialog; close it here.
  const confirmThen = (run: () => void) => () => {
    setDialog(null);
    run();
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DestructiveMenu flags={flags} busy={actions.isPending} onPick={setDialog} />
      <ForwardActions
        id={id}
        flags={flags}
        actions={actions}
        onApprove={() => setDialog("approve")}
        onPrintLabels={onPrintLabels}
        printing={printing}
      />
      <ConfirmDialog
        open={dialog === "cancel"}
        onOpenChange={closeOn}
        title={A.cancelTitle}
        description={A.cancelBody}
        confirmLabel={A.cancelConfirm}
        cancelLabel={A.cancelDismiss}
        variant="destructive"
        onConfirm={confirmThen(() => actions.cancel.mutate())}
      />
      <ApproveAdjustmentDialog
        open={dialog === "approve"}
        onOpenChange={closeOn}
        selfApproval={flags.selfApproval}
        canReject={flags.reject}
        onApprove={confirmThen(() => actions.approve.mutate(null))}
        onReject={() => setDialog("reject")}
      />
      {dialog === "reject" ? (
        <ReasonDialog
          copy={A.rejectDialog}
          pending={actions.reject.isPending}
          onConfirm={async (reason) => {
            await actions.reject.mutateAsync(reason);
          }}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </div>
  );
}
