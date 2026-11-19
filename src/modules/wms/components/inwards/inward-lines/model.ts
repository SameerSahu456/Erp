import type { POExpectedLine } from '../../../api'

/** First trimmed serial out of a scanned/pasted cell (a row carries one unit). */
export const firstSerial = (raw?: string): string =>
  (raw ?? '')
    .split(/[\n,;]+|\s+/)
    .map((s) => s.trim())
    .find(Boolean) ?? ''

export type BomLine = NonNullable<POExpectedLine['bom']>[number]

/** A single inline BOM component captured for a unit (atomic `components.added`).
 *  The operator picks the component variant from the catalog (like a line). */
export interface BomComponentDraft {
  rowKey: string
  componentVariantId: string
  partId: string // the component's part — used to resolve is_tracking
  tracked?: boolean // resolved from the part once loaded (undefined while loading)
  label: string
  serial: string
  quantity: number
  position: string | null
  /** Pre-filled from the variant's BOM (inward-verification D1). Removing such
   *  a row marks it missing instead of deleting it, so the shortfall is kept. */
  fromTemplate?: boolean
  /** Listed by the supplier but not inside — recorded as missing. */
  missing?: boolean
  /** An added part that stands in for a missing template row (D7). */
  insteadOfKey?: string | null
}

/** An added component row is incomplete until its part is picked. The serial
 *  is optional: a part inside a device often has no readable label
 *  (inward-verification D10). */
export const componentIncomplete = (c: BomComponentDraft): boolean =>
  !c.fromTemplate && !c.componentVariantId

/** The variant's BOM template as pre-filled component rows (D1). A tracked
 *  part is resolved later, so each template line stays one row with its qty. */
export function componentsFromTemplate(bom: BomLine[]): BomComponentDraft[] {
  return bom.map((b) => ({
    rowKey: crypto.randomUUID(),
    componentVariantId: b.component_variant_id,
    partId: b.part_id ?? '',
    label: `${b.part_name}${b.variant_name ? ` — ${b.variant_name}` : ''}`,
    serial: '',
    quantity: b.quantity,
    position: b.position ?? null,
    fromTemplate: true,
    missing: false,
    insteadOfKey: null,
  }))
}

export function makeComponent(): BomComponentDraft {
  return {
    rowKey: crypto.randomUUID(),
    componentVariantId: '',
    partId: '',
    label: '',
    serial: '',
    quantity: 1,
    position: null,
  }
}

/** A user-added receive line. TRACKED lines are one-unit-per-line: a single
 *  manufacturer serial (qty 1), so receiving two means adding two lines.
 *  NON-TRACKED lines play on quantity: one line carries a `qty` of N units (no
 *  serials). Bound to a PO pending line once a variant on the PO is picked. */
export interface ManualLine {
  key: string
  variantId: string | null
  label: string
  onPo: boolean
  sourceId: string | null
  descriptionOnly: boolean
  description: string
  partId: string
  tracked: boolean
  pending: number
  partNumber: string
  variantName: string
  condition: string
  categoryId: string // resolves off-PO bom-eligibility via the category map
  bomEligible: boolean // from the PO line (on-PO only)
  bom: BomLine[]
  serial: string // tracked: the single manufacturer serial
  qty: number // non-tracked: number of units received on this line
  components: BomComponentDraft[]
}

export function makeLine(): ManualLine {
  return {
    key: crypto.randomUUID(),
    variantId: null,
    label: '',
    onPo: false,
    sourceId: null,
    descriptionOnly: false,
    description: '',
    partId: '',
    tracked: false,
    pending: 0,
    partNumber: '',
    variantName: '',
    condition: '',
    categoryId: '',
    bomEligible: false,
    bom: [],
    serial: '',
    qty: 0,
    components: [],
  }
}

/** Seed a fresh row for a description-only PO line (bucket). The row stays bound
 *  to its PO line (`onPo` + `sourceId`) so the picked part finalizes against the
 *  right `purchase_order_item_id`; the operator only identifies the part. */
export function makeDescLine(bucket: {
  sourceId: string
  description: string
  pending: number
}): ManualLine {
  return {
    ...makeLine(),
    onPo: true,
    descriptionOnly: true,
    sourceId: bucket.sourceId,
    description: bucket.description,
    pending: bucket.pending,
  }
}

/** Has the operator entered a manufacturer serial on this line? */
export const lineHasSerial = (l: ManualLine): boolean => l.serial.trim() !== ''

/** A line is "serial mode" (one identified unit, qty locked to 1) when its part
 *  is tracked, OR — for a non-tracked part — when the operator chose to enter a
 *  serial. Otherwise it's "quantity mode" (N units, no serials). */
export const lineSerialMode = (l: ManualLine): boolean => l.tracked || lineHasSerial(l)

/** A tracked line is incomplete until its serial is filled. */
export const lineMissingSerial = (l: ManualLine): boolean =>
  !!l.variantId && l.tracked && !lineHasSerial(l)

/** Normalize a serial for uniqueness comparison — trim + case-fold, mirroring
 *  the backend's in-request duplicate check. */
export const normalizeSerial = (s: string): string => s.trim().toLowerCase()

/** The set of normalized serials that appear MORE THAN ONCE across the WHOLE
 *  batch (blank serials ignored). Detection is GLOBAL — a serial may appear only
 *  once anywhere on the form, regardless of part number; the same string on two
 *  different parts still counts as a duplicate. Lets the form flag a duplicate
 *  device/component serial as it's typed, instead of only catching it on the
 *  server at finalize. */
export function duplicateSerialSet(serials: string[]): Set<string> {
  const seen = new Set<string>()
  const dup = new Set<string>()
  for (const raw of serials) {
    const n = normalizeSerial(raw)
    if (!n) continue
    if (seen.has(n)) dup.add(n)
    else seen.add(n)
  }
  return dup
}

/** Every serial entered across a set of lines — each line's device serial plus
 *  its BOM component serials — the flat pool the global duplicate check runs
 *  over. */
export function collectManualLineSerials(lines: ManualLine[]): string[] {
  const out: string[] = []
  for (const l of lines) {
    if (l.serial.trim()) out.push(l.serial)
    for (const c of l.components) if (c.serial.trim()) out.push(c.serial)
  }
  return out
}

/** True when this line's (non-blank) device serial appears more than once
 *  anywhere on the form. */
export const lineHasDuplicateSerial = (l: ManualLine, dups: Set<string>): boolean =>
  !!l.serial.trim() && dups.has(normalizeSerial(l.serial))

/** True when this component's (non-blank) serial appears more than once anywhere
 *  on the form. */
export const componentHasDuplicateSerial = (
  c: BomComponentDraft,
  dups: Set<string>,
): boolean => !!c.serial.trim() && dups.has(normalizeSerial(c.serial))

/** Units a line will receive. A serial-mode line is exactly one identified unit;
 *  a quantity-mode line plays on `qty`. */
export const lineUnitCount = (l: ManualLine): number => {
  if (!l.variantId) return 0
  if (l.tracked) return lineHasSerial(l) ? 1 : 0
  if (lineHasSerial(l)) return 1 // non-tracked, serial entered → one unit
  return Math.max(0, l.qty)
}

/** Each line carries its own BOM-eligibility, set when its part is picked
 *  (from the PO row for on-PO lines, or the variant's denormalised category
 *  flag for off-PO / description-only picks). */
export const lineBomEligible = (l: ManualLine): boolean => l.bomEligible

