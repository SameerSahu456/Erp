// Shared selection model for the purchase-return raise form — the per-unit
// pick state plus its validity rule. Kept out of the component file so the
// table can export only its component (react-refresh/only-export-components).

import { z } from "zod";

import { RETURN_REASON_CODES, type ReturnReasonCode } from "./purchase-returns.strings";

// A return ships in a handful of trips, not hundreds — one page is the whole
// history, so the Consignments panel (and the detail header that reuses the
// SAME list query key) deliberately has no pager. Shared here so both sites
// use one value: the page_size is part of the query key, so if they ever drift
// they'd hit two different caches. §16.6: named, not a bare literal.
export const CONSIGNMENTS_PAGE_SIZE = 50;

// One operator's pick for a single unit. `reasonCode === ""` means "selected
// but no reason yet" — the submit guard blocks on it. `edited` flips true when
// the row is changed individually AFTER a bulk apply, so a second bulk apply
// can warn before clobbering the hand-tuned value.
export interface ReturnSelection {
  reasonCode: ReturnReasonCode | "";
  notes: string;
  edited: boolean;
}

export type ReturnSelections = Record<string, ReturnSelection>;

/** A selected row is invalid until it has a reason, and — when the reason is
 *  `other` — a note. Mirrors the server's re-validation. */
export function isSelectionInvalid(sel: ReturnSelection): boolean {
  if (sel.reasonCode === "") return true;
  if (sel.reasonCode === "other" && sel.notes.trim() === "") return true;
  return false;
}

// Single typed schema for the create payload — the one source of truth the
// submit path validates against before calling the API (§9). It encodes the
// same rules as isSelectionInvalid + the server: a uuid PO, at least one line,
// a valid reason code, and a note whenever the reason is `other`. The per-row
// submit gates stay for precise inline messages; this is the typed backstop.
const returnReasonCodeSchema = z
  .string()
  .refine(
    (v): v is ReturnReasonCode =>
      (RETURN_REASON_CODES as readonly string[]).includes(v),
    { message: "Pick a valid return reason." },
  );

export const purchaseReturnCreateSchema = z.object({
  purchase_order_id: z.string().uuid(),
  notes: z.string().trim().optional(),
  items: z
    .array(
      z
        .object({
          stock_item_id: z.string().uuid(),
          reason_code: returnReasonCodeSchema,
          reason_notes: z.string().trim().optional(),
        })
        .refine((it) => it.reason_code !== "other" || !!it.reason_notes, {
          message: "A note is required when the reason is Other.",
          path: ["reason_notes"],
        }),
    )
    .min(1, "Select at least one unit to return."),
});
