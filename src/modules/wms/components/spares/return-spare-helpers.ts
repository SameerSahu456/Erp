import type { useSpareMovements } from "../../hooks/spares/useSpares";
import { SPARES_STRINGS as S } from "./spares.strings";

export interface ReturnSubject {
  id: string;
  partVariantId: string;
  partLabel: string;
  fulfilled: number;
  returned: number;
}

type Movement = NonNullable<ReturnType<typeof useSpareMovements>["data"]>[number];

/** Units picked (`spare_request`) and still loose — not returned (`spare_return`)
 *  and not fitted into the device (`spare_fitted`). Derived from the ledger so it
 *  matches the backend's check; these are the units a return or a fit acts on. */
export function returnableUnitIds(rows: Movement[]): string[] {
  const returned = new Set(
    rows
      .filter((r) => (r.event_type === "spare_return" || r.event_type === "spare_fitted") && r.stock_item_id)
      .map((r) => r.stock_item_id as string),
  );
  const picked: string[] = [];
  for (const r of rows) {
    if (r.event_type !== "spare_request" || !r.stock_item_id) continue;
    if (returned.has(r.stock_item_id) || picked.includes(r.stock_item_id)) continue;
    picked.push(r.stock_item_id);
  }
  return picked;
}

/** First unmet DATA gate on the Return button (§0.9), for the why-tooltip. */
export function returnBlockReason(args: {
  selectedCount: number;
  allPlaced: boolean;
  reasonCode: string;
  isOther: boolean;
  notes: string;
}): string | null {
  const B = S.returnDialog.blocked;
  if (args.selectedCount === 0) return B.noUnits;
  if (!args.allPlaced) return B.noLocation;
  if (!args.reasonCode) return B.noReason;
  if (args.isOther && args.notes.trim().length === 0) return B.noNote;
  return null;
}
