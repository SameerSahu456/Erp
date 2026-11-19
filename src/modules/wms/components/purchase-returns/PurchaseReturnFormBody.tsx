import { Info } from "lucide-react";

import { Typography } from "@/components/ui/typography";
import { FormPageShell } from "@/components/page-shells";
import { ConfirmDialog } from "@/components/common/dialogs/ConfirmDialog";

import { usePurchaseReturnForm } from "../../hooks/purchase-returns/usePurchaseReturnForm";
import { PURCHASE_RETURN_STRINGS as S } from "./purchase-returns.strings";
import {
  PurchaseReturnFormFooterActions,
  PurchaseReturnSourceCard,
  PurchaseReturnUnitsCard,
} from "./PurchaseReturnFormSections";

/** Raise a purchase return: pick a PO, select its returnable units, give reasons. */
export function PurchaseReturnFormBody() {
  const f = usePurchaseReturnForm();

  return (
    <FormPageShell
      title={S.title}
      subtitle={S.subtitle}
      backHref="/wms/purchase-returns"
      guard={f.guard}
      footerLeft={f.selectedCount > 0 ? S.raiseWarning(f.selectedCount) : undefined}
      footerActions={<PurchaseReturnFormFooterActions f={f} />}
    >
      <div className="-mt-2 space-y-4">
        {/* Return source: which PO the units came in on, plus optional notes. */}
        <PurchaseReturnSourceCard f={f} />

        {/* Units to return */}
        <PurchaseReturnUnitsCard f={f} />

        {/* Dispatch + settlement live on the detail page and open once procurement
            has decided every unit. Surfaced as a quiet hint, not a dead panel. */}
        {f.selectedCount > 0 && (
          <div className="flex items-start gap-2 px-1">
            <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <Typography variant="helper" tone="muted">
              {S.logistics.locked}
            </Typography>
          </div>
        )}
      </div>

      {/* Changing the PO discards the current selection — confirm before clearing. */}
      <ConfirmDialog
        open={f.pendingPoChange != null}
        onOpenChange={(open) => !open && f.setPendingPoChange(null)}
        title={S.changePoTitle}
        description={S.changePoWarning}
        confirmLabel={S.changePoConfirm}
        cancelLabel={S.changePoKeep}
        variant="destructive"
        onConfirm={f.confirmPoChange}
      />

      {/* Bulk apply would overwrite individually-edited rows — confirm first. */}
      <ConfirmDialog
        open={f.pendingBulk != null}
        onOpenChange={(open) => !open && f.setPendingBulk(null)}
        title={S.bulkClobberTitle}
        description={S.bulkClobberWarning}
        confirmLabel={S.bulkClobberConfirm}
        cancelLabel={S.bulkClobberKeep}
        variant="destructive"
        onConfirm={f.confirmBulk}
      />
    </FormPageShell>
  );
}
