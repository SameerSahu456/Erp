/**
 * Move a device to the purchase-order line it was actually received against.
 *
 * The line picker is fed from the device's OWN GRN batch, so it can only ever
 * offer lines on the same PO — the backend's same-PO rule (spec D8) is
 * therefore structural here rather than a validation the UI could forget.
 *
 * A description-only target line names no part, so the operator must say which
 * part arrived; the variant picker appears only in that case, mirroring the
 * backend's PO_ITEM_VARIANT_REQUIRED.
 */
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Typography } from "@/components/ui/typography";
import { FieldError } from "@/components/common/forms/FieldError";
import { OperationDialog } from "../../shared/OperationDialog";

import { useRelinkPoItemDialog } from "../../../hooks/device-identity/useRelinkPoItemDialog";
import {
  RelinkLineField,
  RelinkPoItemFooter,
  RelinkVariantField,
} from "./RelinkPoItemFields";
import { DEVICE_IDENTITY_STRINGS as S } from "./device-identity.strings";

interface RelinkPoItemDialogProps {
  /** Non-null opens the dialog. */
  deviceId: string | null;
  /** The device's inward batch — the source of the selectable PO lines. */
  grnBatchId: string | null;
  /** The line the device sits on now; excluded from the options. */
  currentPoItemId?: string | null;
  onClose: () => void;
}

export function RelinkPoItemDialog({
  deviceId,
  grnBatchId,
  currentPoItemId,
  onClose,
}: RelinkPoItemDialogProps) {
  const c = useRelinkPoItemDialog({ deviceId, grnBatchId, currentPoItemId, onClose });
  const { form, lines, relink } = c;

  return (
    <OperationDialog
      open={c.open}
      onOpenChange={(next) => !next && c.close()}
      title={S.relink.title}
      description={S.relink.description}
      isDirty={c.dirty}
      footer={({ requestClose }) => (
        <RelinkPoItemFooter
          requestClose={requestClose}
          isPending={relink.isPending}
          noLines={lines.length === 0}
          blockReason={c.blockReason}
          onSubmit={c.submit}
        />
      )}
    >
      <div className="space-y-4">
        {lines.length === 0 && !c.batch.isLoading ? (
          <Typography variant="helper" tone="muted">
            {S.relink.noLines}
          </Typography>
        ) : (
          <RelinkLineField
            lines={lines}
            selectedLineId={c.selectedLineId}
            selectedLine={c.selectedLine}
            onSelectLine={c.selectLine}
            form={form}
          />
        )}

        {c.needsVariant ? (
          <RelinkVariantField
            value={c.pickedVariant}
            onValueChange={c.setPickedVariant}
            useOptions={c.variantOptions}
          />
        ) : null}

        <div className="space-y-1">
          <Label htmlFor="relink_reason" required>
            {S.relink.reasonLabel}
          </Label>
          <Textarea
            id="relink_reason"
            rows={3}
            placeholder={S.relink.reasonPlaceholder}
            {...form.register("reason")}
          />
          <FieldError message={form.formState.errors.reason?.message} />
        </div>

        {c.submitError ? (
          <Typography variant="helper" tone="danger">
            {c.submitError}
          </Typography>
        ) : null}
      </div>
    </OperationDialog>
  );
}
