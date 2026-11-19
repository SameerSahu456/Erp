import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Check, GitBranch, PackageCheck, PackageX, Truck, Undo2, X } from 'lucide-react'

import type { TimelineEntry, TimelineVariant } from '@/components/common/display/Timeline'
import { formatIST } from '@shared/lib/date'

import type { WorkflowHistoryEntry } from '../../../api'
import { WORKFLOW_LABELS } from '../deviceLabels'
import { historyMeta, humanize } from './helpers'
import { STAGE_LABEL, stageTitle } from './workflow-history-card-helpers'
import { WORKFLOW_HISTORY_CARD_STRINGS as S } from './workflow-history-card.strings'
import { entityRef, str } from './workflow-event-nodes'
import type { EventCtx, EventDescriber, EventText } from './workflow-event-types'
import { LIFECYCLE_DESCRIBERS } from './workflow-event-describe-lifecycle'
import { STOCK_DESCRIBERS } from './workflow-event-describe-stock'
import { RETURN_DESCRIBERS } from './workflow-event-describe-returns'

/** Pure event → timeline-entry mapping (tests/unit/workflow-event-registry.test.ts). */

// A timeline entry tagged with its workflow-cycle ordinal, so the render can
// split the flat list into per-cycle partitions.
export type CycleTimelineEntry = TimelineEntry & { cycle: number }

// event_type → describer. A Map (not an object lookup) so an event named like
// an Object.prototype member can never resolve to a non-describer.
const DESCRIBERS = new Map<string, EventDescriber>(
  Object.entries({ ...LIFECYCLE_DESCRIBERS, ...STOCK_DESCRIBERS, ...RETURN_DESCRIBERS }),
)

// Icon + colour follow the outcome, not just the event; unlisted events use historyMeta.
const FIXED_VISUALS: Record<string, { icon: LucideIcon; variant: TimelineVariant }> = {
  fail_next_action: { icon: X, variant: 'error' },
  paint_done: { icon: Check, variant: 'success' },
  spares_arrived: { icon: Check, variant: 'success' },
  ready_for_qc: { icon: Check, variant: 'success' },
  // A part harvested out of a machine, landed back in stock.
  pulled_out: { icon: PackageCheck, variant: 'success' },
  // The same part going the other way — into a machine. Neutral: fitting a
  // component is neither a pass nor a failure.
  installed_into: { icon: PackageCheck, variant: 'default' },
  material_issued: { icon: PackageCheck, variant: 'default' },
  // Device-page corrections: missing is a warning; the undos are neutral.
  component_missing: { icon: PackageX, variant: 'warning' },
  component_added_back: { icon: Undo2, variant: 'default' },
  component_put_back: { icon: Undo2, variant: 'default' },
  component_add_undone: { icon: Undo2, variant: 'default' },
  dispatch_created: { icon: PackageCheck, variant: 'default' },
  dispatch_dispatched: { icon: Truck, variant: 'default' },
  dispatch_delivered: { icon: Check, variant: 'success' },
  held: { icon: GitBranch, variant: 'warning' },
  waiting_spares: { icon: GitBranch, variant: 'warning' },
  escalated_l3: { icon: GitBranch, variant: 'warning' },
  condition_overridden: { icon: GitBranch, variant: 'warning' },
  spare_requested: { icon: GitBranch, variant: 'default' },
  spare_ordered: { icon: GitBranch, variant: 'default' },
  spare_fulfilled: { icon: PackageCheck, variant: 'success' },
  spare_consumed: { icon: PackageCheck, variant: 'success' },
  // Returns are neutral (a correction); the Undo2 icon sets them apart from fulfilment.
  spare_returned: { icon: Undo2, variant: 'default' },
  spare_returned_to_stock: { icon: Undo2, variant: 'default' },
  material_returned: { icon: Undo2, variant: 'default' },
  spare_cancelled: { icon: X, variant: 'error' },
  // Set aside for the vendor — not yet gone, still reversible.
  return_raised: { icon: PackageX, variant: 'warning' },
  // Put back on the shelf at the stage it came from. A good outcome,
  // despite the word "cancelled" — historyMeta would paint this red.
  return_cancelled: { icon: Check, variant: 'success' },
  // The unit physically left. Only a recall of the consignment brings it back.
  return_dispatched: { icon: Truck, variant: 'error' },
  // The shipment was undone — the unit is back with us, still pending return.
  return_recalled: { icon: Undo2, variant: 'warning' },
  // The customer sent this one back. Not a failure of ours to
  // flag red — it is the arrival that starts the unit's next life.
  replacement_returned: { icon: Undo2, variant: 'default' },
  // Reported faulty — a warning on the device, whatever was decided.
  replacement_requested: { icon: PackageX, variant: 'warning' },
  sale_returned: { icon: Undo2, variant: 'default' },
  demo_returned: { icon: Undo2, variant: 'default' },
  staff_returned: { icon: Undo2, variant: 'default' },
}

/** The icon + colour for one event. */
export function eventVisual(
  e: WorkflowHistoryEntry,
  md: Record<string, unknown>,
): { icon: LucideIcon | undefined; variant: TimelineVariant } {
  if (e.event_type === 'completed') {
    const outcome = typeof md.outcome === 'string' ? md.outcome.toLowerCase() : null
    return outcome === 'fail' ? { icon: X, variant: 'error' } : { icon: Check, variant: 'success' }
  }
  if (e.event_type === 'vendor_returned') {
    return md.panels_returned_ok === false
      ? { icon: X, variant: 'error' }
      : { icon: Check, variant: 'success' }
  }
  const fixed = Object.hasOwn(FIXED_VISUALS, e.event_type) ? FIXED_VISUALS[e.event_type] : null
  if (fixed) return fixed
  const meta = historyMeta(e.event_type)
  return { icon: meta.icon, variant: meta.variant }
}

/** Stage name for the event; prefers the vendor SECTION name so two sections stay distinct. */
export function eventStage(e: WorkflowHistoryEntry): string | null {
  if (e.section_name) return e.section_name
  return e.operation_type ? (STAGE_LABEL[e.operation_type] ?? humanize(e.operation_type)) : null
}

// ── Fallback for any unmapped event ──
const describeFallback: EventDescriber = ({ e }) => {
  const label = (st: string | null | undefined) => (st ? (WORKFLOW_LABELS[st] ?? st) : '—')
  const arrow = e.from_status || e.to_status ? `${label(e.from_status)} → ${label(e.to_status)}` : undefined
  return { title: stageTitle(e.operation_type, e.event_type), description: arrow }
}

/** Title / description / note for one event. */
export function describeEvent(ctx: EventCtx): EventText {
  return (DESCRIBERS.get(ctx.e.event_type) ?? describeFallback)(ctx)
}

/** The unit list a spare event names: consumed on fulfil, returned on return. */
function spareUnitList(eventType: string, md: Record<string, unknown>): unknown {
  if (eventType === 'spare_fulfilled') return md.consumed_units
  return eventType === 'spare_returned' ? md.returned_units : undefined
}

const COMPONENT_CORRECTIONS = new Set([
  'component_missing',
  'component_added_back',
  'component_put_back',
  'component_add_undone',
])

/** The cross-referenced unit this entry should link to, if any. */
function linkTargetFor(e: WorkflowHistoryEntry, md: Record<string, unknown>) {
  const unitList = spareUnitList(e.event_type, md)
  const namedUnit = Array.isArray(unitList)
    ? (unitList[0] as Record<string, unknown> | undefined)
    : undefined
  const isUnitSideSpareEntry =
    e.event_type === 'spare_consumed' || e.event_type === 'spare_returned_to_stock'
  if (e.event_type === 'component_pulled')
    return { id: str(md.pulled_stock_item_id), serial: str(md.pulled_serial) }
  // Jump to the component's own unit. Only the manual add records these keys;
  // the ops-stage event does not, so the chip is simply absent there.
  if (e.event_type === 'component_added' || COMPONENT_CORRECTIONS.has(e.event_type))
    return { id: str(md.component_stock_item_id), serial: str(md.component_serial) }
  // Both unit-side composition events name the machine the same way.
  if (e.event_type === 'pulled_out' || e.event_type === 'installed_into')
    return { id: str(md.source_stock_item_id), serial: str(md.source_serial) }
  if (namedUnit) return { id: str(namedUnit.stock_item_id), serial: str(namedUnit.serial) }
  if (isUnitSideSpareEntry) return { id: str(md.repair_device_id), serial: str(md.request_number) }
  return null
}

const WA_EVENTS = new Set(['work_assignment_issued', 'work_assignment_withdrawn'])
const DISPATCH_EVENTS = new Set(['dispatch_created', 'dispatch_dispatched', 'dispatch_delivered'])

/** Withdrawn entries carry `wa_number`; issued ones carry it in `notes`. */
function waNumberOf(md: Record<string, unknown>): string | undefined {
  return str(md.wa_number) ?? (str(md.notes)?.replace(/^(?:Issued on|Withdrawn from)\s+/i, '') || undefined)
}

/** The WA / dispatch / MI document chip for that event type, when both id and number are known. */
function documentRefFor(e: WorkflowHistoryEntry, md: Record<string, unknown>): ReactNode {
  if (WA_EVENTS.has(e.event_type)) {
    const waId = str(md.work_assignment_id)
    const waNumber = waNumberOf(md)
    return waId && waNumber ? entityRef('work_assignment', waId, waNumber) : undefined
  }
  if (DISPATCH_EVENTS.has(e.event_type)) {
    const dispatchId = str(md.dispatch_id)
    const dispatchNumber = str(md.dispatch_number)
    return dispatchId && dispatchNumber ? entityRef('dispatch', dispatchId, dispatchNumber) : undefined
  }
  if (e.event_type !== 'material_issued') return undefined
  const miId = str(md.material_issue_id)
  const miNumber = str(md.mi_number)
  return miId && miNumber ? entityRef('material_issue', miId, miNumber) : undefined
}

/** The entry's clickable identifier chip (WA, dispatch, MI or a related unit's serial).
 *  Multi-unit spare events link the first unit. */
export function eventActionNode(
  e: WorkflowHistoryEntry,
  md: Record<string, unknown>,
): ReactNode {
  const docRef = documentRefFor(e, md)
  if (docRef !== undefined) return docRef
  const linkTarget = linkTargetFor(e, md)
  if (linkTarget?.id && linkTarget.serial)
    return entityRef('device', linkTarget.id, linkTarget.serial, linkTarget.serial)
  return undefined
}

/** Newest first; re-sorted client-side so same-instant transitions order correctly. */
export function compareHistoryNewestFirst(a: WorkflowHistoryEntry, b: WorkflowHistoryEntry) {
  if (a.created_at !== b.created_at) return a.created_at < b.created_at ? 1 : -1
  // Same instant: the next op is spawned before the prior completes, so order by
  // operation_id (UUIDv7) to put the newer stage on top.
  const aOp = a.operation_id ?? ''
  const bOp = b.operation_id ?? ''
  if (aOp !== bOp) return aOp < bOp ? 1 : -1
  // Within the SAME op (e.g. rack-assign opens AND completes at once),
  // fall back to the event id for the create → … → complete order.
  if (a.id < b.id) return 1
  return a.id > b.id ? -1 : 0
}

/** Event stream → newest-first entries, each labelled by stage. Legacy standalone
 *  `outcome_set` rows are folded into their `completed` event. */
export function buildTimelineEntries(history: WorkflowHistoryEntry[]): CycleTimelineEntry[] {
  // Legacy fallback: pre-migration data kept routing on a separate
  // `outcome_set` row. Index those by op so we can fold them into `completed`.
  const legacyRoutingByOp = new Map<string, Record<string, unknown>>()
  for (const e of history) {
    if (e.event_type === 'outcome_set' && e.operation_id) {
      legacyRoutingByOp.set(e.operation_id, e.metadata_ ?? {})
    }
  }

  return (
    history
      // Drop any legacy standalone outcome_set rows — folded into `completed`.
      .filter((e) => e.event_type !== 'outcome_set')
      .slice()
      .sort(compareHistoryNewestFirst)
      .map((e) => {
        const md = e.metadata_ ?? {}
        const { icon, variant } = eventVisual(e, md)
        const stage = eventStage(e)
        const withStage = (s: string) => (stage ? `${stage} ${s}` : humanize(s))
        const { title, description, note } = describeEvent({
          e,
          md,
          stage,
          withStage,
          legacyRoutingByOp,
        })
        // A step of one of the device's parts while it was away for a
        // replacement — say which part, so it is not read as the device's own.
        const part = e.via_component
        const partLabel = part
          ? [part.part_name, part.internal_serial].filter(Boolean).join(' ')
          : ''
        return {
          id: e.id,
          icon,
          variant,
          title: partLabel ? S.titles.forPart(partLabel, title) : title,
          description,
          note,
          actionNode: eventActionNode(e, md),
          // Who performed this step (the event actor), shown next to the time.
          user: str(md.actor_name) ?? undefined,
          timestamp: formatIST(e.created_at),
          // Cycle ordinal for partitioning (defaults to 1 against a backend
          // that doesn't send it yet).
          cycle: e.cycle ?? 1,
        }
      })
  )
}

/** Split the display-ordered timeline into per-cycle partitions (cycles are contiguous). */
export function groupByCycle(
  entries: CycleTimelineEntry[],
): { cycle: number; entries: CycleTimelineEntry[] }[] {
  const groups: { cycle: number; entries: CycleTimelineEntry[] }[] = []
  for (const e of entries) {
    const last = groups[groups.length - 1]
    if (last && last.cycle === e.cycle) last.entries.push(e)
    else groups.push({ cycle: e.cycle, entries: [e] })
  }
  return groups
}
