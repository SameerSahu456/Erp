/**
 * Record a device's OEM serial after inward — or correct one recorded wrongly.
 *
 * Two modes behind one dialog, decided by whether a serial is already set:
 * FILLING a blank explains itself, so no reason is asked. REPLACING a recorded
 * one changes which physical unit this record identifies, so a reason is
 * mandatory and only a store/warehouse manager may do it. The gate is the
 * caller's to enforce (see `canCorrectDevice`); this dialog mirrors the
 * REASON half of the rule so the operator is stopped here rather than by a 400.
 */
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Typography } from "@/components/ui/typography";
import { FieldError } from "@/components/common/forms/FieldError";
import { OperationDialog } from "../../shared/OperationDialog";

import { useRecordManufacturerSerial } from "../../../hooks/device-identity/useDeviceIdentity";
import { recordSerialSchema, type RecordSerialInput } from "../../../schemas";
import { DEVICE_IDENTITY_STRINGS as S } from "./device-identity.strings";

/** NOTE: the resolver is built from `isCorrection`, and form state persists
 *  across renders — so callers MUST give this a `key` that changes with the
 *  device (and its fill/correct mode). A fresh mount is what resets the form;
 *  doing it in an effect would set state during render-commit for no gain. */
interface RecordSerialDialogProps {
  /** Non-null opens the dialog. */
  deviceId: string | null;
  /** The serial on record right now — null puts the dialog in FILL mode. */
  currentSerial: string | null;
  onClose: () => void;
}

export function RecordSerialDialog({
  deviceId,
  currentSerial,
  onClose,
}: RecordSerialDialogProps) {
  const open = deviceId !== null;
  const isCorrection = currentSerial !== null;
  const record = useRecordManufacturerSerial();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<RecordSerialInput>({
    resolver: zodResolver(recordSerialSchema(isCorrection)),
    defaultValues: { manufacturer_serial: "", reason: "" },
  });

  // Both inputs register through RHF, so any typed serial (or reason, in
  // correction mode) flips isDirty — a clean dialog still closes silently.
  const dirty = form.formState.isDirty;

  const close = () => {
    form.reset();
    setSubmitError(null);
    onClose();
  };

  const submit = form.handleSubmit(
    async (values) => {
      if (!deviceId) return;
      setSubmitError(null);
      try {
        await record.mutateAsync({
          id: deviceId,
          body: {
            manufacturer_serial: values.manufacturer_serial,
            // Send the reason only when there is one — the backend reads its
            // presence as "this is a correction".
            reason: values.reason?.trim() ? values.reason.trim() : null,
          },
        });
        close();
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : String(err));
      }
    },
    // No invalid-callback banner: the inline <FieldError> already names the
    // offending field, so a second "fix the highlighted fields" message was a
    // redundant double error. submitError is kept for API errors.
  );

  return (
    <OperationDialog
      open={open}
      onOpenChange={(next) => !next && close()}
      title={isCorrection ? S.serial.correctTitle : S.serial.fillTitle}
      description={
        isCorrection ? S.serial.correctDescription : S.serial.fillDescription
      }
      isDirty={dirty}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose} disabled={record.isPending}>
            {S.common.cancel}
          </Button>
          <Button onClick={submit} disabled={record.isPending}>
            {record.isPending && (
              <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            )}
            {record.isPending ? S.common.saving : S.serial.submit}
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        {isCorrection ? (
          <div className="flex min-w-0 items-baseline gap-2">
            <Typography variant="helper" tone="muted" className="shrink-0">
              {S.serial.currentLabel}
            </Typography>
            <Typography
              variant="body-strong"
              truncate
              className="min-w-0 flex-1"
            >
              {currentSerial}
            </Typography>
          </div>
        ) : null}

        <div className="space-y-1">
          <Label htmlFor="manufacturer_serial" required>
            {S.serial.serialLabel}
          </Label>
          <Input
            id="manufacturer_serial"
            autoFocus
            placeholder={S.serial.serialPlaceholder}
            {...form.register("manufacturer_serial")}
          />
          <FieldError
            message={form.formState.errors.manufacturer_serial?.message}
          />
        </div>

        {isCorrection ? (
          <div className="space-y-1">
            <Label htmlFor="serial_reason" required>
              {S.serial.reasonLabel}
            </Label>
            <Textarea
              id="serial_reason"
              rows={3}
              placeholder={S.serial.reasonPlaceholder}
              {...form.register("reason")}
            />
            <FieldError message={form.formState.errors.reason?.message} />
          </div>
        ) : null}

        {submitError ? (
          <Typography variant="helper" tone="danger">
            {submitError}
          </Typography>
        ) : null}
      </div>
    </OperationDialog>
  );
}
