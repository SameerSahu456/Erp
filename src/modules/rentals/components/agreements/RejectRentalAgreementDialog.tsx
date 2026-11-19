import { useState } from "react";

import { Textarea } from "@/components/ui/textarea";

import { useRejectAgreement } from "../../hooks/agreements/useAgreement";
import { AGREEMENTS_STRINGS as S } from "./agreements.strings";
import { ActionDialog, type ActionProps } from "./ActionDialog";
import { ActionField } from "./ActionField";

const R = S.actions.reject;

/** Send the agreement's terms back to Draft. The reason is required — it
 *  is what the person reconfiguring acts on — so Reject stays disabled
 *  until one is typed, rather than letting the server refuse it. */
export function RejectRentalAgreementDialog({ salesOrderId, open, onOpenChange, onDone }: ActionProps) {
  const [reason, setReason] = useState("");
  const mut = useRejectAgreement();
  const trimmed = reason.trim();

  function submit() {
    mut.mutate(
      { id: salesOrderId, reason: trimmed },
      {
        onSuccess: () => {
          onOpenChange(false);
          onDone?.();
        },
      },
    );
  }

  return (
    <ActionDialog
      isDirty={reason !== ""}
      open={open}
      onOpenChange={onOpenChange}
      title={R.title}
      description={R.description}
      submitLabel={R.submit}
      pending={mut.isPending}
      error={mut.error}
      canSubmit={trimmed !== ""}
      onSubmit={submit}
    >
      <ActionField label={R.reasonLabel} htmlFor="reject-reason">
        <Textarea
          id="reject-reason"
          rows={3}
          maxLength={2000}
          placeholder={R.reasonPlaceholder}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </ActionField>
    </ActionDialog>
  );
}
