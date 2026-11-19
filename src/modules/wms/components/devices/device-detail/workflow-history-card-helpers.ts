import { humanize } from './helpers'
import { WORKFLOW_HISTORY_CARD_STRINGS } from './workflow-history-card.strings'

export const STAGE_LABEL: Record<string, string> = {
  inspection: WORKFLOW_HISTORY_CARD_STRINGS.stages.inspection,
  qc: WORKFLOW_HISTORY_CARD_STRINGS.stages.qc,
  repair: WORKFLOW_HISTORY_CARD_STRINGS.stages.repair,
  // No entry for vendor_service: EVERY section shares that op type, so a
  // static label would read "Vendor Service" for both Display Repair and
  // Battery Boost. The section NAME comes off the entry instead — see below.
  vendor_service: WORKFLOW_HISTORY_CARD_STRINGS.stages.vendorService,
  rack_assign: WORKFLOW_HISTORY_CARD_STRINGS.stages.rackAssign,
}

export const OUTCOME_LABEL: Record<string, string> = {
  pass: WORKFLOW_HISTORY_CARD_STRINGS.outcomes.pass,
  fail: WORKFLOW_HISTORY_CARD_STRINGS.outcomes.fail,
  na: WORKFLOW_HISTORY_CARD_STRINGS.outcomes.na,
}

/** Prefix a humanised event title with its stage ("Inspection completed"). */
export function stageTitle(operationType: string | null | undefined, eventType: string): string {
  const action = humanize(eventType) || WORKFLOW_HISTORY_CARD_STRINGS.fallback.event
  const stage = operationType ? STAGE_LABEL[operationType] ?? humanize(operationType) : null
  return stage ? `${stage} ${action.toLowerCase()}` : action
}

/** "Rack A → Bin 3" for a bin (parent rack → slot), or just the slot for a
 *  direct-storage rack / pallet. Null when there's no slot name. The backend
 *  denormalises the two names onto every location-bearing event; the "rack →
 *  bin" joining lives here. */
export function locationPath(slot: string | null, parentRack: string | null): string | null {
  if (!slot) return null
  return parentRack ? `${parentRack} → ${slot}` : slot
}

/** The one formatted location shared by every unit in a spare fulfil / return
 *  event — or null when they differ or any unit lacks one, so we only ever show
 *  an unambiguous single "from/to Rack → Bin" and never a misleading partial. */
export function sharedLocation(units: unknown[]): string | null {
  const paths = new Set<string>()
  for (const u of units) {
    if (!u || typeof u !== 'object') continue
    const rec = u as Record<string, unknown>
    const slot = typeof rec.location_name === 'string' ? rec.location_name.trim() : ''
    if (!slot) return null
    const parent =
      typeof rec.parent_location_name === 'string' ? rec.parent_location_name.trim() : ''
    paths.add(parent ? `${parent} → ${slot}` : slot)
  }
  return paths.size === 1 ? [...paths][0] : null
}
