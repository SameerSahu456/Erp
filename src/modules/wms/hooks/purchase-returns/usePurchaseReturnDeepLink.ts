import { useEffect, useMemo, useRef, type Dispatch, type SetStateAction } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import type { AsyncSelectOption } from "@/components/ui/async-select";
import { UI } from "@/shared/constants/ui";
import { asUuid, isUuid } from "@/shared/lib/validation";
import { usePurchaseOrder } from "@modules/procurement";

import type { ReturnableUnit } from "../../api";
import type { ReturnSelections } from "../../components/purchase-returns/return-selection";
import {
  PURCHASE_RETURN_STRINGS as S,
  RETURN_REASON_CODES,
  type ReturnReasonCode,
} from "../../components/purchase-returns/purchase-returns.strings";

/**
 * Seeds the raise form from a deep link (`?po=&po_no=&units=&reason=&notes=`).
 * Uses effects because the PO label and returnable units load async.
 */
export function usePurchaseReturnDeepLink({
  poOption,
  setPoOption,
  poId,
  units,
  unitsLoading,
  setSelections,
}: {
  poOption: AsyncSelectOption | null;
  setPoOption: Dispatch<SetStateAction<AsyncSelectOption | null>>;
  poId: string | null;
  units: ReturnableUnit[] | undefined;
  unitsLoading: boolean;
  setSelections: Dispatch<SetStateAction<ReturnSelections>>;
}) {
  const [searchParams] = useSearchParams();

  // §11.1 — URL params are untrusted: only a real UUID reaches the API; a
  // malformed `po` / unit id is dropped rather than sent for a 422.
  const initialPoId = asUuid(searchParams.get("po")?.trim()) ?? "";
  // `po_no` labels the picker without a procurement:read fetch the raiser may lack.
  const initialPoNumber = (searchParams.get("po_no") ?? "").slice(
    0,
    UI.SEARCH_MAX_LENGTH,
  );
  // Memoised on the raw string so the seeding effect's dependency stays stable.
  const rawUnits = searchParams.get("units") ?? "";
  const initialUnitIds = useMemo(
    () =>
      rawUnits
        .split(",")
        .map((id) => id.trim())
        .filter(isUuid),
    [rawUnits],
  );
  const initialReason = searchParams.get("reason") ?? "";
  const initialNotes = searchParams.get("notes") ?? "";
  const deepLinkAppliedRef = useRef(false);

  // Fetch the PO only when the link has no `po_no`.
  const poLookup = usePurchaseOrder(
    initialPoId && !initialPoNumber ? initialPoId : null,
  );

  useEffect(() => {
    if (!initialPoId || poOption != null) return;
    // Prefer the deep-link's PO number (no fetch); else use the detail lookup.
    const label = initialPoNumber || poLookup.data?.po_number;
    if (!label) return;
    const supplierName = initialPoNumber ? undefined : poLookup.data?.supplier?.name;
    const timer = window.setTimeout(() => {
      setPoOption({
        id: initialPoId,
        label: supplierName ? `${label} · ${supplierName}` : label,
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialPoId, initialPoNumber, poLookup.data, poOption, setPoOption]);

  useEffect(() => {
    if (deepLinkAppliedRef.current) return;
    if (!initialPoId || poId !== initialPoId) return;
    if (unitsLoading || !units) return;

    const validReason = RETURN_REASON_CODES.includes(initialReason as ReturnReasonCode)
      ? (initialReason as ReturnReasonCode)
      : "failed_inspection";

    const next: ReturnSelections = {};
    let dropped = 0;
    for (const unitId of initialUnitIds) {
      const unit = units.find((entry) => entry.stock_item_id === unitId);
      if (!unit || !unit.returnable) {
        dropped += 1;
        continue;
      }
      next[unitId] = {
        reasonCode: validReason,
        notes: initialNotes,
        edited: false,
      };
    }

    const timer = window.setTimeout(() => {
      if (Object.keys(next).length > 0) {
        setSelections((prev) => ({ ...prev, ...next }));
      }
      if (dropped > 0) {
        toast.warning(S.unitsSkipped(dropped));
      }
      deepLinkAppliedRef.current = true;
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialNotes, initialPoId, initialReason, initialUnitIds, poId, units, unitsLoading, setSelections]);
}
