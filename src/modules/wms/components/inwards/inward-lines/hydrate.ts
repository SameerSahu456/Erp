import type { GrnDraftLine, POExpectedLine } from '../../../api'
import { componentsFromTemplate, makeDescLine, makeLine, type ManualLine } from './model'
import { poLineTitle } from './variant-map'

type Receive = NonNullable<GrnDraftLine['receive']>
type StagedUnits = { manufacturer_serial?: string }[] | undefined
/** Loose view of a PO pending line — the generated type omits several fields. */
interface PoLineShape {
  source_line_entity_id?: string
  part_variant_id?: string
  part_variant?: { is_tracking?: boolean; category_id?: string }
  description?: string
  variant_name?: string
  part_name?: string
  part_number?: string
  condition?: string
  is_bom_eligible?: boolean
  bom?: unknown[]
  pending_quantity?: number
}
const shape = (l: POExpectedLine) => l as PoLineShape

function sharedFields(e: PoLineShape, sid: string | null) {
  return {
    onPo: true,
    sourceId: sid,
    description: e.description ?? '',
    variantName: e.variant_name ?? '',
    condition: e.condition ?? '',
    categoryId: e.part_variant?.category_id ?? '',
    pending: e.pending_quantity ?? 0,
  }
}

// A description line's chosen part isn't the PO line's (free text), so its label
// was stashed on the batch metadata (desc_labels) keyed by the chosen variant id.
// Tracking re-resolves post-hydration once partId is known.
function descFields(rec: Receive, descLabels: Record<string, string>) {
  const label = descLabels[rec.part_variant_id ?? ''] ?? ''
  return {
    descriptionOnly: true,
    variantId: rec.part_variant_id ?? null,
    label,
    partNumber: label,
    bomEligible: false,
    bom: [] as ManualLine['bom'],
    tracked: false,
  }
}

// Tracking comes from the catalog, NOT the payload shape: a non-tracked part with
// an optional serial also rides in units[].
function catalogFields(e: PoLineShape) {
  return {
    descriptionOnly: false,
    variantId: e.part_variant_id ?? null,
    label: poLineTitle(e),
    partNumber: e.part_number ?? '',
    bomEligible: !!e.is_bom_eligible,
    bom: (e.bom ?? []) as ManualLine['bom'],
    tracked: !!e.part_variant?.is_tracking,
  }
}

function onPoLines(
  rec: Receive,
  e: PoLineShape,
  sid: string | null,
  descLabels: Record<string, string>,
): ManualLine[] {
  // A PO line with no part_variant_id is a description bucket.
  const fields = e.part_variant_id ? catalogFields(e) : descFields(rec, descLabels)
  const common = { ...sharedFields(e, sid), ...fields }
  const units = rec.units as StagedUnits
  if (units && units.length) {
    return units.map((u) => ({
      ...makeLine(),
      ...common,
      serial: u.manufacturer_serial ?? '',
      qty: common.tracked ? 0 : 1,
    }))
  }
  const qty = rec.quantity ?? 0
  return qty > 0 ? [{ ...makeLine(), ...common, qty }] : []
}

// Legacy off-PO line on an existing draft — re-hydrated so the operator can see +
// remove it; finalize blocks until it's gone.
function offPoLine(rec: Receive, variantId: string, offpoLabels: Record<string, string>) {
  const units = rec.units as StagedUnits
  const serial = units?.[0]?.manufacturer_serial ?? ''
  return {
    ...makeLine(),
    onPo: false,
    variantId,
    label: offpoLabels[variantId] ?? variantId,
    tracked: false,
    serial,
    qty: serial ? 1 : (rec.quantity ?? units?.length ?? 0),
  }
}

/** Re-seed an empty row for every description PO line that has no staged row. */
function unseededDescLines(pendingLines: POExpectedLine[], seeded: Set<string>): ManualLine[] {
  return pendingLines.flatMap((l) => {
    const e = shape(l)
    const sid = e.source_line_entity_id
    if (e.part_variant_id || !sid || seeded.has(sid)) return []
    return [
      makeDescLine({
        sourceId: sid,
        description: e.description ?? '',
        pending: e.pending_quantity ?? 0,
      }),
    ]
  })
}

/** Rebuild PO receive lines from a draft batch's staged atomic lines, for the
 *  draft Edit flow. On-PO lines resolve their part info from the PO's pending
 *  lines (matched by source_id); off-PO lines use the stashed display labels.
 *  Components restart from the variant's BOM (inward-verification D1): the
 *  draft stores none of the display labels a saved list would need, and an
 *  empty list would now be sent as "nothing inside". */
export function hydratePoLines(
  atomicLines: GrnDraftLine[],
  pendingLines: POExpectedLine[],
  offpoLabels: Record<string, string> = {},
  descLabels: Record<string, string> = {},
): ManualLine[] {
  const bySource = new Map(pendingLines.map((l) => [shape(l).source_line_entity_id, l]))
  const out: ManualLine[] = []
  const seededDescSources = new Set<string>()
  for (const al of atomicLines) {
    const rec = al.receive
    if (!rec) continue
    const sid = rec.source_id ?? null
    const exp = sid ? bySource.get(sid) : undefined
    if (exp) {
      if (!shape(exp).part_variant_id && sid) seededDescSources.add(sid)
      out.push(...onPoLines(rec, shape(exp), sid, descLabels))
    } else if (rec.part_variant_id) {
      out.push(offPoLine(rec, rec.part_variant_id, offpoLabels))
    }
  }
  out.push(...unseededDescLines(pendingLines, seededDescSources))
  return out.map((l) =>
    l.bomEligible && l.components.length === 0 && l.bom.length > 0
      ? { ...l, components: componentsFromTemplate(l.bom) }
      : l,
  )
}
