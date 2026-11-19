import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useGrnBatch } from "../inwards/useInwards";
import { useRelinkPoItem } from "./useDeviceIdentity";
import { useDeviceConditionVariantOptions } from "./useDeviceConditionVariants";
import type { POExpectedLine } from "../../api";
import { relinkPoItemSchema, type RelinkPoItemInput } from "../../schemas";
import { DEVICE_IDENTITY_STRINGS as S } from "../../components/devices/device-identity/device-identity.strings";

interface UseRelinkPoItemDialogArgs {
  deviceId: string | null;
  grnBatchId: string | null;
  currentPoItemId?: string | null;
  onClose: () => void;
}

/** Form, line options and submit for `RelinkPoItemDialog`. */
export function useRelinkPoItemDialog({
  deviceId,
  grnBatchId,
  currentPoItemId,
  onClose,
}: UseRelinkPoItemDialogArgs) {
  const open = deviceId !== null && grnBatchId !== null;
  const relink = useRelinkPoItem();
  // For a description-only target line the operator names the part that arrived;
  // it must keep the PO's condition (D11), so scope the variant picker to it.
  const { variantOptions } = useDeviceConditionVariantOptions(deviceId, open);
  // useGrnBatch is enabled on a non-empty id, so '' keeps it idle while the
  // dialog is closed instead of firing a request per device row.
  const batch = useGrnBatch(open && grnBatchId ? grnBatchId : "");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pickedVariant, setPickedVariant] = useState<{
    id: string;
    label: string;
  } | null>(null);

  const form = useForm<RelinkPoItemInput>({
    resolver: zodResolver(relinkPoItemSchema),
    defaultValues: { purchase_order_item_id: "", reason: "" },
  });

  /** Only PO lines, and never the one the device already sits on. */
  const lines = useMemo<POExpectedLine[]>(() => {
    const rows = (batch.data?.expected_lines ?? []) as POExpectedLine[];
    return rows.filter(
      (l) =>
        l.source_line_entity_type === "purchase_order_items" &&
        l.source_line_entity_id !== currentPoItemId,
    );
  }, [batch.data, currentPoItemId]);

  // Plain state rather than form.watch(): the value drives a conditional
  // FIELD (the variant picker), and watch() is not safely memoizable.
  const [selectedLineId, setSelectedLineId] = useState("");
  const selectedLine = lines.find(
    (l) => l.source_line_entity_id === selectedLineId,
  );
  const needsVariant = !!selectedLine && !selectedLine.part_variant_id;

  // Why Change line is disabled (§0.9): no other line on the PO. Ignores
  // isPending so no stale reason shows mid-submit.
  const blockReason: string | null =
    lines.length === 0 ? S.relink.blocked : null;

  // Line + variant are plain state, so RHF's isDirty (only `reason`) is OR'd with them.
  const dirty =
    form.formState.isDirty || selectedLineId !== "" || pickedVariant !== null;

  const close = () => {
    form.reset();
    // Plain state outside RHF — reset it too, or a reopen shows the previous
    // line selected against a cleared form.
    setSelectedLineId("");
    setPickedVariant(null);
    setSubmitError(null);
    onClose();
  };

  const selectLine = (next: string | null) => {
    // Base UI's Select can emit null (its clear path); an empty
    // value stands for "nothing picked" and the schema rejects it.
    setSelectedLineId(next ?? "");
    form.setValue("purchase_order_item_id", next ?? "", {
      shouldValidate: form.formState.isSubmitted,
    });
  };

  // No invalid-callback banner: the inline <FieldError> already names the
  // offending field; submitError is kept for API errors.
  const submit = form.handleSubmit(async (values) => {
    if (!deviceId) return;
    setSubmitError(null);
    if (needsVariant && !pickedVariant) {
      setSubmitError(S.relink.variantHint);
      return;
    }
    try {
      await relink.mutateAsync({
        id: deviceId,
        body: {
          purchase_order_item_id: values.purchase_order_item_id,
          // Only meaningful for a description-only target; the line's own
          // variant wins server-side in every other case.
          part_variant_id: needsVariant ? (pickedVariant?.id ?? null) : null,
          reason: values.reason,
        },
      });
      close();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    }
  });

  return {
    open,
    relink,
    variantOptions,
    batch,
    submitError,
    pickedVariant,
    setPickedVariant,
    form,
    lines,
    selectedLineId,
    selectedLine,
    needsVariant,
    blockReason,
    dirty,
    close,
    selectLine,
    submit,
  };
}
