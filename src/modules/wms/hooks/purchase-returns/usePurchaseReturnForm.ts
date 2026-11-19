import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import type { AsyncSelectOption } from "@/components/ui/async-select";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { useNavigateBack } from "@/hooks/use-navigate-back";

import type { ReturnableUnit } from "../../api";
import {
  isSelectionInvalid,
  purchaseReturnCreateSchema,
  type ReturnSelections,
} from "../../components/purchase-returns/return-selection";
import {
  PURCHASE_RETURN_STRINGS as S,
  type ReturnReasonCode,
} from "../../components/purchase-returns/purchase-returns.strings";
import { firstBlockReason } from "../../components/purchase-returns/purchase-return-form-helpers";
import {
  buildPurchaseReturnCreate,
  patchSelection,
  stampAllSelections,
  toggleSelection,
} from "../../components/purchase-returns/return-selection-helpers";
import { useReturnableUnits } from "./usePurchaseReturns";
import { usePurchaseReturnMutations } from "./usePurchaseReturnMutations";
import { usePurchaseReturnDeepLink } from "./usePurchaseReturnDeepLink";

/** State, deep-link seeding, selection handlers and submit for the raise form. */
export function usePurchaseReturnForm() {
  const navigate = useNavigate();
  const { create } = usePurchaseReturnMutations();

  const [poOption, setPoOption] = useState<AsyncSelectOption | null>(null);
  const [headerNotes, setHeaderNotes] = useState("");
  // Keyed by stock_item_id — presence in the map means "selected".
  const [selections, setSelections] = useState<ReturnSelections>({});
  // Rows show "modified" only after a bulk apply has happened.
  const [hasBulkApplied, setHasBulkApplied] = useState(false);
  // PO change awaiting confirmation; `undefined` = no dialog, `next` may be null.
  const [pendingPoChange, setPendingPoChange] = useState<{
    next: AsyncSelectOption | null;
  } | null>(null);
  // A pending bulk apply awaiting confirmation (it would overwrite edited rows).
  const [pendingBulk, setPendingBulk] = useState<{
    reasonCode: ReturnReasonCode;
    notes: string;
  } | null>(null);

  const poId = poOption?.id ?? null;
  const unitsQuery = useReturnableUnits(poId);
  const units = useMemo(() => unitsQuery.data ?? [], [unitsQuery.data]);

  usePurchaseReturnDeepLink({
    poOption,
    setPoOption,
    poId,
    units: unitsQuery.data,
    unitsLoading: unitsQuery.isLoading,
    setSelections,
  });

  const selectedIds = useMemo(() => Object.keys(selections), [selections]);
  const selectedCount = selectedIds.length;

  const isDirty = poId != null || selectedCount > 0;
  const guard = useUnsavedChangesGuard({ isDirty });
  // Cancel/back returns to origin through the unsaved-changes guard (§10/§3.2).
  const navigateBack = useNavigateBack("/wms/purchase-returns");

  const canSubmit =
    selectedCount > 0 &&
    selectedIds.every((id) => !isSelectionInvalid(selections[id]));

  // §0.9: name the first unmet gate in the disabled Raise button's tooltip.
  const raiseBlockReason = firstBlockReason(selectedIds, selections);

  // ── Selection handlers ─────────────────────────────────────────────────

  function handlePoChange(next: AsyncSelectOption | null) {
    // Changing the PO clears the current selection — confirm first when there is
    // work to lose (§9 named-button confirm, replacing the old window.confirm).
    if (selectedCount > 0) {
      setPendingPoChange({ next });
      return;
    }
    applyPoChange(next);
  }

  function applyPoChange(next: AsyncSelectOption | null) {
    setPoOption(next);
    setSelections({});
  }

  function toggle(unit: ReturnableUnit) {
    setSelections((prev) => toggleSelection(prev, unit));
  }

  function changeReason(stockItemId: string, reasonCode: ReturnReasonCode) {
    // `edited` marks divergence from a bulk baseline — only meaningful once a
    // bulk apply exists. Before then it stays false so no "modified" tag shows.
    setSelections((prev) =>
      patchSelection(prev, stockItemId, { reasonCode, edited: hasBulkApplied }),
    );
  }

  function changeNotes(stockItemId: string, notes: string) {
    setSelections((prev) =>
      patchSelection(prev, stockItemId, { notes, edited: hasBulkApplied }),
    );
  }

  // Bulk apply stamps every selected row. Editing a row after a bulk apply
  // flips its `edited` flag; a second apply warns before clobbering those.
  function applyBulk(reasonCode: ReturnReasonCode, notes: string) {
    const hasEdited = selectedIds.some((id) => selections[id].edited);
    // Overwriting individually-edited rows is confirmed first (§9 named-button
    // confirm, replacing the old window.confirm).
    if (hasEdited) {
      setPendingBulk({ reasonCode, notes });
      return;
    }
    commitBulk(reasonCode, notes);
  }

  function commitBulk(reasonCode: ReturnReasonCode, notes: string) {
    setSelections((prev) => stampAllSelections(prev, reasonCode, notes));
    // From here on, an individual row edit is a genuine divergence from this
    // baseline — so `edited` (and the "modified" marker) become meaningful.
    setHasBulkApplied(true);
  }

  // ── Submit ──────────────────────────────────────────────────────────────

  function submit() {
    if (!poId) return;
    // Same gate order as the Raise button's tooltip: no units → missing
    // reason → missing "Other" note.
    const blocked = firstBlockReason(selectedIds, selections);
    if (blocked) {
      toast.error(blocked);
      return;
    }

    const body = buildPurchaseReturnCreate({ poId, headerNotes, selectedIds, selections });

    // Typed backstop (§9): validate the whole payload against the schema before sending.
    const parsed = purchaseReturnCreateSchema.safeParse(body);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? S.guard.missingReason);
      return;
    }

    create.mutate(body, {
      onSuccess: async (pr) => {
        // Suppress the discard guard for the post-save nav, then REPLACE the
        // form entry so browser Back skips the just-submitted form (§10).
        guard.bypassOnce();
        await guard.popSentinelIfPresent();
        navigate(`/wms/purchase-returns/${pr.id}`, { replace: true });
      },
    });
  }

  function confirmPoChange() {
    if (pendingPoChange) applyPoChange(pendingPoChange.next);
    setPendingPoChange(null);
  }

  function confirmBulk() {
    if (pendingBulk) commitBulk(pendingBulk.reasonCode, pendingBulk.notes);
    setPendingBulk(null);
  }

  return {
    guard,
    navigateBack,
    isPending: create.isPending,
    poOption,
    poId,
    handlePoChange,
    headerNotes,
    setHeaderNotes,
    unitsQuery,
    units,
    selections,
    selectedCount,
    canSubmit,
    raiseBlockReason,
    toggle,
    changeReason,
    changeNotes,
    applyBulk,
    submit,
    pendingPoChange,
    setPendingPoChange,
    confirmPoChange,
    pendingBulk,
    setPendingBulk,
    confirmBulk,
  };
}

export type PurchaseReturnFormState = ReturnType<typeof usePurchaseReturnForm>;
