import { STOCK_ADJUSTMENT_REASON_LABEL } from '@modules/ims'

import { humanize } from './helpers'
import { locationPath, sharedLocation } from './workflow-history-card-helpers'
import { WORKFLOW_HISTORY_CARD_STRINGS as S } from './workflow-history-card.strings'
import { entityRef, joinNodes, str } from './workflow-event-nodes'
import type { EventDescriber } from './workflow-event-types'

/** Comma-joined serials of the units listed on a spare fulfil / return event. */
function unitSerials(units: unknown[]): string {
  return units
    .map((u) => (u && typeof u === 'object' ? str((u as Record<string, unknown>).serial) : null))
    .filter(Boolean)
    .join(', ')
}

const componentPulled: EventDescriber = ({ md }) => {
  // What was done with the part: QC / repair / scrap (device-page pull) and the
  // bin it waits at; an MI pull-out carries where it went and the MI number.
  const part = str(md.component_part_variant_name) ?? str(md.part_name) ?? str(md.component_name)
  const result = str(md.result_status)
  const sentTo = result ? (S.details.pulledTo[result] ?? humanize(result)) : null
  const loc = locationPath(str(md.location_name), str(md.parent_location_name))
  const mi = str(md.mi_number)
  const request = str(md.request_number)
  const parts = [
    part,
    sentTo ? `· ${sentTo}` : null,
    loc ? `→ ${loc}` : null,
    mi ? `· ${mi}` : null,
    request ? `· ${S.details.forRequest(request)}` : null,
  ].filter(Boolean) as string[]
  return {
    title: componentRemovedTitle(md),
    description: parts.join(' ') || undefined,
    note: str(md.notes) ?? undefined,
  }
}

/** Why a part left: pulled while issuing, or for a replacement request. */
function componentRemovedTitle(md: Record<string, unknown>): string {
  if (str(md.removed_during) === MATERIAL_ISSUE) return S.titles.componentRemovedOnIssue
  const reason = str(md.removed_reason)
  if (reason === 'returned_for_repair') return S.titles.componentSentForRepair
  if (reason === 'replaced_on_site') return S.titles.componentReplacedOnSite
  return S.titles.componentRemoved
}

// A component change made while issuing (`added_during` / `removed_during`).
const MATERIAL_ISSUE = 'material_issue'

/** "MIS-… · shipped on DSP-… · for RR-…" for a part fitted on an issue. */
function issueTrail(md: Record<string, unknown>): string[] {
  if (str(md.added_during) !== MATERIAL_ISSUE) return []
  const dispatch = str(md.dispatch_number)
  const request = str(md.request_number)
  return [
    str(md.mi_number),
    dispatch ? S.details.shippedOn(dispatch) : null,
    request ? S.details.forRequest(request) : null,
  ].filter(Boolean) as string[]
}

/** A device-page correction: the part, its position, and the stated reason. */
function componentCorrection(title: string): EventDescriber {
  return ({ md }) => {
    const part = str(md.component_part_variant_name)
    const pos = str(md.position)
    return {
      title,
      description:
        [part, pos ? S.details.atPosition(pos) : null].filter(Boolean).join(' · ') || undefined,
      note: str(md.reason) ? S.details.reason(str(md.reason) as string) : undefined,
    }
  }
}

// ── Outbound lifecycle (Material Issue → Dispatch) ──
const materialIssued: EventDescriber = ({ md }) => {
  const kind = str(md.issue_type)
  // A replacement issue names the RR line it satisfies; sale / demo issues lack these keys.
  const request = str(md.request_number)
  if (request) {
    const original = str(md.original_part_name)
    const substitute = md.is_substitution === true ? str(md.replacement_part_name) : null
    return {
      title: original
        ? S.titles.issuedAsReplacementFor(original)
        : S.titles.issuedAsReplacement,
      description:
        [request, substitute ? S.details.substitutedWith(substitute) : null]
          .filter(Boolean)
          .join(' · ') || undefined,
    }
  }
  return {
    title: S.titles.issuedOnMaterialIssue,
    description: kind ? humanize(kind.replace(/_issue$/, '')) : undefined,
  }
}

// A part pulled out of a machine, registered back into stock as its
// own unit — shown on the harvested unit's own timeline.
// A component's own timeline: it went INTO a machine. The machine's serial
// rides as the clickable action (the registry reads the same two
// `source_*` keys `pulled_out` uses), so the description carries the part
// and its slot.
const installedInto: EventDescriber = ({ md }) => {
  const part = str(md.part_variant_name)
  const pos = str(md.position)
  return {
    title:
      str(md.added_during) === MATERIAL_ISSUE
        ? S.titles.installedIntoDeviceOnIssue
        : S.titles.installedIntoDevice,
    description:
      [part, pos ? S.details.atPosition(pos) : null, ...issueTrail(md)]
        .filter(Boolean)
        .join(' · ') || undefined,
  }
}

const pulledOut: EventDescriber = ({ md }) => {
  // The source serial is the clickable action; describe only where it landed + the MI.
  const loc = locationPath(str(md.location_name), str(md.parent_location_name))
  const mi = str(md.mi_number)
  const onIssue = mi && str(md.removed_during) === MATERIAL_ISSUE ? S.titles.componentRemovedOnIssue : null
  const parts = [loc ? S.details.toLocation(loc) : null, onIssue ? `${onIssue} ${mi}` : mi].filter(
    Boolean,
  ) as string[]
  return { title: S.titles.pulledOutIntoStock, description: parts.join(' · ') || undefined }
}

const spareFulfilled: EventDescriber = ({ md }) => {
  // Name the consumed unit(s); the first rides as the clickable
  // action (jump to that unit's device page).
  const units = Array.isArray(md.consumed_units) ? md.consumed_units : []
  const serials = unitSerials(units)
  // Where the spare(s) were taken from — "fitted from Rack A → Bin 3".
  const from = sharedLocation(units)
  return {
    title: S.titles.spareFulfilled,
    description:
      [
        serials ? S.details.consumed(serials) : str(md.request_number),
        from ? S.details.fromLocation(from) : null,
      ]
        .filter(Boolean)
        .join(' · ') || undefined,
  }
}

// Store manager put unneeded units back — device-under-repair side.
const spareReturned: EventDescriber = ({ md }) => {
  // Serials only; the return reason is shown on the details page, so
  // it's not repeated in the history.
  const units = Array.isArray(md.returned_units) ? md.returned_units : []
  const serials = unitSerials(units)
  // Where the unused spare(s) went back — "to Rack A → Bin 3".
  const to = sharedLocation(units)
  return {
    title: S.titles.spareReturnedToStock,
    description:
      [serials || undefined, to ? S.details.toLocation(to) : null]
        .filter(Boolean)
        .join(' · ') || undefined,
  }
}

// ── Location moves ──
const relocated: EventDescriber = ({ md }) => {
  // A unit moved between slots — show both ends as full Rack → Bin.
  const to = locationPath(str(md.to_location_name), str(md.to_parent_location_name))
  const from = locationPath(str(md.from_location_name), str(md.from_parent_location_name))
  return {
    title: S.titles.relocated,
    description:
      [to ? S.details.toLocation(to) : null, from ? `(${S.details.fromLocation(from)})` : null]
        .filter(Boolean)
        .join(' ') || undefined,
  }
}

// ── Scrap / un-scrap / disposal (device-scrap D10) ──
// None of the three has an operation, so these entries are synthesized from
// the stock_movements rows the actions write. The operator's stated reason is
// the whole point of the entry — a write-off without it is not an audit trail.
const scrapLike =
  (titleKey: 'scrapped' | 'unscrapped' | 'disposed'): EventDescriber =>
  ({ md }) => {
    const where = locationPath(str(md.location_name), str(md.parent_location_name))
    return {
      title: S.titles[titleKey],
      description:
        [str(md.notes) || null, where ? S.details.atLocation(where) : null]
          .filter(Boolean)
          .join(' · ') || undefined,
    }
  }

// ── Warehouse transfers (synthesized from stock movements; no operation exists) ──
const TRANSFER_TITLE: Record<string, string> = {
  transfer_sent: S.titles.transferSent,
  transfer_received: S.titles.transferReceived,
}
const transfer: EventDescriber = ({ e, md }) => {
  const route = [str(md.from_warehouse_name), str(md.to_warehouse_name)]
    .filter(Boolean)
    .join(' → ')
  const tnum = str(md.transfer_number)
  return {
    title: TRANSFER_TITLE[e.event_type] ?? S.titles.transferReturnedToSource,
    description: joinNodes([
      tnum ? entityRef('transfer', str(md.transfer_id), tnum) : null,
      route || null,
    ]),
  }
}

// ── IMS stock adjustment (synthesized from the adjustment's stock movements) ──
// The adjustment number links to the adjustment for anyone who may open it
// (EntityRef checks the route's codes; superusers always may) and is
// copy-only text for everyone else.
const STOCK_ADJUSTMENT_TITLE: Record<string, string> = {
  stock_adjustment_added: S.titles.stockAdjustmentAdded,
  stock_adjustment_restored: S.titles.stockAdjustmentRestored,
  stock_adjustment_removed: S.titles.stockAdjustmentRemoved,
}
const ADJUSTMENT_REASON: Record<string, string> = STOCK_ADJUSTMENT_REASON_LABEL
// The backend's default movement note: "Stock adjustment <number>".
const DEFAULT_NOTE_PREFIX = 'Stock adjustment '
const stockAdjustment: EventDescriber = ({ e, md }) => {
  const number = str(md.adjustment_number)
  const reason = str(md.reason)
  const where = locationPath(str(md.location_name), str(md.parent_location_name))
  return {
    title: STOCK_ADJUSTMENT_TITLE[e.event_type] ?? S.fallback.event,
    description: joinNodes([
      number ? entityRef('stock_adjustment', str(md.stock_adjustment_id), number) : null,
      reason ? (ADJUSTMENT_REASON[reason] ?? humanize(reason)) : null,
      where ? S.details.atLocation(where) : null,
    ]),
    // The movement note defaults to "Stock adjustment <number>"; only a note
    // someone typed on the line is worth repeating.
    note: str(md.notes)?.startsWith(DEFAULT_NOTE_PREFIX) ? undefined : (str(md.notes) ?? undefined),
  }
}

/** BOM component, outbound, spare-request, location and transfer events. */
export const STOCK_DESCRIBERS: Record<string, EventDescriber> = {
  // ── BOM components ──
  component_added: ({ md }) => {
    const part =
      str(md.component_part_variant_name) ?? str(md.part_name) ?? str(md.component_name)
    // The slot, when recorded. "Component added · 32GB RAM · position DIMM-A"
    // is what an engineer opening the machine needs; the ops-stage events
    // don't carry it, so it is simply omitted there.
    const pos = str(md.position)
    return {
      title:
        str(md.added_during) === MATERIAL_ISSUE
          ? S.titles.componentAddedOnIssue
          : S.titles.componentAdded,
      description:
        [part, pos ? S.details.atPosition(pos) : null, ...issueTrail(md)]
          .filter(Boolean)
          .join(' · ') || undefined,
    }
  },
  component_pulled: componentPulled,
  component_missing: componentCorrection(S.titles.componentMissing),
  component_added_back: componentCorrection(S.titles.componentAddedBack),
  component_put_back: componentCorrection(S.titles.componentPutBack),
  component_add_undone: componentCorrection(S.titles.componentAddUndone),
  material_issued: materialIssued,
  // The dispatch number moves to the EntityRef chip (computed in the registry).
  dispatch_created: () => ({ title: S.titles.dispatchCreated }),
  dispatch_dispatched: () => ({ title: S.titles.dispatched }),
  dispatch_delivered: ({ md }) => {
    const track = str(md.courier_tracking_number)
    return {
      title: S.titles.delivered,
      description: track ? S.details.awb(track) : undefined,
    }
  },
  pulled_out: pulledOut,
  installed_into: installedInto,
  // ── Spare-request lifecycle (device-under-repair timeline) ──
  spare_requested: ({ md }) => ({
    title: S.titles.spareRequested,
    description: str(md.request_number) ?? undefined,
  }),
  spare_ordered: ({ md }) => ({
    title: S.titles.spareOrdered,
    description: str(md.request_number) ?? undefined,
  }),
  spare_fulfilled: spareFulfilled,
  // A spare unit fitted into another device — on the unit's own timeline.
  spare_consumed: ({ md }) => ({
    title: S.titles.consumedAsSpare,
    description: str(md.request_number) ?? undefined,
  }),
  spare_returned: spareReturned,
  // The same act on the returned unit's OWN timeline. The movement
  // notes already read "Spare returned against request <id>: <reason>".
  spare_returned_to_stock: ({ md }) => {
    // Request number + where it went back (the return notes are on the
    // details page).
    const to = locationPath(str(md.location_name), str(md.parent_location_name))
    return {
      title: S.titles.returnedToStock,
      description:
        [str(md.request_number), to ? S.details.toLocation(to) : null]
          .filter(Boolean)
          .join(' · ') || undefined,
    }
  },
  // The cancel reason is on the details page, so not repeated here.
  spare_cancelled: () => ({ title: S.titles.spareCancelled }),
  relocated,
  scrapped: scrapLike('scrapped'),
  unscrapped: scrapLike('unscrapped'),
  disposed: scrapLike('disposed'),
  transfer_sent: transfer,
  transfer_received: transfer,
  transfer_returned_to_source: transfer,
  stock_adjustment_added: stockAdjustment,
  stock_adjustment_restored: stockAdjustment,
  stock_adjustment_removed: stockAdjustment,
  material_returned: ({ md }) => {
    // An issued unit returned to stock and shelved at a slot.
    const to = locationPath(str(md.location_name), str(md.parent_location_name))
    return {
      title: S.titles.materialReturned,
      description:
        [str(md.mi_number), to ? S.details.atLocation(to) : null]
          .filter(Boolean)
          .join(' · ') || undefined,
    }
  },
}
