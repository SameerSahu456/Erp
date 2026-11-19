import { WORKFLOW_LABELS } from '../deviceLabels'
import { humanize } from './helpers'
import { OUTCOME_LABEL } from './workflow-history-card-helpers'
import { WORKFLOW_HISTORY_CARD_STRINGS as S } from './workflow-history-card.strings'
import { str } from './workflow-event-nodes'
import type { EventDescriber } from './workflow-event-types'

// ── Assignment: read as a plain engineer change at a glance ──
const assigned: EventDescriber = ({ md, stage }) => {
  const toName = str(md.to_user_name)
  const fromName = str(md.from_user_name)
  // The lot the device left records who was accountable until now.
  const fromLot = str(md.from_wa_number)
  const toLot = str(md.to_wa_number)
  const lotNote = lotMoveNote(fromLot, toLot)
  const who = stage ? S.assignment.engineerWithStage(stage) : S.assignment.engineer
  if (fromName && toName)
    return {
      title: S.assignment.reassigned(who),
      description: `${fromName} → ${toName}`,
      note: lotNote,
    }
  if (toName)
    return { title: S.assignment.assigned(who), description: toName, note: lotNote }
  if (fromName)
    return { title: S.assignment.unassigned(who), description: fromName, note: lotNote }
  return { title: S.assignment.assignmentUpdated(who), note: lotNote }
}

/** The lot-move note on an assignment event: moved / added / withdrawn. */
function lotMoveNote(fromLot: string | null, toLot: string | null): string | undefined {
  if (fromLot && toLot) return S.assignment.lotMoved(fromLot, toLot)
  if (toLot) return S.assignment.lotAdded(toLot)
  return fromLot ? S.assignment.lotWithdrawn(fromLot) : undefined
}

// ── Terminal ──
const completed: EventDescriber = ({ e, withStage, legacyRoutingByOp }) => {
  // Routing rides on the completed payload now; fall back to the
  // legacy outcome_set row for un-migrated history.
  const routing =
    e.metadata_ ?? (e.operation_id ? legacyRoutingByOp.get(e.operation_id) : null) ?? {}
  // Rack assign has no pass/fail (always 'na'): show where the unit landed instead.
  if (e.operation_type === 'rack_assign') {
    const slot = str(routing.location_name)
    const rack = str(routing.parent_location_name)
    const place = slot && rack ? `${rack} → ${slot}` : slot
    return {
      title: withStage(S.actions.completed),
      description: place ? S.details.assignedTo(place) : undefined,
    }
  }
  const parts: string[] = []
  if (typeof routing.outcome === 'string')
    parts.push(OUTCOME_LABEL[routing.outcome] ?? humanize(routing.outcome))
  if (typeof routing.workflow_status_for_device === 'string')
    parts.push(
      S.details.routedTo(
        WORKFLOW_LABELS[routing.workflow_status_for_device] ??
          humanize(routing.workflow_status_for_device),
      ),
    )
  // Stage-completion notes (inspection / repair / QC checklists, outward QC)
  // belong on the Checklist Results card / MI record, not the device timeline —
  // showing them here duplicates the note. Keep only outcome + routing. (CP-461)
  return {
    title: withStage(S.actions.completed),
    description: parts.join(' · ') || undefined,
  }
}

// ── Manufacturer-serial capture / correction: old → new + reason (bug #16) ──
const serialChanged: EventDescriber = ({ e, md }) => {
  const oldSerial = str(md.from_manufacturer_serial)
  const newSerial = str(md.manufacturer_serial)
  const reason = str(md.reason)
  // Old → new on a correction; just the value on a first record.
  const serials = oldSerial && newSerial ? `${oldSerial} → ${newSerial}` : newSerial
  return {
    title:
      e.event_type === 'device_serial_corrected'
        ? S.titles.serialCorrected
        : S.titles.serialRecorded,
    description: serials ? S.details.mfrSerial(serials) : undefined,
    // Reason on its own line, truncated to one line with the full
    // text on hover (it can be a long sentence).
    note: reason ? S.details.reason(reason) : undefined,
  }
}

// ── Re-identified: old part → new part + reason ──
const partReidentified: EventDescriber = ({ md }) => {
  const oldPart = str(md.from_part_variant_name)
  const newPart = str(md.part_variant_name)
  const reason = str(md.reason)
  return {
    title: S.titles.partReidentified,
    description: (oldPart && newPart ? `${oldPart} → ${newPart}` : newPart) ?? undefined,
    note: reason ? S.details.reason(reason) : undefined,
  }
}

/** Assignment, stage lifecycle, paint custody, completion, serial capture and
 *  work-assignment events. */
export const LIFECYCLE_DESCRIBERS: Record<string, EventDescriber> = {
  assigned,
  // ── Stage lifecycle ──
  created: ({ stage, md }) => {
    // A vendor-service job carries its item (the sub-type, e.g. "Back Panel")
    // so the raised line reads its Type (the stage) + the sub-type (CP-362 #3).
    // NULL for every other operation type, so this stays blank for them.
    const item = str(md.item_description)
    return {
      title: stage ? S.titles.enteredStage(stage) : S.titles.operationCreated,
      description: item ? S.details.vendorItem(item) : undefined,
    }
  },
  started: ({ withStage }) => ({ title: withStage(S.actions.started) }),
  held: ({ md, withStage }) => ({
    title: withStage(S.actions.putOnHold),
    description: str(md.reason) ?? str(md.notes) ?? undefined,
  }),
  resumed: ({ withStage }) => ({ title: withStage(S.actions.resumed) }),
  ready_for_qc: () => ({ title: S.titles.readyForQc }),
  escalated_l3: () => ({ title: S.titles.escalatedL3 }),
  waiting_spares: () => ({ title: S.titles.waitingSpares }),
  spares_arrived: () => ({ title: S.titles.sparesArrived }),
  fail_next_action: ({ withStage }) => ({ title: withStage(S.actions.failRoutingSet) }),
  condition_overridden: ({ md }) => {
    const from = str(md.from_condition) ?? str(md.from)
    const to = str(md.to_condition) ?? str(md.to)
    return {
      title: S.titles.conditionOverridden,
      description: from && to ? `${humanize(from)} → ${humanize(to)}` : undefined,
    }
  },
  // ── Paint vendor custody hops ──
  sent_to_vendor: ({ md }) => {
    // Name WHO we sent it to (the vendor), and the item (sub-type) so the line
    // reads its Type + "Back Panel" (CP-362 #3). The instructions themselves are
    // shown on the Paint card (details page), so they're not repeated here.
    const vendor = str(md.vendor_name)
    const item = str(md.item_description)
    return {
      title: vendor ? S.titles.sentToVendorNamed(vendor) : S.titles.sentToVendor,
      description: item ? S.details.vendorItem(item) : undefined,
    }
  },
  vendor_returned: ({ md }) => {
    // Keep the panels OK/not-OK flag; the vendor response text lives on
    // the Paint card (details page), so it's not repeated here.
    const parts: string[] = []
    if (typeof md.panels_returned_ok === 'boolean')
      parts.push(md.panels_returned_ok ? S.details.panelsOk : S.details.panelsNotOk)
    return {
      title: S.titles.returnedFromVendor,
      description: parts.join(' · ') || undefined,
    }
  },
  paint_done: () => ({ title: S.titles.paintCompleted }),
  completed,
  cancelled: ({ md, withStage }) => {
    // A vendor-service cancel carries its item (sub-type) so the line reads its
    // Type + "Back Panel" alongside the reason (CP-362 #3); blank otherwise.
    const item = str(md.item_description)
    const reason = str(md.reason)
    return {
      title: withStage(S.actions.cancelled),
      description:
        [item ? S.details.vendorItem(item) : null, reason].filter(Boolean).join(' · ') ||
        undefined,
    }
  },
  device_serial_recorded: serialChanged,
  device_serial_corrected: serialChanged,
  device_reidentified: partReidentified,
  // ── Work-assignment issued / withdrawn (WA chip is built in the registry) ──
  work_assignment_issued: ({ md }) => ({
    // The assigned engineer (the lot's issued-to), not the actor who
    // performed the issue — the WA number rides as the chip.
    title: S.titles.workAssignmentIssued,
    description: str(md.issued_to_name) ?? undefined,
  }),
  work_assignment_withdrawn: ({ md }) => ({
    title: S.titles.workAssignmentWithdrawn,
    description: str(md.reason) ?? undefined,
  }),
}
