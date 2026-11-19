import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { OperationDialog } from "@/components/common/dialogs/OperationDialog";
import { Typography } from "@/components/ui/typography";
import { FilePreviewDialog } from "@modules/attachments";

import type { DispatchRequestCreate } from "../../api/dispatch";
import { useDispatchStagedDocs } from "../../hooks/dispatches/useDispatchStagedDocs";
import { useDispatchChallanForm } from "../../hooks/purchase-returns/useDispatchChallanForm";
import type { DispatchDocUpload } from "../../hooks/purchase-returns/usePurchaseReturnMutations";
import { DispatchDocumentsField } from "../dispatches/DispatchDocumentsField";
import { DispatchChallanFields, DispatchUnitPicker } from "./DispatchDialogSections";
import { PURCHASE_RETURN_DETAIL_STRINGS as S } from "./purchase-returns.strings";

export interface DispatchChallan {
  awbNumber: string;
  driverName: string;
  driverPhone: string;
  /** When the vendor should receive it (ISO date, optional). The server stamps
   *  the departure itself, so there is no dispatch date here. */
  expectedDeliveryDate?: string;
  /** The units on THIS consignment. A return can leave on several trips, so
   *  the operator picks; everything shippable is ticked by default. */
  itemIds: string[];
  /** Where the units ship back to the vendor (free text). Optional. */
  returnAddress?: string;
  /** Courier / docket / mode / packages / freight + invoice amount, sent when
   *  the dispatch draft is created (billing is draft-only on the backend). */
  createMetadata?: DispatchRequestCreate["metadata"];
}

/** One unit the operator can put on this consignment. */
export interface ShippableUnit {
  id: string;
  serial: string;
  partLabel: string;
  disposition: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialReturnAddress?: string | null;
  /** Decided units still on the dock. Undecided ones are deliberately absent:
   *  the challan cannot leave a unit's remedy blank. */
  shippableUnits: ShippableUnit[];
  onConfirm: (challan: DispatchChallan, documents: DispatchDocUpload[]) => void;
  isPending?: boolean;
}

export function DispatchDialog({
  open,
  onOpenChange,
  initialReturnAddress,
  shippableUnits,
  onConfirm,
  isPending = false,
}: Props) {
  const form = useDispatchChallanForm(initialReturnAddress, shippableUnits);
  const { selectedIds, challan, canSubmit, blockReason } = form;
  // The challan usually travels with the units, so it is the first type offered.
  const docs = useDispatchStagedDocs("delivery_challan");

  return (
    <OperationDialog
      open={open}
      // No reset on close: the parent remounts this per open (its `key`).
      onOpenChange={onOpenChange}
      title={S.dispatchDialog.title}
      description={S.dispatchDialog.description}
      // Wide enough for the three-column Logistics grid.
      className="sm:max-w-2xl"
      bodyClassName="space-y-4"
      isDirty={form.dirty || docs.stagedDocs.length > 0}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose}>
            {S.dispatchDialog.cancel}
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex" />}>
                <Button
                  disabled={!canSubmit || isPending}
                  onClick={() => onConfirm(challan, docs.stagedDocs)}
                >
                  {isPending && (
                    <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
                  )}
                  {S.dispatchDialog.dispatch(
                    selectedIds.length,
                    shippableUnits.length,
                  )}
                </Button>
              </TooltipTrigger>
              {blockReason && !isPending && (
                <TooltipContent>{blockReason}</TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </>
      )}
    >
      <DispatchUnitPicker
        units={shippableUnits}
        selectedIds={selectedIds}
        onToggle={form.toggle}
      />

      <DispatchChallanFields form={form} />

      <div className="space-y-3">
        <div>
          <Typography variant="body-strong">{S.dispatchDialog.sections.documents}</Typography>
          <Typography variant="helper" tone="muted">
            {S.dispatchDialog.documentsHint}
          </Typography>
        </div>
        <DispatchDocumentsField
          docType={docs.docType}
          onDocTypeChange={docs.setDocType}
          rows={docs.docRows}
          onAddFiles={docs.addDocs}
          onRemove={(row) => docs.removeDocById(row.key)}
        />
      </div>

      <FilePreviewDialog
        target={docs.preview}
        onOpenChange={(isOpen) => {
          if (!isOpen) docs.closePreview();
        }}
      />
    </OperationDialog>
  );
}
