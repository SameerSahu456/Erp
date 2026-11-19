import { type PartLineFieldsValue } from "@modules/crm"

import { formatINR } from "@/lib/currency"
import { stripHtml } from "@/lib/utils"

import { type BomComponent } from "./POBomPanel"
import { taxPercent } from "./po-detail-helpers"
import { DEFAULT_TAX_RATE, taxFieldsFromSaved } from "./po-form-helpers"
import {
  snapshotLines,
  type PoSnapshotLine,
  type PoVersionSnapshot,
  type PurchaseOrder,
  type PurchaseOrderAmendPayload,
  type PurchaseOrderItemView,
} from "../../api"

/**
 * Pure line-model transforms for the issued-PO amend editor (Flow B), extracted
 * from `POAmendFormBody` so they can be unit-tested in isolation. The editor's
 * working line shape (`AmendLine`), the seeders that build it from the live PO
 * or a staged draft, and the mapping back to the amend API payload all live
 * here — no React, no side effects.
 */

/** The amend editor's working shape for one line. `original` is the live PO line
 *  it derives from (drives the diff + received-lock); undefined for a fresh add. */
export interface AmendLine {
  key: string
  original?: PurchaseOrderItemView
  part: PartLineFieldsValue
  categoryId: string
  qty: number
  unitPrice: number
  taxRate: number
  /** The part's HSN rate, which locks `taxRate`; undefined when there is none. */
  hsnGstRate?: number
  bomOpen: boolean
  bomComponents: BomComponent[]
}

/** Content-identity key matching a proposed/live line to its counterpart:
 *  catalog lines by variant, free-text lines by normalized description. The
 *  single source of the amend↔live matching rule (seeders + the change-view). */
export function poLineKey(line: {
  part_variant_id: string | null
  description: string | null
}): string {
  return line.part_variant_id
    ? `v:${line.part_variant_id}`
    : `d:${(line.description ?? "").trim().toLowerCase()}`
}

/** The line's display/identity label: the catalog part name, or (for a
 *  free-text line) its typed description. */
export function lineLabel(l: AmendLine): string {
  return (l.part.partName ?? l.part.description ?? "").trim()
}

/** Seed an editor line from a live PO line (fresh amend). */
export function existingLineToAmend(it: PurchaseOrderItemView): AmendLine {
  return {
    key: it.id,
    original: it,
    part: {
      partId: it.part_variant_id ?? undefined,
      partSku: it.variant_sku ?? undefined,
      // `partName` is the CATALOG part name only — undefined for a free-text
      // line, whose text is its `description`. Do NOT fall back to
      // `it.description` here: `lineLabel`/`amendLineToPayloadItem` read
      // `partName` first, so seeding it with the description would make an edit
      // to the Description field get dropped on save (the free-text line would
      // re-emit this stale seed). The Part Name column shows a dash for such a
      // line; its text is shown once, in Description.
      partName: it.part_name ?? undefined,
      description: it.description ?? "",
    },
    categoryId: it.category_id ?? "",
    qty: it.ordered_quantity,
    unitPrice: it.unit_price ? Number(it.unit_price) : 0,
    ...taxFieldsFromSaved(it),
    bomOpen: false,
    bomComponents: [],
  }
}

/** Seed an editor line from a staged DRAFT amendment line. Matches it back to
 *  the live PO line — by `source_line_id` first (survives a description edit),
 *  falling back to the content key — so the original id / received-lock / diff
 *  all stay attached. */
export function draftLineToAmend(
  line: PoSnapshotLine,
  liveByKey: Map<string, PurchaseOrderItemView>,
  liveById: Map<string, PurchaseOrderItemView>,
): AmendLine {
  const original =
    (line.source_line_id ? liveById.get(line.source_line_id) : undefined) ??
    liveByKey.get(poLineKey(line))
  return {
    key: original?.id ?? `draft-${poLineKey(line)}`,
    original,
    part: {
      partId: line.part_variant_id ?? undefined,
      partSku: original?.variant_sku ?? undefined,
      // Catalog part name only (see `existingLineToAmend`) — never the
      // free-text description, or a re-edit of the draft would drop the change.
      partName: line.part_name ?? original?.part_name ?? undefined,
      description: line.description ?? "",
    },
    categoryId: line.category_id ?? "",
    qty: line.ordered_quantity,
    unitPrice: line.unit_price ? Number(line.unit_price) : 0,
    ...taxFieldsFromSaved({
      hsn_gst_rate: line.hsn_gst_rate ?? original?.hsn_gst_rate,
      tax_rate: line.tax_rate,
    }),
    bomOpen: false,
    bomComponents: [],
  }
}

/** A brand-new (added) editor line. */
export function newAmendLine(): AmendLine {
  return {
    key: `new-${crypto.randomUUID()}`,
    part: { description: "" },
    categoryId: "",
    qty: 1,
    unitPrice: 0,
    taxRate: DEFAULT_TAX_RATE,
    bomOpen: false,
    bomComponents: [],
  }
}

/** Seed the editor's lines: from the staged draft's proposed lines when one is
 *  open (re-edit the in-flight proposal), else from the live PO lines. */
export function seedLines(po: PurchaseOrder, draft?: PoVersionSnapshot | null): AmendLine[] {
  if (draft) {
    const liveByKey = new Map(po.items.map((it) => [poLineKey(it), it]))
    const liveById = new Map(po.items.map((it) => [it.id, it]))
    return snapshotLines(draft).map((l) => draftLineToAmend(l, liveByKey, liveById))
  }
  return po.items.map(existingLineToAmend)
}

/** Map one editor line to its amend-API payload item. Catalog lines carry the
 *  part id + the description as an optional note; free-text lines carry the
 *  typed text as the description + a routing category. */
export function amendLineToPayloadItem(
  l: AmendLine,
): PurchaseOrderAmendPayload["items"][number] {
  const base = {
    ordered_quantity: l.qty,
    unit_price: l.unitPrice ? String(l.unitPrice) : null,
    // The backend overrides this with the HSN rate when the part has one.
    tax_rate: l.taxRate.toFixed(2),
    // The live line this edits — lets the backend update the SAME row even when a
    // free-text line's description (its content-match key) changed. Null for a
    // freshly added line (no live counterpart).
    source_line_id: l.original?.id ?? null,
  }
  if (l.part.partId) {
    // Catalog line: identity is the part; `description` is the optional note —
    // send the note itself, never the display name.
    const note = (l.part.description ?? "").trim()
    return { ...base, part_variant_id: l.part.partId, description: note || null }
  }
  // Free-text line: the typed label IS the line (backend routes approval by its
  // category).
  return { ...base, description: lineLabel(l), category_id: l.categoryId }
}

// ── Amendment change-view diff ──────────────────────────────────────────────
// Diffs the proposed amendment lines against the current live PO lines so the
// approver (and the maker, before submitting) can see what the amendment
// changes: per-field qty/price/tax/amount deltas, plus added and removed lines.

/** Per-field change flags of a proposed line vs its live counterpart. */
export interface AmendmentLineChanges {
  qty: boolean
  price: boolean
  tax: boolean
  amount: boolean
  desc: boolean
}

const NO_CHANGES: AmendmentLineChanges = {
  qty: false,
  price: false,
  tax: false,
  amount: false,
  desc: false,
}

/** One row of the change-view: a proposed line classified against the live
 *  order, or a live line that the amendment removed. */
export interface AmendmentDiffRow {
  /** Stable render key. */
  key: string
  kind: "unchanged" | "changed" | "added" | "removed"
  /** The line to render — the proposed line (added/changed/unchanged) or the
   *  dropped live line mapped to the snapshot shape (removed). */
  line: PoSnapshotLine
  /** Which fields differ from the live counterpart (all false unless changed). */
  changes: AmendmentLineChanges
  /** The previous (live) values, for delta rendering. Null for added/removed. */
  prev: {
    ordered_quantity: number
    unit_price: string | null
    tax_rate: string | null
    line_total: string
    description: string | null
  } | null
}

/** Decimal-string equality that treats "100" and "100.00" (and null/"") as
 *  equal — so formatting-only differences aren't reported as changes. */
function moneyEq(a: string | null, b: string | null): boolean {
  const na = a == null || a === "" ? null : Number(a)
  const nb = b == null || b === "" ? null : Number(b)
  return na === nb
}

/** Visible (tag-stripped, trimmed) description text, for change detection. */
function descText(v: string | null): string {
  return stripHtml(v ?? "").trim()
}

/** Map a live PO line to the snapshot line shape so a removed row renders
 *  through the same table code as the proposed rows. */
function liveToSnapshotShape(it: PurchaseOrderItemView): PoSnapshotLine {
  return {
    line_id: it.id,
    source_line_id: it.id,
    part_variant_id: it.part_variant_id,
    description: it.description,
    category_id: it.category_id,
    ordered_quantity: it.ordered_quantity,
    unit_price: it.unit_price,
    tax_rate: it.tax_rate,
    pm_id: it.pm_id,
    pm_status: it.pm_status ?? "approved",
    pm_notes: it.pm_notes ?? null,
    can_act: false,
    part_number: it.part_number ?? null,
    part_name: it.part_name ?? null,
    variant_name: it.variant_name ?? null,
    variant_sku: it.variant_sku ?? null,
    condition: it.condition ?? null,
    line_total: it.line_total,
    line_tax: it.line_tax,
    line_total_with_tax: it.line_total_with_tax,
  }
}

/** Normalize a decimal string for comparison ("100.00" → "100", null/"" → ""). */
function normMoney(v: string | null): string {
  return v == null || v === "" ? "" : String(Number(v))
}

/** Non-description signature of a free-text line — category + qty + price + tax.
 *  A description-only edit keeps this identical, so the two lines can be matched
 *  as the SAME line (a free-text line has no stable id across a text edit; its
 *  {@link poLineKey} is its description, which the edit changes). */
function freeTextSig(l: PoSnapshotLine): string {
  return [
    l.category_id ?? "",
    l.ordered_quantity,
    normMoney(l.unit_price),
    normMoney(l.tax_rate),
  ].join("|")
}

/** Classify a proposed line matched to its previous counterpart into a
 *  `changed` (any field differs) or `unchanged` diff row. */
function matchedRow(p: PoSnapshotLine, prevItem: PoSnapshotLine): AmendmentDiffRow {
  const changes: AmendmentLineChanges = {
    qty: p.ordered_quantity !== prevItem.ordered_quantity,
    price: !moneyEq(p.unit_price, prevItem.unit_price),
    tax: !moneyEq(p.tax_rate, prevItem.tax_rate),
    amount: !moneyEq(p.line_total, prevItem.line_total),
    desc: descText(p.description) !== descText(prevItem.description),
  }
  const anyChanged = changes.qty || changes.price || changes.tax || changes.amount || changes.desc
  return {
    key: `p:${p.line_id}`,
    kind: anyChanged ? "changed" : "unchanged",
    line: p,
    changes,
    prev: {
      ordered_quantity: prevItem.ordered_quantity,
      unit_price: prevItem.unit_price,
      tax_rate: prevItem.tax_rate,
      line_total: prevItem.line_total,
      description: prevItem.description,
    },
  }
}

type CurrEntry = { line: PoSnapshotLine; prev: PoSnapshotLine | null }
type PrevEntry = { line: PoSnapshotLine; taken: boolean }

/** Pass 1 — exact {@link poLineKey}: catalog lines by variant, free-text lines
 *  by identical description. Consumes unchanged (and reordered catalog) lines. */
function matchExact(curr: CurrEntry[], prevPool: PrevEntry[]): void {
  for (const ce of curr) {
    const k = poLineKey(ce.line)
    const e = prevPool.find((x) => !x.taken && poLineKey(x.line) === k)
    if (e) {
      e.taken = true
      ce.prev = e.line
    }
  }
}

/** Pass 2 — remaining FREE-TEXT lines by non-description signature (category +
 *  qty + price + tax). A description-only edit keeps the signature identical, so
 *  the line pairs precisely with no spurious qty/price delta. */
function matchFreeTextBySignature(curr: CurrEntry[], prevPool: PrevEntry[]): void {
  for (const ce of curr) {
    if (ce.prev || ce.line.part_variant_id) continue
    const sig = freeTextSig(ce.line)
    const e = prevPool.find(
      (x) => !x.taken && !x.line.part_variant_id && freeTextSig(x.line) === sig,
    )
    if (e) {
      e.taken = true
      ce.prev = e.line
    }
  }
}

/** Pass 3 — remaining FREE-TEXT lines by position (in document order). Catches an
 *  edit-in-place that changed the description AND another field, so the line
 *  stays a single CHANGED row instead of remove + add. */
function matchFreeTextByPosition(curr: CurrEntry[], prevPool: PrevEntry[]): void {
  const rest = prevPool.filter((x) => !x.taken && !x.line.part_variant_id)
  let i = 0
  for (const ce of curr) {
    if (ce.prev || ce.line.part_variant_id || i >= rest.length) continue
    rest[i].taken = true
    ce.prev = rest[i].line
    i++
  }
}

/** Match each current line to a previous line across three greedy, multiset-safe
 *  passes so a free-text line survives any in-place edit. Mutates each entry's
 *  `prev` and each pool item's `taken`. */
function matchLines(curr: CurrEntry[], prevPool: PrevEntry[]): void {
  matchExact(curr, prevPool)
  matchFreeTextBySignature(curr, prevPool)
  matchFreeTextByPosition(curr, prevPool)
}

/**
 * Diff a set of snapshot lines against a previous set. Current lines come first
 * in order (added / changed / unchanged), followed by any previous lines that
 * were dropped (removed). Matching (see {@link matchLines}) is two-pass so a
 * free-text line survives a description edit.
 */
export function diffSnapshotLines(
  current: PoSnapshotLine[],
  previous: PoSnapshotLine[],
): AmendmentDiffRow[] {
  const prevPool = previous.map((line) => ({ line, taken: false }))
  const curr = current.map((line) => ({ line, prev: null as PoSnapshotLine | null }))
  matchLines(curr, prevPool)

  const rows: AmendmentDiffRow[] = curr.map(({ line: p, prev }) =>
    prev
      ? matchedRow(p, prev)
      : { key: `p:${p.line_id}`, kind: "added", line: p, changes: NO_CHANGES, prev: null },
  )
  for (const { line, taken } of prevPool) {
    if (!taken) {
      rows.push({ key: `r:${line.line_id}`, kind: "removed", line, changes: NO_CHANGES, prev: null })
    }
  }
  return rows
}

/** Diff proposed amendment lines against the current live PO lines. Thin wrapper
 *  over {@link diffSnapshotLines} — the live lines are mapped to the snapshot
 *  shape so both surfaces (open amendment + version trail) share one diff. */
export function diffAmendmentLines(
  proposed: PoSnapshotLine[],
  live: PurchaseOrderItemView[],
): AmendmentDiffRow[] {
  return diffSnapshotLines(proposed, live.map(liveToSnapshotShape))
}

/** Human summary of what a rejected amendment PROPOSED for a line, vs the line's
 *  current (approved) value — for the "what was rejected" detail shown at the
 *  line. Empty when nothing differs (defensive). */
export function summarizeRejectedChange(
  proposed: PoSnapshotLine,
  live: PurchaseOrderItemView,
): string[] {
  const money = (v: string | null) => (v === null || v === "" ? "—" : formatINR(Number(v)))
  const out: string[] = []
  if (proposed.ordered_quantity !== live.ordered_quantity) {
    out.push(`Qty ${live.ordered_quantity} → ${proposed.ordered_quantity}`)
  }
  if (!moneyEq(proposed.unit_price, live.unit_price)) {
    out.push(`Unit price ${money(live.unit_price)} → ${money(proposed.unit_price)}`)
  }
  if (!moneyEq(proposed.tax_rate, live.tax_rate)) {
    out.push(`Tax ${taxPercent(live.tax_rate)} → ${taxPercent(proposed.tax_rate)}`)
  }
  const newDesc = descText(proposed.description)
  if (newDesc !== descText(live.description)) {
    out.push(`Description → "${newDesc}"`)
  }
  return out
}
