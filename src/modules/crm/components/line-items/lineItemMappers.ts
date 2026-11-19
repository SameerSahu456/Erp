// Pure helpers shared by the three line-item consumers: id generation,
// "draft string → committed number" input handlers, empty-row factories,
// BOM-child → API payload mapping, and calc-line flattening (so the running
// total reflects BOM component pricing even though the calculate endpoints
// take a flat items[] array).

import { roundMoney } from "@/shared/lib/money"
import { stripHtml } from "@/lib/utils"

import { clampPriceDigits, clampQtyDigits } from "../../constants/line-items"
import { TAXES } from "../../constants/taxes"
import { LINE_ITEMS_STRINGS } from "./line-items.strings"
import type {
  BomChildRow,
  BuilderLineItem,
  LineDraftNums,
} from "./types"

// Shared message for the per-line / per-child discount cap. The backend
// enforces `discount_amount <= gross_amount` and 422s the whole /calculate
// request when any row breaks it, so we mirror the rule client-side.
// A discount may be anything below the line gross; above it and equal to it
// get their own message so the user knows which rule they hit.
export function discountCapError(discount: number, gross: number): string | null {
  if (!Number.isFinite(discount) || discount <= 0) return null
  if (discount > gross + 0.01) return LINE_ITEMS_STRINGS.validation.discountExceedsAmount
  if (discount >= gross - 0.01) return LINE_ITEMS_STRINGS.validation.discountIsFullAmount
  return null
}

export const RATE_GT_ZERO_MSG = LINE_ITEMS_STRINGS.validation.ratePositive

export const IDENTITY_REQUIRED_MSG = LINE_ITEMS_STRINGS.validation.identityRequired

// True once a BOM child carries an identity: a picked part (part number) OR a
// typed description. Freeform children have no name input — their text lives
// in `description` — so those are the only two identity fields. A child with
// neither is a blank row that must not be persisted with a placeholder name.
export function bomChildHasIdentity(c: BomChildRow): boolean {
  return Boolean(c.partId) || Boolean(c.itemName?.trim()) || stripHtml(c.description).length > 0
}

// Returns the identity error for a BOM child that has neither a part number
// nor a description, else null. Blocks save so blank children are never sent.
export function bomChildIdentityError(c: BomChildRow): string | null {
  return bomChildHasIdentity(c) ? null : IDENTITY_REQUIRED_MSG
}

// Returns the discount error for a BOM child when its discount exceeds the
// row amount (qty × rate), else null. Used both to keep the offending child
// out of the calc payload and to flag it inline under its Disc input.
// Per-line discount cap on the shared BuilderLineItem shape — the backend
// enforces `discount_amount < gross_amount` and 422s the whole /calculate
// call when any line breaks it, so the grid flags it live. Rentals included:
// a rental line's gross is qty × rate too — its rate is the rent per period
// (`crm/calculations/service.py` `compute_line_amounts`, since 2026-11-02).
export function lineDiscountError(li: BuilderLineItem): string | null {
  return discountCapError(li.discountAmount, li.qty * li.rate)
}

export function bomChildDiscountError(c: BomChildRow): string | null {
  return discountCapError(c.discountAmount, c.qty * c.rate)
}

// Returns a rate error for a BOM child whose price is 0 (or invalid), else
// null. Only "started" rows are flagged — a row carrying a picked part, a
// typed name, or a description — so a freshly-added blank component row
// doesn't shout before the user has filled it (that empty state is caught by
// `bomChildIdentityError` instead). Used both to block save and to flag
// inline under Rate.
export function bomChildRateError(c: BomChildRow): string | null {
  if (!bomChildHasIdentity(c)) return null
  return !Number.isFinite(c.rate) || c.rate <= 0 ? RATE_GT_ZERO_MSG : null
}

export const CATEGORY_REQUIRED_MSG = LINE_ITEMS_STRINGS.validation.categoryRequired
export const NAME_REQUIRED_MSG = LINE_ITEMS_STRINGS.validation.nameRequired

// Category is mandatory on every BOM component, same as the parent line.
// Catalog children auto-fill it from the picked part; freeform children
// must select one explicitly. Only "started" rows are flagged (identity
// present) so a fresh blank row doesn't shout before the user fills it.
// Used both to flag inline under the Category picker and to block save.
export function bomChildCategoryError(c: BomChildRow): string | null {
  if (!bomChildHasIdentity(c)) return null
  return c.categoryId ? null : CATEGORY_REQUIRED_MSG
}

// Part Name is mandatory on every BOM component. Catalog children auto-fill
// it from the picked part; freeform children must type one. Only "started"
// rows are flagged (identity present) so a fresh blank row doesn't shout
// before the user fills it — that empty state is caught by
// `bomChildIdentityError` instead.
export function bomChildNameError(c: BomChildRow): string | null {
  if (!bomChildHasIdentity(c)) return null
  return c.itemName?.trim() ? null : NAME_REQUIRED_MSG
}

export const OEM_REQUIRED_MSG = LINE_ITEMS_STRINGS.validation.oemRequired
export const CONDITION_REQUIRED_MSG = LINE_ITEMS_STRINGS.validation.conditionRequired

// Brand/OEM + Condition on a component — mandatory on Sales Order surfaces
// (callers pass `oemConditionRequired`). Same gating as Category: only a
// started freeform row is flagged; a linked part supplies both.
export function bomChildOemError(c: BomChildRow): string | null {
  if (!bomChildHasIdentity(c) || c.partId) return null
  return c.oemId ? null : OEM_REQUIRED_MSG
}

export function bomChildConditionError(c: BomChildRow): string | null {
  if (!bomChildHasIdentity(c) || c.partId) return null
  return c.condition ? null : CONDITION_REQUIRED_MSG
}

let _idCounter = 0
export function genId(prefix = "li"): string {
  _idCounter += 1
  // No Date.now()/Math.random() needed — a monotonic counter is unique
  // within a form session, which is all these local ids must be.
  return `${prefix}-${_idCounter}`
}

// ── Row factories ───────────────────────────────────────────────────────

export function createEmptyBomChild(): BomChildRow {
  return {
    id: genId("bom"),
    itemName: "",
    qty: 1,
    rate: 0,
    discountAmount: 0,
    // Default tax is 18%; a picked part's HSN GST rate overrides it.
    taxRate: TAXES.DEFAULT_TAX_RATE,
    taxRateInput: undefined,
  }
}

// ── Draft-number input handlers (return a Partial to merge into the row) ──
// Mirrors the commit/blur behaviour that lived inline in QuoteBuilderPanel.

// Strip formatting a paste commonly carries (thousands separators,
// whitespace/newlines from copying a cell, a stray ₹) so a pasted number is
// accepted the same as a typed one. Without this, a formatted paste fails
// the digit test and the value silently never lands in state — the symptom
// being "the discount I pasted wasn't validated and /calculate still ran".
export function sanitizeNumericInput(raw: string): string {
  return raw.replace(/[,\s₹]/g, "")
}

export function applyQtyInput(raw: string): Partial<LineDraftNums> | null {
  // Whole numbers only.
  let cleaned = sanitizeNumericInput(raw)
  if (cleaned !== "" && !/^\d+$/.test(cleaned)) return null
  // Cap the digit count (shared across all line-item surfaces). TRUNCATE
  // rather than reject — a paste longer than the cap keeps its first
  // MAX_QTY_DIGITS digits instead of silently dropping the whole value.
  cleaned = clampQtyDigits(cleaned)
  if (cleaned === "") return { qtyInput: "" }
  const parsed = Number.parseInt(cleaned, 10)
  return {
    qtyInput: cleaned,
    ...(Number.isFinite(parsed) && parsed >= 1 ? { qty: parsed } : {}),
  }
}

export function commitQty(raw: string | undefined): Partial<LineDraftNums> {
  // No draft → nothing to commit. Without this guard, tabbing through a cell
  // that was populated by Excel-paste (which writes `qty` but leaves
  // `qtyInput` undefined) would clobber the pasted value with the default.
  if (raw === undefined) return {}
  const parsed = Number.parseInt(sanitizeNumericInput(raw), 10)
  return {
    qty: Number.isFinite(parsed) && parsed >= 1 ? parsed : 1,
    qtyInput: undefined,
  }
}

export function applyRateInput(raw: string): Partial<LineDraftNums> | null {
  // At most 2 decimal places (backend caps at decimal_places=2).
  let cleaned = sanitizeNumericInput(raw)
  if (!/^\d*(\.\d{0,2})?$/.test(cleaned)) return null
  // Cap the integer digit count (shared across all line-item surfaces).
  // TRUNCATE rather than reject — a paste longer than the cap keeps its
  // first MAX_PRICE_INTEGER_DIGITS integer digits (decimals preserved)
  // instead of silently dropping the whole value.
  cleaned = clampPriceDigits(cleaned)
  // Clearing → zero `rate` immediately so the calc preview refreshes.
  if (cleaned === "") return { rateInput: "", rate: 0 }
  const parsed = Number(cleaned)
  return {
    rateInput: cleaned,
    rate: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0,
  }
}

export function commitRate(raw: string | undefined): Partial<LineDraftNums> {
  if (raw === undefined) return {}
  const parsed = Number(sanitizeNumericInput(raw))
  return {
    rate: Number.isFinite(parsed) && parsed >= 0 ? roundMoney(parsed) : 0,
    rateInput: undefined,
  }
}

export function applyDiscountInput(raw: string): Partial<LineDraftNums> | null {
  const cleaned = sanitizeNumericInput(raw)
  // Currency-style: at most 2 fractional digits — same cap as rate/tax above.
  if (!/^\d*(\.\d{0,2})?$/.test(cleaned)) return null
  // Clearing the field must also zero `discountAmount` — otherwise the
  // calc preview keeps using the previously-typed number until blur and
  // the totals look frozen.
  if (cleaned === "") return { discountAmountInput: "", discountAmount: 0 }
  const parsed = Number(cleaned)
  return {
    discountAmountInput: cleaned,
    discountAmount: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0,
  }
}

export function commitDiscount(raw: string | undefined): Partial<LineDraftNums> {
  if (raw === undefined) return {}
  const parsed = Number(sanitizeNumericInput(raw))
  return {
    discountAmount: Number.isFinite(parsed) && parsed >= 0 ? roundMoney(parsed) : 0,
    discountAmountInput: undefined,
  }
}

export function applyTaxInput(raw: string): Partial<LineDraftNums> | null {
  const cleaned = sanitizeNumericInput(raw)
  if (!/^\d*(\.\d{0,2})?$/.test(cleaned)) return null
  // Clearing → zero `taxRate` immediately so the calc preview refreshes.
  if (cleaned === "") return { taxRateInput: "", taxRate: 0 }
  const parsed = Number(cleaned)
  if (!Number.isFinite(parsed)) return null
  // Tax % is bounded [0, 100] — reject the keystroke past 100.
  if (parsed > 100) return null
  return { taxRateInput: cleaned, taxRate: parsed }
}

export function commitTax(raw: string | undefined): Partial<LineDraftNums> {
  if (raw === undefined) return {}
  const trimmed = sanitizeNumericInput(raw)
  // Empty stays empty — no default tax is injected on blur.
  if (trimmed === "") return { taxRate: 0, taxRateInput: "" }
  const parsed = Number(trimmed)
  return {
    taxRate: Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), 100) : 0,
    taxRateInput: Number.isFinite(parsed) ? undefined : "",
  }
}

// ── Display ─────────────────────────────────────────────────────────────

// Line-item amount display: whole rupees stay clean ("9,00,000"), paise show
// only when actually present ("9,00,000.50"). Builder-only formatting —
// accounting surfaces (invoices, ledgers) keep `formatINR`'s always-2-decimals
// convention. Rounds to the paise first so float noise (100.0000001) doesn't
// force the decimal branch.
export function fmtLineAmount(n: number): string {
  const rounded = Math.round(n * 100) / 100
  return rounded.toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(rounded) ? 0 : 2,
    maximumFractionDigits: 2,
  })
}

// ── Names ───────────────────────────────────────────────────────────────

export function resolveChildName(c: BomChildRow): string {
  // The name is whatever sits in the Part Name cell: auto-filled from a
  // picked part, or typed by the user on a freeform component. It is NEVER
  // derived from the Description — a child with an empty Part Name has no
  // name, and the payload builders then send the "-" placeholder the backend
  // expects. (Previously a freeform child's typed name was discarded here,
  // so it saved — and reloaded — as "-".)
  return c.itemName?.trim() || ""
}

// ── API payloads ────────────────────────────────────────────────────────

// Backend `*BomChildCreate` shape. Shared by Quote + Sales Order — both
// schemas now declare `oem_id` and `condition` on children, so both callers
// opt in via `withOemCondition: true`. `category_id` is REQUIRED server-side
// on every child. Mappers below fall back to a caller-supplied parent
// category when the child has none, so the resulting payload always carries
// one.
export interface BomChildCreatePayload {
  config_action: "Add"
  part_variant_id?: string
  category_id: string
  /** See `BomChildPayloadOptions.withOemCondition`. */
  oem_id?: string
  /** See `BomChildPayloadOptions.withOemCondition`. */
  condition?: string
  item_name?: string
  description?: string | null
  qty: number
  rate?: number
  tax_rate?: number
  sort_order?: number
  discount_amount?: number
  warranty_level?: string | null
}

export interface BomChildPayloadOptions {
  /** Send the child's `oem_id` + `condition`. Both Quote and SO schemas now
   *  accept these on child rows, so every caller opts in. Defaults to false
   *  because the option is kept as an explicit, grep-able signal rather
   *  than a silent default. */
  withOemCondition?: boolean
}

export function bomChildToCreatePayload(
  c: BomChildRow,
  idx: number,
  parentCategoryId?: string,
  opts?: BomChildPayloadOptions,
): BomChildCreatePayload {
  return {
    config_action: "Add",
    part_variant_id: c.partId || undefined,
    category_id: (c.categoryId || parentCategoryId) ?? "",
    // Catalog children: these echo the variant and the service asserts they
    // match. Freeform children: stored as-is. Omitted entirely when unset so
    // the server keeps its own autofill.
    ...(opts?.withOemCondition && c.oemId ? { oem_id: c.oemId } : {}),
    ...(opts?.withOemCondition && c.condition ? { condition: c.condition } : {}),
    // Name comes ONLY from a selected part. Freeform children (no part) send
    // "-" — NEVER the Description, and never an omitted field (omitting can let
    // the backend mirror the Description into item_name).
    item_name: resolveChildName(c) || "-",
    description: (c.description ?? "").trim() || null,
    qty: c.qty,
    rate: c.rate,
    // Catalog snapshot — omitted (not null) when unset so freeform children
    // and pre-snapshot rows don't send an explicit null.
    ...(c.listPrice != null ? { list_price: c.listPrice } : {}),
    tax_rate: c.taxRate,
    sort_order: idx,
    discount_amount: c.discountAmount > 0 ? c.discountAmount : undefined,
    ...(c.warrantyLevel && c.warrantyLevel.trim()
      ? { warranty_level: c.warrantyLevel.trim() }
      : {}),
  }
}

export function bomChildrenToCreatePayload(
  children: BomChildRow[],
  parentCategoryId?: string,
  opts?: BomChildPayloadOptions,
): BomChildCreatePayload[] {
  return children.map((c, i) => bomChildToCreatePayload(c, i, parentCategoryId, opts))
}


