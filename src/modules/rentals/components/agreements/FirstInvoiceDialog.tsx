import { ConfirmDialog } from "@/components/common/dialogs/ConfirmDialog";

import { useGenerateFirstInvoice } from "../../hooks/agreements/useRentalSalesOrders";
import { AGREEMENTS_STRINGS as S } from "./agreements.strings";
import { RENTALS_COMMON_STRINGS as C } from "../shared/common.strings";

const F = S.actions.firstInvoice;

interface FirstInvoiceDialogProps {
  salesOrderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Confirms rental-billing's "Generate 1st Invoice" — the one-time pro-rata
 *  stub from the billing start to the day before the first billing day.
 *  Whether it is allowed is the server's call (the menu entry is disabled
 *  with its reason), so this only confirms. The action button does not close
 *  the dialog by itself, so it closes when the invoice is raised. */
export function FirstInvoiceDialog({
  salesOrderId,
  open,
  onOpenChange,
}: FirstInvoiceDialogProps) {
  const generate = useGenerateFirstInvoice();
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={F.title}
      description={F.description}
      confirmLabel={F.submit}
      cancelLabel={C.cancel}
      // Closes once the invoice is raised; on an error it stays open to retry.
      onConfirm={() => generate.mutate(salesOrderId, { onSuccess: () => onOpenChange(false) })}
    />
  );
}
