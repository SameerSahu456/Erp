import { formatIST_date } from '@shared/lib/date'

import type { VendorJobSummary } from '../../api/service-jobs'
import { VENDOR_SERVICE_CARD_STRINGS as S } from './vendor-service-card.strings'

export interface VendorJobGates {
  readOnly: boolean
  canManage: boolean
  canWithdraw: boolean
}

/** True when the job's DERIVED stage offers at least one action this user may take. */
export function hasVendorJobActions(job: VendorJobSummary, g: VendorJobGates): boolean {
  if (g.readOnly) return false
  if (job.stage === 'awaiting_vendor') return g.canManage || g.canWithdraw
  if (job.stage === 'with_vendor') return g.canManage
  if (job.stage === 'returned') return job.outcome !== 'pass' && g.canManage
  return false
}

/** Serial · vendor · sent · returned · replacement serial — blanks dropped. */
export function vendorJobMetaLine(job: VendorJobSummary): string {
  return [
    job.item_serial_no,
    job.vendor_name,
    job.vendor_sent_at ? `${S.sentOn} ${formatIST_date(job.vendor_sent_at)}` : null,
    job.vendor_returned_at ? `${S.returnedOn} ${formatIST_date(job.vendor_returned_at)}` : null,
    // The replacement serial is the whole point of §5 — surface it.
    job.replacement_serial_no ? `${S.replacementSerial} ${job.replacement_serial_no}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

/** "Raised by X on D", or just the date when the raiser isn't resolved. */
export function vendorJobProvenance(job: VendorJobSummary): string {
  const on = formatIST_date(job.created_at)
  return job.raised_by_name ? S.raisedBy(job.raised_by_name, on) : S.raisedOn(on)
}

/** A job's section for the Send / Receive dialogs (their prop is required);
 *  falls back to the first section while no job is set. */
export function sectionForJob<T extends { code: string }>(
  job: VendorJobSummary | null,
  byCode: Map<string, T>,
  fallback: T,
): T {
  if (!job) return fallback
  return byCode.get(job.section_code ?? '') ?? fallback
}
