import type {
  RentalReturnEligibleVariantWire,
  RentalReturnRequestWire,
} from "@modules/crm"

import type {
  GrnBatchResponse,
  GrnDraftLine,
  ReceiveUnitInput,
  RentalScanOutcome,
} from "../../../api"
import { isHeldScan } from "../../../constants/rental-scan"

/** One scanned box and what the server says it is. */
export interface ScanRow {
  key: string
  text: string
  outcome: RentalScanOutcome
}

/** What the operator typed or the scanner sent. Either serial resolves —
 *  the Comprint barcode first, then the maker's. */
export function scanInputFor(text: string): ReceiveUnitInput {
  return { internal_serial: text, manufacturer_serial: text }
}

export function rowText(scan: ReceiveUnitInput): string {
  return scan.internal_serial ?? scan.manufacturer_serial ?? scan.stock_item_id ?? ""
}

/** A scan already in the batch, by what was typed or the unit it resolved to. */
export function isDuplicate(rows: readonly ScanRow[], text: string): boolean {
  const needle = text.trim().toLowerCase()
  return rows.some(
    (r) =>
      r.text.toLowerCase() === needle ||
      (r.outcome.internal_serial ?? "").toLowerCase() === needle,
  )
}

export function isDuplicateUnit(rows: readonly ScanRow[], outcome: RentalScanOutcome): boolean {
  return !!outcome.stock_item_id && rows.some((r) => r.outcome.stock_item_id === outcome.stock_item_id)
}

interface StagedMeta {
  _atomic_lines?: GrnDraftLine[]
}

/** The scans a saved draft already holds, to re-classify on load. */
export function scansFromBatch(batch: GrnBatchResponse | undefined): ReceiveUnitInput[] {
  const lines = (batch?.metadata as StagedMeta | undefined)?._atomic_lines ?? []
  return lines.flatMap((l) => (l.receive.units ?? []) as ReceiveUnitInput[])
}

/** The draft-line unit schema forbids extra keys, and the preview echoes the
 *  scan with `substitution_reason` / `condition_at_receipt` set to null —
 *  sending that back 422s. Keep only the identifiers that were scanned. */
function serialsOnly(scan: ReceiveUnitInput): ReceiveUnitInput {
  const unit: ReceiveUnitInput = {}
  if (scan.stock_item_id) unit.stock_item_id = scan.stock_item_id
  if (scan.internal_serial) unit.internal_serial = scan.internal_serial
  if (scan.manufacturer_serial) unit.manufacturer_serial = scan.manufacturer_serial
  return unit
}

/**
 * Staged lines for the draft, one per model. An accepted box is staged by its
 * stock id; a held one by its serial, so finalize holds it as an exception.
 * A held box of unknown model is filed under `fallbackVariantId` — the
 * staged model of a hold is advisory, the exception records the serial.
 * With no model at all (a migrated unit ticked on the form, on a request with
 * nothing else on rent) it is staged by serial alone rather than dropped.
 */
export function buildStagedLines(
  rows: readonly ScanRow[],
  fallbackVariantId: string | null,
): GrnDraftLine[] {
  const byVariant = new Map<string, ReceiveUnitInput[]>()
  const serialOnly: GrnDraftLine[] = []
  for (const { outcome } of rows) {
    const variantId = outcome.part_variant_id ?? fallbackVariantId
    const unit: ReceiveUnitInput =
      isHeldScan(outcome.kind) || !outcome.stock_item_id
        ? serialsOnly(outcome.scan)
        : { stock_item_id: outcome.stock_item_id }
    if (!variantId) {
      serialOnly.push({ receive: { source_type: "dispatch_request_items", units: [unit] } })
      continue
    }
    byVariant.set(variantId, [...(byVariant.get(variantId) ?? []), unit])
  }
  const modelled: GrnDraftLine[] = [...byVariant].map(([variantId, units]) => ({
    receive: {
      source_type: "dispatch_request_items",
      part_variant_id: variantId,
      units,
    },
  }))
  return [...modelled, ...serialOnly]
}

/** Model and order names for the outcomes, from the account's units on rent. */
export function lookupsFor(variants: readonly RentalReturnEligibleVariantWire[]) {
  const models = new Map<string, string>()
  const orders = new Map<string, string>()
  for (const v of variants) {
    // A legacy rental unit has no catalog variant, so it has no model to name.
    if (v.part_variant_id) models.set(v.part_variant_id, `${v.part_name} · ${v.variant_name}`)
    for (const o of v.orders) orders.set(o.sales_order_id, o.order_number)
  }
  return { models, orders }
}

export type ScanLookups = ReturnType<typeof lookupsFor>

/** A held box of unknown model is filed under the first model asked for. */
export function fallbackVariant(
  rret: RentalReturnRequestWire | undefined,
  variants: readonly RentalReturnEligibleVariantWire[],
): string | null {
  return rret?.items[0]?.part_variant_id ?? variants[0]?.part_variant_id ?? null
}
