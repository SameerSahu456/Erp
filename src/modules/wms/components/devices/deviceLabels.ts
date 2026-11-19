import type { StatusBadgeVariant } from '@/components/common/display/StatusBadge'

// Backend workflow_status allow-list — the operation pipeline stage.
export const WORKFLOW_LABELS: Record<string, string> = {
  pending_inspection: 'Pending Inspection',
  under_inspection: 'Under Inspection',
  inspected: 'Inspected',
  in_repair: 'In Repair',
  // See the note in ims/constants.ts. `in_paint` was renamed to
  // `at_external_vendor` by the vendor-services migration and this map was
  // never updated, so the device-detail header badge printed the raw value.
  // Spec D6 wants the PER-SECTION label here ("In Display Repair", "In Battery
  // Boost") from service_sections.device_status_label — that is not exposed on
  // the device row yet, so this generic label stands in.
  at_external_vendor: 'In Vendor Service',
  waiting_for_spares: 'Waiting for Spares',
  pending_qc: 'Pending QC',
  under_qc: 'Under QC',
  awaiting_rack: 'Awaiting Rack',
  // Purchase-return custody. Mirrors the device-status values of the same names:
  // both columns move together, so both maps carry both keys.
  pending_return: 'Pending Return',
  returned_to_vendor: 'Returned to Vendor',
}
export const WORKFLOW_VARIANT: Record<string, StatusBadgeVariant> = {
  pending_inspection: 'warning',
  under_inspection: 'info',
  inspected: 'success',
  in_repair: 'warning',
  at_external_vendor: 'info',
  waiting_for_spares: 'warning',
  pending_qc: 'warning',
  under_qc: 'info',
  awaiting_rack: 'neutral',
  pending_return: 'warning',
  returned_to_vendor: 'error',
}

// Backend stock_items.status allow-list — availability, not pipeline stage.
export const DEVICE_STATUS_LABELS: Record<string, string> = {
  available: 'Available',
  // In the ops pipeline — physically here, deliberately not sellable. Set at
  // both inward doors, cleared by terminal rack-assign (device-placement D7).
  // A device carrying this almost always also carries a `workflow_status`,
  // and every device surface shows that stage in preference to this word.
  in_operations: 'In Operations',
  reserved: 'Reserved',
  issued: 'Issued',
  dispatched: 'Dispatched',
  in_transit: 'In Transit',
  consumed: 'Consumed',
  damaged: 'Damaged',
  // Condemned: unrepairable and unsellable, but STILL on its shelf and still
  // occupying its slot (device-scrap D1). Distinct from `damaged`, which means
  // broken-but-ours and is a vendor-return source, and from `disposed`, which
  // means physically gone with the serial burned. Reversible by the store
  // manager until disposal.
  scrapped: 'Scrapped',
  disposed: 'Disposed',
  dismantled: 'Dismantled',
  pending_return: 'Pending Return',
  returned_to_vendor: 'Returned to Vendor',
  lost_in_transit: 'Lost in Transit',
  // A component the supplier listed inside a device that never arrived
  // (inward-verification D5). Not held stock.
  missing: 'Missing',
}
export const DEVICE_STATUS_VARIANT: Record<string, StatusBadgeVariant> = {
  available: 'success',
  in_operations: 'warning',
  reserved: 'info',
  issued: 'info',
  in_transit: 'warning',
  consumed: 'neutral',
  damaged: 'error',
  scrapped: 'error',
  disposed: 'neutral',
  pending_return: 'warning',
  returned_to_vendor: 'error',
  missing: 'error',
}

// Operation status (the active_operation / stage operation).
export const OPERATION_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}
export const OPERATION_STATUS_VARIANT: Record<string, StatusBadgeVariant> = {
  pending: 'warning',
  in_progress: 'info',
  completed: 'success',
  cancelled: 'neutral',
}

/**
 * Badge for a device's ops stage.
 *
 * A device held by a vendor leads with the stage it was ACTUALLY in and
 * qualifies with the section(s) holding it — "In Repair · In Display Repair".
 * What physically goes to a vendor is usually a COMPONENT (a display panel, a
 * battery) while the unit sits on the bench, so a bare custody label reads as
 * though the laptop is gone when the operator can see it. `vendorPrior` is the
 * exact stage the device is restored to when the last item returns.
 *
 * Shared because four surfaces render this badge — device list, device detail,
 * repair queue and GRN batch devices. Four copies is how they drift.
 */
/** Fallback for "where the device is" when at a vendor with no named section. */
export const AT_VENDOR_FALLBACK = 'At Vendor'

export function workflowStageBadge(
  workflowStatus: string,
  vendorPrior?: string | null,
  vendorSections?: readonly string[] | null,
): { label: string; variant: StatusBadgeVariant } {
  if (workflowStatus === 'at_external_vendor' && vendorPrior) {
    const where = vendorSections?.length ? vendorSections.join(', ') : AT_VENDOR_FALLBACK
    return {
      label: `${WORKFLOW_LABELS[vendorPrior] ?? vendorPrior} · ${where}`,
      variant: WORKFLOW_VARIANT[vendorPrior] ?? 'neutral',
    }
  }
  return {
    label: WORKFLOW_LABELS[workflowStatus] ?? workflowStatus,
    variant: WORKFLOW_VARIANT[workflowStatus] ?? 'neutral',
  }
}
