import { useState } from "react";
import { Loader2 } from "lucide-react";

import { DatePicker } from "@/components/common/pickers/DatePicker";
import { Button } from "@/components/ui/button";
import { OperationDialog } from "@/components/common/dialogs/OperationDialog";
import { Label } from "@/components/ui/label";
import { Typography } from "@/components/ui/typography";

import { useMarkDeviceDelivered } from "../../hooks/devices/useRentalDevices";
import { DEVICE_STRINGS as S } from "./devices.strings";
import { RENTALS_COMMON_STRINGS as C } from "../shared/common.strings";

export interface RecordDeliveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceId: string;
  /** The unit's dispatch date, used as the picker's floor. A delivery
   *  cannot precede it, and the API refuses one that does — bounding the
   *  input is the same rule stated where the operator can act on it. */
  dispatched: string | null;
  /** Pre-fills the picker when this unit already has a recorded delivery,
   *  so re-opening the dialog shows what is stored rather than today. */
  deliveredDate: string | null;
  /** Today, as `YYYY-MM-DD`. Passed in rather than computed here so the
   *  whole page agrees on one date across a midnight boundary. */
  today: string;
}

/** Records the day a unit reached the customer.
 *
 *  Billing moves off the `dispatched + grace` estimate onto this date, so
 *  the dialog says what the change does rather than only asking for a
 *  value — an operator picking a date here is changing what the next
 *  invoice charges.
 */
export function RecordDeliveryDialog({
  open,
  onOpenChange,
  deviceId,
  dispatched,
  deliveredDate,
  today,
}: RecordDeliveryDialogProps) {
  // Seeded once per mount. The caller mounts this only while the dialog is
  // open, so a fresh unit always gets a fresh initial value.
  const [value, setValue] = useState<string>(deliveredDate ?? today);
  const mutation = useMarkDeviceDelivered();

  function handleSubmit() {
    if (!value) return;
    mutation.mutate(
      { id: deviceId, delivered_on: value },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <OperationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={S.delivered.title}
      description={S.delivered.help}
      className="sm:max-w-md"
      isDirty={value !== (deliveredDate ?? "")}
      footer={({ requestClose }) => (
        <>
          <Button
            variant="outline"
            onClick={requestClose}
            disabled={mutation.isPending}
          >
            {C.cancel}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!value || mutation.isPending}
          >
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {mutation.isPending ? C.saving : C.save}
          </Button>
        </>
      )}
    >
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="delivered-on" required>
            {S.delivered.field}
          </Label>
          <DatePicker
            id="delivered-on"
            value={value}
            min={dispatched ?? undefined}
            onChange={setValue}
            disabled={mutation.isPending}
          />
        </div>

        {mutation.isError ? (
          <Typography variant="helper" tone="danger">
            {mutation.error instanceof Error
              ? mutation.error.message
              : S.delivered.failed}
          </Typography>
        ) : null}
    </OperationDialog>
  );
}
