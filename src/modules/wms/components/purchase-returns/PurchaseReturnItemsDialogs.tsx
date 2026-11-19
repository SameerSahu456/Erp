import { ConfirmDialog } from "@/components/common/dialogs/ConfirmDialog";

import type { PurchaseReturnItemsTableState } from "../../hooks/purchase-returns/usePurchaseReturnItemsTable";
import { PURCHASE_RETURN_DETAIL_STRINGS as S } from "./purchase-returns.strings";

/** The four confirmations behind the items table's destructive / bulk actions. */
export function PurchaseReturnItemsDialogs({ t }: { t: PurchaseReturnItemsTableState }) {
  return (
    <>
      {/* Reject is destructive + irreversible (restores the unit to stock), so
          it's confirmed before firing rather than acting on the menu click. */}
      <ConfirmDialog
        open={t.rejectTarget != null}
        onOpenChange={(open) => !open && t.setRejectTarget(null)}
        title={S.units.rejectConfirmTitle}
        description={S.units.rejectConfirmBody}
        confirmLabel={S.units.confirmReject}
        variant="destructive"
        onConfirm={() => {
          if (t.rejectTarget) void t.rejectOne(t.rejectTarget.id);
          t.setRejectTarget(null);
        }}
      />

      <ConfirmDialog
        open={t.bulkApplyOpen}
        onOpenChange={t.setBulkApplyOpen}
        title={S.units.applySelectedConfirmTitle}
        description={S.units.applySelectedConfirmBody(t.selectedUndecided.length)}
        confirmLabel={S.units.confirmApply}
        onConfirm={() => {
          void t.applyBulk();
          t.setBulkApplyOpen(false);
        }}
      />

      <ConfirmDialog
        open={t.bulkRejectOpen}
        onOpenChange={t.setBulkRejectOpen}
        title={S.units.rejectSelectedConfirmTitle}
        description={S.units.rejectSelectedConfirmBody(t.selectedUndecided.length)}
        confirmLabel={S.units.confirmReject}
        variant="destructive"
        onConfirm={() => {
          void t.rejectSelected();
          t.setBulkRejectOpen(false);
        }}
      />

      {/* Remove restores the unit to its prior stock state and can't be undone,
          so it's confirmed before firing rather than acting on the menu click. */}
      <ConfirmDialog
        open={t.removeTarget != null}
        onOpenChange={(open) => !open && t.setRemoveTarget(null)}
        title={S.units.removeConfirmTitle}
        description={S.units.removeConfirmBody}
        confirmLabel={S.units.confirmRemove}
        variant="destructive"
        onConfirm={() => {
          if (t.removeTarget) void t.removeOne(t.removeTarget.id);
          t.setRemoveTarget(null);
        }}
      />
    </>
  );
}
