import { useQuery } from "@tanstack/react-query"

import { apiClient } from "@/shared/api/client"
import { endpoints } from "@/shared/api/endpoints"

import { discountCapError } from "../../line-items"
import type { BomChildRow, BuilderLineItem } from "../../line-items"
import { TAXES } from "../../../constants/taxes"
import type { AccountAddressWire, SalesOrderAddressData, SOLineCondition } from "../../../api"

// ── Local form types ─────────────────────────────────────────────────────

export interface LocalLine {
  tempKey: string
  serverId?: string
  // ID of the source quote_item this line is drawing from. Set only on
  // quote-driven create rows so the save path can build
  // `quote_line_quantities: { quoteItemId: qty }`. Edit mode leaves this
  // undefined — backend uses `items[].id` for updates.
  quoteItemId?: string
  // Catalog link (set after picking a part via PartLineFields). When set,
  // backend auto-fills rate/tax_rate/category_id from the variant + parent
  // part + HSN; freeform fields below are display-only.
  partVariantId?: string
  partSku?: string
  partName?: string
  /** Parent IMS Part UUID — stored so the VariantPicker can filter sibling
   *  variants on the grid row without an extra round-trip. */
  partImsId?: string
  // Freeform fields (also display the catalog autofill values).
  itemName: string
  description: string
  // Per-line category. Required for freeform; auto-set from variant on catalog.
  categoryId: string
  // Per-line Brand/OEM (optional). FK to /ims/oems; empty when unset.
  oemId?: string
  // Per-line condition (optional) — the variant's physical condition
  // (new / refurbished / new_pull), NOT the header order type. Auto-set
  // from the variant on catalog rows; undefined when unset.
  condition?: SOLineCondition
  qty: string
  // Snapshot of the qty at load time — set only on quote-driven flows
  // (prefill from quote item or hydration from a persisted SO with a
  // sales_quote_id). In qtyOnly mode this is the upper bound: sales can
  // decrease qty (e.g. customer scaled back the order) but never raise it
  // above the quoted amount. Undefined on Direct rows → no cap.
  originalQty?: number
  rate: string
  /** Catalog list price of the picked variant (`VariantListItem.sell_price`).
   *  Client-only — not sent to the backend. Captured at part-pick time so the
   *  grid's "List Price" column shows the catalog price next to the actual
   *  (possibly discounted) `rate`. Unset for freeform rows and for lines
   *  hydrated from an existing SO until the user re-picks the variant. */
  listPrice?: number
  taxRate: string
  discountAmount: string
  // Approver — optional on Draft create/update, REQUIRED at Submit time.
  // Backend rejects Submit with SO_LINE_MISSING_APPROVER if any line is
  // missing one, and SO_APPROVER_LACKS_PERMISSION if the picked user does
  // not hold crm:so_approve. The picker doesn't filter by permission;
  // backend is the source of truth.
  approverId?: string
  approverName?: string
  // Rental support — backend rejects is_rental=true on SO today
  // (SO_RENTAL_NOT_SUPPORTED). Field shape matches Quote so the form
  // can be wired through cleanly once backend lifts the gate.
  isRental: boolean
  rentalPeriod?: "day" | "month"
  rentalStartDate?: string // ISO YYYY-MM-DD
  rentalEndDate?: string
  sortOrder: number
  // BOM children (free-form Add components) + expand state for the shared
  // LineItemBomEditor. Persisted via the parent item's inline children[].
  bomChildren?: BomChildRow[]
  isBomExpanded?: boolean
  /** Mirrors VariantListItem.is_bom_eligible — set from PickedPart on part
   *  pick; undefined for freeform / server-loaded lines (treated as true so
   *  the "Add component" button shows, matching the old stacked-view default). */
  isBomEligible?: boolean
  // Per-line configuration notes — forwarded into the SO item's
  // `configuration_notes` on save.
  configurationNotes?: string
  // Per-line warranty — free text; forwarded into the SO item's
  // `warranty_level` on save. Mirrors `configurationNotes` across every
  // path (hydrate from existing SO, calculate, baseline/dirty, save).
  warrantyLevel?: string
}

// Source mode chosen by sales at the top of the form. Drives the rest of
// the layout.
//
//   direct      → orderable_type='account', sales_quote_id=null. FE picks
//                 account/contact/addresses; line items are typed inline.
//   from-quote  → sales_quote_id set; orderable_type derived from the
//                 quote's quotable_type. Items are deep-copied server-side
//                 from the quote; FE shows them read-only.
//                 - quote.quotable_type='account' → FE may override contact
//                   + addresses (or accept the defaults).
//                 - quote.quotable_type='deal'    → same as account.
//                 - quote.quotable_type='lead'    → FE MUST supply
//                   billing_address_data; shipping_address_data optional.
//                   account_id / contact_id / address_id are IGNORED
//                   (cascade creates fresh rows).
export type SourceMode = "direct" | "from-quote"

export function nextKey(): string {
  return `li-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** A blank line.
 *
 *  `isRental` follows the ORDER, because `is_rental` is not a per-line
 *  choice on a rental order — the backend SETS it true on every line of
 *  one (`_apply_rental_line_defaults`). It also decides whether the
 *  per-line billing-period picker draws at all, so a rental order whose
 *  lines start `false` can never take a shorter window for one item. */
export function emptyLine(sortOrder: number, isRental = false): LocalLine {
  return {
    tempKey: nextKey(),
    itemName: "",
    description: "",
    categoryId: "",
    qty: "1",
    // Rate/discount default to "0" (not "") so the inputs show 0 up front —
    // matching the Quote builder's number model. "" is reserved for the
    // transient mid-edit draft while the user clears the field.
    rate: "0",
    // Default tax is 18% (TAXES.DEFAULT_TAX_RATE); a picked part's HSN GST
    // rate overrides it, and the user can still type any rate.
    taxRate: String(TAXES.DEFAULT_TAX_RATE),
    discountAmount: "0",
    isRental,
    sortOrder,
    bomChildren: [],
    isBomExpanded: false,
    configurationNotes: undefined,
    warrantyLevel: undefined,
  }
}

export function emptyAddressData(): SalesOrderAddressData {
  return { line1: "", line2: "", city: "", state: "", pincode: "", label: "" }
}

export function toNumberOrUndef(s: string | number | null | undefined): number | undefined {
  if (s == null) return undefined
  if (typeof s === "number") {
    return Number.isFinite(s) ? s : undefined
  }
  if (!s.trim()) return undefined
  const n = Number(s)
  return Number.isFinite(n) ? n : undefined
}

// ── Account-scoped queries ───────────────────────────────────────────────

export function useAddressesForAccount(accountId: string | null) {
  return useQuery({
    queryKey: ["crm", "accounts", "detail", accountId, "addresses"],
    queryFn: () =>
      apiClient.get<AccountAddressWire[]>(
        endpoints.crm.accountAddresses(accountId as string),
      ),
    enabled: !!accountId,
  })
}

export function validateAddressData(d: SalesOrderAddressData): boolean {
  return Boolean(d.line1.trim() && d.city.trim() && d.state.trim() && d.pincode.trim())
}

export function trimAddressData(d: SalesOrderAddressData): SalesOrderAddressData {
  return {
    line1: d.line1.trim(),
    line2: d.line2?.trim() || null,
    city: d.city.trim(),
    state: d.state.trim(),
    pincode: d.pincode.trim(),
    label: d.label?.trim() || null,
  }
}

// Per-line discount guard — mirrors QuoteBuilderPanel.lineDiscountError. The
// backend enforces `discount_amount <= gross_amount` (qty × rate) and 422s the
// whole /calculate call when any line breaks it, so we flag it live (under the
// Disc input) and gate the request. Rentals included: a rental line's gross
// is qty × rate too — its rate is the rent per period, not multiplied by the
// tenure (`crm/calculations/service.py` `compute_line_amounts`).
export function lineDiscountError(l: LocalLine): string | null {
  const da = toNumberOrUndef(l.discountAmount)
  if (da == null) return null
  const qty = toNumberOrUndef(l.qty) ?? 0
  const rate = toNumberOrUndef(l.rate) ?? 0
  return discountCapError(da, qty * rate)
}

// ── LocalLine ⇄ BuilderLineItem adapters ─────────────────────────────────────
//
// Used by SalesOrderLineItemsGrid (the adapter onto the shared LineItemsSection).
// The SO form keeps numeric fields as raw strings; the shared row works on the
// number+draft model, so the string is exposed as the draft and parsed for the
// committed number. Patches map back by preferring the draft while typing and
// stringifying the committed number on blur.

export function localLineToBuilder(l: LocalLine): BuilderLineItem {
  return {
    id: l.tempKey,
    type: l.partVariantId ? "ims_part" : "description",
    partId: l.partVariantId,
    partSku: l.partSku,
    partName: l.partName ?? (l.itemName || undefined),
    partImsId: l.partImsId,
    itemName: l.itemName,
    categoryId: l.categoryId || undefined,
    oemId: l.oemId || undefined,
    condition: l.condition,
    description: l.description,
    qty: Math.floor(Number(l.qty)) || 0,
    qtyInput: l.qty,
    rate: Number(l.rate) || 0,
    rateInput: l.rate,
    listPrice: l.listPrice,
    discountAmount: Number(l.discountAmount) || 0,
    discountAmountInput: l.discountAmount,
    taxRate: Number(l.taxRate) || 0,
    taxRateInput: l.taxRate,
    isRental: l.isRental,
    rentalPeriod: l.rentalPeriod,
    rentalStartDate: l.rentalStartDate,
    rentalEndDate: l.rentalEndDate,
    warrantyLevel: l.warrantyLevel,
    bomChildren: l.bomChildren ?? [],
    isBomExpanded: l.isBomExpanded ?? false,
    // Default true: SO lines have always allowed components (the old stacked
    // view used showBom=true); only a non-eligible catalog pick overrides this.
    isBomEligible: l.isBomEligible ?? true,
  }
}

export function builderPatchToLocal(u: Partial<BuilderLineItem>): Partial<LocalLine> {
  const o: Partial<LocalLine> = {}
  if ("partId" in u) o.partVariantId = u.partId
  if ("partSku" in u) o.partSku = u.partSku
  if ("partName" in u) o.partName = u.partName
  if ("partImsId" in u) o.partImsId = u.partImsId
  if ("itemName" in u) o.itemName = u.itemName ?? ""
  if ("categoryId" in u) o.categoryId = u.categoryId ?? ""
  if ("oemId" in u) o.oemId = u.oemId
  if ("condition" in u)
    o.condition = (u.condition || undefined) as SOLineCondition | undefined
  if ("description" in u) o.description = u.description ?? ""
  if ("qtyInput" in u || "qty" in u)
    o.qty = u.qtyInput != null ? u.qtyInput : String(u.qty ?? "")
  if ("rateInput" in u || "rate" in u)
    o.rate = u.rateInput != null ? u.rateInput : String(u.rate ?? "")
  if ("discountAmountInput" in u || "discountAmount" in u)
    o.discountAmount =
      u.discountAmountInput != null
        ? u.discountAmountInput
        : String(u.discountAmount ?? "")
  if ("taxRateInput" in u || "taxRate" in u)
    o.taxRate = u.taxRateInput != null ? u.taxRateInput : String(u.taxRate ?? "")
  if ("isRental" in u) o.isRental = u.isRental ?? false
  if ("rentalPeriod" in u) o.rentalPeriod = u.rentalPeriod
  if ("rentalStartDate" in u) o.rentalStartDate = u.rentalStartDate
  if ("rentalEndDate" in u) o.rentalEndDate = u.rentalEndDate
  if ("bomChildren" in u) o.bomChildren = u.bomChildren
  if ("isBomExpanded" in u) o.isBomExpanded = u.isBomExpanded
  if ("warrantyLevel" in u) o.warrantyLevel = u.warrantyLevel
  return o
}
