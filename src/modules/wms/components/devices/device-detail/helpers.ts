import type { LucideIcon } from 'lucide-react'
import { Check, GitBranch, PackageCheck, X } from 'lucide-react'

import type { StatusBadgeVariant } from '@/components/common/display/StatusBadge'
import type { TimelineVariant } from '@/components/common/display/Timeline'

import type { OperationStage } from '../../../api'
import type { WmsStage } from '../../../permissions'

/** Title-case a snake/loose string: "pending_qc" → "Pending Qc". */
export const humanize = (s: string) =>
  s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

type HistoryMeta = { icon: LucideIcon; variant: TimelineVariant }

// First rule with a matching substring wins, so order matters.
const HISTORY_META_RULES: { keys: string[]; meta: HistoryMeta }[] = [
  { keys: ['cancel', 'fail', 'reject'], meta: { icon: X, variant: 'error' } },
  { keys: ['complete', 'pass', 'approve', 'stock'], meta: { icon: Check, variant: 'success' } },
  // Paint custody hops (out to / back from the vendor) — neutral truck-ish.
  { keys: ['sent_to_vendor', 'vendor_returned'], meta: { icon: PackageCheck, variant: 'default' } },
  { keys: ['change', 'request', 'hold'], meta: { icon: GitBranch, variant: 'warning' } },
  { keys: ['receiv', 'inward', 'create'], meta: { icon: PackageCheck, variant: 'default' } },
]

/** Map a workflow-history event to a timeline node (icon + colour). */
export function historyMeta(eventType: string): HistoryMeta {
  const t = eventType.toLowerCase()
  const rule = HISTORY_META_RULES.find((r) => r.keys.some((k) => t.includes(k)))
  return rule ? { ...rule.meta } : { icon: GitBranch, variant: 'default' }
}

/** Which assign-stage is live for a device at this workflow status (the only
 *  stage whose engineer can be assigned right now). null = no live assignment. */
export function stageForWorkflow(wf: string): OperationStage | null {
  if (wf === 'pending_inspection' || wf === 'under_inspection') return 'inspection'
  if (wf === 'in_repair') return 'repair'
  if (wf === 'pending_qc' || wf === 'under_qc') return 'qc'
  return null
}

/** Which stage gate applies to a BENCH-level identity correction (filling a
 *  blank OEM serial) at this workflow status.
 *
 *  Mirrors the backend's `_WORKFLOW_STATUS_TO_STAGE` behind
 *  `require_current_stage` — NOT `stageForWorkflow` above, which answers a
 *  different question (which engineer slot is assignable) and deliberately
 *  stops short of `awaiting_rack`.
 *
 *  null means no bench holds the device — racked, at a vendor, waiting for
 *  spares — and the backend falls back to the manager tier, so the caller must
 *  too. Getting this wrong in the permissive direction offers a button that
 *  403s. */
export function correctionStageForWorkflow(
  wf: string | null | undefined,
): WmsStage | null {
  if (wf === 'pending_inspection' || wf === 'under_inspection') return 'inspection'
  if (wf === 'in_repair') return 'repair'
  if (wf === 'pending_qc' || wf === 'under_qc') return 'qc'
  if (wf === 'awaiting_rack') return 'rack_assign'
  return null
}


/** Identity corrections (re-identify part / relink PO line) are offered ONLY
 *  while the device is at the inspection stage — Pending Inspection or Under
 *  Inspection. They correct what a unit was received as, which is an
 *  inspection-desk decision; once the unit moves past inspection (repair, QC, a
 *  rack, stock, a dispatch, an issue, or a return) its identity is settled and
 *  the buttons are hidden. Re-identify fits every inward; relink is PO-only
 *  (gated in DeviceIdentityActions). */
const REIDENTIFY_STATUSES = new Set<string>(['pending_inspection', 'under_inspection'])
export function canReidentifyAtStage(wf: string | null | undefined): boolean {
  return !!wf && REIDENTIFY_STATUSES.has(wf)
}

/** Screens that open the device dossier and where Back returns. One table for
 *  `deviceDetailPath` and `originBackHref` so the two never drift. */
export const DEVICE_ORIGINS = {
  inspection: '/wms/inspection',
  repair: '/wms/repair',
  qc: '/wms/qc',
  spares: '/wms/spares',
  rack: '/wms/assign-rack',
  'vendor-jobs': '/wms/vendor-jobs',
  'scrap-placement': '/wms/scrap-placement',
} as const
export type DeviceOrigin = keyof typeof DEVICE_ORIGINS

function isDeviceOrigin(raw: string | null): raw is DeviceOrigin {
  return raw !== null && Object.prototype.hasOwnProperty.call(DEVICE_ORIGINS, raw)
}

/** Link to a device dossier that remembers which screen opened it. */
export function deviceDetailPath(id: string, from?: DeviceOrigin): string {
  return from ? `/wms/devices/${id}?from=${from}` : `/wms/devices/${id}`
}

/** Back target for a dossier opened from `rawFrom` (untrusted, §11.1). */
export function originBackHref(rawFrom: string | null): string | undefined {
  return isDeviceOrigin(rawFrom) ? DEVICE_ORIGINS[rawFrom] : undefined
}

/** The detail page is context-aware (like the stage queues that link into it):
 *  an explicit `?from=` wins; otherwise the device's live stage decides which
 *  section shows. */
export type DetailContext = 'inspection' | 'repair' | 'spares' | 'qc' | 'rack' | null
const CONTEXT_ORIGINS: ReadonlySet<string> = new Set(['inspection', 'repair', 'spares', 'qc', 'rack'])

export function contextForWorkflow(wf: string): DetailContext {
  if (wf === 'pending_inspection' || wf === 'under_inspection') return 'inspection'
  if (wf === 'in_repair') return 'repair'
  if (wf === 'waiting_for_spares') return 'spares'
  if (wf === 'pending_qc' || wf === 'under_qc') return 'qc'
  if (wf === 'awaiting_rack') return 'rack'
  return null
}

/** Resolve the section context: explicit `?from=` param wins, else workflow. */
export function resolveContext(rawFrom: string | null, wf: string): DetailContext {
  return rawFrom && CONTEXT_ORIGINS.has(rawFrom) ? (rawFrom as DetailContext) : contextForWorkflow(wf)
}

/** Human duration: "18d 2h 30m" / "6h 18m" / "30m" / "45s". Minutes are always
 *  shown down to the minute (never truncated — "2d 2h 59m", not "2d 2h").
 *  Sub-minute durations read in seconds so they never collapse to a
 *  misleading "0m". */
export function formatDuration(ms: number): string {
  if (ms <= 0) return '—'
  if (ms < 60000) return `${Math.max(1, Math.floor(ms / 1000))}s`
  const mins = Math.floor(ms / 60000)
  const d = Math.floor(mins / 1440)
  const h = Math.floor((mins % 1440) / 60)
  const m = mins % 60
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export const SPARE_STATUS_LABELS: Record<string, string> = {
  requested: 'Requested',
  in_stock: 'In Stock',
  ordered: 'Ordered',
  partially_fulfilled: 'Partially Fulfilled',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled',
  // Synthetic: the wire status stays 'fulfilled' after a return, so the card
  // shows this once quantity_returned > 0 (matches the Spares list).
  returned: 'Spare Returned',
}
export const SPARE_STATUS_VARIANT: Record<string, StatusBadgeVariant> = {
  requested: 'warning',
  in_stock: 'info',
  ordered: 'info',
  partially_fulfilled: 'warning',
  fulfilled: 'success',
  cancelled: 'error',
  // Settled/closed — stock went back on the rack. Grey, matching the Spares
  // list, so it reads as finished rather than active.
  returned: 'neutral',
}
