import { ApiError } from "@shared/api/envelope";
import { GENERIC_ERROR_FALLBACK } from "./errorMessage";

/**
 * Operator-friendly messages keyed by the backend's WMS/inward error codes
 * (app/modules/wms/error_codes.py). The raw backend messages are developer-
 * oriented ("PATCH the draft with lines[]", "payload.source_entity_id …"), so
 * we map the codes to actionable text. Anything not listed falls back to the
 * backend's own message.
 */
export const INWARD_ERROR_MESSAGES: Record<string, string> = {
  // ── create / source validation ──
  INWARD_SOURCE_TYPE_MISMATCH:
    "A line on this batch isn't tied to the purchase order. Remove off-PO items (or pick the matching source) before finalizing.",
  INWARD_NO_PENDING_RETURNS: "This source has no units awaiting return — nothing to receive.",
  // INWARD_RETURN_POOL_INSUFFICIENT is not mapped: the backend message names the shortfall.
  INWARD_TYPE_NOT_SUPPORTED: "This inward type isn't supported.",
  WAREHOUSE_NOT_FOUND: "The selected warehouse no longer exists.",
  WAREHOUSE_INACTIVE: "The selected warehouse is inactive — pick an active one.",
  ORIGIN_PO_ONLY: "Origin (New / Refurbished) only applies to Purchase Order inwards.",
  PO_WAREHOUSE_MISMATCH:
    "The receiving warehouse must match the purchase order's destination warehouse.",
  PURCHASE_ORDER_NO_PENDING_QUANTITY:
    "This purchase order has nothing left to receive.",
  TRANSFER_DESTINATION_MISMATCH:
    "A warehouse transfer must be received at its original destination warehouse.",

  // ── line items / finalize ──
  GRN_FINALIZE_NO_LINES: "Add at least one line item before finalizing.",
  GRN_RETURN_QTY_INCOMPLETE:
    "Some dispatched units are still pending return. Receive every expected unit, or split into another batch.",
  QTY_RETURN_NOT_ALLOWED_FOR_TRACKED:
    "Serialized parts must be scanned one serial per unit — a quantity isn't allowed for tracked items.",
  MANUFACTURER_SERIAL_DUPLICATE:
    "That serial number is already in inventory (or repeated in this batch). Use a unique serial.",
  DUPLICATE_STOCK_IN_BATCH: "That unit is already added to this batch.",
  SUBSTITUTION_REASON_REQUIRED:
    "Add a substitution reason — the returned unit's variant differs from what was dispatched.",
  PO_ITEM_VARIANT_REQUIRED:
    "Pick a part for the description-only PO line before receiving it.",
  PART_SELECTION_REQUIRED:
    "Pick a part for every line before receiving it.",
  PART_VARIANT_NOT_FOUND:
    "The selected part no longer exists — pick a current part.",
  PO_ITEM_BATCH_MISMATCH:
    "A line doesn't belong to this purchase order. Remove it or pick the matching PO line.",
  QUANTITY_ON_TRACKED_COMPONENT:
    "Tracked BOM components need a serial each — quantity only applies to non-tracked components.",
  CATEGORY_NOT_BOM_ELIGIBLE: "This part's category can't hold a BOM assembly.",

  // ── return / transfer source lookups ──
  SALES_ORDER_NOT_FOUND: "That sales order couldn't be found — pick another source.",
  DEMO_REQUEST_NOT_FOUND: "That demo request couldn't be found — pick another source.",
  REPLACEMENT_REQUEST_NOT_FOUND:
    "That replacement request couldn't be found — pick another source.",
  STAFF_DISPATCH_NOT_FOUND:
    "That staff issuance couldn't be found — pick another source.",
  TRANSFER_DISPATCH_NOT_FOUND:
    "That warehouse transfer couldn't be found — pick another source.",

  // ── batch state ──
  GRN_BATCH_NOT_FOUND: "This inward batch no longer exists.",
  GRN_BATCH_NOT_OPEN: "This batch is no longer open.",
  GRN_BATCH_NOT_EDITABLE: "This batch is already finalized or cancelled and can't be edited.",
  GRN_BATCH_NOT_CANCELLABLE: "This batch can't be cancelled in its current state.",
  GRN_NUMBER_GEN_FAILED: "Couldn't allocate a GRN number — please retry.",
};

/** Pull the offending manufacturer serial out of a finalize
 *  `MANUFACTURER_SERIAL_DUPLICATE` error so the edit form can flag that exact
 *  field. The backend embeds it in the message as `manufacturer_serial 'XYZ' …`
 *  (it names the serial but not the line, and stops at the first duplicate).
 *  Returns null for any other error or if no serial can be parsed. */
export function duplicateSerialFromError(e: unknown): string | null {
  if (!(e instanceof ApiError) || e.businessCode !== "MANUFACTURER_SERIAL_DUPLICATE") {
    return null;
  }
  for (const msg of [e.envMessage, e.message]) {
    const m = msg?.match(/manufacturer_serial\s+'([^']+)'/i);
    if (m) return m[1];
  }
  return null;
}

/** Resolve any thrown error to an operator-friendly message (code-mapped,
 *  else the backend's message, else a generic fallback). For a validation
 *  error (422) we surface the first field's detail — "Validation failed" alone
 *  doesn't tell the operator which input to fix. */
export function inwardErrorMessage(e: unknown): string {
  const code = e instanceof ApiError ? e.businessCode : undefined;
  if (code && INWARD_ERROR_MESSAGES[code]) return INWARD_ERROR_MESSAGES[code];
  if (e instanceof ApiError && e.statusCode === 422) {
    const first = e.firstError;
    if (first?.message) {
      return first.field
        ? `Check "${first.field}": ${first.message}`
        : first.message;
    }
  }
  return e instanceof Error ? e.message : GENERIC_ERROR_FALLBACK;
}
