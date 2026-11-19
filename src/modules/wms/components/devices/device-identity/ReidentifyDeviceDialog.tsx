/**
 * Re-identify a device onto the part it actually is.
 *
 * Deliberately does NOT move the PO booking — a box did arrive against that
 * line, and what was inside it is recorded separately as a discrepancy. The
 * hint in the body steers anyone who actually meant "wrong PO line" to the
 * other dialog, because the two mistakes look identical from the shop floor
 * and only one of them re-books.
 */
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { AsyncSelect } from "@/components/ui/async-select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Typography } from "@/components/ui/typography";
import { FieldError } from "@/components/common/forms/FieldError";
import { OperationDialog } from "../../shared/OperationDialog";

import { type VariantListItem, partOptionDescription } from "@modules/ims";
import { useReidentifyDevice } from "../../../hooks/device-identity/useDeviceIdentity";
import { useDeviceConditionVariantOptions } from "../../../hooks/device-identity/useDeviceConditionVariants";
import {
  reidentifyDeviceSchema,
  type ReidentifyDeviceInput,
} from "../../../schemas";
import { DEVICE_IDENTITY_STRINGS as S } from "./device-identity.strings";

interface ReidentifyDeviceDialogProps {
  /** Non-null opens the dialog. */
  deviceId: string | null;
  onClose: () => void;
  /** Received on a PO: shows the PO wording, condition rule and "Change PO line" hint. */
  poSourced?: boolean;
}

export function ReidentifyDeviceDialog({
  deviceId,
  onClose,
  poSourced = true,
}: ReidentifyDeviceDialogProps) {
  const open = deviceId !== null;
  const reidentify = useReidentifyDevice();

  // The PO condition is locked (D11) — scope the picker so the operator never
  // sees a variant the server would reject.
  const { variantOptions } = useDeviceConditionVariantOptions(deviceId, open);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // AsyncSelect stores the label alongside the id so the trigger renders even
  // when the picked row is not on the currently loaded pages (§16.11 #5).
  const [picked, setPicked] = useState<{ id: string; label: string } | null>(
    null,
  );

  const form = useForm<ReidentifyDeviceInput>({
    resolver: zodResolver(reidentifyDeviceSchema),
    defaultValues: { part_variant_id: "", reason: "" },
  });

  // The variant is picked via AsyncSelect (setValue without shouldDirty), so a
  // selection alone leaves RHF's isDirty false — track `picked` too. `reason`
  // registers through RHF, so isDirty covers that half.
  const dirty = form.formState.isDirty || picked !== null;

  const close = () => {
    form.reset();
    setPicked(null);
    setSubmitError(null);
    onClose();
  };

  const submit = form.handleSubmit(
    async (values) => {
      if (!deviceId) return;
      setSubmitError(null);
      try {
        await reidentify.mutateAsync({
          id: deviceId,
          body: {
            part_variant_id: values.part_variant_id,
            reason: values.reason,
          },
        });
        close();
      } catch (err) {
        // The condition rule (D11) can only be judged server-side — the client
        // does not know the PO's condition — so it surfaces here rather than
        // being pre-empted with a guess.
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
      title={S.reidentify.title}
      description={poSourced ? S.reidentify.description : S.reidentify.descriptionNoPo}
      isDirty={dirty}
      footer={({ requestClose }) => (
        <>
          <Button
            variant="outline"
            onClick={requestClose}
            disabled={reidentify.isPending}
          >
            {S.common.cancel}
          </Button>
          <Button onClick={submit} disabled={reidentify.isPending}>
            {reidentify.isPending && (
              <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            )}
            {reidentify.isPending ? S.common.saving : S.reidentify.submit}
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="reidentify_variant" required>
            {S.reidentify.variantLabel}
          </Label>
          <AsyncSelect<VariantListItem>
            id="reidentify_variant"
            value={picked}
            onValueChange={(opt) => {
              setPicked(opt);
              form.setValue("part_variant_id", opt?.id ?? "", {
                shouldValidate: form.formState.isSubmitted,
              });
            }}
            useOptions={variantOptions}
            toLabel={(v) => v.display_title || `${v.part_number} · ${v.name}`}
            getDescription={partOptionDescription}
            placeholder={S.reidentify.variantPlaceholder}
            searchPlaceholder={S.reidentify.variantSearchPlaceholder}
            clearable
            chevron="down"
            loadOnOpen
          />
          <FieldError
            message={form.formState.errors.part_variant_id?.message}
          />
          {poSourced ? (
            <Typography variant="helper" tone="muted">
              {S.reidentify.conditionHint}
            </Typography>
          ) : null}
        </div>

        <div className="space-y-1">
          <Label htmlFor="reidentify_reason" required>
            {S.reidentify.reasonLabel}
          </Label>
          <Textarea
            id="reidentify_reason"
            rows={3}
            placeholder={S.reidentify.reasonPlaceholder}
            {...form.register("reason")}
          />
          <FieldError message={form.formState.errors.reason?.message} />
        </div>

        {poSourced ? (
          <Typography variant="helper" tone="muted">
            {S.reidentify.relinkHint}
          </Typography>
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
