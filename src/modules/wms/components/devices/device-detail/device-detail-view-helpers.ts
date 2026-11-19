import type { StatusBadgeVariant } from '@/components/common/display/StatusBadge'

import type { DeviceDossier } from '../../../api'
import type { MovableUnit } from '../../stock-transfer/move-stock-helpers'
import { DEVICE_DETAIL_BODY_STRINGS } from '../device-detail-body.strings'
import {
  AT_VENDOR_FALLBACK,
  DEVICE_STATUS_LABELS,
  DEVICE_STATUS_VARIANT,
  WORKFLOW_LABELS,
  WORKFLOW_VARIANT,
} from '../deviceLabels'

type Device = DeviceDossier['device']
export type SpareRaiseStage = 'inspection' | 'repair' | 'qc'

const SPARE_STAGE_BY_WORKFLOW: Record<string, SpareRaiseStage> = {
  pending_inspection: 'inspection',
  under_inspection: 'inspection',
  in_repair: 'repair',
  waiting_for_spares: 'repair',
  pending_qc: 'qc',
  under_qc: 'qc',
}

/** The stage whose active op a spare request can be raised against at this
 *  workflow status (inspection, repair or QC), or null. */
export const spareRaiseStageFor = (wf: string): SpareRaiseStage | null =>
  SPARE_STAGE_BY_WORKFLOW[wf] ?? null

/** That stage's assignee on the device (repair when no stage applies). */
export function spareAssigneeId(device: Device, stage: SpareRaiseStage | null): string | null | undefined {
  if (stage === 'inspection') return device.inspection_assignee_id
  if (stage === 'qc') return device.qc_assignee_id
  return device.repair_assignee_id
}

/** Part label off the dossier's denormalized names ('…' while a variant's name
 *  hasn't resolved, '—' when there's none). */
export function partModelOf(device: Device | undefined): string {
  if (device?.part_name) return device.part_name
  if (device?.part_variant_name) return device.part_variant_name
  return device?.part_variant_id ? '…' : '—'
}

/** "Warehouse · Rack → Bin"; warehouse only while unplaced or for a consumed spare. */
export function locationLabel(device: Device): string {
  const slot = [device.parent_location_name, device.location_name].filter(Boolean).join(' → ')
  const warehouseIdOnly = device.warehouse_id ? '…' : '—'
  const warehouseLabel = device.warehouse_name ?? warehouseIdOnly
  return slot && device.status !== 'consumed' ? `${warehouseLabel} · ${slot}` : warehouseLabel
}

/** Header subtitle: part model + manufacturer serial, whichever are known. */
export function headerSubtitle(device: Device, partModel: string): string {
  return [
    partModel !== '—' && partModel !== '…' ? partModel : null,
    device.manufacturer_serial
      ? DEVICE_DETAIL_BODY_STRINGS.serialPrefix(device.manufacturer_serial)
      : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

/** The one unit Move Stock offers from the dossier. The payload carries the
 *  location id, not its name — the dialog shows the name only as a hint. */
export function toMovableUnit(id: string, device: Device): MovableUnit {
  return {
    id,
    status: device.status,
    internalSerial: device.internal_serial,
    partName: device.part_name ?? null,
    variantLabel: device.part_variant_name ?? null,
    locationName: null,
  }
}

/** Header status chip. A vendor-held device shows its real stage plus the section
 *  ("In Repair · In Display Repair"), since usually only a component went out. */
export function resolveHeaderStatus(device: Device): { label: string; variant: StatusBadgeVariant } {
  const wf = device.workflow_status ?? ''
  const status = device.status
  if (!wf) {
    return {
      label: DEVICE_STATUS_LABELS[status] ?? status,
      variant: DEVICE_STATUS_VARIANT[status] ?? 'neutral',
    }
  }
  const vendorPrior = device.vendor_prior_workflow_status
  if (wf === 'at_external_vendor' && vendorPrior) {
    const where = device.vendor_section_names?.length
      ? device.vendor_section_names.join(', ')
      : AT_VENDOR_FALLBACK
    return {
      label: `${WORKFLOW_LABELS[vendorPrior] ?? vendorPrior} · ${where}`,
      variant: WORKFLOW_VARIANT[vendorPrior] ?? 'neutral',
    }
  }
  return { label: WORKFLOW_LABELS[wf] ?? wf, variant: WORKFLOW_VARIANT[wf] ?? 'neutral' }
}
