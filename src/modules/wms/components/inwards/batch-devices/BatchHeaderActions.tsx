import { useNavigate } from "react-router-dom";
import { Check, ClipboardList, Loader2, MapPin, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ConfirmDialog } from "@/components/common/dialogs/ConfirmDialog";
import { INWARDS_STRINGS } from "../inwards.strings";
import type { BatchDevicesView } from "../../../hooks/inwards/useBatchDevices";
import type { BatchDerivedView } from "./batch-view-helpers";

type Props = { view: BatchDevicesView; derived: BatchDerivedView };

// Only the CONTENT is a component: ConfirmDialog clones its trigger, so the
// trigger itself must stay a real <Button>.
function FinalizeButtonContent({ pending, total }: { pending: boolean; total: number }) {
  return pending ? (
    <>
      <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
      {INWARDS_STRINGS.batchDevices.receiving}
    </>
  ) : (
    <>
      <Check className="size-4" data-icon="inline-start" />
      {INWARDS_STRINGS.batchDevices.finalizeButton(total)}
    </>
  );
}

/** Edit / Cancel / Finalize — the open-batch actions for inward managers. */
function OpenBatchActions({ view, derived }: Props) {
  const navigate = useNavigate();
  const { id, cancel, finalize } = view;
  const { stagedTotal } = derived;
  const finalizeDisabled = finalize.isPending || stagedTotal === 0;
  const finalizeButtonInner = (
    <FinalizeButtonContent pending={finalize.isPending} total={stagedTotal} />
  );
  return (
    <>
      <Button
        variant="outline"
        onClick={() => navigate(`/wms/inward/${id}/edit`)}
        disabled={cancel.isPending || finalize.isPending}
      >
        <Pencil className="size-4" data-icon="inline-start" />
        {INWARDS_STRINGS.batchDevices.editLineItems}
      </Button>
      <ConfirmDialog
        title={INWARDS_STRINGS.batchDevices.cancelDialogTitle}
        description={INWARDS_STRINGS.batchDevices.cancelDialogDescription(
          derived.batch.grn_number,
        )}
        confirmLabel={INWARDS_STRINGS.batchDevices.cancelConfirmLabel}
        cancelLabel={INWARDS_STRINGS.batchDevices.keepBatch}
        variant="destructive"
        onConfirm={view.handleCancelBatch}
        trigger={
          <Button
            variant="destructive"
            disabled={cancel.isPending || finalize.isPending}
          >
            {INWARDS_STRINGS.batchDevices.cancelConfirmLabel}
          </Button>
        }
      />
      {stagedTotal === 0 ? (
        // Disabled: a styled why-tooltip, never a native `title=` (§0.9). Base UI clones
        // the dialog trigger, so the tooltip wrapper can't live inside `trigger`.
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={<span className="inline-flex cursor-not-allowed" />}
            >
              <Button disabled={finalizeDisabled}>{finalizeButtonInner}</Button>
            </TooltipTrigger>
            <TooltipContent>
              {INWARDS_STRINGS.batchDevices.finalizeEmptyHint}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <ConfirmDialog
          title={INWARDS_STRINGS.batchDevices.finalizeDialogTitle}
          description={INWARDS_STRINGS.batchDevices.finalizeDialogDescription}
          confirmLabel={INWARDS_STRINGS.batchDevices.finalizeConfirmLabel(
            stagedTotal,
          )}
          onConfirm={view.handleFinalize}
          trigger={
            <Button disabled={finalizeDisabled}>{finalizeButtonInner}</Button>
          }
        />
      )}
    </>
  );
}

/** Assign Work / Assign Location — the post-receipt actions. */
function ClosedBatchActions({ view }: Pick<Props, "view">) {
  const navigate = useNavigate();
  const { id, isCompletedBatch, batchWarehouseId, parkUnits, setParkOpen } =
    view;
  return (
    <>
      {/* Issue this batch's waiting devices to an engineer without leaving the
          GRN. The storeman is already looking at the pallet; making them go to
          another screen and re-find the same GRN is the kind of step that gets
          skipped, and unassigned work is what this feature exists to stop. */}
      {isCompletedBatch && batchWarehouseId ? (
        <Button
          variant="outline"
          onClick={() =>
            navigate(
              `/wms/work-assignments/new?warehouse_id=${batchWarehouseId}&grn_batch_id=${id}`,
            )
          }
        >
          <ClipboardList className="size-4" data-icon="inline-start" />
          {INWARDS_STRINGS.batchDevices.assignWork}
        </Button>
      ) : null}
      {parkUnits.length > 0 ? (
        <Button variant="outline" onClick={() => setParkOpen(true)}>
          <MapPin className="size-4" data-icon="inline-start" />
          {INWARDS_STRINGS.batchDevices.assignLocation}
        </Button>
      ) : null}
    </>
  );
}

/** Shown only while the batch is open and only to inward managers (others would get a 403). */
export function BatchHeaderActions({ view, derived }: Props) {
  return derived.isOpen && view.canManageInward ? (
    <OpenBatchActions view={view} derived={derived} />
  ) : (
    <ClosedBatchActions view={view} />
  );
}
